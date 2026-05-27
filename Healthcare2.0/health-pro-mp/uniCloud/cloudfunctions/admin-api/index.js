const db = uniCloud.database();

// 集合引用
const usersCollection = db.collection('he_users');
const coursesCollection = db.collection('he_courses');
const courseExchangesCollection = db.collection('he_course_exchanges');

// 验证管理员权限
const verifyAdmin = async (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token缺失' };
  }
  const cleanToken = token.replace(/^Bearer\s+/i, '');
  try {
    const userRes = await usersCollection.where({
      token: cleanToken,
      token_expires: db.command.gt(Date.now()),
      role: 'admin'
    }).get();
    if (userRes.data.length === 0) {
      return { valid: false, error: '无管理员权限或Token已过期' };
    }
    return { valid: true, userId: userRes.data[0]._id };
  } catch (err) {
    return { valid: false, error: '验证服务异常' };
  }
};

// 提取 Token
const extractToken = (event) => {
  const headers = event.headers || {};
  const payload = event.payload || {};
  return headers.authorization || headers.Authorization || payload.token || event.token || null;
};

exports.main = async (event, context) => {
  const { action, payload = {} } = event;
  
  console.log('Admin API Action:', action);
  
  // 验证管理员权限
  const token = extractToken(event);
  const authResult = await verifyAdmin(token);
  
  if (!authResult.valid) {
    return { code: 401, msg: authResult.error || '未授权' };
  }
  
  try {
    switch (action) {
      // ==================== 系统初始化 ====================
      
      case 'initCollections': {
        try {
          // 显式创建集合
          try {
            await db.createCollection('he_courses');
            console.log('Created he_courses collection');
          } catch (e) {
            // 集合已存在或其他错误，忽略
            console.log('he_courses collection may exist:', e.message);
          }
          
          try {
            await db.createCollection('he_course_exchanges');
            console.log('Created he_course_exchanges collection');
          } catch (e) {
            console.log('he_course_exchanges collection may exist:', e.message);
          }
          
          return { code: 0, msg: '集合初始化成功' };
        } catch (e) {
          return { code: 500, msg: '集合初始化失败', error: e.message };
        }
      }
      
      // ==================== 客户管理 ====================
      
      case 'updateClientTargets': {
        const { clientId, targets } = payload;
        if (!clientId) return { code: 400, msg: '缺少客户ID' };
        
        try {
          const clientRes = await usersCollection.doc(clientId).get();
          if (clientRes.data.length === 0) {
            return { code: 404, msg: '客户不存在' };
          }
          
          await usersCollection.doc(clientId).update({
            health_targets: targets
          });
          
          return { code: 0, msg: '健康目标已保存' };
        } catch (e) {
          return { code: 500, msg: '保存失败', error: e.message };
        }
      }
      
      // ==================== 课程管理 ====================
      
      case 'getCourses': {
        const { page = 1, pageSize = 20 } = payload;
        const skip = (page - 1) * pageSize;
        
        try {
          const res = await coursesCollection
            .orderBy('startTime', 'asc')
            .skip(skip)
            .limit(pageSize)
            .get();
          
          const countRes = await coursesCollection.count();
          
          return { 
            code: 0, 
            data: res.data,
            pagination: {
              total: countRes.total,
              page,
              pageSize,
              totalPages: Math.ceil(countRes.total / pageSize)
            }
          };
        } catch (e) {
          // 集合不存在时返回空数据
          if (e.message && e.message.includes('not found collection')) {
            console.log('Courses collection not found, returning empty data');
            return { 
              code: 0, 
              data: [],
              pagination: {
                total: 0,
                page,
                pageSize,
                totalPages: 0
              }
            };
          }
          throw e;
        }
      }
      
      case 'createCourse': {
        const {
          title, lecturer, description, startTime,
          location, pointsRequired, maxCapacity, coverEmoji
        } = payload;
        
        if (!title) return { code: 400, msg: '课程名称不能为空' };
        if (!lecturer) return { code: 400, msg: '讲师不能为空' };
        if (!startTime) return { code: 400, msg: '开课时间不能为空' };
        
        const now = Date.now();
        const courseData = {
          title,
          lecturer,
          description: description || '',
          startTime: typeof startTime === 'number' ? startTime : new Date(startTime).getTime(),
          location: location || '线上直播',
          pointsRequired: pointsRequired || 0,
          maxCapacity: maxCapacity || 100,
          enrolledCount: 0,
          coverEmoji: coverEmoji || '🎓',
          status: 'upcoming',
          createdAt: now,
          updatedAt: now
        };
        
        try {
          const res = await coursesCollection.add(courseData);
          return { code: 0, msg: '课程创建成功', data: { _id: res.id, ...courseData } };
        } catch (e) {
          // 如果集合不存在，返回提示让用户手动创建
          if (e.message && (e.message.includes('not found collection') || e.message.includes('Collection not found'))) {
            console.log('Collection not found:', e.message);
            return { 
              code: 500, 
              msg: '课程集合未创建，请在 UniCloud 控制台创建 he_courses 集合后重试' 
            };
          }
          throw e;
        }
      }
      
      case 'updateCourse': {
        const { id, ...updateData } = payload;
        if (!id) return { code: 400, msg: '缺少课程ID' };
        
        const courseRes = await coursesCollection.doc(id).get();
        if (courseRes.data.length === 0) {
          return { code: 404, msg: '课程不存在' };
        }
        
        const updatePayload = {
          ...updateData,
          updatedAt: Date.now()
        };
        
        // 转换 startTime 为时间戳
        if (updatePayload.startTime) {
          updatePayload.startTime = typeof updatePayload.startTime === 'number' 
            ? updatePayload.startTime 
            : new Date(updatePayload.startTime).getTime();
        }
        
        await coursesCollection.doc(id).update(updatePayload);
        return { code: 0, msg: '课程更新成功' };
      }
      
      case 'deleteCourse': {
        const { id } = payload;
        if (!id) return { code: 400, msg: '缺少课程ID' };
        
        // 检查是否有兑换记录
        const exchangesRes = await courseExchangesCollection.where({ courseId: id }).get();
        if (exchangesRes.data.length > 0) {
          // 有报名记录，软删除
          await coursesCollection.doc(id).update({
            status: 'deleted',
            updatedAt: Date.now()
          });
          return { code: 0, msg: '课程已删除（已报名的用户不受影响）' };
        }
        
        // 无报名记录，直接删除
        await coursesCollection.doc(id).remove();
        return { code: 0, msg: '课程删除成功' };
      }
      
      case 'getCourseEnrollments': {
        const { courseId } = payload;
        if (!courseId) return { code: 400, msg: '缺少课程ID' };
        
        const exchangesRes = await courseExchangesCollection.where({
          courseId
        }).orderBy('exchangedAt', 'desc').get();
        
        // 获取用户信息
        const enrollments = await Promise.all(
          exchangesRes.data.map(async (exchange) => {
            const userRes = await usersCollection.doc(exchange.userId).get();
            const user = userRes.data[0] || {};
            return {
              _id: exchange._id,
              userName: user.username || '未知用户',
              userPhone: user.phone || '',
              ticketCode: exchange.ticketCode,
              exchangedAt: exchange.exchangedAt,
              pointsUsed: exchange.pointsUsed
            };
          })
        );
        
        return { code: 0, data: enrollments };
      }
      
      case 'cleanupTestAccount': {
        const { phone = '17722222222', userId = 'user_cai_17722222222' } = payload;
        
        try {
          // 1. 查找匹配该手机号的所有用户ID
          const usersRes = await usersCollection.where({ phone }).get();
          const userIds = usersRes.data.map(u => u._id);
          if (userId && !userIds.includes(userId)) userIds.push(userId);
          
          if (userIds.length === 0) {
            return { code: 0, msg: '未找到相关测试账号数据' };
          }

          // 2. 批量删除相关数据
          const deleteTasks = [
            usersCollection.where({ phone: phone }).remove(),
            usersCollection.doc(userId).remove(),
            db.collection('he_orders').where({ user_id: db.command.in(userIds) }).remove(),
            db.collection('he_daily_plans').where({ user_id: db.command.in(userIds) }).remove(),
            db.collection('he_inventory').where({ user_id: db.command.in(userIds) }).remove(),
            db.collection('he_interaction_logs').where({ user_id: db.command.in(userIds) }).remove(),
            db.collection('he_notifications').where({ user_id: db.command.in(userIds) }).remove(),
            db.collection('he_checkin_stats').where({ user_id: db.command.in(userIds) }).remove(),
            db.collection('he_health_logs').where({ user_id: db.command.in(userIds) }).remove()
          ];
          
          await Promise.all(deleteTasks.map(t => t.catch(e => console.error('Cleanup task error:', e))));
          
          return { code: 0, msg: `已成功清除手机号 ${phone} 相关的测试数据` };
        } catch (e) {
          return { code: 500, msg: '清理失败', error: e.message };
        }
      }
      
      // ==================== 默认 ====================
      
      default:
        return { code: 404, msg: '未知操作' };
    }
  } catch (err) {
    console.error('Admin API Error:', err);
    return { code: 500, msg: '服务器错误', error: err.message };
  }
};

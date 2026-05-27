const db = uniCloud.database();
const collection = db.collection('he_users');

const hashPassword = (password) => {
  const salt = 'healthcare_salt_v1';
  let hash = 0;
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hc_' + Math.abs(hash).toString(16);
};

const generateToken = () => {
  const token = 'tk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  const expires = Date.now() + (7 * 24 * 60 * 60 * 1000);
  return { token, expires };
};

exports.main = async (event, context) => {
  try {
    const action = event.action;
    const params = event.params || {};

    if (action === 'login') {
      const { phone, password } = params;
      if (!phone || !password) {
        return { code: 400, msg: '手机号和密码不能为空' };
      }
      const res = await collection.where({ phone: phone }).get();
      if (res.data.length === 0) {
        return { code: 1, msg: '账号不存在' };
      }
      
      const isWeb = context && (context.PLATFORM === 'h5' || context.SOURCE === 'http' || context.SOURCE === 'https');
      
      // 【新增】多身份处理：如果一个手机号对应多个账号（比如一个admin，一个client）
      let user = res.data[0];
      let hasAdmin = res.data.some(u => u.role === 'admin');
      let hasClient = res.data.some(u => u.role === 'client' || u.is_client);

      if (isWeb) {
        // Web端优先尝试匹配管理员账号
        const adminAccount = res.data.find(u => u.role === 'admin');
        if (!adminAccount) {
          return { code: 403, msg: 'Web端仅支持营养顾问账号登录' };
        }
        user = adminAccount;
      } else {
        // 小程序端：如果有管理员身份，优先用管理员身份登录，并带上 is_client 标记
        const adminAccount = res.data.find(u => u.role === 'admin');
        if (adminAccount) {
          user = adminAccount;
          // 强制注入 is_client 标记，触发小程序的身份选择逻辑
          user.is_client = hasClient;
        }
      }
      let passwordValid = false;
      const hashedInput = hashPassword(password);
      if (user.password === hashedInput) {
        passwordValid = true;
      } else if (user.password === password) {
        passwordValid = true;
        await collection.doc(user._id).update({
          password: hashedInput,
          updated_at: Date.now()
        });
      }
      if (!passwordValid) {
        return { code: 1, msg: '密码错误' };
      }
      const tokenData = generateToken();
      await collection.doc(user._id).update({
        token: tokenData.token,
        token_expires: tokenData.expires,
        last_login_at: Date.now()
      });
      return {
        code: 0,
        data: {
          _id: user._id,
          role: user.role,
          username: user.username,
          phone: user.phone,
          token: tokenData.token,
          is_client: user.is_client || false
        }
      };
    }

    if (action === 'register_admin') {
      const { phone, username, password } = params;
      if (!phone || !/^1\d{10}$/.test(phone)) {
        return { code: 400, msg: '手机号格式不正确' };
      }
      if (!password || password.length < 6) {
        return { code: 400, msg: '密码至少需要6位' };
      }
      const res = await collection.where({ phone: phone }).get();
      if (res.data.length > 0) {
        return { code: 1, msg: '该手机号已注册' };
      }
      const tokenData = generateToken();
      const createRes = await collection.add({
        phone,
        password: hashPassword(password),
        role: 'admin',
        username: username || '营养师',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone,
        created_at: Date.now(),
        updated_at: Date.now(),
        token: tokenData.token,
        token_expires: tokenData.expires
      });
      return {
        code: 0,
        data: {
          _id: createRes.id,
          phone,
          role: 'admin',
          username: username || '营养师',
          token: tokenData.token
        }
      };
    }
    
    if (action === 'create_client') {
      const { name, phone, nutritionistId, created_by, operatorId, age, gender, height, weight, healthGoals, notes } = params;
      if (!name || !phone) {
        return { code: 400, msg: '姓名和手机号不能为空' };
      }
      if (!/^1\d{10}$/.test(phone)) {
        return { code: 400, msg: '手机号格式不正确' };
      }
      const res = await collection.where({ phone: phone }).get();
      if (res.data.length > 0) {
        return { code: 1, msg: '该手机号已注册' };
      }
      // 默认密码为手机号后4位
      const defaultPassword = phone.slice(-4);
      
      const actualNutritionistId = nutritionistId || created_by || operatorId || '';
      
      const createRes = await collection.add({
        phone,
        password: hashPassword(defaultPassword),
        username: name,
        role: 'client',
        nutritionist_id: actualNutritionistId,
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + phone,
        age: age || null,
        gender: gender || null,
        height: height || null,
        weight: weight || null,
        health_goals: healthGoals || [],
        notes: notes || '',
        created_at: Date.now(),
        updated_at: Date.now()
      });
      return {
        code: 0,
        data: {
          _id: createRes.id,
          phone,
          username: name,
          role: 'client'
        }
      };
    }

    // 删除客户
    if (action === 'delete_client') {
      const clientId = params.clientId || params.id;
      if (!clientId) {
        return { code: 400, msg: '客户ID不能为空' };
      }
      
      // 检查客户是否存在
      const clientRes = await collection.doc(clientId).get();
      if (clientRes.data.length === 0) {
        return { code: 404, msg: '客户不存在' };
      }
      
      const client = clientRes.data[0];
      if (client.role !== 'client') {
        return { code: 403, msg: '只能删除客户账号' };
      }
      
      const clientPhone = client.phone;
      
      // 删除客户相关的所有数据 - 使用 ID 和 手机号 双重清理
      const deleteTasks = [
        collection.doc(clientId).remove(), // 用户账号
        db.collection('he_daily_plans').where({ user_id: clientId }).remove(), // 计划
        db.collection('he_inventory').where({ user_id: clientId }).remove(), // 库存
        db.collection('he_inventory_logs').where({ user_id: clientId }).remove(), // 库存日志
        db.collection('he_interaction_logs').where({ user_id: clientId }).remove(), // 沟通记录
        db.collection('he_notifications').where({ user_id: clientId }).remove(), // 通知
        db.collection('he_checkin_stats').where({ user_id: clientId }).remove(), // 统计
        db.collection('he_orders').where({ user_id: clientId }).remove(), // 按 ID 删订单
        db.collection('he_health_logs').where({ user_id: clientId }).remove() // 健康日志
      ];
      
      // 【关键修复】如果存在手机号，则通过手机号进行地毯式清理（解决测试数据 ID 不匹配问题）
      if (clientPhone) {
        deleteTasks.push(
          db.collection('he_orders').where({ phone: clientPhone }).remove(),
          db.collection('he_daily_plans').where({ phone: clientPhone }).remove(),
          db.collection('he_health_logs').where({ phone: clientPhone }).remove()
        );
      }
      
      await Promise.all(deleteTasks.map(t => t.catch(e => console.error('Cascaded delete error:', e))));
      
      return {
        code: 0,
        msg: '客户及其相关数据已彻底删除'
      };
    }

    return { code: 400, msg: '未知操作: ' + action };
  } catch (err) {
    console.error('user-center error:', err);
    console.error('Error stack:', err.stack);
    return { code: 500, msg: '服务器错误: ' + (err.message || '未知'), error: err.stack };
  }
};

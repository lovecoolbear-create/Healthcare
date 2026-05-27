/**
 * 每日营养师汇总通知云函数
 * 定时触发：每天上午9点执行
 * 发送内容：
 * 1. 低库存客户数量（库存<7天）
 * 2. WROM<60需要跟进的客户
 * 3. 今日未打卡客户
 * 4. 待发货订单数量
 */

const db = uniCloud.database();

// 获取今日日期字符串 YYYY-MM-DD
const getToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// 获取营养师列表
const getNutritionists = async () => {
  const res = await db.collection('he_users')
    .where({
      role: db.command.in(['nutritionist', 'admin'])
    })
    .get();
  return res.data || [];
};

// 统计低库存客户（库存覆盖天数<7）
const getLowInventoryClients = async () => {
  const res = await db.collection('he_users')
    .where({
      role: 'client',
      inventory_coverage_days: db.command.lt(7)
    })
    .count();
  return res.total || 0;
};

// 获取低库存客户详情
const getLowInventoryClientDetails = async () => {
  const res = await db.collection('he_users')
    .where({
      role: 'client',
      inventory_coverage_days: db.command.lt(7)
    })
    .limit(10)
    .get();
  return res.data || [];
};

// 统计WROM<60需要跟进的客户
const getWromAtRiskClients = async () => {
  const res = await db.collection('he_users')
    .where({
      role: 'client',
      wrom_score: db.command.lt(60)
    })
    .count();
  return res.total || 0;
};

// 获取WROM<60客户详情
const getWromAtRiskClientDetails = async () => {
  const res = await db.collection('he_users')
    .where({
      role: 'client',
      wrom_score: db.command.lt(60)
    })
    .orderBy('wrom_score', 'asc')
    .limit(10)
    .get();
  return res.data || [];
};

// 统计今日未打卡客户
const getUncheckedInClients = async () => {
  const today = getToday();
  // 获取今日已打卡的客户ID列表
  const checkinRes = await db.collection('he_daily_plans')
    .where({
      date: today,
      checkin_completed: true
    })
    .field({ user_id: true })
    .get();
  
  const checkedInUserIds = checkinRes.data.map(item => item.user_id);
  
  // 统计未打卡客户数量
  const query = checkedInUserIds.length > 0 
    ? { role: 'client', _id: db.command.nin(checkedInUserIds) }
    : { role: 'client' };
  
  const res = await db.collection('he_users')
    .where(query)
    .count();
  
  return res.total || 0;
};

// 统计待发货订单数量
const getPendingOrders = async () => {
  const res = await db.collection('he_orders')
    .where({
      status: 0 // 待发货状态
    })
    .count();
  return res.total || 0;
};

// 构建汇总消息
const buildSummaryMessage = (stats) => {
  const { 
    lowInventoryCount, 
    lowInventoryClients,
    wromAtRiskCount, 
    wromAtRiskClients,
    uncheckedInCount, 
    pendingOrdersCount,
    date 
  } = stats;
  
  let message = `📊 每日运营汇总 (${date})\n\n`;
  
  // 低库存预警
  message += `🚨 低库存预警: ${lowInventoryCount} 人\n`;
  if (lowInventoryCount > 0) {
    const names = lowInventoryClients.map(c => c.username || '未知').slice(0, 5).join(', ');
    message += `   优先关注: ${names}${lowInventoryCount > 5 ? ' 等' : ''}\n`;
  }
  message += '\n';
  
  // WROM风险客户
  message += `⚠️ WROM风险: ${wromAtRiskCount} 人\n`;
  if (wromAtRiskCount > 0) {
    const names = wromAtRiskClients.map(c => `${c.username || '未知'}(W:${c.wrom_score || 0})`).slice(0, 3).join(', ');
    message += `   需跟进: ${names}${wromAtRiskCount > 3 ? ' 等' : ''}\n`;
  }
  message += '\n';
  
  // 打卡情况
  message += `📋 今日未打卡: ${uncheckedInCount} 人\n\n`;
  
  // 订单情况
  message += `📦 待发货订单: ${pendingOrdersCount} 单\n\n`;
  
  message += `👉 立即登录系统处理: https://admin.yourdomain.com`;
  
  return message;
};

// 发送通知（支持多种渠道）
const sendNotification = async (nutritionist, message) => {
  // 这里可以实现多种通知方式：
  // 1. 微信小程序订阅消息
  // 2. 短信通知
  // 3. 邮件通知
  // 4. 企业微信/钉钉机器人
  
  console.log(`发送通知给 ${nutritionist.username || nutritionist._id}:`);
  console.log(message);
  
  // 记录通知日志
  await db.collection('he_notification_logs').add({
    user_id: nutritionist._id,
    type: 'daily_summary',
    content: message,
    sent_at: Date.now(),
    status: 'sent',
    created_at: Date.now()
  });
  
  return true;
};

// 主函数
exports.main = async (event, context) => {
  // 如果是定时触发，context会有trigger信息
  const isScheduled = context && context.triggerSource === 'timer';
  
  console.log('每日汇总通知任务启动:', new Date().toISOString());
  console.log('触发方式:', isScheduled ? '定时触发' : '手动触发');
  
  try {
    // 获取统计数据
    const [
      lowInventoryCount,
      lowInventoryClients,
      wromAtRiskCount,
      wromAtRiskClients,
      uncheckedInCount,
      pendingOrdersCount
    ] = await Promise.all([
      getLowInventoryClients(),
      getLowInventoryClientDetails(),
      getWromAtRiskClients(),
      getWromAtRiskClientDetails(),
      getUncheckedInClients(),
      getPendingOrders()
    ]);
    
    const stats = {
      lowInventoryCount,
      lowInventoryClients,
      wromAtRiskCount,
      wromAtRiskClients,
      uncheckedInCount,
      pendingOrdersCount,
      date: getToday()
    };
    
    console.log('统计数据:', stats);
    
    // 构建消息
    const message = buildSummaryMessage(stats);
    
    // 获取所有营养师
    const nutritionists = await getNutritionists();
    console.log(`找到 ${nutritionists.length} 位营养师/管理员`);
    
    // 发送通知
    const results = [];
    for (const nutritionist of nutritionists) {
      try {
        const result = await sendNotification(nutritionist, message);
        results.push({ userId: nutritionist._id, success: result });
      } catch (err) {
        console.error(`发送给 ${nutritionist._id} 失败:`, err);
        results.push({ userId: nutritionist._id, success: false, error: err.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    
    return {
      code: 0,
      msg: `汇总通知发送完成: ${successCount}/${nutritionists.length} 成功`,
      data: {
        stats,
        results,
        messagePreview: message.substring(0, 200) + '...'
      }
    };
    
  } catch (err) {
    console.error('每日汇总任务失败:', err);
    return {
      code: 500,
      msg: '任务执行失败: ' + err.message,
      error: err.stack
    };
  }
};

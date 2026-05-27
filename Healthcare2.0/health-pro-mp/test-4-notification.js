/**
 * 测试4: 通知系统
 * 流程：站内通知推送 → 微信推送 → 短信通知 → 已读标记
 */

const db = {
  users: [],
  notifications: [],
  pushLogs: [],
  smsLogs: []
};

const generateId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// ==================== 模拟API ====================

// 1. 创建站内通知
async function createNotification(userId, title, content, type, relatedData = {}) {
  const notification = {
    _id: generateId(),
    user_id: userId,
    title: title,
    content: content,
    type: type, // system, order, checkin, health, alert
    read: false,
    read_at: null,
    related_data: relatedData,
    created_at: Date.now()
  };
  
  db.notifications.push(notification);
  
  console.log('📬 站内通知创建');
  console.log('   收件人:', userId);
  console.log('   标题:', title);
  console.log('   类型:', type);
  console.log('   时间:', new Date().toLocaleString());
  
  return notification;
}

// 2. 模拟微信推送
async function sendWechatPush(userId, templateId, data) {
  console.log('\n📱 微信推送模拟');
  
  const push = {
    _id: generateId(),
    user_id: userId,
    platform: 'wechat',
    template_id: templateId,
    data: data,
    status: 'sent',
    sent_at: Date.now()
  };
  
  db.pushLogs.push(push);
  
  console.log('✅ 微信推送已发送');
  console.log('   模板:', templateId);
  console.log('   数据:', JSON.stringify(data, null, 2));
  
  return push;
}

// 3. 模拟短信通知
async function sendSms(phone, templateCode, params) {
  console.log('\n📲 短信通知模拟');
  
  const sms = {
    _id: generateId(),
    phone: phone,
    template_code: templateCode,
    params: params,
    status: 'sent',
    sent_at: Date.now()
  };
  
  db.smsLogs.push(sms);
  
  console.log('✅ 短信已发送');
  console.log('   手机号:', phone.substring(0, 3) + '****' + phone.substring(7));
  console.log('   模板:', templateCode);
  console.log('   参数:', JSON.stringify(params));
  
  return sms;
}

// 4. 获取通知列表
async function getNotifications(userId, limit = 10) {
  const userNotifications = db.notifications
    .filter(n => n.user_id === userId)
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit);
  
  return userNotifications;
}

// 5. 标记通知已读
async function markNotificationRead(notificationId) {
  const notification = db.notifications.find(n => n._id === notificationId);
  if (!notification) return null;
  
  notification.read = true;
  notification.read_at = Date.now();
  notification.updated_at = Date.now();
  
  console.log('\n✅ 通知已标记为已读');
  console.log('   ID:', notificationId.substring(0, 15) + '...');
  console.log('   标题:', notification.title);
  
  return notification;
}

// 6. 标记全部已读
async function markAllRead(userId) {
  let count = 0;
  db.notifications.forEach(n => {
    if (n.user_id === userId && !n.read) {
      n.read = true;
      n.read_at = Date.now();
      count++;
    }
  });
  
  console.log('\n✅ 全部通知已标记为已读');
  console.log('   标记数量:', count);
  
  return count;
}

// 7. 场景触发器
async function triggerNotification(scene, data) {
  console.log('\n🎯 场景触发:', scene);
  
  switch(scene) {
    case 'checkin_completed':
      // 客户打卡完成，通知顾问
      await createNotification(
        data.nutritionistId,
        '客户完成今日打卡',
        `${data.clientName} 已完成 ${data.date} 的健康打卡`,
        'checkin',
        { client_id: data.clientId, date: data.date, score: data.score }
      );
      await sendWechatPush(data.nutritionistId, 'checkin_alert', {
        first: '客户打卡提醒',
        keyword1: data.clientName,
        keyword2: data.date,
        remark: '点击查看详情'
      });
      break;
      
    case 'low_stock':
      // 库存预警，通知客户和顾问
      await createNotification(
        data.clientId,
        '库存预警提醒',
        `您的 ${data.productName} 库存不足，建议及时补货`,
        'alert',
        { product: data.productName, stock: data.stock, threshold: data.threshold }
      );
      await sendWechatPush(data.clientId, 'stock_alert', {
        first: '库存预警',
        keyword1: data.productName,
        keyword2: `${data.stock}瓶`,
        remark: '点击下单补货'
      });
      // 同时通知顾问
      await createNotification(
        data.nutritionistId,
        '客户库存预警',
        `${data.clientName} 的 ${data.productName} 库存不足`,
        'alert',
        { client_id: data.clientId, product: data.productName }
      );
      break;
      
    case 'order_shipped':
      // 订单发货通知
      await createNotification(
        data.clientId,
        '订单已发货',
        `您的订单 #${data.orderId.slice(-6)} 已发货，物流单号：${data.trackingNo}`,
        'order',
        { order_id: data.orderId, tracking_no: data.trackingNo }
      );
      await sendWechatPush(data.clientId, 'order_shipped', {
        first: '订单发货通知',
        keyword1: data.orderId.slice(-6),
        keyword2: '已发货',
        remark: `物流单号：${data.trackingNo}`
      });
      await sendSms(data.phone, 'SMS_123456', {
        order_no: data.orderId.slice(-6),
        tracking_no: data.trackingNo
      });
      break;
      
    case 'protocol_assigned':
      // 方案分配通知
      await createNotification(
        data.clientId,
        '新健康方案已分配',
        `顾问为您分配了新方案：${data.protocolName}，请查看今日任务`,
        'system',
        { protocol_id: data.protocolId, protocol_name: data.protocolName }
      );
      await sendWechatPush(data.clientId, 'protocol_assigned', {
        first: '方案更新通知',
        keyword1: data.protocolName,
        keyword2: '已生效',
        remark: '点击进入小程序查看'
      });
      break;
      
    case 'wrom_score_update':
      // WROM评分更新
      await createNotification(
        data.clientId,
        '健康评分已更新',
        `您的健康评分已更新为 ${data.newScore} 分，较上周${data.change > 0 ? '提升' : '下降'} ${Math.abs(data.change)} 分`,
        'health',
        { old_score: data.oldScore, new_score: data.newScore, change: data.change }
      );
      break;
      
    default:
      console.log('   未知场景');
  }
}

// ==================== 主测试流程 ====================

async function runTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    测试4: 通知系统 - 微信/短信/站内通知');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // 初始化用户
    const client = { _id: 'client_001', username: '张小明', phone: '17711111111', role: 'client' };
    const nutritionist = { _id: 'nutri_001', username: '王顾问', role: 'nutritionist' };
    db.users.push(client, nutritionist);
    
    console.log('\n📢 场景1: 客户打卡完成 → 通知顾问');
    await triggerNotification('checkin_completed', {
      clientId: client._id,
      clientName: client.username,
      nutritionistId: nutritionist._id,
      date: '2026-04-11',
      score: 85
    });
    
    console.log('\n📢 场景2: 库存预警 → 通知客户和顾问');
    await triggerNotification('low_stock', {
      clientId: client._id,
      clientName: client.username,
      nutritionistId: nutritionist._id,
      productName: '深海鱼油',
      stock: 2,
      threshold: 5
    });
    
    console.log('\n📢 场景3: 订单发货 → 通知客户（微信+短信）');
    await triggerNotification('order_shipped', {
      clientId: client._id,
      phone: client.phone,
      orderId: 'ORDER123456789',
      trackingNo: 'SF1234567890'
    });
    
    console.log('\n📢 场景4: 方案分配 → 通知客户');
    await triggerNotification('protocol_assigned', {
      clientId: client._id,
      protocolId: 'PROTO_001',
      protocolName: '春季调理方案'
    });
    
    console.log('\n📢 场景5: WROM评分更新 → 通知客户');
    await triggerNotification('wrom_score_update', {
      clientId: client._id,
      oldScore: 75,
      newScore: 82,
      change: 7
    });
    
    // 获取通知列表
    console.log('\n📋 获取客户通知列表:');
    const clientNotifications = await getNotifications(client._id);
    console.log('   通知数量:', clientNotifications.length);
    console.log('   未读数量:', clientNotifications.filter(n => !n.read).length);
    
    clientNotifications.slice(0, 3).forEach((n, i) => {
      console.log(`   ${i + 1}. ${n.title} ${n.read ? '✓已读' : '●未读'}`);
    });
    
    // 标记已读
    if (clientNotifications.length > 0) {
      await markNotificationRead(clientNotifications[0]._id);
    }
    
    // 标记全部已读
    await markAllRead(client._id);
    
    // 顾问端通知
    console.log('\n📋 获取顾问通知列表:');
    const nutriNotifications = await getNotifications(nutritionist._id);
    console.log('   通知数量:', nutriNotifications.length);
    nutriNotifications.forEach((n, i) => {
      console.log(`   ${i + 1}. ${n.title}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('              ✅ 通知系统测试通过');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📁 最终数据:');
    console.log('   站内通知:', db.notifications.length);
    console.log('   微信推送:', db.pushLogs.length);
    console.log('   短信发送:', db.smsLogs.length);
    
    console.log('\n   通知类型分布:');
    const typeCount = {};
    db.notifications.forEach(n => {
      typeCount[n.type] = (typeCount[n.type] || 0) + 1;
    });
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`     ${type}: ${count}`);
    });
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

runTest();

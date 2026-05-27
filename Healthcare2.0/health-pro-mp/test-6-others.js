/**
 * 测试6: 其他功能
 * 流程：知识库CRUD → 触发器管理 → 自动触发执行 → 客服聊天
 */

const db = {
  knowledge: [],
  triggers: [],
  triggerLogs: [],
  chats: [],
  notifications: []
};

const generateId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// ==================== 知识库系统 ====================

// 1. 创建知识库条目
async function saveKnowledge(data, createdBy) {
  console.log('\n📚 知识库 - 创建条目');
  
  const knowledge = {
    _id: data.id || generateId(),
    title: data.title,
    content: data.content,
    category: data.category || 'general',
    tags: data.tags || [],
    status: data.status || 'active',
    created_by: createdBy,
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  db.knowledge.push(knowledge);
  
  console.log('✅ 知识创建成功');
  console.log('   标题:', knowledge.title);
  console.log('   分类:', knowledge.category);
  console.log('   标签:', knowledge.tags.join(', '));
  
  return knowledge;
}

// 2. 获取知识库列表
async function getKnowledgeList(category, limit = 50) {
  console.log('\n📖 知识库 - 获取列表');
  
  let list = db.knowledge;
  if (category && category !== 'all') {
    list = list.filter(k => k.category === category);
  }
  
  list = list.slice(0, limit);
  
  console.log('✅ 获取完成');
  console.log('   总数:', db.knowledge.length);
  console.log('   筛选后:', list.length);
  
  return list;
}

// 3. 搜索知识库
async function searchKnowledge(keyword) {
  console.log('\n🔍 知识库 - 搜索:', keyword);
  
  const results = db.knowledge.filter(k => 
    k.title.includes(keyword) || 
    k.content.includes(keyword) ||
    k.tags.some(t => t.includes(keyword))
  );
  
  console.log('✅ 搜索完成');
  console.log('   找到', results.length, '条结果');
  results.forEach(r => {
    console.log('   -', r.title);
  });
  
  return results;
}

// 4. 删除知识
async function deleteKnowledge(id) {
  const index = db.knowledge.findIndex(k => k._id === id);
  if (index > -1) {
    db.knowledge.splice(index, 1);
    console.log('✅ 知识已删除');
    return true;
  }
  return false;
}

// ==================== 触发器系统 ====================

// 5. 创建触发器
async function createTrigger(data) {
  console.log('\n⚡ 触发器 - 创建');
  
  const trigger = {
    _id: generateId(),
    name: data.name,
    condition: data.condition, // { type: 'time'|'event', value: ... }
    action: data.action, // { type: 'notification'|'task', value: ... }
    enabled: true,
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  db.triggers.push(trigger);
  
  console.log('✅ 触发器创建成功');
  console.log('   名称:', trigger.name);
  console.log('   条件:', trigger.condition.type);
  console.log('   动作:', trigger.action.type);
  
  return trigger;
}

// 6. 获取触发器列表
async function getTriggers() {
  console.log('\n📋 触发器 - 获取列表');
  
  console.log('✅ 当前触发器:', db.triggers.length);
  db.triggers.forEach(t => {
    console.log(`   ${t.enabled ? '✓' : '✗'} ${t.name} (${t.condition.type} → ${t.action.type})`);
  });
  
  return db.triggers;
}

// 7. 更新触发器状态
async function updateTrigger(id, updates) {
  const trigger = db.triggers.find(t => t._id === id);
  if (!trigger) return null;
  
  Object.assign(trigger, updates, { updated_at: Date.now() });
  console.log('✅ 触发器已更新:', trigger.name);
  return trigger;
}

// 8. 执行触发器检查
async function checkTriggers(context) {
  console.log('\n🔄 触发器 - 执行检查');
  
  const executed = [];
  
  for (const trigger of db.triggers.filter(t => t.enabled)) {
    let shouldExecute = false;
    
    switch(trigger.condition.type) {
      case 'time':
        // 检查是否到达触发时间
        if (context.hour === trigger.condition.hour) {
          shouldExecute = true;
        }
        break;
        
      case 'low_stock':
        // 检查库存
        if (context.inventory && context.inventory.stock <= trigger.condition.threshold) {
          shouldExecute = true;
        }
        break;
        
      case 'missed_checkin':
        // 检查漏打卡
        if (context.lastCheckin && context.lastCheckin < getDateDaysAgo(1)) {
          shouldExecute = true;
        }
        break;
        
      case 'wrom_drop':
        // 检查WROM下降
        if (context.wrom && context.wrom.old > context.wrom.new + 10) {
          shouldExecute = true;
        }
        break;
    }
    
    if (shouldExecute) {
      // 执行动作
      await executeTriggerAction(trigger, context);
      executed.push(trigger);
      
      // 记录日志
      db.triggerLogs.push({
        _id: generateId(),
        trigger_id: trigger._id,
        trigger_name: trigger.name,
        executed_at: Date.now(),
        context: context
      });
    }
  }
  
  console.log('✅ 检查完成，执行了', executed.length, '个触发器');
  return executed;
}

// 9. 执行触发器动作
async function executeTriggerAction(trigger, context) {
  switch(trigger.action.type) {
    case 'notification':
      console.log('   📬 发送通知:', trigger.action.message);
      db.notifications.push({
        _id: generateId(),
        user_id: context.userId,
        title: trigger.name,
        content: trigger.action.message,
        type: 'auto_trigger',
        created_at: Date.now()
      });
      break;
      
    case 'create_task':
      console.log('   ✅ 创建任务:', trigger.action.task);
      break;
      
    case 'send_message':
      console.log('   💬 发送消息给顾问:', trigger.action.message);
      break;
  }
}

// ==================== 客服聊天系统 ====================

// 10. 创建聊天会话
async function createChatSession(clientId, nutritionistId) {
  console.log('\n💬 客服聊天 - 创建会话');
  
  const session = {
    _id: generateId(),
    client_id: clientId,
    nutritionist_id: nutritionistId,
    status: 'active',
    created_at: Date.now(),
    messages: []
  };
  
  db.chats.push(session);
  
  console.log('✅ 会话创建成功');
  console.log('   会话ID:', session._id.substring(0, 15) + '...');
  
  return session;
}

// 11. 发送消息
async function sendMessage(sessionId, senderId, senderRole, content, type = 'text') {
  const session = db.chats.find(c => c._id === sessionId);
  if (!session) return null;
  
  const message = {
    _id: generateId(),
    sender_id: senderId,
    sender_role: senderRole,
    content: content,
    type: type,
    read: false,
    created_at: Date.now()
  };
  
  session.messages.push(message);
  
  console.log(`\n📨 新消息 [${senderRole}]`);
  console.log('   内容:', content.substring(0, 50) + (content.length > 50 ? '...' : ''));
  
  return message;
}

// 12. 获取聊天历史
async function getChatHistory(sessionId) {
  const session = db.chats.find(c => c._id === sessionId);
  if (!session) return null;
  
  console.log('\n📜 聊天历史');
  console.log('   总消息数:', session.messages.length);
  session.messages.slice(-5).forEach(m => {
    console.log(`   ${m.sender_role === 'client' ? '👤' : '👨‍⚕️'} ${m.content.substring(0, 30)}`);
  });
  
  return session.messages;
}

// 13. 标记已读
async function markMessagesRead(sessionId, readerId) {
  const session = db.chats.find(c => c._id === sessionId);
  if (!session) return 0;
  
  let count = 0;
  session.messages.forEach(m => {
    if (m.sender_id !== readerId && !m.read) {
      m.read = true;
      count++;
    }
  });
  
  console.log('✅ 已标记', count, '条消息为已读');
  return count;
}

// 14. 智能客服自动回复
async function autoReply(sessionId, clientMessage) {
  console.log('\n🤖 智能客服 - 自动回复');
  
  // 简单的关键词匹配
  const replies = {
    '怎么吃': '请按照您的健康方案，在对应时间段服用产品。如有疑问可联系顾问。',
    '什么时候吃': '请查看今日计划中的时间段安排，一般分为早中晚三个时段。',
    '库存': '您可以在"我的库存"页面查看当前库存，如库存不足建议及时补货。',
    '订单': '您可以在"我的订单"查看订单状态，发货后会收到微信通知。',
    '不舒服': '如有身体不适，请暂停服用并立即联系您的顾问。',
    '副作用': '如出现不适反应，请记录体感情绪并联系顾问调整方案。'
  };
  
  let reply = '您好，我已收到您的问题。如需更详细的帮助，请联系您的专属顾问。';
  
  for (const [keyword, response] of Object.entries(replies)) {
    if (clientMessage.includes(keyword)) {
      reply = response;
      break;
    }
  }
  
  // 模拟延迟
  await new Promise(r => setTimeout(r, 500));
  
  const autoMessage = await sendMessage(sessionId, 'system', 'assistant', reply, 'auto');
  
  console.log('✅ 自动回复已发送');
  console.log('   匹配关键词:', Object.keys(replies).find(k => clientMessage.includes(k)) || '无');
  
  return autoMessage;
}

// ==================== 辅助函数 ====================

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// ==================== 主测试流程 ====================

async function runTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    测试6: 其他功能 - 知识库/触发器/客服聊天');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // ========== 知识库测试 ==========
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📚 知识库功能测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await saveKnowledge({
      title: '深海鱼油服用指南',
      content: '建议每日2粒，随早餐服用。如有胃部不适可改为餐后服用。',
      category: 'product_guide',
      tags: ['鱼油', '服用指南', '早餐']
    }, 'admin_001');
    
    await saveKnowledge({
      title: '如何提高打卡依从性',
      content: '1. 设置微信提醒 2. 将产品放在显眼位置 3. 建立固定服用习惯',
      category: 'tips',
      tags: ['打卡', '依从性', '提醒']
    }, 'admin_001');
    
    await saveKnowledge({
      title: '健康指标解读 - 体重',
      content: '正常减重速度为每周0.5-1kg，过快可能影响健康。',
      category: 'health_education',
      tags: ['体重', '指标解读', '减重']
    }, 'admin_001');
    
    // 获取列表
    await getKnowledgeList('all');
    
    // 搜索
    await searchKnowledge('打卡');
    
    // ========== 触发器测试 ==========
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚡ 触发器功能测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // 创建触发器
    const trigger1 = await createTrigger({
      name: '库存预警通知',
      condition: { type: 'low_stock', threshold: 5 },
      action: { type: 'notification', message: '您的产品库存不足，请及时补货' }
    });
    
    const trigger2 = await createTrigger({
      name: '早晨打卡提醒',
      condition: { type: 'time', hour: 9 },
      action: { type: 'notification', message: '早上好！记得完成今日健康打卡' }
    });
    
    const trigger3 = await createTrigger({
      name: '漏打卡提醒',
      condition: { type: 'missed_checkin', days: 1 },
      action: { type: 'send_message', message: '客户昨日未打卡，请关注' }
    });
    
    // 获取列表
    await getTriggers();
    
    // 执行触发器检查
    await checkTriggers({
      userId: 'client_001',
      hour: 9,
      inventory: { stock: 3, threshold: 5 },
      lastCheckin: getDateDaysAgo(2),
      wrom: { old: 75, new: 60 }
    });
    
    // ========== 客服聊天测试 ==========
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💬 客服聊天功能测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const session = await createChatSession('client_001', 'nutri_001');
    
    // 客户发送消息
    await sendMessage(session._id, 'client_001', 'client', '顾问您好，我想问一下鱼油应该怎么吃？');
    
    // 智能客服自动回复
    await autoReply(session._id, '鱼油应该怎么吃？');
    
    // 顾问回复
    await sendMessage(session._id, 'nutri_001', 'nutritionist', '您好！建议每天早上随餐服用2粒，这样吸收更好。');
    
    // 客户继续问
    await sendMessage(session._id, 'client_001', 'client', '好的，那我空腹可以吃吗？');
    await autoReply(session._id, '空腹可以吃吗？');
    
    // 获取历史
    await getChatHistory(session._id);
    
    // 标记已读
    await markMessagesRead(session._id, 'nutri_001');
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('              ✅ 其他功能测试通过');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📁 最终数据:');
    console.log('   知识库条目:', db.knowledge.length);
    console.log('   触发器:', db.triggers.length);
    console.log('   触发执行日志:', db.triggerLogs.length);
    console.log('   聊天会话:', db.chats.length);
    console.log('   自动通知:', db.notifications.length);
    
    console.log('\n   知识库分类:');
    const cats = {};
    db.knowledge.forEach(k => {
      cats[k.category] = (cats[k.category] || 0) + 1;
    });
    Object.entries(cats).forEach(([cat, count]) => {
      console.log(`     ${cat}: ${count}`);
    });
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

runTest();

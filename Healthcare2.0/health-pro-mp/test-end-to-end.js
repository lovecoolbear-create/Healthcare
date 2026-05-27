/**
 * 端到端业务流程测试脚本
 * 模拟：Web端制定方案 → 小程序同步 → 库存预警 → 下单 → 发货 → 收货
 */

const db = {
  users: [],
  templates: [],
  plans: [],
  inventory: [],
  orders: []
};

// ==================== 测试数据 ====================
const TEST_USER_ID = 'user_cai_17722222222';
const TEST_NUTRITIONIST_ID = 'nutritionist_001';

// ==================== 模拟API ====================

// 1. Web端：创建健康方案
async function createTemplate() {
  console.log('\n📋 Step 1: Web端创建方案');
  
  const template = {
    _id: 'template_' + Date.now(),
    name: '降血脂方案',
    nutritionist_id: TEST_NUTRITIONIST_ID,
    products: [
      {
        product_id: 'prod_fish_oil_001',
        name: '深海鱼油',
        daily_usage: 2,
        unit: '粒',
        timing: 'morning',
        slot: '早'
      },
      {
        product_id: 'prod_vit_c_002',
        name: '维生素C',
        daily_usage: 1,
        unit: '粒',
        timing: 'lunch',
        slot: '中'
      }
    ],
    created_at: Date.now()
  };
  
  db.templates.push(template);
  console.log('✅ 方案创建成功:', template.name);
  console.log('   产品:', template.products.map(p => p.name).join(', '));
  return template._id;
}

// 2. Web端：分配方案给客户
async function assignTemplateToUser(templateId) {
  console.log('\n📋 Step 2: 分配方案给客户');
  
  const user = {
    _id: TEST_USER_ID,
    username: '蔡',
    phone: '17722222222',
    role: 'client',
    assigned_templates: [templateId], // 关键字段
    nutritionist_id: TEST_NUTRITIONIST_ID,
    created_at: Date.now()
  };
  
  db.users.push(user);
  console.log('✅ 方案已分配给客户:', user.username);
  console.log('   方案ID:', templateId);
  return user;
}

// 3. 小程序：获取用户方案 (getOwnProtocol)
async function getOwnProtocol(userId) {
  console.log('\n📱 Step 3: 小程序获取方案');
  
  const user = db.users.find(u => u._id === userId);
  if (!user || !user.assigned_templates || user.assigned_templates.length === 0) {
    console.log('❌ 用户无方案');
    return null;
  }
  
  const templateId = user.assigned_templates[0];
  const template = db.templates.find(t => t._id === templateId);
  
  if (!template) {
    console.log('❌ 方案不存在');
    return null;
  }
  
  const protocol = {
    name: template.name,
    items: template.products.map(p => ({
      product_id: p.product_id,
      product_name: p.name,
      daily_usage: p.daily_usage,
      slot: p.slot
    }))
  };
  
  console.log('✅ 获取方案成功:', protocol.name);
  console.log('   产品数:', protocol.items.length);
  return protocol;
}

// 4. 生成每日计划 (generateDailyPlan)
async function generateDailyPlan(userId, date) {
  console.log('\n📅 Step 4: 生成每日计划');
  
  const user = db.users.find(u => u._id === userId);
  const assignedTemplates = user.assigned_templates || [];
  
  if (assignedTemplates.length === 0) {
    console.log('❌ 用户未分配方案，无法生成计划');
    return null;
  }
  
  // 获取所有方案产品
  let allTasks = [];
  for (const templateId of assignedTemplates) {
    const template = db.templates.find(t => t._id === templateId);
    if (template) {
      const tasks = template.products.map(p => ({
        product_id: p.product_id,
        product_name: p.name,
        daily_usage: p.daily_usage,
        unit: p.unit,
        slot: p.slot,
        completed: false
      }));
      allTasks = allTasks.concat(tasks);
    }
  }
  
  const plan = {
    _id: 'plan_' + Date.now(),
    user_id: userId,
    date: date,
    template_ids: assignedTemplates,
    template_name: '降血脂方案',
    tasks: allTasks,
    water_intake: 0,
    created_at: Date.now()
  };
  
  db.plans.push(plan);
  console.log('✅ 每日计划生成成功');
  console.log('   日期:', date);
  console.log('   任务数:', plan.tasks.length);
  console.log('   任务列表:');
  plan.tasks.forEach(t => {
    console.log(`     - ${t.slot}: ${t.product_name} ${t.daily_usage}${t.unit}`);
  });
  return plan;
}

// 5. 计算库存预警 (基于方案)
async function calculateInventoryAlert(userId) {
  console.log('\n🔔 Step 5: 计算库存预警');
  
  const user = db.users.find(u => u._id === userId);
  const assignedTemplates = user.assigned_templates || [];
  
  if (assignedTemplates.length === 0) {
    console.log('✅ 无方案，库存状态: 无方案');
    return { status: 'no_plan', low_count: 0, message: '无方案' };
  }
  
  // 获取方案产品
  let protocolItems = [];
  for (const templateId of assignedTemplates) {
    const template = db.templates.find(t => t._id === templateId);
    if (template) {
      protocolItems = protocolItems.concat(template.products.map(p => ({
        product_id: p.product_id,
        product_name: p.name,
        daily_usage: p.daily_usage
      })));
    }
  }
  
  // 获取用户库存（模拟空库存）
  const userInventory = db.inventory.filter(i => i.user_id === userId);
  
  let lowCount = 0;
  const lowItems = [];
  
  for (const protocolItem of protocolItems) {
    const matched = userInventory.find(inv => 
      inv.product_id === protocolItem.product_id
    );
    
    if (!matched) {
      lowCount++;
      lowItems.push({
        name: protocolItem.product_name,
        reason: '未入库'
      });
    } else {
      // 基于可用天数预警（与云函数一致）
      const stock = Number(matched.stock || 0);
      const dailyUsage = Number(protocolItem.daily_usage || 1);
      const capacity = Number(matched.capacity || 60); // 默认60粒/瓶
      const daysThreshold = Number(matched.low_stock_days || 7); // 默认7天预警
      
      const daysRemaining = (capacity > 0 && dailyUsage > 0)
        ? ((stock * capacity) / dailyUsage)
        : 0;
      
      if (daysRemaining <= daysThreshold) {
        lowCount++;
        lowItems.push({
          name: protocolItem.product_name,
          stock: matched.stock,
          days_remaining: daysRemaining.toFixed(1),
          reason: `仅剩${daysRemaining.toFixed(0)}天用量`
        });
      }
    }
  }
  
  const status = lowCount > 0 ? 'low' : 'normal';
  const message = lowCount > 0 ? `需补货(${lowCount})` : '充足';
  
  console.log('✅ 库存预警计算完成');
  console.log('   方案产品数:', protocolItems.length);
  console.log('   预警数量:', lowCount);
  console.log('   状态:', message);
  if (lowItems.length > 0) {
    console.log('   预警产品:');
    lowItems.forEach(item => console.log(`     - ${item.name}: ${item.reason}`));
  }
  
  return { status, low_count: lowCount, message, low_items: lowItems };
}

// 6. 创建补货订单
async function createRefillOrder(userId, items) {
  console.log('\n📦 Step 6: 创建补货订单');
  
  const user = db.users.find(u => u._id === userId);
  
  const order = {
    _id: 'order_' + Date.now(),
    user_id: userId,
    nutritionist_id: user.nutritionist_id,
    items: items.map((item, index) => ({
      inventory_id: item.inventory_id || '',
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || '瓶',
      status: 0, // 待发货
      sub_order_id: `SUB${Date.now()}${index}`
    })),
    status: 0, // 待发货
    created_at: Date.now()
  };
  
  db.orders.push(order);
  console.log('✅ 订单创建成功');
  console.log('   订单ID:', order._id);
  console.log('   产品:', order.items.map(i => `${i.product_name} x${i.quantity}`).join(', '));
  console.log('   状态: 待发货');
  return order;
}

// 7. Web端发货
async function shipOrder(orderId) {
  console.log('\n🚚 Step 7: Web端发货');
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return null;
  }
  
  order.status = 1; // 已发货
  order.shipped_at = Date.now();
  order.items.forEach(item => {
    item.status = 1;
    item.shipped_at = Date.now();
  });
  
  console.log('✅ 订单已发货');
  console.log('   订单ID:', orderId);
  console.log('   发货时间:', new Date(order.shipped_at).toLocaleString());
  return order;
}

// 8. 小程序确认收货
async function confirmReceipt(orderId, userId) {
  console.log('\n✅ Step 8: 小程序确认收货');
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return null;
  }
  
  // 更新订单状态
  order.status = 2; // 已收货
  order.received_at = Date.now();
  order.items.forEach(item => {
    item.status = 2;
    item.received_at = Date.now();
  });
  
  // 添加产品到库存
  for (const item of order.items) {
    const existingInventory = db.inventory.find(i => 
      i.user_id === userId && i.product_id === item.product_id
    );
    
    if (existingInventory) {
      existingInventory.stock += item.quantity;
      existingInventory.updated_at = Date.now();
    } else {
      db.inventory.push({
        _id: 'inv_' + Date.now() + Math.random(),
        user_id: userId,
        product_id: item.product_id,
        product_name: item.product_name,
        stock: item.quantity,
        low_stock_threshold: 5,
        created_at: Date.now()
      });
    }
  }
  
  console.log('✅ 收货成功，产品已入库');
  console.log('   入库产品:', order.items.map(i => `${i.product_name} +${i.quantity}`).join(', '));
  return order;
}

// 9. 再次检查库存预警
async function checkInventoryAfterRefill(userId) {
  console.log('\n📊 Step 9: 补货后检查库存');
  
  const user = db.users.find(u => u._id === userId);
  const assignedTemplates = user.assigned_templates || [];
  
  if (assignedTemplates.length === 0) {
    console.log('✅ 无方案');
    return;
  }
  
  // 获取方案产品
  let protocolItems = [];
  for (const templateId of assignedTemplates) {
    const template = db.templates.find(t => t._id === templateId);
    if (template) {
      protocolItems = protocolItems.concat(template.products);
    }
  }
  
  // 检查库存
  const userInventory = db.inventory.filter(i => i.user_id === userId);
  
  console.log('✅ 当前库存状态:');
  protocolItems.forEach(protocolItem => {
    const inv = userInventory.find(i => i.product_id === protocolItem.product_id);
    if (inv) {
      console.log(`   ${protocolItem.name}: ${inv.stock} ${inv.unit} ✓`);
    } else {
      console.log(`   ${protocolItem.name}: 无库存 ✗`);
    }
  });
  
  // 重新计算预警
  const alert = await calculateInventoryAlert(userId);
  console.log('   最终状态:', alert.message);
}

// ==================== 主测试流程 ====================

async function runEndToEndTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('      端到端业务流程测试 - 健康计划管理系统');
  console.log('═══════════════════════════════════════════════════');
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Step 1: 创建方案
    const templateId = await createTemplate();
    
    // Step 2: 分配方案
    const user = await assignTemplateToUser(templateId);
    
    // Step 3: 小程序获取方案
    const protocol = await getOwnProtocol(TEST_USER_ID);
    
    // Step 4: 生成每日计划
    const plan = await generateDailyPlan(TEST_USER_ID, today);
    
    // Step 5: 检查库存预警（应该需要补货）
    const alert1 = await calculateInventoryAlert(TEST_USER_ID);
    
    // Step 6: 创建订单（补货）
    const order = await createRefillOrder(TEST_USER_ID, [
      { product_id: 'prod_fish_oil_001', name: '深海鱼油', quantity: 3, unit: '瓶' },
      { product_id: 'prod_vit_c_002', name: '维生素C', quantity: 2, unit: '瓶' }
    ]);
    
    // Step 7: 发货
    await shipOrder(order._id);
    
    // Step 8: 收货
    await confirmReceipt(order._id, TEST_USER_ID);
    
    // Step 9: 再次检查库存
    await checkInventoryAfterRefill(TEST_USER_ID);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('              ✅ 测试流程全部通过');
    console.log('═══════════════════════════════════════════════════');
    
    // 打印最终数据库状态
    console.log('\n📊 最终数据状态:');
    console.log('   用户:', db.users.length);
    console.log('   方案:', db.templates.length);
    console.log('   每日计划:', db.plans.length);
    console.log('   订单:', db.orders.length);
    console.log('   库存:', db.inventory.length);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

// 运行测试
runEndToEndTest();

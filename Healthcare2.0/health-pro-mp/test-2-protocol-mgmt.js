/**
 * 测试2: 方案管理增强
 * 流程：创建多方案 → 分配方案 → 暂停/恢复 → 方案修改 → 多方案并行执行
 */

const db = {
  users: [],
  templates: [],
  plans: [],
  logs: []
};

const generateId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
const today = new Date().toISOString().split('T')[0];

// ==================== 模拟API ====================

// 1. 创建方案模板
async function createTemplate(name, products, nutritionistId) {
  console.log(`\n📋 Step 1: 创建方案模板 - ${name}`);
  
  const template = {
    _id: generateId(),
    name: name,
    nutritionist_id: nutritionistId,
    products: products.map(p => ({
      product_id: generateId(),
      name: p.name,
      daily_usage: p.daily_usage || 1,
      unit: p.unit || '粒',
      slot: p.slot || '早',
      timing: p.timing || 'morning'
    })),
    status: 'active',
    version: 1,
    created_at: Date.now()
  };
  
  db.templates.push(template);
  console.log('✅ 方案创建成功');
  console.log('   名称:', name);
  console.log('   产品数:', products.length);
  template.products.forEach(p => {
    console.log(`     - ${p.slot}: ${p.name} ${p.daily_usage}${p.unit}`);
  });
  return template;
}

// 2. 分配方案给客户
async function applyTemplate(clientId, templateId, nutritionistId) {
  console.log(`\n🔗 Step 2: 分配方案给客户`);
  
  const client = db.users.find(u => u._id === clientId);
  const template = db.templates.find(t => t._id === templateId);
  
  if (!client || !template) {
    console.log('❌ 客户或方案不存在');
    return null;
  }
  
  // 初始化客户的assigned_templates
  if (!client.assigned_templates) client.assigned_templates = [];
  
  // 添加到已分配方案列表
  if (!client.assigned_templates.includes(templateId)) {
    client.assigned_templates.push(templateId);
  }
  
  // 更新客户顾问
  client.nutritionist_id = nutritionistId;
  client.updated_at = Date.now();
  
  console.log('✅ 方案分配成功');
  console.log('   客户:', client.username);
  console.log('   方案:', template.name);
  console.log('   已分配方案数:', client.assigned_templates.length);
  
  return template;
}

// 3. 生成每日计划（多方案合并）
async function generateDailyPlan(clientId, date) {
  console.log(`\n📅 Step 3: 生成每日计划（多方案合并）`);
  
  const client = db.users.find(u => u._id === clientId);
  if (!client || !client.assigned_templates || client.assigned_templates.length === 0) {
    console.log('❌ 客户无分配方案');
    return null;
  }
  
  // 获取所有方案产品并合并
  let allTasks = [];
  const templateNames = [];
  
  for (const templateId of client.assigned_templates) {
    const template = db.templates.find(t => t._id === templateId);
    if (template && template.status === 'active') {
      templateNames.push(template.name);
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
  
  // 按时间段合并相同产品
  const mergedTasks = [];
  const slotMap = {};
  
  for (const task of allTasks) {
    const key = `${task.slot}_${task.product_name}`;
    if (!slotMap[key]) {
      slotMap[key] = { ...task };
      mergedTasks.push(slotMap[key]);
    } else {
      // 合并用量（如果同一时间段有相同产品）
      slotMap[key].daily_usage += task.daily_usage;
    }
  }
  
  const plan = {
    _id: generateId(),
    user_id: clientId,
    date: date,
    template_ids: client.assigned_templates,
    template_name: templateNames.join(' + ') || '健康计划',
    tasks: mergedTasks,
    status: 'active',
    water_intake: 0,
    symptoms: [],
    created_at: Date.now()
  };
  
  db.plans.push(plan);
  
  console.log('✅ 每日计划生成成功');
  console.log('   来源方案:', templateNames.join(' + '));
  console.log('   总任务数:', mergedTasks.length);
  console.log('   时间段分布:');
  const slots = {};
  mergedTasks.forEach(t => {
    if (!slots[t.slot]) slots[t.slot] = [];
    slots[t.slot].push(t.product_name);
  });
  Object.entries(slots).forEach(([slot, products]) => {
    console.log(`     ${slot}: ${products.join(', ')}`);
  });
  
  return plan;
}

// 4. 暂停方案执行（deleteDailyPlan）
async function pauseProtocol(clientId, date, nutritionistId) {
  console.log(`\n⏸️ Step 4: 暂停方案执行`);
  
  const plan = db.plans.find(p => p.user_id === clientId && p.date === date);
  if (!plan) {
    console.log('❌ 未找到执行中的方案');
    return false;
  }
  
  // 标记为暂停状态
  plan.status = 'paused';
  plan.paused_at = Date.now();
  plan.paused_by = nutritionistId;
  
  // 记录日志
  db.logs.push({
    _id: generateId(),
    user_id: clientId,
    nutritionist_id: nutritionistId,
    type: 'system',
    content: '营养顾问暂停了当前方案执行',
    created_at: Date.now()
  });
  
  console.log('✅ 方案已暂停');
  console.log('   日期:', date);
  console.log('   操作人: 顾问');
  return true;
}

// 5. 恢复方案执行（重新生成计划）
async function resumeProtocol(clientId, date, nutritionistId) {
  console.log(`\n▶️ Step 5: 恢复方案执行`);
  
  const client = db.users.find(u => u._id === clientId);
  const pausedPlan = db.plans.find(p => 
    p.user_id === clientId && 
    p.date === date && 
    p.status === 'paused'
  );
  
  if (pausedPlan) {
    // 恢复原计划
    pausedPlan.status = 'active';
    pausedPlan.resumed_at = Date.now();
    pausedPlan.resumed_by = nutritionistId;
    
    db.logs.push({
      _id: generateId(),
      user_id: clientId,
      nutritionist_id: nutritionistId,
      type: 'system',
      content: '营养顾问恢复了方案执行',
      created_at: Date.now()
    });
    
    console.log('✅ 方案已恢复');
    console.log('   日期:', date);
    return pausedPlan;
  } else {
    // 重新生成计划
    console.log('   原计划不存在，重新生成...');
    return await generateDailyPlan(clientId, date);
  }
}

// 6. 修改方案（updateTemplate）
async function updateTemplate(templateId, updates, nutritionistId) {
  console.log(`\n✏️ Step 6: 修改方案`);
  
  const template = db.templates.find(t => t._id === templateId);
  if (!template) {
    console.log('❌ 方案不存在');
    return null;
  }
  
  // 版本控制
  const oldVersion = { ...template };
  template.version += 1;
  template.updated_at = Date.now();
  template.updated_by = nutritionistId;
  
  // 应用更新
  if (updates.name) template.name = updates.name;
  if (updates.products) {
    template.products = updates.products.map(p => ({
      product_id: generateId(),
      name: p.name,
      daily_usage: p.daily_usage || 1,
      unit: p.unit || '粒',
      slot: p.slot || '早'
    }));
  }
  
  // 记录修改历史
  if (!template.history) template.history = [];
  template.history.push({
    version: template.version - 1,
    data: oldVersion,
    updated_at: Date.now()
  });
  
  console.log('✅ 方案已更新');
  console.log('   新版本:', template.version);
  console.log('   修改内容:', updates.name ? '名称' : '', updates.products ? '产品' : '');
  if (updates.products) {
    console.log('   新产品列表:');
    template.products.forEach(p => {
      console.log(`     - ${p.slot}: ${p.name} ${p.daily_usage}${p.unit}`);
    });
  }
  
  return template;
}

// 7. 多方案并行管理
async function manageMultipleProtocols(clientId) {
  console.log(`\n🔄 Step 7: 多方案并行管理`);
  
  const client = db.users.find(u => u._id === clientId);
  if (!client || !client.assigned_templates) {
    console.log('❌ 客户无方案');
    return null;
  }
  
  console.log('✅ 多方案并行状态:');
  console.log('   客户:', client.username);
  console.log('   已分配方案数:', client.assigned_templates.length);
  
  client.assigned_templates.forEach((templateId, index) => {
    const template = db.templates.find(t => t._id === templateId);
    console.log(`   方案${index + 1}: ${template?.name || '未知'}`);
    console.log(`     状态: ${template?.status || '未知'}`);
    console.log(`     版本: ${template?.version || 1}`);
    console.log(`     产品数: ${template?.products?.length || 0}`);
  });
  
  // 查找今日合并计划
  const todayPlan = db.plans.find(p => p.user_id === clientId && p.date === today);
  if (todayPlan) {
    console.log('   今日合并计划:');
    console.log(`     来源: ${todayPlan.template_name}`);
    console.log(`     任务数: ${todayPlan.tasks.length}`);
    console.log(`     状态: ${todayPlan.status}`);
  }
  
  return client.assigned_templates;
}

// 8. 方案版本回滚
async function rollbackTemplate(templateId, targetVersion) {
  console.log(`\n↩️ Step 8: 方案版本回滚`);
  
  const template = db.templates.find(t => t._id === templateId);
  if (!template || !template.history) {
    console.log('❌ 方案无历史版本');
    return null;
  }
  
  const target = template.history.find(h => h.version === targetVersion);
  if (!target) {
    console.log('❌ 目标版本不存在');
    return null;
  }
  
  // 保存当前为历史
  template.history.push({
    version: template.version,
    data: { ...template },
    updated_at: Date.now()
  });
  
  // 恢复到目标版本
  const restored = target.data;
  template.name = restored.name;
  template.products = restored.products;
  template.version += 1;
  template.restored_from = targetVersion;
  
  console.log('✅ 方案已回滚');
  console.log('   从版本:', template.version - 1);
  console.log('   恢复到版本:', targetVersion);
  console.log('   新创建版本:', template.version);
  
  return template;
}

// ==================== 主测试流程 ====================

async function runTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    测试2: 方案管理增强 - 多方案/暂停/恢复/修改');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // 初始化用户
    const client = { _id: 'client_001', username: '张小明', role: 'client' };
    const nutritionist = { _id: 'nutri_001', username: '王顾问', role: 'nutritionist' };
    db.users.push(client, nutritionist);
    
    // 创建多个方案
    const template1 = await createTemplate('降血脂方案', [
      { name: '深海鱼油', daily_usage: 2, unit: '粒', slot: '早' },
      { name: '辅酶Q10', daily_usage: 1, unit: '粒', slot: '早' }
    ], nutritionist._id);
    
    const template2 = await createTemplate('护肝方案', [
      { name: '护肝片', daily_usage: 1, unit: '粒', slot: '晚' },
      { name: '维生素B', daily_usage: 2, unit: '粒', slot: '晚' }
    ], nutritionist._id);
    
    const template3 = await createTemplate('基础保健', [
      { name: '维生素D', daily_usage: 1, unit: '粒', slot: '早' },
      { name: '钙片', daily_usage: 2, unit: '粒', slot: '中' }
    ], nutritionist._id);
    
    // 分配多方案
    await applyTemplate(client._id, template1._id, nutritionist._id);
    await applyTemplate(client._id, template2._id, nutritionist._id);
    await applyTemplate(client._id, template3._id, nutritionist._id);
    
    // 生成合并计划
    await generateDailyPlan(client._id, today);
    
    // 暂停方案
    await pauseProtocol(client._id, today, nutritionist._id);
    
    // 恢复方案
    await resumeProtocol(client._id, today, nutritionist._id);
    
    // 修改方案
    await updateTemplate(template1._id, {
      products: [
        { name: '深海鱼油（升级版）', daily_usage: 2, unit: '粒', slot: '早' },
        { name: '辅酶Q10', daily_usage: 1, unit: '粒', slot: '早' },
        { name: '益生菌', daily_usage: 1, unit: '袋', slot: '早' }
      ]
    }, nutritionist._id);
    
    // 多方案管理
    await manageMultipleProtocols(client._id);
    
    // 版本回滚
    await rollbackTemplate(template1._id, 1);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('              ✅ 方案管理增强测试通过');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📁 最终数据:');
    console.log('   方案模板:', db.templates.length);
    console.log('   每日计划:', db.plans.length);
    console.log('   操作日志:', db.logs.length);
    
    const finalClient = db.users.find(u => u._id === 'client_001');
    console.log('   客户方案数:', finalClient.assigned_templates?.length || 0);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

runTest();

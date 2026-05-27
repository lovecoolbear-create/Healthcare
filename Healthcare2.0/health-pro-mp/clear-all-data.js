/**
 * 清空所有业务数据
 * 用于从头开始测试
 */

const db = uniCloud.database();

const collections = {
  users: db.collection('he_users'),
  plans: db.collection('he_daily_plans'),
  inventory: db.collection('he_inventory'),
  orders: db.collection('he_orders'),
  templates: db.collection('he_templates'),
  logs: db.collection('he_interaction_logs'),
  healthLogs: db.collection('he_health_logs'),
  notifications: db.collection('he_notifications'),
  history: db.collection('he_inventory_history')
};

async function clearAllData() {
  console.log('═══════════════════════════════════════════════════');
  console.log('          ⚠️ 清空所有业务数据');
  console.log('═══════════════════════════════════════════════════\n');
  
  const results = {};
  
  try {
    // 1. 清空用户数据（保留products和knowledge作为基础数据）
    console.log('🗑️  清空用户数据 (he_users)...');
    const usersRes = await collections.users.where({}).limit(1000).get();
    let deletedUsers = 0;
    for (const doc of usersRes.data) {
      await collections.users.doc(doc._id).remove();
      deletedUsers++;
    }
    results.users = deletedUsers;
    console.log(`   ✅ 已删除 ${deletedUsers} 条用户记录\n`);
    
    // 2. 清空每日计划
    console.log('🗑️  清空每日计划 (he_daily_plans)...');
    const plansRes = await collections.plans.where({}).limit(1000).get();
    let deletedPlans = 0;
    for (const doc of plansRes.data) {
      await collections.plans.doc(doc._id).remove();
      deletedPlans++;
    }
    results.plans = deletedPlans;
    console.log(`   ✅ 已删除 ${deletedPlans} 条计划记录\n`);
    
    // 3. 清空库存数据
    console.log('🗑️  清空库存数据 (he_inventory)...');
    const invRes = await collections.inventory.where({}).limit(1000).get();
    let deletedInventory = 0;
    for (const doc of invRes.data) {
      await collections.inventory.doc(doc._id).remove();
      deletedInventory++;
    }
    results.inventory = deletedInventory;
    console.log(`   ✅ 已删除 ${deletedInventory} 条库存记录\n`);
    
    // 4. 清空订单数据
    console.log('🗑️  清空订单数据 (he_orders)...');
    const ordersRes = await collections.orders.where({}).limit(1000).get();
    let deletedOrders = 0;
    for (const doc of ordersRes.data) {
      await collections.orders.doc(doc._id).remove();
      deletedOrders++;
    }
    results.orders = deletedOrders;
    console.log(`   ✅ 已删除 ${deletedOrders} 条订单记录\n`);
    
    // 5. 清空方案模板（可选，保留的话顾问可以直接用）
    console.log('🗑️  清空方案模板 (he_templates)...');
    const templatesRes = await collections.templates.where({}).limit(1000).get();
    let deletedTemplates = 0;
    for (const doc of templatesRes.data) {
      await collections.templates.doc(doc._id).remove();
      deletedTemplates++;
    }
    results.templates = deletedTemplates;
    console.log(`   ✅ 已删除 ${deletedTemplates} 条方案模板\n`);
    
    // 6. 清空互动日志
    console.log('🗑️  清空互动日志 (he_interaction_logs)...');
    const logsRes = await collections.logs.where({}).limit(1000).get();
    let deletedLogs = 0;
    for (const doc of logsRes.data) {
      await collections.logs.doc(doc._id).remove();
      deletedLogs++;
    }
    results.logs = deletedLogs;
    console.log(`   ✅ 已删除 ${deletedLogs} 条日志记录\n`);
    
    // 7. 清空健康日志
    console.log('🗑️  清空健康日志 (he_health_logs)...');
    const healthRes = await collections.healthLogs.where({}).limit(1000).get();
    let deletedHealth = 0;
    for (const doc of healthRes.data) {
      await collections.healthLogs.doc(doc._id).remove();
      deletedHealth++;
    }
    results.healthLogs = deletedHealth;
    console.log(`   ✅ 已删除 ${deletedHealth} 条健康日志\n`);
    
    // 8. 清空通知
    console.log('🗑️  清空通知 (he_notifications)...');
    const notifRes = await collections.notifications.where({}).limit(1000).get();
    let deletedNotif = 0;
    for (const doc of notifRes.data) {
      await collections.notifications.doc(doc._id).remove();
      deletedNotif++;
    }
    results.notifications = deletedNotif;
    console.log(`   ✅ 已删除 ${deletedNotif} 条通知\n`);
    
    // 9. 清空库存历史
    console.log('🗑️  清空库存历史 (he_inventory_history)...');
    const historyRes = await collections.history.where({}).limit(1000).get();
    let deletedHistory = 0;
    for (const doc of historyRes.data) {
      await collections.history.doc(doc._id).remove();
      deletedHistory++;
    }
    results.history = deletedHistory;
    console.log(`   ✅ 已删除 ${deletedHistory} 条库存历史\n`);
    
    // 汇总
    console.log('═══════════════════════════════════════════════════');
    console.log('              ✅ 数据清空完成');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📊 删除汇总:');
    console.log(`   用户: ${results.users || 0} 条`);
    console.log(`   计划: ${results.plans || 0} 条`);
    console.log(`   库存: ${results.inventory || 0} 条`);
    console.log(`   订单: ${results.orders || 0} 条`);
    console.log(`   方案: ${results.templates || 0} 条`);
    console.log(`   日志: ${results.logs || 0} 条`);
    console.log(`   健康: ${results.healthLogs || 0} 条`);
    console.log(`   通知: ${results.notifications || 0} 条`);
    console.log(`   库存历史: ${results.history || 0} 条`);
    
    const total = Object.values(results).reduce((a, b) => a + b, 0);
    console.log(`\n   总计删除: ${total} 条记录`);
    
    console.log('\n⚠️  保留数据:');
    console.log('   - he_products (产品库)');
    console.log('   - he_knowledge (知识库)');
    console.log('   - he_triggers (触发器配置)');
    console.log('   - he_scoring_config (评分配置)');
    
    console.log('\n✅ 数据库已清空，可以开始从头测试！');
    
    return { code: 0, msg: '数据清空完成', deleted: results };
    
  } catch (error) {
    console.error('\n❌ 清空数据失败:', error);
    return { code: 500, msg: error.message };
  }
}

// 导出函数供云函数调用
exports.clearAllData = clearAllData;

// 如果是直接运行脚本
if (require.main === module) {
  clearAllData();
}

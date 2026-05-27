// 调试脚本：检查方案分配和模板数据

const db = uniCloud.database();
const _ = db.command;

async function debugProtocolData() {
  console.log('=== 开始调试方案数据 ===');
  
  // 1. 获取所有客户
  const clientsRes = await db.collection('he_users').where({ role: 'client' }).get();
  console.log(`\n📋 客户列表 (${clientsRes.data.length}人):`);
  clientsRes.data.forEach(client => {
    const assigned = client.assigned_templates || [];
    const assignedInfo = typeof assigned[0] === 'string' 
      ? `字符串格式: ${assigned.length}个` 
      : `对象格式: ${assigned.length}个 (active: ${assigned.filter(a => !a.status || a.status === 'active').length})`;
    console.log(`  - ${client.username || client.nickname || '未知'} (${client._id})`);
    console.log(`    * assigned_templates: ${assignedInfo}`);
    console.log(`    * assigned_template (旧版): ${client.assigned_template || '无'}`);
    console.log(`    * protocol_start_date: ${client.protocol_start_date || '无'}`);
  });
  
  // 2. 获取所有模板
  const templatesRes = await db.collection('he_templates').get();
  console.log(`\n📋 模板列表 (${templatesRes.data.length}个):`);
  templatesRes.data.forEach(template => {
    const productsLen = template.products?.length || 0;
    const itemsLen = template.items?.length || 0;
    console.log(`  - ${template.name} (${template._id})`);
    console.log(`    * products 字段: ${productsLen}个产品`);
    console.log(`    * items 字段: ${itemsLen}个产品`);
    if (productsLen > 0) {
      console.log(`    * 产品列表: ${template.products.map(p => p.name || p.product_name).join(', ')}`);
    }
    if (itemsLen > 0) {
      console.log(`    * 项目列表: ${template.items.map(p => p.name || p.product_name).join(', ')}`);
    }
  });
  
  // 3. 获取今日计划
  const today = new Date().toISOString().split('T')[0];
  const plansRes = await db.collection('he_daily_plans').where({ date: today }).get();
  console.log(`\n📋 今日计划 (${plansRes.data.length}条):`);
  plansRes.data.forEach(plan => {
    console.log(`  - 用户: ${plan.user_id} | 模板: ${plan.template_name || plan.template_id} | 任务数: ${plan.tasks?.length || 0}`);
    if (plan.tasks?.length > 0) {
      console.log(`    * 任务: ${plan.tasks.map(t => `${t.product_name}(${t.slot})`).join(', ')}`);
    }
  });
  
  console.log('\n=== 调试完成 ===');
}

debugProtocolData().catch(console.error);
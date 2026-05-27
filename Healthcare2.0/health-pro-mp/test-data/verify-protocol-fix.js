// 验证方案数据修复脚本
// 问题：林和房客户在小程序客户端刷不出今日健康计划

const db = uniCloud.database();

async function verifyAndFixProtocolData() {
  console.log('=== 验证方案数据一致性 ===\n');
  
  // 1. 检查所有模板的数据结构
  console.log('1. 检查模板数据结构:');
  const templatesRes = await db.collection('he_templates').get();
  templatesRes.data.forEach(template => {
    const hasProducts = !!template.products && template.products.length > 0;
    const hasItems = !!template.items && template.items.length > 0;
    console.log(`   - ${template.name} (${template._id}):`);
    console.log(`     * products字段: ${hasProducts ? `${template.products.length}个产品` : '空或不存在'}`);
    console.log(`     * items字段: ${hasItems ? `${template.items.length}个产品` : '空或不存在'}`);
    
    // 如果模板没有products字段但有items字段，进行修复
    if (!hasProducts && hasItems) {
      console.log(`     ⚠️ 需要修复：将items迁移到products`);
      // 执行修复
      // await db.collection('he_templates').doc(template._id).update({
      //   products: template.items
      // });
      // console.log(`     ✅ 已修复`);
    }
  });
  
  // 2. 检查所有客户的assigned_templates格式
  console.log('\n2. 检查客户方案分配:');
  const clientsRes = await db.collection('he_users').where({ role: 'client' }).get();
  clientsRes.data.forEach(client => {
    const name = client.username || client.nickname || '未知';
    const assigned = client.assigned_templates || [];
    const isStringArray = assigned.length > 0 && typeof assigned[0] === 'string';
    const activeCount = isStringArray ? assigned.length : assigned.filter(a => !a.status || a.status === 'active').length;
    
    console.log(`   - ${name} (${client._id}):`);
    console.log(`     * assigned_templates格式: ${isStringArray ? '字符串数组' : '对象数组'}`);
    console.log(`     * 方案数量: ${assigned.length} (活跃: ${activeCount})`);
    console.log(`     * assigned_template(旧版): ${client.assigned_template || '无'}`);
    
    // 如果有旧版单数方案字段但不在新数组中
    if (client.assigned_template && !assigned.includes(client.assigned_template)) {
      console.log(`     ⚠️ 需要修复：旧版方案不在新数组中`);
    }
  });
  
  // 3. 检查今日计划数据
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n3. 检查今日计划 (${today}):`);
  const plansRes = await db.collection('he_daily_plans').where({ date: today }).get();
  
  // 按用户分组统计
  const plansByUser = new Map();
  plansRes.data.forEach(plan => {
    if (!plansByUser.has(plan.user_id)) plansByUser.set(plan.user_id, []);
    plansByUser.get(plan.user_id).push(plan);
  });
  
  for (const [userId, plans] of plansByUser) {
    const userRes = await db.collection('he_users').doc(userId).get();
    const userName = userRes.data[0]?.username || userRes.data[0]?.nickname || userId;
    
    console.log(`   - ${userName}:`);
    plans.forEach(plan => {
      const taskCount = plan.tasks?.length || 0;
      const completedCount = plan.tasks?.filter(t => t.completed).length || 0;
      console.log(`     * 方案: ${plan.template_name || plan.template_id} | 任务: ${completedCount}/${taskCount}`);
    });
  }
  
  console.log('\n=== 验证完成 ===');
}

verifyAndFixProtocolData().catch(console.error);
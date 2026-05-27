const uniCloud = require('uni-cloud-sdk');
const db = uniCloud.database();

async function cleanupGarbage() {
  console.log('开始清理数据库中的垃圾任务...');
  
  // 1. 删除所有包含"复合维生素"的孤儿计划记录
  const res = await db.collection('he_daily_plans')
    .where({
      'tasks.product_name': '复合维生素'
    })
    .remove();
  
  console.log(`清理完成：删除了 ${res.deleted || 0} 条包含"复合维生素"的脏数据。`);
  
  // 2. 检查模板库，防止源头污染
  const templateRes = await db.collection('he_templates')
    .where({
      'products.product_name': '复合维生素'
    })
    .get();
    
  if (templateRes.data.length > 0) {
    console.log(`发现 ${templateRes.data.length} 个污染模板，建议手动检查方案库并删除“复合维生素”项。`);
  }
}

cleanupGarbage().catch(console.error);

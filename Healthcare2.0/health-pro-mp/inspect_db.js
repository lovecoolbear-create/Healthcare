// inspect_db.js
const db = require('uniCloud').database();

exports.main = async (event, context) => {
  const plansRes = await db.collection('he_daily_plans').where({
    date: new Date().toISOString().split('T')[0]
  }).get();
  
  const usersRes = await db.collection('he_users').get();
  const userMap = {};
  usersRes.data.forEach(u => userMap[u._id] = u.username || u.nickname || u.phone);

  const results = [];
  for (const plan of plansRes.data) {
    const userName = userMap[plan.user_id] || plan.user_id;
    if (userName.includes('蔡')) {
      results.push({
        _id: plan._id,
        user_name: userName,
        template_name: plan.template_name,
        tasks_count: plan.tasks ? plan.tasks.length : 0,
        completed_count: plan.tasks ? plan.tasks.filter(t => t.completed).length : 0,
        tasks: plan.tasks ? plan.tasks.map(t => ({name: t.product_name, slot: t.slot, completed: t.completed})) : [],
        section_status: plan.section_status ? {
          morning: plan.section_status.tasks?.morning?.completed,
          morning_count: plan.section_status.tasks?.morning?.items?.length
        } : null
      });
    }
  }
  return results;
};

const fs = require('fs');
const filepath = './uniCloud-alipay/cloudfunctions/client-api/index.js';
let content = fs.readFileSync(filepath, 'utf8');

// 修复 generateDailyPlan 的返回值逻辑，使其包含合并后的任务列表
const oldPattern = /console\.log\('generateDailyPlan - 完成，共生成', savedPlanIds\.length, '条计划'\);\r?\n\s+return \{ code: 0, data: \{ plan_ids: savedPlanIds, count: savedPlanIds\.length \} \};\r?\n\s+\}/s;

const newCode = `console.log('generateDailyPlan - 完成，共生成', savedPlanIds.length, '条计划');
\r
        // 【关键修复】为了让小程序能立即显示，聚合所有任务并返回\r
        const finalPlansRes = await plansCollection.where({ _id: db.command.in(savedPlanIds) }).get();\r
        const allTasks = finalPlansRes.data.flatMap(p => p.tasks || []);\r
        \r
        return { \r
          code: 0, \r
          data: { \r
            ...finalPlansRes.data[0], \r
            tasks: allTasks, \r
            plan_ids: savedPlanIds, \r
            count: savedPlanIds.length \r
          } \r
        };\r
      }`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newCode);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('✅ generateDailyPlan return value fix applied');
} else {
  console.log('❌ Pattern not matched or already patched.');
}

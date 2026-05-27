const fs = require('fs');
const filepath = './uniCloud-alipay/cloudfunctions/client-api/index.js';
let content = fs.readFileSync(filepath, 'utf8');

// Use regex to match regardless of exact whitespace/CRLF differences
// Fix the dirty check section in getDailyPlan
const oldPattern = /\/\/ 2\. 获取当天的执行计划\r?\n\s+const planRes = await plansCollection\.where\(\{ user_id: targetUserId, date: targetDate \}\)\.get\(\);\r?\n\s*\r?\n\s+if \(planRes\.data\.length > 0\) \{\r?\n\s+const plan = planRes\.data\[0\];\r?\n\s+const savedIds = \(plan\.template_ids \|\| \[\]\)\.map\(id => String\(id\)\);.*?return \{ code: 0, data: plan \};\r?\n\s+\}\r?\n\r?\n\s+return \{ code: 0, data: null \};\r?\n\s+\}/s;

const newCode = `// 2. 获取当天的执行计划（新架构：每个配方一条记录）\r
        const planRes = await plansCollection.where({ user_id: targetUserId, date: targetDate }).get();\r
\r
        if (planRes.data.length > 0) {\r
          // 【修复】从所有记录中聚合 template_id，兼容新旧两种格式\r
          const savedIdSet = new Set();\r
          planRes.data.forEach(p => {\r
            if (p.template_id) savedIdSet.add(String(p.template_id));\r
            if (p.template_ids) p.template_ids.forEach(id => savedIdSet.add(String(id)));\r
          });\r
          const savedIds = Array.from(savedIdSet);\r
\r
          // 3. 执行脏值检测\r
          const isDirty = currentActiveIds.length !== savedIds.length ||\r
                          !currentActiveIds.every(id => savedIds.includes(id));\r
\r
          // 仅对"今天"且方案不一致的情况触发自动同步\r
          if (isDirty && targetDate === new Date().toISOString().split('T')[0] && currentActiveIds.length > 0) {\r
            console.log('🔄 getDailyPlan - 监测到配方变更，正在自动同步...');\r
            // 【修复】传递原始 token，防止内部调用因缺 token 而返回 401\r
            const originalToken = extractToken(event);\r
            const syncRes = await exports.main({\r
              action: 'generateDailyPlan',\r
              payload: { user_id: targetUserId, date: targetDate, token: originalToken }\r
            }, context);\r
            return syncRes;\r
          }\r
\r
          // 合并所有计划记录的 tasks，返回给小程序使用\r
          const allTasks = planRes.data.flatMap(p => p.tasks || []);\r
          return { code: 0, data: { ...planRes.data[0], tasks: allTasks, plan_count: planRes.data.length } };\r
        }\r
\r
        return { code: 0, data: null };\r
      }`;

if (oldPattern.test(content)) {
  content = content.replace(oldPattern, newCode);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('✅ getDailyPlan fix applied successfully');
} else {
  console.log('❌ Pattern not matched. Checking if already patched...');
  if (content.includes('savedIdSet')) {
    console.log('ℹ️  Already patched (savedIdSet found).');
  } else {
    // Show the relevant section for debugging
    const idx = content.indexOf('getDailyPlan');
    console.log('Relevant section:', content.substring(idx, idx + 200));
  }
}

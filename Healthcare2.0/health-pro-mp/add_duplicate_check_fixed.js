const fs = require('fs');
const filepath = './uniCloud-alipay/cloudfunctions/client-api/index.js';
let content = fs.readFileSync(filepath, 'utf8');

// 更加宽容的正则比对，处理 \n 或 \r\n 混合的情况
const injectionPoint = /const client = clientRes\.data\[0\];(\r?\n)+(\s+)\/\/ 为客户创建今日打卡计划/;

const newLogic = `const client = clientRes.data[0];\r
\r
        // 【新增】方案名称重复校验：防止为一个客户重复添加同名方案\r
        const assignedMeta = (client.assigned_templates || []).map(item => \r
          typeof item === 'string' ? { id: item, status: 'active' } : item\r
        );\r
        const activeIds = assignedMeta.filter(m => m.status === 'active').map(m => m.id);\r
\r
        if (activeIds.length > 0) {\r
          console.log('applyTemplate - checking for duplicate names among active protocols:', activeIds.length);\r
          const activeTemplatesRes = await templatesCollection.where({ _id: db.command.in(activeIds) }).get();\r
          const duplicate = activeTemplatesRes.data.find(t => \r
            String(t.name || '').trim() === String(template.name || '').trim()\r
          );\r
          \r
          if (duplicate) {\r
            console.warn('applyTemplate - duplicate protocol name detected:', template.name);\r
            return { \r
              code: 400, \r
              msg: \`该客户已有一个名为“\${template.name}”的方案正在执行中，请勿重复添加。\` \r
            };\r
          }\r
        }\r\n\r
        // 为客户创建今日打卡计划`;

if (injectionPoint.test(content)) {
  content = content.replace(injectionPoint, newLogic);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('✅ Duplicate protocol name check added successfully');
} else {
  console.log('❌ Failed to inject. Please check context manually.');
}

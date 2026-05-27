const fs = require('fs');
const filepath = './uniCloud-alipay/cloudfunctions/client-api/index.js';
let content = fs.readFileSync(filepath, 'utf8');

// 在 applyTemplate 中插入名称查重逻辑
// 我们在获取到 template 和 client 后注入校验
const oldEntry = "const client = clientRes.data[0];\r?\n";
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
        }\r\n`;

const regex = new RegExp(oldEntry);
if (regex.test(content)) {
  content = content.replace(regex, newLogic);
  fs.writeFileSync(filepath, content, 'utf8');
  console.log('✅ Duplicate protocol name check added to applyTemplate');
} else {
  console.log('❌ Failed to find the injection point in applyTemplate');
  // Debug: show context
  const idx = content.indexOf('const client = clientRes.data[0]');
  if (idx !== -1) {
    console.log('Context found but regex failed. repr:', JSON.stringify(content.substring(idx, idx+50)));
  }
}

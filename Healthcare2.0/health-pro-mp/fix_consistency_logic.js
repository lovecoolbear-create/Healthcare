const fs = require('fs');
const filepath = './uniCloud-alipay/cloudfunctions/client-api/index.js';
let content = fs.readFileSync(filepath, 'utf8');

// --- 修复 1: applyTemplate 激活逻辑 ---
// 如果 ID 已经存在但状态不是 active，也要更新它
const applyPattern = /const isAlreadyAssigned = currentAssignments\.some\(item => item\.id === template_id\);(\r?\n\s+)?if \(!isAlreadyAssigned\) \{.*?update\(\{.*?assigned_templates: \[\.\.\.currentAssignments, \{ id: template_id, status: 'active', added_at: Date\.now\(\) \} \],.*?\}\);(\r?\n\s+)\}/s;

const applyReplacement = `const isAlreadyAssigned = currentAssignments.some(item => item.id === template_id);
\r
            if (!isAlreadyAssigned) {\r
              console.log('📝 Persisting new status-aware assignment to he_users:', template_id);\r
              await usersCollection.doc(user_id).update({\r
                assigned_templates: [...currentAssignments, { id: template_id, status: 'active', added_at: Date.now() }],\r
                updated_at: Date.now()\r
              });\r
            } else {\r
              // 【关键修复】如果 ID 已存在但可能处于 cancelled 状态，将其翻转回 active\r
              let hasChange = false;\r
              const updatedAssignments = currentAssignments.map(item => {\r
                if (item.id === template_id && item.status !== 'active') {\r
                  hasChange = true;\r
                  return { ...item, status: 'active', updated_at: Date.now() };\r
                }\r
                return item;\r
              });\r
\r
              if (hasChange) {\r
                console.log('🔄 Reactivating existing assignment:', template_id);\r
                await usersCollection.doc(user_id).update({\r
                  assigned_templates: updatedAssignments,\r
                  updated_at: Date.now()\r
                });\r
              }\r
            }`;

// --- 修复 2: stopProtocol 批量模式下的用户档案同步 ---
const stopAllPattern = /\/\/ 如果没有指定 protocol_id，停止所有活跃方案（向后兼容）.*?for \(const plan of activePlans\.data\) \{.*?update\(\{.*?status: 'cancelled',.*?\}\);(\r?\n\s+)\}/s;

const stopAllReplacement = `// 如果没有指定 protocol_id，停止所有活跃方案（向后兼容）\r
          const today = new Date().toISOString().split('T')[0];\r
          const activePlans = await plansCollection.where({\r
            user_id: user_id,\r
            date: today,\r
            status: 'active'\r
          }).get();\r
\r
          for (const plan of activePlans.data) {\r
            await plansCollection.doc(plan._id).update({\r
              status: 'cancelled',\r
              is_active: false,\r
              stopped_at: Date.now(),\r
              updated_at: Date.now()\r
            });\r
          }\r
\r
          // 【同步更新用户档案】\r
          const userRes = await usersCollection.doc(user_id).get();\r
          if (userRes.data.length > 0) {\r
            const uData = userRes.data[0];\r
            const activeTids = activePlans.data.map(p => p.template_id).filter(Boolean);\r
            const newAssignments = (uData.assigned_templates || []).map(item => {\r
              const obj = typeof item === 'string' ? { id: item, status: 'active' } : item;\r
              if (activeTids.includes(obj.id)) {\r
                return { ...obj, status: 'cancelled', stopped_at: Date.now() };\r
              }\r
              return obj;\r
            });\r
            await usersCollection.doc(user_id).update({\r
              assigned_templates: newAssignments,\r
              updated_at: Date.now()\r
            });\r
            console.log('✅ 批量停止方案状态已同步到用户档案');\r
          }`;

if (applyPattern.test(content)) {
  content = content.replace(applyPattern, applyReplacement);
  console.log('✅ applyTemplate reactivate logic patched');
} else {
  console.log('❌ applyTemplate pattern not found');
}

if (stopAllPattern.test(content)) {
  content = content.replace(stopAllPattern, stopAllReplacement);
  console.log('✅ stopProtocol all-mode sync patched');
} else {
  console.log('❌ stopProtocol all-mode pattern not found');
}

fs.writeFileSync(filepath, content, 'utf8');

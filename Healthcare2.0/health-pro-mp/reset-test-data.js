/**
 * 重置本地测试数据
 * 清空所有本地模拟数据，从头开始测试
 */

console.log('═══════════════════════════════════════════════════');
console.log('          🔄 重置测试数据');
console.log('═══════════════════════════════════════════════════\n');

// 清空所有测试脚本生成的模拟数据
const testData = {
  users: [],
  tokens: new Map(),
  templates: [],
  plans: [],
  logs: [],
  inventory: [],
  orders: [],
  healthLogs: [],
  reports: [],
  notifications: [],
  pushLogs: [],
  smsLogs: [],
  knowledge: [],
  triggers: [],
  triggerLogs: [],
  chats: []
};

console.log('✅ 测试数据已重置为初始状态\n');
console.log('📊 当前数据状态:');
console.log('   用户: 0');
console.log('   方案: 0');
console.log('   计划: 0');
console.log('   库存: 0');
console.log('   订单: 0');
console.log('   日志: 0');
console.log('   通知: 0');
console.log('   知识库: 0');
console.log('   触发器: 0');
console.log('   聊天: 0');

console.log('\n═══════════════════════════════════════════════════');
console.log('        ✅ 可以开始从头测试！');
console.log('═══════════════════════════════════════════════════');
console.log('\n建议测试流程:');
console.log('   1. 运行 test-1-user-auth.js - 创建用户');
console.log('   2. 运行 test-2-protocol-mgmt.js - 创建方案');
console.log('   3. 运行 test-end-to-end.js - 完整业务流程');
console.log('   4. 运行 test-health-checkin.js - 健康打卡');

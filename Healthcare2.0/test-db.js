// 测试数据库连接和数据状态
const axios = require('axios').default;

async function testApi() {
  try {
    console.log('=== 测试 API 连接 ===\n');
    
    // 测试 getOwnProtocol 接口
    console.log('1. 测试 getOwnProtocol (模拟客户熊)');
    try {
      const protocolRes = await axios.post('http://localhost:3000/api/client-api', {
        action: 'getOwnProtocol',
        payload: {}
      }, {
        headers: { 'X-User-Id': 'client_xiong' }
      });
      console.log('   结果:', JSON.stringify(protocolRes.data, null, 2));
    } catch (e) {
      console.log('   错误:', e.response?.data || e.message);
    }
    
    // 测试 getClients 接口
    console.log('\n2. 测试 getClients');
    try {
      const clientsRes = await axios.post('http://localhost:3000/api/client-api', {
        action: 'getClients',
        payload: {}
      }, {
        headers: { 'X-Role': 'admin' }
      });
      console.log('   客户数量:', clientsRes.data?.data?.length || 0);
      if (clientsRes.data?.data) {
        clientsRes.data.data.forEach(c => {
          console.log(`   - ${c.username || c.nickname}: 积分=${c.points}, 方案数=${c.assigned_templates?.length || 0}`);
        });
      }
    } catch (e) {
      console.log('   错误:', e.response?.data || e.message);
    }
    
    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testApi();
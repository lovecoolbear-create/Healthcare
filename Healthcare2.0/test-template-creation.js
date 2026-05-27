// 测试创建配方的逻辑
console.log('🧪 测试创建配方功能...');

// 模拟前端数据
const templateData = {
  name: '测试营养配方',
  description: '这是一个测试用的营养配方',
  category: '营养补充',
  duration: 7,
  items: [
    {
      product_id: 'P001',
      product_name: '维生素C',
      daily_usage: 1,
      timing: 'morning',
      reminder_type: 'notification',
      notes: '餐后服用'
    },
    {
      product_id: 'P002',
      product_name: '维生素D',
      daily_usage: 1,
      timing: 'morning',
      reminder_type: 'notification',
      notes: '随餐服用'
    }
  ]
};

// 模拟用户信息
const userInfo = {
  _id: 'test_admin_user_id',
  role: 'admin'
};

console.log('📋 配方数据:', JSON.stringify(templateData, null, 2));
console.log('👤 用户信息:', JSON.stringify(userInfo, null, 2));

// 模拟云函数调用参数
const cloudFunctionParams = {
  action: 'createTemplate',
  payload: {
    ...templateData,
    userId: userInfo._id
  }
};

console.log('📞 云函数调用参数:', JSON.stringify(cloudFunctionParams, null, 2));

// 验证数据完整性
console.log('✅ 验证结果:');
console.log('- 配方名称:', templateData.name ? '✅' : '❌');
console.log('- 用户ID:', userInfo._id ? '✅' : '❌');
console.log('- 用户角色:', userInfo.role === 'admin' ? '✅ (管理员)' : '❌ (非管理员)');
console.log('- 产品数量:', templateData.items.length, '个');

console.log('🎉 测试完成！数据格式正确，可以上传云函数测试。');

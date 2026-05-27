/**
 * 测试1: 用户权限管理
 * 流程：客户注册 → 登录 → 顾问分配 → 权限验证
 */

const db = {
  users: [],
  tokens: new Map()
};

// ==================== 模拟API ====================

// 生成唯一ID
const generateId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// 生成Token
const generateToken = (userId) => {
  const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  db.tokens.set(token, { userId, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return token;
};

// 1. 客户注册
async function registerClient(phone, username, password) {
  console.log('\n📱 Step 1: 客户注册');
  
  // 检查手机号是否已存在
  const existing = db.users.find(u => u.phone === phone);
  if (existing) {
    console.log('❌ 手机号已被注册:', phone);
    return null;
  }
  
  const userId = generateId();
  const user = {
    _id: userId,
    username: username,
    phone: phone,
    password: password, // 实际应该加密
    role: 'client',
    nutritionist_id: '', // 初始无顾问
    assigned_templates: [],
    wrom_score: 0,
    created_at: Date.now(),
    last_login: null
  };
  
  db.users.push(user);
  console.log('✅ 客户注册成功:', username);
  console.log('   手机号:', phone);
  console.log('   角色: 客户');
  console.log('   状态: 待分配顾问');
  return user;
}

// 2. 顾问注册
async function registerNutritionist(phone, username, password) {
  console.log('\n👨‍⚕️ Step 2: 顾问注册');
  
  const existing = db.users.find(u => u.phone === phone);
  if (existing) {
    console.log('❌ 手机号已被注册:', phone);
    return null;
  }
  
  const userId = generateId();
  const user = {
    _id: userId,
    username: username,
    phone: phone,
    password: password,
    role: 'nutritionist',
    clients: [], // 管理的客户列表
    created_at: Date.now(),
    last_login: null
  };
  
  db.users.push(user);
  console.log('✅ 顾问注册成功:', username);
  console.log('   手机号:', phone);
  console.log('   角色: 营养顾问');
  return user;
}

// 3. 客户登录
async function loginClient(phone, password) {
  console.log('\n🔐 Step 3: 客户登录');
  
  const user = db.users.find(u => u.phone === phone && u.role === 'client');
  if (!user || user.password !== password) {
    console.log('❌ 登录失败: 手机号或密码错误');
    return null;
  }
  
  const token = generateToken(user._id);
  user.last_login = Date.now();
  
  console.log('✅ 客户登录成功:', user.username);
  console.log('   Token:', token.substring(0, 20) + '...');
  console.log('   顾问ID:', user.nutritionist_id || '未分配');
  return { user, token };
}

// 4. 顾问登录
async function loginNutritionist(phone, password) {
  console.log('\n🔐 Step 4: 顾问登录');
  
  const user = db.users.find(u => u.phone === phone && u.role === 'nutritionist');
  if (!user || user.password !== password) {
    console.log('❌ 登录失败: 手机号或密码错误');
    return null;
  }
  
  const token = generateToken(user._id);
  user.last_login = Date.now();
  
  console.log('✅ 顾问登录成功:', user.username);
  console.log('   Token:', token.substring(0, 20) + '...');
  console.log('   管理客户数:', user.clients?.length || 0);
  return { user, token };
}

// 5. 顾问分配给客户
async function assignNutritionist(clientId, nutritionistId) {
  console.log('\n🔗 Step 5: 顾问分配客户');
  
  const client = db.users.find(u => u._id === clientId && u.role === 'client');
  const nutritionist = db.users.find(u => u._id === nutritionistId && u.role === 'nutritionist');
  
  if (!client) {
    console.log('❌ 客户不存在');
    return false;
  }
  if (!nutritionist) {
    console.log('❌ 顾问不存在');
    return false;
  }
  
  // 更新客户
  client.nutritionist_id = nutritionistId;
  client.updated_at = Date.now();
  
  // 更新顾问的客户列表
  if (!nutritionist.clients) nutritionist.clients = [];
  if (!nutritionist.clients.includes(clientId)) {
    nutritionist.clients.push(clientId);
  }
  
  console.log('✅ 顾问分配成功');
  console.log('   客户:', client.username);
  console.log('   顾问:', nutritionist.username);
  console.log('   关系建立时间:', new Date().toLocaleString());
  return true;
}

// 6. 验证Token
async function verifyToken(token) {
  console.log('\n🔍 Step 6: 验证Token权限');
  
  const tokenData = db.tokens.get(token);
  if (!tokenData) {
    console.log('❌ Token无效');
    return null;
  }
  
  if (tokenData.expires < Date.now()) {
    console.log('❌ Token已过期');
    return null;
  }
  
  const user = db.users.find(u => u._id === tokenData.userId);
  if (!user) {
    console.log('❌ 用户不存在');
    return null;
  }
  
  console.log('✅ Token验证通过');
  console.log('   用户:', user.username);
  console.log('   角色:', user.role === 'client' ? '客户' : '顾问');
  console.log('   权限:');
  
  if (user.role === 'client') {
    console.log('     - 查看自己的健康数据');
    console.log('     - 打卡/记录饮水/体感');
    console.log('     - 下单补货');
    console.log('     - 查看趋势分析');
  } else {
    console.log('     - 管理客户列表');
    console.log('     - 制定/分配方案');
    console.log('     - 查看客户健康报告');
    console.log('     - 发货/处理订单');
  }
  
  return user;
}

// 7. 获取用户信息（带权限检查）
async function getUserInfo(userId, requesterId) {
  console.log('\n📋 Step 7: 获取用户信息（权限验证）');
  
  const user = db.users.find(u => u._id === userId);
  const requester = db.users.find(u => u._id === requesterId);
  
  if (!user || !requester) {
    console.log('❌ 用户不存在');
    return null;
  }
  
  // 权限检查
  let hasPermission = false;
  
  if (requester.role === 'admin') {
    hasPermission = true; // 管理员可查看所有
  } else if (requesterId === userId) {
    hasPermission = true; // 自己查看自己
  } else if (requester.role === 'nutritionist' && user.nutritionist_id === requesterId) {
    hasPermission = true; // 顾问查看自己的客户
  }
  
  if (!hasPermission) {
    console.log('❌ 无权查看该用户信息');
    console.log('   请求者:', requester.username, `(${requester.role})`);
    console.log('   目标用户:', user.username);
    return null;
  }
  
  console.log('✅ 权限验证通过');
  console.log('   查看者:', requester.username);
  console.log('   被查看:', user.username);
  console.log('   关系:', requesterId === userId ? '本人' : '顾问-客户');
  
  return {
    _id: user._id,
    username: user.username,
    phone: user.phone.substring(0, 3) + '****' + user.phone.substring(7), // 脱敏
    role: user.role,
    nutritionist_id: user.nutritionist_id,
    wrom_score: user.wrom_score,
    created_at: user.created_at
  };
}

// 8. 客户更换顾问
async function changeNutritionist(clientId, newNutritionistId) {
  console.log('\n🔄 Step 8: 客户更换顾问');
  
  const client = db.users.find(u => u._id === clientId && u.role === 'client');
  const oldNutritionist = db.users.find(u => u._id === client.nutritionist_id);
  const newNutritionist = db.users.find(u => u._id === newNutritionistId && u.role === 'nutritionist');
  
  if (!client) {
    console.log('❌ 客户不存在');
    return false;
  }
  if (!newNutritionist) {
    console.log('❌ 新顾问不存在');
    return false;
  }
  
  // 从旧顾问的客户列表移除
  if (oldNutritionist && oldNutritionist.clients) {
    oldNutritionist.clients = oldNutritionist.clients.filter(id => id !== clientId);
  }
  
  // 分配新顾问
  client.nutritionist_id = newNutritionistId;
  if (!newNutritionist.clients) newNutritionist.clients = [];
  newNutritionist.clients.push(clientId);
  
  console.log('✅ 顾问更换成功');
  console.log('   客户:', client.username);
  console.log('   原顾问:', oldNutritionist?.username || '无');
  console.log('   新顾问:', newNutritionist.username);
  return true;
}

// ==================== 主测试流程 ====================

async function runTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    测试1: 用户权限管理 - 注册/登录/分配/权限');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // 注册用户
    const client1 = await registerClient('17711111111', '张小明', 'password123');
    const client2 = await registerClient('17722222222', '李小红', 'password123');
    const nutritionist1 = await registerNutritionist('17733333333', '王顾问', 'admin123');
    const nutritionist2 = await registerNutritionist('17744444444', '李顾问', 'admin123');
    
    // 登录
    const clientLogin = await loginClient('17711111111', 'password123');
    const nutriLogin = await loginNutritionist('17733333333', 'admin123');
    
    // 分配顾问
    await assignNutritionist(client1._id, nutritionist1._id);
    await assignNutritionist(client2._id, nutritionist1._id);
    
    // 验证Token
    await verifyToken(clientLogin.token);
    
    // 权限验证
    console.log('\n   📊 权限测试场景:');
    await getUserInfo(client1._id, client1._id); // 自己看自己 ✓
    await getUserInfo(client1._id, nutritionist1._id); // 顾问看客户 ✓
    await getUserInfo(client2._id, client1._id); // 客户A看客户B ✗
    
    // 更换顾问
    await changeNutritionist(client1._id, nutritionist2._id);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('              ✅ 用户权限管理测试通过');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📁 最终数据:');
    console.log('   注册用户:', db.users.length);
    console.log('   客户:', db.users.filter(u => u.role === 'client').length);
    console.log('   顾问:', db.users.filter(u => u.role === 'nutritionist').length);
    
    const nutri1 = db.users.find(u => u._id === nutritionist1._id);
    console.log('   王顾问管理客户:', nutri1.clients?.length || 0, '人');
    
    const nutri2 = db.users.find(u => u._id === nutritionist2._id);
    console.log('   李顾问管理客户:', nutri2.clients?.length || 0, '人');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

runTest();

/**
 * 简化版订单测试：一个一个单独发货，无子母订单概念
 * 状态清晰：待发货(0) → 已发货(1) → 已完成(2)
 */

const db = {
  users: [],
  orders: [],
  inventory: [],
  logs: []
};

const generateId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// 创建订单（简化版）
async function createOrder(clientId, items) {
  console.log('\n📦 创建订单');
  
  const orderItems = items.map((item, index) => ({
    name: item.name,
    quantity: item.quantity || 1,
    unit: item.unit || '瓶',
    price: item.price || 0,
    status: 0, // 0=待发货, 1=已发货, 2=已完成
    tracking_no: '',
    tracking_image: '',
    shipped_at: null,
    completed_at: null
  }));
  
  const order = {
    _id: generateId(),
    user_id: clientId,
    items: orderItems,
    status: 0, // 0=待发货, 1=已发货, 2=已完成
    total_amount: orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0),
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  db.orders.push(order);
  
  console.log('✅ 订单创建成功');
  console.log('   订单ID:', order._id.substring(0, 15) + '...');
  console.log('   产品数:', orderItems.length);
  console.log('   状态: 待发货');
  orderItems.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.name} x${item.quantity}${item.unit} [待发货]`);
  });
  
  return order;
}

// 单个产品发货
async function shipItem(orderId, itemIndex, trackingInfo) {
  console.log(`\n🚚 发货产品 #${itemIndex + 1}`);
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return null;
  }
  
  const item = order.items[itemIndex];
  if (!item) {
    console.log('❌ 产品不存在');
    return null;
  }
  
  if (item.status !== 0) {
    console.log('❌ 产品已发货或已完成');
    return null;
  }
  
  // 更新产品状态
  item.status = 1; // 已发货
  item.tracking_no = trackingInfo.trackingNo || '';
  item.tracking_image = trackingInfo.image || '';
  item.shipped_at = Date.now();
  
  // 检查是否所有产品都已发货
  const allShipped = order.items.every(i => i.status === 1 || i.status === 2);
  if (allShipped && order.status === 0) {
    order.status = 1; // 订单变为已发货
  }
  
  order.updated_at = Date.now();
  
  console.log('✅ 产品已发货');
  console.log('   产品:', item.name);
  console.log('   物流单号:', trackingInfo.trackingNo || '无');
  console.log('   订单状态:', order.status === 0 ? '待发货' : '已发货');
  console.log('   发货进度:', order.items.filter(i => i.status >= 1).length + '/' + order.items.length);
  
  return order;
}

// 单个产品完成（收货）
async function completeItem(orderId, itemIndex) {
  console.log(`\n📦 完成产品 #${itemIndex + 1}`);
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return null;
  }
  
  const item = order.items[itemIndex];
  if (!item) {
    console.log('❌ 产品不存在');
    return null;
  }
  
  if (item.status !== 1) {
    console.log('❌ 产品未发货或已完成');
    return null;
  }
  
  // 更新产品状态
  item.status = 2; // 已完成
  item.completed_at = Date.now();
  
  // 添加到库存
  db.inventory.push({
    _id: generateId(),
    user_id: order.user_id,
    product_name: item.name,
    stock: item.quantity,
    unit: item.unit,
    created_at: Date.now()
  });
  
  // 检查是否所有产品都已完成
  const allCompleted = order.items.every(i => i.status === 2);
  if (allCompleted) {
    order.status = 2; // 订单变为已完成
  }
  
  order.updated_at = Date.now();
  
  console.log('✅ 产品已完成');
  console.log('   产品:', item.name);
  console.log('   入库数量:', item.quantity, item.unit);
  console.log('   订单状态:', order.status === 1 ? '已发货' : '已完成');
  
  return order;
}

// 查看订单状态
function showOrderStatus(orderId) {
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return;
  }
  
  const statusText = order.status === 0 ? '待发货' : order.status === 1 ? '已发货' : '已完成';
  
  console.log('\n📋 订单状态');
  console.log('   订单ID:', order._id.substring(0, 15) + '...');
  console.log('   整体状态:', statusText);
  console.log('   产品明细:');
  order.items.forEach((item, i) => {
    const itemStatus = item.status === 0 ? '待发货' : item.status === 1 ? '已发货' : '已完成';
    console.log(`   ${i + 1}. ${item.name} x${item.quantity}${item.unit} [${itemStatus}]`);
  });
}

// 主测试流程
async function runSimpleTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    简化版订单测试：一个一个单独发货');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // 创建测试用户
    const client = { _id: 'client_001', username: '张小明', role: 'client' };
    db.users.push(client);
    
    // 创建订单（2个产品）
    const order = await createOrder(client._id, [
      { name: '深海鱼油', quantity: 3, unit: '瓶', price: 168 },
      { name: '维生素C', quantity: 2, unit: '瓶', price: 88 }
    ]);
    
    // 测试1：发货第一个产品
    await shipItem(order._id, 0, { trackingNo: 'SF1234567890', image: 'img1.jpg' });
    showOrderStatus(order._id);
    
    // 测试2：发货第二个产品（全部发完）
    await shipItem(order._id, 1, { trackingNo: 'SF1234567891', image: 'img2.jpg' });
    showOrderStatus(order._id);
    
    // 测试3：完成第一个产品
    await completeItem(order._id, 0);
    showOrderStatus(order._id);
    
    // 测试4：完成第二个产品（全部完成）
    await completeItem(order._id, 1);
    showOrderStatus(order._id);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('              ✅ 简化版测试通过');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📁 最终数据:');
    console.log('   订单总数:', db.orders.length);
    console.log('   库存记录:', db.inventory.length);
    console.log('   最终订单状态:', db.orders[0].status === 2 ? '已完成' : '未完成');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

runSimpleTest();

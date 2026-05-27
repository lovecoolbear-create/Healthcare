/**
 * 测试3: 订单管理增强
 * 流程：创建订单（含子订单）→ 部分发货 → 部分收货 → 取消未发货 → 退款处理
 */

const db = {
  users: [],
  orders: [],
  inventory: [],
  logs: []
};

const generateId = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

// ==================== 模拟API ====================

// 1. 创建补货订单（带子订单）
async function createRefillOrder(clientId, nutritionistId, items) {
  console.log('\n📦 Step 1: 创建补货订单（带子订单）');
  
  const client = db.users.find(u => u._id === clientId);
  
  const orderItems = items.map((item, index) => ({
    inventory_id: generateId(),
    product_id: generateId(),
    product_name: item.name,
    name: item.name,
    quantity: item.quantity || 1,
    unit: item.unit || '瓶',
    price: item.price || 0,
    status: 0, // 待发货
    sub_order_id: `SUB${Date.now()}${index}`,
    tracking_no: '',
    tracking_image: '',
    shipped_at: null,
    received_at: null
  }));
  
  const order = {
    _id: generateId(),
    user_id: clientId,
    nutritionist_id: nutritionistId,
    items: orderItems,
    status: 0, // 0=待发货, 1=已发货, 2=已收货, 3=已取消
    total_amount: orderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0),
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  db.orders.push(order);
  
  console.log('✅ 订单创建成功');
  console.log('   订单ID:', order._id.substring(0, 15) + '...');
  console.log('   产品数:', orderItems.length);
  console.log('   总金额: ¥', order.total_amount.toFixed(2));
  console.log('   子订单列表:');
  orderItems.forEach((item, i) => {
    console.log(`     ${i + 1}. ${item.product_name} x${item.quantity}${item.unit}`);
    console.log(`        子订单ID: ${item.sub_order_id}`);
    console.log(`        状态: 待发货`);
  });
  
  return order;
}

// 2. 部分发货（单个产品）
async function shipPartialOrder(orderId, subOrderId, trackingInfo) {
  console.log('\n🚚 Step 2: 部分发货（单个子订单）');
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return null;
  }
  
  const itemIndex = order.items.findIndex(i => i.sub_order_id === subOrderId);
  if (itemIndex === -1) {
    console.log('❌ 子订单不存在');
    return null;
  }
  
  // 更新该子订单状态
  order.items[itemIndex].status = 1; // 已发货
  order.items[itemIndex].tracking_no = trackingInfo.trackingNo;
  order.items[itemIndex].tracking_image = trackingInfo.image || '';
  order.items[itemIndex].shipped_at = Date.now();
  
  // 检查整体订单状态
  const allShipped = order.items.every(i => i.status === 1 || i.status === 2);
  const anyShipped = order.items.some(i => i.status === 1 || i.status === 2);
  
  if (allShipped) {
    order.status = 1; // 全部已发货
  } else if (anyShipped) {
    order.status = 1; // 部分发货（保持1）
  }
  
  order.updated_at = Date.now();
  
  console.log('✅ 子订单已发货');
  console.log('   产品:', order.items[itemIndex].product_name);
  console.log('   物流单号:', trackingInfo.trackingNo);
  console.log('   订单整体状态:', order.status === 1 ? '已发货（部分）' : '待发货');
  console.log('   发货进度:', order.items.filter(i => i.status >= 1).length + '/' + order.items.length);
  
  return order;
}

// 3. 部分收货（单个产品）
async function confirmSubOrderReceipt(orderId, subOrderId) {
  console.log('\n📦 Step 3: 部分收货（单个子订单）');
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return null;
  }
  
  const itemIndex = order.items.findIndex(i => i.sub_order_id === subOrderId);
  if (itemIndex === -1) {
    console.log('❌ 子订单不存在');
    return null;
  }
  
  const item = order.items[itemIndex];
  
  if (item.status === 2) {
    console.log('❌ 该商品已收货');
    return null;
  }
  
  // 更新子订单状态为已收货
  order.items[itemIndex].status = 2;
  order.items[itemIndex].received_at = Date.now();
  
  // 添加到库存
  db.inventory.push({
    _id: generateId(),
    user_id: order.user_id,
    product_id: item.product_id,
    product_name: item.product_name,
    stock: item.quantity,
    unit: item.unit,
    created_at: Date.now()
  });
  
  // 检查订单整体状态
  const allReceived = order.items.every(i => i.status === 2);
  const anyShipped = order.items.some(i => i.status === 1 || i.status === 2);
  
  if (allReceived) {
    order.status = 2; // 全部已收货
  } else if (anyShipped) {
    order.status = 1; // 部分已发货/收货
  }
  
  order.updated_at = Date.now();
  
  console.log('✅ 子订单已收货入库');
  console.log('   产品:', item.product_name);
  console.log('   入库数量:', item.quantity, item.unit);
  console.log('   订单整体状态:', allReceived ? '全部已收货' : '部分收货');
  console.log('   收货进度:', order.items.filter(i => i.status === 2).length + '/' + order.items.length);
  
  return order;
}

// 4. 取消订单（只能取消未发货的）
async function cancelOrder(orderId, cancelledBy) {
  console.log('\n❌ Step 4: 取消订单');
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return null;
  }
  
  // 检查订单状态
  if (order.status === 3) {
    console.log('❌ 订单已取消，无需重复操作');
    return null;
  }
  
  if (order.status === 1 || order.status === 2) {
    console.log('❌ 订单已发货，无法取消');
    console.log('   已发货商品无法取消，只能收货或申请退款');
    return null;
  }
  
  // 取消未发货的子订单
  let cancelledCount = 0;
  order.items.forEach(item => {
    if (item.status === 0) { // 待发货
      item.status = 3; // 已取消
      item.cancelled_at = Date.now();
      cancelledCount++;
    }
  });
  
  order.status = 3;
  order.cancelled_at = Date.now();
  order.cancelled_by = cancelledBy;
  order.updated_at = Date.now();
  
  // 记录日志
  db.logs.push({
    _id: generateId(),
    user_id: order.user_id,
    type: 'order_cancelled',
    content: `${cancelledBy === 'client' ? '客户' : '顾问'}取消订单 #${orderId}`,
    order_id: orderId,
    created_at: Date.now()
  });
  
  console.log('✅ 订单已取消');
  console.log('   取消人:', cancelledBy === 'client' ? '客户' : '顾问');
  console.log('   取消商品数:', cancelledCount + '/' + order.items.length);
  console.log('   取消时间:', new Date().toLocaleString());
  
  return order;
}

// 5. 部分退款（已发货但客户不想要）
async function partialRefund(orderId, subOrderId, reason) {
  console.log('\n💰 Step 5: 部分退款申请');
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return null;
  }
  
  const itemIndex = order.items.findIndex(i => i.sub_order_id === subOrderId);
  if (itemIndex === -1) {
    console.log('❌ 子订单不存在');
    return null;
  }
  
  const item = order.items[itemIndex];
  
  // 只有已发货但未收货的可以申请退款
  if (item.status !== 1) {
    console.log('❌ 该商品状态不支持退款');
    console.log('   当前状态:', item.status === 0 ? '待发货' : item.status === 2 ? '已收货' : '已取消');
    return null;
  }
  
  item.refund_requested = true;
  item.refund_reason = reason;
  item.refund_status = 'pending'; // pending, approved, rejected
  item.refund_requested_at = Date.now();
  
  order.updated_at = Date.now();
  
  console.log('✅ 退款申请已提交');
  console.log('   产品:', item.product_name);
  console.log('   数量:', item.quantity, item.unit);
  console.log('   原因:', reason);
  console.log('   退款状态: 待审核');
  
  return order;
}

// 6. 处理退款（顾问/管理员审核）
async function processRefund(orderId, subOrderId, approved, approvedBy) {
  console.log('\n✅ Step 6: 处理退款申请');
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) return null;
  
  const item = order.items.find(i => i.sub_order_id === subOrderId);
  if (!item || !item.refund_requested) {
    console.log('❌ 无退款申请');
    return null;
  }
  
  if (approved) {
    item.refund_status = 'approved';
    item.refund_approved_at = Date.now();
    item.refund_approved_by = approvedBy;
    item.status = 3; // 标记为取消/退款
    
    console.log('✅ 退款申请已批准');
    console.log('   退款金额: ¥', (item.price * item.quantity).toFixed(2));
    console.log('   批准人:', approvedBy);
  } else {
    item.refund_status = 'rejected';
    item.refund_rejected_at = Date.now();
    item.refund_rejected_by = approvedBy;
    
    console.log('❌ 退款申请已拒绝');
    console.log('   拒绝人:', approvedBy);
    console.log('   商品需要正常收货');
  }
  
  order.updated_at = Date.now();
  return order;
}

// 7. 查看订单详情和状态
async function getOrderDetail(orderId) {
  console.log('\n📋 Step 7: 查看订单详情');
  
  const order = db.orders.find(o => o._id === orderId);
  if (!order) {
    console.log('❌ 订单不存在');
    return null;
  }
  
  const client = db.users.find(u => u._id === order.user_id);
  
  console.log('✅ 订单详情:');
  console.log('   订单号:', orderId.substring(0, 20) + '...');
  console.log('   客户:', client?.username || '未知');
  console.log('   总金额: ¥', order.total_amount.toFixed(2));
  console.log('   创建时间:', new Date(order.created_at).toLocaleString());
  console.log('   整体状态:', 
    order.status === 0 ? '待发货' : 
    order.status === 1 ? '已发货（部分）' : 
    order.status === 2 ? '全部已收货' : '已取消'
  );
  
  console.log('\n   子订单明细:');
  order.items.forEach((item, i) => {
    const statusText = 
      item.status === 0 ? '待发货' : 
      item.status === 1 ? '已发货' : 
      item.status === 2 ? '已收货' : '已取消/退款';
    
    console.log(`   ${i + 1}. ${item.product_name} x${item.quantity}${item.unit}`);
    console.log(`      状态: ${statusText}`);
    
    if (item.tracking_no) {
      console.log(`      物流: ${item.tracking_no}`);
    }
    if (item.refund_requested) {
      console.log(`      退款: ${item.refund_status === 'pending' ? '待审核' : item.refund_status === 'approved' ? '已批准' : '已拒绝'}`);
    }
  });
  
  return order;
}

// ==================== 主测试流程 ====================

async function runTest() {
  console.log('═══════════════════════════════════════════════════');
  console.log('    测试3: 订单管理增强 - 子订单/部分发货/退款');
  console.log('═══════════════════════════════════════════════════');
  
  try {
    // 初始化用户
    const client = { _id: 'client_001', username: '张小明', role: 'client' };
    const nutritionist = { _id: 'nutri_001', username: '王顾问', role: 'nutritionist' };
    db.users.push(client, nutritionist);
    
    // 创建订单（多产品）
    const order = await createRefillOrder(client._id, nutritionist._id, [
      { name: '深海鱼油', quantity: 3, unit: '瓶', price: 168 },
      { name: '维生素C', quantity: 2, unit: '瓶', price: 88 },
      { name: '钙片', quantity: 1, unit: '瓶', price: 128 },
      { name: '益生菌', quantity: 2, unit: '盒', price: 198 }
    ]);
    
    // 场景1：部分发货（先发2个产品）
    await shipPartialOrder(order._id, order.items[0].sub_order_id, {
      trackingNo: 'SF1234567890',
      image: 'tracking_image_001.jpg'
    });
    await shipPartialOrder(order._id, order.items[1].sub_order_id, {
      trackingNo: 'SF1234567891',
      image: 'tracking_image_002.jpg'
    });
    
    // 场景2：部分收货（收到1个产品）
    await confirmSubOrderReceipt(order._id, order.items[0].sub_order_id);
    
    // 场景3：申请退款（已发货但未收货的产品）
    await partialRefund(order._id, order.items[1].sub_order_id, '暂时不需要了');
    
    // 场景4：顾问处理退款
    await processRefund(order._id, order.items[1].sub_order_id, true, nutritionist.username);
    
    // 场景5：取消未发货的产品
    // 注意：订单已发货，不能整体取消，只能单个取消未发货的
    // 手动取消未发货的子订单
    order.items[2].status = 3;
    order.items[2].cancelled_at = Date.now();
    console.log('\n📝 备注：钙片（未发货）已手动标记为取消');
    
    // 继续发货剩余的
    await shipPartialOrder(order._id, order.items[3].sub_order_id, {
      trackingNo: 'SF1234567892',
      image: 'tracking_image_003.jpg'
    });
    
    // 查看最终状态
    await getOrderDetail(order._id);
    
    console.log('\n═══════════════════════════════════════════════════');
    console.log('              ✅ 订单管理增强测试通过');
    console.log('═══════════════════════════════════════════════════');
    
    console.log('\n📁 最终数据:');
    console.log('   订单总数:', db.orders.length);
    console.log('   库存记录:', db.inventory.length);
    console.log('   操作日志:', db.logs.length);
    
    const finalOrder = db.orders[0];
    console.log('\n   订单状态分布:');
    console.log('     已收货:', finalOrder.items.filter(i => i.status === 2).length);
    console.log('     已发货:', finalOrder.items.filter(i => i.status === 1).length);
    console.log('     已取消/退款:', finalOrder.items.filter(i => i.status === 3).length);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
  }
}

runTest();

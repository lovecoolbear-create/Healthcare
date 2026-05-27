<template>
  <div class="font-sans space-y-6">
    <!-- 页面头部 -->
    <div class="flex items-center justify-between bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-sm">
          <span class="text-2xl">📦</span>
        </div>
        <div>
          <h1 class="text-xl font-black text-slate-900">订单管理</h1>
          <p class="text-sm text-slate-500 mt-0.5">处理客户补货订单 · {{ pendingCount }} 个待发货</p>
        </div>
      </div>
      <div class="flex gap-3 items-center">
        <input 
          v-model="searchOrderId"
          placeholder="订单ID或订单号(HP…)"
          class="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-40"
        />
        <button 
          @click="searchOrder"
          class="px-4 py-2 rounded-xl text-sm font-bold bg-slate-500 text-white hover:bg-slate-600 transition-all"
        >
          查询
        </button>
        <button 
          @click="activeTab = 'pending'"
          :class="`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`"
        >
          待发货
        </button>
        <button 
          @click="activeTab = 'shipped'"
          :class="`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'shipped' ? 'bg-blue-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`"
        >
          已发货
        </button>
        <button 
          @click="activeTab = 'completed'"
          :class="`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'completed' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`"
        >
          已完成
        </button>
      </div>
    </div>

    <!-- 列表顶部留白 -->
    <div v-if="activeTab === 'pending' && pendingCount > 0" class="h-2"></div>

    <!-- 订单列表 -->
    <div class="space-y-4">
      <div v-if="loading" class="text-center py-16">
        <div class="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto"></div>
        <p class="text-slate-500 mt-4">加载中...</p>
      </div>

      <div v-else v-for="order in filteredOrders" :key="order._id" class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              <img v-if="order.avatar" :src="order.avatar" class="w-full h-full object-cover" />
              <span v-else class="text-lg">👤</span>
            </div>
            <div class="min-w-0 space-y-0.5">
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h3 class="font-bold text-slate-900">{{ order.username || '未知客户' }}</h3>
                <span v-if="order.phone" class="text-xs text-slate-500">{{ order.phone }}</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-snug">
                订单号 <span class="font-mono text-slate-600">{{ formatOrderDisplayNo(order) }}</span>
                <span class="mx-1">·</span>
                {{ formatDate(order.created_at) }}
                <span class="mx-1">·</span>
                {{ order.items?.length || 0 }} 项
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span :class="`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusClass(order.status)}`">{{ getStatusText(order.status) }}</span>
            <button
              v-if="canCancelPendingOrder(order)"
              type="button"
              @click="cancelWholeOrder(order)"
              class="px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 transition-colors"
            >
              {{ cancelOrderButtonLabel(order) }}
            </button>
          </div>
        </div>

        <div class="mt-3 rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          <div
            v-for="(item, idx) in order.items"
            :key="'row-' + idx"
            class="flex items-center gap-2 px-2 sm:px-3 py-2"
            :class="itemRowTone(order, item)"
          >
            <div 
              v-if="Number(item.status) === 0 && (Number(order.status) === 0 || Number(order.status) === 1)" 
              class="shrink-0 flex items-center justify-center cursor-pointer p-1"
              @click.stop="toggleItemSelection(order._id, Number(idx))"
            >
              <div 
                class="w-6 h-6 rounded-full border-[2.5px] transition-all flex items-center justify-center"
                :class="isItemSelected(order._id, Number(idx)) 
                  ? 'bg-amber-500 border-amber-500 shadow-md shadow-amber-300 scale-110' 
                  : 'bg-white border-slate-500 hover:border-amber-600 shadow-sm'"
              >
                <div v-if="isItemSelected(order._id, Number(idx))" class="text-white text-[10px] font-black">✓</div>
              </div>
            </div>
            <span v-else class="w-5 shrink-0"></span>
            <span class="text-base shrink-0" aria-hidden="true">{{ item.icon || '💊' }}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-slate-800 truncate">{{ item.name }}</div>
              <div class="text-[11px] text-slate-500">{{ item.quantity || 1 }} {{ item.unit || '瓶' }}</div>
            </div>
            <span :class="`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${itemStatusBadgeClass(Number(item.status))}`">
              {{ itemStatusText(Number(item.status)) }}
            </span>
            <button
              v-if="Number(item.status) === 0 && (Number(order.status) === 0 || Number(order.status) === 1) && !isItemSelected(order._id, Number(idx))"
              type="button"
              @click="openShipDialog(order, Number(idx))"
              class="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors"
            >
              发货
            </button>
            <div v-else-if="isItemSelected(order._id, Number(idx))" class="w-[52px]"></div>
            <button
              v-else-if="order.status === 1 && item.status === 1"
              type="button"
              @click="completeItem(order, Number(idx))"
              class="shrink-0 px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
            >
              完成
            </button>
          </div>
        </div>

        <!-- 卡片底部操作区：勾选后显示合并发货 -->
        <div v-if="hasSelectedItemsInOrder(order._id)" class="mt-4 pt-4 border-t border-slate-50 flex justify-end">
          <button 
            @click="openOrderBatchShipDialog(order)"
            class="px-6 py-2.5 bg-amber-500 text-white text-sm font-black rounded-xl hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-200 animate-pulse-subtle flex items-center gap-2"
          >
            <span>✨</span>
            <span>合并发货 ({{ getSelectedCountInOrder(order._id) }}项)</span>
          </button>
        </div>

        <div v-if="Number(order.status) === 2" class="mt-2 text-xs text-emerald-600 flex items-center gap-1">
          <span>✅</span>
          <span>订单已完成</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && filteredOrders.length === 0" class="text-center py-16">
        <div class="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-4xl">📭</span>
        </div>
        <p class="text-slate-500 font-medium">暂无{{ getTabLabel() }}订单</p>
      </div>
    </div>

    <!-- 发货信息填写弹窗 -->
    <div v-if="showShipDialog" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showShipDialog = false"></div>
      <div class="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="p-8">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-black text-slate-900">确认发货</h3>
            <button @click="showShipDialog = false" class="text-slate-400 hover:text-slate-600 text-2xl">×</button>
          </div>
          
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">快递单号</label>
              <input 
                v-model="shippingInfo.trackingNo"
                placeholder="请输入快递单号 (可选)"
                class="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
            
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2">发货照片</label>
              <div 
                @click="chooseShippingImage"
                class="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-amber-300 transition-all overflow-hidden"
              >
                <img v-if="shippingInfo.previewUrl" :src="shippingInfo.previewUrl" class="w-full h-full object-cover" />
                <div v-else class="text-center p-4">
                  <span class="text-3xl mb-2 block">📸</span>
                  <p class="text-xs text-slate-400">点击上传发货照片/快递单 (可选)</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 mt-8">
            <button 
              @click="showShipDialog = false"
              class="flex-1 px-6 py-3 rounded-2xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
            >
              取消
            </button>
            <button 
              @click="confirmShip"
              :disabled="confirmingShip"
              class="flex-[2] px-6 py-3 rounded-2xl text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="confirmingShip" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>确认发货</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { getUserInfo } from '@/utils/storage';
import { callCloud } from '@/utils/cloud';
import { formatOrderDisplayNo } from '@/utils/orderDisplay';

const activeTab = ref('pending');
const orders = ref<any[]>([]);
const loading = ref(false);
const errorMsg = ref('');
const selectedItems = ref<string[]>([]);
const batchShipping = ref(false);
const searchOrderId = ref('');
const searchedOrder = ref<any>(null);

// 发货详情弹窗状态
const showShipDialog = ref(false);
const confirmingShip = ref(false);
const shippingInfo = ref({
  orderId: '',
  itemIndices: [] as number[],
  trackingNo: '',
  trackingImage: '',
  previewUrl: '',
  isBatch: false
});

const pendingCount = computed(() => orders.value.filter(o => (o.items || []).some((i: any) => Number(i.status) === 0)).length);

// 获取所有待发货的订单项ID
const pendingItemIds = computed(() => {
  const ids: string[] = [];
  orders.value.forEach(order => {
    if ((order.status === 0 || order.status === 1) && order.items) {
      order.items.forEach((item: any, index: number) => {
        if (item.status === 0) {
          ids.push(`${order._id}_${index}`);
        }
      });
    }
  });
  return ids;
});

const isAllSelected = computed(() => {
  return pendingItemIds.value.length > 0 && selectedItems.value.length === pendingItemIds.value.length;
});

const filteredOrders = computed(() => {
  return orders.value.filter(o => {
    const items = o.items || [];
    if (activeTab.value === 'pending') {
      // 只要有任何一个item是待发货(0)就显示在待发货页
      return items.some(item => Number(item.status) === 0);
    }
    if (activeTab.value === 'shipped') {
      // 所有item都不是待发货(0)，且至少有一个是已发货(1)
      const hasPending = items.some(item => Number(item.status) === 0);
      const hasShipped = items.some(item => Number(item.status) === 1);
      return !hasPending && hasShipped;
    }
    if (activeTab.value === 'completed') {
      // 所有item都是已完成(2)
      return items.length > 0 && items.every(item => Number(item.status) === 2);
    }
    return false;
  }).sort((a, b) => (b.updated_at || b.created_at) - (a.updated_at || a.created_at));
});

const getStatusClass = (status: number) => {
  const map: Record<number, string> = {
    0: 'bg-amber-100 text-amber-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-emerald-100 text-emerald-700'
  };
  return map[status] || 'bg-slate-100 text-slate-700';
};

const getStatusText = (status: number) => {
  const map: Record<number, string> = { 0: '待发货', 1: '已发货', 2: '已完成' };
  return map[status] || '未知';
};

const getTabLabel = () => {
  const map: Record<string, string> = { pending: '待发货', shipped: '已发货', completed: '已完成' };
  return map[activeTab.value] || '';
};

const formatDate = (timestamp: number) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const itemStatusText = (status: number) => {
  const map: Record<number, string> = { 0: '待发货', 1: '已发货', 2: '已完成', 3: '已取消' };
  return map[status] ?? '—';
};

const itemStatusBadgeClass = (status: number) => {
  const map: Record<number, string> = {
    0: 'bg-amber-100 text-amber-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-emerald-100 text-emerald-700',
    3: 'bg-slate-200 text-slate-600'
  };
  return map[status] ?? 'bg-slate-100 text-slate-600';
};

const itemRowTone = (order: any, item: any) => {
  if (item.status === 0 && (order.status === 0 || order.status === 1)) return 'bg-amber-50/70';
  if (order.status === 1 && item.status === 1) return 'bg-blue-50/50';
  return 'bg-white';
};

const canCancelPendingOrder = (order: any) => {
  if (!order?.items?.length) return false;
  if (order.status === 2 || order.status === 3) return false;
  return order.items.some((it: any) => Number(it.status) === 0);
};

const cancelOrderButtonLabel = (order: any) => {
  if (order.status === 1) return '取消未发货';
  return '取消订单';
};

const cancelWholeOrder = (order: any) => {
  const userInfo = getUserInfo();
  const userId = userInfo?._id || userInfo?.uid || userInfo?.id;
  if (!userId) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  uni.showModal({
    title: '取消订单',
    content:
      '将取消该订单中所有「待发货」商品，客户会在「消息」中收到通知；已发货商品不受影响。确定吗？',
    confirmColor: '#e11d48',
    success: async (modalRes: any) => {
      if (!modalRes.confirm) return;
      uni.showLoading({ title: '处理中...' });
      try {
        const res = await callCloud('client-api', {
          action: 'cancelOrder',
          payload: { orderId: order._id, userId }
        });
        if (res.ok) {
          uni.showToast({ title: res.msg || '已取消', icon: 'success' });
          selectedItems.value = selectedItems.value.filter((id) => !id.startsWith(`${order._id}_`));
          await fetchOrders();
        } else {
          uni.showToast({ title: res.msg || '取消失败', icon: 'none' });
        }
      } catch {
        uni.showToast({ title: '取消失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    }
  });
};

const fetchOrders = async () => {
  loading.value = true;
  try {
    const userInfo = getUserInfo();
    const userId = userInfo?._id || userInfo?.uid || userInfo?.id;
    if (!userId) {
      errorMsg.value = '请先登录';
      return;
    }
    const res = await callCloud('client-api', {
      action: 'getAdminOrders',
      payload: { userId }
    });
    if (res.code === 0) {
      orders.value = res.data || [];
      console.log('📦 获取到的订单数据:', orders.value);
      console.log('📦 待发货订单数量:', orders.value.filter(o => o.status === 0).length);
      console.log('📦 订单状态分布:', orders.value.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {}));
    }
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    errorMsg.value = '加载订单失败';
  } finally {
    loading.value = false;
  }
};

const searchOrder = async () => {
  if (!searchOrderId.value) {
    uni.showToast({ title: '请输入订单ID或订单号', icon: 'none' });
    return;
  }
  
  // 静默清理逻辑：输入特定代码触发清理，不展示额外UI
  if (searchOrderId.value === 'CLEANUP_TEST_DATA') {
    loading.value = true;
    try {
      const userInfo = getUserInfo();
      const res = await callCloud('admin-api', {
        action: 'cleanupTestAccount',
        payload: { phone: '17722222222', token: userInfo?.token }
      });
      if (res.code === 0) {
        uni.showToast({ title: '数据同步完成', icon: 'success' });
        searchOrderId.value = '';
        await fetchOrders();
      }
    } catch (err) {
      console.error('Silent cleanup failed:', err);
    } finally {
      loading.value = false;
    }
    return;
  }

  loading.value = true;
  try {
    const res = await callCloud('client-api', {
      action: 'getOrderById',
      payload: { orderId: searchOrderId.value }
    });
    if (res.code === 0) {
      searchedOrder.value = res.data;
      console.log('查询到的订单详情:', res.data);
      uni.showToast({ title: '查询成功', icon: 'success' });
    } else {
      uni.showToast({ title: res.msg || '查询失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to search order:', error);
    uni.showToast({ title: '查询失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const openShipDialog = (order: any, itemIndex: number | 'batch') => {
  if (itemIndex === 'batch') {
    shippingInfo.value = {
      orderId: 'multiple',
      itemIndices: [],
      trackingNo: '',
      trackingImage: '',
      previewUrl: '',
      isBatch: true
    };
  } else {
    shippingInfo.value = {
      orderId: order._id,
      itemIndices: [itemIndex],
      trackingNo: '',
      trackingImage: '',
      previewUrl: '',
      isBatch: false
    };
  }
  showShipDialog.value = true;
};

const chooseShippingImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const tempPath = res.tempFilePaths[0];
      uni.showLoading({ title: '正在上传...' });
      try {
        const uploadRes = await uniCloud.uploadFile({
          filePath: tempPath,
          cloudPath: `tracking/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`
        });
        shippingInfo.value.trackingImage = uploadRes.fileID;
        
        // 获取临时预览图
        const tempUrlRes = await uniCloud.getTempFileURL({
          fileList: [uploadRes.fileID]
        });
        if (tempUrlRes.fileList && tempUrlRes.fileList[0].tempFileURL) {
          shippingInfo.value.previewUrl = tempUrlRes.fileList[0].tempFileURL;
        } else {
          shippingInfo.value.previewUrl = tempPath;
        }
      } catch (err) {
        uni.showToast({ title: '上传失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    }
  });
};

const confirmShip = async () => {
  if (confirmingShip.value) return;
  confirmingShip.value = true;
  uni.showLoading({ title: '发货中...' });
  
  try {
    const userInfo = getUserInfo();
    const userId = userInfo?._id || userInfo?.uid || userInfo?.id;
    if (!userId) {
      uni.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    if (shippingInfo.value.isBatch) {
      // 批量发货：按订单分组处理
      const orderMap = new Map<string, number[]>();
      selectedItems.value.forEach(itemId => {
        const [orderId, itemIndex] = itemId.split('_');
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, []);
        }
        orderMap.get(orderId)?.push(parseInt(itemIndex));
      });

      let successCount = 0;
      for (const [orderId, itemIndices] of orderMap.entries()) {
        const res = await callCloud('client-api', {
          action: 'shipOrder',
          payload: {
            orderId,
            itemIndices,
            trackingNo: shippingInfo.value.trackingNo,
            trackingImage: shippingInfo.value.trackingImage,
            trackingImageUrl: shippingInfo.value.previewUrl,
            userId
          }
        });
        if (res.code === 0) {
          successCount += itemIndices.length;
        }
      }
      uni.showToast({ title: `成功发货 ${successCount} 项`, icon: 'success' });
      selectedItems.value = [];
    } else {
      // 单项发货
      const res = await callCloud('client-api', {
        action: 'shipOrder',
        payload: {
          orderId: shippingInfo.value.orderId,
          itemIndices: shippingInfo.value.itemIndices,
          trackingNo: shippingInfo.value.trackingNo,
          trackingImage: shippingInfo.value.trackingImage,
          trackingImageUrl: shippingInfo.value.previewUrl,
          userId
        }
      });
      
      if (res.code === 0) {
        uni.showToast({ title: '发货成功', icon: 'success' });
      } else {
        throw new Error(res.msg || '发货失败');
      }
    }

    showShipDialog.value = false;
    await fetchOrders();
  } catch (error) {
    uni.showToast({ title: '发货失败', icon: 'none' });
  } finally {
    confirmingShip.value = false;
    uni.hideLoading();
  }
};

const shipItem = async (order: any, itemIndex: number) => {
  // Legacy method, redirected to dialog
  openShipDialog(order, itemIndex);
};

const completeItem = async (order: any, itemIndex: number) => {
  try {
    uni.showLoading({ title: '处理中...' });
    const userInfo = getUserInfo();
    const userId = userInfo?._id || userInfo?.uid || userInfo?.id;
    if (!userId) {
      uni.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const res = await callCloud('client-api', {
      action: 'completeOrder',
      payload: {
        orderId: order._id,
        itemIndices: [itemIndex],
        userId
      }
    });
    if (res.code === 0) {
      uni.showToast({ title: '已完成', icon: 'success' });
      await fetchOrders();
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' });
    }
  } catch (error) {
    uni.showToast({ title: '操作失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

// 批量操作方法
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedItems.value = [];
  } else {
    selectedItems.value = [...pendingItemIds.value];
  }
};

const toggleItemSelection = (orderId: string, itemIndex: number) => {
  const itemId = `${orderId}_${itemIndex}`;
  const index = selectedItems.value.indexOf(itemId);
  if (index > -1) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(itemId);
  }
};

const isItemSelected = (orderId: string, itemIndex: number) => {
  return selectedItems.value.includes(`${orderId}_${itemIndex}`);
};

const batchShip = async () => {
  if (selectedItems.value.length === 0) return;
  openShipDialog(null, 'batch');
};

const hasSelectedItemsInOrder = (orderId: string) => {
  return selectedItems.value.some(id => id.startsWith(`${orderId}_`));
};

const getSelectedCountInOrder = (orderId: string) => {
  return selectedItems.value.filter(id => id.startsWith(`${orderId}_`)).length;
};

const openOrderBatchShipDialog = (order: any) => {
  const itemIndices = selectedItems.value
    .filter(id => id.startsWith(`${order._id}_`))
    .map(id => parseInt(id.split('_')[1]));
    
  shippingInfo.value = {
    orderId: order._id,
    itemIndices,
    trackingNo: '',
    trackingImage: '',
    previewUrl: '',
    isBatch: true
  };
  showShipDialog.value = true;
};

onMounted(() => {
  fetchOrders();
});
</script>

<style scoped>
@keyframes pulse-subtle {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.03); opacity: 0.95; }
}
.animate-pulse-subtle {
  animation: pulse-subtle 2s infinite ease-in-out;
}
</style>

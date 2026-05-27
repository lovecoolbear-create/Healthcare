<template>
  <view class="mp-page-shell min-h-screen bg-slate-50 pb-24">
    <!-- Header -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md px-6 pt-12 pb-3 border-b border-slate-100 flex items-center justify-between">
      <view class="flex items-center h-10 gap-3">
        <view @click="goBack" class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center active:bg-slate-100 transition-colors mp-pressable">
          <text class="text-slate-500 text-lg">←</text>
        </view>
        <text class="text-lg font-black text-slate-800">我的订单</text>
      </view>
      <!-- 刷新按钮 -->
      <view 
        @click="refreshOrders"
        class="w-8 h-8 flex items-center justify-center rounded-full"
        :class="isRefreshing ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'"
      >
        <text class="text-sm" :class="{ 'animate-spin': isRefreshing }">🔄</text>
      </view>
    </view>

    <!-- 占位高度 -->
    <view class="h-24"></view>

    <!-- 标签切换 -->
    <view class="px-6 mb-4">
      <view class="bg-white rounded-2xl p-1.5 flex shadow-sm border border-slate-100">
        <view 
          v-for="tab in tabs" 
          :key="tab.value"
          @click="activeTab = tab.value"
          :class="`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-center transition-all ${activeTab === tab.value ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`"
        >
          {{ tab.label }}
          <text v-if="tab.count > 0" class="ml-1">({{ tab.count }})</text>
        </view>
      </view>
    </view>

    <!-- 订单列表（支持下拉刷新） -->
    <scroll-view 
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onPullDownRefresh"
      scroll-y
      class="px-6 space-y-4"
      style="height: calc(100vh - 180px);"
    >
      <view v-if="filteredOrders.length === 0" class="text-center py-16">
        <view class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <text class="text-4xl">📦</text>
        </view>
        <text class="text-sm font-bold text-slate-400 block">暂无{{ getCurrentTabLabel() }}订单</text>
        <text class="text-[10px] text-slate-300 mt-2 block">去药箱页面申请补货吧</text>
      </view>

      <view 
        v-for="order in filteredOrders" 
        :key="order._id"
        class="bg-white rounded-[24px] p-5 shadow-lg shadow-slate-200/30 border border-slate-100"
      >
        <!-- 订单头部 -->
        <view class="flex items-center justify-between mb-4">
          <view class="flex items-center gap-2">
            <view 
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-amber-400 animate-pulse': order.status === 0,
                'bg-blue-400': order.status === 1,
                'bg-emerald-400': order.status === 2
              }"
            ></view>
            <text 
              class="text-xs font-bold"
              :class="{
                'text-amber-600': order.status === 0,
                'text-blue-600': order.status === 1,
                'text-emerald-600': order.status === 2
              }"
            >
              {{ getStatusText(order.status) }}
            </text>
          </view>
          <text class="text-[10px] font-bold text-slate-300">{{ formatOrderDisplayNo(order) }}</text>
        </view>

        <!-- 订单内容 -->
        <view class="space-y-4 mb-4">
          <view v-for="(item, idx) in order.items" :key="idx" class="flex flex-col gap-2">
            <view class="flex items-center gap-3">
              <view class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl shrink-0">
                {{ item.icon || '💊' }}
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm font-bold text-slate-800 block truncate">{{ item.name }}</text>
                <text class="text-[10px] text-slate-400">数量: {{ item.quantity }} {{ item.unit || '瓶' }}</text>
              </view>
              <!-- 物品状态标签 -->
              <view v-if="item.status === 1" class="px-2 py-0.5 bg-blue-50 text-blue-500 rounded text-[10px] font-bold">已发货</view>
              <view v-if="item.status === 2" class="px-2 py-0.5 bg-emerald-50 text-emerald-500 rounded text-[10px] font-bold">已完成</view>
            </view>
            
            <!-- 子订单物流信息 -->
            <view v-if="item.tracking_no || item.tracking_image" class="bg-emerald-50/30 rounded-2xl p-3 border border-emerald-100/50 flex items-center justify-between" style="margin-left: 60px;">
              <view class="flex-1 min-w-0" @click.stop="copyTrackingNo(item.tracking_no)">
                <text class="text-[10px] text-emerald-600 font-bold block mb-0.5">快递单号 (点击复制)</text>
                <text class="text-xs font-mono text-slate-600">{{ item.tracking_no || '已由顾问打包装车' }}</text>
              </view>
              
              <!-- 查看照片按钮 -->
              <view 
                v-if="item.tracking_image || item.tracking_image_url" 
                @click.stop="previewImage(item.tracking_image_url || item.tracking_image)"
                class="flex items-center gap-1 px-2 py-1 bg-white rounded-lg shadow-sm border border-emerald-100 active:scale-95 transition-all"
              >
                <text class="text-[10px]">📸</text>
                <text class="text-[10px] font-bold text-emerald-600">查看照片</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 订单信息 -->
        <view class="pt-4 border-t border-slate-100 space-y-2">
          <view class="flex items-center justify-between">
            <text class="text-xs text-slate-400">下单时间</text>
            <text class="text-xs text-slate-600">{{ formatDate(order.created_at) }}</text>
          </view>
          
          <!-- 物流信息（已发货/已完成时显示） -->
          <view v-if="order.status >= 1" class="flex items-center justify-between">
            <text class="text-xs text-slate-400">物流单号</text>
            <text class="text-xs text-slate-600">{{ order.tracking_no || '暂无' }}</text>
          </view>
          
          <!-- 快递单图片 -->
          <view v-if="order.tracking_image" class="mt-2">
            <text class="text-xs text-slate-400 block mb-1">快递单照片</text>
            <image 
              :src="order.tracking_image" 
              class="w-32 h-32 rounded-xl object-cover"
              mode="aspectFill"
              @click="previewImage(order.tracking_image)"
            />
          </view>
          
          <!-- 发货时间 -->
          <view v-if="order.shipped_at" class="flex items-center justify-between">
            <text class="text-xs text-slate-400">发货时间</text>
            <text class="text-xs text-slate-600">{{ formatDate(order.shipped_at) }}</text>
          </view>
          
          <!-- 完成时间 -->
          <view v-if="order.completed_at" class="flex items-center justify-between">
            <text class="text-xs text-slate-400">完成时间</text>
            <text class="text-xs text-slate-600">{{ formatDate(order.completed_at) }}</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view v-if="order.status === 1" class="mt-4 pt-4 border-t border-slate-100">
          <button 
            @click="confirmReceipt(order)"
            class="w-full py-3 rounded-2xl bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 active:scale-95 mp-pressable"
          >
            确认收货
          </button>
        </view>

        <view v-if="order.status === 0" class="mt-4 pt-4 border-t border-slate-100 flex gap-2">
          <button 
            @click="cancelOrder(order)"
            class="flex-1 py-3 rounded-2xl bg-slate-50 text-slate-400 text-xs font-bold active:bg-slate-100 mp-pressable"
          >
            取消订单
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { callCloud } from '@/utils/cloud';
import { formatOrderDisplayNo } from '@/utils/orderDisplay';

interface Order {
  _id: string;
  order_no?: string;
  status: number;
  items: any[];
  tracking_no?: string;
  tracking_image?: string;
  created_at: number;
  shipped_at?: number;
  completed_at?: number;
}

const orders = ref<Order[]>([]);
const isLoading = ref(false);
const isRefreshing = ref(false);
const activeTab = ref('all');
const lastRefreshTimestamp = ref(0);
const MIN_REFRESH_INTERVAL = 2000; // 2秒内禁止重复刷新

const tabs = computed(() => [
  { label: '全部', value: 'all', count: orders.value.length },
  { label: '进行中', value: 'active', count: orders.value.filter(o => o.status === 0 || o.status === 1).length },
  { label: '已完成', value: 'completed', count: orders.value.filter(o => o.status === 2).length }
]);

const filteredOrders = computed(() => {
  switch (activeTab.value) {
    case 'active':
      return orders.value.filter(o => o.status === 0 || o.status === 1).sort((a, b) => b.created_at - a.created_at);
    case 'completed':
      return orders.value.filter(o => o.status === 2).sort((a, b) => (b.completed_at || 0) - (a.completed_at || 0));
    default:
      return orders.value.sort((a, b) => b.created_at - a.created_at);
  }
});

const getCurrentTabLabel = () => {
  const map: Record<string, string> = {
    'all': '',
    'active': '进行中',
    'completed': '已完成'
  };
  return map[activeTab.value] || '';
};

const getStatusText = (status: number) => {
  const map = { 0: '等待发货', 1: '已发货', 2: '已完成' };
  return map[status as keyof typeof map] || '未知';
};

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timer: any;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// 刷新订单数据
const refreshOrders = async () => {
  // 检查是否正在刷新
  if (isRefreshing.value) {
    uni.showToast({ title: '刷新中，请稍候...', icon: 'none' });
    return;
  }
  
  // 检查刷新间隔（2秒内禁止重复刷新）
  const now = Date.now();
  if (now - lastRefreshTimestamp.value < MIN_REFRESH_INTERVAL) {
    uni.showToast({ title: '操作太频繁', icon: 'none' });
    return;
  }
  
  isRefreshing.value = true;
  isLoading.value = true;
  
  try {
    await fetchOrders();
    lastRefreshTimestamp.value = Date.now();
    // 刷新成功提示（静默提示，不打扰用户）
    uni.showToast({ title: '已更新', icon: 'success', duration: 1000 });
  } catch (error) {
    console.error('刷新订单失败:', error);
  } finally {
    isRefreshing.value = false;
    isLoading.value = false;
  }
};

// 下拉刷新处理
const onPullDownRefresh = async () => {
  isRefreshing.value = true;
  try {
    await fetchOrders();
    lastRefreshTimestamp.value = Date.now();
  } finally {
    isRefreshing.value = false;
    uni.stopPullDownRefresh();
  }
};

// 防抖刷新（防止频繁触发）
const debouncedRefresh = debounce(() => {
  refreshOrders();
}, 500);

const formatDate = (ts?: number) => {
  if (!ts) return '-';
  const date = new Date(ts);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const getUserId = () => uni.getStorageSync('userId') || getUserInfo()?._id;

const goBack = () => {
  uni.navigateBack();
};

const fetchOrders = async () => {
  const userId = getUserId();
  if (!userId) return;
  isLoading.value = true;
  try {
    const res = await callCloud<any>('client-api', {
      action: 'getOrders',
      payload: { userId }
    });
    if (res.ok) {
      orders.value = res.data;
    }
  } catch (e) {
    console.error(e);
  } finally {
    isLoading.value = false;
  }
};

const cancelOrder = async (order: Order) => {
  const userId = getUserId();
  uni.showModal({
    title: '取消订单',
    content: '确认取消该订单吗？',
    success: async (modalRes) => {
      if (!modalRes.confirm) return;
      uni.showLoading({ title: '处理中...' });
      try {
        const res = await callCloud<any>('client-api', {
          action: 'cancelOrder',
          payload: { orderId: order._id, userId }
        });
        if (res.code === 0) {
          uni.showToast({ title: res.msg || '订单已取消', icon: 'success' });
          fetchOrders();
        } else {
          uni.showToast({ title: res.msg || '操作失败', icon: 'none' });
        }
      } catch (err) {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    }
  });
};

const confirmReceipt = async (order: Order) => {
  const userId = getUserId();
  uni.showModal({
    title: '确认收货',
    content: '确认已收到产品吗？',
    confirmColor: '#10b981',
    success: async (modalRes) => {
      if (!modalRes.confirm) return;
      uni.showLoading({ title: '处理中...' });
      try {
        const res = await callCloud<any>('client-api', {
          action: 'confirmOrderReceipt',
          payload: { orderId: order._id, userId }
        });
        if (res.ok) {
          uni.showToast({ title: '收货成功', icon: 'success' });
          fetchOrders();
        }
      } catch (err) {
        uni.showToast({ title: '网络错误', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    }
  });
};

const copyTrackingNo = (no?: string) => {
  if (!no) return;
  uni.setClipboardData({
    data: no,
    success: () => {
      uni.showToast({ title: '单号已复制', icon: 'success' });
    }
  });
};

const previewImage = (url: string) => {
  if (!url) return;
  uni.previewImage({
    urls: [url],
    current: url
  });
};

onShow(() => {
  fetchOrders();
});
</script>

<style scoped>
.mp-pressable:active {
  opacity: 0.7;
  transform: scale(0.98);
}
</style>

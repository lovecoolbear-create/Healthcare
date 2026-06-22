<template>
  <view class="mp-page-shell h-screen flex flex-col overflow-hidden bg-transparent">
    <!-- 1. Top Fixed Bar -->
    <view class="bg-slate-900 px-5 pb-16 flex-none sticky top-0 z-40 shadow-lg shadow-slate-200/50"
      :style="{ paddingTop: `calc(${statusBarHeight}px + 12px)` }">
      <view class="flex items-center justify-between h-10">
        <view>
          <text class="text-xl font-black text-white block tracking-tight">订单管理</text>
          <text class="text-[10px] text-slate-400 font-medium mt-1 block">处理客户补货订单 · {{ pendingCount }} 个待发货</text>
        </view>
      </view>
    </view>

    <!-- 2. Status Tabs (Floating) -->
    <view class="px-5 -mt-10 flex-none z-50 relative">
      <view class="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-1 flex">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="flex-1 py-2.5 rounded-xl text-center transition-all mp-pressable"
          :class="activeTab === tab.key ? 'bg-slate-50 shadow-inner' : ''"
          @click="switchTab(tab.key)"
        >
          <text class="text-sm font-bold" :class="activeTab === tab.key ? 'text-slate-800' : 'text-slate-400'">{{ tab.label }}</text>
          <text v-if="tab.key === 'pending' && pendingCount > 0" class="ml-1 text-[10px]">{{ pendingCount }}</text>
        </view>
      </view>
    </view>

    <!-- 3. Scrollable Content Area -->
    <scroll-view
      scroll-y
      class="flex-1 min-h-0 w-full"
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="isRefreshing"
      @refresherrefresh="handlePullDownRefresh"
    >
      <!-- 刷新提示 -->
      <view v-if="isRefreshing" class="px-5 py-3 text-center">
        <text class="text-xs text-slate-400">正在刷新订单...</text>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading && orders.length === 0" class="flex flex-col items-center justify-center py-20">
        <view class="w-10 h-10 border-4 border-slate-200 border-t-slate-400 rounded-full animate-spin mb-3"></view>
        <text class="text-sm text-slate-400 font-bold">加载订单中...</text>
      </view>

      <!-- 订单列表 -->
      <view v-else class="px-5 py-4 space-y-3">
        <view
          v-for="order in filteredOrders"
          :key="order._id"
          class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <!-- 订单头部 -->
          <view class="px-4 pt-4 pb-3 flex items-start justify-between">
            <view class="flex items-start gap-2 min-w-0 flex-1">
              <view class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <text class="text-lg">{{ order.avatar ? '' : '👤' }}</text>
              </view>
              <view class="min-w-0 flex-1">
                <text class="text-sm font-bold text-slate-900 block truncate">{{ order.username || '未知客户' }}</text>
                <text class="text-[10px] text-slate-400 block mt-0.5">
                  #{{ formatOrderDisplayNo(order) }} · {{ formatDate(order.created_at) }} · {{ order.items?.length || 0 }} 项
                </text>
              </view>
            </view>
            <!-- 右侧留空，订单级状态与具体商品状态已在 Tab 栏和商品行体现，避免重复 -->
          </view>

          <!-- 商品列表 -->
          <view class="mx-4 mb-3 rounded-xl border border-slate-100 overflow-hidden">
            <view
              v-for="(item, idx) in order.items"
              :key="'item-' + idx"
              class="flex items-center gap-2 px-3 py-2.5"
              :class="itemRowTone(order, item)"
              :style="idx < order.items.length - 1 ? 'border-bottom: 1px solid #f1f5f9;' : ''"
            >
              <view class="shrink-0 text-base">{{ item.icon || '💊' }}</view>
              <view class="flex-1 min-w-0">
                <text class="text-sm font-semibold text-slate-800 block truncate">{{ item.name }}</text>
                <text class="text-[10px] text-slate-500 block mt-0.5">{{ item.quantity || 1 }} {{ item.unit || '瓶' }}</text>
              </view>
              <text class="text-[9px] px-2 py-1 rounded-full font-bold shrink-0" :class="itemStatusBadgeClass(Number(item.status))">
                {{ itemStatusText(Number(item.status)) }}
              </text>
              <!-- 已发货的项显示"完成"按钮 -->
              <view
                v-if="Number(item.status) === 1 && Number(order.status) !== 2"
                class="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold mp-pressable active:scale-95 transition-all"
                @click="completeItem(order, idx)"
              >
                完成
              </view>
              <!-- 待发货项显示"发货"按钮 -->
              <view
                v-else-if="Number(item.status) === 0 && (Number(order.status) === 0 || Number(order.status) === 1)"
                class="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[10px] font-bold mp-pressable active:scale-95 transition-all"
                @click="openShipDialog(order, idx)"
              >
                发货
              </view>
            </view>
          </view>

          <!-- 订单底部操作区 -->
          <view v-if="canCancelPendingOrder(order)" class="px-4 py-3 bg-slate-50/50 flex justify-end">
            <view
              class="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-rose-200 text-rose-600 bg-white mp-pressable active:scale-95 transition-all"
              @click="cancelWholeOrder(order)"
            >
              {{ cancelOrderButtonLabel(order) }}
            </view>
          </view>

          <view v-if="Number(order.status) === 2" class="px-4 py-3 bg-emerald-50/50 flex items-center gap-1.5">
            <text class="text-base">✅</text>
            <text class="text-xs text-emerald-600 font-bold">订单已完成</text>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="!loading && filteredOrders.length === 0" class="flex flex-col items-center justify-center py-16">
          <view class="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <text class="text-4xl">📭</text>
          </view>
          <text class="text-sm text-slate-500 font-bold">暂无{{ getTabLabel() }}订单</text>
          <text class="text-xs text-slate-300 mt-1">下拉刷新试试</text>
        </view>

        <!-- 底部加载提示 -->
        <view v-if="filteredOrders.length > 0" class="py-6 text-center">
          <text class="text-[11px] text-slate-300">- 到底啦 -</text>
        </view>
      </view>
    </scroll-view>

    <!-- 发货信息填写弹窗 -->
    <view v-if="showShipDialog" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <view class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showShipDialog = false"></view>
      <view class="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-200 max-h-[85vh] overflow-y-auto" @click.stop>
        <view class="flex items-center justify-between mb-5">
          <view>
            <text class="text-lg font-black text-slate-900 block">确认发货</text>
            <text class="text-[11px] text-slate-400 block mt-0.5">{{ shipDialogSummary }}</text>
          </view>
          <view class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg mp-pressable" @click="showShipDialog = false">×</view>
        </view>

        <view class="space-y-4">
          <view>
            <text class="text-xs font-bold text-slate-700 block mb-2">快递单号 (可选)</text>
            <input
              v-model="shippingInfo.trackingNo"
              placeholder="请输入快递单号"
              class="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm"
              @click.stop
            />
          </view>

          <view>
            <text class="text-xs font-bold text-slate-700 block mb-2">发货照片 (可选)</text>
            <view
              class="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center overflow-hidden mp-pressable"
              @click.stop="chooseShippingImage"
            >
              <image v-if="shippingInfo.previewUrl" :src="shippingInfo.previewUrl" mode="aspectFill" class="w-full h-full" />
              <template v-else>
                <text class="text-3xl mb-1">📸</text>
                <text class="text-[11px] text-slate-400">点击上传发货照片/快递单</text>
              </template>
            </view>
          </view>
        </view>

        <view class="flex gap-3 mt-6">
          <view class="flex-1 py-3.5 rounded-xl bg-slate-100 text-center mp-pressable active:bg-slate-200 transition-colors" @click="showShipDialog = false">
            <text class="text-sm font-bold text-slate-600">取消</text>
          </view>
          <view
            class="flex-[2] py-3.5 rounded-xl bg-amber-500 text-center mp-pressable active:bg-amber-600 transition-colors shadow-lg shadow-amber-200"
            :class="confirmingShip ? 'opacity-70' : ''"
            @click="confirmShip"
          >
            <text class="text-sm font-bold text-white">{{ confirmingShip ? '发货中...' : '确认发货' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getUserInfo } from '@/utils/storage'
import { callCloud } from '@/utils/cloud'
import { formatOrderDisplayNo } from '@/utils/orderDisplay'

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight || 44)
const activeTab = ref<'pending' | 'shipped' | 'completed'>('pending')
const orders = ref<any[]>([])
const loading = ref(false)
const isRefreshing = ref(false)

const tabs = [
  { key: 'pending' as const, label: '待发货' },
  { key: 'shipped' as const, label: '已发货' },
  { key: 'completed' as const, label: '已完成' }
]

const pendingCount = computed(() => {
  const count = orders.value.filter(o => (o.items || []).some((i: any) => Number(i.status) === 0)).length
  return count
})

const filteredOrders = computed(() => {
  return orders.value.filter(o => {
    const items = o.items || []
    if (activeTab.value === 'pending') {
      return items.some((item: any) => Number(item.status) === 0)
    }
    if (activeTab.value === 'shipped') {
      const hasPending = items.some((item: any) => Number(item.status) === 0)
      const hasShipped = items.some((item: any) => Number(item.status) === 1)
      return !hasPending && hasShipped
    }
    if (activeTab.value === 'completed') {
      return items.length > 0 && items.every((item: any) => Number(item.status) === 2)
    }
    return false
  }).sort((a, b) => (b.updated_at || b.created_at || 0) - (a.updated_at || a.created_at || 0))
})

const switchTab = (tab: 'pending' | 'shipped' | 'completed') => {
  activeTab.value = tab
}

const formatDate = (timestamp: number) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getStatusText = (status: number) => {
  const map: Record<number, string> = { 0: '待发货', 1: '已发货', 2: '已完成', 3: '已取消' }
  return map[status] || '未知'
}

const getStatusClass = (status: number) => {
  const map: Record<number, string> = {
    0: 'bg-amber-100 text-amber-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-emerald-100 text-emerald-700',
    3: 'bg-slate-100 text-slate-500'
  }
  return map[status] || 'bg-slate-100 text-slate-500'
}

const itemStatusText = (status: number) => {
  const map: Record<number, string> = { 0: '待发货', 1: '已发货', 2: '已完成', 3: '已取消' }
  return map[status] ?? '—'
}

const itemStatusBadgeClass = (status: number) => {
  const map: Record<number, string> = {
    0: 'bg-amber-100 text-amber-700',
    1: 'bg-blue-100 text-blue-700',
    2: 'bg-emerald-100 text-emerald-700',
    3: 'bg-slate-200 text-slate-600'
  }
  return map[status] ?? 'bg-slate-100 text-slate-600'
}

const itemRowTone = (order: any, item: any) => {
  if (Number(item.status) === 0 && (Number(order.status) === 0 || Number(order.status) === 1)) return 'bg-amber-50/60'
  if (Number(order.status) === 1 && Number(item.status) === 1) return 'bg-blue-50/50'
  return 'bg-white'
}

const canCancelPendingOrder = (order: any) => {
  if (!order?.items?.length) return false
  if (order.status === 2 || order.status === 3) return false
  return order.items.some((it: any) => Number(it.status) === 0)
}

const cancelOrderButtonLabel = (order: any) => {
  if (order.status === 1) return '取消未发货'
  return '取消订单'
}

// ===== 发货弹窗相关 =====
const showShipDialog = ref(false)
const confirmingShip = ref(false)
const shippingInfo = ref({
  orderId: '',
  itemIndices: [] as number[],
  itemName: '',
  trackingNo: '',
  trackingImage: '',
  previewUrl: ''
})

const shipDialogSummary = computed(() => {
  return shippingInfo.value.itemName || '为订单发货'
})

const openShipDialog = (order: any, itemIndex: number) => {
  const item = order.items[itemIndex]
  shippingInfo.value = {
    orderId: order._id,
    itemIndices: [itemIndex],
    itemName: item?.name || '商品',
    trackingNo: '',
    trackingImage: '',
    previewUrl: ''
  }
  showShipDialog.value = true
}

const chooseShippingImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: async (res) => {
      const tempPath = res.tempFilePaths[0]
      uni.showLoading({ title: '上传中...' })
      try {
        const uploadRes = await uniCloud.uploadFile({
          filePath: tempPath,
          cloudPath: `tracking/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`
        })
        shippingInfo.value.trackingImage = (uploadRes as any).fileID
        shippingInfo.value.previewUrl = tempPath
      } catch (err) {
        uni.showToast({ title: '上传失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

const confirmShip = async () => {
  if (confirmingShip.value) return
  confirmingShip.value = true
  uni.showLoading({ title: '发货中...' })
  try {
    const userInfo = getUserInfo()
    const userId = userInfo?._id || userInfo?.uid || userInfo?.id
    if (!userId) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }
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
    })
    if (res.code === 0 || res.ok) {
      uni.showToast({ title: '发货成功', icon: 'success' })
      showShipDialog.value = false
      await fetchOrders()
    } else {
      uni.showToast({ title: res.msg || '发货失败', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: '发货失败', icon: 'none' })
  } finally {
    confirmingShip.value = false
    uni.hideLoading()
  }
}

// ===== 标记完成 =====
const completeItem = async (order: any, itemIndex: number) => {
  try {
    uni.showLoading({ title: '处理中...' })
    const userInfo = getUserInfo()
    const userId = userInfo?._id || userInfo?.uid || userInfo?.id
    if (!userId) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    const res = await callCloud('client-api', {
      action: 'completeOrder',
      payload: {
        orderId: order._id,
        itemIndices: [itemIndex],
        userId
      }
    })
    if (res.code === 0 || res.ok) {
      uni.showToast({ title: '已完成', icon: 'success' })
      await fetchOrders()
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

// ===== 取消订单 =====
const cancelWholeOrder = (order: any) => {
  const userInfo = getUserInfo()
  const userId = userInfo?._id || userInfo?.uid || userInfo?.id
  if (!userId) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.showModal({
    title: '取消订单',
    content: '将取消该订单中所有「待发货」商品，客户会收到通知。确定吗？',
    confirmColor: '#e11d48',
    success: async (modalRes: any) => {
      if (!modalRes.confirm) return
      uni.showLoading({ title: '处理中...' })
      try {
        const res = await callCloud('client-api', {
          action: 'cancelOrder',
          payload: { orderId: order._id, userId }
        })
        if (res.code === 0 || res.ok) {
          uni.showToast({ title: '已取消', icon: 'success' })
          await fetchOrders()
        } else {
          uni.showToast({ title: res.msg || '取消失败', icon: 'none' })
        }
      } catch {
        uni.showToast({ title: '取消失败', icon: 'none' })
      } finally {
        uni.hideLoading()
      }
    }
  })
}

const getTabLabel = () => {
  const map: Record<string, string> = { pending: '待发货', shipped: '已发货', completed: '已完成' }
  return map[activeTab.value] || ''
}

// ===== 获取订单 =====
const fetchOrders = async () => {
  try {
    const userInfo = getUserInfo()
    const userId = userInfo?._id || userInfo?.uid || userInfo?.id
    if (!userId) {
      return
    }
    const res = await callCloud('client-api', {
      action: 'getAdminOrders',
      payload: { userId }
    })
    if (res.code === 0 || res.ok) {
      orders.value = res.data || []
    }
  } catch (error) {
    console.error('Failed to fetch orders:', error)
  }
}

const handlePullDownRefresh = async () => {
  isRefreshing.value = true
  try {
    await fetchOrders()
  } finally {
    isRefreshing.value = false
    uni.stopPullDownRefresh()
  }
}

const loadMore = () => {
  // 目前是全量加载，后续可按需扩展分页
}

onShow(() => {
  if (orders.value.length === 0) {
    loading.value = true
    fetchOrders().finally(() => {
      loading.value = false
    })
  } else {
    fetchOrders()
  }
})

onPullDownRefresh(() => {
  handlePullDownRefresh()
})
</script>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

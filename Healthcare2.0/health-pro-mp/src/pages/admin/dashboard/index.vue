<template>
  <view>
    <!-- #ifdef H5 -->
    <DesktopDashboard v-if="isDesktop" />
    <view v-else class="flex items-center justify-center h-screen">
      <text class="text-gray-500">Loading desktop dashboard...</text>
    </view>
    <!-- #endif -->
    
    <!-- Mobile Dashboard (Nutritionist Mini Program) -->
    <view v-if="!isDesktop" class="mp-page-shell h-screen flex flex-col overflow-hidden bg-transparent">
      
      <!-- 1. Top Fixed Bar (Greeting & Bell) -->
      <view class="bg-slate-900 px-5 pb-16 flex-none sticky top-0 z-40 shadow-lg shadow-slate-200/50"
        :style="{ paddingTop: `calc(${statusBarHeight}px + 12px)` }">
        <view class="flex justify-between items-center h-10">
          <view class="flex items-center gap-3">
            <view>
              <text class="text-xl font-black text-white block tracking-tight">早安，{{ advisorName }}</text>
              <text class="text-xs text-slate-400 font-medium mt-1 block">{{ currentDate }} · {{ dashboardLastUpdatedText }}</text>
            </view>
          </view>
          <!-- 【新增】通知组件 -->
          <view class="flex items-center gap-2">
            <!-- #ifndef H5 -->
            <AdvisorNotification ref="notificationRef" />
            <!-- #endif -->
          </view>
        </view>
      </view>

      <!-- 2. Metrics Tabs (Clickable, not Swiper) -->
      <!-- Negative margin to pull it up into the header area for a "card" effect -->
      <view class="px-5 -mt-10 flex-none z-50 relative">
        <view class="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-2 flex justify-between items-center">
          <!-- Inactive -->
          <view class="flex-1 flex flex-col items-center py-3 rounded-xl transition-all mp-pressable" 
                :class="activeTab === 0 ? 'bg-slate-50 shadow-inner' : ''"
                @click="activeTab = 0">
            <text class="text-[10px] font-bold uppercase mb-1" :class="activeTab === 0 ? 'text-slate-600' : 'text-slate-400'">未打卡</text>
            <view class="flex items-baseline">
              <text class="text-2xl font-black text-slate-900">{{ stats.inactive }}</text>
              <text class="text-[10px] text-slate-400 ml-0.5">位</text>
            </view>
            <view class="w-1 h-1 rounded-full mt-1" :class="activeTab === 0 ? 'bg-slate-900' : 'bg-transparent'"></view>
          </view>
          
          <!-- Low Stock -->
          <view class="flex-1 flex flex-col items-center py-3 border-l border-r border-slate-50 transition-all mp-pressable"
                :class="activeTab === 1 ? 'bg-amber-50/50 shadow-inner' : ''"
                @click="activeTab = 1">
            <text class="text-[10px] font-bold uppercase mb-1" :class="activeTab === 1 ? 'text-amber-600' : 'text-slate-400'">库存告急</text>
            <view class="flex items-baseline">
              <text class="text-2xl font-black text-amber-500">{{ stats.lowStock }}</text>
              <text class="text-[10px] text-slate-400 ml-0.5">位</text>
            </view>
            <view class="w-1 h-1 rounded-full mt-1" :class="activeTab === 1 ? 'bg-amber-500' : 'bg-transparent'"></view>
          </view>
          
          <!-- Low WROM -->
          <view class="flex-1 flex flex-col items-center py-3 rounded-xl transition-all mp-pressable"
                :class="activeTab === 2 ? 'bg-rose-50/50 shadow-inner' : ''"
                @click="activeTab = 2">
            <text class="text-[10px] font-bold uppercase mb-1" :class="activeTab === 2 ? 'text-rose-600' : 'text-slate-400'">体感波动</text>
            <view class="flex items-baseline">
              <text class="text-2xl font-black text-rose-500">{{ stats.lowScore }}</text>
              <text class="text-[10px] text-slate-400 ml-0.5">位</text>
            </view>
            <view class="w-1 h-1 rounded-full mt-1" :class="activeTab === 2 ? 'bg-rose-500' : 'bg-transparent'"></view>
          </view>
        </view>
      </view>

      <!-- 3. List Title -->
      <view class="px-5 mt-6 mb-2 flex justify-between items-end flex-none">
        <text class="text-sm font-black text-slate-900">
          {{ activeTab === 0 ? '未打卡名单 (今日)' : (activeTab === 1 ? '库存告急 (Top 5)' : '需干预名单 (WROM)') }}
        </text>
        <text class="text-[10px] text-slate-400">共 {{ activeList.length }} 人</text>
      </view>
      
      <!-- 4. Scrollable List Area -->
      <scroll-view scroll-y class="flex-1 min-h-0 w-full">
        <view class="space-y-3 pb-4 px-5">
          <!-- List Item Template -->
          <view v-for="user in activeList" :key="user.id" 
                class="bg-white p-4 rounded-2xl shadow-sm border border-blue-50 flex items-center justify-between mp-pressable"
                @click="openClientDrawer(user, activeTab)"
          >
            <!-- Left Info -->
            <view class="flex items-center gap-3">
              <view class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs"
                    :class="activeTab === 2 ? 'bg-rose-50 text-rose-500' : (activeTab === 1 ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-500')">
                {{ user.name[0] }}
              </view>
              <view>
                <text class="text-sm font-bold text-slate-800 block">{{ user.name }}</text>
                <text class="text-[10px] text-slate-400 block mt-0.5">
                  {{ activeTab === 0 ? (user.reason || '今日未完成打卡') : (activeTab === 1 ? (user.productName && user.productName !== '库存告急' ? '库存告急: ' + user.productName : '库存告急') : user.reason) }}
                </text>
              </view>
            </view>
            
            <!-- Right Status -->
            <view class="flex flex-col items-end gap-1">
              <view v-if="activeTab === 1" class="w-full h-1.5 bg-slate-100 rounded-full w-12 overflow-hidden">
                 <view class="h-full bg-amber-400 rounded-full" :style="{ width: Math.min(((user.pendingDays || 1) / 7) * 100, 100) + '%' }"></view>
              </view>
              <view v-else class="px-2 py-0.5 rounded text-[10px] font-bold"
                    :class="activeTab === 2 ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'">
                {{ activeTab === 0 ? (user.badge || '待打卡') : (activeTab === 1 ? '待处理' : '↘ ' + user.trend) }}
              </view>
            </view>
          </view>
          
          <!-- Empty State Spacer -->
          <view class="h-4"></view>
        </view>
      </scroll-view>

      <!-- 5. Actions Area (Fixed Bottom of Content) -->
      <view class="px-5 py-4 bg-white/50 backdrop-blur-sm border-t border-blue-100 flex gap-3 flex-none mb-[calc(env(safe-area-inset-bottom)+64px)]">
        <view class="flex-1 bg-white p-3 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center gap-2 mp-pressable" @click="goToOrders">
           <text class="text-lg">📦</text>
           <view class="flex flex-col items-start">
             <text class="text-xs font-bold text-slate-800">库存告急</text>
             <text class="text-[9px] text-slate-400">{{ stats.lowStock }}个待处理</text>
           </view>
        </view>
        <view class="flex-1 bg-slate-800 p-3 rounded-2xl shadow-lg shadow-slate-200 flex items-center justify-center gap-2 mp-pressable" @click="navigateToAdd">
           <text class="text-lg text-white">+</text>
           <view class="flex flex-col items-start">
             <text class="text-xs font-bold text-white">添加客户</text>
             <text class="text-[9px] text-slate-400">快速录入</text>
           </view>
        </view>
      </view>

    </view>

    <!-- Bottom Sheet -->
    <view v-if="showDrawer" class="fixed inset-0 z-[200] flex items-end justify-center">
      <view class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeDrawer"></view>
      <view class="relative w-full max-w-lg bg-white shadow-2xl flex flex-col transform transition-transform duration-300 rounded-t-[32px] overflow-hidden max-h-[85vh]" :class="drawerAnimClass">
         <!-- Drag handle -->
         <view class="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full z-20"></view>
         <view class="px-6 pt-8 pb-4 border-b border-slate-50 flex justify-between items-center bg-white z-10">
           <view class="flex items-center gap-3">
             <view class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center active:bg-slate-100 transition-colors mp-pressable" @click="closeDrawer">
               <text class="text-slate-500 text-lg">↓</text>
             </view>
             <view>
               <text class="text-xl font-black text-slate-900 block">{{ currentClient?.name }}</text>
               <view class="flex items-center gap-2 mt-1">
                 <view class="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded">WROM {{ currentClient?.wrom || 60 }}</view>
               </view>
             </view>
           </view>
          <view class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mp-pressable" @click="closeDrawer">
             <text class="text-lg">×</text>
           </view>
         </view>
         <scroll-view scroll-y class="flex-1 bg-slate-50" scroll-with-animation>
           <view class="p-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
             <view class="flex bg-white rounded-2xl p-1 border border-slate-100 mb-4">
               <view
                class="flex-1 py-2 text-center text-xs font-bold rounded-xl mp-pressable"
                 :class="drawerSection === 'checkin' ? 'bg-slate-900 text-white' : 'text-slate-500'"
                 @click="drawerSection = 'checkin'"
               >
                 打卡
               </view>
               <view
                class="flex-1 py-2 text-center text-xs font-bold rounded-xl mp-pressable"
                 :class="drawerSection === 'inventory' ? 'bg-slate-900 text-white' : 'text-slate-500'"
                 @click="drawerSection = 'inventory'"
               >
                 库存
               </view>
               <view
                class="flex-1 py-2 text-center text-xs font-bold rounded-xl mp-pressable"
                 :class="drawerSection === 'symptom' ? 'bg-slate-900 text-white' : 'text-slate-500'"
                 @click="drawerSection = 'symptom'"
               >
                 体感
               </view>
             </view>
             <view class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
               <view class="flex justify-between items-center mb-4">
                <text class="text-xs font-bold text-slate-900">{{ drawerSectionTitle }}</text>
                <text class="text-[10px] text-slate-400">{{ drawerSectionDateText }}</text>
               </view>
              <view v-if="drawerLoading" class="h-24 flex items-center justify-center text-xs text-slate-400">加载中...</view>

              <!-- 打卡Tab：显示当日进度 -->
              <view v-else-if="drawerSection === 'checkin' && currentClientPlan?.sectionStatus" class="space-y-3">
                <view class="flex flex-wrap gap-2">
                  <!-- 饮水状态 -->
                  <view class="flex items-center gap-1 px-2 py-1.5 rounded-lg" :class="currentClientPlan.sectionStatus.water?.completed ? 'bg-emerald-50' : 'bg-orange-50'">
                    <text class="text-[10px] font-medium" :class="currentClientPlan.sectionStatus.water?.completed ? 'text-emerald-600' : 'text-orange-600'">
                      {{ currentClientPlan.sectionStatus.water?.completed ? '✓ 饮水完成' : `💧 饮水${currentClientPlan.sectionStatus.water?.current || 0}/${currentClientPlan.sectionStatus.water?.target || 2000}ml` }}
                    </text>
                  </view>

                  <!-- 健康指标状态 -->
                  <view class="flex items-center gap-1 px-2 py-1.5 rounded-lg" :class="currentClientPlan.sectionStatus.metrics?.completed ? 'bg-emerald-50' : 'bg-orange-50'">
                    <text class="text-[10px] font-medium" :class="currentClientPlan.sectionStatus.metrics?.completed ? 'text-emerald-600' : 'text-orange-600'">
                      {{ currentClientPlan.sectionStatus.metrics?.completed ? '✓ 指标完成' : '📊 指标待填' }}
                    </text>
                  </view>

                  <!-- 体感状态 -->
                  <view class="flex items-center gap-1 px-2 py-1.5 rounded-lg" :class="currentClientPlan.sectionStatus.symptoms?.completed ? 'bg-emerald-50' : 'bg-orange-50'">
                    <text class="text-[10px] font-medium" :class="currentClientPlan.sectionStatus.symptoms?.completed ? 'text-emerald-600' : 'text-orange-600'">
                      {{ currentClientPlan.sectionStatus.symptoms?.completed ? `😊 体感${Number(currentClientPlan.sectionStatus.symptoms?.score || 0).toFixed(1)}分` : '😐 体感待填' }}
                    </text>
                  </view>
                </view>

                <!-- 时段任务状态 -->
                <view v-if="currentClientPlan.sectionStatus.tasks" class="space-y-2 mt-3 pt-3 border-t border-slate-100">
                  <text class="text-[10px] font-bold text-slate-600 mb-2">时段任务</text>
                  <view v-for="(status, slot) in currentClientPlan.sectionStatus.tasks" :key="slot" v-show="status?.items?.length > 0" class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                    <text class="text-xs text-slate-700">{{ getSlotLabel(slot) }}</text>
                    <text class="text-[10px] font-bold" :class="status?.completed ? 'text-emerald-500' : 'text-slate-400'">
                      {{ status?.items?.filter((t: any) => t.completed).length || 0 }}/{{ status?.items?.length || 0 }} 项{{ status?.completed ? ' ✓' : '' }}
                    </text>
                  </view>
                </view>
              </view>

              <!-- 库存Tab：显示缺货产品 -->
              <view v-else-if="drawerSection === 'inventory' && currentClientInventory.length > 0" class="space-y-2">
                <view v-for="(item, idx) in currentClientInventory" :key="idx" class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                  <view class="flex-1">
                    <text class="text-xs text-slate-700 font-medium">{{ idx + 1 }}. {{ item.item_name || item.product_name || item.name || '未命名产品' }}</text>
                  </view>
                  <view class="flex items-center gap-1 shrink-0">
                    <text class="text-[10px] text-slate-400">剩{{ item.days_remaining || 0 }}天</text>
                    <text class="px-1 py-0.5 rounded text-[9px] font-bold leading-none" :class="Number(item.stock || 0) <= 0 ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'">余{{ item.stock || 0 }}</text>
                  </view>
                </view>
                <view class="mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-400 italic">
                  *可用天数基于每日用量计算
                </view>
              </view>

              <!-- 体感Tab：显示4项得分 -->
              <view v-else-if="drawerSection === 'symptom' && currentClientSymptomPlan?.symptoms?.length" class="space-y-2">
                <view v-for="(symptom, idx) in currentClientSymptomPlan.symptoms" :key="idx" class="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                  <text class="text-xs text-slate-700">{{ symptom.label || symptom.name || `体感${idx + 1}` }}</text>
                  <view class="flex items-center gap-1">
                    <text class="text-sm font-bold" :class="Number(symptom.value || 0) <= 2 ? 'text-red-500' : 'text-slate-700'">
                      {{ symptom.value !== undefined ? symptom.value : '-' }}
                    </text>
                    <text class="text-[10px]" :class="Number(symptom.value || 0) <= 2 ? 'text-red-400' : 'text-slate-400'">/10</text>
                  </view>
                </view>
                <view v-if="currentClientSymptomPlan?.score" class="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <text class="text-xs font-bold text-slate-600">平均分</text>
                  <text class="text-sm font-bold" :class="Number(currentClientSymptomPlan.score) <= 3 ? 'text-red-500' : 'text-emerald-500'">
                    {{ Number(currentClientSymptomPlan.score).toFixed(1) }} 分
                  </text>
                </view>
              </view>

              <!-- 空状态 -->
              <view v-else class="h-24 flex items-center justify-center text-xs text-slate-400">{{ drawerSectionEmptyText }}</view>
             </view>
           </view>
         </scroll-view>
      </view>
    </view>

    <AdminTabBar :current="0" v-if="!isDesktop" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, type Ref, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { callCloud, getAuthToken } from '@/utils/cloud';
import { getUserInfo } from '@/utils/storage';
// #ifdef H5
import DesktopDashboard from './components/DesktopDashboard.vue'
// #endif
import AdminTabBar from '@/components/AdminTabBar.vue'
// #ifndef H5
import AdvisorNotification from '@/components/AdvisorNotification.vue'
// #endif

interface DashboardUser {
  id: number | string;
  name: string;
  wrom: number;
  lastCheckIn?: string;
  tag?: string;
  badge?: string;
  daysLeft?: number;
  productName?: string;
  emptyDate?: string;
  trend?: string;
  reason?: string;
  trendHistory?: number[];
  pendingDays?: number;
  rawData?: any;
}

const isDesktop = ref(false)
// #ifdef H5
isDesktop.value = true
// #endif

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight || 44);

// Stats
const stats = ref({
  inactive: 0,
  lowStock: 0,
  lowScore: 0
})

const currentDate = computed(() => {
  const date = new Date()
  return `${date.getMonth() + 1}月${date.getDate()}日`
})

const advisorName = ref('营养顾问')
const syncAdvisorName = () => {
  // H5 端优先从 localStorage 读取
  const userInfo = getUserInfo();
  const username = userInfo?.username || userInfo?.nickname || userInfo?.phone;
  advisorName.value = username || '营养顾问';
};
syncAdvisorName()
onShow(() => {
  syncAdvisorName()
  fetchDashboardData()
})

// Tab Logic
const activeTab = ref(0)
const loading = ref(false)
const hasShownResourceExhausted = ref(false)
const DASHBOARD_CACHE_TTL = 60 * 1000
const DASHBOARD_CACHE_KEY_PREFIX = 'admin_dashboard_cache_'
const dashboardCache = ref<{ timestamp: number; data: any; syncVersion?: string; latestUpdatedAt?: number } | null>(null)

const inactiveUsers: Ref<DashboardUser[]> = ref([])

const lowStockUsers: Ref<DashboardUser[]> = ref([])

const lowScoreUsers: Ref<DashboardUser[]> = ref([])

const activeList = computed(() => {
  if (activeTab.value === 0) return inactiveUsers.value
  if (activeTab.value === 1) return lowStockUsers.value
  return lowScoreUsers.value
})

const getDisplayName = (user: any) => {
  const phone = user?.phone || ''
  return user?.username || user?.nickname || (phone ? `用户${phone.slice(-4)}` : '未命名')
}

const applyAdminData = (adminData: any) => {
  console.log('applyAdminData received:', adminData);
  const attention = adminData?.attention || []
  const refills = adminData?.refills || []
  const pendingCheckIns = adminData?.pendingCheckIns || []
  const summary = adminData?.summary || {}
  console.log('Arrays:', { attention: attention.length, refills: refills.length, pendingCheckIns: pendingCheckIns.length, summary });
  inactiveUsers.value = pendingCheckIns.map((client: any) => {
    const templates = client.assigned_templates || []
    const activeCount = templates.filter((t: any) => !t.status || t.status === 'active').length
    return {
      id: client._id,
      name: client.username || '客户',
      wrom: 0,
      reason: activeCount > 0 ? `${activeCount}个方案执行中` : '无执行方案',
      badge: '未打卡',
      rawData: client
    }
  })
  lowScoreUsers.value = attention.map((client: any) => ({
    id: client._id,
    name: getDisplayName(client),
    wrom: Number(client.wrom_score) || 0,
    trend: String(client.wrom_trend || '0'),
    reason: client.wrom_reason || '需要关注健康趋势',
    trendHistory: [Number(client.wrom_score) || 0]
  }))
  lowStockUsers.value = (adminData?.lowStockClients || []).map((client: any) => ({
    id: client._id,
    name: client.username || client.nickname || '客户',
    daysLeft: 0,
    pendingDays: 0,
    productName: (client.low_items || [])[0]?.product_name || '库存告急',
    emptyDate: '',
    wrom: 0,
    rawData: client
  }))
  stats.value = {
    inactive: Number(summary.missedCheckIns ?? inactiveUsers.value.length),
    lowStock: Number(adminData?.lowStockCount ?? lowStockUsers.value.length),
    lowScore: Number(summary.lowScore ?? lowScoreUsers.value.length)
  }
}

const formatDateTime = (timestamp: number) => {
  if (!timestamp) return '未同步'
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  const hh = `${date.getHours()}`.padStart(2, '0')
  const mm = `${date.getMinutes()}`.padStart(2, '0')
  const ss = `${date.getSeconds()}`.padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

const dashboardLastUpdatedText = computed(() => {
  const timestamp = Number(dashboardCache.value?.timestamp || 0)
  if (!timestamp) return '未同步'
  return `更新于 ${formatDateTime(timestamp)}`
})

const getDashboardCacheKey = (userId: string) => `${DASHBOARD_CACHE_KEY_PREFIX}${userId || 'anonymous'}`

const readDashboardCache = (userId: string) => {
  if (!userId) return null
  const cache = uni.getStorageSync(getDashboardCacheKey(userId))
  if (!cache || typeof cache !== 'object') return null
  const timestamp = Number((cache as any).timestamp || 0)
  const data = (cache as any).data
  const syncVersion = typeof (cache as any).syncVersion === 'string' ? (cache as any).syncVersion : ''
  const latestUpdatedAt = Number((cache as any).latestUpdatedAt || 0)
  if (!timestamp || !data) return null
  return { timestamp, data, syncVersion, latestUpdatedAt }
}

const writeDashboardCache = (userId: string, data: any, syncMeta?: any) => {
  if (!userId) return
  uni.setStorageSync(getDashboardCacheKey(userId), {
    timestamp: Date.now(),
    data: data || {},
    syncVersion: syncMeta?.syncVersion || '',
    latestUpdatedAt: Number(syncMeta?.latestUpdatedAt || 0)
  })
}

const fetchDashboardSyncMeta = async (userId: string) => {
  if (!userId || !getAuthToken()) return null
  const res = await callCloud<any>('client-api', {
    action: 'getClientsSyncMeta',
    payload: { userId }
  })
  if (!res.ok || !res.data) return null
  return {
    syncVersion: String(res.data.syncVersion || ''),
    latestUpdatedAt: Number(res.data.latestUpdatedAt || 0),
    totalClients: Number(res.data.totalClients || 0)
  }
}

const fetchDashboardData = async (force = false) => {
  if (!getAuthToken()) return
  // H5 端优先从 localStorage 读取
  const userInfo = getUserInfo();
  const userId = userInfo?._id || '';
  const memoryCache = dashboardCache.value
  const cached = memoryCache || readDashboardCache(userId)
  if (!memoryCache && cached) {
    dashboardCache.value = cached
  }
  if (cached) {
    applyAdminData(cached.data || {})
  }
  let metaFromServer: any = null
  if (!force && cached && Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL) {
    return
  }
  if (!force && cached) {
    metaFromServer = await fetchDashboardSyncMeta(userId)
    if (metaFromServer && cached.syncVersion && metaFromServer.syncVersion === cached.syncVersion) {
      const touchedCache = {
        ...cached,
        timestamp: Date.now(),
        latestUpdatedAt: metaFromServer.latestUpdatedAt
      }
      dashboardCache.value = touchedCache
      writeDashboardCache(userId, cached.data || {}, metaFromServer)
      return
    }
  }
  loading.value = !cached
  try {
    const adminRes = await callCloud<any>('client-api', {
      action: 'getAdminDashboardData',
      payload: { userId }
    })

    if (adminRes.ok) {
      if (!metaFromServer) {
        metaFromServer = await fetchDashboardSyncMeta(userId)
      }
      dashboardCache.value = {
        timestamp: Date.now(),
        data: adminRes.data || {},
        syncVersion: metaFromServer?.syncVersion || '',
        latestUpdatedAt: Number(metaFromServer?.latestUpdatedAt || 0)
      }
      writeDashboardCache(userId, adminRes.data || {}, metaFromServer)
      applyAdminData(adminRes.data || {})

      // 补全：用 getClients 数据补充无方案的新客户到未打卡列表
      const existingIds = new Set(inactiveUsers.value.map((c: any) => c.id))
      try {
        const allClientsRes = await callCloud<any[]>('client-api', {
          action: 'getClients',
          payload: { userId }
        })
        if (allClientsRes.ok && allClientsRes.data) {
          const extraClients = (allClientsRes.data as any[]).filter((c: any) => {
            if (existingIds.has(c._id)) return false
            const checkin = c.today_checkin || {}
            return checkin.status !== 'completed'
          }).map((c: any) => {
            const templates = c.assigned_templates || []
            const activeCount = templates.filter((t: any) => !t.status || t.status === 'active').length
            return {
              id: c._id,
              name: c.username || c.nickname || '客户',
              wrom: 0,
              reason: activeCount > 0 ? `${activeCount}个方案执行中` : '无执行方案',
              badge: '未打卡',
              rawData: c
            }
          })
          if (extraClients.length > 0) {
            inactiveUsers.value = [...inactiveUsers.value, ...extraClients]
            stats.value = {
              ...stats.value,
              inactive: inactiveUsers.value.length
            }
          }
        }
      } catch (e) {
        console.warn('补全未打卡客户失败:', e)
      }
    }
    if (adminRes.isResourceExhausted) {
      if (!hasShownResourceExhausted.value) {
        hasShownResourceExhausted.value = true
        uni.showModal({
          title: '资源超限',
          content: `${adminRes.msg}\n\n工作台已保留当前可用数据。`,
          showCancel: false
        })
      }
      return
    }
    if (!adminRes.ok) {
      console.error('Dashboard API Error:', adminRes);
      uni.showToast({ title: adminRes.msg || '工作台数据加载失败', icon: 'none', duration: 3000 })
    }
  } catch (err) {
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const navigateToAdd = () => {
  uni.navigateTo({
    url: '/pages/admin/clients/add'
  })
}

const goToOrders = () => {
  activeTab.value = 1
  fetchDashboardData()
  uni.showToast({ title: '已切换到补货订单', icon: 'none' })
}

// Drawer Logic
const showDrawer = ref(false)
const currentClient = ref<any>(null)
const currentClientDetail = ref<any>(null)
const drawerLoading = ref(false)
const drawerAnimClass = ref('translate-y-full')
const drawerSection = ref<'checkin' | 'inventory' | 'symptom'>('checkin')
const currentClientPlan = computed(() => {
  const rawData = currentClient.value?.rawData
  if (rawData?.today_checkin?.sectionStatus) {
    return {
      date: new Date().toISOString().split('T')[0],
      sectionStatus: rawData.today_checkin.sectionStatus
    }
  }
  const plans = currentClientDetail.value?.plans || []
  const today = new Date().toISOString().split('T')[0]
  return plans.find((plan: any) => plan.date === today) || plans[0] || null
})
const currentClientInventory = computed(() => {
  const rawData = currentClient.value?.rawData
  if (rawData?.low_items && Array.isArray(rawData.low_items)) {
    return rawData.low_items
  }
  if (rawData?.inventory_summary?.low_items && Array.isArray(rawData.inventory_summary.low_items)) {
    return rawData.inventory_summary.low_items
  }
  const allInventory = currentClientDetail.value?.inventory || []
  return allInventory.filter((item: any) => {
    const stock = Number(item.stock || 0)
    const threshold = Number(item.low_stock_threshold ?? 7)
    return stock <= threshold || stock === 0
  })
})
const currentClientSymptomPlan = computed(() => {
  const rawData = currentClient.value?.rawData
  if (rawData?.today_checkin?.sectionStatus?.symptoms?.details) {
    return {
      date: new Date().toISOString().split('T')[0],
      symptoms: rawData.today_checkin.sectionStatus.symptoms.details,
      score: rawData.today_checkin.sectionStatus.symptoms.score
    }
  }
  const plans = currentClientDetail.value?.plans || []
  return plans.find((plan: any) => Array.isArray(plan?.symptoms) && plan.symptoms.length > 0) || null
})
const drawerSectionTitle = computed(() => {
  if (drawerSection.value === 'inventory') return '库存状态'
  if (drawerSection.value === 'symptom') return '最近体感'
  return '今日打卡状态'
})
const drawerSectionDateText = computed(() => {
  if (drawerSection.value === 'checkin') return currentClientPlan.value?.date || '无数据'
  if (drawerSection.value === 'symptom') return currentClientSymptomPlan.value?.date || '无数据'
  return ''
})
const drawerSectionEmptyText = computed(() => {
  if (drawerSection.value === 'inventory') {
    const hasAnyInventory = (currentClientDetail.value?.inventory?.length > 0) ||
      currentClient.value?.rawData?.low_items || currentClient.value?.rawData?.inventory_summary
    return hasAnyInventory ? '目前库存充足' : '暂无库存信息'
  }
  if (drawerSection.value === 'symptom') return '如有不适请尽快联系您的顾问'
  return '今日还未打卡'
})

let drawerOpenTimer: any = null;
const openClientDrawer = async (user: any, sourceTab = 0) => {
  currentClient.value = user
  currentClientDetail.value = null
  drawerSection.value = sourceTab === 1 ? 'inventory' : (sourceTab === 2 ? 'symptom' : 'checkin')
  showDrawer.value = true
  if (drawerOpenTimer) clearTimeout(drawerOpenTimer);
  drawerOpenTimer = setTimeout(() => {
    drawerAnimClass.value = 'translate-y-0'
  }, 50)
  drawerLoading.value = true
  try {
    const userInfo = getUserInfo();
    const userId = userInfo ? userInfo._id : '';

    const [detailRes, inventoryRes] = await Promise.all([
      callCloud<any>('client-api', {
        action: 'getClientDetail',
        payload: { clientId: user.id, userId }
      }),
      callCloud<any[]>('client-api', {
        action: 'getInventory',
        payload: { userId: user.id }
      })
    ]);

    if (detailRes.ok) {
      currentClientDetail.value = detailRes.data || {}
    }
    if (inventoryRes.ok && inventoryRes.data) {
      if (!currentClientDetail.value) currentClientDetail.value = {};
      currentClientDetail.value.inventory = inventoryRes.data;
    }

    if (!detailRes.ok && !detailRes.isResourceExhausted) {
      uni.showToast({ title: detailRes.msg || '加载客户详情失败', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
  } finally {
    drawerLoading.value = false
  }
}

let drawerCloseTimer: any = null;
const closeDrawer = () => {
  drawerAnimClass.value = 'translate-y-full'
  if (drawerCloseTimer) clearTimeout(drawerCloseTimer);
  drawerCloseTimer = setTimeout(() => {
    showDrawer.value = false
    currentClient.value = null
    currentClientDetail.value = null
  }, 300)
}

const getSlotLabel = (slot: string) => {
  const slotMap: Record<string, string> = {
    'morning': '早晨',
    'noon': '中午',
    'evening': '晚上',
    'bedtime': '睡前',
    '早': '早晨',
    '中': '中午',
    '晚': '晚上',
    '睡': '睡前'
  }
  return slotMap[slot] || slot
}

onUnmounted(() => {
  if (drawerOpenTimer) clearTimeout(drawerOpenTimer);
  if (drawerCloseTimer) clearTimeout(drawerCloseTimer);
})
</script>

<style>
/* No extra CSS needed */
</style>

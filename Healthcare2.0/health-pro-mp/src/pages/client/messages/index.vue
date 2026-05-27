<template>
  <view class="mp-page-shell min-h-screen bg-transparent pb-32">
    <view class="fixed top-0 left-0 right-0 z-50 bg-emerald-100/80 backdrop-blur-md px-6 pt-12 pb-3 border-b border-emerald-200/50">
      <view class="flex justify-between items-center h-10">
        <view class="flex items-center gap-3">
          <button @click="goHome" class="w-8 h-8 rounded-lg bg-emerald-200/50 border border-emerald-300/30 text-slate-600 text-sm font-bold mp-pressable">⌂</button>
          <h1 class="text-lg font-black text-slate-800">顾问咨询</h1>
        </view>
        <view class="w-8 h-8 bg-emerald-200/50 rounded-lg flex items-center justify-center border border-emerald-300/30">
          <span class="text-sm">💬</span>
        </view>
      </view>
    </view>

    <view class="h-28"></view>

    <view class="px-6">
      <view v-if="loading" class="py-16 text-center text-slate-400 text-sm font-medium">加载中...</view>

      <view v-else class="space-y-4 pb-24">
        <view v-if="notifications.length > 0" class="bg-white rounded-2xl border border-slate-100 p-4">
          <view class="flex items-center justify-between mb-3">
            <p class="text-xs font-black text-slate-700">系统通知</p>
            <span class="text-[10px] text-slate-400">共 {{ notifications.length }} 条</span>
          </view>
          <view class="space-y-2">
            <button
              v-for="item in notifications"
              :key="item._id"
              @click="openNotification(item)"
              class="w-full text-left p-3 rounded-xl border transition-colors"
              :class="item.read_at ? 'bg-slate-50 border-slate-100' : 'bg-emerald-50/60 border-emerald-100'"
            >
              <view class="flex items-center justify-between gap-2">
                <p class="text-xs font-bold text-slate-800 line-clamp-1">{{ item.title || '系统通知' }}</p>
                <span v-if="!item.read_at" class="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              </view>
              <p class="mt-1 text-[11px] text-slate-500 line-clamp-2">{{ item.content || '' }}</p>
              <p class="mt-1 text-[10px] text-slate-400">{{ formatTime(item.created_at) }}</p>
            </button>
          </view>
        </view>

        <view v-if="displayedInteractions.length > 0" class="space-y-4">
          <!-- 按日期分组显示 -->
          <template v-for="(group, dateKey) in groupedInteractions" :key="dateKey">
            <view class="text-center">
              <span class="text-[10px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-bold">{{ getDateLabel(dateKey) }}</span>
            </view>

            <view v-for="log in group" :key="log._id || `${log.created_at}_${log.content}`" class="space-y-2">
              <view class="flex gap-3" :class="{ 'flex-row-reverse': log.sender_role !== 'nutritionist' }">
                <view class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 relative"
                  :class="log.sender_role !== 'nutritionist' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'">
                  {{ log.sender_role !== 'nutritionist' ? (userInitial || '我') : nutritionistInitial }}
                  <!-- 未读消息红点 -->
                  <view v-if="!log.read_at && log.sender_role === 'nutritionist'" class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></view>
                </view>
                <view class="p-3 rounded-2xl shadow-sm text-sm max-w-[80%] border relative"
                  :class="[
                    log.sender_role !== 'nutritionist'
                      ? 'bg-emerald-500 text-white border-emerald-500 rounded-tr-none'
                      : [
                          !log.read_at && log.sender_role === 'nutritionist'
                            ? 'bg-blue-50 text-blue-900 border-blue-200 rounded-tl-none ring-2 ring-blue-100'
                            : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'
                        ]
                  ]">
                  {{ log.content }}
                  <!-- 已读回执 -->
                  <view class="text-[9px] font-bold mt-1 flex items-center gap-1"
                    :class="log.sender_role !== 'nutritionist' ? 'text-emerald-200' : (log.nutritionist_read_at ? 'text-slate-400' : 'text-slate-300')">
                    <template v-if="log.sender_role === 'nutritionist'">
                      {{ log.read_at ? '✓✓ 已读' : '' }}
                    </template>
                    <template v-else>
                      {{ log.nutritionist_read_at ? '✓ 顾问已读' : '○ 发送中...' }}
                    </template>
                  </view>
                </view>
              </view>
            </view>
          </template>
        </view>
      </view>

      <view v-if="!loading && !notifications.length && displayedInteractions.length === 0" class="py-20 text-center pb-24">
        <view class="w-14 h-14 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-3">
          <span class="text-2xl opacity-60">🔔</span>
        </view>
        <p class="text-sm text-slate-400 font-bold">暂无消息与通知</p>
      </view>
    </view>
    
    <!-- 适配底栏高度，输入框上移 -->
    <view class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 p-3 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <view class="flex items-center gap-2">
        <input
          v-model="draftMessage"
          type="text"
          maxlength="300"
          @confirm="sendMessage"
          placeholder="给营养顾问留言..."
          class="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm text-slate-800 placeholder:text-slate-400"
        />
        <button
          class="h-10 px-4 rounded-xl text-xs font-bold text-white transition-colors"
          :class="canSend ? 'bg-emerald-500 mp-pressable' : 'bg-slate-300'"
          @click="sendMessage"
        >
          {{ sending ? '发送中...' : '发送' }}
        </button>
      </view>
    </view>


    <!-- 自定义底部导航栏 -->
    <ClientTabBar :current="2" :unreadCount="(notifications || []).filter(n => !n.read_at).length" />
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ClientTabBar from '@/components/ClientTabBar.vue'
import { onUnmounted } from 'vue'

let refreshTimer: any = null

const loading = ref(false)
const sending = ref(false)
const interactions = ref<any[]>([])
const notifications = ref<any[]>([])
const userInfo = ref<any>({})
const draftMessage = ref('')

const displayedInteractions = computed(() => {
  return [...interactions.value]
    .filter(item => item && item.content)
    .sort((a, b) => Number(a.created_at || 0) - Number(b.created_at || 0))
})

// 【新增】按日期分组消息
const groupedInteractions = computed(() => {
  const groups: Record<string, any[]> = {};

  displayedInteractions.value.forEach(item => {
    const date = new Date(item.created_at || Date.now());
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(item);
  });

  // 按日期倒序排列（最新的在前）
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .reduce((acc: Record<string, any[]>, key) => {
      acc[key] = groups[key];
      return acc;
    }, {});
});

// 【新增】获取日期标签（今天/昨天/具体日期）
const getDateLabel = (dateKey: string) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (dateKey === todayStr) return '今天';
  if (dateKey === yesterdayStr) return '昨天';

  const [year, month, day] = dateKey.split('-');
  return `${month}月${day}日`;
};

const nutritionistInitial = computed(() => {
  const first = displayedInteractions.value.find(item => item.sender_role === 'nutritionist')
  const name = first?.nutritionist_name || '顾问'
  return String(name)[0] || '顾'
})

const userInitial = computed(() => {
  const name = userInfo.value?.username || userInfo.value?.nickname || ''
  return String(name)[0] || ''
})
const canSend = computed(() => draftMessage.value.trim().length > 0 && !sending.value)

const markInteractionsRead = async () => {
  const uid = uni.getStorageSync('userId') || getUserInfo()?._id || ''
  const token = uni.getStorageSync('token') || ''
  if (!uid) return
  const { result } = await uniCloud.callFunction({
    name: 'client-api',
    data: {
      action: 'markMyInteractionsRead',
      payload: { userId: uid, token }
    }
  })
  if (result?.code === 0) {
    const readAt = Number(result?.data?.readAt || Date.now())
    interactions.value = interactions.value.map((item: any) => (
      item?.sender_role === 'nutritionist' ? { ...item, read_at: readAt } : item
    ))
    uni.setStorageSync('clientLastReadMessageAt', readAt)
  }
}

const fetchInteractions = async () => {
  const uid = uni.getStorageSync('userId') || getUserInfo()?._id || ''
  const token = uni.getStorageSync('token') || ''
  if (!uid) {
    interactions.value = []
    return
  }
  loading.value = true
  try {
    const { result } = await uniCloud.callFunction({
      name: 'client-api',
      data: {
        action: 'getMyInteractionLogs',
        payload: { userId: uid, token }
      }
    })
    if (result?.code === 0 && Array.isArray(result.data)) {
      interactions.value = result.data
      try {
        await markInteractionsRead()
      } catch (error) {
        console.error('mark interactions read failed', error)
      }
    } else {
      interactions.value = []
      if (result?.code !== 0 && result?.msg) {
        uni.showToast({ title: result.msg, icon: 'none' })
      }
    }
  } catch (err) {
    console.error('fetch interactions failed', err)
    interactions.value = []
    uni.showToast({ title: '消息加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const fetchNotifications = async () => {
  const uid = uni.getStorageSync('userId') || getUserInfo()?._id || ''
  const token = uni.getStorageSync('token') || ''
  if (!uid) {
    notifications.value = []
    return
  }
  try {
    const { result } = await uniCloud.callFunction({
      name: 'client-api',
      data: {
        action: 'getNotifications',
        payload: { userId: uid, limit: 20, token }
      }
    })
    if (result?.code === 0 && Array.isArray(result.data)) {
      notifications.value = result.data
      return
    }
    notifications.value = []
  } catch (err) {
    console.error('fetch notifications failed', err)
    notifications.value = []
  }
}

const markNotificationRead = async (notificationId: string) => {
  const uid = uni.getStorageSync('userId') || getUserInfo()?._id || ''
  const token = uni.getStorageSync('token') || ''
  if (!uid || !notificationId) return
  const { result } = await uniCloud.callFunction({
    name: 'client-api',
    data: {
      action: 'markNotificationRead',
      payload: { userId: uid, notificationId, token }
    }
  })
  if (result?.code === 0) {
    notifications.value = notifications.value.map((item: any) => (
      item?._id === notificationId ? { ...item, read_at: Date.now() } : item
    ))
  }
}

// 【新增】标记所有通知为已读（用于清除首页红点）
const markAllNotificationsRead = async () => {
  try {
    const uid = uni.getStorageSync('userId') || getUserInfo()?._id || ''
    const token = uni.getStorageSync('token') || ''
    if (!uid) return

    // 调用批量标记已读的API
    const { result } = await uniCloud.callFunction({
      name: 'client-api',
      data: {
        action: 'markAllNotificationsRead',
        payload: { userId: uid, token }
      }
    })

    if (result?.code === 0) {
      // 更新本地状态：将所有通知标记为已读
      notifications.value = notifications.value.map((item: any) => ({
        ...item,
        read_at: item.read_at || Date.now()
      }))
      console.log('✅ 所有通知已标记为已读')
    }
  } catch (error) {
    console.error('标记所有通知已读失败:', error)
  }
}

const openNotification = async (item: any) => {
  if (!item?._id) return
  if (!item.read_at) {
    try {
      await markNotificationRead(String(item._id))
    } catch (error) {
      console.error('mark notification read failed', error)
    }
  }
  const category = String(item?.category || '')
  if (category.includes('order')) {
    uni.redirectTo({ url: '/pages/client/inventory/index' })
  }
}

const sendMessage = async () => {
  if (!canSend.value) return
  const uid = uni.getStorageSync('userId') || getUserInfo()?._id || ''
  const token = uni.getStorageSync('token') || ''
  if (!uid) {
    uni.showToast({ title: '登录状态失效', icon: 'none' })
    return
  }
  sending.value = true
  const content = draftMessage.value.trim()
  try {
    const { result } = await uniCloud.callFunction({
      name: 'client-api',
      data: {
        action: 'addMyInteractionLog',
        payload: {
          userId: uid,
          token,
          content,
          type: 'app'
        }
      }
    })
    if (result?.code !== 0) {
      uni.showToast({ title: result?.msg || '发送失败', icon: 'none' })
      return
    }
    interactions.value.push({
      _id: `temp_${Date.now()}`,
      user_id: uid,
      client_id: uid,
      sender_role: 'client',
      content,
      type: 'app',
      created_at: Date.now()
    })
    draftMessage.value = ''
    uni.showToast({ title: '已发送', icon: 'success' })
  } catch (err) {
    console.error('send message failed', err)
    uni.showToast({ title: '发送失败', icon: 'none' })
  } finally {
    sending.value = false
  }
}

const formatTime = (timestamp?: number) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}

const goHome = () => {
  uni.redirectTo({ url: '/pages/client/home/index' })
}

onShow(() => {
  const info = getUserInfo()
  if (info) userInfo.value = info

  const refresh = () => {
    fetchInteractions()
    fetchNotifications()
  }

  refresh()

  // 【新增】进入消息页面时自动标记所有通知为已读（清除首页红点）
  markAllNotificationsRead()

  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(refresh, 10000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

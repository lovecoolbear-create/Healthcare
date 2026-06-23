<template>
  <view class="advisor-notification">
    <!-- 通知触发按钮 -->
    <view class="notification-trigger" @click="showNotificationDrawer = true">
      <view class="relative">
        <uni-icons type="notification" size="24" color="#333"></uni-icons>
        <view v-if="unreadCount > 0" class="badge">
          <text class="badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
        </view>
      </view>
    </view>

    <!-- 通知抽屉 -->
    <view v-if="showNotificationDrawer" class="fixed inset-0 z-[150] flex justify-end bg-slate-900/40 backdrop-blur-sm transition-opacity" @click.self="showNotificationDrawer = false">
      <view class="bg-[#f5f5f5] w-[320px] h-full shadow-2xl flex flex-col" @click.stop>
        <!-- 头部 -->
        <view class="notification-header">
          <text class="title">消息通知</text>
          <view class="actions">
            <text class="action-btn" @click="markAllAsRead">全部已读</text>
            <text class="action-btn" @click="showSettings = true">设置</text>
          </view>
        </view>

        <!-- 标签切换 -->
        <view class="notification-tabs">
          <view 
            v-for="tab in tabs" 
            :key="tab.key"
            class="tab-item"
            :class="{ active: currentTab === tab.key }"
            @click="currentTab = tab.key"
          >
            <text>{{ tab.label }}</text>
            <view v-if="tab.unread > 0" class="tab-badge">{{ tab.unread }}</view>
          </view>
        </view>

        <!-- 通知列表 -->
        <scroll-view scroll-y class="notification-list" @scrolltolower="loadMore">
          <view v-if="filteredNotifications.length === 0" class="empty-state">
            <uni-icons type="email" size="48" color="#ccc"></uni-icons>
            <text class="empty-text">暂无{{ currentTab === 'all' ? '' : getTabLabel(currentTab) }}通知</text>
          </view>

          <view v-else>
            <view 
              v-for="(item, index) in filteredNotifications" 
              :key="item._id"
              class="notification-item"
              :class="{ unread: !item.isRead }"
              @click="handleNotificationClick(item)"
            >
              <!-- 图标 -->
              <view class="icon-wrapper" :class="item.type">
                <uni-icons :type="getNotificationIcon(item.type)" size="20" color="#fff"></uni-icons>
              </view>

              <!-- 内容 -->
              <view class="content">
                <view class="title-row">
                  <text class="client-name">{{ item.clientName }}</text>
                  <text class="time">{{ formatTime(item.createTime) }}</text>
                </view>
                <text class="message">{{ item.message }}</text>
                
                <!-- 详情按钮 -->
                <view class="actions-row">
                  <text v-if="item.type === 'reminder'" class="action-btn" @click.stop="sendReminder(item)">
                    发送提醒
                  </text>
                  <text class="action-btn" @click.stop="viewClientDetail(item.clientId)">
                    查看详情
                  </text>
                </view>
              </view>

              <!-- 未读标记 -->
              <view v-if="!item.isRead" class="unread-dot"></view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 设置弹窗 -->
    <view v-if="showSettings" class="fixed inset-0 z-[160] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity" @click.self="showSettings = false">
      <view class="bg-white w-full rounded-t-[32px] shadow-2xl flex flex-col max-h-[80vh]" @click.stop>
        <view class="settings-header">
          <text class="title">提醒设置</text>
          <uni-icons type="close" size="20" @click="showSettings = false"></uni-icons>
        </view>

        <scroll-view scroll-y class="settings-list">
          <!-- 实时订阅 -->
          <view class="setting-group">
            <view class="group-title">实时通知</view>
            <view class="setting-item">
              <view class="item-info">
                <text class="label">客户完成板块通知</text>
                <text class="desc">客户完成饮水/打卡/体感时推送</text>
              </view>
              <switch :checked="settings.sectionComplete" @change="updateSetting('sectionComplete', $event)" />
            </view>
          </view>

          <!-- 提醒规则 -->
          <view class="setting-group">
            <view class="group-title">提醒规则</view>
            
            <view class="setting-item">
              <view class="item-info">
                <text class="label">早晨打卡截止提醒</text>
                <text class="desc">10:00 未打卡自动提醒</text>
              </view>
              <switch :checked="settings.morningReminder" @change="updateSetting('morningReminder', $event)" />
            </view>

            <view class="setting-item">
              <view class="item-info">
                <text class="label">中午打卡截止提醒</text>
                <text class="desc">14:00 未打卡自动提醒</text>
              </view>
              <switch :checked="settings.noonReminder" @change="updateSetting('noonReminder', $event)" />
            </view>

            <view class="setting-item">
              <view class="item-info">
                <text class="label">晚上打卡截止提醒</text>
                <text class="desc">20:00 未打卡自动提醒</text>
              </view>
              <switch :checked="settings.eveningReminder" @change="updateSetting('eveningReminder', $event)" />
            </view>

            <view class="setting-item">
              <view class="item-info">
                <text class="label">睡前打卡截止提醒</text>
                <text class="desc">22:00 未打卡自动提醒</text>
              </view>
              <switch :checked="settings.bedtimeReminder" @change="updateSetting('bedtimeReminder', $event)" />
            </view>
          </view>

          <!-- 预警设置 -->
          <view class="setting-group">
            <view class="group-title">健康预警</view>
            <view class="setting-item">
              <view class="item-info">
                <text class="label">低体感分数预警</text>
                <text class="desc">体感评分 ≤ 3 分时通知</text>
              </view>
              <switch :checked="settings.lowSymptomAlert" @change="updateSetting('lowSymptomAlert', $event)" />
            </view>

            <view class="setting-item">
              <view class="item-info">
                <text class="label">未打卡超时预警</text>
                <text class="desc">超过 4 小时未打卡提醒</text>
              </view>
              <switch :checked="settings.missedCheckinAlert" @change="updateSetting('missedCheckinAlert', $event)" />
            </view>
          </view>
        </scroll-view>

        <view class="settings-footer">
          <button class="save-btn" @click="saveSettings">保存设置</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getUserInfo } from '@/utils/storage'
import { callCloud, getAuthToken } from '@/utils/cloud'

// 状态
const showNotificationDrawer = ref(false)
const showSettings = ref(false)
const currentTab = ref('all')
const notifications = ref<any[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)

// 实时订阅实例
let realtimeSub: any = null

// 设置
const settings = ref({
  sectionComplete: true,
  morningReminder: true,
  noonReminder: true,
  eveningReminder: true,
  bedtimeReminder: true,
  lowSymptomAlert: true,
  missedCheckinAlert: true
})

// 标签页
const tabs = computed(() => [
  { key: 'all', label: '全部', unread: notifications.value.filter(n => !n.isRead).length },
  { key: 'section', label: '板块完成', unread: notifications.value.filter(n => !n.isRead && n.type === 'section').length },
  { key: 'reminder', label: '待提醒', unread: notifications.value.filter(n => !n.isRead && n.type === 'reminder').length },
  { key: 'alert', label: '预警', unread: notifications.value.filter(n => !n.isRead && n.type === 'alert').length }
])

// 过滤后的通知
const filteredNotifications = computed(() => {
  if (currentTab.value === 'all') return notifications.value
  return notifications.value.filter(n => n.type === currentTab.value)
})

// 未读数量
const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.isRead).length
})

// 获取标签名称
const getTabLabel = (key: string) => {
  const map: Record<string, string> = {
    section: '板块完成',
    reminder: '待提醒',
    alert: '预警'
  }
  return map[key] || ''
}

// 获取通知图标
const getNotificationIcon = (type: string) => {
  const map: Record<string, string> = {
    section: 'checkmarkempty',
    reminder: 'info',
    alert: 'alert',
    system: 'email'
  }
  return map[type] || 'email'
}

// 格式化时间
const formatTime = (time: string) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 初始化实时订阅
const initRealtimeSubscription = async () => {
  const userInfo = getUserInfo()
  if (!userInfo || userInfo.role !== 'admin') return

  // 【说明】uniCloud 实时数据库订阅需要依赖实时数据库插件
  // 这里使用轮询作为替代方案
  startPolling()
}

// 轮询检查
const startPolling = () => {
  // 每 60 分钟轮询一次
  setInterval(() => {
    checkClientUpdates()
  }, 3600000)
}

// 检查客户更新
const checkClientUpdates = async () => {
  if (!getAuthToken()) return
  try {
    const res = await callCloud<any>('client-api', {
      action: 'getAdminDashboardData',
      payload: { date: getTodayStr() }
    })

    if (res.ok && res.data) {
      processUpdates(res.data)
    }
  } catch (err) {
    console.error('轮询检查失败:', err)
  }
}

// 处理更新
const processUpdates = (data: any) => {
  // 检查是否有新的完成状态
  const clients = data.pendingCheckIns || []
  clients.forEach((client: any) => {
    if (client.today_checkin?.sectionStatus) {
      // 检查各板块状态...
    }
  })
}

// 处理实时变化
const handleRealtimeChange = (snapshot: any) => {
  const { docChanges } = snapshot
  
  docChanges.forEach((change: any) => {
    const { doc, dataType, updateFields } = change
    
    // 处理更新
    if (dataType === 'update' && updateFields) {
      // 检查各板块完成状态
      checkSectionCompletion(doc, updateFields)
    }
  })
}

// 检查板块完成
const checkSectionCompletion = (doc: any, updateFields: any) => {
  const sectionStatus = updateFields.section_status || {}
  
  // 饮水完成
  if (sectionStatus.water?.completed && !doc._previous?.section_status?.water?.completed) {
    addNotification({
      type: 'section',
      clientId: doc.user_id,
      clientName: doc.user_name || '客户',
      message: '完成了今日饮水目标',
      data: { section: 'water', value: sectionStatus.water.current }
    })
  }
  
  // 健康指标完成
  if (sectionStatus.metrics?.completed && !doc._previous?.section_status?.metrics?.completed) {
    addNotification({
      type: 'section',
      clientId: doc.user_id,
      clientName: doc.user_name || '客户',
      message: '完成了健康指标记录',
      data: { section: 'metrics' }
    })
  }
  
  // 体感完成
  if (sectionStatus.symptoms?.completed && !doc._previous?.section_status?.symptoms?.completed) {
    addNotification({
      type: 'section',
      clientId: doc.user_id,
      clientName: doc.user_name || '客户',
      message: `完成了体感反馈（评分: ${sectionStatus.symptoms.score.toFixed(1)}）`,
      data: { section: 'symptoms', score: sectionStatus.symptoms.score }
    })
  }
  
  // 各时段任务完成
  const slots = ['morning', 'noon', 'evening', 'bedtime']
  const slotLabels: Record<string, string> = {
    morning: '早晨',
    noon: '中午',
    evening: '晚上',
    bedtime: '睡前'
  }
  
  slots.forEach(slot => {
    if (sectionStatus.tasks?.[slot]?.completed && 
        !doc._previous?.section_status?.tasks?.[slot]?.completed) {
      addNotification({
        type: 'section',
        clientId: doc.user_id,
        clientName: doc.user_name || '客户',
        message: `完成了${slotLabels[slot]}打卡`,
        data: { section: 'task', slot }
      })
    }
  })
}

// 添加通知
const addNotification = (data: any) => {
  const notification = {
    _id: Date.now().toString(),
    ...data,
    createTime: new Date().toISOString(),
    isRead: false
  }
  
  notifications.value.unshift(notification)
  
  // 显示本地通知
  showLocalNotification(data)
  
  // 保存到本地存储
  saveNotifications()
}

// 显示本地通知
const showLocalNotification = (data: any) => {
  // 使用系统通知
  uni.showToast({
    title: `${data.clientName}: ${data.message}`,
    icon: 'none',
    duration: 3000
  })
  
  // 震动提醒
  uni.vibrateShort()
}

// 加载通知列表
const loadNotifications = async () => {
  if (loading.value || !hasMore.value) return
  
  loading.value = true
  
  try {
    // 从本地存储加载
    const stored = uni.getStorageSync('advisor_notifications') || []
    if (page.value === 1) {
      notifications.value = stored
    } else {
      // 分页加载更多...
    }
  } finally {
    loading.value = false
  }
}

// 加载更多
const loadMore = () => {
  page.value++
  loadNotifications()
}

// 标记已读
const markAllAsRead = () => {
  notifications.value.forEach(n => n.isRead = true)
  saveNotifications()
}

// 处理通知点击
const handleNotificationClick = (item: any) => {
  item.isRead = true
  saveNotifications()
  
  // 跳转到客户详情
  viewClientDetail(item.clientId)
}

// 查看客户详情
const viewClientDetail = (clientId: string) => {
  uni.navigateTo({
    url: `/pages/admin/client-detail/index?id=${clientId}`
  })
}

// 发送提醒
const sendReminder = (item: any) => {
  uni.showModal({
    title: '发送提醒',
    content: `确定要给 ${item.clientName} 发送打卡提醒吗？`,
    success: (res) => {
      if (res.confirm) {
        // 调用云函数发送提醒
        sendPushNotification(item.clientId, '打卡提醒', '请记得完成今日打卡任务哦~')
      }
    }
  })
}

// 发送推送通知
const sendPushNotification = async (clientId: string, title: string, content: string) => {
  try {
    await callCloud('client-api', {
      action: 'sendPushNotification',
      payload: {
        clientId,
        title,
        content
      }
    })

    uni.showToast({
      title: '提醒已发送',
      icon: 'success'
    })
  } catch (err) {
    uni.showToast({
      title: '发送失败',
      icon: 'none'
    })
  }
}

// 更新设置
const updateSetting = (key: string, event: any) => {
  settings.value[key as keyof typeof settings.value] = event.detail.value
}

// 保存设置
const saveSettings = async () => {
  uni.setStorageSync('advisor_notification_settings', settings.value)
  showSettings.value = false
  
  uni.showToast({
    title: '设置已保存',
    icon: 'success'
  })
}

// 保存通知
const saveNotifications = () => {
  uni.setStorageSync('advisor_notifications', notifications.value.slice(0, 100))
}

// 获取今日日期字符串
const getTodayStr = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 初始化
onMounted(() => {
  // 加载设置
  const savedSettings = uni.getStorageSync('advisor_notification_settings')
  if (savedSettings) {
    settings.value = { ...settings.value, ...savedSettings }
  }
  
  // 加载通知
  loadNotifications()
  
  // 初始化实时订阅
  // #ifndef H5
  initRealtimeSubscription()
  // #endif
  
  // 启动提醒检查定时器
  startReminderCheck()
})

// 清理
onUnmounted(() => {
  if (realtimeSub) {
    realtimeSub.close()
  }
})

// 启动提醒检查
const startReminderCheck = () => {
  // 每分钟检查一次
  setInterval(() => {
    checkReminders()
  }, 60000)
}

// 检查提醒
const checkReminders = () => {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  
  // 只在整点检查
  if (minute !== 0) return
  
  // 检查各时段提醒
  const reminderTimes: Record<string, { hour: number, label: string, key: keyof typeof settings.value }> = {
    morning: { hour: 10, label: '早晨', key: 'morningReminder' },
    noon: { hour: 14, label: '中午', key: 'noonReminder' },
    evening: { hour: 20, label: '晚上', key: 'eveningReminder' },
    bedtime: { hour: 22, label: '睡前', key: 'bedtimeReminder' }
  }
  
  Object.entries(reminderTimes).forEach(([slot, config]) => {
    if (hour === config.hour && settings.value[config.key]) {
      // 触发提醒
      addNotification({
        type: 'reminder',
        clientId: 'system',
        clientName: '系统提醒',
        message: `${config.label}打卡截止时间到了，请及时提醒客户`,
        data: { slot, hour: config.hour }
      })
    }
  })
}

defineExpose({
  addNotification
})
</script>

<style scoped>
.advisor-notification {
  position: relative;
}

.notification-trigger {
  padding: 8px;
  position: relative;
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 16px;
  height: 16px;
  background: #ff4d4f;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.badge-text {
  color: #fff;
  font-size: 10px;
  font-weight: bold;
}

.notification-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.notification-header .title {
  font-size: 18px;
  font-weight: bold;
}

.notification-header .actions {
  display: flex;
  gap: 16px;
}

.notification-header .action-btn {
  font-size: 14px;
  color: #1890ff;
}

.notification-tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.tab-item {
  flex: 1;
  padding: 12px;
  text-align: center;
  font-size: 14px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.tab-item.active {
  color: #1890ff;
  border-bottom: 2px solid #1890ff;
}

.tab-badge {
  min-width: 16px;
  height: 16px;
  background: #ff4d4f;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  font-size: 10px;
  color: #fff;
}

.notification-list {
  flex: 1;
  padding: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.empty-text {
  margin-top: 16px;
  color: #999;
  font-size: 14px;
}

.notification-item {
  display: flex;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 8px;
  position: relative;
}

.notification-item.unread {
  background: #e6f7ff;
}

.icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.icon-wrapper.section {
  background: #52c41a;
}

.icon-wrapper.reminder {
  background: #faad14;
}

.icon-wrapper.alert {
  background: #ff4d4f;
}

.icon-wrapper.system {
  background: #1890ff;
}

.content {
  flex: 1;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.client-name {
  font-weight: bold;
  font-size: 14px;
}

.time {
  font-size: 12px;
  color: #999;
}

.message {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.actions-row {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.actions-row .action-btn {
  font-size: 12px;
  color: #1890ff;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 4px;
  position: absolute;
  top: 12px;
  right: 12px;
}

.settings-container {
  background: #fff;
  border-radius: 16px 16px 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.settings-header .title {
  font-size: 16px;
  font-weight: bold;
}

.settings-list {
  flex: 1;
  padding: 16px;
}

.setting-group {
  margin-bottom: 24px;
}

.group-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1890ff;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.item-info {
  flex: 1;
}

.item-info .label {
  font-size: 14px;
  display: block;
  margin-bottom: 4px;
}

.item-info .desc {
  font-size: 12px;
  color: #999;
}

.settings-footer {
  padding: 16px;
  border-top: 1px solid #eee;
}

.save-btn {
  background: #1890ff;
  color: #fff;
  border-radius: 8px;
  font-size: 16px;
}
</style>

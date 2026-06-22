<template>
  <view class="mp-page-shell h-screen flex flex-col overflow-hidden bg-transparent">
    <!-- 顶部导航栏 -->
    <view
      class="bg-slate-900 px-5 pb-16 flex-none sticky top-0 z-40 shadow-lg shadow-slate-200/50"
      :style="{ paddingTop: `calc(${statusBarHeight}px + 12px)` }"
    >
      <view class="flex items-center justify-between h-10">
        <view>
          <text class="text-xl font-black text-white block tracking-tight">客户咨询</text>
          <text class="text-[10px] text-slate-400 font-medium mt-1 block">与客户进行实时沟通与回复</text>
        </view>
        <view class="flex items-center gap-2">
          <view v-if="totalUnreadCount > 0" class="px-2 py-0.5 bg-white/20 rounded-full">
            <text class="text-[10px] font-bold text-white">{{ totalUnreadCount }} 条未读</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 内容区 -->
    <scroll-view v-if="!selectedClientId" scroll-y class="flex-1 min-h-0">
      <view class="px-5 py-4 space-y-3">
        <view v-if="loading" class="py-16 text-center">
          <text class="text-sm text-slate-400">加载中...</text>
        </view>
        
        <view v-else-if="clientConversations.length === 0" class="py-16 text-center">
          <view class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <text class="text-3xl opacity-50">📭</text>
          </view>
          <text class="text-sm text-slate-400 block mb-2">暂无客户留言</text>
          <text class="text-xs text-slate-300">当客户在小程序端给您发送消息时，会显示在这里</text>
        </view>
        
        <template v-else>
          <view
            v-for="client in clientConversations"
            :key="client.client_id"
            class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mp-pressable active:scale-[0.98] transition-transform"
            @click="selectClient(client)"
          >
            <view class="flex items-center gap-3">
              <view class="relative shrink-0">
                <view class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black shadow-md">
                  {{ client.client_name ? client.client_name[0] : '?' }}
                </view>
                <view v-if="client.unread_count > 0" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-white">
                  {{ client.unread_count > 9 ? '9+' : client.unread_count }}
                </view>
              </view>
              <view class="flex-1 min-w-0">
                <text class="text-sm font-bold text-slate-900 block truncate">{{ client.client_name }}</text>
                <text class="text-xs text-slate-500 block truncate mt-1">{{ client.last_message_preview }}</text>
              </view>
              <view class="text-right shrink-0">
                <text class="text-[10px] text-slate-400 block">{{ formatTime(client.last_message_time) }}</text>
                <text v-if="client.unread_count > 0" class="text-[10px] text-emerald-600 font-bold block mt-1">{{ client.unread_count }} 未读</text>
              </view>
            </view>
          </view>
        </template>
      </view>
    </scroll-view>

    <!-- 对话详情 -->
    <view v-else class="flex-1 flex flex-col min-h-0">
      <!-- 对话头部 -->
      <view class="bg-white px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-none">
        <view class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mp-pressable active:bg-slate-200" @click="backToList">
          <text class="text-slate-600 text-sm font-bold">←</text>
        </view>
        <view v-if="selectedClient" class="text-center flex-1 px-2">
          <text class="text-sm font-bold text-slate-900 block truncate">{{ selectedClient.client_name }}</text>
          <text class="text-[10px] text-slate-400 block mt-0.5">
            {{ selectedClient.unread_count > 0 ? `${selectedClient.unread_count} 条未读` : '已全部阅读' }}
          </text>
        </view>
        <view class="w-8 h-8"></view>
      </view>

      <!-- 消息列表 -->
      <scroll-view scroll-y class="flex-1 min-h-0 bg-slate-50" :scroll-into-view="scrollToId">
        <view class="px-5 py-4 space-y-3">
          <view v-if="messages.length === 0" class="py-16 text-center">
            <view class="w-16 h-16 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-3">
              <text class="text-3xl opacity-30">💭</text>
            </view>
            <text class="text-sm text-slate-400">暂无对话记录</text>
          </view>
          
          <template v-else>
            <view
              v-for="msg in messages"
              :key="msg._id"
              :id="'msg-' + msg._id"
              class="flex gap-2"
              :class="msg.sender_role === 'nutritionist' ? 'flex-row-reverse' : ''"
            >
              <view
                class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow"
                :class="msg.sender_role === 'nutritionist' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'"
              >
                {{ msg.sender_role === 'nutritionist' ? '顾' : (selectedClient?.client_name ? selectedClient.client_name[0] : '客') }}
              </view>
              <view class="max-w-[75%]">
                <view
                  class="px-3 py-2.5 rounded-2xl shadow-sm"
                  :class="msg.sender_role === 'nutritionist' 
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'"
                >
                  <text class="text-sm">{{ msg.content }}</text>
                </view>
                <view class="flex items-center gap-1 mt-0.5" :class="msg.sender_role === 'nutritionist' ? 'justify-end' : ''">
                  <text class="text-[9px] text-slate-400">{{ formatTime(msg.created_at) }}</text>
                  <text v-if="msg.sender_role === 'nutritionist' && msg.read_at" class="text-[9px] text-emerald-500 font-bold">✓ 已读</text>
                </view>
              </view>
            </view>
          </template>
        </view>
      </scroll-view>

      <!-- 回复输入框 -->
      <view class="bg-white border-t border-slate-100 px-5 py-3 flex-none pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <view class="flex items-center gap-2">
          <input
            v-model="replyMessage"
            placeholder="输入回复消息..."
            class="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-sm text-slate-800 placeholder:text-slate-400"
            :disabled="sending"
            @confirm="sendReply"
          />
          <view
            class="h-11 px-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mp-pressable active:scale-95 transition-transform"
            :class="{ 'opacity-50': sending || !replyMessage.trim() }"
            @click="sendReply"
          >
            <text v-if="!sending" class="text-white text-sm font-bold">发送</text>
            <text v-else class="text-white text-xs">...</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { callCloud } from '@/utils/cloud'

const statusBarHeight = ref(uni.getSystemInfoSync().statusBarHeight || 44)

const loading = ref(false)
const sending = ref(false)
const clientConversations = ref<any[]>([])
const selectedClientId = ref('')
const selectedClient = ref<any>(null)
const messages = ref<any[]>([])
const replyMessage = ref('')
const scrollToId = ref('')

let refreshTimer: any = null
let isPageActive = false  // 页面是否活跃
let abortRequest = false  // 请求取消标志

const totalUnreadCount = computed(() => {
  return clientConversations.value.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0)
})

const formatTime = (timestamp: number) => {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const backToList = () => {
  selectedClientId.value = ''
  selectedClient.value = null
  messages.value = []
}

const selectClient = (client: any) => {
  selectedClientId.value = client.client_id
  selectedClient.value = client
  loadConversation(client.client_id)
}

const loadClientConversations = async () => {
  if (abortRequest) return  // 页面已切换，取消请求
  
  try {
    const res = await callCloud<any>('client-api', {
      action: 'getAdminClientMessages',
      payload: { limit: 200 }
    })
    
    // 请求返回后再次检查
    if (abortRequest) return
    
    if (res.ok && Array.isArray(res.data)) {
      // 按客户分组消息
      const conversationsMap: Record<string, any> = {}
      
      res.data.forEach((msg: any) => {
        const clientId = msg.client_id
        if (!conversationsMap[clientId]) {
          conversationsMap[clientId] = {
            client_id: clientId,
            client_name: msg.client_name || '客户',
            last_message_preview: msg.content.slice(0, 20),
            last_message_time: msg.created_at,
            unread_count: 0,
            messages: []
          }
        }
        
        conversationsMap[clientId].messages.push(msg)
        
        if (msg.created_at > conversationsMap[clientId].last_message_time) {
          conversationsMap[clientId].last_message_time = msg.created_at
          conversationsMap[clientId].last_message_preview = msg.content.slice(0, 20)
        }
        
        if (msg.sender_role !== 'nutritionist' && !msg.read_at) {
          conversationsMap[clientId].unread_count++
        }
      })
      
      // 转换为数组并按最后消息时间排序
      clientConversations.value = Object.values(conversationsMap).sort((a: any, b: any) => 
        b.last_message_time - a.last_message_time
      )
    }
  } catch (err) {
    console.error('加载客户消息失败:', err)
  }
}

const loadConversation = async (clientId: string) => {
  if (abortRequest) return
  
  loading.value = true
  try {
    const res = await callCloud<any>('client-api', {
      action: 'getConversationWithClient',
      payload: { clientId, limit: 100 }
    })
    
    if (abortRequest) return
    
    if (res.ok && Array.isArray(res.data)) {
      messages.value = res.data
      
      // 滚动到最后一条消息
      await nextTick()
      if (messages.value.length > 0 && !abortRequest) {
        scrollToId.value = 'msg-' + messages.value[messages.value.length - 1]._id
      }
      
      // 标记客户的未读消息为已读
      await markMessagesAsRead(clientId)
      
      // 刷新客户列表
      if (!abortRequest) {
        await loadClientConversations()
      }
    }
  } catch (err) {
    console.error('加载对话失败:', err)
  } finally {
    loading.value = false
  }
}

const markMessagesAsRead = async (clientId: string) => {
  try {
    const unreadMessages = messages.value.filter(
      (m: any) => m.sender_role !== 'nutritionist' && !m.read_at
    )
    
    for (const msg of unreadMessages) {
      await callCloud<any>('client-api', {
        action: 'markClientMessageRead',
        payload: { messageId: msg._id, clientId }
      })
    }
  } catch (err) {
    console.error('标记消息已读失败:', err)
  }
}

const sendReply = async () => {
  if (!replyMessage.value.trim() || sending.value || !selectedClientId.value) return
  
  sending.value = true
  try {
    const res = await callCloud<any>('client-api', {
      action: 'replyClientMessage',
      payload: {
        clientId: selectedClientId.value,
        content: replyMessage.value.trim(),
        type: 'reply'
      }
    })
    
    if (res.ok && res.data) {
      messages.value.push(res.data)
      replyMessage.value = ''
      
      // 滚动到新消息
      await nextTick()
      scrollToId.value = 'msg-' + messages.value[messages.value.length - 1]._id
      
      // 刷新客户列表
      await loadClientConversations()
    }
  } catch (err) {
    console.error('发送回复失败:', err)
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  isPageActive = true
  loading.value = true
  try {
    await loadClientConversations()
  } finally {
    loading.value = false
  }
})

// 页面显示时启动定时器
onShow(() => {
  isPageActive = true
  abortRequest = false
  
  // 刷新数据
  loadClientConversations()
  if (selectedClientId.value) {
    loadConversation(selectedClientId.value)
  }
  
  // 每15秒自动刷新（延长间隔减少卡顿）
  refreshTimer = setInterval(() => {
    if (isPageActive && !abortRequest) {
      loadClientConversations()
      if (selectedClientId.value) {
        loadConversation(selectedClientId.value)
      }
    }
  }, 15000)
})

// 页面隐藏时停止定时器和请求
onHide(() => {
  isPageActive = false
  abortRequest = true
  
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

onUnmounted(() => {
  isPageActive = false
  abortRequest = true
  
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<style scoped>
/* 小程序端样式 */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>

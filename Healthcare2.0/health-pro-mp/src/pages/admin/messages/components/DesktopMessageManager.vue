<template>
  <view class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
    <!-- 顶部导航栏 -->
    <view class="bg-white border-b border-slate-200 sticky top-0 z-50">
      <view class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <view class="flex items-center gap-3">
          <view class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200/50">
            <text class="text-white text-lg">💬</text>
          </view>
          <view>
            <text class="text-xl font-black text-slate-900">客户消息</text>
            <text class="text-xs text-slate-400 block mt-0.5">管理客户留言与咨询</text>
          </view>
        </view>
        <view class="flex items-center gap-3">
          <text class="text-xs text-slate-400">{{ lastUpdatedText }}</text>
          <view class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 cursor-pointer transition-colors" @click="refresh">
            <text class="text-slate-600">🔄</text>
          </view>
        </view>
      </view>
    </view>

    <view class="max-w-7xl mx-auto p-6">
      <view class="flex gap-6 h-[calc(100vh-140px)]">
        <!-- 左侧：客户列表 -->
        <view class="w-80 shrink-0 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
          <view class="px-5 py-4 border-b border-slate-100">
            <text class="text-sm font-black text-slate-900">最近留言的客户</text>
            <text class="text-[10px] text-slate-400 block mt-1">共 {{ clientConversations.length }} 位客户</text>
          </view>
          
          <scroll-view scroll-y class="flex-1">
            <view v-if="loading" class="p-8 text-center">
              <text class="text-sm text-slate-400">加载中...</text>
            </view>
            
            <view v-else-if="clientConversations.length === 0" class="p-8 text-center">
              <text class="text-2xl opacity-50 block mb-2">📭</text>
              <text class="text-sm text-slate-400">暂无客户留言</text>
            </view>
            
            <view v-else class="p-3 space-y-2">
              <view
                v-for="client in clientConversations"
                :key="client.client_id"
                class="p-3 rounded-xl cursor-pointer transition-all"
                :class="selectedClientId === client.client_id ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'"
                @click="selectClient(client)"
              >
                <view class="flex items-center gap-3">
                  <view class="relative">
                    <view class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black shadow-md">
                      {{ client.client_name ? client.client_name[0] : '?' }}
                    </view>
                    <view v-if="client.unread_count > 0" class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-white">
                      {{ client.unread_count > 9 ? '9+' : client.unread_count }}
                    </view>
                  </view>
                  <view class="flex-1 min-w-0">
                    <text class="text-sm font-bold text-slate-900 block truncate">{{ client.client_name }}</text>
                    <text class="text-xs text-slate-500 block truncate mt-0.5">{{ client.last_message_preview }}</text>
                    <text class="text-[10px] text-slate-400 block mt-1">{{ formatTime(client.last_message_time) }}</text>
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 右侧：对话内容 -->
        <view class="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
          <!-- 对话头部 -->
          <view class="px-6 py-4 border-b border-slate-100">
            <view v-if="selectedClient" class="flex items-center gap-4">
              <view class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black shadow-md">
                {{ selectedClient.client_name ? selectedClient.client_name[0] : '?' }}
              </view>
              <view class="flex-1">
                <text class="text-base font-black text-slate-900 block">{{ selectedClient.client_name }}</text>
                <text class="text-xs text-slate-400 block mt-0.5">
                  {{ selectedClient.unread_count > 0 ? `${selectedClient.unread_count} 条未读消息` : '已全部阅读' }}
                </text>
              </view>
            </view>
            <view v-else class="text-center py-2">
              <text class="text-sm text-slate-400">请选择一位客户查看对话</text>
            </view>
          </view>

          <!-- 消息列表 -->
          <scroll-view v-if="selectedClient" scroll-y class="flex-1 px-6 py-4 bg-gradient-to-b from-slate-50/50 to-white">
            <view class="space-y-4 pb-4">
              <view v-if="messages.length === 0" class="py-16 text-center">
                <text class="text-3xl opacity-30 block mb-3">💭</text>
                <text class="text-sm text-slate-400">暂无对话记录</text>
              </view>
              
              <template v-else>
                <view
                  v-for="msg in messages"
                  :key="msg._id"
                  class="flex gap-3"
                  :class="msg.sender_role === 'nutritionist' ? 'flex-row-reverse' : ''"
                >
                  <view
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md"
                    :class="msg.sender_role === 'nutritionist' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'"
                  >
                    {{ msg.sender_role === 'nutritionist' ? '顾' : (selectedClient.client_name ? selectedClient.client_name[0] : '客') }}
                  </view>
                  <view class="max-w-[70%]">
                    <view
                      class="px-4 py-3 rounded-2xl shadow-sm"
                      :class="msg.sender_role === 'nutritionist' 
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'"
                    >
                      <text class="text-sm">{{ msg.content }}</text>
                    </view>
                    <view class="flex items-center gap-2 mt-1">
                      <text class="text-[10px] text-slate-400">{{ formatTime(msg.created_at) }}</text>
                      <text v-if="msg.sender_role === 'nutritionist' && msg.read_at" class="text-[10px] text-emerald-500 font-bold">✓ 已读</text>
                    </view>
                  </view>
                </view>
              </template>
            </view>
          </scroll-view>

          <!-- 未选择客户时的占位 -->
          <view v-else class="flex-1 flex items-center justify-center">
            <view class="text-center">
              <text class="text-5xl opacity-20 block mb-4">💬</text>
              <text class="text-sm text-slate-400">从左侧选择一位客户开始对话</text>
            </view>
          </view>

          <!-- 回复输入框 -->
          <view v-if="selectedClient" class="border-t border-slate-100 p-4 bg-white">
            <view class="flex gap-3">
              <input
                v-model="replyMessage"
                placeholder="输入回复消息..."
                class="flex-1 h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-400 outline-none"
                @keyup.enter="sendReply"
              />
              <view
                class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center cursor-pointer hover:shadow-lg hover:shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                :class="{ 'opacity-50 cursor-not-allowed': sending || !replyMessage.trim() }"
                @click="sendReply"
              >
                <text v-if="!sending" class="text-white text-lg">➤</text>
                <text v-else class="text-white text-sm">...</text>
              </view>
            </view>
            <view class="mt-2 flex items-center gap-4">
              <text class="text-[10px] text-slate-400">按 Enter 发送</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { callCloud } from '@/utils/cloud'
import { getUserInfo } from '@/utils/storage'

const loading = ref(false)
const sending = ref(false)
const lastUpdatedText = ref('')
const clientConversations = ref<any[]>([])
const selectedClientId = ref('')
const selectedClient = ref<any>(null)
const messages = ref<any[]>([])
const replyMessage = ref('')

let refreshTimer: any = null

const selectClient = (client: any) => {
  selectedClientId.value = client.client_id
  selectedClient.value = client
  loadConversation(client.client_id)
}

const formatTime = (timestamp: number) => {
  if (!timestamp) return ''
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const loadClientConversations = async () => {
  try {
    const res = await callCloud<any>('client-api', {
      action: 'getAdminClientMessages',
      payload: { limit: 200 }
    })
    
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
        
        // 统计未读消息（客户发来的，且顾问未读的）
        if (msg.sender_role !== 'nutritionist' && !msg.read_at) {
          conversationsMap[clientId].unread_count++
        }
      })
      
      // 转换为数组并按最后消息时间排序
      clientConversations.value = Object.values(conversationsMap).sort((a: any, b: any) => 
        b.last_message_time - a.last_message_time
      )
      
      lastUpdatedText.value = `更新于 ${new Date().toLocaleString()}`
      
      // 自动选择第一个有未读消息的客户
      if (!selectedClientId.value && clientConversations.value.length > 0) {
        const firstUnread = clientConversations.value.find((c: any) => c.unread_count > 0)
        if (firstUnread) {
          selectClient(firstUnread)
        } else {
          selectClient(clientConversations.value[0])
        }
      }
    }
  } catch (err) {
    console.error('加载客户消息失败:', err)
  }
}

const loadConversation = async (clientId: string) => {
  loading.value = true
  try {
    const res = await callCloud<any>('client-api', {
      action: 'getConversationWithClient',
      payload: { clientId, limit: 100 }
    })
    
    if (res.ok && Array.isArray(res.data)) {
      messages.value = res.data
      
      // 标记客户的未读消息为已读
      await markMessagesAsRead(clientId)
      
      // 刷新客户列表以更新未读计数
      await loadClientConversations()
    }
  } catch (err) {
    console.error('加载对话失败:', err)
  } finally {
    loading.value = false
  }
}

const markMessagesAsRead = async (clientId: string) => {
  try {
    // 遍历当前对话的所有客户消息，标记为已读
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
      
      // 刷新客户列表
      await loadClientConversations()
    } else {
      console.error('发送失败:', res.msg)
    }
  } catch (err) {
    console.error('发送回复失败:', err)
  } finally {
    sending.value = false
  }
}

const refresh = async () => {
  loading.value = true
  try {
    await loadClientConversations()
    if (selectedClientId.value) {
      await loadConversation(selectedClientId.value)
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    await loadClientConversations()
  } finally {
    loading.value = false
  }
  
  // 每10秒自动刷新一次
  refreshTimer = setInterval(() => {
    loadClientConversations()
    if (selectedClientId.value) {
      loadConversation(selectedClientId.value)
    }
  }, 10000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
/* 额外的桌面端样式可以放这里 */
</style>

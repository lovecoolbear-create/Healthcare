<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <Sidebar activeTab="dashboard" />
    
    <!-- Main Content -->
    <div class="flex-1 p-10 pb-24 overflow-y-auto h-screen">
      <!-- Header -->
      <div class="flex justify-between items-end mb-10">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">数据中心概览</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-sm text-slate-500 font-medium">{{ currentDate }}</span>
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="text-sm text-slate-500">WROM + RPS 双评分实时监控</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <!-- 通知按钮 -->
          <button
            @click="showNotificationPanel = !showNotificationPanel"
            class="relative flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 font-bold text-sm active:scale-95 transform"
          >
            <Bell class="w-4 h-4" />
            <span>消息</span>
            <span v-if="unreadNotificationCount > 0" class="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {{ unreadNotificationCount > 9 ? '9+' : unreadNotificationCount }}
            </span>
          </button>
          
          <button
            @click="openDirectShipModal"
            class="flex items-center gap-2 bg-slate-900 px-4 py-2.5 rounded-xl shadow-sm border border-slate-900 hover:bg-slate-800 transition-colors text-white font-bold text-sm active:scale-95 transform"
          >
            <Package class="w-4 h-4" />
            <span>主动发货</span>
          </button>
          <button 
            @click="fetchDashboardData"
            class="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 font-bold text-sm active:scale-95 transform"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
            <span>同步数据</span>
          </button>
          <div class="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100">
            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span class="text-sm font-bold text-emerald-700">系统运行正常</span>
          </div>
        </div>
      </div>

      <!-- 新手引导：首次使用（无客户时显示） -->
      <div v-if="showOnboarding" class="bg-gradient-to-r from-emerald-50 to-blue-50 p-8 rounded-3xl border border-emerald-100 mb-10 relative overflow-hidden">
        <div class="absolute right-0 top-0 w-64 h-64 bg-emerald-100/50 rounded-bl-full -mr-16 -mt-16"></div>
        <div class="relative z-10">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-2xl font-black text-slate-900 mb-2">👋 欢迎开始使用数字化管理工具</h2>
              <p class="text-slate-600 mb-6">只需3步，完成您的第一个客户管理闭环</p>
            </div>
            <button @click="dismissOnboarding" class="text-slate-400 hover:text-slate-600 transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Step 1 -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative" :class="{ 'ring-2 ring-emerald-500': onboardingStep === 1 }">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                <span class="font-bold text-slate-900">录入客户</span>
              </div>
              <p class="text-xs text-slate-500 mb-3">创建您的第一个客户档案，记录基本信息</p>
              <button @click="navigateTo('/pages/admin/clients/add')" class="w-full py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-colors">
                去录入
              </button>
            </div>
            
            <!-- Step 2 -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative" :class="{ 'ring-2 ring-emerald-500': onboardingStep === 2 }">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm" :class="{ 'bg-emerald-500 text-white': onboardingStep > 1 }">2</div>
                <span class="font-bold text-slate-900">制定方案</span>
              </div>
              <p class="text-xs text-slate-500 mb-3">为客户分配健康管理方案，设置打卡任务</p>
              <button 
                @click="onboardingStep >= 2 ? navigateTo('/pages/admin/clients/index') : null" 
                class="w-full py-2 text-sm font-bold rounded-xl transition-colors"
                :class="onboardingStep >= 2 ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
              >
                {{ onboardingStep >= 2 ? '去制定' : '先完成步骤1' }}
              </button>
            </div>
            
            <!-- Step 3 -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative" :class="{ 'ring-2 ring-emerald-500': onboardingStep === 3 }">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm" :class="{ 'bg-emerald-500 text-white': onboardingStep > 2 }">3</div>
                <span class="font-bold text-slate-900">查看数据</span>
              </div>
              <p class="text-xs text-slate-500 mb-3">系统自动计算WROM评分，实时监控健康趋势</p>
              <button 
                class="w-full py-2 text-sm font-bold rounded-xl transition-colors"
                :class="onboardingStep >= 3 ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
              >
                {{ onboardingStep >= 3 ? '查看演示' : '先完成步骤2' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Metrics Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <!-- Total Clients -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-36 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group" @click="navigateTo('/pages/admin/clients/index')">
          <div class="flex justify-between items-start">
            <div class="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users class="w-6 h-6" />
            </div>
            <span class="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">总数</span>
          </div>
          <div>
            <div class="text-4xl font-black text-slate-900 tracking-tight">{{ stats.totalClients }}</div>
            <div class="flex items-center gap-1.5 mt-2">
              <span class="text-xs font-bold text-slate-500">活跃客户</span>
              <span class="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ArrowUpRight class="w-3 h-3" />
                +3
              </span>
            </div>
          </div>
        </div>

        <!-- Messages - 客户未读消息 -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-36 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group" @click="showMessagePanel = true">
          <div class="flex justify-between items-start">
            <div class="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-500 group-hover:text-white transition-colors relative">
              <MessageCircle class="w-6 h-6" />
              <span v-if="unreadClientMessagesCount > 0" class="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                {{ unreadClientMessagesCount > 9 ? '9+' : unreadClientMessagesCount }}
              </span>
            </div>
            <span class="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-md border border-violet-100">待回复</span>
          </div>
          <div>
            <div class="text-4xl font-black text-slate-900 tracking-tight">{{ unreadClientMessagesCount }}</div>
            <div class="flex items-center gap-1.5 mt-2">
              <span class="text-xs font-bold text-slate-500">客户消息</span>
              <span v-if="unreadClientMessagesCount > 0" class="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <AlertCircle class="w-3 h-3" />
                待处理
              </span>
            </div>
          </div>
        </div>

        <!-- Low Stock -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-36 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group" @click="navigateTo('/pages/admin/clients/index')">
          <div class="flex justify-between items-start">
            <div class="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Package class="w-6 h-6" />
            </div>
            <span class="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">库存告急</span>
          </div>
          <div>
            <div class="text-4xl font-black text-slate-900 tracking-tight">{{ stats.lowStockCount }}</div>
            <div class="text-xs font-bold text-slate-500 mt-2">客户库存不足</div>
          </div>
        </div>
      </div>

      <!-- Main Layout: 2 Columns (Content + Side Panel) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Priority Actions (2/3 width) -->
        <div class="lg:col-span-2 space-y-8">
          
          <!-- 【重构】今日关注/持续关注 Tabs -->
          <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <!-- Tabs 头部 -->
            <div class="flex border-b border-slate-100">
              <button 
                class="flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2"
                :class="dashboardTab === 'today' ? 'bg-white text-rose-600 border-b-2 border-rose-500' : 'bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100'"
                @click="dashboardTab = 'today'"
              >
                <div class="w-2 h-2 rounded-full" :class="dashboardTab === 'today' ? 'bg-rose-500' : 'bg-slate-400'"></div>
                今日关注
                <span v-if="missedCheckInClients.length > 0" class="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 ml-1">{{ missedCheckInClients.length }}</span>
              </button>
              <button 
                class="flex-1 py-4 text-sm font-bold transition-all flex items-center justify-center gap-2"
                :class="dashboardTab === 'continuous' ? 'bg-white text-indigo-600 border-b-2 border-indigo-500' : 'bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100'"
                @click="dashboardTab = 'continuous'"
              >
                <div class="w-2 h-2 rounded-full" :class="dashboardTab === 'continuous' ? 'bg-indigo-500' : 'bg-slate-400'"></div>
                持续关注
                <span v-if="(filteredRepurchaseRiskClients.length + highRiskClients.length) > 0" class="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 ml-1">{{ filteredRepurchaseRiskClients.length + highRiskClients.length }}</span>
              </button>
            </div>

            <!-- Tab: 今日关注 -->
            <div v-if="dashboardTab === 'today'">
              <!-- 未打卡客户部分 -->
            <div v-if="missedCheckInClients.length > 0" class="border-b border-slate-100">
              <div class="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <span class="text-xs font-bold text-slate-500">未打卡 ({{ missedCheckInClients.length }})</span>
                <span class="text-[10px] text-slate-400">点击展开查看详情</span>
              </div>
              <div class="divide-y divide-slate-50">
                <div v-for="client in missedCheckInClients.slice(0, 5)" :key="'missed-' + client._id" class="p-5 hover:bg-slate-50 transition-colors">
                  <!-- 客户基本信息行 -->
                  <div class="flex items-center justify-between cursor-pointer" @click="navigateToClient(client._id, 'checkin')">
                    <div class="flex items-center gap-4">
                      <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200">
                        {{ (client.name || client.username || client.nickname || '客')[0] }}
                      </div>
                      <div>
                        <div class="font-bold text-slate-900">{{ client.name || client.username || client.nickname || '未命名' }}</div>
                        <div class="text-xs text-slate-400 mt-1">{{ getCheckInDescription(client) }}</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                        :class="{
                          'bg-emerald-100 text-emerald-600': client.today_checkin?.status === 'completed',
                          'bg-amber-100 text-amber-600': client.today_checkin?.status === 'partial',
                          'bg-slate-100 text-slate-600': !client.today_checkin?.status || client.today_checkin?.status === 'not_started'
                        }"
                      >
                        {{ client.today_checkin?.status === 'completed' ? '已完成' : client.today_checkin?.status === 'partial' ? '进行中' : '未打卡' }}
                      </span>
                      <!-- 【新增】展开/折叠按钮 -->
                      <button 
                        class="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        @click.stop="toggleClientExpand(client._id)"
                      >
                        <ChevronDown 
                          class="w-4 h-4 text-slate-400 transition-transform duration-200"
                          :class="{ 'rotate-180': expandedClients.has(client._id) }"
                        />
                      </button>
                    </div>
                  </div>
                  
                  <!-- 【新增】详细打卡状态（可折叠） -->
                  <div 
                    v-if="client.today_checkin?.sectionStatus && expandedClients.has(client._id)" 
                    class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100"
                  >
                    <!-- 饮水状态 -->
                    <div class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium" :class="client.today_checkin.sectionStatus.water?.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'">
                      <Droplets class="w-3 h-3" />
                      <span>{{ client.today_checkin.sectionStatus.water?.completed ? '饮水完成' : `饮水${client.today_checkin.sectionStatus.water?.current || 0}/${client.today_checkin.sectionStatus.water?.target || 2000}ml` }}</span>
                    </div>
                    
                    <!-- 健康指标状态 -->
                    <div class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium" :class="client.today_checkin.sectionStatus.metrics?.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'">
                      <Activity class="w-3 h-3" />
                      <span>{{ client.today_checkin.sectionStatus.metrics?.completed ? '健康指标完成' : '健康指标待填' }}</span>
                    </div>
                    
                    <!-- 体感状态 -->
                    <div class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium" :class="client.today_checkin.sectionStatus.symptoms?.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'">
                      <Smile class="w-3 h-3" />
                      <span>{{ client.today_checkin.sectionStatus.symptoms?.completed ? `体感评分${client.today_checkin.sectionStatus.symptoms?.score?.toFixed(1) || '-'}` : '体感待填' }}</span>
                    </div>
                    
                    <!-- 任务状态（按时段）【修复】只显示有任务的时段 -->
                    <div
                      v-for="(status, slot) in client.today_checkin.sectionStatus.tasks"
                      :key="slot"
                      v-show="status?.items?.length > 0"
                      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer hover:opacity-80"
                      :class="status?.completed ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'"
                      @click="showTaskDebugModal(client, slot, status)"
                    >
                      <CheckCircle2 v-if="status?.completed" class="w-3 h-3" />
                      <Circle v-else class="w-3 h-3" />
                      <span>{{ getSlotLabel(slot) }} {{ status.items.filter((t: any) => t.completed).length }}/{{ status.items.length }} 项完成</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
              <!-- 空状态 -->
              <div v-if="missedCheckInClients.length === 0" class="p-10 text-center text-slate-400">
                今日打卡任务已全部完成
              </div>
            </div>

            <!-- Tab: 持续关注 -->
            <div v-if="dashboardTab === 'continuous'">
              <!-- 风险预警客户（体感差 + WROM < 60） -->
              <div v-if="highRiskClients.length > 0" class="border-b border-slate-100">
                <div class="px-6 py-3 bg-rose-50/50 border-b border-slate-100">
                  <span class="text-xs font-bold text-rose-600">风险预警 ({{ highRiskClients.length }})</span>
                </div>
                <div class="divide-y divide-slate-50">
                  <div v-for="client in highRiskClients" :key="'risk-' + client._id" class="p-5 hover:bg-slate-50 transition-colors group cursor-pointer" @click="navigateToClient(client._id, 'symptom')">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm border border-rose-100">
                          {{ (client.name || client.username || client.nickname || '客')[0] }}
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-slate-900">{{ client.name || client.username || client.nickname || '未命名' }}</span>
                            <span v-if="client.attention_reason === 'low_symptoms'" class="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white shadow-sm">
                              体感 {{ client.today_checkin?.sectionStatus?.symptoms?.score?.toFixed(1) || '0.0' }} 分
                            </span>
                            <span v-else-if="client.attention_reason === 'low_wrom'" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-600">WROM {{ client.wrom_score }}</span>
                          </div>
                          <div class="text-xs text-slate-400 mt-1 font-medium">
                            {{ getRiskClientDescription(client) }}
                          </div>
                        </div>
                      </div>
                      <div class="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors shadow-sm">
                          <MessageCircle class="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- RPS 低分/下滑客户 -->
              <div v-if="filteredRepurchaseRiskClients.length > 0">
                <div class="px-6 py-3 bg-indigo-50/50 border-b border-slate-100 flex justify-between items-center">
                  <span class="text-xs font-bold text-indigo-600">RPS 预警 ({{ filteredRepurchaseRiskClients.length }})</span>
                  <div class="bg-slate-100 rounded-lg p-1 flex items-center gap-1">
                    <button class="h-6 px-2 rounded text-[10px] font-bold transition-colors"
                      :class="rpsReasonFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                      @click="rpsReasonFilter = 'all'">全部</button>
                    <button class="h-6 px-2 rounded text-[10px] font-bold transition-colors"
                      :class="rpsReasonFilter === 'low' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                      @click="rpsReasonFilter = 'low'">低分</button>
                    <button class="h-6 px-2 rounded text-[10px] font-bold transition-colors"
                      :class="rpsReasonFilter === 'regression' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                      @click="rpsReasonFilter = 'regression'">下滑</button>
                  </div>
                </div>
                <div class="divide-y divide-slate-50">
                  <div v-for="client in filteredRepurchaseRiskClients" :key="client._id" class="p-5 hover:bg-slate-50 transition-colors group flex items-center justify-between cursor-pointer" @click="navigateToClient(client._id, 'inventory')">
                    <div class="flex items-center gap-4">
                      <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm border border-indigo-100">
                        {{ (client.name || client.username || client.nickname || '客')[0] }}
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-slate-900">{{ client.name || client.username || client.nickname || '未命名' }}</span>
                          <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-600">
                            RPS {{ Number.isFinite(Number(client.rps_score)) ? Number(client.rps_score) : 70 }}
                          </span>
                        </div>
                        <div class="text-xs text-slate-400 mt-1 font-medium">
                          {{ getRepurchaseAlertText(client) }}
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button class="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm">
                        <MessageCircle class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-if="lowWromClients.length === 0 && filteredRepurchaseRiskClients.length === 0" class="p-10 text-center text-slate-400">
                暂无持续跟踪客户
              </div>
            </div>
          </div>

        </div>

        <!-- Right Column: Quick Actions & Stats (1/3 width) -->
        <div class="space-y-6">
          <!-- Quick Actions -->
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 text-slate-400">快捷入口</h3>
            <div class="space-y-3">
              <button @click="navigateTo('/pages/admin/clients/index')" class="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group border border-transparent hover:border-slate-200">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <UserPlus class="w-5 h-5" />
                  </div>
                  <div class="text-left">
                    <div class="font-bold text-slate-700 text-sm">录入新客户</div>
                    <div class="text-[10px] text-slate-400">建立健康档案</div>
                  </div>
                </div>
                <ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>

              <button @click="navigateTo('/pages/admin/products/index')" class="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group border border-transparent hover:border-slate-200">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                    <Package class="w-5 h-5" />
                  </div>
                  <div class="text-left">
                    <div class="font-bold text-slate-700 text-sm">产品入库</div>
                    <div class="text-[10px] text-slate-400">更新库存数量</div>
                  </div>
                </div>
                <ChevronRight class="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>
            </div>
          </div>

          <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider text-slate-400">通知动态</h3>
              <span class="text-[10px] px-2 py-1 rounded bg-slate-100 text-slate-500 font-bold">未读 {{ unreadNotificationCount }}</span>
            </div>
            <div v-if="!recentNotifications.length" class="text-xs text-slate-400">暂无最新通知</div>
            <div v-else class="space-y-3 max-h-64 overflow-auto pr-1">
              <div
                v-for="notification in recentNotifications"
                :key="notification._id"
                class="p-3 rounded-xl border transition-colors cursor-pointer"
                :class="notification.read_at ? 'border-slate-100 bg-slate-50 hover:bg-slate-100' : 'border-emerald-100 bg-emerald-50/60 hover:bg-emerald-100/60'"
                @click="openAdminNotification(notification)"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="text-xs font-bold text-slate-800 line-clamp-1">{{ notification.title || '系统通知' }}</div>
                  <span v-if="!notification.read_at" class="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                </div>
                <div class="text-[11px] text-slate-500 mt-1 line-clamp-2">{{ notification.content || '' }}</div>
                <div class="text-[10px] text-slate-400 mt-1">{{ formatDate(notification.created_at) }}</div>
              </div>
            </div>
          </div>

          <!-- Client Messages -->
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-wider text-slate-400">客户消息</h3>
              <span class="text-[10px] px-2 py-1 rounded bg-violet-100 text-violet-600 font-bold">未读 {{ unreadClientMessagesCount }}</span>
            </div>
            <div v-if="!clientMessages.length" class="text-xs text-slate-400">暂无客户消息</div>
            <div v-else class="space-y-3 max-h-64 overflow-auto pr-1">
              <div
                v-for="message in clientMessages.slice(0, 5)"
                :key="message._id"
                class="p-3 rounded-xl border transition-colors cursor-pointer"
                :class="!message.read_at && message.sender_role === 'client' ? 'border-violet-100 bg-violet-50/60 hover:bg-violet-100/60' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'"
                @click="navigateToClient(message.user_id, 'chat'); markClientMessageRead(message._id, message.user_id)"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                      {{ message.client_name?.[0] || '客' }}
                    </div>
                    <p class="text-xs font-bold text-slate-800 line-clamp-1">{{ message.client_name || '客户' }}</p>
                  </div>
                  <span v-if="!message.read_at && message.sender_role === 'client'" class="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse"></span>
                </div>
                <p class="mt-1 text-[11px] text-slate-500 line-clamp-2">{{ message.content || '' }}</p>
                <p class="mt-1 text-[10px] text-slate-400">{{ formatDate(message.created_at) }}</p>
              </div>
            </div>
            <button 
              v-if="clientMessages.length > 5"
              @click="showMessagePanel = true"
              class="w-full mt-3 py-2 text-xs font-bold text-violet-600 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
            >
              查看全部 {{ clientMessages.length }} 条消息
            </button>
          </div>

          <!-- Trend Chart (Mini) -->
          <div class="bg-slate-900 p-6 rounded-3xl shadow-lg shadow-slate-900/20 text-white relative overflow-hidden">
            <div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[60px] opacity-20 -mr-10 -mt-10"></div>
            
            <h3 class="text-sm font-bold text-slate-400 mb-1">本周活跃度</h3>
            <div class="text-2xl font-black text-white mb-6">86% <span class="text-xs font-normal text-emerald-400 ml-1">↑ 12%</span></div>
            
            <div class="flex items-end gap-2 h-24">
              <div v-for="h in [40, 65, 45, 80, 55, 90, 75]" :key="h" class="flex-1 bg-slate-800 rounded-t-sm hover:bg-emerald-500 transition-colors relative group">
                 <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 text-[10px] bg-white text-slate-900 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{{ h }}%</div>
                 <div class="w-full rounded-t-sm" :style="{ height: h + '%' }"></div>
              </div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
              <span>Mon</span>
              <span>Sun</span>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- 【新增】消息面板弹窗 -->
    <div v-if="showMessagePanel" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showMessagePanel = false"></div>
      <div class="relative z-10 w-full max-w-2xl max-h-[80vh] rounded-3xl bg-white border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <MessageCircle class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900">客户消息</h3>
              <p class="text-xs text-slate-500">共 {{ clientMessages.length }} 条消息，{{ unreadClientMessagesCount }} 条未读</p>
            </div>
          </div>
          <button @click="showMessagePanel = false" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <span class="text-lg">×</span>
          </button>
        </div>
        
        <div class="flex-1 overflow-auto p-6">
          <div v-if="!clientMessages.length" class="text-center py-20">
            <MessageCircle class="w-16 h-16 text-slate-100 mx-auto mb-4" />
            <p class="text-sm text-slate-400 font-bold">暂无客户消息</p>
          </div>
          <div v-else class="space-y-4">
            <div
              v-for="message in clientMessages"
              :key="message._id"
              class="p-4 rounded-2xl border transition-colors cursor-pointer"
              :class="!message.read_at && message.sender_role === 'client' ? 'border-violet-100 bg-violet-50/60 hover:bg-violet-100/60' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'"
              @click="navigateToClient(message.user_id, 'chat'); markClientMessageRead(message._id, message.user_id)"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold">
                    {{ message.client_name?.[0] || '客' }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-800">{{ message.client_name || '客户' }}</p>
                    <p class="text-[10px] text-slate-400">{{ formatDate(message.created_at) }}</p>
                  </div>
                </div>
                <span v-if="!message.read_at && message.sender_role === 'client'" class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold">未读</span>
              </div>
              <p class="text-sm text-slate-600 pl-11">{{ message.content || '' }}</p>
            </div>
          </div>
        </div>
        
        <div class="p-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            v-if="unreadClientMessagesCount > 0"
            @click="clientMessages.forEach(m => { if (!m.read_at && m.sender_role === 'client') markClientMessageRead(m._id, m.user_id); })"
            class="w-full py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            全部标记为已读
          </button>
        </div>
      </div>
    </div>
    <div v-if="showDirectShipModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="closeDirectShipModal"></div>
      <div class="relative z-10 w-full max-w-lg rounded-2xl bg-white border border-slate-100 shadow-2xl p-6">
        <h3 class="text-lg font-black text-slate-900 mb-4">顾问主动发货</h3>
        <div class="grid grid-cols-1 gap-3">
          <select
            v-model="directShipClientId"
            class="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="" disabled>请选择客户</option>
            <option v-for="client in directShipClients" :key="client._id" :value="client._id">
              {{ getClientOptionLabel(client) }}
            </option>
          </select>
          <select
            v-model="directShipProductId"
            class="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="" disabled>请选择商品</option>
            <option v-for="product in directShipProducts" :key="product._id" :value="product.product_id || product._id">
              {{ getProductOptionLabel(product) }}
            </option>
          </select>
          <input
            v-model.number="directShipQuantity"
            type="number"
            min="1"
            placeholder="发货数量"
            class="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <input
            v-model.trim="directShipTrackingNo"
            type="text"
            placeholder="请输入快递单号"
            class="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <input
            v-model.trim="directShipDeliveryPhoto"
            type="text"
            placeholder="物流照片URL（可选）"
            class="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div class="mt-3 flex items-center gap-3">
          <button
            @click="pickAndUploadDeliveryPhoto('direct')"
            class="h-9 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 hover:bg-emerald-100"
          >
            {{ directUploadingPhoto ? '上传中...' : '上传物流照片' }}
          </button>
          <a
            v-if="directShipDeliveryPhoto"
            :href="directShipDeliveryPhoto"
            target="_blank"
            class="text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            预览图片
          </a>
        </div>
        <div v-if="directShipDeliveryPhoto" class="mt-3">
          <img
            v-if="!directPhotoPreviewError"
            :src="directShipDeliveryPhoto"
            alt="物流照片预览"
            class="w-full h-40 object-cover rounded-xl border border-slate-200 cursor-zoom-in"
            @click="openPhotoPreview(directShipDeliveryPhoto)"
            @error="directPhotoPreviewError = true"
          />
          <div
            v-else
            class="w-full h-16 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center"
          >
            图片加载失败，请检查链接或重新上传
          </div>
        </div>
        <div class="mt-5 flex gap-3">
          <button @click="closeDirectShipModal" class="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">
            取消
          </button>
          <button @click="submitDirectShipOrder" class="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
            {{ directShipSubmitting ? '提交中...' : '确认发货' }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="showTrackingModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="closeShipModal"></div>
      <div class="relative z-10 w-full max-w-md rounded-2xl bg-white border border-slate-100 shadow-2xl p-6">
        <h3 class="text-lg font-black text-slate-900 mb-2">{{ trackingModalMode === 'ship' ? '填写物流单号' : '修改物流信息' }}</h3>
        <p class="text-xs text-slate-500 mb-4">
          {{ selectedOrder?.username || '客户' }} · {{ selectedOrder?.item_name || '补货订单' }}
        </p>
        <input
          v-model.trim="trackingNoInput"
          type="text"
          placeholder="请输入快递单号"
          class="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        <input
          v-model.trim="deliveryPhotoInput"
          type="text"
          placeholder="物流照片URL（可选）"
          class="w-full h-11 px-3 mt-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
        <div class="mt-3 flex items-center gap-3">
          <button
            @click="pickAndUploadDeliveryPhoto('tracking')"
            class="h-9 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 hover:bg-emerald-100"
          >
            {{ uploadingPhoto ? '上传中...' : '上传物流照片' }}
          </button>
          <a
            v-if="deliveryPhotoInput"
            :href="deliveryPhotoInput"
            target="_blank"
            class="text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            预览图片
          </a>
        </div>
        <div v-if="deliveryPhotoInput" class="mt-3">
          <img
            v-if="!photoPreviewError"
            :src="deliveryPhotoInput"
            alt="物流照片预览"
            class="w-full h-40 object-cover rounded-xl border border-slate-200 cursor-zoom-in"
            @click="openPhotoPreview(deliveryPhotoInput)"
            @error="photoPreviewError = true"
          />
          <div
            v-else
            class="w-full h-16 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center"
          >
            图片加载失败，请检查链接或重新上传
          </div>
        </div>
        <div class="mt-5 flex gap-3">
          <button @click="closeShipModal" class="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50">
            取消
          </button>
          <button @click="submitTrackingModal" class="flex-1 h-10 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
            {{ trackingModalMode === 'ship' ? '确认发货' : '保存物流' }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="showPhotoPreview" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" @click="closePhotoPreview"></div>
      <div class="relative z-10 max-w-[90vw] max-h-[90vh]">
        <button
          @click="closePhotoPreview"
          class="absolute -top-10 right-0 h-8 px-3 rounded-lg bg-white/20 text-white text-xs font-bold border border-white/30 hover:bg-white/30"
        >
          关闭
        </button>
        <img
          :src="photoPreviewUrl"
          alt="物流照片大图"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-xl border border-white/20 shadow-2xl"
        />
      </div>
    </div>
    
    <!-- 【调试】任务详情弹窗 -->
    <div v-if="showTaskDebug" class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center" @click="closeTaskDebugModal">
      <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" @click.stop>
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-lg">{{ debugClientName }} - {{ debugSlotName }}任务详情</h3>
          <button @click="closeTaskDebugModal" class="text-slate-400 hover:text-slate-600">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="space-y-3">
          <div v-for="(task, idx) in debugTaskList" :key="idx" class="flex justify-between items-center py-3 border-b border-slate-100">
            <div class="flex-1 mr-4">
              <div class="font-bold text-slate-900">{{ task.product_name || task.name }}</div>
              <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                <span class="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">来源: {{ task.template_name || '未知方案' }}</span>
                <span>ID: {{ task.product_id || '无' }}</span>
              </div>
            </div>
            <span :class="task.completed ? 'text-emerald-600 font-black' : 'text-rose-500 font-bold'">
              {{ task.completed ? '✓ 已完成' : '✗ 未完成' }}
            </span>
          </div>
          <div v-if="debugTaskList.length === 0" class="text-center text-slate-400 py-4">
            暂无任务数据
          </div>
        </div>
        <button class="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium" @click="closeTaskDebugModal">
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { callCloud, getAuthToken } from '@/utils/cloud';
import { getUserInfo } from '@/utils/storage';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import { 
  RefreshCw, 
  Package, 
  Users, 
  AlertTriangle, 
  ArrowUpRight,
  FileText,
  Bell,
  MessageCircle,
  Phone,
  X,
  ChevronRight,
  ChevronDown,
  Droplets,
  Activity,
  Smile,
  CheckCircle2,
  Circle,
  AlertCircle,
  UserPlus
} from 'lucide-vue-next';

// State
const loading = ref(false);
const activeTab = ref<'highRisk' | 'rpsRisk' | 'orders'>('orders');
const dashboardTab = ref<'today' | 'continuous'>('today'); // 【新增】今日关注/持续关注切换
const rpsReasonFilter = ref<'all' | 'low' | 'regression'>('all');
const expandedClients = ref<Set<string>>(new Set()); // 【新增】控制展开的客户详情

// 【新增】切换客户展开状态
const toggleClientExpand = (clientId: string) => {
  const newSet = new Set(expandedClients.value);
  if (newSet.has(clientId)) {
    newSet.delete(clientId);
  } else {
    newSet.add(clientId);
  }
  expandedClients.value = newSet;
};

// 新手引导状态
const showOnboarding = ref(true);
const onboardingStep = ref(1);

// 检查是否显示新手引导（根据客户数量和本地存储）
const checkOnboardingStatus = () => {
  const dismissed = uni.getStorageSync('onboarding_dismissed');
  if (dismissed) {
    showOnboarding.value = false;
    return;
  }
  // 有客户后自动进入步骤2
  if (stats.value.totalClients > 0) {
    onboardingStep.value = 2;
  }
};

// 关闭新手引导
const dismissOnboarding = () => {
  showOnboarding.value = false;
  uni.setStorageSync('onboarding_dismissed', true);
};

const stats = ref({
  totalClients: 0,
  activeClients: 0,
  wromAvg: 0,
  lowStockCount: 0,
  pendingOrdersCount: 0
});
const showNotificationPanel = ref(false);
const recentNotifications = ref<any[]>([]);
const unreadNotificationCount = computed(() => recentNotifications.value.filter((item) => !item?.read_at).length);

// 【新增】客户消息系统
const showMessagePanel = ref(false);
const clientMessages = ref<any[]>([]);
const unreadClientMessagesCount = computed(() => clientMessages.value.filter((item) => !item?.read_at && item?.sender_role === 'client').length);
const highRiskClients = ref<any[]>([]);

// 【调试】任务详情弹窗
const showTaskDebug = ref(false);
const debugClientName = ref('');
const debugSlotName = ref('');
const debugTaskList = ref<any[]>([]);

const showTaskDebugModal = (client: any, slot: string, status: any) => {
  debugClientName.value = client.username || client.nickname || '未知客户';
  debugSlotName.value = getSlotLabel(slot);
  
  // 【回归本质】不进行去重，真实反映数据库中的每一项，但增加来源显示
  debugTaskList.value = status?.items || [];
  showTaskDebug.value = true;
  
  console.log('[Dashboard Debug] 任务详情(全量透明):', {
    client: debugClientName.value,
    slot: slot,
    tasks: debugTaskList.value.map(t => ({ 
      name: t.product_name || t.name, 
      id: t.product_id,
      from: t.template_name || '未知方案'
    }))
  });
};

const closeTaskDebugModal = () => {
  showTaskDebug.value = false;
};
const lowStockClients = ref<any[]>([]);
const repurchaseRiskClients = ref<any[]>([]);
const lowWromClients = ref<any[]>([]); // 【新增】WROM 低分客户
const pendingOrders = ref<any[]>([]);
const shippedOrders = ref<any[]>([]);
const missedCheckInClients = ref<any[]>([]);
const showTrackingModal = ref(false);
const selectedOrder = ref<any>(null);
const trackingNoInput = ref('');
const deliveryPhotoInput = ref('');
const uploadingPhoto = ref(false);
const photoPreviewError = ref(false);
const showDirectShipModal = ref(false);
const directShipSubmitting = ref(false);
const directShipClients = ref<any[]>([]);
const directShipProducts = ref<any[]>([]);
const directShipClientId = ref('');
const directShipProductId = ref('');
const directShipQuantity = ref(1);
const directShipTrackingNo = ref('');
const directShipDeliveryPhoto = ref('');
const directUploadingPhoto = ref(false);
const directPhotoPreviewError = ref(false);
const showPhotoPreview = ref(false);
const photoPreviewUrl = ref('');
const trackingModalMode = ref<'ship' | 'edit'>('ship');

watch(deliveryPhotoInput, () => {
  photoPreviewError.value = false;
});
watch(directShipDeliveryPhoto, () => {
  directPhotoPreviewError.value = false;
});

const currentDate = computed(() => {
  const date = new Date();
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });
});

const navigateTo = (url: string) => {
  uni.navigateTo({ url });
};

const fetchNotifications = async () => {
  if (!getAuthToken()) return
  try {
    const userInfo = getUserInfo();
    if (!userInfo?._id) return;
    
    const res = await callCloud('client-api', {
      action: 'getNotifications',
      payload: { userId: userInfo._id, limit: 10 }
    });
    
    if (res.ok && res.data) {
      recentNotifications.value = (res.data as any[]) || [];
    }
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
  }
};

// 【新增】获取客户消息
const fetchClientMessages = async () => {
  if (!getAuthToken()) return
  try {
    const userInfo = getUserInfo();
    if (!userInfo?._id) return;
    
    // 获取所有分配给我的客户的消息
    const res = await callCloud('client-api', {
      action: 'getAdminClientMessages',
      payload: { 
        nutritionistId: userInfo._id,
        limit: 50
      }
    });
    
    if (res.ok && res.data) {
      clientMessages.value = (res.data as any[]) || [];
    }
  } catch (err) {
    console.error('Failed to fetch client messages:', err);
  }
};

// 【新增】标记客户消息为已读
const markClientMessageRead = async (messageId: string, clientId: string) => {
  if (!messageId) return;
  
  const res = await callCloud('client-api', {
    action: 'markClientMessageRead',
    payload: { messageId, clientId }
  });
  
  if (res.ok) {
    const index = clientMessages.value.findIndex(m => m._id === messageId);
    if (index > -1) {
      clientMessages.value[index].read_at = Date.now();
    }
  }
};

const markNotificationRead = async (notificationId: string) => {
  const userInfo = getUserInfo();
  if (!userInfo?._id || !notificationId) return;
  
  const res = await callCloud('client-api', {
    action: 'markNotificationRead',
    payload: { userId: userInfo._id, notificationId }
  });
  
  if (res.ok) {
    const index = recentNotifications.value.findIndex(n => n._id === notificationId);
    if (index > -1) {
      recentNotifications.value[index].read_at = Date.now();
    }
  }
};

const navigateToClient = (clientId: string, section: 'checkin' | 'inventory' | 'symptom' = 'checkin') => {
  if (!clientId) return;
  uni.navigateTo({ url: `/pages/admin/clients/index?openId=${clientId}&openSection=${section}` });
};

const formatDate = (timestamp: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  });
};

const markAdminNotificationRead = async (notificationId: string) => {
  const userInfo = getUserInfo();
  const userId = userInfo ? userInfo._id : '';
  if (!userId || !notificationId) return;
  const res = await callCloud('client-api', {
    action: 'markNotificationRead',
    payload: { userId, notificationId }
  });
  if (!res.ok) return;
  recentNotifications.value = recentNotifications.value.map((item: any) => (
    item?._id === notificationId ? { ...item, read_at: Date.now() } : item
  ));
};

const openAdminNotification = async (notification: any) => {
  if (!notification) return;
  const notificationId = String(notification?._id || '');
  if (!notification?.read_at && notificationId) {
    try {
      await markAdminNotificationRead(notificationId);
    } catch (error) {
      console.error('mark admin notification failed', error);
    }
  }
  const targetClientId = String(notification?.metadata?.client_id || notification?.target_user_id || '');
  if (targetClientId) {
    navigateToClient(targetClientId, 'inventory');
  }
};

const fetchDashboardData = async () => {
  if (!getAuthToken()) return
  loading.value = true;
  try {
    // H5 端优先从 localStorage 读取
    let userInfo = null;
    // #ifdef H5
    const localUserInfo = localStorage.getItem('userInfo');
    if (localUserInfo) {
      try {
        userInfo = JSON.parse(localUserInfo);
      } catch (e) {
        console.error('Parse userInfo from localStorage failed:', e);
      }
    }
    // #endif
    
    // 如果从 localStorage 没读到，再尝试 uni storage
    if (!userInfo) {
      userInfo = getUserInfo();
    }
    
    if (!userInfo || !userInfo._id) {
      uni.showToast({ title: '请先登录', icon: 'none' });
      // 未登录，跳转到登录页
      setTimeout(() => {
        uni.redirectTo({ url: '/pages/common/login/index' });
      }, 1500);
      return;
    }

    const res = await callCloud('client-api', {
      action: 'getAdminDashboardData',
      payload: { userId: userInfo._id }
    });

    if (res.ok) {
      const data = (res.data as any) || {};
      console.log('[Dashboard] API response:', data);
      
      stats.value = {
        totalClients: data.totalClients || 0,
        activeClients: data.totalClients || 0,
        wromAvg: 0,
        lowStockCount: data.lowStockCount || 0,
        pendingOrdersCount: data.pendingOrdersCount || 0
      };
      // 【修改】优先使用体感分数过低的需要关注客户列表
      highRiskClients.value = data.needsAttentionClients || data.highRiskClients || data.attention || [];
      lowStockClients.value = data.lowStockClients || [];
      pendingOrders.value = data.pendingOrders || data.refills || [];
      missedCheckInClients.value = data.missedCheckIns || data.pendingCheckIns || [];

      const existingIds = new Set(missedCheckInClients.value.map((c: any) => c._id));
      try {
        const allClientsRes = await callCloud<any[]>('client-api', {
          action: 'getClients',
          payload: { userId: userInfo._id }
        });
        if (allClientsRes.ok) {
          const extra = (allClientsRes.data || []).filter((c: any) => {
            if (existingIds.has(c._id)) return false;
            const checkin = c.today_checkin || {};
            const hasPlan = c.assigned_templates && c.assigned_templates.length > 0;
            const isDone = checkin.status === 'completed';
            return !isDone;
          });
          missedCheckInClients.value = [...missedCheckInClients.value, ...extra];
        }
      } catch (e) {}
      
      // 【新增】从需要关注客户中筛选 WROM 低分客户（WROM < 60）
      lowWromClients.value = (data.needsAttentionClients || []).filter((client: any) => {
        const wromScore = client.wrom_score || client.wromScore || 0;
        return wromScore > 0 && wromScore < 60;
      });
      
      // 【调试】打印每个未打卡客户的详细信息
      console.log('[Dashboard] === 未打卡客户详情 ===');
      missedCheckInClients.value.forEach((client: any, index: number) => {
        console.log(`[Dashboard] 客户${index + 1}: ${client.username || client.nickname || '未命名'} (${client._id})`);
        console.log(`[Dashboard]   - 打卡状态:`, client.today_checkin);
      });
      console.log('[Dashboard] ====================');
      
      // 【调试】打印需要关注客户的详细信息
      console.log('[Dashboard] === 需要关注客户详情 ===');
      highRiskClients.value.forEach((client: any, index: number) => {
        console.log(`[Dashboard] 客户${index + 1}: ${client.username || client.nickname || '未命名'} (${client._id})`);
        console.log(`[Dashboard]   - 关注原因:`, client.attention_reason);
        console.log(`[Dashboard]   - 打卡状态:`, client.today_checkin);
        console.log(`[Dashboard]   - sectionStatus:`, client.today_checkin?.sectionStatus);
      });
      console.log('[Dashboard] ====================');
    } else {
      uni.showToast({ title: res.msg || '数据加载失败', icon: 'none' });
    }
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    uni.showToast({ title: '网络错误', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const getCheckInDescription = (client: any) => {
  const checkin = client?.today_checkin || {};
  const sectionStatus = checkin?.sectionStatus;
  
  // 【修复】优先使用 sectionStatus 计算任务数量
  if (sectionStatus?.tasks) {
    let totalTasks = 0;
    let completedTasks = 0;
    
    Object.entries(sectionStatus.tasks).forEach(([slot, status]: [string, any]) => {
      if (status?.items?.length > 0) {
        totalTasks += status.items.length;
        completedTasks += status.items.filter((t: any) => t.completed).length;
      }
    });
    
    if (totalTasks > 0) {
      return `今日打卡 ${completedTasks}/${totalTasks}`;
    }
  }
  
  // 回退到旧数据格式
  const completed = Number(checkin.completed || 0);
  const total = Number(checkin.total || 0);
  if (total <= 0) {
    return '今日未开始打卡';
  }
  return `今日打卡 ${completed}/${total}`;
};
const getRepurchaseAlertText = (client: any) => {
  if (String(client?.alert_reason || '') === 'followup_review_regression') {
    const delta = Number(client?.delta_rps || 0);
    return `复核后 RPS 下降 ${Math.abs(delta)} 分，建议立即复盘执行策略`;
  }
  return '建议优先跟进补货节奏与履约体验';
};

// 【新增】生成需要关注客户的准确状态描述
const getRiskClientDescription = (client: any) => {
  const sectionStatus = client?.today_checkin?.sectionStatus;
  const symptomsCompleted = sectionStatus?.symptoms?.completed;
  const symptomsScore = sectionStatus?.symptoms?.score;
  const metricsCompleted = sectionStatus?.metrics?.completed;
  const attentionReason = client?.attention_reason;
  const wromScore = client?.wrom_score || 0;

  const parts: string[] = [];

  // 体感状态描述
  if (!symptomsCompleted) {
    parts.push('体感未反馈');
  } else if (symptomsScore <= 3) {
    // 【深度优化】聚合所有分值过低（<= 2分）的异常体感指标
    const details = sectionStatus?.symptoms?.details || [];
    const abnormalItems: string[] = [];
    
    if (Array.isArray(details)) {
      details.forEach((item: any) => {
        if (item.value !== undefined && item.value !== null && Number(item.value) <= 2) {
          abnormalItems.push(item.label || item.name || item.title);
        }
      });
    }
    
    if (abnormalItems.length > 0) {
      parts.push(`体感评分低: ${symptomsScore.toFixed(1)}分 (异常: ${abnormalItems.join('、')})`);
    } else {
      parts.push(`体感分数过低 (${symptomsScore.toFixed(1)})`);
    }
  } else {
    parts.push(`体感已反馈 (${symptomsScore.toFixed(1)})`);
  }

  // 健康指标状态描述
  if (!metricsCompleted) {
    parts.push('健康指标未填写');
  } else {
    parts.push('健康指标已完成');
  }

  // WROM 状态（如果是 WROM 低的情况）
  if (attentionReason === 'low_wrom' && wromScore > 0) {
    parts.push(`WROM ${wromScore}分(低于60)`);
  }

  return parts.join('，');
};

// 【新增】时段标签转换
const getSlotLabel = (slot: string) => {
  const map: Record<string, string> = {
    morning: '早晨',
    noon: '中午',
    evening: '晚上',
    bedtime: '睡前'
  };
  return map[slot] || slot;
};

const filteredRepurchaseRiskClients = computed(() => {
  if (rpsReasonFilter.value === 'all') return repurchaseRiskClients.value;
  if (rpsReasonFilter.value === 'low') {
    return repurchaseRiskClients.value.filter((client) => String(client?.alert_reason || 'rps_low_score') === 'rps_low_score');
  }
  return repurchaseRiskClients.value.filter((client) => String(client?.alert_reason || '') === 'followup_review_regression');
});

const resClone = (items: any[]) => Array.isArray(items) ? items.map((item) => ({ ...item })) : [];

const getClientOptionLabel = (client: any) => {
  const name = client?.username || client?.nickname || '客户';
  const phone = client?.phone ? String(client.phone) : '';
  return phone ? `${name} (${phone.slice(-4)})` : name;
};

const getProductOptionLabel = (product: any) => {
  const name = product?.name || '未命名商品';
  const stock = Number(product?.stock || 0);
  const unit = product?.unit || '瓶';
  return `${name} · 库存 ${stock}${unit}`;
};

const loadDirectShipOptions = async () => {
  // H5 端优先从 localStorage 读取
  let userInfo = null;
  // #ifdef H5
  const localUserInfo = localStorage.getItem('userInfo');
  if (localUserInfo) {
    try {
      userInfo = JSON.parse(localUserInfo);
    } catch (e) {
      console.error('Parse userInfo failed:', e);
    }
  }
  // #endif
  if (!userInfo) {
    userInfo = getUserInfo();
  }
  
  const userId = userInfo ? userInfo._id : '';
  if (!userId) return;
  if (!directShipClients.value.length) {
    const clientsRes = await callCloud<any[]>('client-api', {
      action: 'getClients',
      payload: { userId }
    });
    if (clientsRes.ok) {
      directShipClients.value = resClone(clientsRes.data || []);
    }
  }
  if (!directShipProducts.value.length) {
    const productsRes = await callCloud<any[]>('client-api', {
      action: 'getProducts',
      payload: { userId }
    });
    if (productsRes.ok) {
      directShipProducts.value = resClone(productsRes.data || []);
    }
  }
};

const openDirectShipModal = async () => {
  await loadDirectShipOptions();
  if (!directShipClientId.value && directShipClients.value.length) {
    directShipClientId.value = String(directShipClients.value[0]?._id || '');
  }
  if (!directShipProductId.value && directShipProducts.value.length) {
    directShipProductId.value = String(directShipProducts.value[0]?.product_id || directShipProducts.value[0]?._id || '');
  }
  directShipQuantity.value = Math.max(1, Number(directShipQuantity.value || 1));
  showDirectShipModal.value = true;
};

const closeDirectShipModal = () => {
  showDirectShipModal.value = false;
  directShipSubmitting.value = false;
  directShipQuantity.value = 1;
  directShipTrackingNo.value = '';
  directShipDeliveryPhoto.value = '';
  directUploadingPhoto.value = false;
  directPhotoPreviewError.value = false;
};

const submitDirectShipOrder = async () => {
  if (directShipSubmitting.value) return;
  const clientId = String(directShipClientId.value || '').trim();
  const productId = String(directShipProductId.value || '').trim();
  const trackingNo = String(directShipTrackingNo.value || '').trim();
  const deliveryPhoto = String(directShipDeliveryPhoto.value || '').trim();
  const quantity = Math.max(1, Number(directShipQuantity.value || 1));
  if (!clientId) {
    uni.showToast({ title: '请选择客户', icon: 'none' });
    return;
  }
  if (!productId) {
    uni.showToast({ title: '请选择商品', icon: 'none' });
    return;
  }
  if (!trackingNo) {
    uni.showToast({ title: '请填写物流单号', icon: 'none' });
    return;
  }
  if (!getAuthToken()) {
    uni.showToast({ title: '登录状态失效，请重新登录', icon: 'none' });
    return;
  }
  directShipSubmitting.value = true;
  uni.showLoading({ title: '处理中...' });
  try {
    const userInfo = getUserInfo();
    const result = await callCloud('client-api', {
      action: 'createDirectShipOrder',
      payload: {
        userId: userInfo ? userInfo._id : '',
        clientId,
        productId,
        quantity,
        trackingNo,
        deliveryPhoto
      }
    });
    if (result.ok) {
      uni.showToast({ title: '主动发货成功', icon: 'success' });
      closeDirectShipModal();
      activeTab.value = 'orders';
      await fetchDashboardData();
      return;
    }
    uni.showToast({ title: result.msg || '操作失败', icon: 'none' });
  } catch (err) {
    console.error('Direct ship failed:', err);
    uni.showToast({ title: '操作失败', icon: 'none' });
  } finally {
    uni.hideLoading();
    directShipSubmitting.value = false;
  }
};

const openShipModal = (order: any) => {
  trackingModalMode.value = 'ship';
  selectedOrder.value = order;
  trackingNoInput.value = '';
  deliveryPhotoInput.value = '';
  showTrackingModal.value = true;
};

const openEditLogisticsModal = (order: any) => {
  trackingModalMode.value = 'edit';
  selectedOrder.value = order;
  trackingNoInput.value = String(order?.tracking_no || '').trim();
  deliveryPhotoInput.value = String(order?.delivery_photo || '').trim();
  showTrackingModal.value = true;
};

const closeShipModal = () => {
  showTrackingModal.value = false;
  selectedOrder.value = null;
  trackingNoInput.value = '';
  deliveryPhotoInput.value = '';
  uploadingPhoto.value = false;
  photoPreviewError.value = false;
  trackingModalMode.value = 'ship';
};

const openPhotoPreview = (url: string) => {
  const normalizedUrl = String(url || '').trim();
  if (!normalizedUrl) return;
  photoPreviewUrl.value = normalizedUrl;
  showPhotoPreview.value = true;
};

const closePhotoPreview = () => {
  showPhotoPreview.value = false;
  photoPreviewUrl.value = '';
};

const pickAndUploadDeliveryPhoto = async (target: 'tracking' | 'direct' = 'tracking') => {
  if (target === 'tracking' && uploadingPhoto.value) return;
  if (target === 'direct' && directUploadingPhoto.value) return;
  try {
    const chooseRes = await new Promise<any>((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        success: resolve,
        fail: reject
      });
    });
    const filePath = String(chooseRes?.tempFilePaths?.[0] || '');
    if (!filePath) return;
    if (target === 'tracking') {
      uploadingPhoto.value = true;
    } else {
      directUploadingPhoto.value = true;
    }
    const extension = (filePath.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
    const cloudPath = `delivery-photo/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;
    const uploadRes: any = await uniCloud.uploadFile({
      cloudPath,
      filePath
    });
    const fileURL = String(uploadRes?.fileID || uploadRes?.tempFileURL || '');
    if (!fileURL) {
      uni.showToast({ title: '上传失败', icon: 'none' });
      return;
    }
    if (target === 'tracking') {
      deliveryPhotoInput.value = fileURL;
    } else {
      directShipDeliveryPhoto.value = fileURL;
    }
    uni.showToast({ title: '图片已上传', icon: 'success' });
  } catch (err: any) {
    const message = String(err?.errMsg || err?.message || '');
    if (message.includes('cancel')) return;
    uni.showToast({ title: '上传失败', icon: 'none' });
  } finally {
    if (target === 'tracking') {
      uploadingPhoto.value = false;
    } else {
      directUploadingPhoto.value = false;
    }
  }
};

const submitTrackingModal = async () => {
  const orderId = selectedOrder.value?._id;
  const trackingNo = String(trackingNoInput.value || '').trim();
  const deliveryPhoto = String(deliveryPhotoInput.value || '').trim();
  if (!orderId) return;
  if (!trackingNo) {
    uni.showToast({ title: '请先填写物流单号', icon: 'none' });
    return;
  }
  if (!getAuthToken()) {
    uni.showToast({ title: '登录状态失效，请重新登录', icon: 'none' });
    return;
  }
  uni.showLoading({ title: '处理中...' });
  try {
    const userInfo = getUserInfo();
    const result = await callCloud('client-api', {
      action: trackingModalMode.value === 'ship' ? 'shipOrder' : 'updateOrderLogistics',
      payload: {
        orderId,
        trackingNo,
        deliveryPhoto,
        userId: userInfo ? userInfo._id : ''
      }
    });
    if (result.ok) {
      uni.showToast({ title: trackingModalMode.value === 'ship' ? '发货成功' : '物流已更新', icon: 'success' });
      closeShipModal();
      await fetchDashboardData();
      return;
    }
    uni.showToast({ title: result.msg || '操作失败', icon: 'none' });
  } catch (err) {
    console.error('Ship order failed:', err);
    uni.showToast({ title: '操作失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

// 自动刷新定时器
let autoRefreshInterval: NodeJS.Timeout | null = null;

onMounted(() => {
  console.log('=== Dashboard Mounted ===');
  try {
    console.log('Fetching dashboard data...');
    fetchDashboardData().then(() => {
      // 数据加载完成后检查新手引导状态
      checkOnboardingStatus();
    });
  } catch (err) {
    console.error('Dashboard data fetch error:', err);
  }
  
  try {
    console.log('Fetching notifications...');
    fetchNotifications();
  } catch (err) {
    console.error('Notifications fetch error:', err);
  }
  
  // 【新增】获取客户消息
  try {
    console.log('Fetching client messages...');
    fetchClientMessages();
  } catch (err) {
    console.error('Client messages fetch error:', err);
  }
  
  // 【新增】每 30 秒自动刷新数据，实时同步小程序更新
  autoRefreshInterval = setInterval(() => {
    console.log('[AutoRefresh] Refreshing dashboard data...');
    fetchDashboardData();
    fetchClientMessages(); // 【新增】同步刷新客户消息
  }, 30000);
});

onUnmounted(() => {
  // 【新增】清理定时器
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
});
</script>

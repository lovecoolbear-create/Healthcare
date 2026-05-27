<template>
  <view>
    <!-- #ifdef H5 -->
    <DesktopClients v-if="isDesktop" :initialOpenId="initialOpenId" :initialOpenSection="initialOpenSection" :initialFilter="initialFilter" />
    <!-- #endif -->

    <!-- Mobile Client List -->
    <view v-if="!isDesktop" class="mp-page-shell h-screen flex flex-col overflow-hidden bg-transparent">
    <!-- 1. Top Search Bar -->
    <view class="bg-slate-900 px-5 pt-12 pb-16 sticky top-0 z-40 shadow-lg shadow-slate-200/50">
      <view class="flex items-center gap-3 h-10 justify-between">
        <view>
          <text class="text-xl font-black text-white tracking-tight block">客户列表</text>
          <text class="text-[10px] text-slate-400 block mt-0.5">{{ clientsLastUpdatedText }}</text>
        </view>
        <view v-if="initialFilter === 'pendingCheckIn'" class="px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full">
          <text class="text-[10px] font-bold text-amber-400">未打卡筛选中</text>
        </view>
      </view>
    </view>
    
    <!-- Search (Scrollable) -->
    <!-- Negative margin to create overlap effect -->
    <view class="px-5 -mt-10 relative z-50 flex items-center gap-3">
      <view class="relative flex-1">
        <view class="absolute left-3 top-2.5 text-slate-400 z-10">
          <text class="text-sm">🔍</text>
        </view>
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜索姓名..." 
          class="w-full h-10 bg-white border border-slate-200 shadow-xl shadow-slate-200/50 text-slate-900 text-sm font-bold rounded-xl pl-9 pr-4 placeholder:text-slate-400 box-border"
        />
      </view>
      
      <!-- Add Button (Moved here) -->
      <view 
        class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-xl shadow-emerald-500/30 border border-emerald-400 flex-none mp-pressable" 
        @click="navigateToAdd"
      >
        <text class="text-white text-xl font-bold mb-0.5">+</text>
      </view>
    </view>

    <!-- 2. Simplified Client List -->
    <scroll-view scroll-y class="flex-1 min-h-0 w-full">
      <view class="px-5 mt-4 space-y-3">
        <view 
          v-for="client in filteredClients" 
          :key="client.id"
          class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mp-pressable"
          @click="openClientDrawer(client, 'overview')"
        >
          <!-- Top: Avatar + Name + Scores -->
          <view class="flex items-center justify-between">
            <!-- Left: Avatar & Info -->
            <view class="flex items-center gap-3 flex-1 min-w-0">
              <view class="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-black text-white text-base shrink-0 shadow-sm">
                {{ client.name ? client.name[0] : '?' }}
              </view>
              <view class="min-w-0 flex-1">
                <view class="flex items-center gap-2">
                  <text class="font-bold text-slate-900 text-[15px] truncate">{{ client.name }}</text>
                  <view v-if="client.activeProtocolCount > 0" class="shrink-0 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-full border border-emerald-200">
                    {{ client.activeProtocolCount }}个方案
                  </view>
                </view>
                <text class="text-[11px] text-slate-400 truncate block mt-0.5">{{ getCheckInSummaryText(client) }}</text>
              </view>
            </view>

            <!-- Right: WROM / RPS -->
            <view class="flex items-center gap-3 shrink-0 ml-3">
              <view class="text-right">
                <text class="text-lg font-black block leading-tight" :class="getScoreColor(client.wrom)">W{{ client.wrom }}</text>
                <text class="text-xs font-bold block leading-tight mt-0.5" :class="getScoreColor(client.rps)">R{{ client.rps }}</text>
              </view>
              <view v-if="client.trend !== 0" class="w-6 h-6 rounded-full flex items-center justify-center shrink-0" :class="client.trend > 0 ? 'bg-emerald-50' : 'bg-rose-50'">
                <text class="text-[12px] font-bold" :class="client.trend > 0 ? 'text-emerald-500' : 'text-rose-500'">{{ client.trend > 0 ? '↑' : '↓' }}</text>
              </view>
            </view>
          </view>

          <!-- Bottom: Tags + Actions -->
          <view class="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
            <!-- Left: Status Tags -->
            <view class="flex items-center gap-1.5 flex-wrap">
              <view v-if="client.needsRefill" class="flex items-center gap-0.5 px-2 py-0.5 bg-amber-50 rounded-md mp-pressable" @tap.stop="handleRefill(client)">
                <text class="text-[10px]">📦</text>
                <text class="text-[10px] font-bold text-amber-600">需补货</text>
              </view>
              <view v-else class="flex items-center gap-0.5 px-2 py-0.5 bg-slate-50 rounded-md">
                <text class="text-[10px]">📦</text>
                <text class="text-[10px] font-medium text-slate-500">库存正常</text>
              </view>
              <view class="flex items-center gap-0.5 px-2 py-0.5 bg-slate-50 rounded-md">
                <text class="text-[10px]">🏆</text>
                <text class="text-[10px] font-medium text-slate-500">{{ client.points || 0 }}分</text>
              </view>
              <view v-if="client.streak_days > 0" class="flex items-center gap-0.5 px-2 py-0.5 bg-orange-50 rounded-md">
                <text class="text-[10px]">🔥</text>
                <text class="text-[10px] font-medium text-orange-500">{{ client.streak_days }}天</text>
              </view>
            </view>

            <!-- Right: Action Buttons -->
            <view class="flex items-center gap-2 shrink-0 ml-2">
              <view class="px-3 py-1.5 rounded-lg bg-slate-100 active:bg-slate-200 mp-pressable" @click.stop="goToClientDetail(client)">
                <text class="text-[11px] font-bold text-slate-600">详情</text>
              </view>
              <view class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center mp-pressable shadow-sm" @click.stop="goToAssignProtocol(client)">
                <text class="text-sm">📋</text>
              </view>
              <view class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center relative mp-pressable" @click.stop="openClientDrawer(client, 'chat')">
                <text class="text-sm">💬</text>
                <view v-if="client.unread" class="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border border-white"></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- Actions Area (Fixed Bottom of Content) -->
    <view class="px-5 py-4 bg-white/50 backdrop-blur-sm border-t border-slate-100 flex gap-3 flex-none mb-[calc(env(safe-area-inset-bottom)+64px)]">
      <view class="flex-1 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center gap-2 mp-pressable" @click="navigateToAdd">
         <text class="text-lg">+</text>
         <view class="flex flex-col items-start">
           <text class="text-xs font-bold text-slate-800">添加客户</text>
           <text class="text-[9px] text-slate-400">快速录入</text>
         </view>
      </view>
    </view>

    <!-- Bottom Navigation Bar -->
    <AdminTabBar :current="1" v-if="!isDesktop" />

  </view>
  </view>

  <!-- Client Bottom Sheet -->
  <view v-if="showDrawer" class="fixed inset-0 z-[200] flex items-end justify-center">
    <view class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeDrawer"></view>
    <!-- Bottom sheet with rounded top corners -->
    <view class="relative w-full max-w-lg bg-white shadow-2xl flex flex-col transform transition-transform duration-300 rounded-t-[32px] overflow-hidden max-h-[80vh]" :class="drawerAnimClass">
      <!-- Header with drag handle -->
      <view class="px-5 pt-4 pb-4 border-b border-slate-50 flex justify-between items-center bg-white z-10">
        <!-- Drag handle indicator -->
        <view class="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-300 rounded-full"></view>
        <view class="flex items-center gap-3 pt-2">
          <view class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center active:bg-slate-100 transition-colors mp-pressable" @click="closeDrawer">
            <text class="text-slate-500 text-lg">↓</text>
          </view>
          <view>
            <text class="text-lg font-black text-slate-900 block">{{ currentClient?.name }}</text>
            <view class="flex items-center gap-2 mt-0.5 flex-wrap">
              <view class="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded">WROM {{ currentClient?.wrom }}</view>
              <view class="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-[10px] font-bold rounded">RPS {{ currentClient?.rps }}</view>
              <!-- 积分徽章 -->
              <view v-if="currentClient?.points !== undefined" class="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded">🏆 {{ currentClient?.points }}分</view>
              <view v-if="currentClient?.streak_days !== undefined && currentClient?.streak_days > 0" class="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded">🔥 {{ currentClient?.streak_days }}天</view>
            </view>
          </view>
        </view>
        <view class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:bg-slate-100 transition-colors mp-pressable" @click="closeDrawer">
          <text class="text-lg">×</text>
        </view>
      </view>
           
      <view class="flex-1 p-4 bg-slate-50 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <view class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-4">
          <view class="flex justify-between items-center">
            <text class="font-bold text-slate-700">7日体感趋势</text>
            <view class="flex items-center gap-2">
              <text class="text-xs text-slate-400">最近更新: {{ currentClient?.lastCheckIn || '无数据' }}</text>
              <view class="mp-action-chip mp-pressable"
                :class="isTrendCollapsed ? '' : 'mp-action-chip--active'"
                @click="isTrendCollapsed = !isTrendCollapsed">
                <text class="text-[10px] font-bold"
                  :class="isTrendCollapsed ? 'text-slate-500' : 'text-emerald-600'">趋势详情</text>
                <text class="mp-chevron"
                  :class="isTrendCollapsed ? '' : 'mp-chevron--active'">▾</text>
              </view>
            </view>
          </view>
          <view class="overflow-hidden transition-all duration-300 ease-out" :class="isTrendCollapsed ? 'max-h-10 opacity-70 mt-2' : 'max-h-44 opacity-100 mt-4'">
            <view v-if="!isTrendCollapsed && !isDetailLoading" class="h-32 flex items-end justify-between px-2">
              <view v-for="(item, index) in trendChartData" :key="index" class="w-2 bg-slate-100 rounded-t-sm relative group flex flex-col justify-end items-center">
                <view class="w-full bg-emerald-400 rounded-t-sm transition-all duration-500" 
                      :class="getScoreColor(item.score).replace('text-', 'bg-')"
                      :style="{ height: item.score + '%' }"></view>
              </view>
            </view>
            <view v-else-if="!isTrendCollapsed" class="h-32 flex items-center justify-center text-slate-400 text-sm">
              加载中...
            </view>
            <view v-else class="pt-1">
              <text class="text-[11px] text-slate-400">已折叠，点击右侧箭头展开查看</text>
            </view>
          </view>
        </view>
      
        <view class="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden relative">
          <!-- Tabs Header -->
          <view class="flex-none flex border-b border-slate-100">
            <view 
              class="flex-1 py-3 text-center font-bold text-sm relative transition-colors mp-pressable"
              :class="activeDrawerTab === 'chat' ? 'text-emerald-600' : 'text-slate-400'"
              @click="activeDrawerTab = 'chat'"
            >
              沟通
              <view v-if="activeDrawerTab === 'chat'" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full"></view>
            </view>
            <view 
              class="flex-1 py-3 text-center font-bold text-sm relative transition-colors mp-pressable"
              :class="activeDrawerTab === 'overview' ? 'text-emerald-600' : 'text-slate-400'"
              @click="activeDrawerTab = 'overview'"
            >
              总览
              <view v-if="activeDrawerTab === 'overview'" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full"></view>
            </view>
          </view>

          <view class="w-full bg-slate-50/50">
            <view v-if="activeDrawerTab === 'chat'" class="p-4 pb-20 space-y-4">
              <template v-if="displayedInteractions.length > 0">
                <view v-for="log in displayedInteractions" :key="log._id || log.created_at" class="space-y-2">
                  <view class="text-center text-[10px] text-slate-300 py-2">{{ formatInteractionTime(log.created_at) }}</view>
                  <view class="flex gap-3" :class="{ 'flex-row-reverse': log.sender_role === 'nutritionist' }">
                    <view class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      :class="log.sender_role === 'nutritionist' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'">
                      {{ log.sender_role === 'nutritionist' ? nutritionistShortName : (currentClient?.name?.[0] || '客') }}
                    </view>
                    <view class="p-3 rounded-2xl shadow-sm text-sm max-w-[80%] border"
                      :class="log.sender_role === 'nutritionist' ? 'bg-emerald-500 text-white border-emerald-500 rounded-tr-none' : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'">
                      {{ log.content }}
                    </view>
                  </view>
                </view>
              </template>
              <view v-else class="text-center py-16">
                <text class="text-sm text-slate-400 font-bold block">暂无沟通记录</text>
                <text class="text-xs text-slate-300 mt-1 block">输入内容后发送首条消息</text>
              </view>
            </view>

            <!-- Plan Content -->
            <view v-else class="p-4 space-y-3">
               <view class="bg-white rounded-xl border border-slate-100 p-3">
                 <text class="text-xs font-bold text-slate-700 block mb-2">基本信息</text>
                 <view class="grid grid-cols-2 gap-y-2 text-xs">
                   <text class="text-slate-400">姓名</text><text class="text-slate-700 text-right">{{ currentClient?.name || '-' }}</text>
                   <text class="text-slate-400">手机号</text><text class="text-slate-700 text-right">{{ currentClient?.phone || '-' }}</text>
                   <text class="text-slate-400">WROM</text><text class="text-slate-700 text-right">{{ currentClient?.wrom ?? '-' }}</text>
                   <text class="text-slate-400">RPS</text><text class="text-slate-700 text-right">{{ currentClient?.rps ?? '-' }}</text>
                   <text v-if="!isDetailLoading" class="text-slate-400">打卡完成</text>
                   <text v-if="!isDetailLoading" class="text-slate-700 text-right">{{ detailCheckInSummary.completed }}/{{ detailCheckInSummary.total }}</text>
                   <!-- 积分系统 -->
                   <text class="text-slate-400">当前积分</text>
                   <text class="text-amber-600 font-bold text-right">🏆 {{ currentClient?.points ?? 0 }} 分</text>
                   <text class="text-slate-400">坚持天数</text>
                   <text class="text-orange-600 font-bold text-right">🔥 {{ currentClient?.streak_days ?? 0 }} 天</text>
                 </view>
               </view>

               <!-- 健康目标 -->
               <view class="bg-white rounded-xl border border-slate-100 p-3 mt-3">
                 <view class="flex items-center justify-between mb-2">
                   <text class="text-xs font-bold text-slate-700">阶段健康目标</text>
                   <text class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded mp-pressable" @click="openTargetsEditor">设定目标</text>
                 </view>
                 <view class="grid grid-cols-2 gap-y-2 text-xs">
                   <text class="text-slate-400">目标体重</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.weight || '60.0 KG' }}</text>
                   <text class="text-slate-400">目标体脂率</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.body_fat || '< 20%' }}</text>
                   <text class="text-slate-400">目标内脏脂肪</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.visceral_fat || '< 5' }}</text>
                   <text class="text-slate-400">目标血糖</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.glucose || '4.4-6.1' }}</text>
                   <text class="text-slate-400">每日饮水量</text><text class="text-slate-700 text-right font-bold">{{ clientDetail?.user?.health_targets?.water_glasses || '8' }} 杯</text>
                 </view>
              <view v-if="isDetailLoading" class="flex flex-col items-center justify-center py-20">
                <view class="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3"></view>
                <text class="text-sm text-slate-400 font-bold">正在获取详细方案...</text>
              </view>
              <template v-else>

                 <view class="bg-white rounded-xl border border-slate-100 p-3">
                   <view class="flex items-center justify-between mb-2">
                     <text class="text-xs font-bold text-slate-700">双评分总览</text>
                     <view class="bg-slate-100 rounded-lg p-1 flex gap-1">
                       <view class="px-2 h-6 rounded-md text-[10px] font-bold flex items-center justify-center"
                         :class="scoreOverviewTab === 'wrom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                         @click="scoreOverviewTab = 'wrom'">WROM</view>
                       <view class="w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center"
                         :class="scoreOverviewFormula === 'wrom' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'"
                         @click="toggleFormula('wrom')">?</view>
                       <view class="px-2 h-6 rounded-md text-[10px] font-bold flex items-center justify-center"
                         :class="scoreOverviewTab === 'rps' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                         @click="scoreOverviewTab = 'rps'">RPS</view>
                       <view class="w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center"
                         :class="scoreOverviewFormula === 'rps' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'"
                         @click="toggleFormula('rps')">?</view>
                     </view>
                   </view>
                   <view v-if="scoreOverviewFormula" class="rounded-lg border border-slate-200 bg-white px-2.5 py-2 mb-2">
                     <text class="text-[10px] font-bold block" :class="scoreOverviewFormula === 'wrom' ? 'text-emerald-600' : 'text-violet-600'">
                       {{ scoreOverviewFormula === 'wrom' ? 'WROM 公式说明' : 'RPS 公式说明' }}
                     </text>
                     <text class="text-[10px] text-slate-600 mt-1 block">
                       {{ scoreOverviewFormula === 'wrom'
                         ? 'WROM = 依从性(40) + 库存(30) + 体感(20) + 参与(10)。数据来自任务、库存、体感与行为记录。'
                         : 'RPS = 取消率(30) + 收货时延(25) + 复购周期(30) + 效果感知(15)。数据来自订单状态、履约时延、复购间隔与体感趋势。' }}
                     </text>
                   </view>
                   <view class="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 mb-2">
                     <text class="text-[10px] font-bold block" :class="scoreOverviewTab === 'wrom' ? 'text-emerald-600' : 'text-violet-600'">
                       {{ scoreOverviewTab === 'wrom' ? `健康评分 WROM ${currentClient?.wrom ?? 0}` : `复购评分 RPS ${currentClient?.rps ?? 70}` }}
                     </text>
                     <text class="text-[10px] text-slate-500 mt-1 block">
                       {{ scoreOverviewTab === 'wrom' ? '用于评估健康执行风险，指导健康干预优先级。' : '用于评估复购行为风险，指导运营跟进优先级。' }}
                     </text>
                   </view>
                   <view v-if="scoreOverviewTab === 'rps' && primaryRpsAction" class="rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-2 mb-2">
                     <text class="text-[10px] font-bold text-rose-600 block">首要跟进行动：{{ primaryRpsAction.label }}维度优先</text>
                     <text class="text-[10px] text-rose-500 mt-1 block">{{ primaryRpsAction.suggestion }}</text>
                     <view class="mt-2 h-6 px-2 rounded-md text-[10px] font-bold flex items-center justify-center"
                       :class="followUpActionLoading ? 'bg-slate-200 text-slate-500' : 'bg-rose-500 text-white mp-pressable'"
                       @click="completePrimaryFollowUpAction">{{ followUpActionLoading ? '处理中...' : '标记已执行' }}</view>
                   </view>
                   <view v-if="scoreOverviewTab === 'rps' && followUpActionHistory.length" class="rounded-lg border border-slate-100 bg-white px-2.5 py-2 mb-2 space-y-2">
                     <text class="text-[10px] font-bold text-slate-600 block">行动复核记录</text>
                     <view v-for="action in followUpActionHistory" :key="action._id" class="p-2 rounded-lg bg-slate-50 border border-slate-100">
                       <text class="text-[10px] font-bold text-slate-700 block">{{ action.title }}</text>
                       <text class="text-[10px] text-slate-500 mt-1 block">
                         {{ action.status === 'reviewed' ? `复核ΔWROM ${formatActionDelta(action.delta_wrom)} / ΔRPS ${formatActionDelta(action.delta_rps)}` : `待复核：${formatReviewDue(action.review_due_at)}` }}
                       </text>
                     </view>
                   </view>
                   <view class="space-y-2">
                     <view v-for="item in scoreOverviewItems" :key="item.key" class="rounded-lg border bg-slate-50 p-2" :class="scoreOverviewTab === 'rps' && item.isPrimary ? 'border-rose-200' : 'border-slate-100'">
                       <view class="flex items-center justify-between mb-1">
                         <text class="text-[11px] text-slate-600 font-bold">{{ item.label }}</text>
                         <text class="text-[11px] font-bold text-slate-700">{{ item.score }}/{{ item.max }}</text>
                       </view>
                       <view class="h-1.5 rounded-full bg-white border border-slate-100 overflow-hidden">
                         <view class="h-full rounded-full" :class="item.barClass" :style="{ width: `${item.percent}%` }"></view>
                       </view>
                       <text class="text-[10px] text-slate-400 mt-1 block">{{ item.suggestion }}</text>
                     </view>
                   </view>
                 </view>

                 <view class="bg-white rounded-xl border border-slate-100 p-3">
                   <view class="flex items-center justify-between mb-2">
                     <text class="text-xs font-bold text-slate-700">今日打卡明细</text>
                     <view class="flex items-center gap-2">
                       <text class="text-[10px] font-bold px-1.5 py-0.5 rounded" :class="detailCheckInSummary.completed >= detailCheckInSummary.total ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'">
                         {{ detailCheckInSummary.statusText }}
                       </text>
                       <text class="text-[10px] text-slate-400">{{ latestPlan?.date || '无数据' }}</text>
                     </view>
                   </view>
                   <view v-if="latestPlan?.tasks?.length" class="space-y-2">
                     <view v-for="(task, idx) in latestPlan.tasks" :key="idx" class="flex items-center justify-between text-xs">
                       <text class="text-slate-600">{{ task.name }}</text>
                       <text :class="task.completed ? 'text-emerald-500' : 'text-slate-400'">{{ task.completed ? '已完成' : '未完成' }}</text>
                     </view>
                   </view>
                   <view v-else class="text-xs text-slate-400">今日暂无打卡任务</view>
                 </view>

                 <view class="bg-white rounded-xl border border-slate-100 p-3">
                   <view class="flex items-center justify-between mb-2">
                     <text class="text-xs font-bold text-slate-700">库存明细</text>
                     <text class="text-[10px] font-bold px-1.5 py-0.5 rounded" :class="detailInventoryStatus.needsRefill ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'">
                       {{ detailInventoryStatus.needsRefill ? '建议补货' : '库存充足' }}
                     </text>
                   </view>
                   <view v-if="clientDetail?.inventory?.length" class="space-y-2">
                     <view v-for="item in clientDetail.inventory" :key="item._id" class="flex items-center justify-between text-xs">
                       <text class="text-slate-600">{{ item.name }}</text>
                       <text :class="Number(item.stock || 0) <= Number(item.low_stock_threshold ?? 1) ? 'text-amber-500' : 'text-emerald-500'">
                         {{ Number(item.stock || 0) <= Number(item.low_stock_threshold ?? 1) ? '告急' : '正常' }} · {{ Number(item.stock || 0) }}
                       </text>
                     </view>
                   </view>
                   <view v-else class="text-xs text-slate-400">暂无库存数据</view>
                 </view>

                 <view class="bg-white rounded-xl border border-slate-100 p-3">
                   <view class="flex items-center justify-between mb-2">
                     <text class="text-xs font-bold text-slate-700">最近体感明细</text>
                     <text class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                       {{ detailSymptomSummary }}
                     </text>
                   </view>
                   <view v-if="latestSymptomPlan?.symptoms?.length" class="space-y-2">
                     <view v-for="(symptom, idx) in latestSymptomPlan.symptoms" :key="idx" class="flex items-center justify-between text-xs">
                       <text class="text-slate-600">{{ symptom.label }}</text>
                       <text class="text-slate-500">{{ symptom.value }}/10</text>
                     </view>
                     <text v-if="latestSymptomPlan?.symptom_notes" class="text-[10px] text-slate-400 block mt-1">{{ latestSymptomPlan.symptom_notes }}</text>
                   </view>
                   <view v-else class="text-xs text-slate-400">暂无体感反馈</view>
                 </view>

                 <view v-if="activeProtocolItems.length > 0" v-for="(item, index) in activeProtocolItems" :key="index" class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                   <view class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500 font-bold">{{ Number(index) + 1 }}</view>
                   <view>
                     <text class="text-sm font-bold text-slate-700 block">{{ item.product_name || item.name }}</text>
                     <text class="text-xs text-slate-400 block">{{ item.instruction || '按需服用' }}</text>
                   </view>
                 </view>
                 <view v-if="activeProtocolItems.length === 0" class="text-center text-slate-400 py-10">
                   <text class="text-sm block mb-4">暂无执行中的方案</text>
                   <button
                     @click="openAssignModal(currentClient)"
                     class="px-6 py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                   >
                     <text class="text-lg">📋</text>
                     分配健康方案
                   </button>
                 </view>
              </template>
            </view>
          </view>

          <!-- Chat Input Area (Fixed at bottom of Card) -->
          <view v-if="activeDrawerTab === 'chat'" class="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+4px)] flex items-center gap-2 z-20">
            <view class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:bg-slate-100 transition-colors">
              <text class="text-xl leading-none mb-0.5">+</text>
            </view>
            <input v-model="draftMessage" type="text" placeholder="给客户发消息..." class="flex-1 h-9 bg-transparent text-sm text-slate-900 placeholder:text-slate-400" />
            <view class="h-9 px-4 rounded-xl flex items-center justify-center shadow-lg text-white"
              :class="canSendMessage ? 'bg-emerald-500 shadow-emerald-200 mp-pressable' : 'bg-slate-300 shadow-slate-200'"
              @click="sendChatMessage">
              <text class="text-xs font-bold">{{ sendingMessage ? '发送中...' : '发送' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
  </view>

  <!-- 补货详情弹窗 -->
  <view v-if="showRefillModal && refillClient" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="showRefillModal = false">
    <view class="bg-white w-full max-w-md sm:rounded-[32px] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 max-h-[70vh] overflow-y-auto">
      <view class="flex items-center justify-between mb-4">
        <view>
          <text class="text-lg font-black text-slate-900 block">库存告急</text>
          <text class="text-xs text-slate-400 mt-1 block">客户：{{ refillClient.name }}</text>
        </view>
        <view @tap="showRefillModal = false" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-lg mp-pressable">×</view>
      </view>

      <view v-if="refillClient.lowItems && refillClient.lowItems.length > 0" class="space-y-2 mb-5">
        <view
          v-for="(item, idx) in refillClient.lowItems"
          :key="idx"
          class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3"
        >
          <view class="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            <text class="text-base">📦</text>
          </view>
          <view class="flex-1 min-w-0">
            <text class="text-sm font-bold text-slate-800 block truncate">{{ item.name || item.product_name || '未知产品' }}</text>
            <text class="text-xs text-amber-600 mt-0.5 block">剩余 {{ item.stock || item.current_stock || 0 }}{{ item.unit || '' }}</text>
          </view>
          <view class="shrink-0 px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-full">
            告急
          </view>
        </view>
      </view>

      <view v-else class="py-6 text-center">
        <text class="text-3xl block mb-2">📦</text>
        <text class="text-sm text-slate-400 block">{{ refillClient.lowCount > 0 ? `共 ${refillClient.lowCount} 项产品库存不足` : '暂无详细库存信息' }}</text>
      </view>

      <view class="flex gap-3 pb-2">
        <view @tap="showRefillModal = false; openClientDrawer(refillClient, 'overview')" class="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold text-center active:bg-emerald-600 mp-pressable">
          查看完整库存
        </view>
        <view @tap="showRefillModal = false" class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold text-center active:bg-slate-200 mp-pressable">
          关闭
        </view>
      </view>
    </view>
  </view>

  <!-- 健康目标编辑弹窗 (Mobile) -->
  <view v-if="showTargetsEditor" class="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm" @click.self="showTargetsEditor = false">
    <view class="bg-white w-full max-w-[90%] rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <view class="flex justify-between items-center mb-4">
        <text class="font-bold text-slate-900">设定健康目标</text>
        <text class="text-slate-400 text-xl mp-pressable" @click="showTargetsEditor = false">×</text>
      </view>
      
      <view class="space-y-3">
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">目标体重</text>
          <input v-model="editTargets.weight" type="text" placeholder="例: 60.0 KG" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">目标体脂率</text>
          <input v-model="editTargets.body_fat" type="text" placeholder="例: < 20%" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">目标内脏脂肪</text>
          <input v-model="editTargets.visceral_fat" type="text" placeholder="例: < 5" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">目标血糖 (mmol/L)</text>
          <input v-model="editTargets.glucose" type="text" placeholder="例: 4.4-6.1" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-700">每日饮水量 (杯)</text>
          <input v-model.number="editTargets.water_glasses" type="number" placeholder="例: 8" class="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-emerald-500" />
        </view>
      </view>
      
      <view class="mt-6 flex gap-3">
        <button @click="showTargetsEditor = false" class="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold active:bg-slate-200">取消</button>
        <button @click="saveTargets" :disabled="savingTargets" class="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold active:bg-emerald-600 disabled:opacity-50">
          {{ savingTargets ? '保存中...' : '确认保存' }}
        </button>
      </view>
    </view>
  </view>

  <!-- 分配方案弹窗 -->
  <view v-if="showAssignModal" class="fixed inset-0 flex items-end justify-center" style="z-index: 999999; background-color: rgba(0,0,0,0.5);" @click="showAssignModal = false">
    <view class="bg-white w-full max-w-md rounded-t-[32px] p-6 shadow-2xl max-h-[80vh] overflow-y-auto" style="background-color: #ffffff;" @click.stop="">
      <view class="flex items-center justify-between mb-6">
        <view>
          <h3 class="text-lg font-black text-slate-900">分配健康方案</h3>
          <p class="text-xs text-slate-400 mt-1">为客户：{{ assignTargetClient?.name }}</p>
        </view>
        <view @click="showAssignModal = false" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mp-pressable">
          <text>×</text>
        </view>
      </view>

      <view v-if="loadingAssignTemplates" class="py-8 flex flex-col items-center justify-center">
        <view class="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3"></view>
        <text class="text-xs text-slate-400">加载方案模板...</text>
      </view>

      <view v-else-if="assignTemplates.length > 0" class="space-y-3 mb-6">
        <view
          v-for="template in assignTemplates"
          :key="template.id"
          @tap="selectedAssignTemplate = template"
          class="p-4 rounded-2xl border-2 mp-pressable"
          :class="selectedAssignTemplate?.id === template.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-slate-50'"
        >
          <view class="flex items-start justify-between">
            <view>
              <h4 class="font-bold text-slate-900 text-sm">{{ template.name }}</h4>
              <p class="text-xs text-slate-500 mt-1">{{ template.description || '暂无描述' }}</p>
            </view>
            <view v-if="selectedAssignTemplate?.id === template.id" class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
              ✓
            </view>
          </view>
          <view class="flex items-center gap-3 mt-3">
            <span class="text-[10px] px-2 py-1 bg-white rounded-md text-slate-500 border border-slate-200">{{ template.duration }}天</span>
            <span class="text-[10px] px-2 py-1 bg-white rounded-md text-slate-500 border border-slate-200">{{ template.productCount }}个产品</span>
          </view>
        </view>
      </view>

      <view v-else class="py-8 text-center text-slate-400">
        <text class="text-sm">暂无可用方案模板</text>
      </view>

      <view v-if="selectedAssignTemplate" class="mb-4">
        <label class="text-xs font-bold text-slate-600 mb-2 block">备注（可选）</label>
        <textarea
          v-model="assignNotes"
          placeholder="给客户的话..."
          class="w-full h-20 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 border border-slate-200 resize-none"
        ></textarea>
      </view>

      <view v-if="selectedAssignTemplate" class="mb-6">
        <label class="text-xs font-bold text-slate-600 mb-2 block">开始日期</label>
        <view class="flex gap-2">
          <view @tap="assignStartDate = 'today'" class="flex-1 py-2 rounded-xl text-xs font-bold border text-center mp-pressable" :class="assignStartDate === 'today' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'">今天</view>
          <view @tap="assignStartDate = 'tomorrow'" class="flex-1 py-2 rounded-xl text-xs font-bold border text-center mp-pressable" :class="assignStartDate === 'tomorrow' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'">明天</view>
        </view>
      </view>

      <view class="flex gap-3 pb-4">
        <view @tap="showAssignModal = false" class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold text-center active:bg-slate-200 mp-pressable">取消</view>
        <view @tap="confirmAssignFromList" :class="['flex-1 py-3 text-white rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2', (!selectedAssignTemplate || assigning) ? 'bg-slate-300' : 'bg-emerald-500 active:bg-emerald-600']">
          <text>{{ assigning ? '分配中...' : '确认分配' }}</text>
        </view>
      </view>
    </view>
  </view>

</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { onLoad, onShow, onPullDownRefresh } from '@dcloudio/uni-app'
// #ifdef H5
import DesktopClients from './components/DesktopClients.vue'
// #endif
import AdminTabBar from '@/components/AdminTabBar.vue'
import { callCloud, getAuthToken } from '@/utils/cloud'
import { getUserInfo } from '@/utils/storage'
import { buildRpsBreakdownItems, buildWromBreakdownItems } from '@/utils/rps'

const isDesktop = ref(false)
const initialOpenId = ref('')
const initialOpenSection = ref<'checkin' | 'inventory' | 'symptom'>('checkin')
const initialFilter = ref<'all' | 'pendingCheckIn'>('all')

// #ifdef H5
isDesktop.value = true
// #endif

onLoad((options: any) => {
  if (options && options.openId) {
    initialOpenId.value = options.openId
  }
  if (options && (options.openSection === 'checkin' || options.openSection === 'inventory' || options.openSection === 'symptom')) {
    initialOpenSection.value = options.openSection
  }
  if (options && options.filter === 'pendingCheckIn') {
    initialFilter.value = 'pendingCheckIn'
  }
})

const searchQuery = ref('')
const clients = ref<any[]>([])
const loading = ref(false)
const hasShownResourceExhausted = ref(false)
const CLIENTS_CACHE_TTL = 60 * 1000
const CLIENTS_CACHE_KEY_PREFIX = 'admin_clients_cache_'
const clientsCache = ref<{ timestamp: number; data: any[]; syncVersion?: string; latestUpdatedAt?: number } | null>(null)
const mockClients = [
  {
    id: 'demo_client_1',
    _id: 'demo_client_1',
    name: '演示客户A',
    phone: '13800000001',
    wrom: 78,
    rps: 75,
    trend: 1,
    needsRefill: false,
    unread: false,
    trendHistory: [65, 68, 70, 72, 74, 76, 78],
    lastCheckIn: '演示数据',
    points: 86,
    streak_days: 5
  },
  {
    id: 'demo_client_2',
    _id: 'demo_client_2',
    name: '演示客户B',
    phone: '13800000002',
    wrom: 62,
    rps: 58,
    trend: -1,
    needsRefill: true,
    unread: false,
    trendHistory: [74, 72, 70, 68, 66, 64, 62],
    lastCheckIn: '演示数据',
    points: 42,
    streak_days: 2
  }
]

const mapClients = (rawList: any[]) => {
  return (rawList || []).map((user: any) => {
    const phone = user.phone || user.mobile || ''
    const checkin = user.today_checkin || {}
    const inventorySummary = user.inventory_summary || {}
    const rawRps = Number(user?.rps_score)
    const normalizedRps = Number.isFinite(rawRps) ? rawRps : 70
    const assignedTemplates = user.assigned_templates || []
    const activeProtocolCount = assignedTemplates.filter((t: any) => !t.status || t.status === 'active').length
    const serverPoints = Number(user.points || 0)
    const serverStreak = Number(user.streak_days || 0)
    let finalPts = serverPoints
    let finalStreak = serverStreak
    if (finalPts <= 0) {
      const ss = checkin.sectionStatus || {}
      const isWaterDone = ss.water?.completed === true || checkin.isWaterDone === true
      const isSymptomsDone = ss.symptoms?.completed === true || checkin.isSymptomsDone === true
      const tasksObj = ss.tasks || {}
      const taskSlots = Object.values(tasksObj)
      const hasAnyTaskDone = taskSlots.some((s: any) => s?.completed || s?.items?.some((i: any) => i.completed))
      const allTaskSlots = taskSlots.filter((s: any) => s?.items?.length > 0)
      const allSlotTasksDone = allTaskSlots.length > 0 && allTaskSlots.every((s: any) => s?.completed)
      let todayPts = 0
      if (hasAnyTaskDone || allSlotTasksDone) todayPts += 5
      if (isWaterDone) todayPts += 1
      if (isSymptomsDone) todayPts += 2
      if (todayPts >= 8) todayPts = 10
      finalPts = todayPts
      finalStreak = (todayPts > 0 && serverStreak >= 1) ? serverStreak : (allSlotTasksDone || isWaterDone || isSymptomsDone ? 1 : 0)
    }
    return {
      id: user._id,
      name: user.username || user.nickname || `用户${phone}`,
      phone,
      wrom: user.wrom_score || 0,
      rps: normalizedRps,
      trend: user.wrom_trend === 'up' ? 1 : (user.wrom_trend === 'down' ? -1 : 0),
      needsRefill: Number(inventorySummary.low_count || 0) > 0,
      inventoryStatus: inventorySummary.status || 'normal',
      checkInStatus: checkin.status || 'not_started',
      checkInCompleted: Number(checkin.completed || 0),
      checkInTotal: Number(checkin.total || 0),
      unread: false,
      trendHistory: [user.wrom_score || 0],
      lastCheckIn: user.last_login_date ? new Date(user.last_login_date).toLocaleDateString() : '未登录',
      points: finalPts,
      streak_days: finalStreak,
      // 方案执行
      assignedTemplates,
      activeProtocolCount,
      // 库存告急明细
      lowItems: inventorySummary.low_items || [],
      lowCount: Number(inventorySummary.low_count || 0)
    }
  })
}

const getClientsCacheKey = (userId: string) => `${CLIENTS_CACHE_KEY_PREFIX}${userId || 'anonymous'}`

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

const clientsLastUpdatedText = computed(() => {
  const timestamp = Number(clientsCache.value?.timestamp || 0)
  if (!timestamp) return '未同步'
  return `更新于 ${formatDateTime(timestamp)}`
})

const readClientsCache = (userId: string) => {
  if (!userId) return null
  const cache = uni.getStorageSync(getClientsCacheKey(userId))
  if (!cache || typeof cache !== 'object') return null
  const timestamp = Number((cache as any).timestamp || 0)
  const data = Array.isArray((cache as any).data) ? (cache as any).data : []
  const syncVersion = typeof (cache as any).syncVersion === 'string' ? (cache as any).syncVersion : ''
  const latestUpdatedAt = Number((cache as any).latestUpdatedAt || 0)
  if (!timestamp || !data.length) return null
  return { timestamp, data, syncVersion, latestUpdatedAt }
}

const writeClientsCache = (userId: string, data: any[], syncMeta?: any) => {
  if (!userId) return
  uni.setStorageSync(getClientsCacheKey(userId), {
    timestamp: Date.now(),
    data: data || [],
    syncVersion: syncMeta?.syncVersion || '',
    latestUpdatedAt: Number(syncMeta?.latestUpdatedAt || 0)
  })
}

const fetchClientsSyncMeta = async (userId: string) => {
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

const fetchClients = async (force = false) => {
  if (!getAuthToken()) return
  const userInfo = getUserInfo()
  const userId = userInfo?._id || ''
  const cached = readClientsCache(userId)
  
  loading.value = true
  let metaFromServer: any = null
  
  if (!force && cached) {
    clients.value = mapClients(cached.data || [])
    if (Date.now() - cached.timestamp < CLIENTS_CACHE_TTL) {
      uni.stopPullDownRefresh()
      loading.value = false
      return
    }
    metaFromServer = await fetchClientsSyncMeta(userId)
    if (metaFromServer && cached.syncVersion && metaFromServer.syncVersion === cached.syncVersion) {
      const touchedCache = {
        ...cached,
        timestamp: Date.now(),
        latestUpdatedAt: metaFromServer.latestUpdatedAt
      }
      clientsCache.value = touchedCache
      writeClientsCache(userId, cached.data || [], metaFromServer)
      uni.stopPullDownRefresh()
      loading.value = false
      return
    }
  }
  
  loading.value = !(cached && clients.value.length > 0)
  try {
    const res = await callCloud<any[]>('client-api', {
      action: 'getClients',
      payload: { nutritionistId: userId }
    })
    
    if (res.ok) {
      const data = res.data || []
      clients.value = mapClients(data)
      if (!metaFromServer) {
        metaFromServer = await fetchClientsSyncMeta(userId)
      }
      clientsCache.value = {
        timestamp: Date.now(),
        data,
        syncVersion: metaFromServer?.syncVersion || '',
        latestUpdatedAt: Number(metaFromServer?.latestUpdatedAt || 0)
      }
      writeClientsCache(userId, data, metaFromServer)
    } else if (res.isResourceExhausted) {
      clients.value = mockClients
      if (!hasShownResourceExhausted.value) {
        hasShownResourceExhausted.value = true
        uni.showModal({
          title: '资源超限',
          content: `${res.msg}\n\n客户列表已切换为演示数据。`,
          showCancel: false
        })
      }
    } else {
      uni.showToast({ title: res.msg || '获取客户列表失败', icon: 'none' })
    }
  } catch (err) {
    console.error('Failed to fetch clients:', err)
    uni.showToast({ title: '获取客户列表失败', icon: 'none' })
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

onShow(() => {
  // 获取当前页面参数（解决页面已存在时 onLoad 不触发的问题）
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.options || {}
  
  if (options.filter === 'pendingCheckIn') {
    initialFilter.value = 'pendingCheckIn'
  }
  
  if (!isDesktop.value) {
    // 有筛选条件时强制刷新，不使用缓存
    const shouldForce = initialFilter.value === 'pendingCheckIn'
    fetchClients(shouldForce)
  }
})

onPullDownRefresh(() => {
  fetchClients(true)
})

const filteredClients = computed(() => {
  let result = clients.value
  // 搜索筛选
  if (searchQuery.value) {
    result = result.filter(c => c.name && c.name.includes(searchQuery.value))
  }
  // 未打卡筛选
  if (initialFilter.value === 'pendingCheckIn') {
    result = result.filter(c => c.checkInStatus !== 'completed')
  }
  return result
})

const getScoreColor = (score: number) => {
  if (score >= 85) return 'text-emerald-500'
  if (score >= 70) return 'text-amber-500'
  return 'text-rose-500'
}

const getCheckInSummaryText = (client: any) => {
  if (client.checkInStatus === 'completed') {
    return `打卡已完成 ${client.checkInCompleted}/${client.checkInTotal}`
  }
  if (client.checkInStatus === 'partial') {
    return `打卡进行中 ${client.checkInCompleted}/${client.checkInTotal}`
  }
  return '今日未打卡'
}

const navigateToAdd = () => {
  uni.navigateTo({
    url: '/pages/admin/clients/add'
  })
}

// 补货详情弹窗
const showRefillModal = ref(false)
const refillClient = ref<any>(null)

const handleRefill = (client: any) => {
  console.log('[补货] 点击需补货, client:', client?.name, 'lowItems:', client?.lowItems?.length)
  refillClient.value = client
  showRefillModal.value = true
}

// 分配方案弹窗相关状态
const showAssignModal = ref(false)
const assignTargetClient = ref<any>(null)
const assignTemplates = ref<any[]>([])
const selectedAssignTemplate = ref<any>(null)
const loadingAssignTemplates = ref(false)
const assignNotes = ref('')
const assignStartDate = ref<'today' | 'tomorrow'>('today')
const assigning = ref(false)

const goToAssignProtocol = (client: any) => {
  assignTargetClient.value = client
  showAssignModal.value = true
  loadAssignTemplates()
}

const goToClientDetail = (client: any) => {
  uni.navigateTo({
    url: `/pages/admin/client-detail/index?clientId=${client.id || client._id}`
  })
}

// 加载方案模板列表
const loadAssignTemplates = async () => {
  loadingAssignTemplates.value = true
  try {
    const res = await callCloud<any[]>('client-api', {
      action: 'getProtocolTemplates',
      payload: {}
    })
    if (res.ok && res.data && Array.isArray(res.data)) {
      assignTemplates.value = res.data
    } else {
      assignTemplates.value = []
    }
  } catch (err) {
    console.error('[clients] 加载方案模板失败:', err)
    assignTemplates.value = []
  } finally {
    loadingAssignTemplates.value = false
  }
}

// 从列表页弹窗确认分配
const confirmAssignFromList = async () => {
  if (!selectedAssignTemplate.value) {
    uni.showToast({ title: '请先选择方案', icon: 'none' })
    return
  }
  if (!assignTargetClient.value) {
    uni.showToast({ title: '客户信息缺失', icon: 'none' })
    return
  }

  const targetClientId = assignTargetClient.value.id || assignTargetClient.value._id

  assigning.value = true
  try {
    const actualStartDate = assignStartDate.value === 'today'
      ? new Date().toISOString().split('T')[0]
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const res = await callCloud('client-api', {
      action: 'applyTemplate',
      payload: {
        clientId: targetClientId,
        templateId: selectedAssignTemplate.value.id,
        startDate: actualStartDate,
        notes: assignNotes.value,
        urgency: 'normal'
      }
    })

    if (res.ok) {
      uni.showToast({ title: '方案分配成功', icon: 'success' })
      showAssignModal.value = false
      selectedAssignTemplate.value = null
      assignNotes.value = ''
      assignStartDate.value = 'today'
      assignTargetClient.value = null
      fetchClients()
    } else {
      uni.showToast({ title: res.msg || '分配失败', icon: 'none', duration: 3000 })
    }
  } catch (err) {
    console.error('[clients] 分配方案异常:', err)
    uni.showToast({ title: '网络异常，请重试', icon: 'none' })
  } finally {
    assigning.value = false
  }
}

// 健康目标编辑逻辑
const showTargetsEditor = ref(false)
const savingTargets = ref(false)
const editTargets = ref({
  weight: '',
  body_fat: '',
  glucose: '',
  visceral_fat: '',
  water_glasses: 8
})

const openTargetsEditor = () => {
  const currentTargets = clientDetail.value?.user?.health_targets || {}
  editTargets.value = {
    weight: currentTargets.weight || '60.0 KG',
    body_fat: currentTargets.body_fat || '< 20%',
    glucose: currentTargets.glucose || '4.4-6.1',
    visceral_fat: currentTargets.visceral_fat || '< 5',
    water_glasses: currentTargets.water_glasses || 8
  }
  showTargetsEditor.value = true
}

const saveTargets = async () => {
  if (!currentClient.value?.id) return
  savingTargets.value = true
  try {
    const userInfo = getUserInfo()
    const res = await callCloud<any>('admin-api', {
      action: 'updateClientTargets',
      payload: {
        clientId: currentClient.value?.id || currentClient.value?._id,
        targets: editTargets.value
      }
    })

    if (res.ok) {
      uni.showToast({ title: '目标已保存', icon: 'success' })
      showTargetsEditor.value = false
      if (clientDetail.value && clientDetail.value.user) {
        clientDetail.value.user.health_targets = { ...editTargets.value }
      }
    } else {
      uni.showToast({ title: res.msg || '保存失败', icon: 'none' })
    }
  } catch (err) {
    uni.showToast({ title: '保存出错', icon: 'none' })
  } finally {
    savingTargets.value = false
  }
}

// Client Detail Logic
const clientDetail = ref<any>(null)
const isDetailLoading = ref(false)
const clientDetailCache = ref<Record<string, { data: any; timestamp: number }>>({})
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes cache for details

const fetchClientDetail = async (clientId: string) => {
  // Check cache first
  const cached = clientDetailCache.value[clientId]
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    clientDetail.value = cached.data
    // Still fetch in background to refresh, but don't set isDetailLoading
    callCloud<any>('client-api', {
      action: 'getClientDetail',
      payload: { clientId, userId: getUserInfo()?._id, fastFetch: true }
    }).then(res => {
      if (res.ok) {
        clientDetail.value = res.data
        clientDetailCache.value[clientId] = { data: res.data, timestamp: Date.now() }
      }
    })
    return
  }

  isDetailLoading.value = true
  clientDetail.value = null
  try {
    const userInfo = getUserInfo()
    const res = await callCloud<any>('client-api', {
      action: 'getClientDetail',
      payload: {
        clientId,
        userId: userInfo ? userInfo._id : '',
        fastFetch: true
      }
    })
    
    if (res.ok) {
      clientDetail.value = res.data
      clientDetailCache.value[clientId] = { data: res.data, timestamp: Date.now() }
    } else if (res.isResourceExhausted) {
      clientDetail.value = {
        protocol: { items: [] },
        logs: []
      }
      if (!hasShownResourceExhausted.value) {
        hasShownResourceExhausted.value = true
        uni.showModal({
          title: '资源超限',
          content: `${res.msg}\n\n客户详情已切换为演示数据。`,
          showCancel: false
        })
      }
    } else {
      uni.showToast({ title: res.msg || '获取详情失败', icon: 'none' })
    }
  } catch (err) {
    console.error('Failed to fetch client detail:', err)
    uni.showToast({ title: '获取详情失败', icon: 'none' })
  } finally {
    isDetailLoading.value = false
  }
}

const trendChartData = computed(() => {
  if (!clientDetail.value?.logs || clientDetail.value.logs.length === 0) return []
  
  // We want the last 7 days. The logs are desc, so take first 7 and reverse
  const logs = clientDetail.value.logs.slice(0, 7).reverse()
  
  return logs.map((log: any) => ({
    date: new Date(log.date).getDate() + '日',
    score: log.wrom_score || 0
  }))
})

const activeProtocolItems = computed(() => {
  if (!clientDetail.value?.protocol?.items) return []
  return clientDetail.value.protocol.items
})

const latestPlan = computed(() => {
  return clientDetail.value?.plans?.[0] || null
})

const latestSymptomPlan = computed(() => {
  const plans = clientDetail.value?.plans || []
  return plans.find((plan: any) => Array.isArray(plan?.symptoms) && plan.symptoms.length > 0) || null
})
const detailCheckInSummary = computed(() => {
  const tasks = Array.isArray(latestPlan.value?.tasks) ? latestPlan.value.tasks : []
  const total = tasks.length
  const completed = tasks.filter((task: any) => !!task?.completed).length
  const statusText = total === 0 ? '未打卡' : (completed >= total ? '已完成' : (completed > 0 ? '进行中' : '未打卡'))
  return { total, completed, statusText }
})
const detailInventoryStatus = computed(() => {
  const inventory = Array.isArray(clientDetail.value?.inventory) ? clientDetail.value.inventory : []
  // 与后端 getInventorySummary 逻辑对齐：库存 <= 阈值 或 预估天数 <= 5天
  const needsRefill = inventory.some((item: any) => {
    const stock = Number(item?.stock || 0)
    const threshold = Number(item?.low_stock_threshold ?? 1)
    const capacity = Number(item?.capacity || 1)
    const dailyUsage = Number(item?.daily_usage || 0)
    const daysRemaining = (capacity > 0 && dailyUsage > 0) ? (stock * capacity) / dailyUsage : null
    
    return stock <= threshold || (daysRemaining !== null && daysRemaining <= 5)
  })
  return { needsRefill }
})
const detailSymptomSummary = computed(() => {
  const symptoms = Array.isArray(latestSymptomPlan.value?.symptoms) ? latestSymptomPlan.value.symptoms : []
  return symptoms.length ? `${symptoms.length}项` : '暂无'
})

const displayedInteractions = computed(() => {
  const interactions = Array.isArray(clientDetail.value?.interactions) ? clientDetail.value.interactions : []
  return [...interactions].sort((a: any, b: any) => Number(a.created_at || 0) - Number(b.created_at || 0))
})

const rpsBreakdownItems = computed(() => {
  return buildRpsBreakdownItems(clientDetail.value?.user?.rps_breakdown || {})
})
const wromBreakdownItems = computed(() => {
  return buildWromBreakdownItems(clientDetail.value?.user?.wrom_breakdown || {})
})
const scoreOverviewTab = ref<'wrom' | 'rps'>('wrom')
const scoreOverviewFormula = ref<'' | 'wrom' | 'rps'>('')
const followUpActionLoading = ref(false)
const scoreOverviewItems = computed(() => {
  return scoreOverviewTab.value === 'wrom' ? wromBreakdownItems.value : rpsBreakdownItems.value
})
const toggleFormula = (type: 'wrom' | 'rps') => {
  scoreOverviewFormula.value = scoreOverviewFormula.value === type ? '' : type
}

const primaryRpsAction = computed(() => rpsBreakdownItems.value.find((item) => item.isPrimary) || null)
const followUpActionHistory = computed(() => {
  const actions = Array.isArray(clientDetail.value?.followUpActions) ? clientDetail.value.followUpActions : []
  return actions.slice(0, 5)
})
const formatActionDelta = (value: any) => {
  const numeric = Number(value || 0)
  return numeric > 0 ? `+${numeric}` : `${numeric}`
}
const formatReviewDue = (timestamp: any) => {
  const numeric = Number(timestamp || 0)
  if (!numeric) return '3天后复核'
  return new Date(numeric).toLocaleDateString()
}
const completePrimaryFollowUpAction = async () => {
  if (!currentClient.value || !primaryRpsAction.value || followUpActionLoading.value) return
  followUpActionLoading.value = true
  try {
    const userInfo = getUserInfo()
    const res = await callCloud<any>('client-api', {
      action: 'completePrimaryFollowUpAction',
      payload: {
        clientId: currentClient.value.id || currentClient.value._id,
        title: `首要跟进：${primaryRpsAction.value.label}`,
        suggestion: primaryRpsAction.value.suggestion,
        source: 'rps_primary',
        userId: userInfo ? userInfo._id : ''
      }
    })
    if (!res.ok) {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
      return
    }
    const latestAction = res.data || null
    if (!Array.isArray(clientDetail.value?.followUpActions)) {
      if (!clientDetail.value) clientDetail.value = {}
      clientDetail.value.followUpActions = []
    }
    if (latestAction) {
      clientDetail.value.followUpActions = [latestAction, ...clientDetail.value.followUpActions]
    }
    uni.showToast({ title: '已记录，3天后自动复核', icon: 'none' })
  } catch (err) {
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
  } finally {
    followUpActionLoading.value = false
  }
}

const draftMessage = ref('')
const sendingMessage = ref(false)
const nutritionistShortName = computed(() => {
  const userInfo = getUserInfo()
  const name = userInfo?.username || userInfo?.nickname || '营养顾问'
  return String(name)[0] || 'Dr'
})
const canSendMessage = computed(() => draftMessage.value.trim().length > 0 && !sendingMessage.value)
const formatInteractionTime = (timestamp?: number) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}

// Drawer Logic
const showDrawer = ref(false)
const currentClient = ref<any>(null)
const drawerAnimClass = ref('translate-y-full')
const activeDrawerTab = ref<'chat' | 'overview'>('overview')
const isTrendCollapsed = ref(true)
const isSummaryCollapsed = ref(true)

const openClientDrawer = (client: any, tab: 'chat' | 'overview' = 'overview') => {
  currentClient.value = client
  activeDrawerTab.value = tab
  isTrendCollapsed.value = true
  isSummaryCollapsed.value = true
  draftMessage.value = ''
  showDrawer.value = true

  // Fetch details
  fetchClientDetail(client.id || client._id)

  setTimeout(() => {
    drawerAnimClass.value = 'translate-y-0'
  }, 50)
}

const closeDrawer = () => {
  drawerAnimClass.value = 'translate-y-full'
  setTimeout(() => {
    showDrawer.value = false
    currentClient.value = null
    draftMessage.value = ''
  }, 300)
}

const sendChatMessage = async () => {
  if (!currentClient.value || !canSendMessage.value) return
  sendingMessage.value = true
  try {
    const userInfo = getUserInfo()
    const message = draftMessage.value.trim()
    const res = await callCloud('client-api', {
      action: 'addClientLog',
      payload: {
        clientId: currentClient.value.id || currentClient.value._id,
        nutritionistId: userInfo?._id || '',
        nutritionistName: userInfo?.username || userInfo?.nickname || '营养顾问',
        content: message,
        type: 'wechat',
        followUpStatus: '待回复',
        userId: userInfo?._id || ''
      }
    })
    if (!res.ok) {
      uni.showToast({ title: res.msg || '发送失败', icon: 'none' })
      return
    }
    if (!Array.isArray(clientDetail.value?.interactions)) {
      if (!clientDetail.value) clientDetail.value = {}
      clientDetail.value.interactions = []
    }
    clientDetail.value.interactions.push({
      _id: `temp_${Date.now()}`,
      user_id: currentClient.value.id || currentClient.value._id,
      nutritionist_id: userInfo?._id || '',
      nutritionist_name: userInfo?.username || userInfo?.nickname || '营养顾问',
      sender_role: 'nutritionist',
      type: 'wechat',
      content: message,
      created_at: Date.now()
    })
    draftMessage.value = ''
    uni.showToast({ title: '发送成功', icon: 'success' })
  } catch (err) {
    console.error('Failed to send message:', err)
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
  } finally {
    sendingMessage.value = false
  }
}
</script>

<style>
/* No extra CSS needed with Tailwind */
</style>

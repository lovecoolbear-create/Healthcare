<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <Sidebar activeTab="clients" />
    
    <!-- Main Content -->
    <div class="flex-1 p-10 pb-24 overflow-y-auto h-screen">
      <!-- Header -->
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">客户档案库</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-sm text-slate-500 font-medium">共 {{ clients.length }} 位客户</span>
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="text-sm text-slate-500">WROM 数据实时同步中</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <!-- Search Bar -->
          <div class="relative">
            <Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="搜索客户姓名..." 
              class="w-64 h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
          
          <button 
            @click="fetchClients"
            class="flex items-center justify-center bg-white border border-slate-200 text-slate-500 w-10 h-10 rounded-xl hover:bg-slate-50 hover:text-slate-700 active:scale-95 transition-all shadow-sm"
            title="刷新列表"
          >
            <RefreshCw class="w-4 h-4" :class="{'animate-spin': loading}" />
          </button>
          
          <button 
            @click="exportClientData"
            class="flex items-center justify-center bg-white border border-slate-200 text-slate-500 w-10 h-10 rounded-xl hover:bg-slate-50 hover:text-emerald-600 active:scale-95 transition-all shadow-sm"
            title="导出客户数据"
            :disabled="exporting"
          >
            <Download class="w-4 h-4" :class="{'animate-bounce': exporting}" />
          </button>
          
          <button 
            @click="navigateToAdd"
            class="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:shadow-emerald-600/30 active:scale-95 transition-all font-bold text-sm"
          >
            <UserPlus class="w-4 h-4" />
            <span>录入新客户</span>
          </button>
        </div>
      </div>

      <!-- Client Data Table -->
      <div class="bg-white rounded-3xl shadow-sm border border-slate-100">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th class="p-5 pl-8 text-xs font-bold text-slate-500 uppercase tracking-wider">客户信息</th>
              <th class="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">WROM / RPS</th>
              <th class="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">配方执行</th>
              <th class="p-5 text-xs font-bold text-slate-500 uppercase tracking-wider">库存状态</th>
              <th class="p-5 pr-8 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr 
              v-for="client in filteredClients" 
              :key="client.id"
              class="hover:bg-slate-50/80 transition-colors group"
            >
              <!-- Client Info -->
              <td class="p-5 pl-8">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm border border-slate-200 group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    {{ client.name[0] }}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900">{{ client.name }}</div>
                    <div class="text-xs text-slate-500 mt-0.5">{{ client.phone || '暂无手机号' }}</div>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                        🏆 {{ client.points || 0 }}分
                      </span>
                      <span 
                        class="text-xs font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded cursor-pointer hover:bg-orange-100"
                        @click.stop="showStreakDetail(client)"
                      >
                        🔥 {{ client.streakDays || 0 }}天
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              
              <!-- WROM Score -->
              <td class="p-5 text-center">
                <div class="flex flex-col items-center leading-tight">
                  <span :class="`text-lg font-bold tracking-tight ${getScoreColor(client.wrom)}`">W {{ client.wrom }}</span>
                  <span :class="`text-xs font-bold mt-1 ${getScoreColor(client.rps)}`">R {{ client.rps }}</span>
                </div>
              </td>
              
              <!-- Protocol Execution Status -->
              <td class="p-5 text-center">
                <!-- 【修复】当活跃方案数量为0时，显示"未分配方案"而不是"0个方案执行中" -->
                <template v-if="client.assignedTemplates && client.assignedTemplates.length > 0">
                  <div v-if="(client.assignedTemplates || []).filter((p: any) => p && (p.status === 'active' || !p.status)).length > 0" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <ClipboardCheck class="w-3.5 h-3.5" />
                    <span class="text-xs font-bold">{{ (client.assignedTemplates || []).filter((p: any) => p && (p.status === 'active' || !p.status)).length }}个方案执行中</span>
                  </div>
                  <div v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                    <Clipboard class="w-3.5 h-3.5" />
                    <span class="text-xs font-bold">未分配方案</span>
                  </div>
                </template>
                <div v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                  <Clipboard class="w-3.5 h-3.5" />
                  <span class="text-xs font-bold">未分配方案</span>
                </div>
              </td>
              
              <!-- Inventory Status -->
              <td class="p-5" @click.stop>
                <!-- 【修复】检查是否有活跃的方案，而不仅仅是数组长度 -->
                <div v-if="!client.assignedTemplates || (client.assignedTemplates.filter((p: any) => p && (p.status === 'active' || !p.status)).length === 0)" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
                  <HelpCircle class="w-3.5 h-3.5" />
                  <span class="text-xs font-bold">需指定方案以计算库存</span>
                </div>
                <div v-else-if="client.needsRefill" class="relative group/inv inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 cursor-help">
                  <Package class="w-3.5 h-3.5" />
                  <span class="text-xs font-bold">需补货{{ client.lowInventoryCount > 0 ? `(${client.lowInventoryCount})` : '' }}</span>
                  
                  <!-- 库存详情 Hover Popup -->
                  <div class="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-3 z-50 invisible group-hover/inv:visible opacity-0 group-hover/inv:opacity-100 transition-all">
                    <div class="text-[11px] font-bold text-slate-900 mb-2 flex justify-between">
                      <span>缺货清单</span>
                      <span class="text-amber-600">共{{ client.lowInventoryItems?.length || client.lowInventoryCount }}项</span>
                    </div>
                    <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      <div v-for="(item, idx) in client.lowInventoryItems" :key="idx" class="flex items-center justify-between text-[11px] py-1 border-b border-slate-50 last:border-0">
                        <span class="text-slate-700 font-medium truncate flex-1 mr-2">{{ idx + 1 }}. {{ item.item_name }}</span>
                        <div class="flex items-center gap-1.5 shrink-0">
                          <span class="text-slate-400">剩{{ item.days_remaining }}天</span>
                          <span class="px-1 py-0.5 rounded bg-amber-100 text-[9px] font-bold leading-none">余{{ item.stock }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-400 italic">
                      *可用天数基于每日用量计算
                    </div>
                  </div>
                </div>
                <div v-else class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  <span class="text-xs font-bold">库存充足</span>
                </div>
              </td>
              
              <!-- Actions -->
              <td class="p-5 pr-8 text-right">
                <div class="flex items-center justify-end gap-3 transition-opacity">
                  <button 
                    @click.stop="openClientDrawer(client)"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all"
                    title="查看详情"
                  >
                    查看详情
                  </button>
                  <button 
                    @click.stop="handleDelete(client)"
                    class="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                    title="删除客户"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Right Drawer (Desktop Style) - Unified UI -->
  </div>

  <AdminModal
    v-model="showDrawer"
    title="客户详情"
    :loading="drawerLoading"
    size="xl"
    :showFooter="false"
    @close="closeDrawer"
  >
    <!-- Modal Body -->
    <div class="flex-1 overflow-y-auto bg-slate-50 p-6 relative min-h-[60vh] max-h-[70vh]">
      <!-- Customer Header Card -->
      <div class="bg-white rounded-2xl border border-slate-100 p-5 mb-6 shadow-sm">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-lg border border-slate-200">
            {{ currentClient?.name?.[0] }}
          </div>
          <div class="flex-1">
            <div class="text-base font-bold text-slate-900 mb-1">{{ currentClient?.name }}</div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-xs font-bold rounded">WROM {{ currentClient?.wrom }}</span>
              <span class="px-2 py-0.5 bg-violet-100 text-violet-600 text-xs font-bold rounded">RPS {{ currentClient?.rps }}</span>
              <span class="px-2 py-0.5 text-xs font-bold rounded border" :class="getFollowUpStatusClass(currentFollowUpStatus)">
                {{ currentFollowUpStatus }}
              </span>
            </div>
            <div class="text-xs font-bold text-slate-500 mt-1">{{ currentClient?.phone || '暂无手机号' }}</div>
          </div>
        </div>
      </div>

      <!-- Custom Tabs -->
      <div class="flex border-b border-slate-100 bg-white -mx-6 px-6 -mt-6 pt-4 mb-6">
        <button 
          v-for="tab in ['dashboard', 'chat', 'plan']" 
          :key="tab"
          class="flex-1 py-4 text-sm font-bold relative transition-colors"
          :class="activeDrawerTab === tab ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'"
          @click="activeDrawerTab = tab"
        >
          {{ tab === 'dashboard' ? '概览' : (tab === 'chat' ? '沟通记录' : '健康方案') }}
          <div v-if="activeDrawerTab === tab" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-emerald-500 rounded-full"></div>
        </button>
      </div>
          <!-- Loading Overlay -->
          <div v-if="drawerLoading" class="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <div class="flex flex-col items-center gap-3">
              <div class="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <span class="text-xs font-bold text-slate-400">加载数据中...</span>
            </div>
          </div>

          <!-- Dashboard Tab -->
          <div v-if="activeDrawerTab === 'dashboard'" class="space-y-6">
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-slate-900">WROM 四维趋势</h3>
                <div class="bg-slate-100 rounded-lg p-1 flex gap-1">
                  <button class="px-2.5 h-7 rounded-md text-[11px] font-bold transition-colors"
                    :class="wromTrendRange === '7d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                    @click="wromTrendRange = '7d'">
                    近7天
                  </button>
                  <button class="px-2.5 h-7 rounded-md text-[11px] font-bold transition-colors"
                    :class="wromTrendRange === '30d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                    @click="wromTrendRange = '30d'">
                    近30天
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="item in wromDimensionSeries" :key="item.key" class="p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[11px] font-bold text-slate-600">{{ item.label }}</span>
                    <span class="text-[10px] font-bold" :class="item.textClass">{{ item.latest }}%</span>
                  </div>
                  <svg viewBox="0 0 100 36" class="w-full h-12">
                    <polyline :points="buildSparklinePoints(item.values)" fill="none" :stroke="item.stroke" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-slate-900">双评分总览</h3>
                <div class="bg-slate-100 rounded-lg p-1 flex gap-1">
                  <button class="px-2.5 h-7 rounded-md text-[11px] font-bold transition-colors"
                    :class="scoreOverviewTab === 'wrom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                    @click="scoreOverviewTab = 'wrom'">
                    WROM
                  </button>
                  <button class="w-7 h-7 rounded-md text-[11px] font-bold transition-colors"
                    :class="scoreOverviewFormula === 'wrom' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'"
                    @click="toggleFormula('wrom')">?</button>
                  <button class="px-2.5 h-7 rounded-md text-[11px] font-bold transition-colors"
                    :class="scoreOverviewTab === 'rps' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                    @click="scoreOverviewTab = 'rps'">
                    RPS
                  </button>
                  <button class="w-7 h-7 rounded-md text-[11px] font-bold transition-colors"
                    :class="scoreOverviewFormula === 'rps' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'"
                    @click="toggleFormula('rps')">?</button>
                </div>
              </div>
              <div v-if="scoreOverviewFormula" class="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p class="text-[11px] font-bold" :class="scoreOverviewFormula === 'wrom' ? 'text-emerald-600' : 'text-violet-600'">
                  {{ scoreOverviewFormula === 'wrom' ? 'WROM 公式说明' : 'RPS 公式说明' }}
                </p>
                <p class="text-[11px] text-slate-600 mt-1 leading-5">
                  {{ scoreOverviewFormula === 'wrom'
                    ? 'WROM = 依从性(40) + 库存(30) + 体感(20) + 参与(10)。数据来自每日任务、库存、体感与行为记录。'
                    : 'RPS = 取消率(30) + 收货时延(25) + 复购周期(30) + 效果(15)。数据来自订单状态、发货收货时间、复购间隔与体感趋势。' }}
                </p>
              </div>
              <div class="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p class="text-[11px] font-bold" :class="scoreOverviewTab === 'wrom' ? 'text-emerald-600' : 'text-violet-600'">
                  {{ scoreOverviewTab === 'wrom' ? `健康评分 WROM ${Number(currentClient?.wrom || currentClientDetail?.user?.wrom_score || 0)}` : `复购评分 RPS ${Number(currentClient?.rps || currentClientDetail?.user?.rps_score || 70)}` }}
                </p>
                <p class="text-[11px] text-slate-500 mt-1 leading-5">
                  {{ scoreOverviewTab === 'wrom' ? '用于评估客户健康执行风险，指导健康干预优先级。' : '用于评估客户复购行为风险，指导运营跟进优先级。' }}
                </p>
              </div>
              <div v-if="scoreOverviewTab === 'rps' && primaryRpsAction" class="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
                <p class="text-[11px] font-bold text-rose-600">首要跟进行动：{{ primaryRpsAction.label }}维度优先</p>
                <p class="text-[11px] text-rose-500 mt-1 leading-5">{{ primaryRpsAction.suggestion }}</p>
                <div v-if="showFollowUpActionForm" class="mt-2 space-y-2">
                  <input v-model="followUpActionNote" type="text" placeholder="填写本次行动内容（必填）" class="w-full h-8 rounded-lg border border-rose-200 px-2 text-[11px] text-slate-700 bg-white focus:outline-none focus:border-rose-400" />
                  <input v-model="followUpClientFeedback" type="text" placeholder="填写客户反馈（必填）" class="w-full h-8 rounded-lg border border-rose-200 px-2 text-[11px] text-slate-700 bg-white focus:outline-none focus:border-rose-400" />
                </div>
                <button class="mt-2 h-7 px-3 rounded-lg text-[11px] font-bold transition-colors"
                  :class="followUpActionLoading ? 'bg-slate-200 text-slate-500' : 'bg-rose-500 text-white hover:bg-rose-600'"
                  :disabled="followUpActionLoading"
                  @click="submitPrimaryFollowUpAction">
                  {{ followUpActionLoading ? '处理中...' : (showFollowUpActionForm ? '提交并标记已执行' : '标记已执行') }}
                </button>
              </div>
              <div v-if="scoreOverviewTab === 'rps' && followUpActionHistory.length" class="rounded-xl border border-slate-100 bg-white px-3 py-2 space-y-2">
                <p class="text-[11px] font-bold text-slate-600">行动复核记录</p>
                <div v-for="action in followUpActionHistory" :key="action._id" class="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <p class="text-[11px] text-slate-700 font-bold">{{ action.title }}</p>
                  <p v-if="action.action_note" class="text-[10px] text-slate-500 mt-1">行动：{{ action.action_note }}</p>
                  <p v-if="action.client_feedback" class="text-[10px] text-slate-500 mt-1">反馈：{{ action.client_feedback }}</p>
                  <p class="text-[10px] text-slate-500 mt-1">
                    {{ action.status === 'reviewed' ? `复核ΔWROM ${formatActionDelta(action.delta_wrom)} / ΔRPS ${formatActionDelta(action.delta_rps)}` : `待复核：${formatReviewDue(action.review_due_at)}` }}
                  </p>
                </div>
              </div>
              <div class="space-y-3">
                <div v-for="item in scoreOverviewCards" :key="item.key" class="p-3 rounded-xl border bg-slate-50" :class="scoreOverviewTab === 'rps' && item.isPrimary ? 'border-rose-200 ring-1 ring-rose-100' : 'border-slate-100'">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <span class="text-[11px] font-bold text-slate-700">{{ item.label }}</span>
                      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                        :class="scoreOverviewTab === 'rps' && item.isPrimary ? 'bg-rose-100 text-rose-600' : item.levelClass">
                        {{ scoreOverviewTab === 'rps' && item.isPrimary ? '优先处理' : item.levelText }}
                      </span>
                    </div>
                    <span class="text-[11px] font-bold text-slate-700">{{ item.score }}/{{ item.max }}</span>
                  </div>
                  <div class="h-2 rounded-full bg-white border border-slate-100 overflow-hidden">
                    <div class="h-full rounded-full transition-all" :class="item.barClass" :style="{ width: `${item.percent}%` }"></div>
                  </div>
                  <p class="text-[11px] text-slate-500 mt-2 leading-5">{{ item.suggestion }}</p>
                </div>
              </div>
            </div>

            <!-- 健康目标设定 -->
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-slate-900">阶段健康目标</h3>
                <button @click="openTargetsEditor" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                  设定目标
                </button>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">目标体重</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.weight || '60.0 KG' }}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">目标体脂率</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.body_fat || '< 20%' }}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">目标内脏脂肪</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.visceral_fat || '< 5' }}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">目标血糖</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.glucose || '4.4-6.1' }}</div>
                </div>
                <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div class="text-[10px] text-slate-500 font-bold mb-1">每日饮水</div>
                  <div class="text-sm font-black text-slate-800">{{ currentClientDetail?.user?.health_targets?.water_glasses || '8' }} 杯</div>
                </div>
              </div>
            </div>

            <!-- 历史打卡查询 -->
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <!-- 日期切换器 -->
              <!-- 历史打卡标题 -->
              <div class="text-center mb-3">
                <h3 class="text-sm font-bold text-slate-900">
                  {{ selectedCheckInDate ? `历史打卡 (${selectedCheckInDate})` : '历史打卡记录' }}
                </h3>
              </div>

              <!-- 日期选择器 -->
              <div class="flex items-center justify-between mb-4">
                <button 
                  @click="prevDate" 
                  class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft class="w-4 h-4 text-slate-600" />
                </button>
                <div class="flex items-center gap-2">
                  <button 
                    @click="showMonthView = !showMonthView" 
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Calendar class="w-4 h-4 text-slate-500" />
                    <span class="text-xs font-bold text-slate-600">{{ selectedCheckInDate ? formatDateDisplay(selectedCheckInDate) : '选择日期' }}</span>
                  </button>
                </div>
                <button 
                  @click="nextDate" 
                  class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <ChevronRight class="w-4 h-4 text-slate-600" />
                </button>
              </div>

              <!-- 月份视图 -->
              <div v-if="showMonthView" class="mb-4 p-3 bg-slate-50 rounded-xl">
                <div class="flex items-center justify-between mb-2">
                  <button @click="prevMonth" class="w-6 h-6 rounded hover:bg-slate-200 flex items-center justify-center">
                    <ChevronLeft class="w-3 h-3 text-slate-500" />
                  </button>
                  <span class="text-xs font-bold text-slate-700">
                    {{ currentMonth.getFullYear() }}年{{ currentMonth.getMonth() + 1 }}月
                  </span>
                  <button @click="nextMonth" class="w-6 h-6 rounded hover:bg-slate-200 flex items-center justify-center">
                    <ChevronRight class="w-3 h-3 text-slate-500" />
                  </button>
                </div>
                <div class="grid grid-cols-7 gap-1 text-center">
                  <div v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="text-[10px] text-slate-400 py-1">
                    {{ day }}
                  </div>
                  <div 
                    v-for="(day, idx) in monthCalendarData" 
                    :key="idx"
                    @click="day && day.date !== getLocalDateStr() && selectDate(day.date)"
                    class="aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] cursor-pointer transition-all"
                    :class="{
                      'bg-emerald-100 text-emerald-700': day?.status === 'completed',
                      'bg-amber-100 text-amber-700': day?.status === 'partial',
                      'bg-slate-100 text-slate-600': day?.status === 'not_started',
                      'bg-slate-50 text-slate-400': !day?.hasData,
                      'ring-2 ring-emerald-500': day?.date === selectedCheckInDate,
                      'opacity-50 cursor-not-allowed': day?.date === getLocalDateStr(),
                      'invisible': !day
                    }"
                  >
                    <span v-if="day" class="font-medium">{{ day.day }}</span>
                    <span v-if="day?.hasData" class="text-[8px] scale-75">{{ day.completed }}/{{ day.total }}</span>
                  </div>
                </div>
              </div>

              <!-- 打卡状态标签 -->
              <div class="flex items-center justify-between mb-4">
                <span class="text-xs font-bold text-slate-500">打卡状态</span>
                <div class="flex items-center gap-2">
                  <span 
                    v-if="selectedDateCheckInStatus" 
                    class="px-2 py-1 text-[10px] font-bold rounded" 
                    :class="selectedDateCheckInStatus === 'completed' ? 'bg-emerald-100 text-emerald-600' : selectedDateCheckInStatus === 'partial' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'"
                  >
                    {{ selectedDateCheckInStatus === 'completed' ? '已完成' : selectedDateCheckInStatus === 'partial' ? '部分完成' : '未开始' }}
                  </span>
                  <span v-else class="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-500">
                    无记录
                  </span>
                  <!-- 历史打卡只读，不提供编辑功能 -->
                </div>
              </div>

              <!-- 任务列表 -->
              <div v-if="selectedDateTasks.length > 0" class="space-y-3">
                <div 
                  v-for="(task, idx) in selectedDateTasks" 
                  :key="idx" 
                  class="p-3 bg-slate-50 rounded-xl border transition-all"
                    :class="{ 
                      'border-emerald-200 bg-emerald-50/30': task.completed, 
                      'border-slate-100': !task.completed
                    }"
                >
                  <div class="flex items-center gap-3">
                    <div v-if="task.completed" class="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px]">✓</div>
                    <div v-else class="w-5 h-5 rounded-full border-2 border-slate-300"></div>
                    <div class="flex-1">
                      <div class="text-sm font-bold text-slate-900">{{ task.product_name || task.name || task.item_name || task.title || '未命名产品' }}</div>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-[10px] font-bold text-slate-400 px-2 py-0.5 bg-white rounded border border-slate-200">今日打卡计划</span>
                        <span class="text-[10px] font-bold text-slate-400">{{ task.slot || '早' }} · {{ task.dose || `${task.daily_usage || 1}${task.unit || '粒'}` }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8">
                <Package class="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p class="text-xs font-bold text-slate-400">
                  {{ selectedCheckInDate ? '该日期暂无打卡记录' : '请选择历史日期查看打卡记录' }}
                </p>
                <p class="text-[10px] font-bold text-slate-300 mt-1">
                  {{ selectedCheckInDate ? '请选择其他日期查看' : '点击上方日历选择日期（当天除外）' }}
                </p>
              </div>

              <!-- 打卡汇总 -->
              <div class="mt-4 pt-4 border-t border-slate-100 flex gap-3">
                <div class="flex-1 p-2 bg-blue-50 rounded-xl text-center">
                  <div class="text-[10px] font-bold text-slate-400">💧 饮水</div>
                  <div class="text-sm font-bold" :class="selectedDateWaterIntake > 0 ? 'text-blue-600' : 'text-slate-700'">
                    {{ selectedDateWaterIntake }}<span class="text-[10px] font-normal">ml</span>
                  </div>
                </div>
                <div class="flex-1 p-2 bg-rose-50 rounded-xl text-center">
                  <div class="text-[10px] font-bold text-slate-400">🌡️ 体感</div>
                  <div class="text-sm font-bold" :class="selectedDateSymptomScore > 0 ? (selectedDateSymptomScore <= 3 ? 'text-red-500' : 'text-rose-600') : 'text-slate-700'">
                    {{ selectedDateSymptomScore > 0 ? selectedDateSymptomScore.toFixed(1) : '-' }}<span class="text-[10px] font-normal">分</span>
                  </div>
                </div>
                <div class="flex-1 p-2 bg-emerald-50 rounded-xl text-center">
                  <div class="text-[10px] font-bold text-slate-400">✓ 进度</div>
                  <div class="text-sm font-bold text-slate-700">
                    {{ selectedDateTasks.filter((t: any) => t.completed).length }}/{{ selectedDateTasks.length }}
                  </div>
                </div>
              </div>

              <!-- 【增强】打卡率趋势图 + 时间范围切换 + 异常提醒 -->
              <div class="mt-4 pt-4 border-t border-slate-100">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-600">📈 打卡率趋势</span>
                    <!-- 时间范围切换按钮 -->
                    <div class="flex bg-slate-100 rounded-lg p-0.5">
                      <button
                        v-for="range in [7, 14, 30]"
                        :key="range"
                        @click="trendDateRange = range"
                        class="px-2 py-0.5 text-[10px] font-bold rounded transition-all"
                        :class="trendDateRange === range ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                      >
                        {{ range }}天
                      </button>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span v-if="riskAlert" class="text-[10px] font-bold text-red-500 flex items-center gap-1">
                      ⚠️ {{ riskAlert }}
                    </span>
                    <span class="text-[10px] text-slate-400">平均 {{ averageCheckInRate }}%</span>
                  </div>
                </div>

                <!-- 趋势图柱状图 -->
                <div class="flex items-end gap-1 h-24 px-2 mb-3">
                  <div
                    v-for="(day, idx) in checkInTrendData"
                    :key="idx"
                    class="flex-1 flex flex-col items-center gap-1"
                  >
                    <div class="w-full max-w-[32px] bg-slate-100 rounded-t-lg relative overflow-hidden" style="height: 80px;">
                      <div
                        class="absolute bottom-0 w-full rounded-t-lg transition-all duration-300"
                        :class="getTrendBarClass(day.rate)"
                        :style="{ height: Math.max(day.rate, 8) + '%' }"
                      ></div>
                    </div>
                    <span class="text-[8px] text-slate-400 font-bold">{{ formatTrendDate(day.date) }}</span>
                    <span class="text-[8px] font-bold" :class="getTrendRateClass(day.rate)">{{ day.rate }}%</span>
                  </div>
                </div>

                <!-- 操作按钮组 -->
                <div class="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    @click="showClientComparison = true"
                    class="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                  >
                    📊 对比其他客户
                  </button>
                  <button
                    @click="exportCheckInReport"
                    :disabled="exportingReport"
                    class="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {{ exportingReport ? '⏳ 导出中...' : '📄 导出PDF报告' }}
                  </button>
                </div>

                <!-- 【新增】多客户对比弹窗 -->
                <div v-if="showClientComparison" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="showClientComparison = false">
                  <div class="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto shadow-2xl">
                    <div class="flex items-center justify-between mb-6">
                      <h3 class="text-lg font-black text-slate-900">📊 多客户打卡率对比</h3>
                      <button @click="showClientComparison = false" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">✕</button>
                    </div>

                    <div class="mb-4">
                      <p class="text-xs text-slate-500 mb-2">选择要对比的客户（最多5个）：</p>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="client in clients.slice(0, 10)"
                          :key="client.id"
                          @click="toggleComparisonClient(client)"
                          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          :class="comparisonClients.some(c => c.id === client.id)
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                          :disabled="!comparisonClients.some(c => c.id === client.id) && comparisonClients.length >= 5"
                        >
                          {{ client.name || client.username || '客户' }}
                        </button>
                      </div>
                    </div>

                    <div v-if="comparisonData.length > 0" class="space-y-4">
                      <div v-for="(clientData, idx) in comparisonData" :key="idx" class="border border-slate-200 rounded-xl p-4">
                        <div class="flex items-center justify-between mb-3">
                          <span class="text-sm font-bold text-slate-900">{{ clientData.name }}</span>
                          <span class="text-xs font-bold" :class="clientData.avgRate >= 80 ? 'text-emerald-600' : clientData.avgRate >= 50 ? 'text-amber-600' : 'text-red-600'">
                            平均 {{ clientData.avgRate }}%
                          </span>
                        </div>
                        <div class="flex items-end gap-1 h-20">
                          <div
                            v-for="(day, dayIdx) in clientData.days"
                            :key="dayIdx"
                            class="flex-1 flex flex-col items-center gap-0.5"
                          >
                            <div class="w-full bg-slate-100 rounded-t relative overflow-hidden" style="height: 60px;">
                              <div
                                class="absolute bottom-0 w-full rounded-t transition-all"
                                :class="getTrendBarClass(day.rate)"
                                :style="{ height: Math.max(day.rate, 8) + '%' }"
                              ></div>
                            </div>
                            <span class="text-[7px] text-slate-400">{{ formatTrendDate(day.date).slice(3) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="text-center py-12 text-slate-400">
                      请选择客户进行对比
                    </div>
                  </div>
                </div>
              </div>

              <!-- 库存不足警告已移除（历史记录不显示库存预警） -->
            </div>

          </div>

          <!-- Chat Tab (Logs) -->
          <div v-else-if="activeDrawerTab === 'chat'" class="space-y-4 pb-20">
             <!-- 【新增】客户活跃状态卡片 -->
             <div class="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-100">
               <div class="flex items-center justify-between">
                 <div class="flex items-center gap-3">
                   <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm" :class="isClientOnline ? 'ring-2 ring-emerald-400' : ''">
                     <span :class="isClientOnline ? 'text-emerald-500' : 'text-slate-400'" class="text-lg">{{ isClientOnline ? '🟢' : '⚪' }}</span>
                   </div>
                   <div>
                     <p class="text-xs font-bold text-slate-700">{{ isClientOnline ? '在线' : '离线' }}</p>
                     <p class="text-[10px] text-slate-500 mt-0.5">最后活跃: {{ formatLastActiveTime }}</p>
                   </div>
                 </div>
                 <div class="text-right">
                   <p class="text-[10px] font-bold text-slate-600">互动次数</p>
                   <p class="text-sm font-black text-emerald-600 mt-0.5">{{ displayedInteractions.length }} 次</p>
                 </div>
               </div>
             </div>

             <div class="bg-white p-3 rounded-xl border border-slate-100 flex items-center gap-2">
               <span class="text-[11px] font-bold text-slate-500">跟进状态</span>
               <button v-for="status in followUpStatusOptions" :key="status"
                 class="px-2.5 h-7 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-60"
                 :class="currentFollowUpStatus === status ? getFollowUpStatusClass(status) : 'bg-white text-slate-500 border-slate-200'"
                 :disabled="followUpStatusLoading"
                 @click="updateFollowUpStatus(status)">
                 {{ status }}
               </button>
             </div>
             <div v-if="displayedInteractions.length" class="space-y-4">
               <div v-for="log in displayedInteractions" :key="log._id || log.created_at" class="space-y-2">
                 <div class="text-center text-[10px] font-bold text-slate-300 py-2">{{ new Date(log.created_at).toLocaleString() }}</div>
                 <div class="flex gap-3" :class="{ 'flex-row-reverse': log.sender_role === 'nutritionist' }">
                   <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-600 shrink-0">
                     {{ log.sender_role === 'nutritionist' ? (log.nutritionist_name?.[0] || 'Dr') : (currentClient?.name?.[0] || '客') }}
                   </div>
                   <div class="p-3 rounded-2xl shadow-sm text-sm max-w-[85%] border"
                     :class="log.sender_role === 'nutritionist' ? 'bg-emerald-500 text-white border-emerald-500 rounded-tr-none' : 'bg-white text-slate-700 border-slate-100 rounded-tl-none'">
                     {{ log.content }}
                     <div class="text-[10px] font-bold mt-1 flex items-center gap-1"
                       :class="log.sender_role === 'nutritionist' ? 'text-emerald-100' : 'text-slate-400'">
                        <MessageCircle class="w-2.5 h-2.5" />
                        通过 {{ log.type === 'wechat' ? '微信' : '系统' }} 发送
                     </div>
                   </div>
                 </div>
               </div>
             </div>
             <div v-else class="text-center py-20">
               <MessageCircle class="w-12 h-12 text-slate-100 mx-auto mb-4" />
               <p class="text-sm text-slate-400 font-bold">暂无沟通记录</p>
              <p class="text-xs font-bold text-slate-300 mt-1">输入内容后发送首条消息</p>
             </div>
          </div>

          <!-- Plan Tab (Protocol) -->
          <div v-else class="space-y-4">
            <!-- 多方案列表 -->
            <div v-if="(currentClientDetail?.protocols?.length || 0) > 0 || currentClientDetail?.protocol" class="space-y-4">
              <!-- 遍历所有方案 -->
              <div v-for="(protocol, index) in (currentClientDetail?.protocols || [currentClientDetail?.protocol])" :key="protocol.id || index" :data-id="protocol.id" class="protocol-card bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" :class="protocol.is_secondary ? 'bg-blue-500 shadow-blue-500/20' : 'bg-emerald-500 shadow-emerald-500/20'">
                    <Package class="w-5 h-5" />
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h4 class="text-sm font-bold text-slate-900">{{ protocol.name }}</h4>
                      <!-- 方案类型标签 -->
                      <span v-if="protocol.is_secondary" class="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold">附加方案</span>
                      <span v-else class="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[10px] font-bold">主方案</span>
                      <!-- 状态标签 -->
                      <span 
                        class="px-2 py-0.5 rounded text-[10px] font-bold"
                        :class="{
                          'bg-amber-100 text-amber-600': protocol.status === 'pending',
                          'bg-emerald-100 text-emerald-600': protocol.status === 'active' || !protocol.status,
                          'bg-slate-100 text-slate-500': protocol.status === 'completed',
                          'bg-rose-100 text-rose-600': protocol.status === 'cancelled' || protocol.status === 'expired'
                        }"
                      >
                        {{ protocol.status === 'pending' ? '待执行' : 
                           protocol.status === 'completed' ? '已完成' : 
                           protocol.status === 'cancelled' ? '暂停中' :
                           protocol.status === 'expired' ? '已过期' : '执行中' }}
                      </span>
                    </div>
                    <p class="text-[10px] text-slate-400 mt-1">
                      {{ protocol.startDate ? `开始日期: ${protocol.startDate}` : '今日生效' }}
                    </p>
                  </div>
                </div>
                
                <!-- 产品列表 - 可折叠 -->
                <div v-if="expandedProtocols[protocol.id]" class="space-y-3 mt-4">
                  <div v-for="(item, idx) in protocol.items" :key="idx" class="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-lg border border-slate-100">💊</div>
                    <div class="flex-1 min-w-0">
                      <h4 class="text-sm font-bold text-slate-900">{{ item.product_name || item.name || item.item_name || '未命名产品' }}</h4>
                      <p class="text-[10px] text-slate-400 mt-0.5">{{ item.daily_usage }}次/日 · {{ item.instruction }}</p>
                      <!-- 【调试】显示原始字段 -->
                      <p class="text-[8px] text-amber-500 mt-0.5 font-mono">ID: #{{ item.product_id?.slice(-4) }}</p>
                    </div>
                  </div>
                </div>
                <div v-else class="mt-4 py-3 px-4 bg-slate-50 rounded-xl">
                  <p class="text-xs text-slate-500">
                    共 {{ protocol.items?.length || 0 }} 个产品 · 点击"详情"查看
                  </p>
                </div>

                <!-- 操作按钮（根据方案状态显示不同按钮） -->
                <div class="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <!-- 执行中/待执行状态的方案显示：详情、编辑、同步、停止 -->
                  <template v-if="protocol.status === 'active' || !protocol.status || protocol.status === 'pending'">
                    <div class="flex gap-2">
                      <!-- 详情按钮 -->
                      <button 
                        @click="toggleProtocolExpansion(protocol.id)" 
                        class="flex-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <span>{{ expandedProtocols[protocol.id] ? '收起' : '详情' }}</span>
                        <span class="transform transition-transform" :class="expandedProtocols[protocol.id] ? 'rotate-180' : ''">▼</span>
                      </button>
                      
                      <!-- 编辑按钮 -->
                      <button 
                        @click="editProtocol(protocol)" 
                        class="flex-1 px-3 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-1"
                      >
                        <span>✏️</span>
                        编辑
                      </button>
                    </div>
                    
                    <div class="flex gap-2">
                      <!-- 同步按钮 -->
                      <button 
                        @click="syncProtocol(protocol)" 
                        class="flex-1 px-3 py-2 bg-violet-500 text-white rounded-lg text-xs font-bold hover:bg-violet-600 transition-all flex items-center justify-center gap-1"
                      >
                        <span>🔄</span>
                        同步
                      </button>
                      
                      <!-- 停止按钮 -->
                      <button 
                        @click="stopProtocolById(protocol)" 
                        class="flex-1 px-3 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-1"
                      >
                        <span>🛑</span>
                        停止
                      </button>
                    </div>
                  </template>
                  
                  <!-- 暂停中/已停止状态的方案显示：详情、恢复执行、删除方案 -->
                  <template v-else-if="protocol.status === 'cancelled'">
                    <div class="flex gap-2">
                      <!-- 详情按钮 -->
                      <button 
                        @click="toggleProtocolExpansion(protocol.id)" 
                        class="flex-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <span>{{ expandedProtocols[protocol.id] ? '收起' : '详情' }}</span>
                        <span class="transform transition-transform" :class="expandedProtocols[protocol.id] ? 'rotate-180' : ''">▼</span>
                      </button>
                      
                      <!-- 恢复执行按钮 -->
                      <button 
                        @click="resumeProtocolById(protocol)" 
                        class="flex-1 px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-1"
                      >
                        <span>▶️</span>
                        恢复执行
                      </button>
                    </div>
                    
                    <div class="flex gap-2">
                      <!-- 删除方案按钮 -->
                      <button 
                        @click="deleteProtocolById(protocol)" 
                        class="flex-1 px-3 py-2 bg-rose-500 text-white rounded-lg text-xs font-bold hover:bg-rose-600 transition-all flex items-center justify-center gap-1"
                      >
                        <span>🗑️</span>
                        删除方案
                      </button>
                    </div>
                  </template>
                  
                  <!-- 已完成/已过期的方案显示：详情 -->
                  <template v-else>
                    <div class="flex gap-2">
                      <button 
                        @click="toggleProtocolExpansion(protocol.id)" 
                        class="flex-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <span>{{ expandedProtocols[protocol.id] ? '收起' : '详情' }}</span>
                        <span class="transform transition-transform" :class="expandedProtocols[protocol.id] ? 'rotate-180' : ''">▼</span>
                      </button>
                    </div>
                  </template>
                </div>
              </div>
              
              <!-- 添加新方案按钮 -->
              <div class="pt-2">
                <p class="text-xs text-slate-500 mb-2">添加新方案：</p>
                <button @click="openTemplateSelector" class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                  <span>📚</span>
                  从配方库选择
                </button>
              </div>
            </div>
            <div v-else class="text-center py-20">
              <div class="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <Package class="w-8 h-8 text-slate-200" />
              </div>
              <p class="text-sm text-slate-400 font-bold">暂无生效方案</p>
              
              <div class="mt-6 space-y-3">
                <button @click="openTemplateSelector" class="w-full px-6 py-3 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                  <span>📚</span>
                  从配方库选择
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Chat Input (Only on Chat Tab) -->
        <div v-if="activeDrawerTab === 'chat'" class="p-4 bg-white border-t border-slate-100">
          <div class="flex gap-2">
            <input v-model="draftMessage" type="text" placeholder="输入回复内容..." class="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors" />
            <button class="px-4 h-10 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="!draftMessage.trim() || sendingMessage"
              @click="sendChatMessage">
              {{ sendingMessage ? '发送中...' : '发送' }}
            </button>
          </div>
        </div>
    </AdminModal>
  <!-- 健康目标编辑弹窗 -->
  <AdminModal
    v-if="showTargetsEditor"
    v-model="showTargetsEditor"
    title="设定客户健康目标"
    size="md"
    :showFooter="false"
    @close="showTargetsEditor = false"
  >
    <div class="p-6 space-y-4">
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">目标体重</label>
        <input v-model="editTargets.weight" type="text" placeholder="例: 60.0 KG" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">目标体脂率</label>
        <input v-model="editTargets.body_fat" type="text" placeholder="例: < 20%" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">目标内脏脂肪</label>
        <input v-model="editTargets.visceral_fat" type="text" placeholder="例: < 5" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">目标血糖 (mmol/L)</label>
        <input v-model="editTargets.glucose" type="text" placeholder="例: 4.4-6.1" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      <div class="space-y-1">
        <label class="text-xs font-bold text-slate-700">每日饮水量 (杯)</label>
        <input v-model.number="editTargets.water_glasses" type="number" placeholder="例: 8" class="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
      </div>
      
      <div class="pt-4 flex gap-3">
        <button @click="showTargetsEditor = false" class="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors">取消</button>
        <button @click="saveTargets" :disabled="savingTargets" class="flex-1 h-10 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-md disabled:opacity-50">
          {{ savingTargets ? '保存中...' : '确认保存' }}
        </button>
      </div>
    </div>
  </AdminModal>

</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import AdminModal from '@/components/ui/AdminModal.vue';
import { callCloud } from '@/utils/cloud';
import { getUserInfo } from '@/utils/storage';
import { buildRpsBreakdownItems, buildWromBreakdownItems } from '@/utils/rps';
import { 
  Search, 
  UserPlus, 
  Package,
  Download, 
  CheckCircle2, 
  LayoutList, 
  MessageCircle, 
  X,
  RefreshCw,
  Trash2,
  ClipboardCheck,
  Clipboard,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-vue-next';

type FollowUpStatus = '未处理' | '跟进中' | '待回复';

const props = withDefaults(defineProps<{
  initialOpenId?: string
  initialFilter?: 'all' | 'pendingCheckIn'
}>(), {
  initialOpenId: '',
  initialFilter: 'all'
});

const searchQuery = ref('');
const loading = ref(false);
const exporting = ref(false);
const clients = ref<any[]>([]);
const hasShownResourceExhausted = ref(false);
const followUpStatusOptions: FollowUpStatus[] = ['未处理', '跟进中', '待回复'];

// 客户详情相关数据
const clientProtocols = ref<any[]>([]);
const clientProtocol = ref<any>(null);
const todayCheckIn = ref<any>(null);
const clientCheckInHistory = ref<any[]>([]); // 【新增】客户历史打卡记录（用于趋势图）
const trendDateRange = ref(14); // 【新增】趋势图时间范围（7/14/30天）
const showClientComparison = ref(false); // 【新增】显示多客户对比弹窗
const comparisonClients = ref<any[]>([]); // 【新增】选中的对比客户
const exportingReport = ref(false); // 【新增】导出报告状态
const isClientDetailUpdated = ref(false);
const currentClient = ref<any>(null);

// 【新增】历史打卡日期选择
const selectedCheckInDate = ref<string>(''); // 选中的打卡日期
// 阶段健康目标逻辑
const showTargetsEditor = ref(false);
const savingTargets = ref(false);
const editTargets = ref({
  weight: '',
  body_fat: '',
  glucose: '',
  visceral_fat: '',
  water_glasses: 8
});

const openTargetsEditor = () => {
  const currentTargets = currentClientDetail.value?.user?.health_targets || {};
  editTargets.value = {
    weight: currentTargets.weight || '60.0 KG',
    body_fat: currentTargets.body_fat || '< 20%',
    glucose: currentTargets.glucose || '4.4-6.1',
    visceral_fat: currentTargets.visceral_fat || '< 5',
    water_glasses: currentTargets.water_glasses || 8
  };
  showTargetsEditor.value = true;
};

const saveTargets = async () => {
  if (!currentClient.value?._id) return;
  savingTargets.value = true;
  try {
    const userInfo = getUserInfo();
    const res = await callCloud('admin-api', {
      action: 'updateClientTargets',
      payload: {
        clientId: currentClient.value?.id || currentClient.value?._id,
        targets: editTargets.value
      }
    });

    if (res.ok) {
      uni.showToast({ title: '目标已保存', icon: 'success' });
      showTargetsEditor.value = false;
      // 局部更新视图数据
      if (currentClientDetail.value && currentClientDetail.value.user) {
        currentClientDetail.value.user.health_targets = { ...editTargets.value };
      }
    } else {
      uni.showToast({ title: res.msg || '保存失败', icon: 'none' });
    }
  } catch (err) {
    console.error(err);
    uni.showToast({ title: '保存出错', icon: 'none' });
  } finally {
    savingTargets.value = false;
  }
};

const showMonthView = ref(false); // 是否显示月份视图
const currentMonth = ref<Date>(new Date()); // 当前显示的月份

// 【新增】历史打卡编辑状态
const isEditingHistory = ref(false);
const editedHistoryTasks = ref<any[]>([]);

// 【新增】获取北京时区（UTC+8）的日期字符串
const getLocalDateStr = (date: Date = new Date()) => {
  // 转换为 UTC+8 时区（北京时间）
  const utc8Time = date.getTime() + 8 * 60 * 60 * 1000;
  const utc8Date = new Date(utc8Time);
  const year = utc8Date.getUTCFullYear();
  const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc8Date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 【新增】格式化日期显示
const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日 周${weekday}`;
};

// 【新增】历史打卡编辑方法
const startEditHistory = () => {
  isEditingHistory.value = true;
  editedHistoryTasks.value = selectedDatePlans.value.flatMap((p: any) =>
    (p.tasks || []).map((t: any) => ({
      ...t,
      template_name: '今日打卡计划',
      slot: t.slot || '早',
      // 保留原始 plan_id 和 task_index，用于后端匹配
      _plan_id: p._id,
      _task_index: t._index || 0
    }))
  );
};

const cancelEditHistory = () => {
  isEditingHistory.value = false;
  editedHistoryTasks.value = [];
};

const toggleHistoryTask = (idx: number) => {
  if (!isEditingHistory.value) return;
  const task = editedHistoryTasks.value[idx];
  if (task) {
    task.completed = !task.completed;
    editedHistoryTasks.value = [...editedHistoryTasks.value];
  }
};

const saveHistoryCheckIn = async () => {
  if (!currentClient.value || !selectedCheckInDate.value || editedHistoryTasks.value.length === 0) {
    uni.showToast({ title: '无可保存的数据', icon: 'none' });
    return;
  }

  const clientId = currentClient.value.id || currentClient.value._id;
  const date = selectedCheckInDate.value;
  const tasks = editedHistoryTasks.value.map(t => ({
    product_id: t.product_id || '',
    product_name: t.product_name || t.name || '',
    name: t.product_name || t.name || '',
    slot: t.slot || '早',
    completed: t.completed,
    daily_usage: t.daily_usage || t.dose || 1,
    unit: t.unit || '粒',
    frequency: t.frequency || '每日一次',
    instruction: t.instruction || ''
  }));

  try {
    uni.showLoading({ title: '保存中...' });
    const res = await callCloud<any>('client-api', {
      action: 'updateDailyPlanTasks',
      payload: {
        userId: clientId,
        date,
        tasks
      }
    });

    if (res.ok || res.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' });
      isEditingHistory.value = false;
      editedHistoryTasks.value = [];
      // 重新加载数据
      await fetchClientDetailForDate(date);
    } else {
      uni.showToast({ title: res.msg || '保存失败', icon: 'none' });
    }
  } catch (err: any) {
    console.error('保存历史打卡失败:', err);
    uni.showToast({ title: '保存失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

// 【新增】选中日期的打卡计划 - 只显示历史记录（不包括今天）
const selectedDatePlans = computed(() => {
  // 【修复】严格检查日期是否存在（空字符串也算无效）
  const date = selectedCheckInDate.value;
  if (!date || date === '') return [];

  // 【关键修复】优先使用指定日期的历史打卡记录，并**按日期过滤**
  const historicalPlans = currentClientDetail.value?.historicalPlans;
  if (historicalPlans && historicalPlans.length > 0) {
    return historicalPlans.filter((p: any) => p.date === date);
  }
  
  // 如果没有历史记录，从所有计划中过滤（兼容旧数据）
  const plans = currentClientDetail.value?.plans || [];
  return plans.filter((p: any) => p.date === date);
});

// 【新增】选中日期的任务列表
const selectedDateTasks = computed(() => {
  if (isEditingHistory.value) {
    return editedHistoryTasks.value;
  }
  return selectedDatePlans.value.flatMap((p: any) =>
    (p.tasks || []).map((t: any) => ({
      ...t,
      template_name: '今日打卡计划',
      slot: t.slot || '早'
    }))
  );
});

// 【新增】选中日期的打卡状态
const selectedDateCheckInStatus = computed(() => {
  const tasks = selectedDateTasks.value;
  if (tasks.length === 0) return null;
  const completed = tasks.filter((t: any) => t.completed).length;
  const total = tasks.length;
  if (completed === total) return 'completed';
  if (completed > 0) return 'partial';
  return 'not_started';
});

// 【新增】选中日期的饮水量（合并所有方案，取最大值）
const selectedDateWaterIntake = computed(() => {
  const plans = selectedDatePlans.value;
  if (!plans || plans.length === 0) return 0;
  return Math.max(...plans.map((p: any) => p.water_intake || 0), 0);
});

// 【新增】选中日期的体感评分（合并所有方案，计算平均分）
const selectedDateSymptomScore = computed(() => {
  const plans = selectedDatePlans.value;
  if (!plans || plans.length === 0) return 0;

  const allSymptoms: any[] = [];
  plans.forEach((p: any) => {
    if (p.symptoms && Array.isArray(p.symptoms)) {
      p.symptoms.forEach((s: any) => {
        if (s.value !== undefined && s.value !== null && Number(s.value) > 0) {
          allSymptoms.push(Number(s.value));
        }
      });
    }
  });

  if (allSymptoms.length === 0) return 0;
  return allSymptoms.reduce((sum, val) => sum + val, 0) / allSymptoms.length;
});

// 【增强】打卡率趋势数据（支持7/14/30天切换）- 使用 getCheckInRecords 返回的 summaryByDate
const checkInTrendData = computed(() => {
  const history = clientCheckInHistory.value;
  if (!history || history.length === 0) return [];

  const today = new Date();
  const range = trendDateRange.value;
  const trendData: any[] = [];

  for (let i = range - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayData = history.find((d: any) => d.date === dateStr);
    if (!dayData) {
      trendData.push({ date: dateStr, rate: 0, completed: 0, total: 0 });
      continue;
    }

    const completed = dayData.completedTasks || 0;
    const total = dayData.totalTasks || 0;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    trendData.push({
      date: dateStr,
      rate,
      completed,
      total,
      water_intake: dayData.water_intake || 0
    });
  }

  return trendData;
});

// 【新增】异常提醒：连续3天打卡率<50%自动标记风险客户
const riskAlert = computed(() => {
  const data = checkInTrendData.value;
  if (data.length < 3) return null;

  let consecutiveLowDays = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].rate < 50 && data[i].total > 0) {
      consecutiveLowDays++;
    } else {
      break;
    }
  }

  if (consecutiveLowDays >= 3) {
    return `连续${consecutiveLowDays}天打卡率<50%，需关注`;
  }
  return null;
});

// 【新增】多客户对比数据
const comparisonData = computed(() => {
  return comparisonClients.value.map(client => {
    const clientHistory = client.checkInHistory || [];
    const today = new Date();
    const range = trendDateRange.value;
    const days: any[] = [];

    for (let i = range - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = clientHistory.find((d: any) => d.date === dateStr);
      const completed = dayData?.completedTasks || 0;
      const total = dayData?.totalTasks || 0;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      days.push({ date: dateStr, rate, completed, total });
    }

    const avgRate = days.length > 0
      ? Math.round(days.reduce((sum, d) => sum + d.rate, 0) / days.length)
      : 0;

    return {
      id: client.id,
      name: client.name || client.username || '未命名',
      avgRate,
      days
    };
  });
});

// 【新增】平均打卡率
const averageCheckInRate = computed(() => {
  const data = checkInTrendData.value;
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, day) => acc + day.rate, 0);
  return Math.round(sum / data.length);
});

// 【新增】趋势图辅助函数 - 获取柱状图颜色类名
const getTrendBarClass = (rate: number) => {
  if (rate === 100) return 'bg-emerald-500';
  if (rate >= 60) return 'bg-amber-400';
  if (rate > 0) return 'bg-red-400';
  return 'bg-slate-200';
};

// 【新增】趋势图辅助函数 - 获取百分比文字颜色类名
const getTrendRateClass = (rate: number) => {
  if (rate === 100) return 'text-emerald-600';
  if (rate >= 60) return 'text-amber-600';
  return 'text-slate-400';
};

// 【新增】趋势图辅助函数 - 格式化日期显示
const formatTrendDate = (date: string) => {
  if (!date) return '';
  return date.slice(5).replace('-', '/');
};

// 【新增】切换对比客户
const toggleComparisonClient = async (client: any) => {
  const idx = comparisonClients.value.findIndex(c => c.id === client.id);
  if (idx > -1) {
    comparisonClients.value.splice(idx, 1);
  } else if (comparisonClients.value.length < 5) {
    comparisonClients.value.push(client);

    // 如果该客户还没有历史数据，则获取
    if (!client.checkInHistory) {
      try {
        const userInfo = getUserInfo();
        const res = await callCloud<any>('client-api', {
          action: 'getCheckInRecords',
          payload: { clientId: client.id, userId: userInfo?._id || '', limit: 30 }
        });
        if (res.ok && res.data?.summaryByDate) {
          client.checkInHistory = res.data.summaryByDate;
        }
      } catch (e) {
        console.warn('获取客户历史记录失败:', e);
      }
    }
  }
};

// 【新增】导出打卡率PDF报告
const exportCheckInReport = async () => {
  if (!currentClient.value || exportingReport.value) return;

  exportingReport.value = true;
  try {
    const clientName = currentClient.value.name || currentClient.value.username || '未命名';
    const today = new Date().toLocaleDateString('zh-CN');
    const range = trendDateRange.value;

    let reportContent = `
===== 客户打卡率报告 =====
客户名称：${clientName}
生成日期：${today}
统计范围：最近${range}天
平均打卡率：${averageCheckInRate.value}%
${riskAlert.value ? '⚠️ 风险提醒：' + riskAlert.value : ''}

每日详情：
`;

    checkInTrendData.value.forEach(day => {
      const status = day.rate === 100 ? '✅ 全勤' : day.rate >= 60 ? '🟡 良好' : day.rate > 0 ? '🔴 较差' : '⚪ 未打卡';
      reportContent += `${day.date} | ${day.completed}/${day.total}项 | ${day.rate}% | ${status}\n`;
    });

    reportContent += `\n统计摘要：
- 全勤天数：${checkInTrendData.value.filter(d => d.rate === 100).length}天
- 良好天数（≥60%）：${checkInTrendData.value.filter(d => d.rate >= 60 && d.rate < 100).length}天
- 较差天数（<60%）：${checkInTrendData.value.filter(d => d.rate > 0 && d.rate < 60).length}天
- 未打卡天数：${checkInTrendData.value.filter(d => d.rate === 0).length}天
`;

    // 在小程序中，使用 uni.saveFile 或复制到剪贴板
    // #ifdef H5
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `打卡率报告_${clientName}_${today}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    // #endif

    // #ifndef H5
    uni.setClipboardData({
      data: reportContent,
      success: () => {
        uni.showModal({
          title: '导出成功',
          content: '报告已复制到剪贴板，请粘贴到笔记或文档中保存',
          showCancel: false
        });
      }
    });
    // #endif

    uni.showToast({ title: '报告已生成', icon: 'success' });
  } catch (err) {
    console.error('导出报告失败:', err);
    uni.showToast({ title: '导出失败', icon: 'none' });
  } finally {
    exportingReport.value = false;
  }
};

// 【新增】生成月份日历数据
const monthCalendarData = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();
  
  const plans = currentClientDetail.value?.plans || [];
  const planMap = new Map(plans.map((p: any) => [p.date, p]));
  
  const days = [];
  // 填充月初空白
  for (let i = 0; i < startWeekday; i++) {
    days.push(null);
  }
  // 填充日期
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const plan: any = planMap.get(dateStr);
    const tasks = plan && Array.isArray(plan.tasks) ? plan.tasks : [];
    const completed = tasks.filter((t: any) => t.completed).length;
    const total = tasks.length;
    days.push({
      day,
      date: dateStr,
      hasData: !!plan,
      status: total === 0 ? 'none' : completed === total ? 'completed' : completed > 0 ? 'partial' : 'not_started',
      completed,
      total
    });
  }
  return days;
});

// 【新增】日期切换方法
const prevDate = async () => {
  // 切换日期时退出编辑模式
  if (isEditingHistory.value) cancelEditHistory();
  
  const current = selectedCheckInDate.value ? new Date(selectedCheckInDate.value) : new Date();
  current.setDate(current.getDate() - 1);
  // 【修复】允许切换到任意历史日期（包括今天）
  const newDate = getLocalDateStr(current);
  selectedCheckInDate.value = newDate;
  
  // 【关键修复】切换日期后查询该日期的打卡记录
  if (currentClient.value && newDate) {
    await fetchClientDetailForDate(newDate);
  }
};

const nextDate = async () => {
  // 切换日期时退出编辑模式
  if (isEditingHistory.value) cancelEditHistory();
  
  const current = selectedCheckInDate.value ? new Date(selectedCheckInDate.value) : new Date();
  const today = new Date();
  current.setDate(current.getDate() + 1);
  // 【修复】允许选择今天，但不允许选择未来
  today.setHours(23, 59, 59, 999);
  if (current > today) {
    uni.showToast({ title: '不支持查看未来记录', icon: 'none' });
    return;
  }
  const newDate = getLocalDateStr(current);
  selectedCheckInDate.value = newDate;
  
  // 【关键修复】切换日期后查询该日期的打卡记录
  if (currentClient.value && newDate) {
    await fetchClientDetailForDate(newDate);
  }
};

const selectDate = async (date: string) => {
  // 切换日期时退出编辑模式
  if (isEditingHistory.value) cancelEditHistory();
  
  selectedCheckInDate.value = date;
  showMonthView.value = false;
  
  // 【新增】选择日期后重新查询该日期的打卡记录
  if (currentClient.value && date) {
    await fetchClientDetailForDate(date);
  }
};

// 【新增】按日期查询客户打卡记录
const fetchClientDetailForDate = async (date: string) => {
  try {
    drawerLoading.value = true;
    const userInfo = getUserInfo();
    
    // 【调试】打印客户信息
    console.log('[fetchClientDetailForDate] currentClient:', currentClient.value);
    console.log('[fetchClientDetailForDate] clientId:', currentClient.value?.id || currentClient.value?._id);
    console.log('[fetchClientDetailForDate] date:', date);
    
    const res = await callCloud<any>('client-api', {
      action: 'getClientDetail',
      payload: { 
        clientId: currentClient.value?.id || currentClient.value?._id, 
        userId: userInfo ? userInfo._id : '',
        date
      }
    });
    
    if (res.ok && res.data) {
      // 更新历史打卡记录
      currentClientDetail.value = {
        ...currentClientDetail.value,
        historicalPlans: res.data.historicalPlans || []
      };
      console.log('[fetchClientDetailForDate] 返回数据:', res.data);
      console.log('[fetchClientDetailForDate] historicalPlans:', res.data.historicalPlans);
      console.log('[fetchClientDetailForDate] historicalPlans 长度:', res.data.historicalPlans?.length || 0);
      if (res.data.historicalPlans && res.data.historicalPlans.length > 0) {
        console.log('[fetchClientDetailForDate] 第一条记录:', res.data.historicalPlans[0]);
        console.log('[fetchClientDetailForDate] 第一条记录 sectionStatus:', res.data.historicalPlans[0]?.sectionStatus);
        
        // 【调试】打印所有任务完成状态
        const tasks = res.data.historicalPlans[0]?.tasks || [];
        console.log('[fetchClientDetailForDate] 任务列表:');
        tasks.forEach((t: any, i: number) => {
          console.log(`  任务${i+1}: ${t.product_name || t.name}, completed: ${t.completed}, slot: ${t.slot}`);
        });
      }
    } else {
      console.log('[fetchClientDetailForDate] 请求失败或没有数据:', res);
    }
  } catch (err) {
    console.error('Failed to fetch client detail for date:', err);
  } finally {
    drawerLoading.value = false;
  }
};

const prevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
};

const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
};

const getApiErrorMessage = (code?: number, msg?: string, fallback = '操作失败') => {
  if (msg) return msg;
  if (code === 400) return '请求参数有误';
  if (code === 401) return '登录状态失效，请重新登录';
  if (code === 403) return '权限不足，无法执行此操作';
  if (code === 404) return '目标数据不存在或已被删除';
  return fallback;
};

const showPointsDetail = (client: any) => {
  const tasksDone = client.checkInCompleted || 0;
  const tasksTotal = client.checkInTotal || 0;
  const taskPoints = tasksTotal > 0 && tasksDone >= tasksTotal ? 5 : (tasksDone > 0 ? tasksDone : 0);
  uni.showModal({
    title: `${client.name} 的积分详情`,
    content: `📋 任务完成: +${taskPoints}分 (${tasksDone}/${tasksTotal})\n💧 饮水达标: +1分\n📝 体感反馈: +2分\n🔥 连续奖励: +${client.streakDays >= 2 ? Math.min(client.streakDays * 2, 12) : 0}分\n─────────────\n🏆 总积分(7天累计): ${client.points || 0} 分\n🔥 连续打卡: ${client.streakDays || 0} 天`,
    showCancel: false,
    confirmText: '知道了'
  });
};

const showStreakDetail = (client: any) => {
  uni.showModal({
    title: `${client.name} 的连续打卡`,
    content: `🔥 当前连续: ${client.streakDays || 0} 天\n📅 今日打卡: ${client.checkInCompleted || 0}/${client.checkInTotal || 0}\n${(client.streakDays || 0) >= 7 ? '🎉 太棒了！全勤打卡！' : (client.streakDays || 0) >= 3 ? '💪 坚持得很好！' : '🌱 继续加油！'}`,
    showCancel: false,
    confirmText: '知道了'
  });
};

// Fetch Clients on Mount
const fetchClients = async () => {
  loading.value = true;
  try {
    const userInfo = getUserInfo();
    const res = await callCloud<any[]>('client-api', {
      action: 'getClients',
      payload: { userId: userInfo ? userInfo._id : '' }
    });
    
    if (res.ok) {
      // Map backend data to frontend structure
      clients.value = (res.data || []).map((user: any) => {
        const phone = user.phone || user.mobile || '';
        const checkin = user.today_checkin || {};
        const inventorySummary = user.inventory_summary || {};
        const rawRps = Number(user?.rps_score);
        const normalizedRps = Number.isFinite(rawRps) ? rawRps : 70;
        const ciCompleted = Number(checkin.completed || 0);
        const ciTotal = Number(checkin.total || 0);
        const allTasksDone = ciTotal > 0 && ciCompleted >= ciTotal;
        const serverPoints = Number(user.points || 0);
        const serverStreak = Number(user.streak_days || 0);
        console.log(`[积分诊断] ${user.username||user.nickname}: server.points=${serverPoints}, server.streak_days=${serverStreak}, sectionStatus=`, checkin.sectionStatus ? '有数据' : '空');
        let finalPts = serverPoints;
        let finalStreak = serverStreak;
        if (finalPts <= 0) {
          const ss = checkin.sectionStatus || {};
          const isWaterDone = ss.water?.completed === true || checkin.isWaterDone === true;
          const isSymptomsDone = ss.symptoms?.completed === true || checkin.isSymptomsDone === true;
          const tasksObj = ss.tasks || {};
          const taskSlots = Object.values(tasksObj);
          const hasAnyTaskDone = taskSlots.some((s: any) => s?.completed || s?.items?.some((i: any) => i.completed));
          const allTaskSlots = taskSlots.filter((s: any) => s?.items?.length > 0);
          const allSlotTasksDone = allTaskSlots.length > 0 && allTaskSlots.every((s: any) => s?.completed);
          let todayPts = 0;
          if (hasAnyTaskDone || allSlotTasksDone) todayPts += 5;
          if (isWaterDone) todayPts += 1;
          if (isSymptomsDone) todayPts += 2;
          if (todayPts >= 8) todayPts = 10;
          finalPts = todayPts;
          finalStreak = (todayPts > 0 && serverStreak >= 1) ? serverStreak : (allSlotTasksDone || isWaterDone || isSymptomsDone ? 1 : 0);
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
          lowInventoryCount: Number(inventorySummary.low_count || 0),
          lowInventoryItems: inventorySummary.low_items || [],
          assignedTemplates: user.assigned_templates || [],
          checkInStatus: checkin.status || 'not_started',
          checkInCompleted: ciCompleted,
          checkInTotal: ciTotal,
          points: finalPts,
          streakDays: finalStreak,
          followUpStatus: followUpStatusOptions.includes(user.follow_up_status) ? user.follow_up_status : '未处理',
          unread: false,
          trendHistory: [user.wrom_score || 0, user.wrom_score || 0, user.wrom_score || 0, user.wrom_score || 0, user.wrom_score || 0, user.wrom_score || 0, user.wrom_score || 0],
          lastCheckIn: user.last_login_date ? new Date(user.last_login_date).toLocaleString() : '从未登录'
        };
      });
    } else {
      if (res.isResourceExhausted) {
        clients.value = mockClients;
        if (!hasShownResourceExhausted.value) {
          hasShownResourceExhausted.value = true;
          uni.showModal({
            title: '资源超限',
            content: `${res.msg}\n\n客户列表已切换为演示数据。`,
            showCancel: false
          });
        }
      } else {
        uni.showToast({ title: getApiErrorMessage(res.code, res.msg, '获取客户列表失败'), icon: 'none' });
      }
    }
  } catch (err) {
    console.error('Failed to fetch clients:', err);
    uni.showToast({ title: '获取客户列表失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await fetchClients();
  if (props.initialOpenId && Array.isArray(clients.value)) {
    const target = clients.value.find(c => c.id === props.initialOpenId);
    if (target) {
      openClientDrawer(target, props.initialOpenSection);
    }
  }
  
  // Listen for refresh events
  uni.$on('refreshClients', fetchClients);
});

onUnmounted(() => {
  uni.$off('refreshClients', fetchClients);
});

const filteredClients = computed(() => {
  let result = clients.value;
  // 搜索筛选
  if (searchQuery.value) {
    result = result.filter(c => c.name.includes(searchQuery.value) || c.phone?.includes(searchQuery.value));
  }
  // 未打卡筛选
  if (props.initialFilter === 'pendingCheckIn') {
    result = result.filter(c => c.checkInStatus !== 'completed');
  }
  return result;
});

const getScoreColor = (score: number) => {
  if (score >= 85) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500'; // Changed threshold to 60 as per WROM logic
  return 'text-rose-500';
};

const getCheckInStatusLabel = (status?: string) => {
  if (status === 'completed') return '已完成';
  if (status === 'partial') return '进行中';
  return '未打卡';
};

const getCheckInStatusClass = (status?: string) => {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (status === 'partial') return 'bg-amber-50 text-amber-600 border-amber-100';
  return 'bg-slate-100 text-slate-500 border-slate-200';
};

const getFollowUpStatusClass = (status: FollowUpStatus | string) => {
  if (status === '跟进中') return 'bg-blue-50 text-blue-600 border-blue-100';
  if (status === '待回复') return 'bg-violet-50 text-violet-600 border-violet-100';
  return 'bg-rose-50 text-rose-600 border-rose-100';
};

// 导出客户数据
const exportClientData = async () => {
  if (exporting.value || clients.value.length === 0) return;
  
  exporting.value = true;
  uni.showLoading({ title: '准备导出...' });
  
  try {
    const result = await callCloud<{ format: string; count: number; filename: string; content: string }>('client-api', {
      action: 'exportClientData',
      payload: {
        format: 'csv'
      }
    });
    
    if (result.code !== 0) {
      uni.showToast({ title: result.msg || '导出失败', icon: 'none' });
      return;
    }
    
    // 生成并下载CSV文件
    const csvContent = result.data?.content || '';
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = result.data?.filename || 'clients_export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    uni.showToast({ title: `已导出 ${result.data?.count || 0} 条客户数据`, icon: 'success' });
  } catch (err) {
    console.error('Export error:', err);
    uni.showToast({ title: '导出失败，请重试', icon: 'none' });
  } finally {
    exporting.value = false;
    uni.hideLoading();
  }
};

const navigateToAdd = () => {
  uni.navigateTo({
    url: '/pages/admin/clients/add'
  });
};

const handleChat = (client: any) => {
  openClientDrawer(client);
  activeDrawerTab.value = 'chat';
};

// 【新增】标记客户消息为已读（顾问查看时自动调用）
const markClientMessagesAsRead = async () => {
  if (!currentClient.value) return;

  try {
    const userInfo = getUserInfo();
    await callCloud('client-api', {
      action: 'markClientMessagesReadByNutritionist',
      payload: {
        clientId: currentClient.value.id || currentClient.value._id,
        userId: userInfo?._id || ''
      }
    });
  } catch (e) {
    console.warn('标记消息已读失败（非致命）:', e);
  }
};

const handleDelete = (client: any) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除客户 "${client.name}" 吗？此操作不可恢复。`,
    confirmText: '删除',
    confirmColor: '#e11d48',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' });
          const userInfo = getUserInfo();
          const result = await callCloud('user-center', {
            action: 'delete_client',
            params: {
              id: client._id || client.id,
              operatorId: userInfo ? userInfo._id : ''
            }
          });

          if (result.ok) {
            uni.showToast({ title: '删除成功', icon: 'success' });
            fetchClients();
            if ((currentClient.value?._id || currentClient.value?.id) === (client._id || client.id)) {
              closeDrawer();
            }
          } else {
            if (result.isResourceExhausted) {
              uni.showModal({
                title: '资源超限',
                content: `${result.msg}\n\n当前无法删除客户。`,
                showCancel: false
              });
            } else {
              uni.showToast({
                title: getApiErrorMessage(result.code, result.msg, '删除失败'),
                icon: 'none'
              });
            }
          }
        } catch (err) {
          console.error('Failed to delete client:', err);
          uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

// Drawer Logic
const showKnowledgeDetail = ref(false);
const expandedProtocols = ref<Record<string, boolean>>({}); // 【修复】记录每个方案的展开状态

// 切换方案详情展开/收起
const toggleProtocolExpansion = (protocolId: string) => {
  expandedProtocols.value[protocolId] = !expandedProtocols.value[protocolId];
};
const showDrawer = ref(false);
const currentClientDetail = ref<any>(null); // Full details
const drawerLoading = ref(false);
// Drawer animation is handled by AdminDrawer component
const activeDrawerTab = ref('dashboard');

// 【新增】监听标签切换，自动标记消息为已读（必须在 activeDrawerTab 声明之后）
watch(activeDrawerTab, async (newTab) => {
  if (newTab === 'chat' && currentClient.value) {
    await markClientMessagesAsRead();
  }
});

const wromTrendRange = ref<'7d' | '30d'>('7d');
const scoreOverviewTab = ref<'wrom' | 'rps'>('wrom');
const scoreOverviewFormula = ref<'' | 'wrom' | 'rps'>('');
const showFollowUpActionForm = ref(false);
const followUpActionNote = ref('');
const followUpClientFeedback = ref('');
const followUpActionLoading = ref(false);
const followUpStatusLoading = ref(false);
const sendingMessage = ref(false);
const draftMessage = ref('');
const recentSymptomPlan = computed(() => {
  const plans = currentClientDetail.value?.plans || [];
  return plans.find((plan: any) => Array.isArray(plan?.symptoms) && plan.symptoms.length > 0) || null;
});

// 今日打卡相关计算属性
const todayPlans = computed(() => {
  // 【修复】使用 API 返回的今日计划数据
  const plans = currentClientDetail.value?.todayPlans || [];
  console.log('todayPlans computed:', plans.length, plans);
  return plans;
});

const todayTasks = computed(() => {
  return todayPlans.value.flatMap((p: any) =>
    (p.tasks || []).map((t: any) => ({
      ...t,
      template_name: '今日打卡计划',
      slot: t.slot || '早'
    }))
  );
});

const completedTaskCount = computed(() => {
  return todayTasks.value.filter((t: any) => t.completed).length;
});

const todayCheckInStatus = computed(() => {
  if (todayTasks.value.length === 0) return null;
  const completed = completedTaskCount.value;
  const total = todayTasks.value.length;
  if (completed === total) return 'completed';
  if (completed > 0) return 'partial';
  return 'not_started';
});

// 库存不足的产品
const lowStockItems = computed(() => {
  const inventory = currentClientDetail.value?.inventory || [];
  const protocolItems = currentClientDetail.value?.protocol?.items || [];
  return protocolItems.filter((item: any) => {
    const stockItem = inventory.find((i: any) => i.name === item.product_name || i.name === item.name);
    const stock = stockItem?.stock || item.stock || 0;
    const threshold = item.low_stock_threshold || 5;
    return stock <= threshold || stock === 0;
  });
});

const currentFollowUpStatus = computed<FollowUpStatus>(() => {
  const fromDetail = currentClientDetail.value?.user?.follow_up_status;
  if (followUpStatusOptions.includes(fromDetail)) return fromDetail;
  const fromList = currentClient.value?.followUpStatus;
  if (followUpStatusOptions.includes(fromList)) return fromList;
  return '未处理';
});

const displayedInteractions = computed(() => {
  const interactions = Array.isArray(currentClientDetail.value?.interactions) ? currentClientDetail.value.interactions : [];
  return [...interactions]
    .sort((a: any, b: any) => Number(a.created_at || 0) - Number(b.created_at || 0))
    .map((item: any) => ({
      ...item,
      sender_role: item.sender_role || 'nutritionist'
    }));
});

// 【新增】判断客户是否在线（30分钟内有活跃）
const isClientOnline = computed(() => {
  const lastActive = currentClientDetail.value?.user?.last_interaction_at;
  if (!lastActive) return false;

  const now = Date.now();
  const thirtyMinutesAgo = now - 30 * 60 * 1000;
  return Number(lastActive) >= thirtyMinutesAgo;
});

// 【新增】格式化最后活跃时间
const formatLastActiveTime = computed(() => {
  const lastActive = currentClientDetail.value?.user?.last_interaction_at;
  if (!lastActive) return '暂无记录';

  const now = Date.now();
  const diffMs = now - Number(lastActive);
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;

  return new Date(Number(lastActive)).toLocaleDateString('zh-CN');
});

const getDateKey = (date: Date) => getLocalDateStr(date);

const buildSparklinePoints = (values: number[]) => {
  const normalized = values.length ? values : [0];
  if (normalized.length === 1) return `0,30 100,30`;
  return normalized.map((val, index) => {
    const x = (index / (normalized.length - 1)) * 100;
    const clamped = Math.max(0, Math.min(100, Number(val) || 0));
    const y = 34 - (clamped / 100) * 30;
    return `${x},${y}`;
  }).join(' ');
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const wromDimensionSeries = computed(() => {
  const days = wromTrendRange.value === '30d' ? 30 : 7;
  const plans = Array.isArray(currentClientDetail.value?.plans) ? currentClientDetail.value.plans : [];
  const interactions = displayedInteractions.value;
  const userBreakdown = currentClientDetail.value?.user?.wrom_breakdown || {};
  const planMap = new Map<string, any>();
  plans.forEach((plan: any) => {
    if (plan?.date) planMap.set(plan.date, plan);
  });
  const interactionCountMap = new Map<string, number>();
  interactions.forEach((item: any) => {
    if (!item?.created_at) return;
    const key = getDateKey(new Date(item.created_at));
    interactionCountMap.set(key, (interactionCountMap.get(key) || 0) + 1);
  });
  const maxInteractionCount = Math.max(1, ...Array.from(interactionCountMap.values()));
  
  // 【修复】新客户互动分数计算问题：
  // 如果互动记录很少（少于3条），使用一个更合理的基准值
  const hasEnoughData = interactionCountMap.size >= 3;
  const engagementBase = hasEnoughData ? maxInteractionCount : Math.max(3, maxInteractionCount);
  
  const adherenceValues: number[] = [];
  const inventoryValues: number[] = [];
  const symptomValues: number[] = [];
  const engagementValues: number[] = [];
  const inventoryBase = clampPercent((Number(userBreakdown.inventory || 0) / 30) * 100);

  for (let i = days - 1; i >= 0; i--) {
    const currentDay = new Date();
    currentDay.setDate(currentDay.getDate() - i);
    const dateKey = getDateKey(currentDay);
    const dayPlan = planMap.get(dateKey);
    const tasks = Array.isArray(dayPlan?.tasks) ? dayPlan.tasks : [];
    const completed = tasks.filter((task: any) => !!task?.completed).length;
    const adherence = tasks.length ? clampPercent((completed / tasks.length) * 100) : 0;
    adherenceValues.push(adherence);

    const symptoms = Array.isArray(dayPlan?.symptoms) ? dayPlan.symptoms : [];
    const symptomAvg = symptoms.length ? symptoms.reduce((sum: number, symptom: any) => sum + Number(symptom?.value || 0), 0) / symptoms.length : 0;
    symptomValues.push(clampPercent((symptomAvg / 10) * 100));

    const interactionCount = Number(interactionCountMap.get(dateKey) || 0);
    // 【修复】使用 engagementBase 替代 maxInteractionCount
    engagementValues.push(clampPercent((interactionCount / engagementBase) * 100));

    inventoryValues.push(inventoryBase);
  }

  return [
    { key: 'adherence', label: '依从性', values: adherenceValues, latest: adherenceValues[adherenceValues.length - 1] || 0, stroke: '#10b981', textClass: 'text-emerald-500' },
    { key: 'inventory', label: '库存', values: inventoryValues, latest: inventoryValues[inventoryValues.length - 1] || 0, stroke: '#6366f1', textClass: 'text-indigo-500' },
    { key: 'symptom', label: '体感', values: symptomValues, latest: symptomValues[symptomValues.length - 1] || 0, stroke: '#f59e0b', textClass: 'text-amber-500' },
    { key: 'engagement', label: '互动', values: engagementValues, latest: engagementValues[engagementValues.length - 1] || 0, stroke: '#ec4899', textClass: 'text-pink-500' }
  ];
});

const rpsDimensionCards = computed(() => {
  return buildRpsBreakdownItems(currentClientDetail.value?.user?.rps_breakdown || {});
});
const wromBreakdownCards = computed(() => {
  return buildWromBreakdownItems(currentClientDetail.value?.user?.wrom_breakdown || {});
});
const scoreOverviewCards = computed(() => {
  return scoreOverviewTab.value === 'wrom' ? wromBreakdownCards.value : rpsDimensionCards.value;
});

const primaryRpsAction = computed(() => rpsDimensionCards.value.find((item) => item.isPrimary) || null);
const followUpActionHistory = computed(() => {
  const actions = Array.isArray(currentClientDetail.value?.followUpActions) ? currentClientDetail.value.followUpActions : [];
  return actions.slice(0, 5);
});
const toggleFormula = (type: 'wrom' | 'rps') => {
  scoreOverviewFormula.value = scoreOverviewFormula.value === type ? '' : type;
};
const formatActionDelta = (value: any) => {
  const numeric = Number(value || 0);
  return numeric > 0 ? `+${numeric}` : `${numeric}`;
};
const formatReviewDue = (timestamp: any) => {
  const numeric = Number(timestamp || 0);
  if (!numeric) return '3天后复核';
  return new Date(numeric).toLocaleDateString();
};

const submitPrimaryFollowUpAction = async () => {
  if (!currentClient.value || !primaryRpsAction.value || followUpActionLoading.value) return;
  
  if (!showFollowUpActionForm.value) {
    showFollowUpActionForm.value = true;
    return;
  }
  
  const note = followUpActionNote.value.trim();
  const feedback = followUpClientFeedback.value.trim();
  
  if (!note || !feedback) {
    uni.showToast({ title: '请填写完整跟进行动与反馈', icon: 'none' });
    return;
  }

  followUpActionLoading.value = true;
  try {
    const userInfo = getUserInfo();
    const res = await callCloud<any>('client-api', {
      action: 'completePrimaryFollowUpAction',
      payload: {
        clientId: currentClient.value.id || currentClient.value._id,
        title: `首要跟进：${primaryRpsAction.value.label}`,
        suggestion: primaryRpsAction.value.suggestion,
        actionNote: note,
        clientFeedback: feedback,
        source: 'rps_primary',
        userId: userInfo ? userInfo._id : ''
      }
    });
    if (!res.ok) {
      uni.showToast({ title: getApiErrorMessage(res.code, res.msg, '操作失败'), icon: 'none' });
      return;
    }
    const latestAction = res.data || null;
    if (!Array.isArray(currentClientDetail.value?.followUpActions)) {
      if (!currentClientDetail.value) currentClientDetail.value = {};
      currentClientDetail.value.followUpActions = [];
    }
    if (latestAction) {
      currentClientDetail.value.followUpActions = [latestAction, ...currentClientDetail.value.followUpActions];
    }
    await updateFollowUpStatus('跟进中');
    showFollowUpActionForm.value = false;
    followUpActionNote.value = '';
    followUpClientFeedback.value = '';
    uni.showToast({ title: '已记录，3天后自动复核', icon: 'success' });
  } catch (err) {
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
  } finally {
    followUpActionLoading.value = false;
  }
};

const openClientDrawer = async (client: any) => {
  currentClient.value = client;
  currentClientDetail.value = null; // 清空上一个客户的数据，避免显示旧方案
  activeDrawerTab.value = 'dashboard';
  showDrawer.value = true;
  // 【修复】重置日期选择，不默认选择任何日期（只显示历史记录）
  selectedCheckInDate.value = '';
  
  // Fetch Details
  drawerLoading.value = true;
  try {
    const userInfo = getUserInfo();
    const res = await callCloud<any>('client-api', {
      action: 'getClientDetail',
      payload: { clientId: client.id, userId: userInfo ? userInfo._id : '' }
    });
    
    if (res.ok) {
      currentClientDetail.value = res.data || {};
      console.log('openClientDrawer - received data:', JSON.stringify(res.data));
      console.log('openClientDrawer - protocol:', res.data?.protocol);
      draftMessage.value = '';
      if (currentClientDetail.value?.user?.follow_up_status && !followUpStatusOptions.includes(currentClientDetail.value.user.follow_up_status)) {
        currentClientDetail.value.user.follow_up_status = '未处理';
      }

      // 【新增】获取历史打卡记录（最近30天）用于趋势图展示
      try {
        const checkInRes = await callCloud<any>('client-api', {
          action: 'getCheckInRecords',
          payload: { clientId: client.id, userId: userInfo ? userInfo._id : '', limit: 30 }
        });
        if (checkInRes.ok && checkInRes.data?.summaryByDate) {
          clientCheckInHistory.value = checkInRes.data.summaryByDate;
          console.log('[历史打卡] 获取到', clientCheckInHistory.value.length, '天的打卡记录');
        }
      } catch (e) {
        console.warn('[历史打卡] 获取失败（非致命）:', e);
      }
    } else {
      if (res.isResourceExhausted) {
        currentClientDetail.value = {
          user: currentClient.value,
          plans: [],
          interactions: [],
          protocol: null,
          pendingRefills: []
        };
        draftMessage.value = '';
        uni.showToast({ title: '资源超限，详情已切换演示模式', icon: 'none' });
      } else {
        uni.showToast({ title: getApiErrorMessage(res.code, res.msg, '客户详情加载失败'), icon: 'none' });
      }
    }
  } catch (err) {
    console.error('Failed to fetch client detail:', err);
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
  } finally {
    drawerLoading.value = false;
  }
};

const closeDrawer = () => {
  showDrawer.value = false;
  currentClient.value = null;
  currentClientDetail.value = null;
  clientCheckInHistory.value = [];
  trendDateRange.value = 14; // 重置时间范围
  showClientComparison.value = false; // 关闭对比弹窗
  comparisonClients.value = []; // 清空对比客户
  exportingReport.value = false; // 重置导出状态
  isEditingHistory.value = false;
  editedHistoryTasks.value = [];
  draftMessage.value = '';
  selectedCheckInDate.value = '';
};

const updateFollowUpStatus = async (status: FollowUpStatus) => {
  if (!currentClient.value || currentFollowUpStatus.value === status || followUpStatusLoading.value) return;
  followUpStatusLoading.value = true;
  try {
    const userInfo = getUserInfo();
    const res = await callCloud('client-api', {
      action: 'updateClientFollowUpStatus',
      payload: {
        clientId: currentClient.value.id || currentClient.value._id,
        status,
        userId: userInfo ? userInfo._id : ''
      }
    });
    if (!res.ok) {
      uni.showToast({ title: getApiErrorMessage(res.code, res.msg, '状态更新失败'), icon: 'none' });
      return;
    }
    if (currentClientDetail.value?.user) currentClientDetail.value.user.follow_up_status = status;
    if (currentClient.value) currentClient.value.followUpStatus = status;
    clients.value = clients.value.map((client) =>
      (client.id === (currentClient.value.id || currentClient.value._id) ? { ...client, followUpStatus: status } : client)
    );
    uni.showToast({ title: '状态已更新', icon: 'success' });
  } catch (err) {
    console.error('Failed to update follow-up status:', err);
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
  } finally {
    followUpStatusLoading.value = false;
  }
};

const sendChatMessage = async () => {
  if (!currentClient.value || !draftMessage.value.trim() || sendingMessage.value) return;
  sendingMessage.value = true;
  try {
    const userInfo = getUserInfo();
    const message = draftMessage.value.trim();
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
    });
    if (!res.ok) {
      uni.showToast({ title: getApiErrorMessage(res.code, res.msg, '发送失败'), icon: 'none' });
      return;
    }
    if (!Array.isArray(currentClientDetail.value.interactions)) currentClientDetail.value.interactions = [];
    currentClientDetail.value.interactions.push({
      _id: `temp_${Date.now()}`,
      user_id: currentClient.value.id || currentClient.value._id,
      nutritionist_id: userInfo?._id || '',
      nutritionist_name: userInfo?.username || userInfo?.nickname || '营养顾问',
      sender_role: 'nutritionist',
      type: 'wechat',
      content: message,
      created_at: Date.now()
    });
    draftMessage.value = '';
    // 【修复】移除 updateFollowUpStatus 调用
    // 原因：addClientLog API 内部已经自动更新 follow_up_status（第5470行）
    // 不需要重复调用，避免 "未知操作: updateClientFollowUpStatus" 错误
    if (currentClientDetail.value?.user) {
      currentClientDetail.value.user.follow_up_status = '待回复';
    }
    if (currentClient.value) {
      currentClient.value.followUpStatus = '待回复';
    }
  } catch (err) {
    console.error('Failed to send message:', err);
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
  } finally {
    sendingMessage.value = false;
  }
};

const openProtocolEditor = () => {
  console.log('🔧 点击制定方案按钮');
  console.log('📋 当前客户信息:', currentClient.value);
  
  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }
  
  const clientId = currentClient.value.id || currentClient.value._id;
  console.log('🚀 准备跳转到方案制定页面，客户ID:', clientId);
  
  uni.navigateTo({
    url: `/pages/admin/protocol/index?clientId=${clientId}`,
    success: () => {
      console.log('✅ 成功跳转到方案制定页面');
    },
    fail: (error) => {
      console.error('❌ 跳转失败:', error);
      uni.showToast({ title: '页面跳转失败', icon: 'none' });
    }
  });
};

const openTemplateSelector = () => {
  console.log('📚 点击从配方库选择按钮');
  
  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }
  
  const clientId = currentClient.value.id || currentClient.value._id;
  console.log('🚀 准备跳转到配方库选择页面，客户ID:', clientId);
  
  uni.navigateTo({
    url: `/pages/admin/templates/select?clientId=${clientId}`,
    success: () => {
      console.log('✅ 成功跳转到配方库选择页面');
    },
    fail: (error) => {
      console.error('❌ 跳转失败:', error);
      uni.showToast({ title: '页面跳转失败', icon: 'none' });
    }
  });
};

// 停止当前方案
const stopProtocol = async () => {
  console.log('🛑 点击停止当前方案按钮');
  
  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }
  
  if (!currentClientDetail.value?.protocol) {
    console.log('❌ 客户没有正在执行的方案');
    uni.showToast({ title: '客户暂无执行中的方案', icon: 'none' });
    return;
  }
  
  const clientId = currentClient.value.id || currentClient.value._id;
  
  uni.showModal({
    title: '确认停止',
    content: '确定要停止当前执行的健康方案吗？停止后客户将无法看到今日打卡任务。',
    confirmColor: '#f43f5e',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '停止中...' });
        
        try {
          const result = await callCloud('client-api', {
            action: 'deleteDailyPlan',
            payload: {
              user_id: clientId
            }
          });
          
          console.log('🛑 停止方案结果:', result);
          
          if (result.ok) {
            uni.showToast({ title: '方案已停止', icon: 'success' });
            // 刷新客户详情
            await openClientDrawer(currentClient.value);
          } else {
            uni.showToast({ title: result.msg || '停止失败', icon: 'none' });
          }
        } catch (err) {
          console.error('❌ 停止方案失败:', err);
          uni.showToast({ title: '停止失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

// 从配方库同步当前方案
const syncFromTemplate = async () => {
  console.log('🔄 点击从配方库同步按钮');
  
  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }
  
  if (!currentClientDetail.value?.protocol) {
    console.log('❌ 客户没有正在执行的方案');
    uni.showToast({ title: '客户暂无执行中的方案，请先选择配方', icon: 'none' });
    return;
  }
  
  const clientId = currentClient.value.id || currentClient.value._id;
  const protocol = currentClientDetail.value.protocol;
  const templateId = protocol.template_id;
  
  console.log('🔄 协议数据:', protocol);
  console.log('🔄 模板ID:', templateId);
  
  if (!templateId) {
    uni.showToast({ title: '当前方案没有关联的配方模板', icon: 'none' });
    return;
  }
  
  console.log('🔄 准备从配方库同步，客户ID:', clientId, '模板ID:', templateId);
  
  uni.showModal({
    title: '确认同步',
    content: '将从配方库重新获取最新内容并更新当前方案，是否继续？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '同步中...' });
        
        try {
          const result = await callCloud('client-api', {
            action: 'applyTemplate',
            payload: {
              user_id: clientId,
              template_id: templateId,
              force: true // 强制重新应用
            }
          });
          
          console.log('🔄 同步结果:', result);
          
          if (result.code === 0 || result.ok) {
            uni.showToast({ title: '同步成功', icon: 'success' });
            // 刷新客户详情
            await openClientDrawer(currentClient.value);
            // 【优化】同步成功后跳转到客户档案概览页
            activeDrawerTab.value = 'dashboard';
          } else {
            uni.showToast({ title: result.msg || '同步失败', icon: 'none' });
          }
        } catch (err) {
          console.error('❌ 同步失败:', err);
          uni.showToast({ title: '同步失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

// 编辑当前方案
const editCurrentProtocol = () => {
  console.log('✏️ 点击编辑当前方案按钮');
  
  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }
  
  if (!currentClientDetail.value?.protocol) {
    console.log('❌ 客户没有正在执行的方案');
    uni.showToast({ title: '客户暂无执行中的方案', icon: 'none' });
    return;
  }
  
  const clientId = currentClient.value.id || currentClient.value._id;
  const protocol = currentClientDetail.value.protocol;
  
  console.log('🚀 准备跳转到方案编辑页面，客户ID:', clientId);
  console.log('📋 当前方案:', protocol);
  
  // 将当前方案数据传递到编辑页面
  uni.navigateTo({
    url: `/pages/admin/protocol/edit?clientId=${clientId}&editMode=true`,
    success: () => {
      console.log('✅ 成功跳转到方案编辑页面');
      // 通过事件传递方案数据
      uni.$emit('protocol-data-for-edit', {
        clientId,
        protocol: protocol
      });
    },
    fail: (error) => {
      console.error('❌ 跳转失败:', error);
      uni.showToast({ title: '页面跳转失败', icon: 'none' });
    }
  });
};

// 编辑指定方案（支持多方案）
const editProtocol = (protocol: any) => {
  console.log('✏️ 点击编辑方案按钮:', protocol.name);
  
  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }
  
  const clientId = currentClient.value.id || currentClient.value._id;
  
  console.log('🚀 准备跳转到方案编辑页面，客户ID:', clientId);
  console.log('📋 编辑方案:', protocol);
  
  // 将方案数据传递到编辑页面
  uni.navigateTo({
    url: `/pages/admin/protocol/edit?clientId=${clientId}&protocolId=${protocol.id}&editMode=true`,
    success: () => {
      console.log('✅ 成功跳转到方案编辑页面');
      // 通过事件传递方案数据
      uni.$emit('protocol-data-for-edit', {
        clientId,
        protocol: protocol
      });
    },
    fail: (error) => {
      console.error('❌ 跳转失败:', error);
      uni.showToast({ title: '页面跳转失败', icon: 'none' });
    }
  });
};

// 同步指定方案（支持多方案）
const syncProtocol = async (protocol: any) => {
  console.log('🔄 点击同步方案按钮:', protocol.name);
  
  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }
  
  const clientId = currentClient.value.id || currentClient.value._id;
  const templateId = protocol.template_id;
  
  if (!templateId) {
    uni.showToast({ title: '该方案没有关联的配方模板', icon: 'none' });
    return;
  }
  
  console.log('🔄 准备从配方库同步，客户ID:', clientId, '模板ID:', templateId);
  
  uni.showModal({
    title: '确认同步',
    content: `确定要同步方案"${protocol.name}"吗？将从配方库重新获取最新内容。`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '同步中...' });
        
        try {
          const result = await callCloud('client-api', {
            action: 'applyTemplate',
            payload: {
              user_id: clientId,
              template_id: templateId,
              force: true
            }
          });
          
          console.log('🔄 同步结果:', result);
          
          if (result.ok) {
            uni.showToast({ title: '同步成功', icon: 'success' });
            // 【新增】同步成功后刷新详情并跳转到档案页
            await openClientDrawer(currentClient.value);
            activeDrawerTab.value = 'dashboard';
          } else {
            uni.showToast({ title: result.msg || '同步失败', icon: 'none' });
          }
        } catch (err) {
          console.error('❌ 同步方案失败:', err);
          uni.showToast({ title: '同步失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

const stopProtocolById = async (protocol: any) => {
  console.log('🛑 点击停止方案按钮:', protocol.name);

  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }

  const clientId = currentClient.value.id || currentClient.value._id;

  uni.showModal({
    title: '确认停止',
    content: `确定要停止方案"${protocol.name}"吗？停止后该方案的任务将不再显示在客户今日打卡中。`,
    confirmColor: '#f43f5e',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '停止中...' });

        try {
          // 调用云函数停止指定方案
          const result = await callCloud('client-api', {
            action: 'stopProtocol',
            payload: {
              user_id: clientId,
              protocol_id: protocol.id
            }
          });

          console.log('🛑 停止方案结果:', result);

          if (result.ok) {
            uni.showToast({ title: '方案已停止', icon: 'success' });
            // 只刷新客户协议数据，不切换标签页
            await refreshClientProtocols(clientId);
          } else {
            uni.showToast({ title: result.msg || '停止失败', icon: 'none' });
          }
        } catch (err) {
          console.error('❌ 停止方案失败:', err);
          uni.showToast({ title: '停止失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

// 恢复指定方案
const resumeProtocolById = async (protocol: any) => {
  console.log('▶️ 点击恢复方案按钮:', protocol.name);

  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }

  const clientId = currentClient.value.id || currentClient.value._id;

  uni.showModal({
    title: '确认恢复',
    content: `确定要恢复方案"${protocol.name}"吗？恢复后该方案的任务将重新显示在客户今日打卡中。`,
    confirmColor: '#10b981',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '恢复中...' });

        try {
          // 调用云函数恢复指定方案
          const result = await callCloud('client-api', {
            action: 'resumeProtocol',
            payload: {
              user_id: clientId,
              protocol_id: protocol.id
            }
          });

          console.log('▶️ 恢复方案结果:', result);

          if (result.ok) {
            uni.showToast({ title: '方案已恢复', icon: 'success' });
            // 只刷新客户协议数据，不切换标签页
            await refreshClientProtocols(clientId);
          } else {
            uni.showToast({ title: result.msg || '恢复失败', icon: 'none' });
          }
        } catch (err) {
          console.error('❌ 恢复方案失败:', err);
          uni.showToast({ title: '恢复失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

// 删除指定方案
const deleteProtocolById = async (protocol: any) => {
  console.log('🗑️ 点击删除方案按钮:', protocol.name);

  if (!currentClient.value) {
    console.log('❌ 没有选择客户');
    uni.showToast({ title: '请先选择客户', icon: 'none' });
    return;
  }

  const clientId = currentClient.value.id || currentClient.value._id;

  uni.showModal({
    title: '确认删除',
    content: `确定要永久删除方案"${protocol.name}"吗？此操作不可撤销。`,
    confirmColor: '#f43f5e',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中...' });

        try {
          // 调用云函数删除指定方案
          const result = await callCloud('client-api', {
            action: 'deleteProtocol',
            payload: {
              user_id: clientId,
              protocol_id: protocol.id
            }
          });

          console.log('🗑️ 删除方案结果:', result);

          if (result.ok) {
            uni.showToast({ title: '方案已删除', icon: 'success' });
            // 只刷新客户协议数据，不切换标签页
            await refreshClientProtocols(clientId);
          } else {
            uni.showToast({ title: result.msg || '删除失败', icon: 'none' });
          }
        } catch (err) {
          console.error('❌ 删除方案失败:', err);
          uni.showToast({ title: '删除失败', icon: 'none' });
        } finally {
          uni.hideLoading();
        }
      }
    }
  });
};

// 只刷新客户协议数据（不切换标签页）
const refreshClientProtocols = async (clientId: string) => {
  console.log('🔄 刷新客户协议数据, clientId:', clientId);

  try {
    const result = await callCloud('client-api', {
      action: 'getClientDetail',
      payload: { clientId }
    });

    console.log('📊 刷新结果:', result);

    if (result.code === 0 && result.data) {
      const data = result.data as any;

      // 更新 currentClientDetail 中的协议数据（模板使用 currentClientDetail.protocols）
      if (currentClientDetail.value) {
        // 使用解构创建新对象，确保 Vue 响应式更新
        currentClientDetail.value = {
          ...currentClientDetail.value,
          protocols: data.protocols || [],
          protocol: data.protocol,
          plans: data.plans || [],
          today_checkin: data.today_checkin
        };
      }

      // 同时更新本地 ref（用于其他逻辑）
      clientProtocols.value = data.protocols || [];
      clientProtocol.value = data.protocol;
      todayCheckIn.value = data.today_checkin;

      // 【同步更新主列表】找到主列表中的对应客户并刷新其状态
      const clientIndex = clients.value.findIndex((c: any) => (c.id || c._id) === clientId);
      if (clientIndex !== -1) {
        clients.value[clientIndex] = {
          ...clients.value[clientIndex],
          assignedTemplates: data.protocols || [],
          // 重新计算库存状态
          inventoryStatus: data.inventory_summary?.status || 'normal',
          lowInventoryCount: data.inventory_summary?.low_count || 0,
          lowInventoryItems: data.inventory_summary?.low_items || []
        };
      }

      console.log('✅ 协议数据已刷新并同步到主列表, 方案数量:', data.protocols?.length || 0);
    } else {
      console.error('❌ 刷新协议数据失败:', result.msg);
    }
  } catch (err) {
    console.error('❌ 刷新协议数据出错:', err);
  }
};
</script>

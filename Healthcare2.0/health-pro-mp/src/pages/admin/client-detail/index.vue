<template>
  <div class="mp-page-shell min-h-screen bg-transparent flex flex-col">
    <!-- Header -->
    <div class="bg-white sticky top-0 z-50 shadow-sm">
      <!-- 状态栏占位 -->
      <div :style="{ height: statusBarHeight + 'px' }"></div>
      <!-- 导航栏内容 -->
      <div class="h-12 px-4 flex items-center justify-between border-b border-slate-100">
        <div class="flex items-center gap-3">
          <button @click="goBack" class="flex items-center gap-1 pl-2 pr-3 py-1.5 rounded-full bg-white border border-slate-200 z-50 hover:bg-slate-50 shadow-md mp-pressable">
            <ArrowLeft class="w-4 h-4 text-slate-900" />
            <span class="text-xs font-bold text-slate-900">返回</span>
          </button>
          <h2 class="text-base font-bold text-slate-800">客户详情</h2>
        </div>
        <div class="w-8"></div>
      </div>
    </div>

    <main class="flex-1 overflow-y-auto pb-10">
      <!-- 加载中 -->
      <view v-if="loading" class="flex flex-col items-center justify-center py-20">
        <view class="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></view>
        <text class="text-sm text-slate-400">加载客户信息...</text>
      </view>

      <!-- 加载失败 -->
      <view v-else-if="!client" class="flex flex-col items-center justify-center py-20 px-6">
        <text class="text-lg text-slate-400 mb-2">😕</text>
        <text class="text-sm text-slate-400 text-center mb-4">无法加载客户信息</text>
        <view @tap="fetchClientData" class="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold">
          重新加载
        </view>
      </view>

      <!-- 客户内容 -->
      <template v-else>
      <!-- 客户简报卡片 (Mobile Optimized) -->
      <div class="bg-white p-6 pb-8 rounded-b-[32px] shadow-md shadow-slate-200 mb-6 relative overflow-hidden border-b border-slate-100">
        <!-- 装饰背景 -->
        <div class="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>
        
        <div class="relative z-10 flex items-start gap-5">
          <!-- 头像 -->
          <div class="w-16 h-16 shrink-0 bg-emerald-500 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-emerald-500/20">
            {{ client.name[0] }}
          </div>
          
          <!-- 信息 -->
          <div class="flex-1 min-w-0 pt-1">
            <div class="flex items-center justify-between mb-1">
              <h1 class="text-xl font-black text-slate-900 truncate">{{ client.name }}</h1>
              <div class="text-lg font-black text-emerald-500 font-mono">{{ client.wrom_score || 0 }}</div>
            </div>
            
            <div class="flex items-center gap-2 mb-3">
              <span v-for="tag in client.tags" :key="tag" class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md border border-slate-200/50">
                {{ tag }}
              </span>
            </div>

            <div class="flex items-center gap-4 text-xs font-bold text-slate-400">
              <div class="flex items-center gap-1.5">
                <div class="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                {{ client.phone }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Switcher (Segmented Control) - Fixed Style -->
      <div class="px-4 mb-6 sticky top-[calc(48px+var(--status-bar-height))] z-40 bg-slate-100 py-2 -mt-2">
        <div class="bg-slate-200 p-1 rounded-xl grid grid-cols-3 gap-1 shadow-inner">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="currentTab = tab.id"
            class="flex items-center justify-center gap-2 py-2.5 text-xs font-black rounded-lg transition-all duration-200 mp-pressable"
            :class="currentTab === tab.id 
              ? 'bg-white text-emerald-600 shadow-sm scale-[1.02]' 
              : 'text-slate-500 hover:text-slate-700'"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>


      <!-- Tab Content -->
      <div class="px-4 pb-20 min-h-[50vh]">
        <!-- Plan Tab -->
        <div v-if="currentTab === 'plan'" class="space-y-4 animate-in slide-in-from-right-4 duration-300">
          
          <!-- 今日打卡详情 -->
          <div class="bg-white rounded-[24px] p-5 shadow-md shadow-slate-200 border border-slate-200">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <span class="text-lg">📋</span>
                </div>
                <h3 class="text-slate-900 font-black text-sm">今日打卡 ({{ new Date().toISOString().split('T')[0] }})</h3>
              </div>
              <span v-if="todayCheckIn" class="px-2 py-1 text-[10px] font-bold rounded" :class="todayCheckIn.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : todayCheckIn.status === 'partial' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'">
                {{ todayCheckIn.status === 'completed' ? '已完成' : todayCheckIn.status === 'partial' ? '进行中' : '未开始' }}
              </span>
            </div>

            <!-- 今日任务列表 -->
            <div v-if="todayTasks.length > 0" class="space-y-2">
              <div v-for="(task, idx) in todayTasks" :key="idx" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border" :class="task.completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'">
                <div class="flex items-center gap-3">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs" :class="task.completed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'">
                    {{ task.completed ? '✓' : (idx + 1) }}
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-700">{{ task.product_name || '未命名产品' }}</div>
                    <div class="text-[10px] text-slate-400">{{ task.dose || `${task.daily_usage || 1}${task.unit || '粒'}` }} · {{ task.slot || '早' }}</div>
                  </div>
                </div>
                <div class="text-[10px] text-slate-400 px-2 py-1 bg-white rounded border border-slate-200">
                  {{ task.template_name || '健康方案' }}
                </div>
              </div>
            </div>
            <div v-else class="py-8 text-center text-slate-300">
              <p class="text-xs">今日暂无打卡任务</p>
            </div>

            <!-- 饮水和体感汇总（使用打卡记录数据源，确保和小程序一致） -->
            <div v-if="todayCheckIn" class="mt-4 pt-4 border-t border-slate-100 flex gap-4">
              <div class="flex-1 p-3 bg-blue-50 rounded-xl text-center">
                <div class="text-[10px] text-blue-400 mb-1">💧 今日饮水</div>
                <div class="text-sm font-black text-slate-700">{{ todayCheckIn.water_intake || 0 }}<span class="text-[10px] font-normal text-slate-400">L</span></div>
              </div>
              <div class="flex-1 p-3 bg-rose-50 rounded-xl text-center">
                <div class="text-[10px] text-rose-400 mb-1">🌡️ 体感记录</div>
                <div class="text-sm font-black text-slate-700">{{ todayCheckIn.symptoms?.length || 0 }}<span class="text-[10px] font-normal text-slate-400">项</span></div>
              </div>
              <div class="flex-1 p-3 bg-emerald-50 rounded-xl text-center">
                <div class="text-[10px] text-emerald-400 mb-1">✓ 完成进度</div>
                <div class="text-sm font-black text-slate-700">{{ todayCheckIn.completed || 0 }}/{{ todayCheckIn.total || 0 }}</div>
              </div>
            </div>
          </div>

          <!-- 库存预警提示 -->
          <div v-if="inventoryAlerts.length > 0" class="bg-rose-50 border border-rose-200 rounded-[24px] p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-lg">⚠️</span>
              <h3 class="text-rose-700 font-black text-sm">库存预警</h3>
            </div>
            <div class="space-y-2">
              <div v-for="(alert, idx) in inventoryAlerts" :key="idx" class="flex items-center justify-between p-2 bg-white rounded-lg">
                <div class="text-xs font-medium text-slate-700">{{ alert.product_name }}</div>
                <div class="text-[10px] font-bold" :class="alert.stock === 0 ? 'text-rose-500' : 'text-amber-500'">
                  {{ alert.stock === 0 ? '未入库' : `剩${alert.days_remaining}天` }}
                </div>
              </div>
            </div>
            <p class="text-[10px] text-rose-500 mt-2">库存不足可能导致打卡失败，请及时补充</p>
          </div>

          <!-- 最近打卡动态 -->
          <div v-if="recentPlans.length > 0" class="bg-white rounded-[24px] p-5 shadow-md shadow-slate-200 border border-slate-200">
             <div class="flex items-center gap-2 mb-4">
                <div class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                  <span class="text-lg">📅</span>
                </div>
                <h3 class="text-slate-900 font-black text-sm">最近打卡动态</h3>
             </div>
             
             <div class="space-y-3">
               <div v-for="plan in recentPlans.slice(0, 3)" :key="plan._id" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <div class="flex items-center gap-3">
                   <div class="text-center w-8">
                     <div class="text-[10px] text-slate-400 font-bold uppercase">{{ new Date(plan.date).toLocaleDateString('zh-CN', { weekday: 'short' }) }}</div>
              <div class="text-sm font-black text-slate-700">{{ new Date(plan.date).getDate() }}</div>
            </div>
            <div class="w-[1px] h-8 bg-slate-200"></div>
            <div>
              <div class="text-xs font-bold text-slate-600 mb-1">任务完成</div>
                     <div class="flex items-center gap-1">
                        <div class="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                           <div class="h-full bg-emerald-500 rounded-full" :style="{ width: (plan.tasks.filter((t: any) => t.completed).length / (plan.tasks.length || 1) * 100) + '%' }"></div>
                        </div>
                        <span class="text-[10px] text-slate-400 font-medium">{{ plan.tasks.filter((t: any) => t.completed).length }}/{{ plan.tasks.length }}</span>
                     </div>
                   </div>
                 </div>
                 
                 <div class="flex items-center gap-3">
                    <div class="text-center" v-if="plan.water_intake > 0">
                       <div class="text-[10px] text-blue-400">💧</div>
                       <div class="text-[10px] font-bold text-slate-600">{{ plan.water_intake }}L</div>
                    </div>
                    <div class="text-center" v-if="plan.symptoms && plan.symptoms.length > 0">
                       <div class="text-[10px] text-rose-400">🌡️</div>
                       <div class="text-[10px] font-bold text-slate-600">{{ plan.symptoms.length }}项</div>
                    </div>
                 </div>
               </div>
             </div>
          </div>

          <!-- 【新增】历史打卡记录汇总 -->
          <div v-if="checkInHistory.length > 0" class="bg-white rounded-[24px] p-5 shadow-md shadow-slate-200 border border-slate-200">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                <span class="text-lg">📊</span>
              </div>
              <h3 class="text-slate-900 font-black text-sm">打卡记录汇总</h3>
              <span class="text-[10px] text-slate-400 ml-auto">近{{ checkInHistory.length }}天</span>
            </div>
            
            <div class="space-y-2">
              <div v-for="day in checkInHistory.slice(0, 7)" :key="day.date" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div class="flex items-center gap-3">
                  <div class="text-center w-12">
                    <div class="text-[10px] text-slate-400 font-bold">{{ day.date.slice(5) }}</div>
                  </div>
                  <div class="w-[1px] h-6 bg-slate-200"></div>
                  <div class="flex items-center gap-1">
                    <div class="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div class="h-full bg-emerald-500 rounded-full transition-all" :style="{ width: (day.completedTasks / (day.totalTasks || 1) * 100) + '%' }"></div>
                    </div>
                    <span class="text-[10px] text-slate-500 font-bold w-8">{{ day.completedTasks }}/{{ day.totalTasks }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span v-if="day.water_intake > 0" class="text-[10px] text-blue-500 font-bold">💧{{ day.water_intake }}L</span>
                  <span class="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    :class="day.completedTasks === day.totalTasks && day.totalTasks > 0 ? 'bg-emerald-100 text-emerald-600' : day.completedTasks > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'"
                  >
                    {{ day.completedTasks === day.totalTasks && day.totalTasks > 0 ? '全勤' : day.completedTasks > 0 ? '部分' : '未打' }}
                  </span>
                </div>
              </div>
            </div>
          </div>


          <!-- 正在进行的方案 -->
          <div v-if="activeProtocols.length > 0" class="space-y-4">
            <div
              v-for="(proto, pIndex) in activeProtocols"
              :key="proto.id || pIndex"
              class="bg-white rounded-[24px] p-5 shadow-md shadow-slate-200 border border-slate-200"
            >
              <div class="flex items-center justify-between mb-5">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <FlaskConical class="w-5 h-5" />
                  </div>
                  <div>
                    <h3 class="text-slate-900 font-black text-sm line-clamp-1">{{ proto.name }}</h3>
                    <p class="text-[10px] text-slate-400 font-bold mt-0.5">开始: {{ proto.startDate }}</p>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button
                    @click="editCurrentProtocol"
                    class="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg active:scale-95 transition-all"
                  >
                    编辑
                  </button>
                  <button
                    @click="createNewProtocol"
                    class="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    +新方案
                  </button>
                </div>
              </div>

              <!-- 阶段列表 -->
              <div class="space-y-3 relative" v-if="proto.phases && proto.phases.length > 0">
                <div class="absolute left-[19px] top-4 bottom-4 w-0.5 bg-slate-200 -z-0"></div>

                <div
                  v-for="(phase, index) in proto.phases"
                  :key="index"
                  class="relative z-10 bg-white rounded-xl border transition-all duration-300 overflow-hidden"
                  :class="[
                    phase.status === 'active' ? 'border-emerald-200 shadow-sm ring-1 ring-emerald-100' : 'border-slate-200',
                    phase.expanded ? 'pb-3' : ''
                  ]"
                >
                  <div
                    @click="togglePhase(pIndex, index)"
                    class="p-3 flex items-center gap-3 cursor-pointer active:bg-slate-50 transition-colors mp-pressable"
                  >
                    <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 bg-white"
                      :class="{
                        'border-emerald-500 text-emerald-500': phase.status === 'completed',
                        'border-emerald-500 text-emerald-500 animate-pulse': phase.status === 'active',
                        'border-slate-200 text-slate-300': phase.status === 'pending'
                      }"
                    >
                      <div v-if="phase.status === 'active'" class="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <CheckCircle2 v-else-if="phase.status === 'completed'" class="w-3 h-3" />
                      <Circle v-else class="w-3 h-3" />
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <h4 class="text-xs font-black text-slate-700 truncate pr-2" :class="{'text-emerald-600': phase.status === 'active'}">
                          {{ phase.name }}
                        </h4>
                        <ChevronDown
                          class="w-4 h-4 text-slate-300 transition-transform duration-300"
                          :class="{ 'rotate-180': phase.expanded }"
                        />
                      </div>
                      <div class="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                        <span v-if="phase.status === 'active'" class="text-emerald-500 font-bold">进行中: 第 {{ phase.currentDay }}/{{ phase.duration }} 天</span>
                        <span v-else>持续 {{ phase.duration }} 天</span>
                      </div>
                    </div>
                  </div>

                  <div v-show="phase.expanded" class="px-3 ml-8 border-l-2 border-slate-50 space-y-2">
                    <div v-for="prod in phase.products" :key="prod.name" class="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between">
                      <div>
                        <div class="text-xs font-bold text-slate-700 line-clamp-1">{{ prod.name }}</div>
                        <div class="text-[10px] text-slate-400 mt-0.5">{{ prod.dosage }}</div>
                      </div>
                      <div class="text-[10px] font-black text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                        {{ prod.frequency }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="py-12 flex flex-col items-center justify-center text-slate-300">
            <FlaskConical class="w-12 h-12 mb-3 opacity-50" />
            <p class="text-xs font-bold mb-4">暂无正在执行的配方</p>
            <div class="flex gap-3">
              <!-- 快速分配方案按钮 -->
              <button
                @click="showAssignModal = true"
                class="px-6 py-3 bg-emerald-500 text-white text-sm font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2"
              >
                <span class="text-lg">📋</span>
                分配健康方案
              </button>
              <!-- 分享报告按钮 -->
              <button
                @click="shareReport"
                class="px-6 py-3 bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg active:scale-95 flex items-center gap-2"
              >
                <span class="text-lg">📤</span>
                分享报告
              </button>
            </div>
          </div>
        </div>

        <!-- Trends Tab -->
        <div v-else-if="currentTab === 'trends'" class="animate-in slide-in-from-right-4 duration-300">
           <HealthTrendChart :clientId="clientId" />
        </div>

        <!-- Notes Tab -->
        <div v-else-if="currentTab === 'notes'" class="space-y-4 animate-in slide-in-from-right-4 duration-300">
          <div class="space-y-6 relative pl-4">
             <!-- 时间轴线 -->
             <div class="absolute left-[19px] top-0 bottom-0 w-[1px] bg-slate-300"></div>

             <div v-for="log in followUpLogs" :key="log._id" class="relative">
               <!-- 时间点 -->
               <div class="absolute left-[-19px] top-0 w-[38px] flex justify-center">
                 <div class="w-2.5 h-2.5 rounded-full border-2 border-white ring-1 ring-slate-300 bg-slate-300 mt-1.5"
                   :class="{'bg-indigo-500 ring-indigo-200': log._id === followUpLogs[0]._id}"
                 ></div>
               </div>

               <!-- 内容卡片 -->
               <div class="ml-4">
                 <div class="flex items-baseline justify-between mb-2">
                   <div class="text-xs font-bold text-slate-500">{{ log.date }}</div>
                   <div class="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-600 border border-slate-200 shadow-sm">
                     {{ log.type }}
                   </div>
                 </div>
                 
                 <div class="bg-white p-4 rounded-xl rounded-tl-none shadow-md shadow-slate-200 border border-slate-200 text-sm text-slate-600 leading-relaxed relative">
                   <!-- 小三角 -->
                   <div class="absolute top-0 -left-[6px] w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent drop-shadow-sm filter"></div>
                   <div class="mb-2 flex items-center gap-2">
                     <span class="text-xs font-black text-slate-800">{{ log.nutritionist }}</span>
                   </div>
                   {{ log.content }}
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
      </template>
    </main>
  </div>

  <!-- 快速分配方案弹窗 -->
  <view v-if="showAssignModal" class="fixed inset-0 flex items-end justify-center" style="z-index: 999999; background-color: rgba(0,0,0,0.5);" @click="showAssignModal = false">
    <view class="bg-white w-full max-w-md rounded-t-[32px] p-6 shadow-2xl max-h-[80vh] overflow-y-auto" style="background-color: #ffffff;" @click.stop="">
      <!-- 弹窗头部 -->
      <view class="flex items-center justify-between mb-6">
        <view>
          <h3 class="text-lg font-black text-slate-900">分配健康方案</h3>
          <p class="text-xs text-slate-400 mt-1">为客户：{{ client?.name }}</p>
        </view>
        <button @click="showAssignModal = false" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          ×
        </button>
      </view>

      <!-- 加载中 -->
      <view v-if="loadingTemplates" class="py-8 flex flex-col items-center justify-center">
        <view class="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3"></view>
        <text class="text-xs text-slate-400">加载方案模板...</text>
      </view>

      <!-- 方案列表 -->
      <view v-else-if="protocolTemplates.length > 0" class="space-y-3 mb-6">
        <view
          v-for="template in protocolTemplates"
          :key="template.id"
          @tap="selectedTemplate = template"
          class="p-4 rounded-2xl border-2 transition-all cursor-pointer"
          :class="selectedTemplate?.id === template.id 
            ? 'border-emerald-500 bg-emerald-50' 
            : 'border-slate-100 bg-slate-50 hover:border-slate-200'"
        >
          <view class="flex items-start justify-between">
            <view>
              <h4 class="font-bold text-slate-900 text-sm">{{ template.name }}</h4>
              <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ template.description || '暂无描述' }}</p>
            </view>
            <view v-if="selectedTemplate?.id === template.id" class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
              ✓
            </view>
          </view>
          <view class="flex items-center gap-3 mt-3">
            <span class="text-[10px] px-2 py-1 bg-white rounded-md text-slate-500 border border-slate-200">
              {{ template.duration }}天
            </span>
            <span class="text-[10px] px-2 py-1 bg-white rounded-md text-slate-500 border border-slate-200">
              {{ template.productCount }}个产品
            </span>
            <span v-if="template.isActive" class="text-[10px] px-2 py-1 bg-emerald-100 rounded-md text-emerald-600 border border-emerald-200">
              激活
            </span>
          </view>
        </view>
      </view>

      <view v-else class="py-8 text-center text-slate-400">
        <p class="text-sm">暂无可用方案模板</p>
        <p class="text-xs mt-2">请先在PC端创建方案</p>
      </view>

      <!-- 备注输入 -->
      <view v-if="selectedTemplate" class="mb-4">
        <label class="text-xs font-bold text-slate-600 mb-2 block">备注（可选）</label>
        <textarea
          v-model="assignNotes"
          placeholder="给客户的话..."
          class="w-full h-20 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 border border-slate-200 resize-none"
        ></textarea>
      </view>

      <!-- 开始日期 -->
      <view v-if="selectedTemplate" class="mb-6">
        <label class="text-xs font-bold text-slate-600 mb-2 block">开始日期</label>
        <view class="flex gap-2">
          <button
            @click="startDate = 'today'"
            class="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
            :class="startDate === 'today' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'"
          >
            今天
          </button>
          <button
            @click="startDate = 'tomorrow'"
            class="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
            :class="startDate === 'tomorrow' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'"
          >
            明天
          </button>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="flex gap-3 pb-4">
        <view
          @tap="showAssignModal = false"
          class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold text-center active:bg-slate-200"
        >
          取消
        </view>
        <view
          @tap="confirmAssign"
          :class="[
            'flex-1 py-3 text-white rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2',
            (!selectedTemplate || assigning) ? 'bg-slate-300' : 'bg-emerald-500 active:bg-emerald-600'
          ]"
        >
          <span v-if="assigning" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>{{ assigning ? '分配中...' : '确认分配' }}</span>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { callCloud, getAuthToken } from '@/utils/cloud';
import { getUserInfo } from '@/utils/storage';
import { ref, onMounted, watch } from 'vue';
import { onShow, onLoad } from '@dcloudio/uni-app';
import { RefreshCw, ChevronLeft, FileText, User, Clock, Calendar, Scale, Heart, ArrowRight, FlaskConical } from 'lucide-vue-next';
import HealthTrendChart from '@/components/HealthTrendChart.vue';

// --- Types ---
interface Client {
  _id: string;
  name: string;
  phone: string;
  wrom_score?: number;
  tags: string[];
}

interface Protocol {
  _id: string;
  name: string;
  startDate: string;
  phases: Array<{
    name: string;
    duration: number;
    currentDay?: number;
    status: 'pending' | 'active' | 'completed';
    expanded: boolean;
    products: Array<{
      name: string;
      dosage: string;
      frequency: string;
    }>;
  }>;
}

interface Log {
  _id: string;
  date: string;
  type: string;
  nutritionist_name: string;
  nutritionist?: string; // Add mapped property
  content: string;
  created_at: number;
}

interface DailyPlan {
  _id: string;
  date: string;
  tasks: Array<{
    name: string;
    completed: boolean;
  }>;
  water_intake: number;
  symptoms: any[];
}

// --- State ---
const currentTab = ref('plan');
const statusBarHeight = ref(20);
const clientId = ref('');

const client = ref<Client | null>(null);
const loading = ref(true);
const activeProtocols = ref<Protocol[]>([]);
const followUpLogs = ref<Log[]>([]);
const recentPlans = ref<DailyPlan[]>([]);
const hasShownResourceExhausted = ref(false);

// 今日打卡相关
const todayCheckIn = ref<any>(null);
const todayTasks = ref<any[]>([]);
const todayPlans = ref<any[]>([]);
const checkInHistory = ref<any[]>([]);  // 【新增】历史打卡记录
const inventoryAlerts = ref<any[]>([]);

// 方案分配相关
const showAssignModal = ref(false);
const loadingTemplates = ref(false);
const protocolTemplates = ref<any[]>([]);
const selectedTemplate = ref<any>(null);
const assignNotes = ref('');
const startDate = ref<'today' | 'tomorrow'>('today');
const assigning = ref(false);

// 方案模板类型
interface ProtocolTemplate {
  id: string;
  name: string;
  description: string;
  duration: string;
  productCount: number;
  tags: string[];
  isActive: boolean;
}

const getApiErrorMessage = (code?: number, msg?: string, fallback = '操作失败') => {
  if (msg) return msg;
  if (code === 400) return '请求参数有误';
  if (code === 401) return '登录状态失效，请重新登录';
  if (code === 403) return '权限不足，无法执行此操作';
  if (code === 404) return '目标数据不存在或已被删除';
  return fallback;
};

// --- Tabs ---
const tabs = [
  { id: 'plan', label: '正在进行' },
  { id: 'trends', label: '健康趋势' },
  { id: 'notes', label: '跟进记录' }
];

// --- Lifecycle ---
onLoad((options: any) => {
  const sysInfo = uni.getSystemInfoSync();
  statusBarHeight.value = sysInfo.statusBarHeight || 20;
  
  if (options.id || options.clientId) {
    clientId.value = options.id || options.clientId;
    fetchClientData();
    
    // 如果是从分配按钮进入，自动打开分配弹窗
    if (options.action === 'assign') {
      // 等待数据加载完成后再打开弹窗
      setTimeout(() => {
        showAssignModal.value = true;
      }, 500);
    }
  }
});

// 页面显示时刷新数据（配方应用后返回）
onShow(() => {
  if (clientId.value) {
    fetchClientData();
  }
});

// 编辑当前方案
const editCurrentProtocol = () => {
  if (!clientId.value) {
    uni.showToast({ title: '客户ID不存在', icon: 'none' });
    return;
  }
  
  uni.navigateTo({
    url: `/pages/admin/protocol/edit?clientId=${clientId.value}`
  });
};

// 创建新方案（支持同一客户多个并行方案，如减肥+睡眠）
const createNewProtocol = () => {
  if (!clientId.value) {
    uni.showToast({ title: '客户ID不存在', icon: 'none' });
    return;
  }
  
  // 传递 isNew=true 参数，表示创建新方案
  uni.navigateTo({
    url: `/pages/admin/protocol/edit?clientId=${clientId.value}&isNew=true`
  });
};

const fetchClientData = async () => {
  if (!getAuthToken()) {
    loading.value = false
    return
  }
  uni.showLoading({ title: '加载中...' });
  try {
    // H5 端优先从 localStorage 读取
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo._id) {
      uni.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    
    // 先查询客户详情
    const detailRes = await callCloud<any>('client-api', {
      action: 'getClientDetail',
      payload: { clientId: clientId.value, userId: userInfo._id }
    });

    if (detailRes.ok && detailRes.data) {
      const data = detailRes.data;

      // 云函数返回 {...user, protocol, plans}，用户字段直接在data上
      client.value = {
        _id: data._id || clientId.value,
        name: data.name || data.username || '未知客户',
        phone: data.phone || '',
        wrom_score: data.wrom_score || 0,
        tags: data.tags || []
      };
      console.log('[detail] client已设置:', JSON.stringify(client.value));

      activeProtocols.value = data.protocols || (data.protocol ? [data.protocol] : []);
      activeProtocols.value.forEach(p => {
        if (p.phases) {
          p.phases.forEach((ph: any) => {
            if (ph.expanded === undefined) ph.expanded = false;
          });
        }
      });

      recentPlans.value = data.plans || [];

      // 【关键重构】今日打卡数据优先使用独立打卡记录
      const today = new Date().toISOString().split('T')[0];
      let checkInRecords: any[] = [];

      // 打卡记录查询（完全非阻塞，失败不影响主流程）
      try {
        const checkInRes = await callCloud<any>('client-api', {
          action: 'getCheckInRecords',
          payload: { clientId: clientId.value, userId: userInfo._id, limit: 30 }
        });

        if (checkInRes.ok && checkInRes.data) {
          checkInRecords = checkInRes.data.records || [];
        console.log('顾问端 - 打卡记录总数:', checkInRecords.length);
        console.log('顾问端 - 所有记录:', checkInRecords.map((r: any) => ({ type: r.record_type, product: r.product_name, completed: r.completed })));
        
        // 过滤今日打卡记录
        const todayRecords = checkInRecords.filter((r: any) => r.date === today);
        console.log('顾问端 - 今日记录数:', todayRecords.length);
        
        // 从打卡记录提取饮水和症状数据
        const waterRecord = todayRecords.find((r: any) => r.record_type === 'water');
        const symptomRecords = todayRecords.filter((r: any) => r.record_type === 'symptom');
        const taskRecords = todayRecords.filter((r: any) => r.record_type === 'task' || !r.record_type);
        
        console.log('顾问端 - 饮水记录:', waterRecord);
        console.log('顾问端 - 症状记录:', symptomRecords);
        console.log('顾问端 - 任务记录数:', taskRecords.length);
        
        // 【关键修复】使用打卡记录构建今日任务列表，不再使用旧数据源
        todayTasks.value = taskRecords.map((r: any) => ({
          product_name: r.product_name,
          product_id: r.product_id,
          completed: r.completed,
          completed_at: r.completed_at,
          slot: r.slot || '早',
          template_name: r.template_name || '健康方案',
          template_id: r.template_id,
          record_id: r._id,
          dosage: r.dosage,
          unit: r.unit
        }));
        
        // 【关键修复】从打卡记录计算今日打卡汇总
        const completedCount = taskRecords.filter((r: any) => r.completed).length;
        todayCheckIn.value = {
          status: taskRecords.length > 0 && taskRecords.every((r: any) => r.completed) ? 'completed' :
                  taskRecords.some((r: any) => r.completed) ? 'partial' : 'not_started',
          completed: completedCount,
          total: taskRecords.length,
          water_intake: waterRecord?.water_intake || 0,
          symptoms: symptomRecords.map((r: any) => r.symptom).filter(Boolean)
        };
        
        // 保存历史打卡记录供顾问查看
        checkInHistory.value = checkInRes.data.summaryByDate || [];
        
        console.log('顾问端 - 最终 todayCheckIn:', todayCheckIn.value);
        console.log('顾问端 - 最终 todayTasks:', todayTasks.value);
      } else {
        // 【重要】如果新数据源失败，显示空数据，不使用旧数据源
        console.warn('顾问端 - 打卡记录查询失败，显示空数据:', checkInRes.msg);
        todayCheckIn.value = {
          status: 'not_started',
          completed: 0,
          total: 0,
          water_intake: 0,
          symptoms: []
        };
        todayTasks.value = [];
        checkInHistory.value = [];
      }
      } catch (e) {
        console.warn('顾问端 - 打卡记录查询异常（非致命）:', e);
        todayCheckIn.value = { status: 'not_started', completed: 0, total: 0, water_intake: 0, symptoms: [] };
        todayTasks.value = [];
        checkInHistory.value = [];
      }

      // 库存预警数据（从方案产品中检查）
      if (data.protocol?.items) {
        inventoryAlerts.value = data.protocol.items
          .filter((item: any) => {
            // 简化库存检查逻辑，实际应从 inventory 接口获取
            const stock = item.stock || 0;
            const threshold = item.low_stock_threshold || 5;
            return stock <= threshold;
          })
          .map((item: any) => ({
            product_name: item.product_name || item.name,
            stock: item.stock || 0,
            days_remaining: item.days_remaining || 0
          }));
      } else {
        inventoryAlerts.value = [];
      }

      followUpLogs.value = (data.interactions || []).map((log: any) => ({
        ...log,
        date: new Date(log.created_at).toLocaleDateString(),
        nutritionist: log.nutritionist_name || '营养师'
      }));
    } else {
      if (detailRes.isResourceExhausted) {
        client.value = {
          _id: clientId.value || 'demo_client',
          name: '演示客户',
          phone: '13800000000',
          wrom_score: 72,
          tags: ['演示模式']
        };
        activeProtocols.value = [];
        recentPlans.value = [];
        followUpLogs.value = [];
        if (!hasShownResourceExhausted.value) {
          hasShownResourceExhausted.value = true;
          uni.showModal({
            title: '资源超限',
            content: `${detailRes.msg}\n\n客户详情已切换为演示数据。`,
            showCancel: false
          });
        }
      } else {
        uni.showToast({ title: getApiErrorMessage(detailRes.code, detailRes.msg, '获取详情失败'), icon: 'none' });
      }
    }

  } catch (err) {
    console.error(err);
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
  } finally {
    uni.hideLoading();
    loading.value = false;
  }
};

const goBack = () => {
  uni.navigateBack();
};

// 跳转到分享海报页面
const shareReport = () => {
  if (!clientId.value) {
    uni.showToast({ title: '客户ID不存在', icon: 'none' });
    return;
  }
  uni.navigateTo({
    url: `/pages/admin/share-report/index?clientId=${clientId.value}`
  });
};

const togglePhase = (protocolIndex: number, phaseIndex: number) => {
  const proto = activeProtocols.value[protocolIndex]
  if (proto && proto.phases && proto.phases[phaseIndex]) {
    proto.phases[phaseIndex].expanded = !proto.phases[phaseIndex].expanded
  }
}

// 加载方案模板列表
const loadProtocolTemplates = async () => {
  if (!getAuthToken()) return
  loadingTemplates.value = true;
  console.log('开始加载方案模板...');
  try {
    const res = await callCloud<{ id: string; name: string; description: string; duration: string; productCount: number; tags: string[]; isActive: boolean }[]>('client-api', {
      action: 'getProtocolTemplates',
      payload: {}
    });
    
    console.log('加载方案模板结果:', res);
    
    if (res.ok && res.data && Array.isArray(res.data)) {
      protocolTemplates.value = res.data;
      console.log('设置模板列表:', protocolTemplates.value.length, '个');
    } else {
      console.log('没有数据或返回格式不正确:', res);
      protocolTemplates.value = [];
    }
  } catch (err) {
    console.error('加载方案模板失败:', err);
    protocolTemplates.value = [];
  } finally {
    loadingTemplates.value = false;
    console.log('加载完成，loadingTemplates:', loadingTemplates.value);
  }
};

// 确认分配方案
const confirmAssign = async () => {
  console.log('[assign] confirmAssign 被调用, selectedTemplate:', selectedTemplate.value?.id, 'client:', client.value?._id, 'clientId:', clientId.value);
  if (!selectedTemplate.value) {
    uni.showToast({ title: '请先选择方案', icon: 'none' });
    return;
  }
  if (!client.value && !clientId.value) {
    uni.showToast({ title: '客户信息缺失', icon: 'none' });
    return;
  }

  const targetClientId = client.value?._id || clientId.value;
  console.log('[assign] 使用clientId:', targetClientId);

  assigning.value = true;
  try {
    const actualStartDate = startDate.value === 'today'
      ? new Date().toISOString().split('T')[0]
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const res = await callCloud('client-api', {
      action: 'applyTemplate',
      payload: {
        clientId: targetClientId,
        templateId: selectedTemplate.value.id,
        startDate: actualStartDate,
        notes: assignNotes.value,
        urgency: 'normal'
      }
    });

    console.log('[assign] applyTemplate 响应:', JSON.stringify({ ok: res.ok, code: res.code, msg: res.msg, data: res.data }));

    if (res.ok) {
      uni.showToast({ title: '方案分配成功', icon: 'success' });
      showAssignModal.value = false;
      // 重置表单
      selectedTemplate.value = null;
      assignNotes.value = '';
      startDate.value = 'today';
      // 刷新客户详情
      await fetchClientData();
    } else {
      console.error('[assign] 分配失败详情:', JSON.stringify(res.raw));
      uni.showToast({ title: res.msg || '分配失败', icon: 'none', duration: 3000 });
    }
  } catch (err) {
    console.error('[assign] 分配方案异常:', err);
    uni.showToast({ title: '网络异常，请重试', icon: 'none' });
  } finally {
    assigning.value = false;
  }
};

// 监听弹窗显示，加载模板
watch(showAssignModal, (val: boolean) => {
  console.log('showAssignModal 变化:', val);
  if (val) {
    console.log('弹窗打开，开始加载模板');
    // #ifdef MP
    uni.hideTabBar({ animation: true }).catch(() => {});
    // #endif
    loadProtocolTemplates();
    // 重置选择
    selectedTemplate.value = null;
    assignNotes.value = '';
    startDate.value = 'today';
  } else {
    // #ifdef MP
    uni.showTabBar({ animation: true }).catch(() => {});
    // #endif
  }
});

</script>

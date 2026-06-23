<template>
  <view class="mp-page-shell min-h-screen bg-transparent pb-32">
    <!-- 1. 顶部固定栏 (Fixed Header) -->
    <!-- 调整：高度压缩，移除积分卡片以保持与其他页面的一致性 -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-emerald-100/80 backdrop-blur-md px-6 pt-12 pb-3 border-b border-emerald-200/50">
      <view class="flex justify-between items-center">
        <view class="flex items-center gap-3">
          <view class="w-9 h-9 bg-emerald-200/50 rounded-full overflow-hidden border-2 border-white/80 shadow-sm">
            <view class="w-full h-full flex items-center justify-center text-emerald-600 text-xs font-bold">{{ greetingInitial }}</view>
          </view>
          <view>
            <h2 class="text-sm font-bold text-slate-700">早安, <span class="text-base font-black text-emerald-900 ml-0.5">{{ greetingName }}</span></h2>
            <view class="flex items-center gap-2 text-[9px] text-slate-500 font-medium">
              <span>{{ dateDisplay }}</span>
              <span>•</span>
              <span>健康打卡日</span>
            </view>
          </view>
        </view>
        
        <!-- 右侧通知 & 消息 -->
        <view class="flex items-center gap-3">
          <!-- 消息气泡（调整位置避免被胶囊按钮遮挡） -->
          <view @click="goToMessages" class="w-9 h-9 bg-white/80 rounded-xl flex items-center justify-center relative shadow-sm border border-white mp-pressable">
            <span class="text-lg">💬</span>
            <!-- 红点放在右下角，避开微信胶囊按钮遮挡 -->
            <view v-if="unreadCount > 0" class="absolute bottom-0 right-0 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center animate-bounce transform translate-x-1/4 translate-y-1/4">
              <span class="text-[8px] text-white font-black">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
            </view>
          </view>
          <!-- 库存提醒 -->
          <view @click="goToInventory" class="w-9 h-9 bg-white/80 rounded-xl flex items-center justify-center relative shadow-sm border border-white mp-pressable">
            <span class="text-lg">📦</span>
            <view v-if="lowStockCount > 0" class="absolute bottom-0 right-0 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center transform translate-x-1/4 translate-y-1/4">
              <span class="text-[8px] text-white font-black">{{ lowStockCount > 99 ? '99+' : lowStockCount }}</span>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 占位高度 -->
    <view class="h-24"></view>

    <view class="px-6 space-y-4">
      
      <!-- 积分概览 & 库存提醒 -->
      <PointsCard
        :points="displayPoints"
        :streak-days="displayStreakDays"
        :low-stock-count="lowStockCount"
        @go-to-inventory="goToInventory"
      />

      <!-- 2. 7天连续打卡 (Streak Card) -->
      <StreakCard
        :points="displayPoints"
        :streak-days="displayStreakDays"
        :weekly-data="weeklyCheckInData"
      />

      <!-- 3. 今日饮水 (Hydration Card) -->
      <HydrationCard
        :current-amount="waterIntake"
        @increase="updateWater(0.25)"
        @decrease="updateWater(-0.25)"
      />

      <!-- 4. 今日健康计划 (Health Plan Card) -->
      <!-- 调整：padding 根据折叠状态动态变化 p-5 -> px-5 py-3 (折叠时更紧凑) -->
      <!-- 当所有任务完成时，禁止展开 -->
      <view class="bg-white rounded-[28px] shadow-xl shadow-slate-200/40 border border-slate-50 transition-all overflow-hidden" :class="isPlanCollapsed ? 'px-5 py-3' : 'p-5'">
        <view 
          class="flex justify-between items-center" 
          :class="isPlanCollapsed ? '' : 'mb-4'" 
          @click="togglePlanCollapse"
          style="cursor: pointer;"
        >
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-xl flex items-center justify-center transition-all" :class="[isPlanCollapsed ? 'scale-90' : '', completedTasks === totalTasks ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600']">
              <span class="text-lg">📋</span>
            </view>
            <view>
              <h3 class="text-slate-900 font-black text-sm">
                今日健康计划
              </h3>
              <p class="text-slate-400 text-[10px]">
                <!-- 情况1：加载中 -->
                <span v-if="isLoadingData" class="text-slate-400">正在获取健康方案数据...</span>
                <!-- 情况2：没有健康计划 -->
                <span v-else-if="!activeProtocol" class="text-rose-500">暂无健康计划，请联系顾问制定</span>
                <!-- 情况2：全部完成（折叠时显示统一文案） -->
                <span v-else-if="completedTasks === totalTasks && totalTasks > 0 && isPlanCollapsed" class="text-emerald-500 font-bold flex items-center gap-1">
                  <span>已完成记录</span>
                  <span>✅</span>
                </span>
                <span v-else-if="completedTasks === totalTasks && totalTasks > 0 && !isPlanCollapsed && lastSyncStatus.time" class="text-emerald-600 font-bold">您今日计划已完成，已同步，继续加油！</span>
                <span v-else-if="completedTasks === totalTasks && totalTasks > 0 && !isPlanCollapsed" class="text-amber-600 font-bold">今日计划已完成，等待同步</span>
                <!-- 情况3：进行中 -->
                <span v-else>{{ completedTasks }}/{{ totalTasks }} 已完成</span>
              </p>
            </view>
          </view>
          <!-- 状态标签 -->
          <view class="flex items-center gap-2">
            <!-- 加载中 -->
            <span v-if="isLoadingData" class="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
              <span class="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></span>
              读取中
            </span>
            <!-- 无计划 -->
            <span v-else-if="!activeProtocol" class="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">无计划</span>
            <!-- 今日已完成 -->
            <span v-else-if="totalTasks === 0 && lastSyncStatus.time" class="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">已完成</span>
            <span v-else-if="totalTasks === 0" class="text-[9px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded">待同步</span>
            
            <view v-if="totalTasks > 0" class="text-slate-300 text-xs transform transition-transform" :class="isPlanCollapsed ? 'rotate-180' : ''">▼</view>
          </view>
        </view>

        <view v-if="!isPlanCollapsed">
          <!-- 【新增】多方案切换 -->
          <view v-if="protocolsData.length > 1" class="flex bg-slate-100 p-1 rounded-xl mb-3 items-center gap-1 overflow-x-auto">
            <view 
              v-for="(protocol, index) in protocolsData" 
              :key="protocol.id"
              @click="currentProtocolIndex = index"
              class="flex-1 min-w-[100px] py-2 px-3 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center leading-tight whitespace-nowrap"
              :class="currentProtocolIndex === index 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-200/50'"
            >
              <span class="truncate max-w-[80px]">{{ protocol.name }}</span>
              <span class="text-[8px] opacity-80 scale-90 mt-0.5">
                ({{ getProtocolCompletedCount(index) }}/{{ protocol.totalTasks }})
              </span>
            </view>
          </view>
          
          <!-- 单方案显示名称 -->
          <view v-else-if="protocolsData.length === 1" class="mb-3 px-2">
            <span class="text-sm font-bold text-slate-800">{{ protocolsData[0].name }}</span>
            <span class="text-xs text-slate-400 ml-2">({{ getProtocolCompletedCount(0) }}/{{ protocolsData[0].totalTasks }})</span>
          </view>
          
          <view class="flex bg-slate-50 p-1 rounded-xl mb-4 items-center gap-1">
            <view 
              v-for="tab in ['早', '中', '晚', '睡']" 
              :key="tab"
              @click="currentPlanTab = tab"
              class="flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center leading-tight"
              :class="getTabClass(tab)"
            >
              <span>{{ tab }}</span>
              <span class="text-[8px] opacity-80 scale-90" v-if="getPlanCount(tab) > 0">
                ({{ getPlanCompletedCount(tab) }}/{{ getPlanCount(tab) }})
              </span>
            </view>
            <!-- 刷新按钮 -->
            <view 
              @click="refreshPlan"
              class="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all active:scale-95"
              :class="isRefreshing ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 hover:text-emerald-500'"
            >
              <span class="text-sm" :class="{ 'animate-spin': isRefreshing }">🔄</span>
            </view>
          </view>
          
          <!-- 任务列表 (增加滚动条支持) -->
          <view v-if="currentPlanList.length > 0" class="space-y-3 max-h-[320px] overflow-y-auto px-1 custom-scrollbar">
            <view v-for="(item, index) in currentPlanList" :key="index" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 mb-2">
              <view class="flex items-center gap-3">
                <view class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 text-xs border border-slate-100">💊</view>
                <view>
                  <h4 class="text-slate-900 font-bold text-xs">{{ item.name }}</h4>
                  <p class="text-slate-400 text-[10px]">{{ item.dose }} · {{ item.instruction }}</p>
                  <view v-if="item.template_names && item.template_names.length > 0" class="flex mt-0.5">
                    <text class="text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">{{ item.template_names.join(' + ') }}</text>
                  </view>
                </view>
              </view>
              <view 
                @click="toggleTask(item)"
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
                :class="item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200 bg-white'"
              >
                <span v-if="item.completed" class="text-white text-xs font-bold">✓</span>
              </view>
            </view>
          </view>

          <!-- 空状态 (Empty State) -->
          <view v-else class="py-8 flex flex-col items-center justify-center text-slate-300">
            <view class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
              <span class="text-2xl grayscale opacity-50">📝</span>
            </view>
            <!-- 没有健康计划 -->
            <view v-if="!activeProtocol" class="text-center">
              <p class="text-xs font-medium text-slate-400">暂无健康计划</p>
              <p class="text-[10px] text-rose-500 mt-1">请联系顾问制定您的专属方案</p>
            </view>
            <!-- 有健康计划但无今日任务 -->
            <view v-else class="text-center">
              <p class="text-xs font-medium text-slate-400 mb-2">今日无服用计划</p>
              <p class="text-[10px] text-amber-500 mb-3">方案暂未配置产品，请联系顾问完善</p>
              <p class="text-[10px] text-slate-300">点击上方 🔄 按钮刷新</p>
            </view>
          </view>
        </view>
      </view>

      <!-- 5. 今日健康指标 (Health Metrics) -->
      <view class="bg-white rounded-[28px] shadow-xl shadow-slate-200/40 border border-slate-50 transition-all overflow-hidden" :class="isMetricsCollapsed ? 'px-5 py-3' : 'p-5'">
        <view class="flex justify-between items-center" :class="isMetricsCollapsed ? '' : 'mb-4'" @click="isMetricsCollapsed = !isMetricsCollapsed">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-xl flex items-center justify-center transition-all" :class="[isMetricsCollapsed ? 'scale-90' : '', isMetricsCompleted ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600']">
              <span class="text-lg">📈</span>
            </view>
            <view>
              <h3 class="text-slate-900 font-black text-sm">今日健康指标</h3>
              <p class="text-slate-400 text-[10px]">
                <span v-if="isMetricsCollapsed && isMetricsCompleted" class="text-emerald-500 font-bold flex items-center gap-1">
                  <span>已完成记录</span>
                  <span>✅</span>
                </span>
                <span v-else>请输入今日体征指标</span>
              </p>
            </view>
          </view>
          <view class="text-slate-300 text-xs transform transition-transform" :class="isMetricsCollapsed ? 'rotate-180' : ''">▼</view>
        </view>

        <view v-if="!isMetricsCollapsed" class="grid grid-cols-2 gap-3">
          <!-- 指标卡片 -->
          <view v-for="metric in metrics" :key="metric.label" class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between h-auto min-h-24">
            <view class="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <span>{{ metric.icon }}</span>
              <span>{{ metric.label }}</span>
            </view>
            <view class="flex items-end gap-1 mt-2">
              <input 
                type="digit" 
                v-model="metric.value" 
                @blur="saveMetric(metric)"
                :placeholder="metric.type === 'body_fat' && getEstimatedBodyFat() ? '估算 ' + getEstimatedBodyFat() : '0.0'"
                class="bg-transparent text-2xl font-black text-slate-900 w-full outline-none placeholder:text-slate-300"
              />
              <span class="text-[10px] font-bold text-slate-400 mb-1.5">{{ metric.unit }}</span>
            </view>
            <!-- 预警提示 -->
            <view v-if="getMetricEvaluation(metric)" class="mt-2 text-[10px] leading-tight font-medium px-2 py-1.5 rounded-lg w-full" :class="{
              'bg-emerald-100 text-emerald-700': getMetricEvaluation(metric)?.color === 'green',
              'bg-amber-100 text-amber-700': getMetricEvaluation(metric)?.color === 'yellow',
              'bg-rose-100 text-rose-700': getMetricEvaluation(metric)?.color === 'red',
            }">
              {{ getMetricEvaluation(metric)?.message }}
            </view>
            <view v-else-if="metric.type === 'body_fat' && !metric.value && getEstimatedBodyFat()" class="mt-2 text-[10px] leading-tight font-medium px-2 py-1.5 rounded-lg w-full bg-slate-100 text-slate-500">
              提示: 基于您的身高体重估算体脂率为 {{ getEstimatedBodyFat() }}%
            </view>
          </view>
        </view>
      </view>

      <!-- 6. 今日体感反馈 (Symptom Feedback) -->
      <view class="bg-white rounded-[28px] shadow-xl shadow-slate-200/40 border border-slate-50 transition-all overflow-hidden" :class="isSymptomsCollapsed ? 'px-5 py-3' : 'p-5'">
        <view class="flex justify-between items-center" :class="isSymptomsCollapsed ? '' : 'mb-4'" @click="isSymptomsCollapsed = !isSymptomsCollapsed">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-xl flex items-center justify-center transition-all" :class="[isSymptomsCollapsed ? 'scale-90' : '', isSymptomsCompleted ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600']">
              <span class="text-lg">💬</span>
            </view>
            <view>
              <h3 class="text-slate-900 font-black text-sm">今日体感反馈</h3>
              <p class="text-slate-400 text-[10px]">
                <span v-if="isSymptomsCollapsed && isSymptomsCompleted" class="text-emerald-500 font-bold flex items-center gap-1">
                  <span>已完成记录</span>
                  <span>✅</span>
                </span>
                <span v-else>记录您的身体状态</span>
              </p>
            </view>
          </view>
          <view class="text-slate-300 text-xs transform transition-transform" :class="isSymptomsCollapsed ? 'rotate-180' : ''">▼</view>
        </view>

        <view v-if="!isSymptomsCollapsed" class="space-y-6">
          <view v-for="symptom in symptoms" :key="symptom.label">
            <view class="flex justify-between items-center mb-2">
              <span class="text-xs font-bold text-slate-700">{{ symptom.label }}</span>
              <span class="text-[10px] font-bold text-slate-400">{{ symptom.value || '-' }} / 10</span>
            </view>
            <!-- 心情图标选择 -->
            <view class="flex justify-between gap-3">
              <!-- 差 (2分) -->
              <view 
                @click="symptom.value = 2"
                class="flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border-2"
                :class="symptom.value === 2 ? 'bg-rose-50 border-rose-400 text-rose-600' : 'bg-slate-50 border-transparent text-slate-400 grayscale hover:grayscale-0'"
              >
                <span class="text-2xl">😫</span>
                <span class="text-xs font-bold">差</span>
              </view>

              <!-- 还可以 (5分) -->
              <view 
                @click="symptom.value = 5"
                class="flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border-2"
                :class="symptom.value === 5 ? 'bg-amber-50 border-amber-400 text-amber-600' : 'bg-slate-50 border-transparent text-slate-400 grayscale hover:grayscale-0'"
              >
                <span class="text-2xl">😐</span>
                <span class="text-xs font-bold">还可以</span>
              </view>

              <!-- 很好 (8分) -->
              <view 
                @click="symptom.value = 8"
                class="flex-1 py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border-2"
                :class="symptom.value === 8 ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-slate-50 border-transparent text-slate-400 grayscale hover:grayscale-0'"
              >
                <span class="text-2xl">😃</span>
                <span class="text-xs font-bold">很好</span>
              </view>
            </view>
          </view>

          <!-- 其他补充 -->
          <view>
            <span class="text-xs font-bold text-slate-700 mb-2 block">其他补充</span>
            <textarea 
              v-model="symptomNotes"
              class="w-full h-24 bg-slate-50 rounded-xl p-3 text-xs font-medium text-slate-700 placeholder:text-slate-300 border border-slate-100 outline-none focus:border-purple-200 transition-colors resize-none"
              placeholder="描述您今日的特殊感受..."
            ></textarea>
          </view>
        </view>
      </view>

      <!-- 7. 同步按钮 -->
      <view class="pt-4 pb-8">
        <button @click="syncData" class="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">
          <span>☁️</span>
          同步今日数据
        </button>
        <p class="text-center text-[9px] text-slate-300 font-bold mt-3 tracking-widest uppercase">Last Sync: Not Synced Yet</p>
      </view>

    </view>
    <!-- 8. 今日成就弹窗 (Achievement Popup) -->
    <view v-if="showAchievement" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <view class="bg-white w-[85%] max-w-[320px] rounded-[32px] p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
        <!-- 装饰背景 -->
        <view class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-100 to-white -z-10"></view>
        <view class="absolute top-4 right-4 text-6xl opacity-10 rotate-12">🏆</view>
        
        <view class="text-center mb-6">
          <view class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner border-4 border-white">
            🎉
          </view>
          <h2 class="text-xl font-black text-slate-900 mb-1">今日成就达成！</h2>
          <p class="text-xs text-slate-500">恭喜您！您已完成今日所有健康目标。</p>
        </view>

        <view class="space-y-3 mb-6">
          <view class="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <view class="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</view>
            <span class="text-xs font-bold text-slate-700 flex-1">今日健康计划</span>
            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">100%</span>
          </view>
          <view class="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <view class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</view>
            <span class="text-xs font-bold text-slate-700 flex-1">健康指标记录</span>
            <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">已完成</span>
          </view>
          <view class="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <view class="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</view>
            <span class="text-xs font-bold text-slate-700 flex-1">体感反馈</span>
            <span class="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">已完成</span>
          </view>
        </view>

        <button @click="shareAchievement" class="w-full py-3.5 bg-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition-all mb-3 flex items-center justify-center gap-2">
          <span>📤</span>
          分享我的成就
        </button>
        <button @click="showAchievement = false" class="w-full py-3 text-slate-400 font-bold text-xs hover:text-slate-600 transition-colors">
          关闭
        </button>
      </view>
    </view>

    <!-- 自定义底部导航栏 -->
    <ClientTabBar :current="0" :unreadCount="unreadCount" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { onShow, onLoad } from '@dcloudio/uni-app';
import ClientTabBar from '@/components/ClientTabBar.vue'
// 【新增】导入拆分后的子组件
import PointsCard from '@/components/client/PointsCard.vue'
import StreakCard from '@/components/client/StreakCard.vue'
import HydrationCard from '@/components/client/HydrationCard.vue'
import {
  evaluateBodyFat,
  evaluateVisceralFat,
  evaluateBloodSugar,
  evaluateTG,
  evaluateBMI,
  calculateBMI,
  estimateBodyFat
} from '@/utils/healthEvaluation';
import type { HealthStatus } from '@/utils/healthEvaluation';

// 【新增】导入优化后的工具和类型
import logger from '@/utils/logger';
import apiService from '@/composables/useApi';
import { callCloud } from '@/utils/cloud';
import { useTimers } from '@/composables/useTimers';
import { POINTS, TIME_SLOTS, SLOT_MAP, SYMPTOM_OPTIONS, API_CONFIG, INVENTORY } from '@/config/constants';
import type {
  UserInfo,
  PlanItem,
  ProtocolData,
  ProtocolItem,
  MetricItem,
  SymptomItem,
  PointsResult,
  WeeklyDayData,
  InventoryItem
} from '@/types';

// 【优化】使用统一定时器管理
const { setTimeout: setTimer, setInterval: setTimerInterval, clearTimer } = useTimers();
let dateCheckTimer: NodeJS.Timeout | null = null;

// --- Header Logic ---
const lowStockCount = ref(0);
const unreadCount = ref(0);
const weeklyPlanSummary = ref<any[]>([]);

const goToInventory = () => {
  uni.redirectTo({
    url: '/pages/client/inventory/index'
  });
};

const goToMessages = () => {
  uni.redirectTo({
    url: '/pages/client/messages/index'
  });
};

const fetchHeaderData = async () => {
  try {
    const countRes = await apiService.call<{ count: number }>('getUnreadNotificationCount', {});
    unreadCount.value = 0;
    await fetchWeeklyPlanSummary();
  } catch (e) {
    logger.error('获取头部数据失败:', e);
    unreadCount.value = 0;
  }
};

const fetchWeeklyPlanSummary = async () => {
  try {
    const today = new Date();
    const fmtLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const promises = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = fmtLocal(d);
      promises.push(
        apiService.call<any>('getDailyPlan', { date: dateStr }).then(res => ({ date: dateStr, data: res })).catch(() => ({ date: dateStr, data: null }))
      );
    }
    const results = await Promise.all(promises);
    logger.debug('=== 周计划原始数据 ===');
    weeklyPlanSummary.value = results.map(r => {
      const plan = r.data || {};
      const allTasks = plan.tasks || [];
      const tasksCompleted = allTasks.length > 0 && allTasks.every((t: any) => t.completed);
      const waterDone = (plan.water_intake || 0) >= 1.5;
      const hasSymptoms = plan.symptoms && plan.symptoms.length > 0 && plan.symptoms.some((s: any) => s.value > 0);
      const entry = {
        date: r.date,
        water_intake: plan.water_intake || 0,
        tasks_count: allTasks.length,
        tasks_completed: tasksCompleted,
        tasks_detail: allTasks.map((t: any) => ({ name: t.product_name || t.name, completed: t.completed })),
        water_done: waterDone,
        has_symptoms: hasSymptoms,
        symptoms_data: plan.symptoms,
        has_data: Object.keys(plan).length > 2,
        _raw_keys: Object.keys(plan)
      };
      logger.debug(`${r.date}: tasks=${allTasks.length} completed=${tasksCompleted} water=${plan.water_intake} symptoms=${!!plan.symptoms} keys=[${Object.keys(plan).join(',')}]`);
      return entry;
    });
    logger.debug('=== 周计划数据结束 ===');
  } catch (e) {
    logger.error('获取周计划摘要失败:', e);
    weeklyPlanSummary.value = [];
  }
};

// --- User Info ---
// 【优化】使用定义好的 UserInfo 类型
const userInfo = ref<UserInfo>({
  username: '访客',
  avatar: ''
});

// --- Active Protocol ---
// 【优化】使用 ProtocolItem 类型替代 any
const activeProtocol = ref<{ name: string; items: ProtocolItem[] } | null>(null);
const isLoadingData = ref(false);
const isGeneratingPlan = ref(false);
const lastFetchTime = ref<number>(0);
// 【优化】使用常量配置
const CACHE_TTL = API_CONFIG.CACHE_TTL_MS;
const MAX_RETRY = API_CONFIG.MAX_RETRY;

// （symptoms 和 metrics 已提前声明到 planData 之后，解决 TDZ 问题）

const greetingName = computed(() => userInfo.value.username || '访客');
const greetingInitial = computed(() => greetingName.value.slice(0, 1));

// --- Date Logic ---
const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getDateDisplay = () => {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日 周${['日','一','二','三','四','五','六'][d.getDay()]}`;
};
const dateStr = ref(getTodayStr());
const dateDisplay = ref(getDateDisplay());
const todayAchievementKey = computed(() => `achievement_shown_${dateStr.value}`);

// --- Data Fetching ---
// 【修复】改为函数内实时获取，避免登录后缓存旧值
const getUserId = () => uni.getStorageSync('userId');
const getToken = () => uni.getStorageSync('token');

// 获取每日数据
const fetchDailyData = async (force = false) => {
  if (isLoadingData.value && !force) {
    logger.debug('正在加载中，跳过重复请求');
    return;
  }

  // 【修复】每次调用时实时获取最新的userId和token
  const userId = getUserId();
  const token = getToken();

  logger.debug('当前用户:', userId?.slice(0, 8), 'Token:', token ? '✓' : '✗');

  if (!userId) {
    logger.warn('未登录，跳过数据获取');
    lastSyncStatus.value = {};
    isLoadingData.value = false;
    isRefreshing.value = false;
    return;
  }

  isLoadingData.value = true;
  isRefreshing.value = true;
  // 清空旧数据，避免残留
  planData.value = { [TIME_SLOTS.morning]: [], [TIME_SLOTS.noon]: [], [TIME_SLOTS.evening]: [], [TIME_SLOTS.bedtime]: [] };
  activeProtocol.value = null;
  let protocolData: any = null;  // 【修复】声明在外部作用域
  waterIntake.value = 0;
  metrics.value.forEach(m => m.value = '');
  symptoms.value.forEach(s => s.value = 0);
  symptomNotes.value = '';

  try {
    // 1.5 Fetch Active Protocol Info
    try {
      logger.debug('获取方案信息...');
      // 【优化】使用 apiService 封装
      protocolData = await apiService.call<{ protocol?: any, protocols?: any[] }>('getOwnProtocol', {});
      activeProtocol.value = protocolData.protocol || protocolData;
      
      // 记录协议数据用于调试
      logger.debug('协议数据:', {
        hasProtocol: !!protocolData.protocol,
        protocolItems: protocolData.protocol?.items?.length || 0,
        hasProtocols: !!protocolData.protocols,
        protocolsCount: protocolData.protocols?.length || 0
      });

      if (activeProtocol.value?.items) {
        logger.debug(`方案已加载: ${activeProtocol.value.name}, 产品数: ${activeProtocol.value.items.length}`);
      }
    } catch (e) {
      logger.error('获取方案失败:', e);
    }

    // 2. Fetch Daily Plan (Tasks, Water, Symptoms)
    logger.debug('获取每日计划...');
    // 【修复】避免变量名冲突！不要使用 planData 作为局部变量名
    const dailyPlanResult = await apiService.call<any>('getDailyPlan', { date: dateStr.value });

    // 如果今天没有计划，但是已经加载到了分配的方案，则自动生成今日计划
    if (!dailyPlanResult || !dailyPlanResult.tasks || dailyPlanResult.tasks.length === 0) {
      // 【增强】检查多种可能的协议数据结构
      const hasProtocolItems = activeProtocol.value && activeProtocol.value.items && activeProtocol.value.items.length > 0;
      const hasProtocols = protocolData?.protocols && protocolData.protocols.length > 0;
      
      logger.debug('检查是否需要自动生成计划:', {
        dailyPlanResult: !!dailyPlanResult,
        hasTasks: dailyPlanResult?.tasks?.length > 0,
        hasProtocolItems,
        hasProtocols,
        protocolCount: protocolData?.protocols?.length,
        protocolData: JSON.stringify(protocolData)
      });
      
      if (hasProtocolItems || hasProtocols) {
        logger.debug('No daily plan found but protocol exists. Auto-generating for today...');
        await generateTodayPlan();
        return;
      }
    }

    if (dailyPlanResult) {
      const data = dailyPlanResult;
      logger.debug('🔍 [修复] 完整的 dailyPlanResult:', JSON.stringify(dailyPlanResult, null, 2));
      logger.debug('Plan data date:', data.date, 'tasks count:', data.tasks?.length || 0);
      logger.debug('Tasks completed status:', data.tasks?.map((t: any) => ({ name: t.product_name, completed: t.completed, template: t.template_name, slot: t.slot })));

      // 【优化】使用导入的 SLOT_MAP 常量（已定义在 constants.ts）

      // 1. 先按方案分组
      const tasksByProtocol = new Map<string, any[]>();
      if (data.tasks) {
        data.tasks.forEach((task: any) => {
          const protocolKey = task.template_id || task.template_name || 'default';
          if (!tasksByProtocol.has(protocolKey)) {
            tasksByProtocol.set(protocolKey, []);
          }
          tasksByProtocol.get(protocolKey)!.push(task);
        });
      }
      
      // 2. 构建多方案数据结构
      const newProtocolsData: ProtocolData[] = [];
      tasksByProtocol.forEach((tasks, protocolKey) => {
        // 【优化】使用常量定义时段
        const protocolTasks: Record<string, PlanItem[]> = { [TIME_SLOTS.morning]: [], [TIME_SLOTS.noon]: [], [TIME_SLOTS.evening]: [], [TIME_SLOTS.bedtime]: [] };
        let totalCount = 0;
        let completedCount = 0;

        tasks.forEach((task: any) => {
          // 【优化】使用 SLOT_MAP 常量
          const cnSlot = SLOT_MAP[task.slot] || task.slot;
          logger.debug(`🔄 任务映射: name=${task.product_name}, slot=${task.slot} -> cnSlot=${cnSlot}`);
          if (protocolTasks[cnSlot]) {
            const mappedTask: PlanItem = {
              ...task,
              name: task.product_name || task.name || '未命名产品',
              dose: task.dose || (task.daily_usage ? `${task.daily_usage}${task.unit || '粒'}` : ''),
              instruction: task.instruction || '按需服用',
              slot: cnSlot,
              template_id: task.template_id,
              template_name: task.template_name
            };
            protocolTasks[cnSlot].push(mappedTask);
            totalCount++;
            if (task.completed) completedCount++;
          } else {
            logger.warn(`❌ 无效的时段: ${task.slot} (cnSlot=${cnSlot}), 任务:`, task);
          }
        });
        
        // 获取方案名称（从第一个任务或协议信息）
        const firstTask = tasks[0];
        const protocolName = firstTask?.template_name || 
                           activeProtocol.value?.name || 
                           '健康方案';
        
        newProtocolsData.push({
          id: protocolKey,
          name: protocolName,
          template_id: firstTask?.template_id || '',
          tasks: protocolTasks,
          completed: completedCount === totalCount && totalCount > 0,
          totalTasks: totalCount,
          completedTasks: completedCount
        });
      });
      
      // 3. 如果没有按方案分组（旧数据格式），使用原来的逻辑
      if (newProtocolsData.length === 0 || newProtocolsData.length === 1) {
        // Map Tasks (旧逻辑兼容)
        // 【优化】使用常量定义时段
        const newPlanData: Record<string, PlanItem[]> = { [TIME_SLOTS.morning]: [], [TIME_SLOTS.noon]: [], [TIME_SLOTS.evening]: [], [TIME_SLOTS.bedtime]: [] };
        if (data.tasks) {
          data.tasks.forEach((task: any) => {
            const cnSlot = SLOT_MAP[task.slot] || task.slot;
            if (newPlanData[cnSlot]) {
              const mappedTask: PlanItem = {
                ...task,
                name: task.product_name || task.name || '未命名产品',
                dose: task.dose || (task.daily_usage ? `${task.daily_usage}${task.unit || '粒'}` : ''),
                instruction: task.instruction || '按需服用',
                slot: cnSlot,
                template_id: task.template_id,
                template_name: task.template_name
              };
              newPlanData[cnSlot].push(mappedTask);
            }
          });
        }
        planData.value = newPlanData;
        protocolsData.value = []; // 清空多方案数据
        logger.debug('✅ 方案数据 (单方案):', JSON.stringify(planData.value, null, 2));
      } else {
        // 使用新的多方案数据结构
        protocolsData.value = newProtocolsData;
        planData.value = { [TIME_SLOTS.morning]: [], [TIME_SLOTS.noon]: [], [TIME_SLOTS.evening]: [], [TIME_SLOTS.bedtime]: [] };
        logger.debug('多方案数据:', newProtocolsData.map(p => ({ name: p.name, tasks: p.totalTasks, completed: p.completedTasks })));
      }

      // Map Water
      waterIntake.value = data.water_intake || 0;

      // Map Symptoms
      if (data.symptoms && data.symptoms.length > 0) {
        symptoms.value.forEach(s => {
          const found = data.symptoms.find((item: any) =>
            (item.key && item.key === s.key) ||
            (!item.key && item.label === s.label)
          );
          if (found) s.value = found.value;
        });
      }
      symptomNotes.value = data.symptom_notes || '';
    }

    // 数据加载完成
    isLoadingData.value = false;

    // 2. Fetch Health Metrics
    logger.debug('获取健康指标...');
    const logs = await apiService.call<any[]>('getHealthMetrics', { date: dateStr.value });

    if (logs) {
      metrics.value.forEach(m => {
        let type = '';
        if (m.label === '体重') type = 'weight';
        else if (m.label === '血脂含量') type = 'lipids';
        else if (m.label === '血糖') type = 'glucose';
        else if (m.label === '内脏脂肪') type = 'visceral_fat';
        else if (m.label === '体脂率') type = 'body_fat';

        const log = logs.find((l: any) => l.type === type);
        if (log) m.value = log.value;
      });
    }

    // 3. Fetch Inventory for Alerts
    logger.debug('获取库存信息...');
    const inventoryItems = await apiService.call<InventoryItem[]>('getInventory', {});
    const protocolItems = activeProtocol.value?.items || [];

    // 【优化】使用常量替代硬编码
    let alertCount = 0;
    const alertDetails: Array<{ productName: string; productId: string; reason: string }> = [];

    if (protocolItems.length > 0) {
      alertCount = protocolItems.filter((item: ProtocolItem) => {
        const productId = item.product_id;
        const productName = item.product_name || item.name;

        const inventoryItem = inventoryItems.find((inv: InventoryItem) => {
          const matchById = productId && inv.product_id === productId;
          const matchByName = inv.name === productName || inv.product_name === productName;
          return matchById || matchByName;
        });

        // 【优化】使用 INVENTORY 常量
        const isAlert = !inventoryItem || inventoryItem.stock <= (inventoryItem.low_stock_threshold || INVENTORY.DEFAULT_LOW_THRESHOLD);
        if (isAlert) {
          alertDetails.push({
            productName: productName || '',
            productId: productId || '',
            reason: !inventoryItem ? '无库存记录' : `库存不足(${inventoryItem.stock} <= ${inventoryItem.low_stock_threshold || INVENTORY.DEFAULT_LOW_THRESHOLD})`
          });
        }

        if (!inventoryItem) return true;
        return inventoryItem.stock <= (inventoryItem.low_stock_threshold || INVENTORY.DEFAULT_LOW_THRESHOLD);
      }).length;
    } else {
      alertCount = inventoryItems.filter((item: InventoryItem) => item.stock <= (item.low_stock_threshold || INVENTORY.DEFAULT_LOW_THRESHOLD)).length;
    }

    lowStockCount.value = alertCount;
    
    // 4. Refresh User Info for Points/Streak (with retry)
    let retryCount = 0;
    const maxRetries = 3;
    let userRes = null;
    const userIdForInfo = getUserId();
    const tokenForInfo = getToken();
    
    while (retryCount < maxRetries) {
      try {
        logger.debug(`getUserInfo attempt ${retryCount + 1}/${maxRetries}`);
        userRes = await callCloud('client-api', {
          action: 'getUserInfo', payload: { userId: userIdForInfo, token: tokenForInfo, forceRefresh: true }
        });
        logger.debug('getUserInfo response:', userRes);
        if (userRes.code === 0) break;
      } catch (e) {
        logger.error(`getUserInfo attempt ${retryCount + 1} failed:`, e);
      }
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (userRes && userRes.code === 0 && userRes.data) {
      const u = userRes.data;
      logger.debug('用户数据加载完成:', { streak_days: u.streak_days, points: u.points });

      // 【关键修复】计算本地积分，防止服务端返回0时覆盖本地计算值
      const localPoints = calculateTodayPoints().total;
      const localStreak = calculateTodayPoints().isPerfect ? 1 : 0;

      userInfo.value = {
        ...userInfo.value,
        _id: u._id,
        points: (u.points || 0) > 0 ? (u.points || 0) : ((userInfo.value.points || 0) > 0 ? userInfo.value.points : localPoints),
        streak_days: (u.streak_days || 0) > 0 ? (u.streak_days || 0) : ((userInfo.value.streak_days || 0) > 0 ? userInfo.value.streak_days : localStreak),
        age: u.age,
        gender: u.gender,
        height: u.height,
        weight: u.weight
      };

      if ((u.points || 0) === 0 && localPoints > 0) {
        logger.info(`使用本地积分: ${localPoints}分 (服务端返回0)`);
      }

      if (u.username) userInfo.value.username = u.username;
      if (u.avatar) userInfo.value.avatar = u.avatar;
    } else {
      logger.warn('加载用户信息失败（重试后仍失败）');
    }

  } catch (error) {
    logger.error('获取每日数据失败:', error);
    isLoadingData.value = false;
    uni.showToast({ title: '数据加载失败', icon: 'none' });
  } finally {
    isLoadingData.value = false;
    isRefreshing.value = false; // 【修复】重置刷新状态
    lastFetchTime.value = Date.now();
  }
};

// 刷新计划
const refreshPlan = async () => {
  if (isRefreshing.value) return;
  
  isRefreshing.value = true;
  retryCount = 0; // 手动刷新时重置重试计数
  uni.showToast({ title: '刷新中...', icon: 'loading' });
  
  try {
    // 先尝试重新获取数据
    await fetchDailyData();
    
    // 【修复】首次加载如果没有协议数据，自动重试
    if (!activeProtocol.value && retryCount < MAX_RETRY && userInfo.value?._id) {
      retryCount++;
      logger.warn(`首次加载无协议数据，${retryCount}/${MAX_RETRY}秒后自动重试...`);
      setTimer(() => {
        fetchDailyData(true);
      }, 1500); // 1.5秒后重试
    } else {
      retryCount = 0; // 重置重试计数
    }
  } catch (error) {
    logger.error('refreshPlan error:', error);
  } finally {
    isRefreshing.value = false;
    uni.hideLoading();
  }
};

// 生成今日计划
const generateTodayPlan = async () => {
  const userId = getUserId();
  const token = getToken();
  
  if (!userId) {
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }
  
  isGeneratingPlan.value = true;
  uni.showLoading({ title: '生成中...' });
  
  try {
    logger.debug('开始生成今日计划...');
    const res = await callCloud('client-api', {
      action: 'generateDailyPlan',
      payload: {
        user_id: userId,
        date: dateStr.value,
        merge_same_products: true,
        token
      }
    });
    logger.debug('generateTodayPlan response:', res);

    if (res.code === 0) {
      uni.showToast({ title: '生成成功', icon: 'success' });
      // 刷新数据
      await fetchDailyData();

      // --- Sync to Backend ---
      await syncData();
    } else {
      uni.showToast({ title: res.msg || '生成失败', icon: 'none' });
    }
  } catch (error) {
    logger.error('generateTodayPlan error:', error);
    uni.showToast({ title: '生成失败', icon: 'none' });
  } finally {
    isGeneratingPlan.value = false;
    uni.hideLoading();
  }
};
// 检查是否需要刷新数据
const shouldRefresh = () => {
  const now = Date.now();
  // 首次加载或超过缓存时间
  return lastFetchTime.value === 0 || (now - lastFetchTime.value) > CACHE_TTL;
};

// 首次加载标志
let isFirstLoad = true;
let retryCount = 0;

onShow(() => {
  logger.debug('onShow - 页面显示');
  fetchHeaderData(); // 获取未读消息和库存预警

  // 【关键修复】每次显示页面时重新计算当前日期，防止跨天后日期错误
  const todayStr = getTodayStr();
  if (dateStr.value !== todayStr) {
    logger.debug('onShow - 日期已变更:', dateStr.value, '->', todayStr);
    dateStr.value = todayStr;
    dateDisplay.value = getDateDisplay();
    // 日期变更时彻底清空缓存标记，强制从服务器获取今日新任务
    lastFetchTime.value = 0;
    lastSyncStatus.value = {};
  }

  // 检查是否需要刷新数据（超过缓存时间或首次加载）
  // 【修复】将 lastSyncStatus.time 转为数字进行计算，避免 NaN 导致不刷新
  const syncTime = lastSyncStatus.value.time ? new Date(lastSyncStatus.value.time).getTime() : 0;
  const needRefresh = !syncTime || (Date.now() - syncTime > CACHE_TTL);
  
  logger.debug('onShow - 当前日期:', dateStr.value, '最后同步时间:', lastSyncStatus.value.time, '是否需要刷新:', needRefresh);

  if (needRefresh || isFirstLoad) {
    logger.debug('onShow - 缓存过期或首次加载，开始获取数据');
    // 重置成就显示标记
    showAchievement.value = false;
    // 强制刷新数据
    fetchDailyData();
    isFirstLoad = false;
  } else {
    logger.debug('onShow - 使用缓存数据');
  }

  // 【新增】每分钟检查一次日期，实现跨天自动刷新
  if (dateCheckTimer) clearTimer(dateCheckTimer);
  dateCheckTimer = setTimerInterval(() => {
    const nowStr = getTodayStr();
    if (dateStr.value !== nowStr) {
      logger.debug('跨天自动触发刷新:', dateStr.value, '->', nowStr);
      dateStr.value = nowStr;
      dateDisplay.value = getDateDisplay();
      lastFetchTime.value = 0;
      lastSyncStatus.value = {};
      fetchDailyData(true);
    }
  }, 60000);
});

onUnmounted(() => {
  if (dateCheckTimer) clearTimer(dateCheckTimer);
});

// --- Water Logic ---
const waterIntake = ref(0.0);
const updateWater = async (amount: number) => {
  const newValue = waterIntake.value + amount;
  if (newValue >= 0) {
    // 记录旧积分
    const oldPoints = calculateTodayPoints().total;
    waterIntake.value = newValue;
    
    // 乐观更新积分
    const newPoints = calculateTodayPoints().total;
    if (userInfo.value.points !== undefined) {
      userInfo.value.points = newPoints;
    }
    
    // 【修复】实时获取最新的userId和token
    const userIdForWater = getUserId();
    const tokenForWater = getToken();
    
    // Debounce or immediate save? Water is frequent, maybe immediate is okay for now.
    try {
      const res = await callCloud('client-api', {
        action: 'updateWaterIntake',
        payload: { userId: userIdForWater, date: dateStr.value, waterIntake: newValue, token: tokenForWater }
      });

      // 同步服务端返回的积分
      if (res?.code === 0 && res?.data?.points !== undefined) {
        userInfo.value.points = res.data.points;
      }
    } catch (e) {
      logger.error(e);
      // 错误回滚：重新计算积分
      if (userInfo.value.points !== undefined) {
        userInfo.value.points = calculateTodayPoints().total;
      }
    }
    
    // 【新增】自动同步 section_status
    await syncSectionStatus();
  }
};

// 【新增】同步板块状态（分阶段自动同步）
const syncSectionStatus = async () => {
  const token = uni.getStorageSync('token');
  const userId = uni.getStorageSync('userInfo')?._id;
  
  if (!token || !userId) return;
  
  try {
    // 获取所有任务状态
    const allTasks: any[] = [];
    Object.entries(planData.value).forEach(([slot, items]) => {
      items.forEach((item: any) => {
        allTasks.push({
          product_id: item.product_id,
          product_name: item.product_name || item.name,
          slot: item.slot,
          completed: !!item.completed,
          completed_at: item.completed ? (item.completed_at || new Date().toISOString()) : undefined
        });
      });
    });
    
    // 计算各板块完成状态
    const sectionStatus = {
      water: {
        completed: waterIntake.value >= POINTS.WATER_TARGET,
        current: waterIntake.value,
        target: POINTS.WATER_TARGET
      },
      metrics: {
        completed: metrics.value?.every((m: any) => m.value !== undefined && m.value !== null && m.value !== '') || false,
        items: metrics.value || []
      },
      symptoms: {
        completed: symptoms.value?.length > 0 && symptoms.value?.some((s: any) => s.value > 0),
        score: symptoms.value?.length > 0 
          ? symptoms.value.reduce((sum: number, s: any) => sum + (s.value || 0), 0) / symptoms.value.length 
          : 0,
        items: symptoms.value || []
      },
      tasks: {
        morning: { 
          completed: planData.value['早']?.every((t: any) => t.completed) || false,
          items: planData.value['早'] || []
        },
        noon: { 
          completed: planData.value['中']?.every((t: any) => t.completed) || false,
          items: planData.value['中'] || []
        },
        evening: { 
          completed: planData.value['晚']?.every((t: any) => t.completed) || false,
          items: planData.value['晚'] || []
        },
        bedtime: { 
          completed: planData.value['睡']?.every((t: any) => t.completed) || false,
          items: planData.value['睡'] || []
        }
      }
    };
    
    logger.debug('[syncSectionStatus] Syncing:', sectionStatus);

    await callCloud('client-api', {
      action: 'updateDailyPlanTasks',
      payload: {
        userId,
        date: dateStr.value,
        tasks: allTasks,
        water_intake: waterIntake.value,
        water_target: POINTS.WATER_TARGET,
        health_metrics: metrics.value,
        symptoms: symptoms.value,
        section_status: sectionStatus,
        token
      }
    });
    
    logger.debug('[syncSectionStatus] Success');
  } catch (err) {
    logger.error('[syncSectionStatus] Error:', err);
  }
};

// --- Streak Logic ---
const getDayStatusClass = (day: number) => {
  const currentStreak = userInfo.value.streak_days || 0;
  const cycleDay = (currentStreak % 7) + 1;

  if (day < cycleDay) return 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30';
  if (day === cycleDay) return 'bg-white text-emerald-600 border-2 border-emerald-500 ring-2 ring-emerald-200';
  return 'bg-slate-800/50 text-slate-500 border border-slate-700';
};

// 【新增】生成最近7天的打卡数据（用于优化后的7天打卡计划UI）
const weeklyCheckInData = computed(() => {
  const summary = weeklyPlanSummary.value;
  const today = new Date();
  const fmtLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = fmtLocal(today);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  if (summary.length > 0) {
    return summary.map((day: any) => {
      const isToday = day.date === todayStr;
      const isPast = day.date < todayStr;

      if (isToday) {
        const todayResult = calculateTodayPoints();
        const [y, m, d] = day.date.split('-').map(Number);
        const dd = new Date(y, m - 1, d);
        return {
          date: day.date,
          dayOfMonth: dd.getDate(),
          weekDay: weekDays[dd.getDay()],
          completed: todayResult.total > 0,
          points: todayResult.total,
          isToday: true,
          isFuture: false
        };
      }

      const hasAnyActivity = day.tasks_count > 0 || day.water_intake > 0 || day.has_symptoms;
      const hasRealProgress = day.tasks_completed || day.water_done || day.has_symptoms;
      const completed = isPast ? (hasAnyActivity && hasRealProgress) : false;
      let points = 0;
      if (completed) {
        points = (day.tasks_completed ? 5 : 0) + (day.water_done ? 1 : 0) + (day.has_symptoms ? 2 : 0);
        if (points >= 8) points = 10;
      }
      const [y, m, d] = day.date.split('-').map(Number);
      const dd = new Date(y, m - 1, d);
      return {
        date: day.date,
        dayOfMonth: dd.getDate(),
        weekDay: weekDays[dd.getDay()],
        completed,
        points,
        isToday: false,
        isFuture: day.date > todayStr
      };
    });
  }

  const dailyResults = (userInfo.value as any).daily_results || [];
  if (dailyResults.length > 0) {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (6 - index));
      const dateStr = fmtLocal(date);
      const dayData = dailyResults.find((d: any) => d.date === dateStr);
      return {
        date: dateStr,
        dayOfMonth: date.getDate(),
        weekDay: weekDays[date.getDay()],
        completed: dayData ? dayData.isPerfect : false,
        points: dayData ? dayData.points : 0,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr
      };
    });
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - index));
    const dateStr = fmtLocal(date);
    return {
      date: dateStr,
      dayOfMonth: date.getDate(),
      weekDay: weekDays[date.getDay()],
      completed: false,
      points: 0,
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr
    };
  });
});

// 【新增】获取每周天数的样式类名
const getWeeklyDayClass = (dayData: any) => {
  if (dayData.isToday && dayData.completed) {
    return 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 animate-pulse'; // 今天已完成：绿色+脉冲
  }
  if (dayData.isToday && !dayData.completed) {
    return 'bg-white text-emerald-600 border-2 border-emerald-500 ring-2 ring-emerald-200'; // 今天未完成：白色边框高亮
  }
  if (dayData.completed) {
    return 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'; // 过去已完成：实心绿
  }
  if (dayData.isFuture) {
    return 'bg-slate-800/50 text-slate-500 border border-slate-700'; // 未来：灰色空心
  }
  return 'bg-slate-700/50 text-slate-400 border border-slate-600'; // 过去未完成：深灰
};

// --- Health Plan Logic ---
const isPlanCollapsed = ref(true);
const currentPlanTab = ref('早');
const isRefreshing = ref(false);

interface PlanItem {
  name: string;
  dose: string;
  instruction: string;
  completed: boolean;
  slot: string;
  _id?: string;
  product_id?: string;
  product_name?: string;
  template_id?: string;
  template_name?: string;
}

// 【新增】多方案数据结构，每个方案单独存储
interface ProtocolData {
  id: string;
  name: string;
  template_id: string;
  tasks: Record<string, PlanItem[]>; // 按时段分组
  completed: boolean;
  totalTasks: number;
  completedTasks: number;
}

const protocolsData = ref<ProtocolData[]>([]);
const currentProtocolIndex = ref(0); // 当前显示的方案索引

// 保留旧的 planData 用于兼容
const planData = ref<Record<string, PlanItem[]>>({
  '早': [],
  '中': [],
  '晚': [],
  '睡': []
});

// 【重要】metrics 和 symptoms 必须在 calculateTodayPoints 之前声明（解决 TDZ 问题）
// --- Metrics Logic ---
const isMetricsCollapsed = ref(true);
const metrics = ref<MetricItem[]>([
  { label: '体脂率', value: '', unit: '%', icon: '⚡', type: 'body_fat' },
  { label: '血脂含量', value: '', unit: 'mmol/L', icon: '🩸', type: 'lipids' },
  { label: '内脏脂肪', value: '', unit: '级', icon: '🛡️', type: 'visceral_fat' },
  { label: '体重', value: '', unit: 'KG', icon: '⚖️', type: 'weight' },
  { label: '血糖', value: '', unit: 'mmol/L', icon: '🍬', type: 'glucose' }
]);

// --- Symptoms Logic ---
const isSymptomsCollapsed = ref(true);
const symptomNotes = ref('');
const symptoms = ref<SymptomItem[]>([
  { key: 'mood', label: '今日心情', value: 0 },
  { key: 'energy', label: '精力状态', value: 0 },
  { key: 'sleep', label: '睡眠质量', value: 0 },
  { key: 'digestion', label: '肠道情况', value: 0 }
]);

const currentPlanList = computed(() => {
  // 如果有多个方案，显示当前选中的方案
  if (protocolsData.value.length > 0) {
    const currentProtocol = protocolsData.value[currentProtocolIndex.value];
    if (currentProtocol) {
      return currentProtocol.tasks[currentPlanTab.value] || [];
    }
  }
  return planData.value[currentPlanTab.value] || [];
});
const totalTasks = computed(() => {
  // 如果有多个方案，返回所有方案的任务总数
  if (protocolsData.value.length > 0) {
    return protocolsData.value.reduce((sum, p) => sum + p.totalTasks, 0);
  }
  let count = 0;
  Object.values(planData.value).forEach(list => count += list.length);
  return count;
});
const completedTasks = computed(() => {
  // 【修复】支持多方案计算
  if (protocolsData.value.length > 0) {
    return protocolsData.value.reduce((sum, p) => sum + p.completedTasks, 0);
  }
  let count = 0;
  Object.values(planData.value).forEach(list => {
    list.forEach(item => {
      if (item.completed) count++;
    });
  });
  return count;
});

// 【新增】获取指定方案的已完成任务数
const getProtocolCompletedCount = (protocolIndex: number) => {
  const protocol = protocolsData.value[protocolIndex];
  if (!protocol) return 0;
  let count = 0;
  Object.values(protocol.tasks).forEach(list => {
    list.forEach(item => {
      if (item.completed) count++;
    });
  });
  return count;
};

// --- Sync Status ---
const lastSyncStatus = ref<{ time?: string; success?: boolean }>({});

// Auto-collapse when all tasks are completed
watch(completedTasks, (newVal) => {
  if (newVal === totalTasks.value && totalTasks.value > 0) {
    setTimer(() => {
      isPlanCollapsed.value = true;
    }, 800);
  }
});

const toggleTask = async (item: any) => {
  item.completed = !item.completed;
  
  // 【关键修复】如果是多方案模式，同步更新方案数据结构
  if (protocolsData.value.length > 0) {
    const currentProtocol = protocolsData.value[currentProtocolIndex.value];
    if (currentProtocol) {
      // 更新当前方案的 completedTasks 计数
      let completedCount = 0;
      Object.values(currentProtocol.tasks).forEach(list => {
        list.forEach((task: any) => {
          if (task.completed) completedCount++;
        });
      });
      currentProtocol.completedTasks = completedCount;
      currentProtocol.completed = completedCount === currentProtocol.totalTasks;
    }
  }
  
  // 乐观更新：基于板块完成情况重新计算总分
  const oldPoints = calculateTodayPoints().total;
  const newPoints = calculateTodayPoints().total;
  
  // 乐观更新显示（实际分数会由服务端返回后同步）
  if (userInfo.value.points !== undefined) {
    userInfo.value.points = newPoints;
    if (userInfo.value.points < 0) userInfo.value.points = 0;
  }

  // 【关键重构】根据是否有多个方案选择构建方式
  let allTasks: any[] = [];
  let currentProtocolId = '';
  
  if (protocolsData.value.length > 0) {
    // 多方案模式：只构建当前方案的任务
    const currentProtocol = protocolsData.value[currentProtocolIndex.value];
    if (currentProtocol) {
      currentProtocolId = currentProtocol.template_id || currentProtocol.id;
      Object.values(currentProtocol.tasks).forEach(list => {
        list.forEach((task: any) => {
          allTasks.push({
            ...task,
            template_id: currentProtocol.template_id,
            template_name: currentProtocol.name
          });
        });
      });
    }
  } else {
    // 单方案模式（兼容旧数据）
    ['早', '中', '晚', '睡'].forEach(slot => {
      allTasks.push(...planData.value[slot]);
    });
  }
  
  // 【修复】实时获取最新的userId和token
  const userIdForCheckIn = getUserId();
  const tokenForCheckIn = getToken();
  
  // 【新增】计算 section_status 用于实时同步
  const sectionStatus = {
    water: {
      completed: waterIntake.value >= POINTS.WATER_TARGET,
      current: waterIntake.value,
      target: POINTS.WATER_TARGET
    },
    metrics: {
      completed: metrics.value?.every((m: any) => m.value !== undefined && m.value !== null && m.value !== '') || false,
      items: metrics.value || []
    },
    symptoms: {
      completed: symptoms.value?.length > 0 && symptoms.value?.some((s: any) => s.value > 0),
      score: symptoms.value?.length > 0 
        ? symptoms.value.reduce((sum: number, s: any) => sum + (s.value || 0), 0) / symptoms.value.length 
        : 0,
      items: symptoms.value || []
    },
    tasks: {
      morning: { 
        completed: (protocolsData.value.length > 0 
          ? protocolsData.value[currentProtocolIndex.value]?.tasks['早'] 
          : planData.value['早'])?.every((t: any) => t.completed) || false,
        items: (protocolsData.value.length > 0 
          ? protocolsData.value[currentProtocolIndex.value]?.tasks['早'] 
          : planData.value['早']) || []
      },
      noon: { 
        completed: (protocolsData.value.length > 0 
          ? protocolsData.value[currentProtocolIndex.value]?.tasks['中'] 
          : planData.value['中'])?.every((t: any) => t.completed) || false,
        items: (protocolsData.value.length > 0 
          ? protocolsData.value[currentProtocolIndex.value]?.tasks['中'] 
          : planData.value['中']) || []
      },
      evening: { 
        completed: (protocolsData.value.length > 0 
          ? protocolsData.value[currentProtocolIndex.value]?.tasks['晚'] 
          : planData.value['晚'])?.every((t: any) => t.completed) || false,
        items: (protocolsData.value.length > 0 
          ? protocolsData.value[currentProtocolIndex.value]?.tasks['晚'] 
          : planData.value['晚']) || []
      },
      bedtime: { 
        completed: planData.value['睡']?.every((t: any) => t.completed) || false,
        items: planData.value['睡'] || []
      }
    }
  };
  
  // We need to call a new action `updateDailyPlanTasks`
  try {
    logger.debug('Sending task update, allTasks:', allTasks.length, 'completed:', allTasks.filter(t => t.completed).length);
    const res = await callCloud('client-api', {
      action: 'updateDailyPlanTasks',
      payload: {
        userId: userIdForCheckIn,
        date: dateStr.value,
        tasks: allTasks,
        token: tokenForCheckIn,
        water_intake: waterIntake.value,
        water_target: POINTS.WATER_TARGET,
        health_metrics: metrics.value,
        symptoms: symptoms.value,
        section_status: sectionStatus
      }
    });

    logger.debug('Server response:', res);

    // 服务端返回的 points/streak_days 仅用于回写数据库供顾问端读取
    // 客户端显示始终以 localTotalPoints/localStreakDays 为准，不覆盖
    if (res.code === 0 && res.data) {
      lastSyncStatus.value = { time: new Date().toISOString(), success: true };
      logger.debug('Sync status updated');
    } else {
      logger.warn('Server returned no data or error:', res);
      lastSyncStatus.value = { time: new Date().toISOString(), success: false };
    }
  } catch (e) {
    logger.error(e);
    item.completed = !item.completed;
    lastSyncStatus.value = { time: new Date().toISOString(), success: false };
  }
};

const togglePlanCollapse = () => {
  // 如果没有任务，允许展开查看详情（显示空状态）
  // 如果所有任务完成，也允许展开
  isPlanCollapsed.value = !isPlanCollapsed.value;
};

const getPlanCount = (tab: string) => {
  // 【修复】支持多方案
  if (protocolsData.value.length > 0) {
    const currentProtocol = protocolsData.value[currentProtocolIndex.value];
    if (currentProtocol) {
      return currentProtocol.tasks[tab]?.length || 0;
    }
    return 0;
  }
  return planData.value[tab]?.length || 0;
};

const getPlanCompletedCount = (tab: string) => {
  // 【修复】支持多方案
  if (protocolsData.value.length > 0) {
    const currentProtocol = protocolsData.value[currentProtocolIndex.value];
    if (currentProtocol) {
      return currentProtocol.tasks[tab]?.filter(item => item.completed).length || 0;
    }
    return 0;
  }
  return planData.value[tab]?.filter(item => item.completed).length || 0;
};

const getTabClass = (tab: string) => {
  const count = getPlanCount(tab);
  if (count === 0) return 'text-slate-300'; // No tasks
  
  const completed = getPlanCompletedCount(tab);
  const isSelected = currentPlanTab.value === tab;
  
  if (count > 0) {
    if (completed === count) {
      // All completed
      return isSelected 
        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
        : 'bg-emerald-100 text-emerald-600';
    }
    // Partially completed or Not started
    return isSelected
      ? 'bg-white text-slate-900 shadow-sm'
      : 'text-slate-400';
  }
  
  // No tasks
  return 'text-slate-300 pointer-events-none';
};

// --- Points Calculation (4 Section System + Streak Bonus) ---
// 饮水1分 + 打卡5分 + 健康指标2分 + 体感2分 = 10分基础分/天
// 连续打卡全勤奖励：第2天起+2分，每日+2分递增，第7天起封顶+12分

const calculateTodayPoints = (): PointsResult => {
  let basePoints = 0;
  const debug = {} as any;

  // 【防御性检查】确保所有依赖的响应式变量已初始化
  if (!waterIntake || !planData || !metrics || !symptoms || !userInfo) {
    logger.warn('calculateTodayPoints: 部分变量未初始化');
    return { total: 0, base: 0, streakBonus: 0, isPerfect: false };
  }

  // 1. 饮水板块 (1分) - 达到目标饮水量
  const waterCompleted = (waterIntake.value || 0) >= POINTS.WATER_TARGET;
  debug.water = { current: waterIntake.value || 0, target: POINTS.WATER_TARGET, completed: waterCompleted };
  if (waterCompleted) basePoints += 1;
  
  // 2. 打卡板块 (5分) - 所有时段任务全部完成
  // 【修复】同时检查 planData 和 protocolsData（多方案模式）
  let allTasks: any[] = [];
  const planTasks = Object.values(planData.value || {}).flat();

  // 如果 planData 为空，尝试从 protocolsData 获取
  if (planTasks.length === 0 && (protocolsData.value || []).length > 0) {
    (protocolsData.value || []).forEach((p: any) => {
      Object.values(p.tasks || {}).forEach((slotTasks: any) => {
        allTasks = allTasks.concat(slotTasks || []);
      });
    });
  } else {
    allTasks = planTasks;
  }

  const hasTasks = allTasks.length > 0;
  const allTasksCompleted = hasTasks && allTasks.every(t => t.completed);
  debug.plan = {
    taskCount: allTasks.length,
    hasTasks,
    source: planTasks.length > 0 ? 'planData' : ((protocolsData.value || []).length > 0 ? 'protocolsData' : 'none'),
    completedList: allTasks.map(t => ({ id: t.id, name: t.name || t.task_name, completed: t.completed })),
    allTasksCompleted
  };
  if (allTasksCompleted) basePoints += 5;

  // 3. 健康指标板块 (2分) - 至少填写了一项指标
  // 【修复】同时检查字符串和数字类型，添加防御性检查
  const metricsList = metrics.value || [];
  const hasMetrics = metricsList.some((m: any) => {
    const v = m?.value;
    return v !== '' && v !== undefined && v !== null && v !== 0 && String(v).trim() !== '';
  });
  debug.metrics = { list: metricsList.map((m: any) => ({ label: m?.label, value: m?.value, type: typeof m?.value })), hasMetrics };
  if (hasMetrics) basePoints += 2;

  // 4. 体感反馈板块 (2分) - 至少填写了一项体感（选择了非默认选项）
  // 【修复】用户选择了"差(2)"、"还可以(5)"或"很好(8)"都算填写，添加防御性检查
  const symptomsList = symptoms.value || [];
  const hasSymptoms = symptomsList.some((s: any) => {
    const v = s?.value;
    return v !== undefined && v !== null && v !== 0;
  });
  debug.symptoms = { list: symptomsList.map((s: any) => ({ label: s?.label, value: s?.value })), hasSymptoms };
  if (hasSymptoms) basePoints += 2;
  
  // 5. 连续打卡全勤奖励（只有拿到满分10分才触发）
  let streakBonus = 0;
  if (basePoints === 10) {
    const streakDays = userInfo.value.streak_days || 0;
    // 连续第2天起：+2分，每日+2分递增，第7天起封顶+12分
    // 第1天:0, 第2天:+2, 第3天:+4, 第4天:+6, 第5天:+8, 第6天:+10, 第7天+:12(封顶)
    if (streakDays >= 2) {
      streakBonus = Math.min((streakDays - 1) * 2, 12);
    }
  }
  
  // 【调试】输出积分计算详情（使用 logger.group 自动处理小程序兼容）
  logger.group('积分计算详情', () => {
    logger.debug('饮水:', debug.water.completed ? `+1分 (${debug.water.current}L ≥ ${debug.water.target}L)` : '0分 (未达标)');
    logger.debug('健康计划:', debug.plan.allTasksCompleted ? '+5分 (全部完成)' : `0分 (共${debug.plan.taskCount}任务)`);
    logger.debug('健康指标:', debug.hasMetrics ? '+2分' : '0分 (未填写)');
    logger.debug('体感反馈:', debug.hasSymptoms ? '+2分' : '0分 (未填写或值为0)');
    logger.debug(`基础分: ${basePoints}/10 | 连续奖励: +${streakBonus} | 总计: ${basePoints + streakBonus}分`);
  });
  
  return {
    total: basePoints + streakBonus,
    base: basePoints,
    streakBonus: streakBonus,
    isPerfect: basePoints === 10,
    _debug: debug  // 暴露调试数据供外部查看
  };
};

// 【新增】本地计算的总积分（实时响应，基于当前页面数据）
const localTotalPoints = computed(() => {
  const summary = weeklyPlanSummary.value;
  if (summary.length > 0) {
    let total = 0;
    let streak = 0;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    for (let i = summary.length - 1; i >= 0; i--) {
      const day = summary[i];
      if (day.date > todayStr) continue;
      const isToday = day.date === todayStr;
      if (isToday) {
        const tr = calculateTodayPoints();
        total += tr.total;
        streak++;
        continue;
      }
      const hasRealProgress = day.tasks_completed || day.water_done || day.has_symptoms;
      if (!hasRealProgress) continue;
      const dayPoints = (day.tasks_completed ? 5 : 0) + (day.water_done ? 1 : 0) + (day.has_symptoms ? 2 : 0);
      total += dayPoints >= 8 ? 10 : dayPoints;
      streak++;
    }
    if (streak >= 2) total += Math.min(streak * 2, 12);
    return total;
  }

  const todayResult = calculateTodayPoints();
  return todayResult.total;
});

// 【客户端是数据生产者】始终以本地实时计算为准，不依赖服务端回写值
// 服务端 user.points 仅用于顾问端/Web端展示
const displayPoints = computed(() => localTotalPoints.value);

const displayStreakDays = computed(() => localStreakDays.value);

const localStreakDays = computed(() => {
  const summary = weeklyPlanSummary.value;
  if (summary.length > 0) {
    let streak = 0;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayResult = calculateTodayPoints();
    if (todayResult.total > 0) streak = 1;
    for (let i = summary.length - 2; i >= 0; i--) {
      const day = summary[i];
      if (day.date >= todayStr) continue;
      const hasRealProgress = day.tasks_completed || day.water_done || day.has_symptoms;
      if (!hasRealProgress) break;
      streak++;
    }
    return streak;
  }

  const todayResult = calculateTodayPoints();
  return todayResult.isPerfect ? 1 : 0;
});

// 【关键修复】自动同步本地积分到 userInfo（当云函数未返回时）
watch([waterIntake, planData, metrics, symptoms], () => {
  const todayResult = calculateTodayPoints();

  // 只有当服务端积分<=0时，才用本地计算值覆盖显示
  if ((userInfo.value.points || 0) === 0 && todayResult.total > 0) {
    userInfo.value.points = todayResult.total;
    logger.debug(`本地积分计算: ${todayResult.total}分 (基础${todayResult.base} + 奖励${todayResult.streakBonus})`);
  }

  if ((userInfo.value.streak_days || 0) === 0 && todayResult.isPerfect) {
    userInfo.value.streak_days = 1;
    logger.debug('本地连续天数: 1天 (今日全勤)');
  }
}, { deep: true, immediate: true });

// （metrics 已提前声明到 planData 之后）
// Auto-collapse when all metrics are filled
const isMetricsCompleted = computed(() => {
  return metrics.value.every(m => m.value !== '');
});
watch(isMetricsCompleted, (newVal) => {
  if (newVal) {
    setTimer(() => {
      isMetricsCollapsed.value = true;
    }, 800);
  }
});

const getEstimatedBodyFat = () => {
  if (!userInfo.value.height || !userInfo.value.weight || !userInfo.value.age) return 0;
  const bmi = calculateBMI(userInfo.value.weight, userInfo.value.height);
  return estimateBodyFat(bmi, userInfo.value.age, userInfo.value.gender || 'female');
};

const getMetricEvaluation = (metric: any): HealthStatus | null => {
  if (!metric.value) return null;
  const val = Number(metric.value);
  if (isNaN(val)) return null;

  const age = userInfo.value.age || 30; // 默认30岁
  const gender = userInfo.value.gender || 'female';

  switch (metric.type) {
    case 'body_fat':
      return evaluateBodyFat(val, age, gender);
    case 'lipids':
      return evaluateTG(val); // 暂以甘油三酯为准
    case 'visceral_fat':
      return evaluateVisceralFat(val);
    case 'glucose':
      return evaluateBloodSugar(val, age);
    case 'weight':
      if (userInfo.value.height) {
        const bmi = calculateBMI(val, userInfo.value.height);
        return evaluateBMI(bmi, age);
      }
      return null;
    default:
      return null;
  }
};

// Watch for changes to save metrics (Debounce needed in real app)
const saveMetric = async (metric: any) => {
  if (!metric.value) return;
  
  // 记录旧积分
  const oldPoints = calculateTodayPoints().total;
  
  // 【修复】实时获取最新的userId和token
  const userIdForMetric = getUserId();
  const tokenForMetric = getToken();
  
  try {
    const res = await callCloud('client-api', {
      action: 'updateHealthMetric',
      payload: {
        userId: userIdForMetric,
        date: dateStr.value,
        type: metric.type,
        value: parseFloat(metric.value),
        unit: metric.unit,
        token: tokenForMetric
      }
    });

    // 同步服务端返回的积分
    if (res?.code === 0 && res?.data?.points !== undefined) {
      userInfo.value.points = res.data.points;
    }
  } catch (e) { 
    logger.error(e);
    // 错误回滚：重新计算积分
    if (userInfo.value.points !== undefined) {
      userInfo.value.points = calculateTodayPoints().total;
    }
  }
  
  // 【新增】自动同步 section_status
  await syncSectionStatus();
};

// Auto-collapse when all symptoms are rated
const isSymptomsCompleted = computed(() => {
  return symptoms.value.every(s => s.value > 0);
});
watch(isSymptomsCompleted, (newVal) => {
  if (newVal) {
    setTimer(() => {
      isSymptomsCollapsed.value = true;
    }, 800);
  }
});

// 【新增】体感评分变化时自动保存（防抖1.5秒，避免频繁调用）
let symptomSaveTimer: any = null;
watch(symptoms, () => {
  // 仅在有至少一项评分时触发保存
  const hasAny = symptoms.value.some(s => s.value > 0);
  if (!hasAny) return;
  
  if (symptomSaveTimer) clearTimer(symptomSaveTimer);
  symptomSaveTimer = setTimer(() => {
    saveSymptoms();
  }, 1500);
}, { deep: true });

const saveSymptoms = async () => {
  // 记录旧积分
  const oldPoints = calculateTodayPoints().total;
  
  // 【修复】实时获取最新的userId和token
  const userIdForSymptoms = getUserId();
  const tokenForSymptoms = getToken();
  
  // 【关键】构建 sectionStatus，确保 symptoms 状态正确
  const morningTasks = planData.value['早'] || [];
  const noonTasks = planData.value['中'] || [];
  const eveningTasks = planData.value['晚'] || [];
  const bedtimeTasks = planData.value['睡'] || [];
  
  const allTasks = [
    ...morningTasks.map(t => ({ ...t, slot: 'morning' })),
    ...noonTasks.map(t => ({ ...t, slot: 'noon' })),
    ...eveningTasks.map(t => ({ ...t, slot: 'evening' })),
    ...bedtimeTasks.map(t => ({ ...t, slot: 'bedtime' }))
  ];
  
  const sectionStatus = {
    water: {
      completed: waterIntake.value >= POINTS.WATER_TARGET,
      current: waterIntake.value,
      target: POINTS.WATER_TARGET
    },
    metrics: {
      completed: metrics.value.some(m => m.value !== '' && m.value !== undefined && m.value !== null),
      items: metrics.value || []
    },
    symptoms: {
      completed: symptoms.value?.length > 0 && symptoms.value?.some((s: any) => s.value > 0),
      score: symptoms.value?.length > 0 
        ? symptoms.value.reduce((sum: number, s: any) => sum + (s.value || 0), 0) / symptoms.value.length 
        : 0,
      items: symptoms.value || []
    },
    tasks: {
      morning: { completed: morningTasks.every(t => t.completed), items: morningTasks },
      noon: { completed: noonTasks.every(t => t.completed), items: noonTasks },
      evening: { completed: eveningTasks.every(t => t.completed), items: eveningTasks },
      bedtime: { completed: bedtimeTasks.every(t => t.completed), items: bedtimeTasks }
    }
  };
  
  try {
    const res = await callCloud('client-api', {
      action: 'updateSymptoms',
      payload: {
        userId: userIdForSymptoms,
        date: dateStr.value,
        symptoms: symptoms.value.map(s => ({
          key: s.key, // Standard English key for WROM calc
          label: s.label,
          value: s.value
        })),
        symptomNotes: symptomNotes.value,
        section_status: sectionStatus, // 【关键】同时传递 section_status
        token: tokenForSymptoms
      }
    });

    // 同步服务端返回的积分
    if (res?.code === 0 && res?.data?.points !== undefined) {
      userInfo.value.points = res.data.points;
    }
  } catch (e) { 
    logger.error(e);
    // 错误回滚：重新计算积分
    if (userInfo.value.points !== undefined) {
      userInfo.value.points = calculateTodayPoints().total;
    }
  }
  
  // 【可选】额外同步一次 section_status 确保一致性
  await syncSectionStatus();
};



// --- Achievement Logic ---
const showAchievement = ref(false);

const isAllDailyTasksCompleted = computed(() => {
  // 1. Plan Completed (必须有任务且全部完成)
  const planCompleted = completedTasks.value === totalTasks.value && totalTasks.value > 0;
  // 2. Metrics Completed (isMetricsCompleted is already defined)
  // 3. Symptoms Completed (isSymptomsCompleted is already defined)
  return planCompleted && isMetricsCompleted.value && isSymptomsCompleted.value;
});

watch(isAllDailyTasksCompleted, (newVal) => {
  if (newVal) {
    // 检查今天是否已经显示过成就弹窗
    const alreadyShown = uni.getStorageSync(todayAchievementKey.value);
    if (alreadyShown) {
      logger.debug('Achievement already shown today, skipping');
      return;
    }
    
    // 延迟一点显示，让用户先看到最后一个任务完成的动画
    setTimer(() => {
      showAchievement.value = true;
      // 记录今天已经显示过
      uni.setStorageSync(todayAchievementKey.value, true);
      logger.debug('Achievement popup shown for the first time today');
    }, 1200);
  }
});

const shareAchievement = () => {
  uni.showToast({
    title: '已生成分享图片',
    icon: 'success'
  });
  setTimer(() => {
    showAchievement.value = false;
  }, 1500);
};

// --- Sync Button ---
// 【增强】确保所有数据一次性完整同步到云端，作为用户数据积累
const syncData = async () => {
  uni.showLoading({ title: '同步中...', mask: true });

  const token = getToken();
  const userId = getUserId();

  if (!token || !userId) {
    uni.hideLoading();
    uni.showToast({ title: '请先登录', icon: 'none' });
    return;
  }

  try {
    // 1. 收集所有任务状态（包括已完成和未完成的）
    const allTasks: any[] = [];
    Object.entries(planData.value).forEach(([slot, items]) => {
      items.forEach((item: any) => {
        allTasks.push({
          product_id: item.product_id,
          product_name: item.product_name || item.name,
          slot: item.slot,
          completed: !!item.completed,
          completed_at: item.completed ? (item.completed_at || new Date().toISOString()) : undefined
        });
      });
    });

    // 2. 计算各板块完成状态
    const sectionStatus = {
      water: {
        completed: waterIntake.value >= POINTS.WATER_TARGET,
        current: waterIntake.value,
        target: POINTS.WATER_TARGET
      },
      metrics: {
        completed: metrics.value?.every((m: any) => m.value !== undefined && m.value !== null && m.value !== '') || false,
        items: metrics.value || []
      },
      symptoms: {
        completed: symptoms.value?.length > 0 && symptoms.value?.some((s: any) => s.value > 0),
        score: symptoms.value?.length > 0
          ? symptoms.value.reduce((sum: number, s: any) => sum + (s.value || 0), 0) / symptoms.value.length
          : 0,
        items: symptoms.value || []
      },
      tasks: {
        morning: {
          completed: planData.value['早']?.every((t: any) => t.completed) || false,
          items: planData.value['早'] || []
        },
        noon: {
          completed: planData.value['中']?.every((t: any) => t.completed) || false,
          items: planData.value['中'] || []
        },
        evening: {
          completed: planData.value['晚']?.every((t: any) => t.completed) || false,
          items: planData.value['晚'] || []
        },
        bedtime: {
          completed: planData.value['睡']?.every((t: any) => t.completed) || false,
          items: planData.value['睡'] || []
        }
      }
    };

    // 3. 【关键】一次性提交所有数据到云端（任务、饮水、体感、健康指标）
    logger.debug('[syncData] 开始完整同步，日期:', dateStr.value, '任务数:', allTasks.length);
    const res = await callCloud('client-api', {
      action: 'updateDailyPlanTasks',
      payload: {
        userId,
        date: dateStr.value,
        tasks: allTasks,
        water_intake: waterIntake.value,
        water_target: POINTS.WATER_TARGET,
        health_metrics: metrics.value,
        symptoms: symptoms.value,
        symptom_notes: symptomNotes.value,
        section_status: sectionStatus,
        is_final_sync: true,
        client_points: localTotalPoints.value,
        client_streak_days: localStreakDays.value,
        token
      }
    });

    logger.debug('[syncData] 同步结果:', res);

    if (res?.code === 0) {
      // 更新本地积分和连续天数
      if (res.data?.points !== undefined) {
        userInfo.value.points = res.data.points;
      }
      if (res.data?.streak_days !== undefined) {
        userInfo.value.streak_days = res.data.streak_days;
      }

      // 更新同步状态
      lastSyncStatus.value = {
        time: new Date().toISOString(),
        success: true
      };

      uni.hideLoading();
      uni.showToast({ title: '今日数据已保存', icon: 'success' });
    } else {
      throw new Error(res?.msg || '同步失败');
    }
  } catch (err) {
    logger.error('[syncData] 同步错误:', err);
    uni.hideLoading();
    uni.showToast({ title: '同步失败，请重试', icon: 'none' });
  }
};

// 【新增】同步任务状态到云端（自动同步）
const syncTaskStatus = async (isFinalSync = false) => {
  const token = uni.getStorageSync('token');
  const userId = uni.getStorageSync('userInfo')?._id;
  
  if (!token || !userId) {
    logger.error('[syncTaskStatus] No token or userId');
    return;
  }
  
  // 【修复】收集所有任务（包括已完成和未完成的）
  const allTasks: any[] = [];
  
  Object.entries(planData.value).forEach(([slot, items]) => {
    items.forEach((item: any) => {
      allTasks.push({
        product_id: item.product_id,
        product_name: item.product_name || item.name,
        slot: item.slot,
        completed: !!item.completed,
        // 包含剂量信息用于显示
        dose: item.dose,
        unit: item.unit,
        daily_usage: item.daily_usage,
        is_permanent: item.is_permanent || false
      });
    });
  });
  
  logger.debug(`[syncTaskStatus] Syncing all tasks (final=${isFinalSync}):`, allTasks);
  
  try {
    const res = await callCloud('client-api', {
      action: 'updateDailyPlanTasks',
      payload: {
        userId,
        date: dateStr.value,
        tasks: allTasks,
        token,
        is_final_sync: isFinalSync // 【新增】最终同步标记
      }
    });

    logger.debug('[syncTaskStatus] Sync result:', res);

    if (res?.code === 0) {
      if (isFinalSync) {
        uni.showToast({
          title: '今日打卡已完成',
          icon: 'success'
        });
      }
    } else {
      logger.error('[syncTaskStatus] Sync failed:', res?.msg);
    }
  } catch (err) {
    logger.error('[syncTaskStatus] Error:', err);
  }
};

</script>

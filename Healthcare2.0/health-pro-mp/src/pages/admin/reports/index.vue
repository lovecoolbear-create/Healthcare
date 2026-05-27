<template>
  <view>
    <!-- #ifdef H5 -->
    <DesktopReports v-if="isDesktop" />
    <!-- #endif -->
    
    <view v-if="!isDesktop" class="mp-page-shell min-h-screen bg-transparent pb-20">
      <!-- Header -->
      <div class="bg-white px-6 pt-12 pb-4 sticky top-0 z-50 shadow-sm">
        <h1 class="text-2xl font-black text-slate-900">数据分析报告</h1>
        <p class="text-xs text-slate-400 mt-1">查看整体运营数据与客户健康趋势</p>
      </div>

      <!-- Data Overview -->
      <div class="p-6 space-y-6">
        <div v-if="loading" class="text-center py-10 text-slate-400 text-sm">
          加载数据中...
        </div>

        <template v-else>
          <!-- Key Metrics Cards -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div class="flex items-center gap-2 mb-2">
                <span class="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">👥</span>
                <span class="text-xs font-bold text-slate-400">总客户数</span>
              </div>
              <p class="text-2xl font-black text-slate-900">{{ report.totalClients || 0 }}</p>
              <p class="text-[10px] text-emerald-500 font-bold mt-1">+2 本周</p>
            </div>
            
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <div class="flex items-center gap-2 mb-2">
                <span class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">📝</span>
                <span class="text-xs font-bold text-slate-400">今日打卡</span>
              </div>
              <p class="text-2xl font-black text-slate-900">{{ report.todayCheckIns || 0 }}</p>
              <p class="text-[10px] text-indigo-500 font-bold mt-1">{{ report.totalClients ? Math.round((report.todayCheckIns / report.totalClients) * 100) : 0 }}% 完成率</p>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 col-span-2">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-xs">⚠️</span>
                  <span class="text-xs font-bold text-slate-400">需重点关注 (WROM < 60)</span>
                </div>
                <span class="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full">{{ report.attentionClients || 0 }} 人</span>
              </div>
              <div class="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  class="bg-rose-500 h-full rounded-full transition-all duration-1000" 
                  :style="{ width: report.totalClients ? `${(report.attentionClients / report.totalClients) * 100}%` : '0%' }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Trend Chart Placeholder (Simple CSS Chart) -->
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 class="text-sm font-bold text-slate-800 mb-6">本周平均 WROM 分数趋势</h3>
            <div class="h-40 flex items-end justify-between gap-2">
              <div 
                v-for="(val, index) in (report.weeklyTrend || [])" 
                :key="index" 
                class="w-full bg-indigo-50 rounded-t-lg relative group transition-all hover:bg-indigo-100"
                :style="{ height: `${val}%` }"
              >
                <div class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {{ val }}
                </div>
              </div>
            </div>
            <div class="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>

          <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 class="text-sm font-bold text-slate-800 mb-4">健康风险分布</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span class="text-xs font-bold text-slate-600">低风险 (健康)</span>
                </div>
                <span class="text-xs font-bold text-slate-900">{{ riskDistribution.low.percent }}% · {{ riskDistribution.low.count }}人</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-amber-400"></span>
                  <span class="text-xs font-bold text-slate-600">中风险 (观察)</span>
                </div>
                <span class="text-xs font-bold text-slate-900">{{ riskDistribution.medium.percent }}% · {{ riskDistribution.medium.count }}人</span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span class="text-xs font-bold text-slate-600">高风险 (预警)</span>
                </div>
                <span class="text-xs font-bold text-slate-900">{{ riskDistribution.high.percent }}% · {{ riskDistribution.high.count }}人</span>
              </div>
            </div>
          </div>

        </template>
      </div>
    </view>
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { callCloud, getAuthToken } from '@/utils/cloud';
import { ref, onMounted, computed } from 'vue';

// #ifdef H5
import DesktopReports from './components/DesktopReports.vue';
// #endif

const isDesktop = ref(false);
const loading = ref(true);
const report = ref<any>({});
const riskDistribution = computed(() => {
  const base = report.value?.riskDistribution || {};
  return {
    low: { count: Number(base?.low?.count || 0), percent: Number(base?.low?.percent || 0) },
    medium: { count: Number(base?.medium?.count || 0), percent: Number(base?.medium?.percent || 0) },
    high: { count: Number(base?.high?.count || 0), percent: Number(base?.high?.percent || 0) }
  };
});
const getApiErrorMessage = (code?: number, msg?: string, fallback = '加载失败') => {
  if (msg) return msg;
  if (code === 400) return '请求参数有误';
  if (code === 401) return '登录状态失效，请重新登录';
  if (code === 403) return '权限不足，无法执行此操作';
  if (code === 404) return '目标数据不存在或已被删除';
  return fallback;
};

const fetchReport = async () => {
  if (!getAuthToken()) return;
  loading.value = true;
  try {
    const userInfo = getUserInfo();
    const res = await callCloud('client-api', {
      action: 'getAdminReports',
      payload: { userId: userInfo ? userInfo._id : '' }
    });
    if (res.ok) {
      report.value = res.data || {};
    } else {
      uni.showToast({ title: getApiErrorMessage(res.code, res.msg, '加载失败'), icon: 'none' });
    }
  } catch (e) {
    console.error('fetch report failed:', e);
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  // #ifdef H5
  isDesktop.value = true;
  // #endif
  
  if (!isDesktop.value) {
    fetchReport();
  }
});
</script>

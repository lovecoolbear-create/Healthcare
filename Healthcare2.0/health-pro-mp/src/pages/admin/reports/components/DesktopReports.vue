<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <Sidebar activeTab="reports" />
    
    <!-- Main Content -->
    <div class="flex-1 p-10 pb-24 overflow-y-auto h-screen">
      <!-- Header -->
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">数据分析报告</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-sm text-slate-500 font-medium">最后更新: {{ new Date().toLocaleDateString() }}</span>
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="text-sm text-slate-500">实时运营数据监控</span>
          </div>
        </div>
        
        <div class="flex gap-3">
          <button @click="exportReport" class="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Download class="w-4 h-4" /> 导出报表
          </button>
          <button @click="fetchReport" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2">
            <RefreshCw class="w-4 h-4" /> 刷新数据
          </button>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-40">
        <div class="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>

      <div v-else class="space-y-8">
        <!-- Main Chart Section - Focus on Trend Analysis -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Weekly Trend Chart -->
          <div class="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div class="flex justify-between items-center mb-8">
              <div>
                <h3 class="text-lg font-bold text-slate-900">本周 {{ trendMetric === 'wrom' ? 'WROM 健康指数' : 'RPS 复购倾向' }}趋势</h3>
                <p class="text-xs text-slate-400 mt-1">{{ trendMetric === 'wrom' ? '反映所有活跃客户的平均健康评分变化' : '反映复购意愿变化与潜在流失风险' }}</p>
              </div>
              <div class="flex items-center gap-2">
                <div class="bg-slate-100 rounded-lg p-1 flex gap-1">
                  <button
                    class="px-2.5 h-7 rounded-md text-[11px] font-bold transition-colors"
                    :class="trendMetric === 'wrom' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                    @click="trendMetric = 'wrom'"
                  >
                    WROM
                  </button>
                  <button
                    class="px-2.5 h-7 rounded-md text-[11px] font-bold transition-colors"
                    :class="trendMetric === 'rps' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
                    @click="trendMetric = 'rps'"
                  >
                    RPS
                  </button>
                </div>
                <select v-model="rangeDays" @change="fetchReport" class="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 rounded-lg px-3 py-2 outline-none">
                  <option :value="7">最近7天</option>
                  <option :value="30">最近30天</option>
                </select>
              </div>
            </div>
            
            <div class="h-64 flex items-end justify-between gap-4 px-4">
              <div 
                v-for="(val, index) in currentTrend" 
                :key="index" 
                class="flex-1 flex flex-col justify-end group cursor-pointer"
              >
                <div class="relative w-full rounded-t-xl transition-all duration-300"
                  :class="trendMetric === 'wrom' ? 'bg-indigo-50 hover:bg-indigo-500 group-hover:shadow-lg group-hover:shadow-indigo-200' : 'bg-violet-50 hover:bg-violet-500 group-hover:shadow-lg group-hover:shadow-violet-200'"
                  :style="{ height: `${val}%` }">
                  <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {{ val }} 分
                    <div class="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                  </div>
                </div>
                <span class="text-xs font-bold text-slate-400 text-center mt-3 transition-colors"
                  :class="trendMetric === 'wrom' ? 'group-hover:text-indigo-600' : 'group-hover:text-violet-600'">{{ trendLabels[index as number] }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
              <h3 class="text-lg font-bold text-slate-900 mb-6">健康风险分布（WROM）</h3>
              
              <div class="flex-1 flex items-center justify-center relative">
                <div class="w-40 h-40 rounded-full p-4 transition-all duration-300" :style="riskDonutStyle">
                  <div class="w-full h-full rounded-full bg-white flex items-center justify-center flex-col">
                    <span class="text-3xl font-black text-slate-900">{{ riskDistribution.low.percent }}%</span>
                    <span class="text-xs text-slate-400 font-bold">健康占比</span>
                  </div>
                </div>
              </div>

              <div class="space-y-2 mt-5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span class="text-xs font-bold text-slate-600">低风险</span>
                  </div>
                  <span class="text-xs font-bold text-slate-900">{{ riskDistribution.low.percent }}% · {{ riskDistribution.low.count }}人</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-amber-400"></span>
                    <span class="text-xs font-bold text-slate-600">中风险</span>
                  </div>
                  <span class="text-xs font-bold text-slate-900">{{ riskDistribution.medium.percent }}% · {{ riskDistribution.medium.count }}人</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span class="text-xs font-bold text-slate-600">高风险</span>
                  </div>
                  <span class="text-xs font-bold text-slate-900">{{ riskDistribution.high.percent }}% · {{ riskDistribution.high.count }}人</span>
                </div>
              </div>
            </div>

            <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
              <h3 class="text-lg font-bold text-slate-900 mb-6">复购风险分布（RPS）</h3>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs text-slate-400 font-bold">平均 RPS</span>
                <span class="text-sm font-black text-violet-600">{{ Number(report.avgRpsScore || 0) }}</span>
              </div>
              <div class="flex-1 flex items-center justify-center relative">
                <div class="w-40 h-40 rounded-full p-4 transition-all duration-300" :style="rpsDonutStyle">
                  <div class="w-full h-full rounded-full bg-white flex items-center justify-center flex-col">
                    <span class="text-3xl font-black text-slate-900">{{ rpsDistribution.low.percent }}%</span>
                    <span class="text-xs text-slate-400 font-bold">高复购占比</span>
                  </div>
                </div>
              </div>
              <div class="space-y-2 mt-5">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-violet-500"></span>
                    <span class="text-xs font-bold text-slate-600">高复购</span>
                  </div>
                  <span class="text-xs font-bold text-slate-900">{{ rpsDistribution.low.percent }}% · {{ rpsDistribution.low.count }}人</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-indigo-400"></span>
                    <span class="text-xs font-bold text-slate-600">中复购</span>
                  </div>
                  <span class="text-xs font-bold text-slate-900">{{ rpsDistribution.medium.percent }}% · {{ rpsDistribution.medium.count }}人</span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-slate-400"></span>
                    <span class="text-xs font-bold text-slate-600">低复购</span>
                  </div>
                  <span class="text-xs font-bold text-slate-900">{{ rpsDistribution.high.percent }}% · {{ rpsDistribution.high.count }}人</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { ref, onMounted, computed } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import { Download, RefreshCw } from 'lucide-vue-next';
import { callCloud } from '@/utils/cloud';

const loading = ref(true);
const report = ref<any>({});
const rangeDays = ref<7 | 30>(7);
const trendMetric = ref<'wrom' | 'rps'>('wrom');
const getUserId = () => {
  const userInfo = getUserInfo();
  return userInfo ? userInfo._id : '';
};
const getApiErrorMessage = (code?: number, msg?: string, fallback = '加载失败') => {
  if (msg) return msg;
  if (code === 400) return '请求参数有误';
  if (code === 401) return '登录状态失效，请重新登录';
  if (code === 403) return '权限不足，无法执行此操作';
  if (code === 404) return '目标数据不存在或已被删除';
  return fallback;
};
const riskDistribution = computed(() => {
  const base = report.value?.riskDistribution || {};
  return {
    low: {
      count: Number(base?.low?.count || 0),
      percent: Number(base?.low?.percent || 0)
    },
    medium: {
      count: Number(base?.medium?.count || 0),
      percent: Number(base?.medium?.percent || 0)
    },
    high: {
      count: Number(base?.high?.count || 0),
      percent: Number(base?.high?.percent || 0)
    }
  };
});
const rpsDistribution = computed(() => {
  const base = report.value?.rpsDistribution || {};
  return {
    low: {
      count: Number(base?.low?.count || 0),
      percent: Number(base?.low?.percent || 0)
    },
    medium: {
      count: Number(base?.medium?.count || 0),
      percent: Number(base?.medium?.percent || 0)
    },
    high: {
      count: Number(base?.high?.count || 0),
      percent: Number(base?.high?.percent || 0)
    }
  };
});
const riskDonutStyle = computed(() => {
  const low = Math.max(0, Math.min(100, riskDistribution.value.low.percent));
  const medium = Math.max(0, Math.min(100, riskDistribution.value.medium.percent));
  const highStart = Math.max(0, Math.min(100, low + medium));
  return {
    background: `conic-gradient(#10b981 0 ${low}%, #f59e0b ${low}% ${highStart}%, #ef4444 ${highStart}% 100%)`
  };
});
const rpsDonutStyle = computed(() => {
  const low = Math.max(0, Math.min(100, rpsDistribution.value.low.percent));
  const medium = Math.max(0, Math.min(100, rpsDistribution.value.medium.percent));
  const highStart = Math.max(0, Math.min(100, low + medium));
  return {
    background: `conic-gradient(#8b5cf6 0 ${low}%, #6366f1 ${low}% ${highStart}%, #94a3b8 ${highStart}% 100%)`
  };
});
const trendLabels = computed(() => {
  const length = currentTrend.value.length;
  const labels: string[] = [];
  for (let i = length - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
  }
  return labels;
});
const currentTrend = computed(() => {
  if (trendMetric.value === 'rps') {
    return Array.isArray(report.value?.weeklyTrendRps) ? report.value.weeklyTrendRps : [];
  }
  return Array.isArray(report.value?.weeklyTrend) ? report.value.weeklyTrend : [];
});

const exportReport = () => {
  const trend = Array.isArray(report.value?.weeklyTrend) ? report.value.weeklyTrend : [];
  const trendRps = Array.isArray(report.value?.weeklyTrendRps) ? report.value.weeklyTrendRps : [];
  const rows = [
    ['指标', '值'],
    ['总客户数', String(report.value?.totalClients || 0)],
    ['今日打卡', String(report.value?.todayCheckIns || 0)],
    ['重点关注', String(report.value?.attentionClients || 0)],
    ['复购关注', String(report.value?.repurchaseAttentionClients || 0)],
    ['平均RPS', String(report.value?.avgRpsScore || 0)],
    ['低风险占比', `${Number(riskDistribution.value.low.percent || 0)}%`],
    ['中风险占比', `${Number(riskDistribution.value.medium.percent || 0)}%`],
    ['高风险占比', `${Number(riskDistribution.value.high.percent || 0)}%`],
    ['RPS高复购占比', `${Number(rpsDistribution.value.low.percent || 0)}%`],
    ['RPS中复购占比', `${Number(rpsDistribution.value.medium.percent || 0)}%`],
    ['RPS低复购占比', `${Number(rpsDistribution.value.high.percent || 0)}%`],
    ['趋势区间', `最近${rangeDays.value}天`],
    ['WROM趋势分数', trend.join(' / ')],
    ['RPS趋势分数', trendRps.join(' / ')]
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  if (typeof document === 'undefined') {
    uni.setClipboardData({ data: csv, showToast: false });
    uni.showToast({ title: '报表内容已复制', icon: 'none' });
    return;
  }
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `healthcare-report-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  uni.showToast({ title: '导出成功', icon: 'success' });
};

const fetchReport = async () => {
  loading.value = true;
  try {
    const result = await callCloud('client-api', {
      action: 'getAdminReports',
      payload: { rangeDays: Number(rangeDays.value) }
    });
    if (result.code !== 0) {
      uni.showToast({ title: getApiErrorMessage(result.code, result.msg, '加载失败'), icon: 'none' });
      return;
    }
    report.value = result.data || {};
  } catch (e) {
    console.error('fetch report failed:', e);
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchReport();
});
</script>

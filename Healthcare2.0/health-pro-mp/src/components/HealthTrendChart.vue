<template>
  <div class="space-y-6 animate-in slide-in-from-right-4 duration-300">
    <!-- 周期选择 -->
    <div class="bg-white rounded-2xl p-1.5 flex shadow-sm border border-slate-200">
      <div 
        v-for="p in periods" 
        :key="p"
        @click="currentPeriod = p"
        class="flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer"
        :class="currentPeriod === p ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'"
      >
        {{ p }}
      </div>
    </div>

    <!-- 指标切换栏 -->
    <div class="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
      <div 
        v-for="metric in metrics" 
        :key="metric.key"
        @click="currentMetric = metric.key"
        class="flex-1 py-2 px-3 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 min-w-[70px]"
        :class="currentMetric === metric.key ? metric.colorClass.replace('bg-', 'bg-').replace('text-', 'text-').replace('shadow-', 'shadow-') + ' shadow-md border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'"
      >
        <span class="text-sm">{{ metric.icon }}</span>
        <span class="text-[10px] font-bold truncate w-full text-center px-1">{{ metric.name }}</span>
      </div>
    </div>

    <!-- 核心趋势图表 (SVG Custom Chart) -->
    <div class="bg-white rounded-[32px] p-6 shadow-lg shadow-slate-200 border border-slate-200 relative overflow-hidden transition-all duration-300">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-colors duration-300" :class="currentMetricConfig.colorClass">
            <span class="text-lg">{{ currentMetricConfig.icon }}</span>
          </div>
          <div>
            <h3 class="text-slate-900 font-black text-sm">{{ currentMetricConfig.name }}趋势</h3>
            <p class="text-xs text-slate-400 font-medium">目标: {{ currentMetricConfig.target }}</p>
          </div>
        </div>
        <div class="text-right">
          <div class="text-2xl font-black text-slate-900">{{ currentMetricConfig.currentValue }}<span class="text-xs text-slate-400 ml-1">{{ currentMetricConfig.unit }}</span></div>
          <div class="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block" :class="currentMetricConfig.trend > 0 ? 'text-rose-500 bg-rose-50' : 'text-emerald-500 bg-emerald-50'">
            {{ currentMetricConfig.trend > 0 ? '▲' : '▼' }} {{ Math.abs(currentMetricConfig.trend) }} {{ currentMetricConfig.unit }} ({{ periodLabel }})
          </div>
        </div>
      </div>

      <!-- 简单的 SVG 曲线图 -->
      <div class="relative h-48 w-full" v-if="!isLoading">
         <div v-if="currentMetricConfig.points.length > 0" class="w-full h-full relative">
            <!-- 网格线 -->
            <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div v-for="n in 5" :key="n" class="border-b border-slate-100 w-full h-0"></div>
            </div>
            
            <!-- SVG 路径 -->
            <svg viewBox="0 0 100 50" class="w-full h-full overflow-visible" preserveAspectRatio="none">
              <!-- 渐变填充 -->
              <defs>
                <linearGradient :id="'gradient-' + currentMetric" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" :stop-color="currentMetricConfig.chartColor" stop-opacity="0.2"/>
                  <stop offset="100%" :stop-color="currentMetricConfig.chartColor" stop-opacity="0"/>
                </linearGradient>
              </defs>
              
              <!-- 方案区间色带 (Protocol Bands) -->
              <g v-if="currentMetricConfig.bands && currentMetricConfig.bands.length > 0">
                <rect v-for="(band, idx) in currentMetricConfig.bands" :key="'band-'+idx"
                  :x="band.x" y="0" :width="band.width" height="50"
                  fill="rgba(16, 185, 129, 0.08)" />
              </g>
              
              <path 
                :d="currentMetricConfig.pathArea" 
                :fill="'url(#gradient-' + currentMetric + ')'" 
                class="transition-all duration-500 ease-in-out"
              />
              <!-- 线条 -->
              <path 
                :d="currentMetricConfig.pathLine" 
                fill="none" 
                :stroke="currentMetricConfig.chartColor" 
                stroke-width="1.5" 
                stroke-linecap="round"
                class="transition-all duration-500 ease-in-out"
              />
              <!-- 数据点 -->
              <circle v-for="(point, idx) in currentMetricConfig.points" :key="idx"
                :cx="point.cx" :cy="point.cy" r="1.5" fill="white" :stroke="currentMetricConfig.chartColor" stroke-width="1" 
                class="transition-all duration-500 ease-in-out delay-100"
              />
            </svg>
            
            <!-- 色带标注（绝对定位 HTML） -->
            <div class="absolute inset-x-0 top-0 h-10 pointer-events-none z-10" v-if="currentMetricConfig.bands && currentMetricConfig.bands.length > 0">
               <div v-for="(band, idx) in currentMetricConfig.bands" :key="'lbl-'+idx"
                 class="absolute h-full flex items-start justify-center pt-1 overflow-visible"
                 :style="{ left: band.x + '%', width: band.width + '%' }">
                 <span class="text-[8px] text-emerald-600 font-bold px-1 py-0.5 bg-emerald-50 rounded backdrop-blur-sm whitespace-nowrap overflow-hidden text-ellipsis shadow-sm border border-emerald-100/50 relative z-20 mx-0.5" style="max-width: 90%;">
                    {{ band.name }}
                 </span>
               </div>
            </div>
            
            <!-- X轴标签 -->
            <div class="flex justify-between text-[9px] text-slate-400 font-bold mt-2 px-1">
              <span v-for="label in xAxisLabels" :key="label">{{ label }}</span>
            </div>
         </div>
         
         <!-- Empty State -->
         <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <span class="text-2xl grayscale opacity-50">{{ currentMetricConfig.icon }}</span>
            </div>
            <p class="text-xs font-medium text-slate-400">暂无{{ currentMetricConfig.name }}数据</p>
         </div>
      </div>
      
      <div v-else class="h-48 flex items-center justify-center">
        <span class="text-slate-400 text-xs">加载中...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

const props = defineProps<{
  clientId: string
}>();

const periods = ref(['周视图', '月视图', '季视图', '年视图']);
const currentPeriod = ref('周视图');
const currentMetric = ref('weight');
const isLoading = ref(false);

const metrics = [
  { key: 'weight', name: '体重', icon: '⚖️', unit: 'KG', target: '60.0 KG', colorClass: 'bg-indigo-500 text-white', chartColor: '#6366f1' },
  { key: 'body_fat', name: '体脂率', icon: '🔥', unit: '%', target: '< 20%', colorClass: 'bg-rose-500 text-white', chartColor: '#f43f5e' },
  { key: 'glucose', name: '血糖', icon: '🍬', unit: 'mmol/L', target: '4.4-6.1', colorClass: 'bg-amber-500 text-white', chartColor: '#f59e0b' },
  { key: 'visceral_fat', name: '内脏脂肪', icon: '🛡️', unit: '级', target: '< 5', colorClass: 'bg-purple-500 text-white', chartColor: '#a855f7' }
];

const metricData = ref<Record<string, any>>({});

const periodLabel = computed(() => {
  return currentPeriod.value === '周视图' ? '本周' :
         currentPeriod.value === '月视图' ? '本月' :
         currentPeriod.value === '季视图' ? '本季' : '本年';
});

const currentMetricConfig = computed(() => {
  const metric = metrics.find(m => m.key === currentMetric.value) || metrics[0];
  const data = metricData.value[currentMetric.value] || { points: [], pathArea: '', pathLine: '', currentValue: 0, trend: 0, bands: [] };
  
  return {
    ...metric,
    ...data
  };
});

const xAxisLabels = computed(() => {
    // Generate simple labels based on period
    if (currentPeriod.value === '周视图') return ['周一', '周三', '周五', '周日'];
    if (currentPeriod.value === '月视图') return ['1日', '10日', '20日', '30日'];
    if (currentPeriod.value === '季视图') return ['第1月', '第2月', '第3月'];
    return ['Q1', 'Q2', 'Q3', 'Q4'];
});

const getDateRange = (period: string) => {
  const end = new Date();
  const start = new Date();
  if (period === '周视图') start.setDate(end.getDate() - 7);
  else if (period === '月视图') start.setMonth(end.getMonth() - 1);
  else if (period === '季视图') start.setMonth(end.getMonth() - 3);
  else if (period === '年视图') start.setFullYear(end.getFullYear() - 1);
  
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

const aggregateData = (logs: any[], period: string) => {
  if (period !== '年视图') return logs;
  
  // Group by month
  const groups: Record<string, number[]> = {};
  logs.forEach(log => {
    const date = new Date(log.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(Number(log.value));
  });
  
  // Calculate averages
  return Object.keys(groups).sort().map(key => {
    const values = groups[key];
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      date: `${key}-01`, 
      value: (sum / values.length).toFixed(1)
    };
  });
};

const generateChartPath = (data: any[], width = 100, height = 50) => {
  if (!data || data.length === 0) {
      return { pathArea: '', pathLine: '', points: [] };
  }
  
  if (data.length === 1) {
      const val = Number(data[0].value);
      return { 
          pathArea: `M0,25 L100,25 L100,50 L0,50 Z`, 
          pathLine: `M0,25 L100,25`, 
          points: [{cx: 50, cy: 25, value: val}] 
      };
  }

  const values = data.map(d => Number(d.value));
  let min = Math.min(...values);
  let max = Math.max(...values);
  
  if (min === max) {
      min = min * 0.9;
      max = max * 1.1;
  } else {
      const padding = (max - min) * 0.1;
      min -= padding;
      max += padding;
  }
  
  const range = max - min;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((Number(d.value) - min) / range) * height; 
    return { cx: x, cy: y, value: d.value };
  });
  
  let pathLine = `M${points[0].cx},${points[0].cy}`;
  for (let i = 1; i < points.length; i++) {
    pathLine += ` L${points[i].cx},${points[i].cy}`;
  }
  
  const pathArea = `${pathLine} L${width},${height} L0,${height} Z`;
  
  return { pathArea, pathLine, points };
};

const generateChartBands = (bands: any[], chartStartDate: string, chartEndDate: string) => {
  if (!bands || bands.length === 0) return [];
  const startTs = new Date(chartStartDate).getTime();
  const endTs = new Date(chartEndDate).getTime();
  const rangeTs = endTs - startTs;
  
  // 至少保护区间大小
  const safeRangeTs = rangeTs > 0 ? rangeTs : 86400000;
  
  return bands.map(band => {
     let bStartTs = new Date(band.startDate).getTime();
     let bEndTs = new Date(band.endDate).getTime();
     
     if (bStartTs < startTs) bStartTs = startTs;
     if (bEndTs > endTs) bEndTs = endTs;
     if (bStartTs > endTs || bEndTs < startTs) return null;
     
     let x = ((bStartTs - startTs) / safeRangeTs) * 100;
     let width = ((bEndTs - bStartTs) / safeRangeTs) * 100;
     
     // 一天的最小宽度容错
     if (width === 0) {
        width = (86400000 / safeRangeTs) * 100;
     }
     if (x + width > 100) width = 100 - x;
     
     return {
       ...band,
       x,
       width
     };
  }).filter(b => b && b.width > 0);
};

const fetchTrendData = async () => {
  if (!props.clientId) return;
  isLoading.value = true;
  
  const { startDate, endDate } = getDateRange(currentPeriod.value);
  
  try {
    const res = await uniCloud.callFunction({
      name: 'client-api',
      data: {
        action: 'getHealthLogRange',
        payload: { userId: props.clientId, type: currentMetric.value, startDate, endDate }
      }
    });
    
    if (res.result.code === 0) {
      let logs = res.result.data || [];
      const bandsData = res.result.protocolBands || [];
      const parsedBands = generateChartBands(bandsData, startDate, endDate);
      
      logs = aggregateData(logs, currentPeriod.value);
      const chartData = generateChartPath(logs);
      
      let currentVal = logs.length > 0 ? Number(logs[logs.length - 1].value) : 0;
      let prevVal = logs.length > 1 ? Number(logs[0].value) : currentVal;
      let trendVal = Number((currentVal - prevVal).toFixed(1));

      metricData.value[currentMetric.value] = {
        ...chartData,
        currentValue: currentVal,
        trend: trendVal,
        bands: parsedBands
      };
    }
  } catch (err) {
    console.error(err);
    // Silent fail or toast? 
    // uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    isLoading.value = false;
  }
};

watch([() => props.clientId, currentPeriod, currentMetric], () => {
  if (props.clientId) {
      fetchTrendData();
  }
}, { immediate: true });

</script>

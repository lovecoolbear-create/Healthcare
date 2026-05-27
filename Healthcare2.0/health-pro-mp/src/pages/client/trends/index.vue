<template>
  <view class="min-h-screen bg-slate-50 pb-32 relative">
    <!-- Header -->
    <view class="fixed top-0 left-0 right-0 z-[1000] bg-emerald-100/80 backdrop-blur-md px-6 pt-12 pb-3 border-b border-emerald-200/50">
      <view class="flex justify-between items-center h-10">
        <h1 class="text-lg font-black text-slate-800">健康趋势</h1>
        <view class="w-8 h-8 bg-emerald-200/50 rounded-lg flex items-center justify-center border border-emerald-300/30">
          <span class="text-sm">📈</span>
        </view>
      </view>
    </view>

    <!-- 主体内容 -->
    <view class="pt-28 px-6 space-y-6">
        
        <!-- 周期选择 -->
        <view class="bg-white rounded-2xl p-1.5 flex shadow-sm border border-slate-100 mb-4">
          <view 
            v-for="p in periods" 
            :key="p"
            @click="currentPeriod = p"
            class="flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer"
            :class="currentPeriod === p ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'"
          >
            {{ p }}
          </view>
        </view>

        <!-- 指标切换栏 -->
        <view class="flex gap-2 overflow-x-hidden pb-2">
          <view 
            v-for="metric in metrics" 
            :key="metric.key"
            @click="currentMetric = metric.key"
            class="flex-1 py-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 min-w-0"
            :class="currentMetric === metric.key ? metric.colorClass.replace('bg-', 'bg-').replace('text-', 'text-').replace('shadow-', 'shadow-') + ' shadow-md border-transparent' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'"
          >
            <span class="text-sm">{{ metric.icon }}</span>
            <span class="text-[10px] font-bold truncate w-full text-center px-1">{{ metric.name }}</span>
          </view>
        </view>

        <!-- 此处省略中间 200 行图表逻辑，保持不变 -->

      <!-- 核心趋势图表 (SVG Custom Chart) -->
      <view class="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-50 relative overflow-hidden transition-all duration-300">
        <view class="flex justify-between items-center mb-6">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-colors duration-300" :class="currentMetricConfig.colorClass">
              <span class="text-lg">{{ currentMetricConfig.icon }}</span>
            </view>
            <view>
              <h3 class="text-slate-900 font-black text-sm">{{ currentMetricConfig.name }}趋势</h3>
              <p class="text-xs text-slate-400 font-medium">目标: {{ currentMetricConfig.target }}</p>
            </view>
          </view>
          <view class="text-right">
            <view class="text-2xl font-black text-slate-900">{{ currentMetricConfig.currentValue }}<span class="text-xs text-slate-400 ml-1">{{ currentMetricConfig.unit }}</span></view>
            <view class="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block" :class="currentMetricConfig.trend > 0 ? 'text-rose-500 bg-rose-50' : 'text-emerald-500 bg-emerald-50'">
              {{ currentMetricConfig.trend > 0 ? '▲' : '▼' }} {{ Math.abs(currentMetricConfig.trend) }} {{ currentMetricConfig.unit }} ({{ periodLabel }})
            </view>
          </view>
        </view>

        <!-- 配方阶段图例 -->
        <view v-if="protocolPhases.length > 0" class="flex flex-wrap gap-2 mb-4">
          <view 
            v-for="(phase, idx) in protocolPhases" 
            :key="idx"
            class="flex items-center gap-1.5 text-xs"
          >
            <view class="w-3 h-3 rounded-full" :style="{ backgroundColor: phase.color }"></view>
            <span class="text-slate-600">{{ phase.name }}</span>
            <span class="text-slate-400">({{ formatShortDate(phase.start) }}~{{ phase.end ? formatShortDate(phase.end) : '至今' }})</span>
          </view>
        </view>

        <!-- 跨端统一高级折线图 (基于 Data URI 背景与绝对定位锚点) -->
        <view class="relative h-48 w-full" v-if="!isLoading">
          <view v-if="currentMetricConfig.points && currentMetricConfig.points.length > 0" class="w-full h-full relative">
            <view class="w-full h-full relative pl-8 pr-2 pt-4 pb-6">
               <!-- Y轴刻度与网格线 -->
               <view class="absolute inset-y-0 left-0 right-0 py-4 pointer-events-none flex flex-col justify-between" v-if="currentMetricConfig.yScales && currentMetricConfig.yScales.length > 0">
                 <view v-for="(scale, sIdx) in currentMetricConfig.yScales" :key="'scale-'+sIdx" class="relative flex items-center w-full">
                   <text class="absolute left-0 text-[10px] text-slate-400 -mt-2">{{ scale }}</text>
                   <view class="ml-8 w-full border-b border-slate-100 border-dashed"></view>
                 </view>
               </view>
               
               <!-- 折线图主体 -->
               <view class="w-full h-full ml-6 z-10 relative">
                 <!-- 动态 SVG 曲线背景 (自适应拉伸，线条不形变) -->
                 <view class="absolute inset-0 w-full h-full" :style="{ backgroundImage: metricSvgBackground, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }"></view>
                 
                 <!-- 数据点与悬浮数值 -->
                 <view 
                   v-for="(point, idx) in currentMetricConfig.points" 
                   :key="idx"
                   class="absolute flex flex-col items-center"
                   :style="{ left: point.cx + '%', top: (point.cy/50)*100 + '%', transform: 'translate(-50%, -50%)' }"
                 >
                   <!-- 悬浮数值提示 -->
                   <text class="absolute -top-5 text-[10px] font-bold whitespace-nowrap bg-white/80 px-1 rounded" :style="{ color: currentMetricConfig.chartColor }">{{ point.value }}</text>
                   
                   <!-- 锚点圆圈 -->
                   <view class="w-2.5 h-2.5 rounded-full border-[2px] bg-white shadow-sm" :style="{ borderColor: currentMetricConfig.chartColor }"></view>
                 </view>
               </view>
               
               <!-- X轴标签 -->
               <view class="absolute bottom-0 left-8 right-2 flex justify-between text-[9px] text-slate-400 font-bold mt-2 z-10">
                 <text v-for="label in xAxisLabels" :key="label">{{ label }}</text>
               </view>
            </view>
          </view>

          <!-- 无数据空状态 (Empty State) -->
          <view v-else class="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <view class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <text class="text-3xl grayscale opacity-50">{{ currentMetricConfig.icon }}</text>
            </view>
            <p class="text-xs font-medium text-slate-400">暂无{{ currentMetricConfig.name }}数据</p>
            <p class="text-[10px] text-slate-300 mt-1">坚持记录，见证改变</p>
          </view>
        </view>
        
        <view v-else class="h-48 flex items-center justify-center">
            <span class="text-slate-400 text-xs">加载中...</span>
        </view>
      </view>

      <!-- 水分摄入趋势 -->
      <view class="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-50 relative overflow-hidden transition-all duration-300">
        <view class="flex justify-between items-center mb-6">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md bg-cyan-500 shadow-cyan-500/30">
              <span class="text-lg">💧</span>
            </view>
            <view>
              <h3 class="text-slate-900 font-black text-sm">饮水记录</h3>
              <p class="text-xs text-slate-400 font-medium">目标: {{ targetWaterGlasses }}杯/天</p>
            </view>
          </view>
          <view class="text-right">
            <view class="text-2xl font-black text-slate-900">{{ waterChartConfig.currentValue }}<span class="text-xs text-slate-400 ml-1">杯</span></view>
            <view class="text-[10px] font-bold px-1.5 py-0.5 rounded inline-block text-cyan-500 bg-cyan-50">
              平均 {{ waterChartConfig.avgValue }} 杯/天
            </view>
          </view>
        </view>

        <view class="relative h-48 w-full" v-if="!isWaterLoading">
          <view v-if="waterChartConfig.points.length > 0" class="w-full h-full relative">
            <view class="w-full h-full relative pl-8 pr-2 pt-4 pb-6">
               <!-- Y轴刻度与网格线 -->
               <view class="absolute inset-y-0 left-0 right-0 py-4 pointer-events-none flex flex-col justify-between" v-if="waterChartConfig.yScales && waterChartConfig.yScales.length > 0">
                 <view v-for="(scale, sIdx) in waterChartConfig.yScales" :key="'w-scale-'+sIdx" class="relative flex items-center w-full">
                   <text class="absolute left-0 text-[10px] text-slate-400 -mt-2">{{ scale }}</text>
                   <view class="ml-8 w-full border-b border-slate-100 border-dashed"></view>
                 </view>
               </view>
               
               <!-- 折线图主体 -->
               <view class="w-full h-full ml-6 z-10 relative">
                 <!-- 动态 SVG 曲线背景 -->
                 <view class="absolute inset-0 w-full h-full" :style="{ backgroundImage: waterSvgBackground, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }"></view>
                 
                 <!-- 数据点与悬浮数值 -->
                 <view 
                   v-for="(point, idx) in waterChartConfig.points" 
                   :key="idx"
                   class="absolute flex flex-col items-center"
                   :style="{ left: point.cx + '%', top: (point.cy/50)*100 + '%', transform: 'translate(-50%, -50%)' }"
                 >
                   <!-- 悬浮数值提示 -->
                   <text class="absolute -top-5 text-[10px] font-bold whitespace-nowrap bg-white/80 px-1 rounded text-cyan-500">{{ point.value }}</text>
                   
                   <!-- 锚点圆圈 -->
                   <view class="w-2.5 h-2.5 rounded-full border-[2px] bg-white shadow-sm border-cyan-500"></view>
                 </view>
               </view>
               
               <!-- X轴标签 -->
               <view class="absolute bottom-0 left-8 right-2 flex justify-between text-[9px] text-slate-400 font-bold mt-2 z-10">
                 <text v-for="label in xAxisLabels" :key="label">{{ label }}</text>
               </view>
            </view>
          </view>

          <!-- 无数据空状态 -->
          <view v-else class="w-full h-full flex flex-col items-center justify-center text-slate-300">
             <view class="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mb-3">
               <text class="text-3xl opacity-50">💧</text>
             </view>
             <p class="text-xs font-medium text-slate-400">暂无饮水记录</p>
             <p class="text-[10px] text-slate-300 mt-1">每天{{ targetWaterGlasses }}杯水，健康常相伴</p>
          </view>
        </view>
        
        <view v-else class="h-48 flex items-center justify-center">
            <span class="text-slate-400 text-xs">加载中...</span>
        </view>
      </view>
    </view>
    <!-- 主内容区结束，保留根节点开启状态 -->

  <!-- 配方详情弹窗 -->
  <view v-if="showProtocolDetailPopup && selectedProtocolForDetail" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" @click.self="closeProtocolDetail">
    <view class="bg-white w-[85%] max-w-[340px] rounded-[28px] p-5 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
      <!-- 顶部色条 -->
      <view class="absolute top-0 left-0 right-0 h-2" :style="{ backgroundColor: selectedProtocolForDetail.color }"></view>
      
      <!-- 关闭按钮 -->
      <button @click="closeProtocolDetail" class="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600">
        <span>✕</span>
      </button>

      <!-- 配方名称 -->
      <view class="text-center mt-2 mb-4">
        <view class="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-xl text-white" :style="{ backgroundColor: selectedProtocolForDetail.color }">
          📋
        </view>
        <h3 class="text-lg font-black text-slate-900">{{ selectedProtocolForDetail.name }}</h3>
        <p class="text-xs text-slate-500 mt-1">
          {{ formatDate(selectedProtocolForDetail.start) }} ~ {{ selectedProtocolForDetail.end ? formatDate(selectedProtocolForDetail.end) : '至今' }}
        </p>
      </view>

      <!-- 配方效果概览（模拟数据，后续可从云函数获取） -->
      <view class="bg-slate-50 rounded-xl p-3 mb-3">
        <view class="grid grid-cols-3 gap-2 text-center">
          <view>
            <view class="text-lg font-bold text-emerald-600">85%</view>
            <view class="text-[10px] text-slate-500">依从性</view>
          </view>
          <view>
            <view class="text-lg font-bold text-blue-600">+12</view>
            <view class="text-[10px] text-slate-500">健康分提升</view>
          </view>
          <view>
            <view class="text-lg font-bold text-amber-600">😃</view>
            <view class="text-[10px] text-slate-500">体感改善</view>
          </view>
        </view>
      </view>

        <!-- 提示 -->
        <view class="text-xs text-slate-400 text-center">
          点击趋势图上的不同配方区域可查看各阶段效果对比
        </view>
      </view>
    </view>

    <!-- 自定义底部导航栏 -->
    <ClientTabBar :current="1" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import ClientTabBar from '@/components/ClientTabBar.vue'
import { onShow } from '@dcloudio/uni-app';

const periods = ref(['周视图', '月视图', '季视图', '年视图']);
const currentPeriod = ref('周视图');
const currentMetric = ref('weight');
// 动态获取，防止账号切换后取到旧数据
const getUserId = () => uni.getStorageSync('userId');
const isLoading = ref(false);
const isWaterLoading = ref(false);
const waterData = ref<{
  points: { cx: number; cy: number; value: number }[];
  pathArea: string;
  pathLine: string;
  yScales?: (string | number)[];
  currentValue: number;
  avgValue: string | number;
}>({ 
  points: [], 
  pathArea: '', 
  pathLine: '', 
  yScales: [],
  currentValue: 0, 
  avgValue: 0 
});

// 指标定义
const targetWaterGlasses = ref(8);

const metrics = ref([
  { key: 'weight', name: '体重', icon: '⚖️', unit: 'KG', target: '60.0 KG', colorClass: 'bg-indigo-500 text-white', lightColorClass: 'bg-indigo-50 text-indigo-500', chartColor: '#6366f1' },
  { key: 'body_fat', name: '体脂率', icon: '🔥', unit: '%', target: '< 20%', colorClass: 'bg-rose-500 text-white', lightColorClass: 'bg-rose-50 text-rose-500', chartColor: '#f43f5e' },
  { key: 'glucose', name: '血糖', icon: '🍬', unit: 'mmol/L', target: '4.4-6.1', colorClass: 'bg-amber-500 text-white', lightColorClass: 'bg-amber-50 text-amber-500', chartColor: '#f59e0b' },
  { key: 'visceral_fat', name: '内脏脂肪', icon: '🛡️', unit: '级', target: '< 5', colorClass: 'bg-purple-500 text-white', lightColorClass: 'bg-purple-50 text-purple-500', chartColor: '#a855f7' }
]);

// 存储每个指标的图表数据和当前值
const metricData = ref<Record<string, any>>({});

// 安全的本地日期格式化（避免 toISOString 的 8 小时 UTC 时差坑）
const getLocalFormattedDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (period: string) => {
  const end = new Date();
  const start = new Date();
  if (period === '周视图') start.setDate(end.getDate() - 7);
  else if (period === '月视图') start.setMonth(end.getMonth() - 1);
  else if (period === '季视图') start.setMonth(end.getMonth() - 3);
  else if (period === '年视图') start.setFullYear(end.getFullYear() - 1);
  
  return {
    startDate: getLocalFormattedDate(start),
    endDate: getLocalFormattedDate(end)
  };
};

const generateChartPath = (data: any[], startDateStr: string, endDateStr: string, width = 100, height = 50) => {
  if (!data || data.length === 0) {
      return { pathArea: `M0,${height} L${width},${height} Z`, pathLine: `M0,${height} L${width},${height}`, points: [], yScales: [] };
  }

  const startTs = new Date(startDateStr).getTime();
  const endTs = new Date(endDateStr).getTime();
  const timeRange = endTs - startTs;

  // Single point case
  if (data.length === 1) {
      const val = Number(data[0].value);
      return { 
          pathArea: `M0,25 L100,25 L100,50 L0,50 Z`, 
          pathLine: `M0,25 L100,25`, 
          points: [{cx: 50, cy: 25, value: val}],
          yScales: [val]
      };
  }

  const values = data.map(d => Number(d.value));
  let min = Math.min(...values);
  let max = Math.max(...values);
  
  // Avoid division by zero if all values are same
  if (min === max) {
      min = min * 0.9;
      max = max * 1.1;
  } else {
      // Add padding
      const padding = (max - min) * 0.15; // 增加间距
      min -= padding;
      max += padding;
  }
  
  const range = max - min;
  
  const points = data.map((d, i) => {
    let x = 0;
    if (timeRange > 0 && d.date) {
      const dTs = new Date(d.date).getTime();
      x = ((dTs - startTs) / timeRange) * width;
      // Clamp just in case data falls outside range
      x = Math.max(0, Math.min(width, x));
    } else {
      // Fallback
      x = data.length > 1 ? (i / (data.length - 1)) * width : 50;
    }
    const y = height - ((Number(d.value) - min) / range) * height; 
    return { cx: x, cy: y, value: d.value };
  });
  
  // Sort points by x just in case to ensure paths don't cross
  points.sort((a, b) => a.cx - b.cx);
  
  let pathLine = `M${points[0].cx},${points[0].cy}`;
  for (let i = 1; i < points.length; i++) {
    pathLine += ` L${points[i].cx},${points[i].cy}`;
  }
  
  const pathArea = `${pathLine} L${width},${height} L0,${height} Z`;
  
  const yScales = [
    max.toFixed(1),
    (min + range / 2).toFixed(1),
    min.toFixed(1)
  ];
  
  return { pathArea, pathLine, points, yScales };
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
      date: `${key}-01`, // Use 1st of month as representative date
      value: (sum / values.length).toFixed(1)
    };
  });
};

const fetchTrendData = async () => {
  const currentUserId = getUserId();
  const token = uni.getStorageSync('token');
  if (!currentUserId || !token) return;
  isLoading.value = true;
  
  const { startDate, endDate } = getDateRange(currentPeriod.value);
  
  try {
    const res = await uniCloud.callFunction({
      name: 'client-api',
      data: {
        action: 'getHealthLogRange',
        payload: { userId: currentUserId, token, type: currentMetric.value, startDate, endDate }
      }
    });
    
    if (res.result.code === 0) {
      let logs = res.result.data || [];
      
      // Aggregate for Yearly view
      logs = aggregateData(logs, currentPeriod.value);
      
      const chartData = generateChartPath(logs, startDate, endDate);
      
      let currentVal = logs.length > 0 ? Number(logs[logs.length - 1].value) : 0;
      let prevVal = logs.length > 1 ? Number(logs[0].value) : currentVal;
      let trendVal = Number((currentVal - prevVal).toFixed(1));

      metricData.value[currentMetric.value] = {
        ...chartData,
        currentValue: currentVal,
        trend: trendVal
      };
    } else {
      console.error('getHealthLogRange error:', res.result);
    }
  } catch (err) {
    console.error(err);
    uni.showToast({ title: '数据加载失败', icon: 'none' });
  } finally {
    isLoading.value = false;
  }
};

const fetchWaterData = async () => {
  const currentUserId = getUserId();
  const token = uni.getStorageSync('token');
  if (!currentUserId || !token) return;
  isWaterLoading.value = true;
  
  const { startDate, endDate } = getDateRange(currentPeriod.value);
  
  try {
    const res = await uniCloud.callFunction({
      name: 'client-api',
      data: {
        action: 'getWaterLogRange',
        payload: { userId: currentUserId, token, startDate, endDate }
      }
    });
    
    if (res.result.code === 0) {
      let logs = res.result.data || [];
      
      // Calculate avg before aggregation (more accurate on daily data)
      const total = logs.reduce((acc: number, cur: any) => acc + (Number(cur.value) || 0), 0);
      const avg = logs.length > 0 ? (total / logs.length).toFixed(1) : '0.0';
      
      // Aggregate for chart
      logs = aggregateData(logs, currentPeriod.value);
      
      const chartData = generateChartPath(logs, startDate, endDate, 100, 50);
      const current = logs.length > 0 ? Number(logs[logs.length - 1].value) : 0;
      
      waterData.value = {
        ...chartData,
        currentValue: current,
        avgValue: avg
      };
    } else {
      console.error('getWaterLogRange error:', res.result);
    }
  } catch (err) {
    console.error('Water data fetch failed', err);
  } finally {
    isWaterLoading.value = false;
  }
};

const waterChartConfig = computed(() => {
    return {
        pathArea: waterData.value.pathArea || "M0,50 L100,50 Z",
        pathLine: waterData.value.pathLine || "M0,50 L100,50",
        points: waterData.value.points || [],
        yScales: waterData.value.yScales || [],
        currentValue: waterData.value.currentValue || 0,
        avgValue: waterData.value.avgValue || 0
    };
});

// 生成 SVG 数据 URI (健康指标图表)
const metricSvgBackground = computed(() => {
  const config = currentMetricConfig.value;
  if (!config.pathArea) return '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" preserveAspectRatio="none">
    <defs>
      <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${config.chartColor}" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="${config.chartColor}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${config.pathArea}" fill="url(#g)" />
    <path d="${config.pathLine}" fill="none" stroke="${config.chartColor}" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
});

// 生成 SVG 数据 URI (饮水图表)
const waterSvgBackground = computed(() => {
  const config = waterChartConfig.value;
  if (!config.pathArea) return '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" preserveAspectRatio="none">
    <defs>
      <linearGradient id="gw" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.2"/>
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${config.pathArea}" fill="url(#gw)" />
    <path d="${config.pathLine}" fill="none" stroke="#06b6d4" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
});

// 配方阶段数据
const protocolPhases = ref<Array<{
  name: string;
  start: string;
  end: string | null;
  color: string;
}>>([]);

// 选中的配方详情
const selectedProtocolForDetail = ref<any>(null);
const showProtocolDetailPopup = ref(false);

// 显示配方详情
const showProtocolDetail = (idx: number) => {
  const phase = protocolPhases.value[idx];
  if (!phase) return;
  
  selectedProtocolForDetail.value = {
    ...phase,
    index: idx
  };
  showProtocolDetailPopup.value = true;
};

// 关闭配方详情
const closeProtocolDetail = () => {
  showProtocolDetailPopup.value = false;
  selectedProtocolForDetail.value = null;
};

// 配方阶段颜色配置
const phaseColors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

// 获取日期范围内的配方阶段
const fetchProtocolPhases = async () => {
  const currentUserId = getUserId();
  const token = uni.getStorageSync('token');
  if (!currentUserId || !token) return;
  
  const { startDate, endDate } = getDateRange(currentPeriod.value);
  
  try {
    const { result } = await uniCloud.callFunction({
      name: 'protocol-effectiveness',
      data: {
        action: 'getProtocolPhasesInRange',
        payload: { userId: currentUserId, token, startDate, endDate }
      }
    });
    
    if (result.code === 0 && result.data) {
      // 为每个阶段分配颜色
      protocolPhases.value = result.data.map((phase: any, idx: number) => ({
        name: phase.name,
        start: phase.start_date,
        end: phase.end_date || new Date().toISOString().split('T')[0],
        color: phaseColors[idx % phaseColors.length]
      }));
    }
  } catch (err) {
    console.error('获取配方阶段失败:', err);
  }
};

// 格式化短日期
const formatShortDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// 格式化完整日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

// 计算配方阶段在图表中的矩形区域
const protocolPhaseRects = computed(() => {
  const { startDate, endDate } = getDateRange(currentPeriod.value);
  const rangeStart = new Date(startDate).getTime();
  const rangeEnd = new Date(endDate).getTime();
  const totalRange = rangeEnd - rangeStart;
  
  return protocolPhases.value.map((phase, idx) => {
    const phaseStart = Math.max(new Date(phase.start).getTime(), rangeStart);
    const phaseEnd = phase.end 
      ? Math.min(new Date(phase.end).getTime(), rangeEnd)
      : rangeEnd;
    
    const x = ((phaseStart - rangeStart) / totalRange) * 100;
    const width = ((phaseEnd - phaseStart) / totalRange) * 100;
    
    return {
      x: Math.max(0, x),
      width: Math.max(0, width),
      color: phase.color
    };
  });
});

// 计算配方阶段边界线
const protocolPhaseLines = computed(() => {
  const { startDate, endDate } = getDateRange(currentPeriod.value);
  const rangeStart = new Date(startDate).getTime();
  const rangeEnd = new Date(endDate).getTime();
  const totalRange = rangeEnd - rangeStart;
  const lines: Array<{ x: number; color: string }> = [];
  
  protocolPhases.value.forEach((phase, idx) => {
    const phaseStart = new Date(phase.start).getTime();
    const phaseEnd = phase.end ? new Date(phase.end).getTime() : null;
    
    // 开始线
    if (phaseStart >= rangeStart && phaseStart <= rangeEnd) {
      lines.push({
        x: ((phaseStart - rangeStart) / totalRange) * 100,
        color: phase.color
      });
    }
    
    // 结束线
    if (phaseEnd && phaseEnd >= rangeStart && phaseEnd <= rangeEnd) {
      lines.push({
        x: ((phaseEnd - rangeStart) / totalRange) * 100,
        color: phase.color
      });
    }
  });
  
  return lines;
});

// 计算配方阶段标签位置
const protocolPhaseLabels = computed(() => {
  return protocolPhaseRects.value.map((rect, idx) => ({
    x: rect.x + rect.width / 2,
    name: protocolPhases.value[idx]?.name?.slice(0, 4) || '',
    color: protocolPhases.value[idx]?.color || '#666'
  }));
});

watch([currentPeriod], () => {
  fetchUserTargets();
  fetchTrendData();
  fetchWaterData();
  fetchProtocolPhases();
});

watch([currentMetric], () => {
  fetchTrendData();
});

const fetchUserTargets = async () => {
  const token = uni.getStorageSync('token');
  if (!token) return;
  try {
    const res = await uniCloud.callFunction({
      name: 'client-api',
      data: { action: 'getUserInfo', token }
    });
    if (res.result.code === 0 && res.result.data) {
      const targets = res.result.data.health_targets;
      if (targets) {
        metrics.value.forEach(m => {
          if (m.key === 'weight' && targets.weight) m.target = targets.weight;
          if (m.key === 'body_fat' && targets.body_fat) m.target = targets.body_fat;
          if (m.key === 'glucose' && targets.glucose) m.target = targets.glucose;
          if (m.key === 'visceral_fat' && targets.visceral_fat) m.target = targets.visceral_fat;
        });
        if (targets.water_glasses) {
          targetWaterGlasses.value = targets.water_glasses;
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch user targets', err);
  }
};

onShow(() => {
  fetchTrendData();
  fetchWaterData();
  fetchProtocolPhases();
});

const currentMetricConfig = computed(() => {
  const meta = metrics.value.find(m => m.key === currentMetric.value) || metrics.value[0];
  const storedData = metricData.value[currentMetric.value] || {};
  
  // Default values for chart to prevent broken UI during loading or if data is missing
  const defaultChart = {
      pathArea: "M0,50 L100,50 Z", 
      pathLine: "M0,50 L100,50", 
      points: [],
      yScales: [],
      currentValue: '-',
      trend: 0
  };

  // Merge stored data with defaults. 
  // Note: storedData might have currentValue but missing paths if fetched via fetchAllMetricsOverview
  const data = { ...defaultChart, ...storedData };
  
  return { ...meta, ...data };
});

const periodLabel = computed(() => {
    if (currentPeriod.value === '周视图') return '本周';
    if (currentPeriod.value === '月视图') return '本月';
    if (currentPeriod.value === '季视图') return '本季';
    return '本年';
  });

const xAxisLabels = computed(() => {
  const period = currentPeriod.value;
  const now = new Date();
  const format = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
  
  if (period === '周视图') {
    // Past 7 days. Label 1st, 3rd, 5th, 7th day
    const labels = [];
    for (let i = 6; i >= 0; i -= 2) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      labels.push(format(d));
    }
    return labels; // e.g., "3.1", "3.3", "3.5", "3.7"
  }
  
  if (period === '月视图') {
    // Past 30 days. 4 labels evenly spaced
    const labels = [];
    for (let i = 24; i >= 0; i -= 8) {
       const d = new Date();
       d.setDate(now.getDate() - i);
       labels.push(format(d));
    }
    return labels;
  }
  
  if (period === '季视图') {
    // Past 3 months. Show 3 month names
    const labels = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      labels.push(`${d.getMonth() + 1}月`);
    }
    return labels;
  }
  
  // Year view
  const labels = [];
  for (let i = 9; i >= 0; i -= 3) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      labels.push(`${d.getFullYear()}.${d.getMonth() + 1}`);
  }
  return labels;
});
</script>

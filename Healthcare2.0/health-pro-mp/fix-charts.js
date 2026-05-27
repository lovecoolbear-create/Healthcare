const fs = require('fs');
const file = '/Users/blair/HealthCare/Healthcare2.0/health-pro-mp/src/pages/client/trends/index.vue';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix Health Metrics Chart
const topChartStartMarker = '<!-- 简单的 SVG 曲线图 -->';
const topChartEndMarker = '<!-- 无数据空状态 (Empty State) -->';

const topChartStartIndex = content.indexOf(topChartStartMarker);
const topChartEndIndex = content.indexOf(topChartEndMarker);

if (topChartStartIndex !== -1 && topChartEndIndex !== -1) {
  const replacementTop = `<!-- 跨端统一高级折线图 (基于 Data URI 背景与绝对定位锚点) -->
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

          `;
  content = content.substring(0, topChartStartIndex) + replacementTop + content.substring(topChartEndIndex);
}

// 2. Fix Water Chart
const waterChartStartMarker = '<view class="relative h-48 w-full" v-if="!isWaterLoading">';
const waterChartEndMarker = '<!-- 无数据空状态 -->';

const waterChartStartIndex = content.indexOf(waterChartStartMarker);
const waterChartEndIndex = content.indexOf(waterChartEndMarker);

if (waterChartStartIndex !== -1 && waterChartEndIndex !== -1) {
  const replacementWater = `<view class="relative h-48 w-full" v-if="!isWaterLoading">
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

          `;
  content = content.substring(0, waterChartStartIndex) + replacementWater + content.substring(waterChartEndIndex);
}

fs.writeFileSync(file, content, 'utf8');
console.log('Charts fixed.');

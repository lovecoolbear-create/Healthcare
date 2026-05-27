<template>
  <view class="mp-page-shell min-h-screen bg-slate-50 pb-24">
    <!-- Header -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md px-6 pt-12 pb-3 border-b border-slate-100">
      <view class="flex items-center h-10 gap-3">
        <view @click="goBack" class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center active:bg-slate-100 transition-colors mp-pressable">
          <text class="text-slate-500 text-lg">←</text>
        </view>
        <text class="text-lg font-black text-slate-800">周度健康总结</text>
      </view>
    </view>

    <!-- 占位高度 -->
    <view class="h-28"></view>

    <view class="px-6 space-y-6">
      <!-- 本周概览 -->
      <view class="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-50 relative overflow-hidden">
        <view class="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-5 -translate-y-1/2 translate-x-1/2"></view>
        
        <view class="flex justify-between items-center mb-6">
          <text class="text-xs font-bold text-slate-400 uppercase tracking-widest">本周健康趋势</text>
          <text v-if="hasData" class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">近7天数据</text>
          <text v-else class="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">顾问安排方案后开启</text>
        </view>

        <view v-if="loading" class="py-12 flex flex-col items-center justify-center">
          <view class="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3"></view>
          <text class="text-xs text-slate-400 font-bold">正在分析健康轨迹...</text>
        </view>

        <view v-else-if="hasData" class="space-y-6">
          <!-- 本周健康指标概览 -->
          <view class="grid grid-cols-2 gap-3">
            <view v-for="metric in weeklyMetrics" :key="metric.key" class="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <view class="flex items-center gap-2 mb-2">
                <text class="text-lg">{{ metric.icon }}</text>
                <text class="text-xs font-bold text-slate-600">{{ metric.name }}</text>
              </view>
              <view class="flex items-baseline gap-1">
                <text class="text-xl font-black text-slate-900">{{ metric.current }}</text>
                <text class="text-[10px] text-slate-400">{{ metric.unit }}</text>
              </view>
              <view class="flex items-center gap-1 mt-1">
                <text class="text-[10px]" :class="metric.change >= 0 ? 'text-emerald-500' : 'text-rose-500'">
                  {{ metric.change >= 0 ? '↑' : '↓' }} {{ Math.abs(metric.change) }}{{ metric.unit }}
                </text>
                <text class="text-[10px] text-slate-400">vs上周</text>
              </view>
            </view>
          </view>

          <!-- 体重趋势图 -->
          <view v-if="weightData.length > 0" class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <text class="text-lg">⚖️</text>
                <text class="text-xs font-bold text-slate-700">本周体重变化</text>
              </view>
              <text class="text-[10px] text-slate-400">7天趋势</text>
            </view>
            <!-- 简单的趋势曲线 -->
            <view class="h-32 relative">
              <svg viewBox="0 0 100 50" class="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.2"/>
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path :d="weightPath" fill="url(#weightGradient)" stroke="#10b981" stroke-width="2" fill-opacity="1"/>
                <path :d="weightLinePath" fill="none" stroke="#10b981" stroke-width="2"/>
              </svg>
              <!-- 数据点 -->
              <view class="absolute inset-0 flex items-end justify-between px-2 pb-6">
                <view v-for="(point, idx) in weightData" :key="idx" class="flex flex-col items-center">
                  <text class="text-[8px] text-slate-500 mb-1">{{ point.day }}</text>
                  <view class="w-2 h-2 rounded-full bg-emerald-500"></view>
                </view>
              </view>
            </view>
          </view>

          <!-- 饮水记录 -->
          <view v-if="waterData.length > 0" class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <text class="text-lg">💧</text>
                <text class="text-xs font-bold text-slate-700">本周饮水记录</text>
              </view>
              <text class="text-[10px] text-emerald-600 font-bold">日均 {{ avgWater }}ml</text>
            </view>
            <view class="flex items-end justify-between h-24 gap-1">
              <view v-for="(day, idx) in waterData" :key="idx" class="flex-1 flex flex-col items-center gap-1">
                <view 
                  class="w-full bg-emerald-400 rounded-t-lg transition-all duration-500"
                  :style="{ height: (day.value / 2500 * 100) + '%', opacity: day.value > 0 ? 1 : 0.3 }"
                ></view>
                <text class="text-[8px] text-slate-400">{{ day.day }}</text>
              </view>
            </view>
          </view>

          <!-- 打卡完成情况 -->
          <view class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <text class="text-lg">✅</text>
                <text class="text-xs font-bold text-slate-700">本周打卡完成</text>
              </view>
              <text class="text-[10px] text-emerald-600 font-bold">{{ checkinRate }}%</text>
            </view>
            <view class="flex gap-1">
              <view 
                v-for="(day, idx) in checkinData" 
                :key="idx"
                class="flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                :class="day.completed ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'"
              >
                {{ day.day }}
              </view>
            </view>
          </view>
        </view>

        <view v-else class="py-12 flex flex-col items-center justify-center text-slate-300 text-center px-4">
          <view class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
            <text class="text-3xl grayscale opacity-30">📊</text>
          </view>
          <text class="text-2xl font-black text-slate-300 mb-2">--</text>
          <text class="text-sm font-bold text-slate-400">健康评分即将开启</text>
          <text class="text-[11px] text-slate-400 mt-2 block">您的专属顾问将为您制定个性化健康方案</text>
          <text class="text-[11px] text-slate-400 mt-1 block">方案启动后连续打卡即可生成分数</text>
        </view>
      </view>

      <!-- 顾问小结 (自动生成，预留AI接口) -->
      <view v-if="hasData && advisorSummary.text" class="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-50 relative overflow-hidden">
        <view class="flex items-center justify-between mb-4">
          <text class="text-xs font-bold text-slate-400 uppercase tracking-widest">顾问小结</text>
          <text v-if="advisorSummary.isAI" class="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">AI生成</text>
          <text v-else class="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">智能分析</text>
        </view>
        <view class="flex gap-4">
          <view class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold shrink-0">
            💬
          </view>
          <view class="space-y-3 flex-1">
            <text class="text-xs text-slate-600 leading-relaxed font-medium block">
              {{ advisorSummary.text }}
            </text>
            <view v-if="advisorSummary.tags.length > 0" class="flex flex-wrap gap-2">
              <text 
                v-for="(tag, idx) in advisorSummary.tags" 
                :key="idx"
                class="px-2 py-1 text-[9px] font-bold rounded-lg border"
                :class="tag.type === 'positive' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        tag.type === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        'bg-blue-50 text-blue-600 border-blue-100'"
              >
                {{ tag.text }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { callCloud } from '@/utils/cloud';

const loading = ref(true);
const hasData = ref(false);

// 健康指标数据
const weeklyMetrics = ref<any[]>([]);
const weightData = ref<any[]>([]);
const waterData = ref<any[]>([]);
const checkinData = ref<any[]>([]);
const checkinRate = ref(0);
const avgWater = ref(0);
const weightChange = ref(0);

// 顾问小结（自动生成，预留AI接口）
const advisorSummary = ref<{
  text: string;
  tags: { text: string; type: 'positive' | 'warning' | 'info' }[];
  isAI: boolean;
}>({ text: '', tags: [], isAI: false });

/**
 * 自动生成顾问小结
 * TODO: 后续接入AI分析，将数据发送到AI服务生成更自然的文案
 */
function generateAdvisorSummary(
  checkinRate: number,
  avgWater: number,
  weightChange: number,
  hasWeightData: boolean
) {
  const parts: string[] = [];
  const tags: { text: string; type: 'positive' | 'warning' | 'info' }[] = [];
  
  // 1. 依从性分析
  if (checkinRate >= 90) {
    parts.push('本周依从性表现优秀，打卡习惯非常好');
    tags.push({ text: '依从性优异', type: 'positive' });
  } else if (checkinRate >= 70) {
    parts.push('本周依从性良好，大部分任务都完成了');
    tags.push({ text: '依从性良好', type: 'positive' });
  } else if (checkinRate >= 50) {
    parts.push('本周打卡完成度一般，建议设置提醒');
    tags.push({ text: '建议加强打卡', type: 'warning' });
  } else {
    parts.push('本周打卡较少，建议重新规划时间');
    tags.push({ text: '急需改善', type: 'warning' });
  }
  
  // 2. 饮水分析
  if (avgWater >= 2000) {
    parts.push('饮水量充足，有助于代谢和身体机能');
    tags.push({ text: '饮水达标', type: 'positive' });
  } else if (avgWater >= 1500) {
    parts.push('饮水量尚可，建议再增加500ml');
    tags.push({ text: '建议多饮水', type: 'info' });
  } else if (avgWater > 0) {
    parts.push('饮水量偏低，建议养成定时饮水习惯');
    tags.push({ text: '饮水不足', type: 'warning' });
  }
  
  // 3. 体重分析（仅当有数据时）
  if (hasWeightData) {
    if (weightChange < -0.5) {
      parts.push(`体重下降${Math.abs(weightChange).toFixed(1)}kg，注意营养均衡`);
      tags.push({ text: '体重下降', type: 'warning' });
    } else if (weightChange > 0.5) {
      parts.push(`体重上升${weightChange.toFixed(1)}kg，建议适度运动`);
      tags.push({ text: '体重上升', type: 'info' });
    } else {
      parts.push('体重保持稳定，继续保持');
      tags.push({ text: '体重稳定', type: 'positive' });
    }
  }
  
  // 4. 综合建议
  if (checkinRate >= 80 && avgWater >= 1500) {
    parts.push('整体表现不错，继续保持良好的健康习惯！');
  } else if (checkinRate < 50 && avgWater < 1000) {
    parts.push('建议从简单的目标开始，逐步建立健康习惯。');
  }
  
  return {
    text: parts.join('，'),
    tags,
    isAI: false // 标记为自动生成，非AI
  };
}

/**
 * TODO: AI分析接口（预留）
 * 后续接入AI服务，发送本周数据到AI生成更个性化的小结
 */
async function generateAISummary(data: any) {
  // 预留AI接口，后续实现
  // const aiRes = await callCloud('ai-service', {
  //   action: 'generateHealthSummary',
  //   payload: { ...data }
  // });
  // return aiRes.data;
  return null;
}

// SVG路径计算
const weightPath = computed(() => {
  if (weightData.value.length < 2) return '';
  const points = weightData.value.map((d, i) => {
    const x = (i / (weightData.value.length - 1)) * 100;
    const y = 50 - ((d.value - minWeight.value) / (maxWeight.value - minWeight.value)) * 40 - 5;
    return `${x},${y}`;
  });
  return `M0,50 L${points.join(' L')} L100,50 Z`;
});

const weightLinePath = computed(() => {
  if (weightData.value.length < 2) return '';
  const points = weightData.value.map((d, i) => {
    const x = (i / (weightData.value.length - 1)) * 100;
    const y = 50 - ((d.value - minWeight.value) / (maxWeight.value - minWeight.value)) * 40 - 5;
    return `${x},${y}`;
  });
  return `M${points.join(' L')}`;
});

const minWeight = computed(() => {
  if (weightData.value.length === 0) return 0;
  return Math.min(...weightData.value.map(d => d.value)) - 1;
});

const maxWeight = computed(() => {
  if (weightData.value.length === 0) return 0;
  return Math.max(...weightData.value.map(d => d.value)) + 1;
});

const goBack = () => {
  uni.navigateBack();
};

onShow(async () => {
  const userInfo = getUserInfo();
  if (!userInfo?._id) return;

  try {
    loading.value = true;
    
    // 获取健康数据
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 获取体重数据
    const weightRes = await callCloud<any>('client-api', {
      action: 'getHealthLogRange',
      payload: { 
        userId: userInfo._id,
        type: 'weight',
        startDate,
        endDate
      }
    });
    
    // 获取饮水数据
    const waterRes = await callCloud<any>('client-api', {
      action: 'getWaterLogRange',
      payload: { 
        userId: userInfo._id,
        startDate,
        endDate
      }
    });
    
    // 获取打卡数据
    const planRes = await callCloud<any>('client-api', {
      action: 'getOwnProtocol',
      payload: { userId: userInfo._id, date: endDate }
    });
    
    // 处理体重数据
    if (weightRes.ok && weightRes.data?.length > 0) {
      const weights = weightRes.data;
      const current = weights[weights.length - 1]?.value || 0;
      const lastWeek = weights[0]?.value || current;
      
      weightData.value = weights.map((w: any) => ({
        day: w.date.slice(5),
        value: w.value
      }));
      
      weeklyMetrics.value.push({
        key: 'weight',
        name: '当前体重',
        icon: '⚖️',
        current: current.toFixed(1),
        unit: 'kg',
        change: parseFloat((current - lastWeek).toFixed(1))
      });
    }
    
    // 处理饮水数据
    if (waterRes.ok && waterRes.data?.length > 0) {
      const waters = waterRes.data;
      const total = waters.reduce((sum: number, w: any) => sum + (w.value || 0), 0);
      avgWater.value = Math.round(total / 7);
      
      waterData.value = waters.map((w: any) => ({
        day: w.date.slice(5),
        value: w.value || 0
      }));
      
      weeklyMetrics.value.push({
        key: 'water',
        name: '日均饮水',
        icon: '�',
        current: avgWater.value,
        unit: 'ml',
        change: 0
      });
    }
    
    // 处理打卡数据
    if (planRes.ok && planRes.data?.plan) {
      const plan = planRes.data.plan;
      const tasks = plan.items || [];
      const completed = tasks.filter((t: any) => t.completed).length;
      const total = tasks.length;
      
      checkinRate.value = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      // 生成本周打卡数据（模拟7天）
      const days = ['一', '二', '三', '四', '五', '六', '日'];
      checkinData.value = days.map((d, i) => ({
        day: d,
        completed: i < 6 // 模拟前6天完成
      }));
      
      weeklyMetrics.value.push({
        key: 'checkin',
        name: '今日打卡',
        icon: '✅',
        current: `${completed}/${total}`,
        unit: '',
        change: 0
      });
    }
    
    hasData.value = weeklyMetrics.value.length > 0;
    
    // 生成顾问小结（自动生成，后续可接入AI）
    if (hasData.value) {
      // 计算体重变化
      const hasWeightData = weightData.value.length > 0;
      if (hasWeightData && weightData.value.length >= 2) {
        const firstWeight = weightData.value[0]?.value || 0;
        const lastWeight = weightData.value[weightData.value.length - 1]?.value || 0;
        weightChange.value = lastWeight - firstWeight;
      }
      
      // 生成自动小结
      advisorSummary.value = generateAdvisorSummary(
        checkinRate.value,
        avgWater.value,
        weightChange.value,
        hasWeightData
      );
      
      // TODO: 后续可切换为AI生成
      // const aiSummary = await generateAISummary({
      //   checkinRate: checkinRate.value,
      //   avgWater: avgWater.value,
      //   weightChange: weightChange.value,
      //   weightData: weightData.value,
      //   waterData: waterData.value
      // });
      // if (aiSummary) {
      //   advisorSummary.value = { ...aiSummary, isAI: true };
      // }
    }
    
  } catch (e) {
    console.error('Failed to fetch summary data:', e);
  } finally {
    loading.value = false;
  }
});
</script>

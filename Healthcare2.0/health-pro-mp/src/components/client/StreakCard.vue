/**
 * StreakCard - 7天连续打卡计划组件
 * 显示最近7天的打卡状态
 */
<template>
  <view class="bg-slate-900 rounded-[32px] p-5 shadow-xl shadow-slate-900/20 relative overflow-hidden">
    <!-- 头部 -->
    <view class="flex justify-between items-center mb-4 relative z-10">
      <view class="flex items-center gap-3">
        <view class="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
          <span class="text-lg">🏅</span>
        </view>
        <view>
          <h3 class="text-white font-black text-sm">7天连续打卡计划</h3>
        </view>
      </view>
      <view class="px-2.5 py-0.5 bg-slate-800 rounded-full border border-slate-700">
        <span 
          class="text-[9px] font-black"
          :class="streakDays >= 7 ? 'text-yellow-400' : 'text-emerald-400'"
        >
          {{ streakDays >= 7 ? '🔥 全勤' : `连续${streakDays}天` }}
        </span>
      </view>
    </view>

    <!-- 7天圆圈 -->
    <view class="flex justify-between items-center relative z-10">
      <view 
        v-for="(dayData, index) in weeklyData" 
        :key="index" 
        class="flex flex-col items-center gap-1"
      >
        <view
          class="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
          :class="getDayClass(dayData)"
        >
          <span v-if="dayData.completed">✓</span>
          <span v-else>{{ dayData.dayOfMonth }}</span>
        </view>
        
        <!-- 日期标签 -->
        <view class="flex flex-col items-center gap-0.5">
          <span v-if="dayData.isToday" class="text-[9px] font-black text-emerald-400">今天</span>
          <span 
            v-else 
            class="text-[9px] font-medium" 
            :class="dayData.completed ? 'text-emerald-400' : 'text-slate-500'"
          >
            周{{ dayData.weekDay }}
          </span>
          <span 
            v-if="!dayData.isToday" 
            class="text-[7px]" 
            :class="dayData.completed ? 'text-emerald-400/70' : 'text-slate-600'"
          >
            {{ dayData.completed ? `+${dayData.points}PT` : (dayData.isFuture ? '+2' : '+0') }}
          </span>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { WeeklyDayData } from '@/types';

defineProps<{
  points: number;
  streakDays: number;
  weeklyData: WeeklyDayData[];
}>();

const getDayClass = (dayData: WeeklyDayData): string => {
  if (dayData.isToday && dayData.completed) {
    return 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 animate-pulse';
  }
  if (dayData.isToday && !dayData.completed) {
    return 'bg-white text-emerald-600 border-2 border-emerald-500 ring-2 ring-emerald-200';
  }
  if (dayData.completed) {
    return 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30';
  }
  if (dayData.isFuture) {
    return 'bg-slate-800/50 text-slate-500 border border-slate-700';
  }
  return 'bg-slate-700/50 text-slate-400 border border-slate-600';
};
</script>

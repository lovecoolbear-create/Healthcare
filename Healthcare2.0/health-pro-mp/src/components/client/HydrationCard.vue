/**
 * HydrationCard - 饮水记录组件
 * 显示今日饮水量和目标
 */
<template>
  <view class="bg-white rounded-[28px] p-4 shadow-xl shadow-slate-200/40 border border-slate-50">
    <view class="flex items-center justify-between">
      <view class="flex items-center gap-3">
        <view class="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
          <span class="text-xl">⚡</span>
        </view>
        <view>
          <view class="flex items-baseline gap-2">
            <h3 class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">今日饮水:</h3>
            <span class="text-xl font-black text-slate-900">{{ currentAmount.toFixed(1) }}<span class="text-xs text-slate-400 ml-0.5">L</span></span>
          </view>
          <p class="text-[9px] text-slate-400 mt-0.5">目标 {{ targetGlasses }} 杯</p>
        </view>
      </view>

      <!-- 控制按钮 -->
      <view class="flex items-center gap-2">
        <button 
          @click="$emit('decrease')" 
          class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200 transition-colors"
        >
          <span class="text-lg leading-none">−</span>
        </button>
        <button 
          @click="$emit('increase')" 
          class="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white active:bg-sky-600 transition-colors shadow-md shadow-sky-500/30"
        >
          <span class="text-lg leading-none">+</span>
        </button>
      </view>
    </view>

    <!-- 进度条 -->
    <view class="mt-3 relative">
      <view class="h-2 bg-slate-100 rounded-full overflow-hidden">
        <view 
          class="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all duration-300"
          :style="{ width: `${Math.min((currentAmount / targetAmount) * 100, 100)}%` }"
        ></view>
      </view>
      <p class="text-[8px] text-right text-slate-400 mt-1">{{ (currentAmount / targetAmount * 100).toFixed(0) }}%</p>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { POINTS } from '@/config/constants';

const props = defineProps<{
  currentAmount: number;
}>();

defineEmits<{
  (e: 'increase'): void;
  (e: 'decrease'): void;
}>();

// 计算属性
const targetAmount = POINTS.WATER_TARGET;
const targetGlasses = Math.ceil(targetAmount / POINTS.WATER_GLASS_SIZE);
</script>

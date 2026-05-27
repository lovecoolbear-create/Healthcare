/**
 * PointsCard - 积分概览卡片组件
 * 包含：总积分、坚持天数、库存提醒
 */
<template>
  <view class="flex items-center gap-3">
    <!-- 1. 总积分 -->
    <view class="w-[35%] bg-white rounded-2xl p-3 border border-slate-50 shadow-sm flex flex-col justify-between h-20 relative overflow-hidden">
      <view class="absolute -right-2 -bottom-2 opacity-10 transform rotate-12">
        <span class="text-4xl">💰</span>
      </view>
      <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 relative z-10">总积分</p>
      <view class="flex items-baseline gap-1 relative z-10">
        <p class="text-xl font-black text-emerald-600">{{ points.toLocaleString() }}</p>
      </view>
    </view>

    <!-- 2. 坚持天数 -->
    <view class="flex-1 bg-white rounded-2xl p-3 border border-slate-50 shadow-sm flex flex-col justify-between h-20 relative overflow-hidden">
      <view class="absolute -right-2 -bottom-2 opacity-10 transform rotate-12">
        <span class="text-4xl">🗓️</span>
      </view>
      <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5 relative z-10">坚持天数</p>
      <view class="flex items-baseline gap-1 relative z-10">
        <p class="text-xl font-black text-slate-800">{{ streakDays }}</p>
        <span class="text-[10px] text-slate-400 font-bold">天</span>
      </view>
    </view>

    <!-- 3. 库存提醒 -->
    <view 
      @click="$emit('goToInventory')" 
      class="w-14 h-20 bg-white rounded-2xl border border-slate-50 shadow-sm flex flex-col items-center justify-center gap-1 relative cursor-pointer active:scale-95 transition-transform"
    >
      <view class="relative">
        <span class="text-2xl">🔔</span>
        <view v-if="lowStockCount > 0" class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
          <span class="text-[8px] text-white font-bold">{{ lowStockCount }}</span>
        </view>
      </view>
      <span class="text-[8px] font-bold text-slate-400">库存</span>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  points: number;
  streakDays: number;
  lowStockCount: number;
}>();

defineEmits<{
  (e: 'goToInventory'): void;
}>();
</script>

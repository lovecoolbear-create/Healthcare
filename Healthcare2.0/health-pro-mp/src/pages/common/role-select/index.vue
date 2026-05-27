<template>
  <view class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex flex-col items-center justify-center p-6">
    <!-- Header -->
    <view class="text-center mb-10">
      <view class="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
        <text class="text-2xl">👤</text>
      </view>
      <text class="text-2xl font-bold text-slate-800 block mb-2">选择使用身份</text>
      <text class="text-sm text-slate-500">您同时拥有顾问和客户权限</text>
    </view>

    <!-- Role Cards -->
    <view class="w-full max-w-[320px] space-y-4">
      <!-- Admin Card -->
      <view 
        @click="selectRole('admin')"
        class="bg-white rounded-2xl p-5 shadow-lg border-2 border-transparent hover:border-emerald-500 active:scale-[0.98] transition-all duration-200 cursor-pointer"
      >
        <view class="flex items-center gap-4">
          <view class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <text class="text-xl">💼</text>
          </view>
          <view class="flex-1">
            <text class="text-lg font-bold text-slate-800 block">营养顾问</text>
            <text class="text-xs text-slate-500 mt-1">管理客户、查看数据、处理订单</text>
          </view>
          <text class="text-emerald-500 text-xl">→</text>
        </view>
      </view>

      <!-- Client Card -->
      <view 
        @click="selectRole('client')"
        class="bg-white rounded-2xl p-5 shadow-lg border-2 border-transparent hover:border-emerald-500 active:scale-[0.98] transition-all duration-200 cursor-pointer"
      >
        <view class="flex items-center gap-4">
          <view class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <text class="text-xl">🏠</text>
          </view>
          <view class="flex-1">
            <text class="text-lg font-bold text-slate-800 block">客户</text>
            <text class="text-xs text-slate-500 mt-1">每日打卡、查看库存、记录健康</text>
          </view>
          <text class="text-emerald-500 text-xl">→</text>
        </view>
      </view>
    </view>

    <!-- Footer Note -->
    <view class="mt-8 text-center">
      <text class="text-xs text-slate-400">可随时切换身份使用</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const selectRole = (role: string) => {
  // 存储当前选择的角色视角
  uni.setStorageSync('currentViewRole', role);
  
  if (role === 'admin') {
    uni.reLaunch({ url: '/pages/admin/dashboard/index' });
  } else {
    uni.reLaunch({ url: '/pages/client/home/index' });
  }
};
</script>

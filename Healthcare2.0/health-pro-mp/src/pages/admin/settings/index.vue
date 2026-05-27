<template>
  <view class="mp-page-shell min-h-screen bg-transparent pb-24">
    <!-- Top Nav -->
    <view class="bg-slate-900 px-6 pt-12 pb-16 border-b border-slate-800 sticky top-0 z-40 shadow-lg shadow-slate-200/50">
      <view class="flex justify-between items-center h-10">
        <text class="text-xl font-black text-white tracking-tight">系统设置</text>
      </view>
    </view>

    <view class="px-6 -mt-10 relative z-50 space-y-6">
      <!-- Profile Card -->
      <view class="bg-white rounded-[24px] p-6 shadow-xl shadow-slate-200/60 border border-slate-100 flex items-center gap-4">
        <view class="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-2xl font-black text-indigo-600 border-2 border-indigo-100">
          {{ userInfo.username ? userInfo.username[0] : 'A' }}
        </view>
        <view>
          <text class="text-lg font-black text-slate-900 block">{{ userInfo.username || '营养师' }}</text>
          <text class="text-xs text-slate-400 font-medium block mt-1">{{ userInfo.phone || '138****0000' }}</text>
          <view class="inline-block mt-2 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
            <text class="text-indigo-600 text-[10px] font-bold">高级营养顾问</text>
          </view>
        </view>
      </view>

      <!-- Settings Options -->
      <view class="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
        <view 
          @click="navigateToPage('products')"
          class="mp-nav-row border-b border-slate-50"
        >
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <text>📦</text>
            </view>
            <text class="text-sm font-bold text-slate-700">产品库管理</text>
          </view>
          <text class="mp-chevron">›</text>
        </view>
        
        <view class="mp-nav-row border-b border-slate-50">
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <text>🔒</text>
            </view>
            <text class="text-sm font-bold text-slate-700">修改密码</text>
          </view>
          <text class="mp-chevron">›</text>
        </view>
        <view class="mp-nav-row" @click="openNotificationSettings">
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <text>🔔</text>
            </view>
            <text class="text-sm font-bold text-slate-700">通知设置</text>
          </view>
          <text class="mp-chevron">›</text>
        </view>
      </view>

      <!-- Logout -->
      <button 
        @click="handleLogout"
        class="w-full py-4 bg-white border border-rose-100 text-rose-500 rounded-2xl font-black text-sm shadow-sm active:bg-rose-50 flex items-center justify-center gap-2 mp-pressable"
      >
        <text>🚪</text>
        <text>退出登录</text>
      </button>

      <text class="block text-center text-[10px] text-slate-300 font-medium pt-4">
        Version 1.2.1 (Build 20260307)
      </text>
    </view>

    <!-- Admin TabBar -->
    <AdminTabBar :current="2" />
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AdminTabBar from '@/components/AdminTabBar.vue';

const userInfo = ref<any>({});

onShow(async () => {
  const info = getUserInfo();
  if (info) {
    userInfo.value = info;
  }
});

const navigateToPage = (page: string) => {
  uni.navigateTo({
    url: `/pages/admin/${page}/index`
  });
};

const openNotificationSettings = () => {
  uni.navigateTo({
    url: '/pages/admin/triggers/index'
  });
};

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('token');
        uni.removeStorageSync('userInfo');
        uni.reLaunch({
          url: '/pages/common/login/index'
        });
      }
    }
  });
};
</script>

<style>
/* No extra CSS needed */
</style>

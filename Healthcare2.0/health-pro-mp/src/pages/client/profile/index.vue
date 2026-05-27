<template>
  <view class="mp-page-shell min-h-screen bg-slate-50 pb-32">
    <!-- Header -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-emerald-100/80 backdrop-blur-md px-6 pt-12 pb-3 border-b border-emerald-200/50">
      <view class="flex justify-between items-center h-10">
        <h1 class="text-lg font-black text-slate-800">个人中心</h1>
        <view class="w-8 h-8 bg-emerald-200/50 rounded-lg flex items-center justify-center border border-emerald-300/30">
          <span class="text-sm">👤</span>
        </view>
      </view>
    </view>

    <!-- 占位高度 -->
    <view class="h-28"></view>

    <view class="px-6 space-y-6">
      <!-- 用户信息卡片 -->
      <view class="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-50 flex items-center gap-5 relative overflow-hidden">
        <view class="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-10 -translate-y-1/2 translate-x-1/2"></view>
        
        <view class="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-3xl font-black text-emerald-600 border-4 border-emerald-50 relative z-10 shadow-inner">
          {{ userInfo.username ? userInfo.username[0] : 'U' }}
        </view>
        <view class="relative z-10">
          <h2 class="text-xl font-black text-slate-900 mb-1">{{ userInfo.username || 'VIP客户' }}</h2>
          <p class="text-xs text-slate-400 font-medium mb-3">{{ userInfo.phone || '138****0000' }}</p>
          <view class="flex gap-2">
            <span class="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-100">VIP 客户</span>
            <span class="px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg border border-amber-100">积分 12,450</span>
          </view>
        </view>
      </view>

      <!-- 菜单列表 -->
      <view class="bg-white rounded-[28px] shadow-sm border border-slate-100 overflow-hidden">
        <view 
          v-for="(item, index) in menuItems" 
          :key="index" 
          @click="handleMenuClick(item.action)"
          class="p-4 border-b border-slate-50 last:border-0 flex justify-between items-center active:bg-slate-50 transition-colors cursor-pointer"
        >
          <view class="flex items-center gap-3">
            <view class="w-8 h-8 rounded-xl flex items-center justify-center text-sm" :class="item.bgClass">
              {{ item.icon }}
            </view>
            <span class="text-sm font-bold text-slate-700">{{ item.label }}</span>
          </view>
          <span class="text-xs text-slate-300 font-black">></span>
        </view>
      </view>

      <!-- 退出登录 -->
      <button 
        @click="handleLogout"
        class="w-full py-4 bg-slate-200 text-slate-500 rounded-2xl font-black text-sm active:scale-95 transition-all mt-4 hover:bg-rose-50 hover:text-rose-500"
      >
        退出登录
      </button>
    </view>
    <!-- 自定义底部导航栏 -->
    <ClientTabBar :current="4" />
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import ClientTabBar from '@/components/ClientTabBar.vue'
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';

const userInfo = ref<any>({});

const menuItems = ref([
  { label: '积分兑换课程', icon: '🎓', bgClass: 'bg-amber-50 text-amber-600', action: 'courses' },
  { label: '我的健康方案', icon: '📋', bgClass: 'bg-emerald-50 text-emerald-600', action: 'plan' },
  { label: '我的订单', icon: '📦', bgClass: 'bg-orange-50 text-orange-600', action: 'orders' },
  { label: '周度健康总结', icon: '📊', bgClass: 'bg-indigo-50 text-indigo-600', action: 'summary' },
  { label: '联系顾问', icon: '💬', bgClass: 'bg-purple-50 text-purple-600', action: 'contact' },
  { label: '关于我们', icon: 'ℹ️', bgClass: 'bg-slate-100 text-slate-500', action: 'about' }
]);

onShow(async () => {
  const info = getUserInfo();
  if (info) {
    userInfo.value = info;
    // 获取最新用户信息
    try {
      const { result } = await uniCloud.callFunction({
        name: 'client-api',
        data: {
          action: 'getUserInfo',
          payload: { userId: info._id }
        }
      });
      if (result.code === 0 && result.data) {
        userInfo.value = { ...info, ...result.data };
        uni.setStorageSync('userInfo', userInfo.value);
      }
    } catch (e) {
      console.error('Failed to update user info:', e);
    }
  }
});

const handleMenuClick = (action: string) => {
  switch (action) {
    case 'courses':
      uni.navigateTo({ url: '/pages/client/course-exchange/index' });
      break;
    case 'plan':
      uni.navigateTo({ url: '/pages/client/protocol/index' });
      break;
    case 'orders':
      uni.navigateTo({ url: '/pages/client/orders/index' });
      break;
    case 'summary':
      uni.navigateTo({ url: '/pages/client/summary/index' });
      break;
    case 'contact':
      uni.navigateTo({ url: '/pages/client/messages/index' });
      break;
    case 'about':
      uni.showToast({ title: 'Healthcare Pro v1.2', icon: 'none' });
      break;
  }
};

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出当前账号吗？',
    confirmColor: '#10b981',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync();
        uni.reLaunch({ url: '/pages/common/login/index' });
      }
    }
  });
};
</script>

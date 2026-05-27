<template>
  <view class="bg-white border-t border-slate-100 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.04)]" style="position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; z-index: 9999 !important;">
    <view class="flex justify-around items-center h-16">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="flex flex-col items-center justify-center w-full h-full relative"
        @click="switchTab(tab)"
      >
        <view class="relative">
          <text class="text-xl mb-0.5 transition-all" :class="current === tab.key ? 'text-emerald-600 scale-110' : 'text-slate-300 grayscale'">{{ tab.icon }}</text>
          
          <view v-if="tab.key === 2 && unreadCount > 0" class="absolute -top-1 -right-1.5 min-w-[12px] h-[12px] bg-rose-500 rounded-full border border-white flex items-center justify-center shadow-sm">
            <text class="text-[7px] text-white font-black">{{ unreadCount > 9 ? '9+' : unreadCount }}</text>
          </view>
        </view>
        <text class="text-[7px] font-black tracking-tight" :class="current === tab.key ? 'text-emerald-600' : 'text-slate-400'">{{ tab.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 极其保守的 Prop 定义
const props = defineProps({
  current: {
    type: Number,
    default: 0
  },
  unreadCount: {
    type: Number,
    default: 0
  }
});

const tabs = [
  { key: 0, label: '今日', icon: '📋', url: '/pages/client/home/index' },
  { key: 1, label: '趋势', icon: '📈', url: '/pages/client/trends/index' },
  { key: 2, label: '咨询', icon: '💬', url: '/pages/client/messages/index' },
  { key: 3, label: '库存', icon: '📦', url: '/pages/client/inventory/index' },
  { key: 4, label: '我的', icon: '👤', url: '/pages/client/profile/index' }
];

const switchTab = (tab: any) => {
  if (props.current === tab.key) return;
  uni.redirectTo({
    url: tab.url
  });
};
</script>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
.grayscale {
  filter: grayscale(100%);
  opacity: 0.5;
}
</style>

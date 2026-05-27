<template>
  <view class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 pb-safe z-50">
    <view class="flex justify-around items-center h-16">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="flex flex-col items-center justify-center w-full h-full mp-pressable"
        @click="switchTab(tab)"
      >
        <text class="text-2xl mb-0.5" :class="props.current === tab.key ? 'text-emerald-600' : 'text-slate-300 grayscale'">{{ tab.icon }}</text>
        <text class="text-[10px] font-bold" :class="props.current === tab.key ? 'text-emerald-600' : 'text-slate-300'">{{ tab.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  current: number
}>()

const tabs = [
  { key: 0, label: '工作台', icon: '📊', url: '/pages/admin/dashboard/index' },
  { key: 1, label: '客户', icon: '👥', url: '/pages/admin/clients/index' },
  { key: 2, label: '我的', icon: '👤', url: '/pages/admin/settings/index' }
]

const switchTab = (tab: { key: number; url: string }) => {
  if (props.current === tab.key) return
  uni.redirectTo({ url: tab.url })
}
</script>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>

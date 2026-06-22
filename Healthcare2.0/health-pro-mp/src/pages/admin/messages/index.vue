<template>
  <view>
    <!-- #ifdef H5 -->
    <!-- 桌面端（大屏） -->
    <view v-if="isDesktop" class="min-h-screen bg-slate-50 flex font-sans">
      <Sidebar activeTab="messages" />
      <view class="flex-1 overflow-y-auto">
        <DesktopMessageManager />
      </view>
    </view>
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <!-- 移动端（小屏幕） -->
    <view>
      <MobileMessageManager />
      <AdminTabBar :current="4" />
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// #ifdef H5
// 桌面端组件
import Sidebar from '@/components/Sidebar.vue'
import DesktopMessageManager from './components/DesktopMessageManager.vue'
// #endif

// #ifndef H5
// 移动端组件
import MobileMessageManager from './components/MobileMessageManager.vue'
import AdminTabBar from '@/components/AdminTabBar.vue'
// #endif

const isDesktop = ref(false)

const updateIsDesktop = () => {
  // #ifdef H5
  isDesktop.value = window.innerWidth > 768
  // #endif
  // #ifndef H5
  isDesktop.value = false
  // #endif
}

onMounted(() => {
  updateIsDesktop()
  // #ifdef H5
  window.addEventListener('resize', updateIsDesktop)
  // #endif
})

onUnmounted(() => {
  // #ifdef H5
  window.removeEventListener('resize', updateIsDesktop)
  // #endif
})
</script>

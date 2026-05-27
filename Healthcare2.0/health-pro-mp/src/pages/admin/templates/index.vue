<template>
  <view>
    <!-- #ifdef H5 -->
    <DesktopTemplates v-if="isDesktop" />
    <!-- #endif -->
    
    <view v-if="!isDesktop" class="mp-page-shell min-h-screen bg-transparent flex flex-col items-center justify-center p-10 text-center">
      <div class="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
        <text class="text-3xl">💻</text>
      </div>
      <text class="text-slate-900 font-bold text-lg mb-2">请使用电脑端访问</text>
      <text class="text-slate-500 text-sm">配方模板库管理功能仅支持在 PC 端操作，以获得最佳体验。</text>
      <button
        @click="goBack"
        class="mt-6 px-6 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-500/25"
      >
        返回
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
// #ifdef H5
import DesktopTemplates from './components/DesktopTemplates.vue';
// #endif

const isDesktop = ref(false);

const goBack = () => {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
    return;
  }
  uni.reLaunch({
    url: '/pages/admin/settings/index'
  });
};

// #ifdef H5
isDesktop.value = true;
// #endif
</script>

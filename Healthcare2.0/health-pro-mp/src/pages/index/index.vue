<template>
  <div class="mp-page-shell flex flex-col items-center justify-center min-h-screen bg-transparent p-8">
    <div class="w-24 h-24 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-8 rotate-3">
      <FlaskConical class="w-12 h-12 text-white" />
    </div>
    
    <h1 class="text-3xl font-black text-slate-900 mb-2">HealthCare Pro</h1>
    <p class="text-slate-500 font-medium mb-12">精准营养数字化管理系统</p>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
      <!-- 客户端入口 -->
      <div 
        @click="navTo('/pages/client/home/index')"
        class="bg-white p-8 rounded-[32px] border border-slate-100 hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1 transition-all cursor-pointer group"
      >
        <div class="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors">
          <Smartphone class="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
        </div>
        <h3 class="text-lg font-black text-slate-900 mb-1">我是客户 (Client)</h3>
        <p class="text-xs text-slate-400">查看今日打卡、管理库存、记录体感</p>
      </div>

      <!-- 营养师端入口 -->
      <div 
        @click="navTo('/pages/admin/dashboard/index')"
        class="bg-white p-8 rounded-[32px] border border-slate-100 hover:shadow-xl hover:border-slate-300 hover:-translate-y-1 transition-all cursor-pointer group"
      >
        <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-slate-900 transition-colors">
          <LayoutDashboard class="w-7 h-7 text-slate-600 group-hover:text-white transition-colors" />
        </div>
        <h3 class="text-lg font-black text-slate-900 mb-1">我是营养师 (Admin)</h3>
        <p class="text-xs text-slate-400">管理客户档案、配置方案、处理预警</p>
      </div>
    </div>
    
    <div class="mt-12 text-[10px] text-slate-300 font-mono">
      v5.2.0 Dev Build
    </div>
  </div>
</template>

<script setup lang="ts">
import { FlaskConical, Smartphone, LayoutDashboard } from 'lucide-vue-next';

const navTo = (url: string) => {
  uni.navigateTo({ url });
};
</script>

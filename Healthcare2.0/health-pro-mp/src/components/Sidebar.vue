<template>
  <div :class="className || defaultClasses">
    <div class="p-6">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
          <Database class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-white tracking-tight">HealthCare</h1>
          <p class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Data Hub</p>
        </div>
      </div>
      <p class="text-xs text-slate-500 italic mt-2">精准营养元数据中心</p>
    </div>

    <nav class="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-2">核心管理</div>
      
      <button 
        @click="handleNav('dashboard', '/pages/admin/dashboard/index')"
        :class="`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('dashboard') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`"
      >
        <LayoutDashboard class="w-5 h-5" />
        工作台 Dashboard
      </button>

      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mt-8 mb-2">数据维度维护</div>
      
      <button 
        @click="handleNav('clients', '/pages/admin/clients/index')"
        :class="`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('clients') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`"
      >
        <Users class="w-5 h-5" />
        客户档案库
      </button>

      <button 
        @click="handleNav('products', '/pages/admin/products/index')"
        :class="`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('products') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`"
      >
        <Package class="w-5 h-5" />
        产品库
      </button>

      <button 
        @click="handleNav('templates', '/pages/admin/templates/index')"
        :class="`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('templates') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`"
      >
        <FlaskConical class="w-5 h-5" />
        健康调理配方库
      </button>

      <button 
        @click="handleNav('orders', '/pages/admin/orders/index')"
        :class="`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('orders') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`"
      >
        <ShoppingBag class="w-5 h-5" />
        订单管理
        <span v-if="pendingOrderCount > 0" class="ml-auto px-2 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full">{{ pendingOrderCount }}</span>
      </button>
      
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mt-8 mb-2">增值运营</div>
      <button 
        @click="handleNav('courses', '/pages/admin/courses/index')"
        :class="`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('courses') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`"
      >
        <GraduationCap class="w-5 h-5" />
        课程管理
      </button>

      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mt-8 mb-2">系统支撑</div>
      <button 
        @click="handleNav('triggers', '/pages/admin/triggers/index')"
        :class="`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('triggers') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`"
      >
        <ShieldAlert class="w-5 h-5" />
        干预触发器配置
      </button>

      <button 
        @click="handleNav('reports', '/pages/admin/reports/index')"
        :class="`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('reports') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`"
      >
        <BarChart3 class="w-5 h-5" />
        数据分析报告
      </button>

      <button 
        @click="handleNav('knowledge', '/pages/admin/knowledge/index')"
        :class="`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isTabActive('knowledge') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'hover:bg-slate-800'}`"
      >
        <Database class="w-5 h-5" />
        营养学知识库
      </button>
    </nav>

    <div class="p-4 border-t border-slate-800 shrink-0">
      <div 
        @click="logout"
        class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer group"
      >
        <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white uppercase">
          {{ user.name?.[0] || '营' }}
        </div>
        <div class="flex-1 overflow-hidden">
          <div class="text-sm font-medium text-white truncate">{{ user.name }}</div>
          <div class="text-[10px] text-slate-500 truncate">{{ user.role }}</div>
        </div>
        <LogOut class="w-4 h-4 text-slate-500 group-hover:text-red-400 transition-colors" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Database, 
  Users, 
  Package, 
  Layers, 
  ShieldAlert, 
  LogOut,
  LayoutDashboard,
  BarChart3,
  FlaskConical,
  ShoppingBag,
  GraduationCap
} from 'lucide-vue-next';

import { ref, onMounted } from 'vue';
import { callCloud } from '@/utils/cloud';

// Props definition
const props = defineProps<{
  activeTab?: string;
  className?: string;
}>();

const emit = defineEmits(['tabChange']);

// Default classes
const defaultClasses = "w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0";

// Pending order count
const pendingOrderCount = ref(0);

const fetchPendingOrderCount = async () => {
  try {
    const res = await callCloud('client-api', {
      action: 'getAdminOrders',
      payload: { status: 0, limit: 1 }
    });
    if (res.code === 0) {
      pendingOrderCount.value = res.data.length;
    }
  } catch (error) {
    console.error('Failed to fetch pending orders:', error);
  }
};

onMounted(() => {
  fetchPendingOrderCount();
});

// Get user state from storage
const getUserInfo = () => {
  let userInfo = uni.getStorageSync('userInfo') || {};
  // #ifdef H5
  // H5 端优先从 localStorage 读取
  try {
    const localUserInfo = localStorage.getItem('userInfo');
    if (localUserInfo) {
      userInfo = JSON.parse(localUserInfo);
    }
  } catch (e) {
    console.error('Failed to parse userInfo from localStorage:', e);
  }
  // #endif
  return userInfo;
};

const userInfo = getUserInfo();
const user = {
  name: userInfo.username || userInfo.phone || '营养师',
  role: userInfo.role === 'admin' ? '高级营养师' : '用户'
};

const logout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出当前账号吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('token');
        uni.removeStorageSync('userInfo');
        uni.reLaunch({ url: '/pages/common/login/index' });
      }
    }
  });
};

const handleNav = async (tab: string, path: string) => {
  // Use reLaunch for sidebar navigation to ensure clean state
  try {
    await uni.reLaunch({ url: path });
  } catch (e: any) {
    console.error('Navigation failed:', e);
    // 如果 reLaunch 失败，尝试使用 navigateTo
    try {
      await uni.navigateTo({ url: path });
    } catch (navError) {
      console.error('NavigateTo also failed:', navError);
    }
  }
};

const isTabActive = (tab: string) => {
  return props.activeTab === tab;
};
</script>

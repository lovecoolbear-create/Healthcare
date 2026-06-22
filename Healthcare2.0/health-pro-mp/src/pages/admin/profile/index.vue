<template>
  <view class="min-h-screen bg-slate-50 font-sans">
    <!-- Header -->
    <view class="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 pt-12 pb-8 sticky top-0 z-50">
      <view class="flex items-center justify-between">
        <view>
          <h1 class="text-xl font-black text-white">客户360画像</h1>
          <p class="text-xs text-white/70 mt-1">全面了解客户健康状况与行为</p>
        </view>
        <view class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center" @click="goBack">
          <text class="text-white font-bold text-lg">←</text>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="flex flex-col items-center justify-center py-20">
      <view class="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></view>
      <text class="text-sm text-slate-400 mt-4">加载中...</text>
    </view>

    <!-- Content -->
    <view v-else class="p-6 pb-20 space-y-4">
      <!-- 客户基本信息 -->
      <view class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <view class="flex items-center gap-4">
          <view class="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center font-black text-white text-xl">
            {{ profile.user?.username?.[0] || profile.user?.nickname?.[0] || '?' }}
          </view>
          <view class="flex-1">
            <h2 class="text-lg font-black text-slate-900">{{ profile.user?.username || profile.user?.nickname || '未命名' }}</h2>
            <p class="text-xs text-slate-400 mt-0.5">{{ profile.user?.phone || '暂无电话' }} · {{ profile.user?.role === 'client' ? '客户' : profile.user?.role }}</p>
          </view>
          <view class="px-3 py-1.5 rounded-full text-xs font-bold" :class="riskClass">
            {{ profile.scores?.riskLabel || '未知' }}
          </view>
        </view>
      </view>

      <!-- 健康评分 -->
      <view class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 class="text-sm font-bold text-slate-800 mb-4">健康评分</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-500">WROM 健康指数</span>
              <span class="text-xs font-bold" :class="getScoreColor(profile.scores?.wrom)">
                {{ profile.scores?.wromStatus ? '' : '未评估' }}
              </span>
            </div>
            <p class="text-3xl font-black text-indigo-600">{{ profile.scores?.wrom || '--' }}</p>
            <div class="w-full bg-white/80 rounded-full h-2 mt-2 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="getScoreBarColor(profile.scores?.wrom)" :style="{ width: `${Math.min(profile.scores?.wrom || 0, 100)}%` }"></div>
            </div>
          </div>
          <div class="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-slate-500">RPS 复购倾向</span>
            </div>
            <p class="text-3xl font-black text-violet-600">{{ profile.scores?.rps || '--' }}</p>
            <div class="w-full bg-white/80 rounded-full h-2 mt-2 overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :class="getScoreBarColor(profile.scores?.rps)" :style="{ width: `${Math.min(profile.scores?.rps || 0, 100)}%` }"></div>
            </div>
          </div>
        </div>
      </view>

      <!-- 本周统计 -->
      <view class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 class="text-sm font-bold text-slate-800 mb-4">本周统计</h3>
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="w-12 h-12 mx-auto bg-emerald-50 rounded-xl flex items-center justify-center mb-2">
              <text class="text-lg">✅</text>
            </div>
            <p class="text-2xl font-black text-slate-900">{{ profile.weeklyStats?.completionRate || 0 }}%</p>
            <p class="text-xs text-slate-400 mt-0.5">完成率</p>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 mx-auto bg-blue-50 rounded-xl flex items-center justify-center mb-2">
              <text class="text-lg">💧</text>
            </div>
            <p class="text-2xl font-black text-slate-900">{{ profile.weeklyStats?.avgWaterIntake || 0 }}</p>
            <p class="text-xs text-slate-400 mt-0.5">ml/日</p>
          </div>
          <div class="text-center">
            <div class="w-12 h-12 mx-auto bg-indigo-50 rounded-xl flex items-center justify-center mb-2">
              <text class="text-lg">📝</text>
            </div>
            <p class="text-2xl font-black text-slate-900">{{ profile.weeklyStats?.checkInDays || 0 }}</p>
            <p class="text-xs text-slate-400 mt-0.5">打卡天数</p>
          </div>
        </div>
      </view>

      <!-- 今日状态 -->
      <view class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-slate-800">今日打卡</h3>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="todayStatusClass">
            {{ todayStatusText }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500" :style="{ width: `${todayProgress}%` }"></div>
          </div>
          <span class="text-sm font-bold text-slate-600">{{ profile.todayStats?.completedTasks || 0 }}/{{ profile.todayStats?.totalTasks || 0 }}</span>
        </div>
      </view>

      <!-- 库存状态 -->
      <view class="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 class="text-sm font-bold text-slate-800 mb-3">库存状态</h3>
        <div class="flex items-center justify-between">
          <span class="text-xs text-slate-500">总产品数</span>
          <span class="text-sm font-bold text-slate-900">{{ profile.inventory?.totalItems || 0 }} 种</span>
        </div>
        <div v-if="profile.inventory?.lowStockCount > 0" class="flex items-center justify-between mt-2 text-amber-600">
          <span class="text-xs">⚠️ 库存告急</span>
          <span class="text-sm font-bold">{{ profile.inventory?.lowStockCount }} 种</span>
        </div>
        <div v-if="profile.inventory?.outOfStockCount > 0" class="flex items-center justify-between mt-1 text-rose-600">
          <span class="text-xs">🚨 已缺货</span>
          <span class="text-sm font-bold">{{ profile.inventory?.outOfStockCount }} 种</span>
        </div>
        <view v-if="profile.inventory?.lowStockItems?.length > 0" class="mt-3 space-y-1">
          <div v-for="item in profile.inventory.lowStockItems" :key="item.name" class="flex items-center justify-between text-xs">
            <span class="text-slate-600">{{ item.name }}</span>
            <span class="font-bold text-amber-600">剩余 {{ item.stock }} 份</span>
          </div>
        </view>
      </view>

      <!-- 亮点 -->
      <view class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-5 border border-emerald-100">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <text class="text-white text-xs">✓</text>
          </span>
          <h3 class="text-sm font-bold text-emerald-800">做得好的地方</h3>
        </div>
        <ul class="space-y-2">
          <li v-for="(item, index) in profile.strengths" :key="index" class="flex items-start gap-2">
            <span class="text-emerald-500 mt-0.5">•</span>
            <span class="text-sm text-emerald-700">{{ item }}</span>
          </li>
        </ul>
      </view>

      <!-- 改进点 -->
      <view class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-5 border border-amber-100">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
            <text class="text-white text-xs">!</text>
          </span>
          <h3 class="text-sm font-bold text-amber-800">需要改进的地方</h3>
        </div>
        <ul class="space-y-2">
          <li v-for="(item, index) in profile.improvements" :key="index" class="flex items-start gap-2">
            <span class="text-amber-500 mt-0.5">•</span>
            <span class="text-sm text-amber-700">{{ item }}</span>
          </li>
        </ul>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { callCloud, getAuthToken } from '@/utils/cloud';

const loading = ref(true);
const profile = ref<any>({});
const clientId = ref('');

const riskClass = computed(() => {
  const level = profile.value.scores?.riskLevel;
  if (level === 'high') return 'bg-rose-100 text-rose-600';
  if (level === 'medium') return 'bg-amber-100 text-amber-600';
  return 'bg-emerald-100 text-emerald-600';
});

const todayStatusText = computed(() => {
  const status = profile.value.todayStats?.status;
  if (status === 'completed') return '已完成';
  if (status === 'partial') return '进行中';
  if (status === 'not_started') return '未开始';
  return '无方案';
});

const todayStatusClass = computed(() => {
  const status = profile.value.todayStats?.status;
  if (status === 'completed') return 'bg-emerald-100 text-emerald-600';
  if (status === 'partial') return 'bg-blue-100 text-blue-600';
  if (status === 'not_started') return 'bg-slate-100 text-slate-600';
  return 'bg-slate-50 text-slate-400';
});

const todayProgress = computed(() => {
  const completed = profile.value.todayStats?.completedTasks || 0;
  const total = profile.value.todayStats?.totalTasks || 0;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
});

const getScoreColor = (score: number | undefined) => {
  if (!score) return 'text-slate-400';
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-rose-500';
};

const getScoreBarColor = (score: number | undefined) => {
  if (!score) return 'bg-slate-300';
  if (score >= 80) return 'bg-gradient-to-r from-emerald-400 to-teal-500';
  if (score >= 60) return 'bg-gradient-to-r from-amber-400 to-orange-500';
  return 'bg-gradient-to-r from-rose-400 to-red-500';
};

const fetchProfile = async () => {
  if (!getAuthToken()) return;
  loading.value = true;
  try {
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = (currentPage as any).$page?.options || {};
    clientId.value = options.clientId || '';
    
    if (!clientId.value) {
      uni.showToast({ title: '缺少客户ID', icon: 'none' });
      return;
    }

    const res = await callCloud('client-api', {
      action: 'getClientProfile',
      payload: { clientId: clientId.value }
    });
    
    if (res.code === 0) {
      profile.value = res.data || {};
    } else {
      uni.showToast({ title: res.msg || '获取失败', icon: 'none' });
    }
  } catch (e) {
    console.error('fetch profile failed:', e);
    uni.showToast({ title: '网络异常', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  uni.navigateBack();
};

onMounted(() => {
  fetchProfile();
});
</script>
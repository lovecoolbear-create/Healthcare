<template>
  <!-- #ifdef H5 -->
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <Sidebar activeTab="clients" />
    
    <!-- Main Content -->
    <div class="flex-1 p-10 pb-24 overflow-y-auto h-screen">
  <!-- #endif -->
  
  <!-- #ifndef H5 -->
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-white shadow-sm border-b">
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100">
            <span class="text-slate-600">←</span>
          </button>
          <h1 class="text-xl font-bold text-slate-900">选择健康配方</h1>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6">
  <!-- #endif -->
  
      <!-- #ifdef H5 -->
      <!-- Header -->
      <div class="flex justify-between items-end mb-8">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100">
            <span class="text-slate-600">←</span>
          </button>
          <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">选择健康配方</h1>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-sm text-slate-500 font-medium">共 {{ templates.length }} 个配方</span>
              <span class="w-1 h-1 rounded-full bg-slate-300"></span>
              <span class="text-sm text-slate-500">支持一键应用</span>
            </div>
          </div>
        </div>
      </div>
      <!-- #endif -->

      <!-- Content -->
      <div>
        <!-- Search Bar -->
        <div class="mb-6">
          <div class="relative">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="搜索配方名称或描述..." 
              class="w-full px-4 py-3 pl-10 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
            >
            <span class="absolute left-3 top-3.5 text-slate-400">🔍</span>
          </div>
        </div>

        <!-- Template List -->
        <div class="space-y-4">
          <div 
            v-for="template in filteredTemplates" 
            :key="template._id"
            class="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
            @click="selectTemplate(template)"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-slate-900 mb-2">{{ template.name }}</h3>
                <p class="text-sm text-slate-600 line-clamp-2">{{ template.description || '暂无描述' }}</p>
              </div>
              <div class="ml-4 flex-shrink-0">
                <div class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                  {{ template.category || '通用' }}
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-4 text-sm text-slate-500">
              <div class="flex items-center gap-1">
                <span>💊</span>
                <span>{{ (template.items?.length || template.products?.length || 0) }}个产品</span>
              </div>
              <div class="flex items-center gap-1">
                <span>⏱️</span>
                <span>{{ template.duration || '7' }}天</span>
              </div>
              <div class="flex items-center gap-1">
                <span>👁️</span>
                <span>{{ template.view_count || 0 }}次查看</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredTemplates.length === 0" class="text-center py-20">
        <div class="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl">📚</span>
        </div>
        <p class="text-sm text-slate-400 font-bold mb-2">
          {{ searchQuery ? '未找到匹配的配方' : '暂无配方模板' }}
        </p>
        <p class="text-xs text-slate-400">
          {{ searchQuery ? '请尝试其他搜索关键词' : '请先在配方库中添加经典配方' }}
        </p>
      </div>
      <!-- #ifdef H5 -->
    </div>
  </div>
  <!-- #endif -->
  
  <!-- #ifndef H5 -->
    </div>
  </div>
  <!-- #endif -->
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { callCloud, getAuthToken } from '@/utils/cloud';
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
// #ifdef H5
import Sidebar from '@/components/Sidebar.vue';
// #endif

interface Template {
  _id: string;
  name: string;
  description: string;
  category: string;
  product_count: number;
  duration: string;
  view_count: number;
  items: any[];
}

const templates = ref<Template[]>([]);
const searchQuery = ref('');
const clientId = ref('');

onLoad((options: any) => {
  if (options?.clientId) {
    clientId.value = options.clientId;
  }
  fetchTemplates();
});

const fetchTemplates = async () => {
  if (!getAuthToken()) return;
  try {
    const res = await callCloud('client-api', {
      action: 'getTemplates'
    });

    if (res.ok) {
      templates.value = res.data || [];
    }
  } catch (error) {
    console.error('获取配方模板失败:', error);
    uni.showToast({ title: '获取配方失败', icon: 'none' });
  }
};

const filteredTemplates = computed(() => {
  if (!searchQuery.value) return templates.value;
  
  const query = searchQuery.value.toLowerCase();
  return templates.value.filter(template => 
    template.name.toLowerCase().includes(query) ||
    (template.description && template.description.toLowerCase().includes(query))
  );
});

const selectTemplate = (template: Template) => {
  uni.showModal({
    title: '添加新方案',
    content: `确定要为客户添加"${template.name}"作为新方案吗？`,
    success: async (res) => {
      if (res.confirm) {
        await applyTemplate(template);
      }
    }
  });
};

const applyTemplate = async (template: Template) => {
  try {
    uni.showLoading({ title: '应用配方中...' });
    
    const userInfo = getUserInfo();
    const userId = userInfo ? userInfo._id : '';
    
    if (!userId) {
      uni.showToast({ title: '登录状态失效，请重新登录', icon: 'none' });
      return;
    }
    
    console.log('applyTemplate - clientId:', clientId.value, 'templateId:', template._id);
    
    const res = await callCloud('client-api', {
      action: 'applyTemplate',
      payload: {
        user_id: clientId.value,
        template_id: template._id,
        userId
      }
    });
    
    console.log('applyTemplate - response:', res);
    
    uni.hideLoading();
    
    if (res.ok) {
      uni.showToast({ title: '新方案添加成功', icon: 'success' });
      
      // 触发刷新事件，让客户详情页面刷新
      uni.$emit('client-protocol-updated', { clientId: clientId.value });
      
      setTimeout(() => {
        uni.showModal({
          title: '添加成功',
          content: '新方案已添加，是否同步到小程序客户端？',
          showCancel: true,
          cancelText: '暂不同步',
          confirmText: '立即同步',
          success: (res) => {
            if (res.confirm) {
              syncToClient();
            } else {
              uni.navigateBack();
            }
          }
        });
      }, 1500);
    } else {
      console.error('应用配方失败:', res);
      uni.showToast({ title: res.msg || `应用失败(代码:${res.code})`, icon: 'none', duration: 3000 });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('应用配方失败:', error);
    uni.showToast({ title: '应用失败', icon: 'none' });
  }
};

const syncToClient = async () => {
  try {
    uni.showToast({ title: '同步成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error) {
    console.error('同步失败:', error);
    uni.showToast({ title: '同步失败，但配方已应用', icon: 'none' });
  }
};

const goBack = () => {
  uni.navigateBack();
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

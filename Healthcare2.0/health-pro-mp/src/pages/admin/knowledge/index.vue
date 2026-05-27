<template>
  <view>
    <!-- #ifdef H5 -->
    <DesktopKnowledge v-if="isDesktop" />
    <!-- #endif -->
    
    <div v-if="!isDesktop" class="mp-page-shell min-h-screen bg-transparent pb-20">
    <!-- Header -->
    <div class="bg-white px-6 pt-12 pb-4 sticky top-0 z-50 shadow-sm">
      <h1 class="text-2xl font-black text-slate-900">知识库</h1>
      <p class="text-xs text-slate-400 mt-1">产品说明书、参考文献与话术库</p>
      
      <!-- Tabs -->
      <div class="flex mt-6 bg-slate-100 p-1 rounded-xl">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex-1 py-2 text-xs font-bold rounded-lg transition-all mp-pressable"
          :class="activeTab === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Content List -->
    <div class="p-6 space-y-4">
      <div v-if="loading" class="text-center py-10 text-slate-400 text-sm">
        加载中...
      </div>
      
      <div v-else-if="list.length === 0" class="text-center py-20">
        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📚</div>
        <p class="text-slate-400 text-sm">暂无{{ getTabLabel(activeTab) }}数据</p>
        <button @click="showAddModal" class="mt-4 px-6 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full mp-pressable">
          添加第一条
        </button>
      </div>

      <div 
        v-else
        v-for="item in list" 
        :key="item._id"
        class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mp-pressable"
        @click="showDetail(item)"
      >
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-base font-bold text-slate-800 line-clamp-1">{{ item.title }}</h3>
          <span class="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded-md">{{ formatDate(item.created_at) }}</span>
        </div>
        <p class="text-xs text-slate-500 line-clamp-3 leading-relaxed">{{ item.content }}</p>
        <div class="mt-3 flex gap-2" v-if="item.tags && item.tags.length">
          <span v-for="tag in item.tags" :key="tag" class="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-500 rounded-md">#{{ tag }}</span>
        </div>
      </div>
    </div>

    <!-- Floating Add Button -->
    <button 
      @click="showAddModal"
      class="fixed bottom-8 right-6 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-200 z-40 mp-pressable"
    >
      +
    </button>

    <!-- Detail/Edit Modal (Simple) -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-0">
      <div class="bg-white w-full max-w-md rounded-2xl p-6 animate-in slide-in-from-bottom-10 fade-in duration-200">
        <h3 class="text-lg font-bold text-slate-900 mb-4">{{ isEditing ? '编辑' : '添加' }}内容</h3>
        
        <div class="space-y-4">
          <div>
            <label class="text-xs font-bold text-slate-500 mb-1 block">标题</label>
            <input v-model="form.title" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" placeholder="输入标题..." />
          </div>
          
          <div>
            <label class="text-xs font-bold text-slate-500 mb-1 block">分类</label>
            <div class="flex gap-2">
              <span class="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg">{{ getTabLabel(activeTab) }}</span>
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-slate-500 mb-1 block">内容</label>
            <textarea v-model="form.content" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-32 focus:outline-none focus:border-indigo-500" placeholder="输入详细内容..."></textarea>
          </div>
        </div>

        <div class="flex gap-3 mt-8">
          <button @click="isModalOpen = false" class="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl text-sm font-bold mp-pressable">取消</button>
          <button @click="submitForm" class="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 mp-pressable">保存</button>
        </div>
      </div>
    </div>
    </div>
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { callCloud, getAuthToken } from '@/utils/cloud';
import { ref, watch, onMounted } from 'vue';

// #ifdef H5
import DesktopKnowledge from './components/DesktopKnowledge.vue';
// #endif

const isDesktop = ref(false);

const tabs = [
  { key: 'product', label: '产品说明' },
  { key: 'research', label: '参考文献' },
  { key: 'script', label: '常用话术' }
];

const activeTab = ref('product');
const list = ref<any[]>([]);
const loading = ref(false);
const isModalOpen = ref(false);
const isEditing = ref(false);
const form = ref({
  id: '',
  title: '',
  content: '',
  category: ''
});

const getTabLabel = (key: string) => tabs.find(t => t.key === key)?.label || '';

const formatDate = (ts: number) => {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const fetchList = async () => {
  if (!getAuthToken()) return;
  loading.value = true;
  try {
    const userInfo = getUserInfo();
    const res = await callCloud('client-api', {
      action: 'getKnowledgeList',
      payload: { category: activeTab.value, userId: userInfo ? userInfo._id : '' }
    });
    if (res.ok) {
      list.value = result.data;
    }
  } catch (e) {
    console.error(e);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const showAddModal = () => {
  isEditing.value = false;
  form.value = { id: '', title: '', content: '', category: activeTab.value };
  isModalOpen.value = true;
};

const showDetail = (item: any) => {
  isEditing.value = true;
  form.value = { id: item._id, title: item.title, content: item.content, category: item.category };
  isModalOpen.value = true;
};

const submitForm = async () => {
  if (!form.value.title || !form.value.content) {
    uni.showToast({ title: '请填写完整', icon: 'none' });
    return;
  }

  uni.showLoading({ title: '保存中...' });
  try {
    const userInfo = getUserInfo();
    const action = isEditing.value ? 'updateKnowledge' : 'addKnowledge';
    const payload = isEditing.value 
      ? { ...form.value, userId: userInfo ? userInfo._id : '' }
      : { ...form.value, category: activeTab.value, tags: [], userId: userInfo ? userInfo._id : '' };

    const { result } = await uniCloud.callFunction({
      name: 'client-api',
      data: { action, payload }
    });

    if (result.code === 0) {
      uni.showToast({ title: '保存成功', icon: 'success' });
      isModalOpen.value = false;
      fetchList();
    } else {
      throw new Error(result.msg);
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' });
  } finally {
    uni.hideLoading();
  }
};

watch(activeTab, () => {
  fetchList();
});

onMounted(() => {
  // #ifdef H5
  isDesktop.value = true;
  // #endif
  
  if (!isDesktop.value) {
    fetchList();
  }
});
</script>

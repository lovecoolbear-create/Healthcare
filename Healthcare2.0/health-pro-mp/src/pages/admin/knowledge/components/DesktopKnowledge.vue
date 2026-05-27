<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <Sidebar activeTab="knowledge" />
    
    <!-- Main Content -->
    <div class="flex-1 p-10 pb-24 overflow-y-auto h-screen">
      <!-- Header -->
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">知识库管理</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-sm text-slate-500 font-medium">产品说明书、参考文献与话术库</span>
          </div>
        </div>
        
        <button 
          @click="showAddModal"
          class="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2 active:scale-95"
        >
          <Plus class="w-4 h-4" /> 新增内容
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl w-fit shadow-sm border border-slate-100">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
          :class="activeTab === tab.key ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'"
        >
          <span>{{ tab.icon }}</span>
          {{ tab.label }}
        </button>
      </div>

      <!-- Content Grid -->
      <div v-if="loading" class="flex justify-center py-40">
        <div class="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>

      <div v-else-if="list.length === 0" class="flex flex-col items-center justify-center py-40 bg-white rounded-3xl border border-slate-100 border-dashed">
        <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-4xl">📚</div>
        <p class="text-slate-900 font-bold text-lg">暂无{{ getTabLabel(activeTab) }}数据</p>
        <p class="text-slate-400 text-sm mt-2 mb-6">该分类下还没有任何内容，开始添加第一条吧</p>
        <button @click="showAddModal" class="px-6 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-colors">
          添加内容
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div 
          v-for="item in list" 
          :key="item._id"
          class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group cursor-pointer flex flex-col h-full"
          @click="showDetail(item)"
        >
          <div class="flex justify-between items-start mb-4">
            <span class="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg">{{ getTabLabel(activeTab) }}</span>
            <span class="text-[10px] font-bold text-slate-400">{{ formatDate(item.created_at) }}</span>
          </div>
          
          <h3 class="text-lg font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition-colors">{{ item.title }}</h3>
          
          <p class="text-sm text-slate-500 line-clamp-4 leading-relaxed mb-6 flex-1">{{ item.content }}</p>
          
          <div class="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
            <div class="flex gap-2">
              <span v-for="tag in (item.tags || []).slice(0, 2)" :key="tag" class="text-[10px] px-2 py-1 bg-indigo-50 text-indigo-600 font-bold rounded-lg">#{{ tag }}</span>
              <span v-if="(item.tags || []).length > 2" class="text-[10px] px-2 py-1 bg-slate-50 text-slate-400 font-bold rounded-lg">+{{ item.tags.length - 2 }}</span>
            </div>
            <button class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <ArrowRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit/Add Modal - Unified UI -->
    <AdminModal
      v-model="isModalOpen"
      :title="isEditing ? '编辑内容' : '新增内容'"
      size="md"
      :loading="submitting"
      confirm-text="保存内容"
      @confirm="submitForm"
      @cancel="closeModal"
    >
      <div class="space-y-6">
        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">标题</label>
          <input 
            v-model="form.title" 
            type="text" 
            class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-300" 
            placeholder="请输入标题..." 
          />
        </div>

        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">详细内容</label>
          <textarea 
            v-model="form.content" 
            class="w-full h-64 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-300 resize-none leading-relaxed" 
            placeholder="在此输入详细内容..."
          ></textarea>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">标签 (选填)</label>
          <div class="flex flex-wrap gap-2 mb-2">
            <span v-for="(tag, idx) in form.tags" :key="idx" class="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg flex items-center gap-2 group border border-emerald-100">
              #{{ tag }}
              <button @click="removeTag(idx)" class="hover:text-emerald-800"><X class="w-3 h-3" /></button>
            </span>
          </div>
          <div class="flex gap-2">
            <input 
              v-model="newTag"
              @keyup.enter="addTag"
              type="text" 
              class="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 transition-all" 
              placeholder="输入标签按回车添加..." 
            />
            <button @click="addTag" class="px-4 h-10 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">添加</button>
          </div>
        </div>
      </div>
    </AdminModal>
  </div>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { callCloud } from '@/utils/cloud';
import { ref, watch, onMounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import AdminModal from '@/components/ui/AdminModal.vue';
import { Plus, Search, Filter, X, ArrowRight } from 'lucide-vue-next';

const tabs = [
  { key: 'product', label: '产品说明', icon: '📦' },
  { key: 'research', label: '参考文献', icon: '🔬' },
  { key: 'script', label: '话术库', icon: '💬' }
];

const activeTab = ref('product');
const list = ref<any[]>([]);
const loading = ref(true);
const isModalOpen = ref(false);
const isEditing = ref(false);
const submitting = ref(false);
const newTag = ref('');

const getApiErrorMessage = (code?: number, msg?: string, fallback = '操作失败') => {
  if (msg) return msg;
  if (code === 400) return '请求参数有误';
  if (code === 401) return '登录状态失效，请重新登录';
  if (code === 403) return '权限不足，无法执行此操作';
  if (code === 404) return '目标数据不存在或已被删除';
  return fallback;
};

const form = ref({
  _id: '',
  title: '',
  content: '',
  tags: [] as string[]
});

const getTabLabel = (key: string) => tabs.find(t => t.key === key)?.label || key;

const formatDate = (ts: number) => {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString();
};

const fetchData = async () => {
  loading.value = true;
  try {
    const userInfo = getUserInfo();
    const res = await callCloud('client-api', {
      action: 'getKnowledgeList',
      payload: {
        category: activeTab.value,
        userId: userInfo ? userInfo._id : ''
      }
    });
    if (res.ok) {
      list.value = (res.data as any[]) || [];
    } else {
      throw new Error(getApiErrorMessage(res.code, res.msg, '加载失败'));
    }
  } catch (e) {
    console.error(e);
    uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

watch(activeTab, () => {
  fetchData();
});

const showAddModal = () => {
  isEditing.value = false;
  form.value = { _id: '', title: '', content: '', tags: [] };
  isModalOpen.value = true;
};

const showDetail = (item: any) => {
  isEditing.value = true;
  form.value = JSON.parse(JSON.stringify(item));
  if (!form.value.tags) form.value.tags = [];
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const addTag = () => {
  if (newTag.value.trim() && !form.value.tags.includes(newTag.value.trim())) {
    form.value.tags.push(newTag.value.trim());
    newTag.value = '';
  }
};

const removeTag = (index: number) => {
  form.value.tags.splice(index, 1);
};

const submitForm = async () => {
  if (!form.value.title || !form.value.content) {
    uni.showToast({ title: '请填写完整', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const userInfo = getUserInfo();
    const action = isEditing.value ? 'updateKnowledge' : 'addKnowledge';
    const payload = isEditing.value
      ? {
          id: form.value._id,
          title: form.value.title,
          content: form.value.content,
          tags: form.value.tags,
          category: activeTab.value,
          userId: userInfo ? userInfo._id : ''
        }
      : {
          title: form.value.title,
          content: form.value.content,
          tags: form.value.tags,
          category: activeTab.value,
          userId: userInfo ? userInfo._id : ''
        };

    const res = await callCloud('client-api', { action, payload });

    if (!res.ok) {
      throw new Error(getApiErrorMessage(res.code, res.msg, '保存失败'));
    }

    closeModal();
    uni.showToast({ title: '保存成功', icon: 'success' });
    await fetchData();
  } catch (e: any) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
};

const handleDelete = async () => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条内容吗？此操作无法撤销。',
    confirmColor: '#f43f5e',
    success: async (res) => {
      if (res.confirm) {
        try {
          const userInfo = getUserInfo();
          const resCloud = await callCloud('client-api', {
            action: 'deleteKnowledge',
            payload: {
              id: form.value._id,
              userId: userInfo ? userInfo._id : ''
            }
          });

          if (!resCloud.ok) {
            throw new Error(getApiErrorMessage(resCloud.code, resCloud.msg, '删除失败'));
          }

          closeModal();
          uni.showToast({ title: '已删除', icon: 'success' });
          await fetchData();
        } catch (e: any) {
          uni.showToast({ title: e.message || '删除失败', icon: 'none' });
        }
      }
    }
  });
};

onMounted(() => {
  fetchData();
});
</script>

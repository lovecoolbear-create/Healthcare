<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <Sidebar activeTab="templates" />
    
    <!-- Main Content -->
    <div class="flex-1 p-10 pb-24 overflow-y-auto h-screen">
      <!-- Header -->
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">健康调理配方库</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-sm text-slate-500 font-medium">共 {{ templates?.length ?? 0 }} 个通用方案</span>
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="text-sm text-slate-500">支持一键应用给客户</span>
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="text-xs text-slate-400">{{ lastUpdateTime || '加载中...' }}</span>
            <span v-if="isRefreshing" class="text-xs text-emerald-500 animate-pulse">更新中...</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <!-- Search Bar -->
          <div class="relative">
            <Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="搜索方案名称/标签..." 
              class="w-64 h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>
          
          <!-- 刷新按钮（带旋转动画） -->
          <button 
            @click="refreshData"
            :disabled="isRefreshing"
            class="flex items-center justify-center bg-white border border-slate-200 text-slate-500 w-10 h-10 rounded-xl hover:bg-slate-50 hover:text-emerald-600 active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="刷新列表"
          >
            <RefreshCw class="w-4 h-4" :class="{'animate-spin': isRefreshing}" />
          </button>
          
          <button 
            @click="openAddModal"
            class="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:shadow-emerald-700/30 active:scale-95 transition-all font-bold text-sm"
          >
            <Plus class="w-4 h-4" />
            <span>新建方案模板</span>
          </button>
        </div>
      </div>

      <!-- Template Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="tpl in filteredTemplates" 
          :key="tpl._id"
          class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group relative overflow-hidden cursor-pointer"
          @click="openEditModal(tpl)"
        >
          <!-- Card Header -->
          <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
              <h3 class="font-bold text-slate-900 text-lg mb-2 line-clamp-1">{{ tpl.name }}</h3>
              <div class="flex flex-wrap gap-1.5">
                <span 
                  v-for="tag in tpl.tags" 
                  :key="tag"
                  class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md border border-slate-200"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-4 bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-slate-100">
              <button @click.stop="openEditModal(tpl)" class="p-1.5 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors">
                <Edit2 class="w-4 h-4" />
              </button>
              <button @click.stop="handleDelete(tpl)" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Description -->
          <p class="text-xs text-slate-400 line-clamp-2 mb-6 h-8 leading-relaxed">{{ tpl.description || '暂无描述' }}</p>

          <!-- Products Preview -->
          <div class="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              <span>包含产品 ({{ tpl.products?.length || 0 }})</span>
            </div>
            <div v-for="(prod, idx) in (tpl.products || []).slice(0, 3)" :key="idx" class="flex items-center gap-3 text-xs text-slate-700">
              <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></div>
              <span class="font-bold flex-1 truncate">{{ prod.product_name }}</span>
              <span class="text-slate-400 font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200">{{ prod.daily_usage }}{{ prod.unit }}</span>
            </div>
            <div v-if="(tpl.products?.length || 0) > 3" class="text-[10px] text-slate-400 text-center pt-1 font-bold">
              + 还有 {{ tpl.products.length - 3 }} 个产品
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="closeModal"></div>
      <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden transform transition-all scale-100">
        <!-- Modal Header -->
        <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <h2 class="text-xl font-black text-slate-900">{{ isEditing ? '编辑方案模板' : '创建新方案模板' }}</h2>
          <button @click="closeModal" class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-8 overflow-y-auto custom-scrollbar space-y-6">
          <!-- Basic Info -->
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-2">方案名称</label>
              <input v-model="currentTemplate.name" placeholder="如: 基础代谢增强方案 A" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
            </div>
            
            <div class="grid grid-cols-2 gap-4 items-start">
              <!-- 有效期 -->
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">有效期 (天)</label>
                <input v-model.number="currentTemplate.duration" type="number" min="1" placeholder="如: 30" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
              <!-- 标签 -->
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase mb-2">标签 (Tags)</label>
                <input v-model="tagsInput" @blur="addTag" @keydown.enter.prevent="addTag" placeholder="输入标签按回车添加..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                <div class="flex flex-wrap gap-2 mt-2 max-h-16 overflow-y-auto">
                  <span v-for="(tag, idx) in currentTemplate.tags" :key="idx" class="px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg flex items-center gap-1 border border-emerald-100">
                    {{ tag }}
                    <button @click="removeTag(idx)" class="hover:text-emerald-800">×</button>
                  </span>
                </div>
              </div>
            </div>

            <!-- 适用描述 - 独占一行 -->
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase mb-2">适用描述</label>
              <textarea v-model="currentTemplate.description" placeholder="该方案适用于..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all h-20 resize-none"></textarea>
            </div>
          </div>

          <!-- Product Configuration -->
          <div class="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <div class="flex justify-between items-center mb-4">
              <label class="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <Package class="w-4 h-4" />
                产品组合配置
              </label>
              <button @click="addProductRow" class="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                <Plus class="w-3 h-3" />
                添加产品
              </button>
            </div>
            
            <div class="space-y-3">
              <div v-if="currentTemplate.products.length === 0" class="text-center py-8 text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-xl">
                点击上方按钮添加产品配置
              </div>
              
              <template v-for="(prod, idx) in currentTemplate.products" :key="idx">
                <div class="flex gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm group">
                  <div class="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0">{{ idx + 1 }}</div>
                  
                  <!-- 产品名称 -->
                     <select v-model="prod.product_id" @change="handleProductSelect(prod)" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 h-9 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500">
                       <option value="" disabled>选择产品</option>
                       <option v-for="p in products" :key="p._id" :value="p._id">{{ p.name }}</option>
                     </select>
                  
                  <!-- 用量 -->
                  <div class="w-20">
                    <input v-model.number="prod.daily_usage" type="number" min="1" placeholder="数量" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 h-9 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 text-center" />
                  </div>
                  
                  <!-- 单位 -->
                  <div class="w-20">
                    <select v-model="prod.unit" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 h-9 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500">
                      <option value="粒">粒</option>
                      <option value="片">片</option>
                      <option value="包">包</option>
                      <option value="ml">ml</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                  
                  <!-- 餐别 -->
                  <div class="w-20">
                    <select v-model="prod.timing" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 h-9 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500">
                      <option value="morning">早餐</option>
                      <option value="noon">午餐</option>
                      <option value="dinner">晚餐</option>
                    </select>
                  </div>
                  
                  <!-- 餐前/随餐/餐后 -->
                  <div class="w-16">
                    <select v-model="prod.frequency" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 h-9 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500">
                      <option value="餐前">餐前</option>
                      <option value="随餐">随餐</option>
                      <option value="餐后">餐后</option>
                    </select>
                  </div>
                  
                  <button @click="removeProductRow(idx)" class="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
                
                <!-- 注意事项 -->
                <div v-if="prod.product_name" class="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 -mt-2 mb-2">
                  <input 
                    v-model="prod.instruction" 
                    placeholder="注意事项（如：饭后服用、温水送服等）" 
                    class="w-full bg-transparent text-xs text-slate-600 focus:outline-none"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-8 py-6 border-t border-slate-100 flex gap-4 bg-slate-50/50">
          <button @click="closeModal" class="flex-1 h-12 rounded-xl font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 transition-all">取消</button>
          <button @click="handleSave" class="flex-1 h-12 rounded-xl font-bold text-white bg-emerald-600 shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-700/30 transition-all">保存方案</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { callCloud, getAuthToken } from '@/utils/cloud';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Package,
  Layers,
  RefreshCw
} from 'lucide-vue-next';

interface TemplateProduct {
  product_id: string;
  product_name: string;
  daily_usage: number;
  unit: string;
  timing: 'morning' | 'noon' | 'dinner' | 'bedtime';
  frequency: string;
  instruction: string;
}

interface Template {
  _id: string;
  name: string;
  tags: string[];
  description: string;
  products: TemplateProduct[];
}

// 从云函数获取数据
const templates = ref<Template[]>([]);
const products = ref<any[]>([]);

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timer: any;
  return (...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// 格式化时间
const formatUpdateTime = (timestamp: number) => {
  if (!timestamp) return '从未更新';
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return new Date(timestamp).toLocaleString();
};

// 获取配方数据（支持静默刷新）
const fetchTemplates = async (options?: { silent?: boolean }) => {
  if (!getAuthToken()) return;
  try {
    const res = await callCloud('client-api', {
      action: 'getTemplates'
    });

    if (res.ok) {
      templates.value = (res.data || []).map((template: any) => ({
        _id: template._id,
        name: template.name,
        tags: template.category ? [template.category] : [],
        description: template.description || '',
        products: template.products || template.items || []
      }));
      lastUpdateTime.value = formatUpdateTime(Date.now());
      lastRefreshTimestamp.value = Date.now();
    } else if (!options?.silent) {
      uni.showToast({ title: res.msg || '获取配方失败', icon: 'none' });
    }
  } catch (error) {
    console.error('获取配方失败:', error);
    if (!options?.silent) {
      uni.showToast({ title: '网络异常', icon: 'none' });
    }
  }
};

// 刷新数据（带防重复机制）
const refreshData = async () => {
  if (isRefreshing.value) {
    uni.showToast({ title: '刷新中，请稍候...', icon: 'none' });
    return;
  }
  
  const now = Date.now();
  if (now - lastRefreshTimestamp.value < MIN_REFRESH_INTERVAL) {
    uni.showToast({ title: '操作太频繁', icon: 'none' });
    return;
  }
  
  isRefreshing.value = true;
  
  try {
    await Promise.all([fetchTemplates(), fetchProducts()]);
    uni.showToast({ title: '已更新', icon: 'success', duration: 1000 });
  } finally {
    isRefreshing.value = false;
  }
};

// 静默刷新（后台自动更新，无感知）
const silentRefresh = async () => {
  isRefreshing.value = true;
  try {
    await Promise.all([
      fetchTemplates({ silent: true }),
      fetchProducts({ silent: true })
    ]);
  } finally {
    isRefreshing.value = false;
  }
};

// 获取产品数据（支持静默刷新）
const fetchProducts = async (options?: { silent?: boolean }) => {
  if (!getAuthToken()) return;
  try {
    const res = await callCloud('client-api', {
      action: 'getProducts'
    });

    if (res.ok) {
      products.value = res.data || [];
    }
  } catch (error) {
    console.error('获取产品失败:', error);
    if (!options?.silent) {
      uni.showToast({ title: '获取产品失败', icon: 'none' });
    }
  }
};


const searchQuery = ref('');
const showModal = ref(false);

// 智能刷新状态
const isRefreshing = ref(false);
const lastUpdateTime = ref('');
const lastRefreshTimestamp = ref(0);
const MIN_REFRESH_INTERVAL = 2000; // 2秒内禁止重复刷新
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟自动刷新
const isEditing = ref(false);
const currentTemplate = ref<Template & { duration?: number }>({ _id: '', name: '', tags: [], description: '', duration: 30, products: [] });
const tagsInput = ref('');

let autoRefreshTimer: any = null;

onMounted(() => {
  fetchTemplates();
  fetchProducts();
  
  // 自动刷新（每5分钟静默刷新一次，无感知）
  autoRefreshTimer = setInterval(() => {
    // 只有页面可见时才刷新
    if (document.visibilityState === 'visible') {
      silentRefresh();
    }
  }, AUTO_REFRESH_INTERVAL);
});

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
});

const filteredTemplates = computed(() => {
  if (!searchQuery.value) return templates.value;
  const q = searchQuery.value.toLowerCase();
  return templates.value.filter(t => 
    t.name.toLowerCase().includes(q) || 
    t.tags.some(tag => tag.toLowerCase().includes(q))
  );
});

const openAddModal = () => {
  isEditing.value = false;
  currentTemplate.value = {
    _id: '',
    name: '',
    tags: [],
    description: '',
    duration: 30,
    products: []
  };
  showModal.value = true;
};

const openEditModal = (tpl: Template) => {
  isEditing.value = true;
  // Deep copy to avoid modifying original directly
  currentTemplate.value = JSON.parse(JSON.stringify(tpl));
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  tagsInput.value = '';
};

const addTag = () => {
  if (tagsInput.value.trim() && !currentTemplate.value.tags.includes(tagsInput.value.trim())) {
    currentTemplate.value.tags.push(tagsInput.value.trim());
    tagsInput.value = '';
  }
};

const removeTag = (idx: number) => {
  currentTemplate.value.tags.splice(idx, 1);
};

const addProductRow = () => {
  currentTemplate.value.products.push({
    product_id: '',
    product_name: '',
    daily_usage: 1,
    unit: '粒',
    timing: 'morning',
    frequency: '餐前',
    instruction: ''
  });
};

const removeProductRow = (idx: number) => {
  currentTemplate.value.products.splice(idx, 1);
};

const handleProductSelect = (prod: TemplateProduct) => {
  const selected = products.value.find(p => p._id === prod.product_id);
  if (selected) {
    prod.product_name = selected.name;
  }
};

const handleSave = async () => {
  if (!currentTemplate.value.name) {
    uni.showToast({ title: '请输入方案名称', icon: 'none' });
    return;
  }
  
  try {
    uni.showLoading({ title: '保存中...' });
    
    // 获取用户ID
    const userInfo = getUserInfo();
    const userId = userInfo ? userInfo._id : '';
    
    if (!userId) {
      uni.showToast({ title: '登录状态失效，请重新登录', icon: 'none' });
      return;
    }
    
    const templateData = {
      name: currentTemplate.value.name,
      description: currentTemplate.value.description,
      category: currentTemplate.value.tags[0] || '',
      duration: currentTemplate.value.duration || 30, // 【修复】使用用户输入的有效期
      items: currentTemplate.value.products.map((product, idx) => ({
        product_id: product.product_id || `P${Date.now()}_${idx}`,
        product_name: product.product_name,
        daily_usage: product.daily_usage,
        unit: product.unit,
        timing: product.timing,
        frequency: product.frequency,
        instruction: product.instruction,
        reminder_type: 'notification'
      }))
    };
    
    console.log('保存配方数据:', templateData, '产品数:', currentTemplate.value.products.length);
    
    if (isEditing.value) {
      // 更新配方
      const res = await callCloud('client-api', {
        action: 'updateTemplate',
        payload: {
          id: currentTemplate.value._id,
          ...templateData,
          userId
        }
      });
      
      if (res.code === 0) {
        uni.showToast({ title: '已更新', icon: 'success' });
        await fetchTemplates();
      } else {
        uni.showToast({ title: res.msg || '更新失败', icon: 'none' });
      }
    } else {
      // 创建新配方
      const res = await callCloud('client-api', {
        action: 'createTemplate',
        payload: {
          ...templateData,
          userId
        }
      });
      
      if (res.code === 0) {
        uni.showToast({ title: '已创建', icon: 'success' });
        await fetchTemplates();
      } else {
        uni.showToast({ title: res.msg || '创建失败', icon: 'none' });
      }
    }
    
    uni.hideLoading();
    closeModal();
  } catch (error) {
    uni.hideLoading();
    console.error('保存配方失败:', error);
    uni.showToast({ title: '保存失败', icon: 'none' });
  }
};

const handleDelete = (tpl: Template) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除方案 "${tpl.name}" 吗？此操作不可撤销。`,
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '正在删除...' });
          
          const result = await callCloud('client-api', {
            action: 'deleteTemplate',
            payload: { id: tpl._id }
          });
          
          uni.hideLoading();
          
          if (result.code === 0) {
            templates.value = templates.value.filter(t => t._id !== tpl._id);
            uni.showToast({ title: '已永久删除', icon: 'success' });
          } else {
            uni.showToast({ title: result.msg || '删除失败', icon: 'none' });
          }
        } catch (error) {
          uni.hideLoading();
          console.error('删除配方失败:', error);
          uni.showToast({ title: '网络异常，删除失败', icon: 'none' });
        }
      }
    }
  });
};
</script>
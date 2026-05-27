<template>
  <div class="min-h-screen bg-slate-50 flex font-sans">
    <!-- Sidebar -->
    <Sidebar activeTab="products" />
    
    <!-- Main Content -->
    <div class="flex-1 p-10 pb-24 overflow-y-auto h-screen">
      <!-- Header -->
      <div class="flex justify-between items-end mb-8">
        <div>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight">产品库</h1>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-sm text-slate-500 font-medium">共 {{ products.length }} 个 SKU</span>
            <span class="w-1 h-1 rounded-full bg-slate-300"></span>
            <span class="text-sm text-slate-500">通用产品信息管理</span>
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
              placeholder="搜索产品名称/分类..." 
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
            @click="openImportModal"
            class="flex items-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:shadow-emerald-600/30 active:scale-95 transition-all font-bold text-sm"
          >
            <Download class="w-4 h-4" />
            <span>导入</span>
          </button>
          
          <button 
            @click="openAddModal"
            class="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-slate-900/30 hover:bg-slate-800 hover:shadow-slate-800/30 active:scale-95 transition-all font-bold text-sm"
          >
            <Plus class="w-4 h-4" />
            <span>新增产品</span>
          </button>
        </div>
      </div>

      <!-- Product Data Table -->
      <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <!-- Desktop Table View -->
        <table class="w-full text-left border-collapse hidden lg:table">
          <thead class="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th class="p-5 pl-8 text-xs font-black text-slate-500 uppercase tracking-wider">产品名称</th>
              <th class="p-5 text-xs font-black text-slate-500 uppercase tracking-wider">分类</th>
              <th class="p-5 text-xs font-black text-slate-500 uppercase tracking-wider">规格 (Capacity)</th>
              <th class="p-5 text-xs font-black text-slate-500 uppercase tracking-wider text-right">单价</th>
              <th class="p-5 text-xs font-black text-slate-500 uppercase tracking-wider text-right">添加日期</th>
              <th class="p-5 pr-8 text-xs font-black text-slate-500 uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr 
              v-for="product in filteredProducts" 
              :key="product._id"
              class="hover:bg-slate-50/80 transition-colors group"
            >
              <!-- Product Name -->
              <td class="p-5 pl-8">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-slate-50 text-2xl flex items-center justify-center border border-slate-200 group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-colors">
                    {{ product.icon }}
                  </div>
                  <div>
                    <div class="font-bold text-slate-900">{{ product.name }}</div>
                    <div class="text-xs text-slate-400 mt-0.5">ID: #{{ product._id.slice(-4) }}</div>
                  </div>
                </div>
              </td>
              
              <!-- Category -->
              <td class="p-5">
                <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                  {{ product.category || '未分类' }}
                </span>
              </td>
              
              <!-- Capacity -->
              <td class="p-5">
                <div class="text-sm font-medium text-slate-700">
                  {{ product.capacity }} {{ product.sub_unit }}
                  <span class="text-xs text-slate-400">/ {{ product.unit }}</span>
                </div>
              </td>
              
              <!-- Price -->
              <td class="p-5 text-right">
                <div class="font-bold text-slate-900">¥{{ product.price || 0 }}</div>
              </td>

              <!-- Created Date -->
              <td class="p-5 text-right">
                <div class="text-sm text-slate-600">{{ formatDate(product.created_at) }}</div>
              </td>

              <!-- Actions -->
              <td class="p-5 pr-8 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(product)"
                    class="p-2.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition-all shadow-sm"
                    title="编辑"
                  >
                    <Edit2 class="w-4 h-4" />
                  </button>
                  <button
                    @click="handleDeleteProduct(product)"
                    class="p-2.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200 transition-all shadow-sm"
                    title="删除"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card View -->
      <div class="lg:hidden space-y-3">
        <div 
          v-for="product in filteredProducts" 
          :key="product._id"
          class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <!-- Product Header -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-slate-50 text-2xl flex items-center justify-center border border-slate-200">
                {{ product.icon }}
              </div>
              <div>
                <div class="font-bold text-slate-900 text-lg">{{ product.name }}</div>
                <div class="text-xs text-slate-400">ID: #{{ product._id.slice(-4) }}</div>
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="openEditModal(product)" class="p-2.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200">
                <Edit2 class="w-4 h-4" />
              </button>
              <button @click="handleDeleteProduct(product)" class="p-2.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors border border-rose-200">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Product Details Grid -->
          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-slate-50 p-3 rounded-xl">
              <div class="text-xs text-slate-500 uppercase mb-1">分类</div>
              <div class="text-sm font-medium text-slate-700">{{ product.category || '未分类' }}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl">
              <div class="text-xs text-slate-500 uppercase mb-1">规格</div>
              <div class="text-sm font-medium text-slate-700">{{ product.capacity }} {{ product.sub_unit }} / {{ product.unit }}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl">
              <div class="text-xs text-slate-500 uppercase mb-1">最小购买量</div>
              <div class="text-sm font-medium text-slate-700">{{ product.min_purchase_qty || 1 }} {{ product.unit }}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl">
              <div class="text-xs text-slate-500 uppercase mb-1">单价</div>
              <div class="text-sm font-medium text-slate-700">¥{{ product.price }}</div>
            </div>
            <div class="bg-slate-50 p-3 rounded-xl col-span-2">
              <div class="text-xs text-slate-500 uppercase mb-1">添加日期</div>
              <div class="text-sm font-medium text-slate-700">{{ formatDate(product.created_at) }}</div>
            </div>
          </div>

          <!-- Stock Status -->
          <div class="bg-emerald-50 p-3 rounded-xl">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs text-emerald-600 uppercase mb-1">库存状态</div>
                <div class="text-sm font-medium text-emerald-700">{{ (product.stock || 0) }} {{ product.unit }}</div>
              </div>
              <div class="text-right">
                <div class="text-xs text-slate-500 uppercase mb-1">总价值</div>
                <div class="text-sm font-medium text-slate-700">¥{{ ((product.stock || 0) * product.price).toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <AdminModal
      v-model="showImportModal"
      title="导入产品"
      size="md"
      :showFooter="false"
      @close="closeImportModal"
    >
      <div class="space-y-5">
        <div class="flex items-center justify-between">
          <div class="text-sm text-slate-600">
            请上传 Excel 文件批量导入产品
          </div>
          <button
            @click="downloadTemplate"
            class="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
          >
            <Download class="w-3.5 h-3.5" />
            <span>下载模板</span>
          </button>
        </div>

        <div class="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors">
          <div
            @click="triggerFileUpload"
            class="flex flex-col items-center gap-3 cursor-pointer"
          >
            <div class="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
              <Upload class="w-8 h-8 text-emerald-500" />
            </div>
            <div class="text-sm font-bold text-slate-900">点击上传 Excel 文件</div>
            <div class="text-xs text-slate-400">或拖拽文件到此处</div>
          </div>
        </div>

        <div v-if="selectedFile" class="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <FileText class="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div class="text-sm font-bold text-slate-900">{{ selectedFile.name }}</div>
              <div class="text-xs text-slate-500">{{ formatFileSize(selectedFile.size) }}</div>
            </div>
          </div>
          <button @click="clearFile" class="p-2 text-slate-400 hover:text-rose-500 transition-colors">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div v-if="importProgress > 0 && importProgress < 100" class="space-y-2">
          <div class="flex justify-between text-xs font-bold text-slate-600">
            <span>导入中...</span>
            <span>{{ importProgress }}%</span>
          </div>
          <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 transition-all duration-300" :style="{ width: importProgress + '%' }"></div>
          </div>
        </div>

        <div v-if="importResult" class="space-y-3">
          <div class="flex items-center gap-2 text-sm font-bold" :class="importResult.success ? 'text-emerald-600' : 'text-rose-600'">
            <CheckCircle v-if="importResult.success" class="w-5 h-5" />
            <AlertCircle v-else class="w-5 h-5" />
            {{ importResult.message }}
          </div>
          <div v-if="importResult.details" class="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl">
            {{ importResult.details }}
          </div>
        </div>

        <div class="flex gap-3 pt-4">
          <button
            @click="closeImportModal"
            class="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            取消
          </button>
          <button
            @click="handleImport"
            :disabled="!selectedFile || isImporting"
            class="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isImporting ? '导入中...' : '开始导入' }}
          </button>
        </div>
      </div>
    </AdminModal>

    <!-- Add/Edit Modal - Unified UI -->
    <AdminModal
      v-model="showAddModal"
      :title="isEditing ? '编辑产品' : '新增产品'"
      size="md"
      @confirm="handleSaveProduct"
      @cancel="showAddModal = false"
    >
      <div class="space-y-5">
        <!-- Basic Info Group -->
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">基本信息</label>
            <div class="space-y-3">
              <input v-model="newProduct.name" placeholder="产品名称 (如: 复合维生素)" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              <div class="flex gap-3">
                <input v-model="newProduct.category" placeholder="分类 (如: 维生素)" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                <input v-model="newProduct.icon" placeholder="图标 (💊)" class="w-24 bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-center" />
              </div>
            </div>
          </div>

          <!-- Specs Group -->
          <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
            <label class="block text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Package class="w-3 h-3" />
              规格配置
            </label>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">销售单位 (Unit)</label>
                <input v-model="newProduct.unit" placeholder="如: 瓶" class="w-full bg-white border border-slate-200 rounded-xl px-3 h-10 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">最小购买数量</label>
                <input v-model="newProduct.min_purchase_qty" type="number" placeholder="如: 1" class="w-full bg-white border border-slate-200 rounded-xl px-3 h-10 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">包含数量 (Capacity)</label>
                <input v-model="newProduct.capacity" type="number" placeholder="如: 60" class="w-full bg-white border border-slate-200 rounded-xl px-3 h-10 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 mb-1">子单位 (Sub Unit)</label>
                <input v-model="newProduct.sub_unit" placeholder="如: 粒" class="w-full bg-white border border-slate-200 rounded-xl px-3 h-10 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-2">价格 (¥)</label>
            <input v-model="newProduct.price" type="number" placeholder="0.00" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-12 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
          </div>
        </div>
      </div>
    </AdminModal>
  </div>
</template>

<script setup lang="ts">
import { callCloud } from '@/utils/cloud';
import { getUserInfo } from '@/utils/storage';
import { ref, onMounted, computed } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import AdminModal from '@/components/ui/AdminModal.vue';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Plus, 
  Filter,
  Download,
  RefreshCw,
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Edit2,
  Trash2
} from 'lucide-vue-next';
import { onUnmounted } from 'vue';

interface Product {
  _id: string;
  name: string;
  unit: string;
  icon: string;
  category: string;
  price: number;
  capacity: number;
  sub_unit: string;
  stock?: number;
  min_purchase_qty?: number;
  created_at?: number;
  updated_at?: number;
}

const products = ref<Product[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const showAddModal = ref(false);
const isEditing = ref(false);

// Import modal state
const showImportModal = ref(false);
const selectedFile = ref<File | null>(null);
const isImporting = ref(false);
const importProgress = ref(0);
const importResult = ref<{ success: boolean; message: string; details?: string } | null>(null);

// 智能刷新状态
const isRefreshing = ref(false);
const lastUpdateTime = ref('');
const lastRefreshTimestamp = ref(0);
const MIN_REFRESH_INTERVAL = 2000; // 2秒内禁止重复刷新
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5分钟自动刷新
const newProduct = ref<Partial<Product>>({});
const isSaving = ref(false);

const getApiErrorMessage = (code?: number, msg?: string, fallback = '操作失败') => {
  if (msg) return msg;
  if (code === 400) return '请求参数有误';
  if (code === 401) return '登录状态失效，请重新登录';
  if (code === 403) return '权限不足，无法执行此操作';
  if (code === 404) return '目标数据不存在或已被删除';
  return fallback;
};

const getUserId = () => {
  const userInfo = getUserInfo();
  return userInfo ? userInfo._id : '';
};

const getRuntimeErrorMessage = (err: any, fallback = '操作失败') => {
  const message = err?.message || err?.errMsg || '';
  if (!message) return fallback;
  if (message.includes('Function not found')) return '云函数未部署，请上传 client-api 后重试';
  if (message.includes('collection permission denied')) return '数据库权限受限，请通过云函数操作';
  if (message.includes('request:fail')) return '网络异常，请稍后重试';
  return message;
};

const filteredProducts = computed(() => {
  if (!searchQuery.value) return products.value;
  const q = searchQuery.value.toLowerCase();
  return products.value.filter(p => 
    p.name.toLowerCase().includes(q) || 
    (p.category && p.category.toLowerCase().includes(q))
  );
});

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

// 获取产品列表（支持静默刷新）
const fetchProducts = async (options?: { silent?: boolean }) => {
  if (!options?.silent) {
    loading.value = true;
  }
  
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('登录状态失效，请重新登录');
    }
    const res = await callCloud<any>('client-api', {
      action: 'getProducts',
      payload: { userId }
    });
    if (!res.ok) {
      throw new Error(getApiErrorMessage(res.code, res.msg, '加载失败'));
    }
    products.value = res.data || [];
    lastUpdateTime.value = formatUpdateTime(Date.now());
    lastRefreshTimestamp.value = Date.now();
  } catch (err: any) {
    console.error('Fetch products failed:', err);
    if (!options?.silent) {
      uni.showToast({ title: getRuntimeErrorMessage(err, '加载失败'), icon: 'none' });
    }
  } finally {
    if (!options?.silent) {
      loading.value = false;
    }
  }
};

// 防抖刷新（防止频繁触发）
const debouncedRefresh = debounce(() => {
  refreshData();
}, 500);

// 刷新数据（带防重复机制）
const refreshData = async () => {
  // 检查是否正在刷新
  if (isRefreshing.value) {
    uni.showToast({ title: '刷新中，请稍候...', icon: 'none' });
    return;
  }
  
  // 检查刷新间隔（2秒内禁止重复刷新）
  const now = Date.now();
  if (now - lastRefreshTimestamp.value < MIN_REFRESH_INTERVAL) {
    uni.showToast({ title: '操作太频繁', icon: 'none' });
    return;
  }
  
  isRefreshing.value = true;
  
  try {
    await fetchProducts();
    // 刷新成功提示（静默提示，不打扰用户）
    uni.showToast({ title: '已更新', icon: 'success', duration: 1000 });
  } finally {
    isRefreshing.value = false;
  }
};

// 静默刷新（后台自动更新，无感知）
const silentRefresh = async () => {
  isRefreshing.value = true;
  try {
    await fetchProducts({ silent: true });
  } finally {
    isRefreshing.value = false;
  }
};

const openAddModal = () => {
  isEditing.value = false;
  newProduct.value = {
    icon: '💊',
    unit: '瓶',
    sub_unit: '粒',
    capacity: 60,
    price: 0
  };
  showAddModal.value = true;
};

// Import modal functions
const openImportModal = () => {
  showImportModal.value = true;
  selectedFile.value = null;
  importProgress.value = 0;
  importResult.value = null;
};

const closeImportModal = () => {
  showImportModal.value = false;
  selectedFile.value = null;
  importProgress.value = 0;
  importResult.value = null;
};

const triggerFileUpload = () => {
  // Create a temporary file input element
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls';
  input.onchange = (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      selectedFile.value = file;
      importResult.value = null;
    }
  };
  input.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedFile.value = file;
    importResult.value = null;
  }
};

const clearFile = () => {
  selectedFile.value = null;
  importResult.value = null;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const formatDate = (timestamp?: number) => {
  if (!timestamp) return '未知';
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const downloadTemplate = () => {
  // Create template data with headers and example row
  const templateData = [
    ['产品名称', '分类', '图标', '销售单位', '最小购买量', '包含数量', '子单位', '单价'],
    ['复合维生素', '维生素', '💊', '瓶', 1, 60, '粒', 128],
    ['蛋白粉', '营养补充', '🥛', '罐', 1, 500, '克', 298]
  ];

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '产品导入模板');

  // Set column widths
  worksheet['!cols'] = [
    { wch: 20 }, // 产品名称
    { wch: 12 }, // 分类
    { wch: 8 },  // 图标
    { wch: 10 }, // 销售单位
    { wch: 12 }, // 最小购买量
    { wch: 12 }, // 包含数量
    { wch: 10 }, // 子单位
    { wch: 10 }  // 单价
  ];

  // Generate and download file
  XLSX.writeFile(workbook, '产品导入模板.xlsx');
};

const handleImport = async () => {
  if (!selectedFile.value) {
    uni.showToast({ title: '请选择文件', icon: 'none' });
    return;
  }

  isImporting.value = true;
  importProgress.value = 0;
  importResult.value = null;

  try {
    // Read Excel file
    const arrayBuffer = await selectedFile.value.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (jsonData.length < 2) {
      throw new Error('Excel 文件为空或格式不正确');
    }

    // Extract header and data
    const headers = jsonData[0].map((h: any) => String(h).trim());
    const dataRows = jsonData.slice(1);

    // Map headers to product fields
    const headerMap: { [key: string]: string } = {
      '产品名称': 'name',
      '分类': 'category',
      '图标': 'icon',
      '销售单位': 'unit',
      '最小购买量': 'min_purchase_qty',
      '包含数量': 'capacity',
      '子单位': 'sub_unit',
      '单价': 'price'
    };

    // Parse products
    const productsToImport: Partial<Product>[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;

      const product: any = {};
      let hasError = false;

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const field = headerMap[header];
        const value = row[j];

        if (!field) continue;

        if (field === 'price' || field === 'capacity' || field === 'min_purchase_qty') {
          product[field] = Number(value) || 0;
        } else {
          product[field] = String(value || '').trim();
        }

        // Validation
        if (field === 'name' && !product[field]) {
          hasError = true;
          errors.push(`第 ${i + 2} 行：产品名称不能为空`);
        }
        if (field === 'price' && (isNaN(product[field]) || product[field] < 0)) {
          hasError = true;
          errors.push(`第 ${i + 2} 行：单价必须是有效数字`);
        }
      }

      if (!hasError && product.name) {
        // Set defaults
        product.icon = product.icon || '💊';
        product.unit = product.unit || '瓶';
        product.sub_unit = product.sub_unit || '粒';
        product.capacity = product.capacity || 60;
        product.price = product.price || 0;
        product.min_purchase_qty = product.min_purchase_qty || 1;
        productsToImport.push(product);
      }
    }

    if (productsToImport.length === 0) {
      throw new Error('没有有效的产品数据');
    }

    if (errors.length > 0) {
      importResult.value = {
        success: false,
        message: `发现 ${errors.length} 个错误`,
        details: errors.slice(0, 5).join('\n') + (errors.length > 5 ? `\n...还有 ${errors.length - 5} 个错误` : '')
      };
      isImporting.value = false;
      return;
    }

    // Import products one by one
    const userId = getUserId();
    if (!userId) {
      throw new Error('登录状态失效，请重新登录');
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < productsToImport.length; i++) {
      try {
        const product = productsToImport[i];
        const res = await callCloud('client-api', {
          action: 'addProduct',
          payload: {
            ...product,
            userId,
            updated_at: Date.now()
          }
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error('Import product failed:', err);
        failCount++;
      }

      // Update progress
      importProgress.value = Math.round(((i + 1) / productsToImport.length) * 100);
    }

    // Refresh product list
    await fetchProducts();

    // Show result
    if (failCount === 0) {
      importResult.value = {
        success: true,
        message: `成功导入 ${successCount} 个产品`,
        details: ''
      };
    } else {
      importResult.value = {
        success: false,
        message: `导入完成：成功 ${successCount} 个，失败 ${failCount} 个`,
        details: '部分产品导入失败，请检查数据格式后重试'
      };
    }

    // Auto close after 2 seconds if successful
    if (failCount === 0) {
      setTimeout(() => {
        closeImportModal();
      }, 2000);
    }
  } catch (err: any) {
    console.error('Import failed:', err);
    importResult.value = {
      success: false,
      message: '导入失败',
      details: err.message || '未知错误'
    };
  } finally {
    isImporting.value = false;
  }
};

const openEditModal = (product: Product) => {
  isEditing.value = true;
  newProduct.value = { ...product };
  showAddModal.value = true;
};

const handleSaveProduct = async () => {
  if (!newProduct.value.name) {
    uni.showToast({ title: '请输入产品名称', icon: 'none' });
    return;
  }
  
  isSaving.value = true;
  try {
    const userId = getUserId();
    if (!userId) {
      throw new Error('登录状态失效，请重新登录');
    }
    
    const productData = {
      ...newProduct.value,
      price: Number(newProduct.value.price) || 0,
      capacity: Number(newProduct.value.capacity) || 0,
      min_purchase_qty: Number(newProduct.value.min_purchase_qty) || 1,
      updated_at: Date.now(),
      created_at: isEditing.value ? newProduct.value.created_at : Date.now()
    };

    console.log('🔧 准备保存产品，用户ID:', userId);
    console.log('📋 产品数据:', productData);

    if (isEditing.value && newProduct.value._id) {
      console.log('🔄 更新产品模式');
      const productId = newProduct.value._id;
      const { _id, ...updates } = productData;
      const res = await callCloud('client-api', {
        action: 'updateProduct',
        payload: {
          id: productId,
          ...updates,
          userId
        }
      });
      console.log('📊 云函数返回结果:', res);
      
      if (!res.ok) {
        throw new Error(getApiErrorMessage(res.code, res.msg, '保存失败'));
      }
      uni.showToast({ title: '已更新', icon: 'success' });
    } else {
      console.log('➕ 添加新产品模式');
      
      // 先测试简单的云函数调用
      console.log('🧪 测试云函数连接...');
      try {
        const testResult = await uniCloud.callFunction({
          name: 'client-api',
          data: {
            action: 'getProducts'
          }
        });
        console.log('🧪 测试调用结果:', testResult);
      } catch (testError) {
        console.error('🧪 测试调用失败:', testError);
      }
      
      try {
        const res = await callCloud('client-api', {
          action: 'addProduct',
          payload: {
            ...productData,
            userId
          }
        });
        console.log('📊 云函数返回结果:', res);
        
        if (!res.ok) {
          throw new Error(getApiErrorMessage(res.code, res.msg, '保存失败'));
        }
        
        // 产品添加成功，显示成功提示
        uni.showToast({ title: '已添加', icon: 'success' });
        
        console.log('🎉 产品添加成功，准备清理和返回');
        
        // 使用 setTimeout 避免可能的同步问题
        if (addModalTimer) clearTimeout(addModalTimer);
        addModalTimer = setTimeout(() => {
          try {
            showAddModal.value = false;
            console.log('✅ 弹窗已关闭');
            
            // 异步刷新产品列表
            fetchProducts().catch(err => {
              console.error('🔄 异步刷新产品列表失败:', err);
            });
          } catch (err) {
            console.error('🚪 关闭弹窗时出错:', err);
          }
        }, 100);
        
        return; // 成功完成，直接返回
      } catch (callError) {
        console.error('💥 云函数调用异常:', callError);
        console.error('💥 错误详情:', JSON.stringify(callError, null, 2));
        throw callError;
      }
    }
  } catch (err: any) {
    console.error('💥 保存产品失败:', err);
    uni.showToast({ title: getRuntimeErrorMessage(err, '保存失败'), icon: 'none' });
  } finally {
    isSaving.value = false;
  }
};

const handleDeleteProduct = (product: Product) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${product.name} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const userId = getUserId();
          if (!userId) {
            throw new Error('登录状态失效，请重新登录');
          }
          const res = await callCloud('client-api', {
            action: 'deleteProduct',
            payload: {
              id: product._id,
              userId
            }
          });
          if (!res.ok) {
            throw new Error(getApiErrorMessage(res.code, res.msg, '删除失败'));
          }
          await fetchProducts();
          uni.showToast({ title: '已删除', icon: 'success' });
        } catch (err) {
          console.error('Delete product failed:', err);
          uni.showToast({ title: getRuntimeErrorMessage(err, '删除失败'), icon: 'none' });
        }
      }
    }
  });
};

let addModalTimer: any = null;
let autoRefreshTimer: any = null;

onMounted(() => {
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
  if (addModalTimer) clearTimeout(addModalTimer);
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
});
</script>

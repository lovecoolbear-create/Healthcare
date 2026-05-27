<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <header class="bg-white px-4 py-3 flex items-center gap-3 border-b border-slate-200 sticky top-0 z-10">
      <button 
        @click="uni.navigateBack()" 
        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
      >
        <ChevronLeft class="w-5 h-5 text-slate-600" />
      </button>
      <h1 class="text-lg font-bold text-slate-800">{{ isNew ? '创建新方案' : '编辑方案' }}</h1>
    </header>

    <!-- Content -->
    <main class="p-4 space-y-4">
      <!-- 方案信息 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm">
        <h2 class="text-lg font-bold text-slate-800 mb-4">方案信息</h2>
        <div class="space-y-3">
          <div>
            <label class="text-xs font-bold text-slate-500 mb-1 block">方案名称</label>
            <input 
              v-model="protocolForm.name" 
              type="text" 
              class="w-full px-3 py-2 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="输入方案名称"
            />
          </div>
        </div>
      </div>

      <!-- 产品列表 -->
      <div class="bg-white rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-slate-800">方案产品</h2>
          <button 
            @click="showProductSelector = true"
            class="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors"
          >
            + 添加产品
          </button>
        </div>

        <div v-if="protocolForm.items.length === 0" class="py-8 text-center text-slate-400">
          <Package class="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p class="text-sm font-bold">暂无产品</p>
          <p class="text-xs mt-1">点击上方按钮添加产品</p>
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="(item, index) in protocolForm.items" 
            :key="index"
            class="p-4 bg-slate-50 rounded-xl border border-slate-200"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="font-bold text-slate-800 text-sm">{{ item.product_name }}</h3>
                <div class="mt-2 space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-500">用量:</span>
                    <input 
                      v-model="item.daily_usage" 
                      type="number" 
                      class="w-20 px-2 py-1 bg-white rounded text-sm border border-slate-200"
                    />
                    <input 
                      v-model="item.unit" 
                      type="text" 
                      class="w-16 px-2 py-1 bg-white rounded text-sm border border-slate-200"
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-500">频率:</span>
                    <input 
                      v-model="item.frequency" 
                      type="text" 
                      class="flex-1 px-2 py-1 bg-white rounded text-sm border border-slate-200"
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-500">服用时间:</span>
                    <input 
                      v-model="item.timing" 
                      type="text" 
                      class="flex-1 px-2 py-1 bg-white rounded text-sm border border-slate-200"
                    />
                  </div>
                </div>
              </div>
              <button 
                @click="removeItem(index)"
                class="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 保存按钮 -->
      <button 
        @click="saveProtocol"
        :disabled="saving"
        class="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ saving ? '保存中...' : '保存方案' }}
      </button>
    </main>

    <!-- 产品选择弹窗 -->
    <uni-popup v-if="showProductSelector" type="bottom" @close="showProductSelector = false">
      <div class="bg-white rounded-t-3xl max-h-[70vh] overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 class="font-bold text-slate-800">选择产品</h3>
          <button @click="showProductSelector = false" class="p-2 hover:bg-slate-100 rounded-lg">
            <X class="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div class="p-4 overflow-y-auto max-h-[50vh]">
          <div v-if="productsLoading" class="py-8 text-center text-slate-400">
            <div class="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p class="text-sm">加载中...</p>
          </div>
          <div v-else-if="availableProducts.length === 0" class="py-8 text-center text-slate-400">
            <Package class="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p class="text-sm">暂无可用产品</p>
          </div>
          <div v-else class="space-y-2">
            <button
              v-for="product in availableProducts"
              :key="product._id"
              @click="addProduct(product)"
              class="w-full p-4 bg-slate-50 rounded-xl text-left hover:bg-slate-100 transition-colors flex items-center gap-3"
            >
              <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Package class="w-5 h-5 text-emerald-600" />
              </div>
              <div class="flex-1">
                <h4 class="font-bold text-slate-800 text-sm">{{ product.name }}</h4>
                <p v-if="product.description" class="text-xs text-slate-500 mt-0.5">{{ product.description }}</p>
              </div>
              <Plus class="w-5 h-5 text-emerald-500" />
            </button>
          </div>
        </div>
      </div>
    </uni-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { ChevronLeft, Package, Trash2, X, Plus } from 'lucide-vue-next';
import { callCloud } from '@/utils/cloud';

// 扩展 Window 接口以支持 uni
declare global {
  interface Window {
    uni: any;
  }
}

// --- Types ---
interface ProtocolItem {
  product_id: string;
  product_name: string;
  daily_usage: number;
  unit: string;
  frequency: string;
  timing: string;
  instruction?: string;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
}

// --- State ---
const clientId = ref('');
const protocolId = ref(''); // 当前编辑的方案ID
const isNew = ref(false); // 是否为创建新方案模式
const protocolForm = ref({
  name: '',
  items: [] as ProtocolItem[]
});
const saving = ref(false);
const showProductSelector = ref(false);
const availableProducts = ref<Product[]>([]);
const productsLoading = ref(false);

// --- Lifecycle ---
onLoad((options: any) => {
  if (options.clientId) {
    clientId.value = options.clientId;
    
    // 判断是创建新方案还是编辑现有方案
    if (options.isNew === 'true') {
      isNew.value = true;
      // 清空表单，准备创建新方案
      protocolForm.value.name = '';
      protocolForm.value.items = [];
      loadProducts(); // 只加载产品列表，不加载现有方案
    } else {
      isNew.value = false;
      loadProtocolData(); // 加载现有方案数据
    }
  }
});

// 监听编辑数据事件
onMounted(() => {
  uni.$on('protocol-data-for-edit', (data: any) => {
    if (data.clientId === clientId.value && data.protocol) {
      protocolForm.value.name = data.protocol.name || '';
      // 转换 products 或 items 到编辑格式
      const items = data.protocol.items || data.protocol.products || [];
      protocolForm.value.items = items.map((item: any) => ({
        product_id: item.product_id || item._id || '',
        product_name: item.product_name || item.name || '',
        daily_usage: item.daily_usage || 1,
        unit: item.unit || '粒',
        frequency: item.frequency || '每日一次',
        timing: item.timing || '饭后',
        instruction: item.instruction || ''
      }));
    }
  });
});

// --- Methods ---
const loadProtocolData = async () => {
  try {
    const res = await callCloud('client-api', {
      action: 'getClientDetail',
      payload: { clientId: clientId.value }
    });
    
    if (res.ok && res.data && (res.data as any).protocol) {
      const protocol = (res.data as any).protocol;
      protocolForm.value.name = protocol.name || '';
      
      // 从 phases 中提取产品
      if (protocol.phases && protocol.phases.length > 0) {
        const products = protocol.phases[0].products || [];
        protocolForm.value.items = products.map((p: any) => ({
          product_id: p.product_id || '',
          product_name: p.name || '',
          daily_usage: parseInt(p.dosage) || 1,
          unit: p.dosage?.replace(/\d/g, '') || '粒',
          frequency: p.frequency || '每日一次',
          timing: '饭后',
          instruction: ''
        }));
      }
    }
  } catch (err) {
    console.error('加载方案失败:', err);
    uni.showToast({ title: '加载失败', icon: 'none' });
  }
};

const loadProducts = async () => {
  availableProducts.value = [];
  productsLoading.value = true;
  try {
    const res = await callCloud('client-api', {
      action: 'getProducts',
      payload: {}
    });
    
    if (res.ok) {
      availableProducts.value = res.data || [];
    }
  } catch (err) {
    console.error('加载产品失败:', err);
  } finally {
    productsLoading.value = false;
  }
};

const addProduct = (product: Product) => {
  protocolForm.value.items.push({
    product_id: product._id,
    product_name: product.name,
    daily_usage: 1,
    unit: '粒',
    frequency: '每日一次',
    timing: '饭后',
    instruction: ''
  });
  showProductSelector.value = false;
  uni.showToast({ title: '已添加', icon: 'success' });
};

const removeItem = (index: number) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个产品吗？',
    success: (res) => {
      if (res.confirm) {
        protocolForm.value.items.splice(index, 1);
      }
    }
  });
};

const saveProtocol = async () => {
  if (!protocolForm.value.name.trim()) {
    uni.showToast({ title: '请输入方案名称', icon: 'none' });
    return;
  }
  
  if (protocolForm.value.items.length === 0) {
    uni.showToast({ title: '请至少添加一个产品', icon: 'none' });
    return;
  }
  
  saving.value = true;
  try {
    // 转换为后端期望的格式
    const items = protocolForm.value.items.map(item => ({
      product_id: item.product_id,
      product_name: item.product_name,
      daily_usage: item.daily_usage,
      unit: item.unit,
      frequency: item.frequency,
      timing: item.timing,
      instruction: item.instruction,
      completed: false
    }));
    
    const res = await callCloud('client-api', {
      action: 'updateDailyPlan',
      payload: {
        user_id: clientId.value,
        date: new Date().toISOString().split('T')[0],
        template_name: protocolForm.value.name,
        tasks: items
      }
    });
    
    if (res.ok) {
      uni.showToast({ title: '保存成功', icon: 'success' });
      // 触发刷新事件
      uni.$emit('client-protocol-updated', { clientId: clientId.value });
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    } else {
      uni.showToast({ title: res.msg || '保存失败', icon: 'none' });
    }
  } catch (err) {
    console.error('保存失败:', err);
    uni.showToast({ title: '保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
};

// 打开产品选择器时加载产品
watch(showProductSelector, (val: boolean) => {
  if (val) {
    loadProducts();
  }
});
</script>

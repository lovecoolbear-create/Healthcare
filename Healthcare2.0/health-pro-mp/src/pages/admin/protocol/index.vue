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
          <h1 class="text-xl font-bold text-slate-900">制定健康方案</h1>
        </div>
        <button @click="saveProtocol" class="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600">
          保存方案
        </button>
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
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">制定健康方案</h1>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-sm text-slate-500 font-medium">客户: {{ clientName }}</span>
              <span class="w-1 h-1 rounded-full bg-slate-300"></span>
              <span class="text-sm text-slate-500">个性化方案制定</span>
            </div>
          </div>
        </div>
        <button @click="saveProtocol" class="px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
          保存方案
        </button>
      </div>
      <!-- #endif -->

      <!-- Content -->
      <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
        <h2 class="text-lg font-semibold text-slate-900 mb-4">方案详情</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">方案名称</label>
            <input v-model="protocol.name" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="例如：基础营养补充方案">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">方案描述</label>
            <textarea v-model="protocol.description" rows="3" class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="方案说明和注意事项"></textarea>
          </div>
          
          <div class="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <label class="block text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <span>⏰</span>
              <span>方案启用时间</span>
              <span class="text-xs font-normal text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">重要</span>
            </label>
            <div class="flex gap-4">
              <div class="flex-1">
                <label class="block text-xs text-emerald-700 mb-1">生效日期</label>
                <input 
                  v-model="protocol.start_date" 
                  type="date" 
                  class="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-900 font-medium"
                >
              </div>
              <div class="flex-1">
                <label class="block text-xs text-emerald-700 mb-1">结束日期（可选）</label>
                <input 
                  v-model="protocol.end_date" 
                  type="date" 
                  class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  :min="protocol.start_date"
                >
              </div>
            </div>
            <p class="mt-2 text-xs text-emerald-600">
              <span v-if="isFutureStart">
                📢 该方案将在 <strong>{{ formatDate(protocol.start_date) }}</strong> 自动生效，客户会提前收到通知
              </span>
              <span v-else>
                📢 该方案将在保存后立即生效
              </span>
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">产品清单（将同步到客户打卡任务）</label>
            <div class="space-y-3">
              <div v-for="(item, index) in protocol.items" :key="index" class="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div class="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label class="block text-xs text-slate-600 mb-1">选择产品</label>
                    <select :value="item.product_id" @change="item.product_id = ($event.target as HTMLSelectElement).value; onProductSelect(index)" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="">请选择产品</option>
                      <option v-for="product in products" :key="product._id" :value="product._id">
                        {{ product.name }} ({{ product.capacity }}{{ product.unit }})
                      </option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-slate-600 mb-1">每日用量</label>
                    <div class="flex gap-2">
                      <input v-model="item.daily_usage" type="number" class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="1">
                      <span class="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">{{ getSelectedProductUnit(index) }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label class="block text-xs text-slate-600 mb-1">服用时间</label>
                    <select :value="item.timing" @change="item.timing = ($event.target as HTMLSelectElement).value" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="morning">早晨</option>
                      <option value="afternoon">下午</option>
                      <option value="evening">晚上</option>
                      <option value="before_meal">饭前</option>
                      <option value="after_meal">饭后</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-slate-600 mb-1">提醒方式</label>
                    <select :value="item.reminder_type" @change="item.reminder_type = ($event.target as HTMLSelectElement).value" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="notification">推送通知</option>
                      <option value="message">短信提醒</option>
                      <option value="both">两者都提醒</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label class="block text-xs text-slate-600 mb-1">备注说明</label>
                  <input v-model="item.notes" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="例如：温水送服，避免空腹">
                </div>
                
                <button @click="removeItem(index)" class="mt-3 w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium">
                  删除此产品
                </button>
              </div>
              
              <button @click="addItem" class="w-full py-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 text-sm font-medium border border-emerald-200">
                + 添加产品
              </button>
            </div>
          </div>
        </div>
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

interface Product {
  _id: string;
  name: string;
  capacity: number;
  unit: string;
  price: number;
  stock: number;
}

interface ProtocolItem {
  product_id: string;
  product_name: string;
  daily_usage: number;
  timing: string;
  reminder_type: string;
  notes: string;
}

const products = ref<Product[]>([]);
const clientId = ref('');
const clientName = ref('');

const protocol = ref({
  name: '',
  description: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  items: [
    { 
      product_id: '',
      product_name: '', 
      daily_usage: 1, 
      timing: 'morning',
      reminder_type: 'notification',
      notes: ''
    }
  ]
});

onLoad((options: any) => {
  console.log('🔧 方案制定页面加载，参数:', options);
  
  // 检查用户登录状态
  const userInfo = getUserInfo();
  console.log('👤 页面加载时检查用户信息:', userInfo);
  
  if (!userInfo || !userInfo._id) {
    console.log('❌ 用户未登录，跳转到登录页');
    uni.reLaunch({
      url: '/pages/common/login/index'
    });
    return;
  }
  
  if (options?.clientId) {
    clientId.value = options.clientId;
    console.log('📋 客户ID:', clientId.value);
  }
  
  fetchProducts();
});

const fetchProducts = async () => {
  if (!getAuthToken()) return;
  try {
    console.log(' 获取产品列表...');

    const res = await callCloud('client-api', {
      action: 'getProducts'
    });

    console.log('📊 产品列表返回结果:', res);

    if (res.ok) {
      products.value = res.data || [];
      console.log('✅ 产品列表加载成功，数量:', products.value.length);
    } else {
      console.log('❌ 获取产品列表失败:', res.msg);
      uni.showToast({ title: res.msg || '获取产品失败', icon: 'none' });
    }
  } catch (error) {
    console.error('💥 获取产品列表异常:', error);
    uni.showToast({ title: '网络异常，请重试', icon: 'none' });
  }
};

const onProductSelect = (index: number) => {
  const productId = protocol.value.items[index].product_id;
  const product = products.value.find(p => p._id === productId);
  
  if (product) {
    protocol.value.items[index].product_name = product.name;
  } else {
    protocol.value.items[index].product_name = '';
  }
};

const getSelectedProductUnit = (index: number) => {
  const productId = protocol.value.items[index].product_id;
  const product = products.value.find(p => p._id === productId);
  return product ? product.unit : '粒';
};

const today = new Date().toISOString().split('T')[0];

const isFutureStart = computed(() => {
  if (!protocol.value.start_date) return false;
  return protocol.value.start_date > today;
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const goBack = () => {
  // 检查是否有任何修改
  if (hasAnyChanges()) {
    uni.showModal({
      title: '确认返回',
      content: '您有未保存的修改，是否保存？',
      showCancel: true,
      cancelText: '取消',
      confirmText: '保存',
      success: (res) => {
        if (res.confirm) {
          // 保存方案
          saveProtocol();
        } else if (res.cancel) {
          // 不保存，直接返回
          uni.navigateBack();
        }
        // 用户点击取消不做任何操作
      }
    });
  } else {
    // 无任何修改，直接返回
    uni.navigateBack();
  }
};

const hasAnyChanges = () => {
  // 检查是否有任何输入或选择
  if (protocol.value.name.trim()) return true;
  if (protocol.value.description.trim()) return true;
  if (protocol.value.start_date) return true;
  if (protocol.value.end_date) return true;
  
  // 检查是否有任何产品被选择或有输入
  const hasProductChanges = protocol.value.items.some(item => 
    item.product_id || 
    item.daily_usage !== 1 || 
    item.timing !== 'morning' || 
    item.reminder_type !== 'notification' || 
    item.notes.trim()
  );
  
  return hasProductChanges;
};

const addItem = () => {
  protocol.value.items.push({ 
    product_id: '',
    product_name: '', 
    daily_usage: 1, 
    timing: 'morning',
    reminder_type: 'notification',
    notes: ''
  });
};

const removeItem = (index: number) => {
  protocol.value.items.splice(index, 1);
};

const saveProtocol = async () => {
  console.log('🔧 开始保存方案');
  console.log('📋 方案数据:', protocol.value);
  console.log('👤 客户ID:', clientId.value);
  
  if (!protocol.value.name.trim()) {
    console.log('❌ 方案名称为空');
    uni.showToast({ title: '请输入方案名称', icon: 'none' });
    return;
  }
  
  if (!clientId.value) {
    console.log('❌ 客户ID为空');
    uni.showToast({ title: '客户信息错误', icon: 'none' });
    return;
  }

  try {
    console.log('🚀 调用云函数保存方案...');
    
    const userInfo = getUserInfo();
    
    const res = await callCloud('client-api', {
      action: 'saveProtocol',
      payload: {
        userId: userInfo?._id || userInfo?.id,
        user_id: clientId.value,
        protocol: {
          ...protocol.value,
          status: 'active',
          created_at: Date.now(),
          updated_at: Date.now()
        }
      }
    });

    console.log('📊 云函数返回结果:', res);

    if (res.ok) {
      console.log('✅ 方案保存成功');
      
      uni.showModal({
        title: '保存成功',
        content: '方案已保存，是否同步到小程序客户端？',
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
    } else {
      console.log('❌ 保存失败:', res.msg);
      uni.showToast({ title: res.msg || '保存失败', icon: 'none' });
    }
  } catch (error) {
    console.error('💥 保存方案时发生错误:', error);
    uni.showToast({ title: '网络错误，请重试', icon: 'none' });
  }
};

const syncToClient = async () => {
  try {
    console.log('🔄 开始同步到小程序客户端...');
    
    // 这里可以添加推送通知的逻辑
    // 比如给客户发送推送通知，告知有新的健康方案
    
    uni.showToast({ title: '同步成功', icon: 'success' });
    
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
    
  } catch (error) {
    console.error('💥 同步失败:', error);
    uni.showToast({ title: '同步失败，但方案已保存', icon: 'none' });
  }
};
</script>

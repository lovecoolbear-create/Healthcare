<template>
  <view class="mp-page-shell min-h-screen bg-slate-50 pb-24">
    <!-- Header -->
    <view class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md px-6 pt-12 pb-3 border-b border-slate-100">
      <view class="flex items-center h-10 gap-3">
        <view @click="goBack" class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center active:bg-slate-100 transition-colors mp-pressable">
          <text class="text-slate-500 text-lg">←</text>
        </view>
        <text class="text-lg font-black text-slate-800">我的健康方案列表</text>
      </view>
    </view>

    <!-- 占位高度 -->
    <view class="h-28"></view>

    <view class="px-6 space-y-6">
      <!-- 营养师卡片 -->
      <view class="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-50 relative overflow-hidden">
        <view class="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-3xl opacity-5 -translate-y-1/2 translate-x-1/2"></view>
        
        <text class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 block">我的专属营养师</text>
        <view v-if="nutritionist" class="flex items-center gap-4">
          <view class="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl font-black text-emerald-600 border-2 border-white shadow-sm overflow-hidden">
            {{ nutritionist.username ? nutritionist.username[0] : 'Dr' }}
          </view>
          <view class="flex-1">
            <text class="text-lg font-black text-slate-900 mb-0.5 block">{{ nutritionist.username || '营养顾问' }}</text>
            <text class="text-xs text-slate-400 font-medium block">专业营养干预专家</text>
          </view>
          <button @click="contactNutritionist" class="px-4 py-2 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-xl border border-emerald-100 mp-pressable">
            咨询
          </button>
        </view>
        <view v-else class="flex items-center gap-4 py-2">
          <view class="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
            👤
          </view>
          <text class="text-sm text-slate-400 font-medium">暂未分配营养师</text>
        </view>
      </view>

      <!-- 方案计划列表（支持多个并行方案，如减肥+睡眠） -->
      <view class="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/40 border border-slate-50 relative overflow-hidden">
        <view class="flex items-center justify-between mb-4">
          <text class="text-xs font-bold text-slate-400 uppercase tracking-widest">我的健康方案</text>
          <text v-if="protocols.length > 1" class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full">
            共 {{ protocols.length }} 个方案
          </text>
        </view>
        
        <view v-if="loading" class="py-12 flex flex-col items-center justify-center">
          <view class="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3"></view>
          <text class="text-xs text-slate-400 font-bold">正在获取健康方案...</text>
        </view>

        <!-- 多个方案卡片列表 -->
        <view v-else-if="protocols.length > 0" class="space-y-4">
          <view 
            v-for="(protocol, pIndex) in protocols" 
            :key="pIndex"
            class="p-4 bg-slate-50 rounded-2xl border border-slate-100"
          >
            <!-- 方案标题 -->
            <view class="flex items-center justify-between mb-3">
              <view class="flex items-center gap-2">
                <text class="text-sm font-bold text-slate-900">{{ protocol.name || '健康方案 ' + (pIndex + 1) }}</text>
                <!-- 序号提示 -->
                <text class="text-[10px] text-slate-400">({{ pIndex + 1 }}/{{ protocols.length }})</text>
                <!-- 状态标签 -->
                <text 
                  v-if="protocol.status === 'cancelled'" 
                  class="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded"
                >
                  暂停中
                </text>
                <text 
                  v-else-if="protocol.status === 'active' || !protocol.status" 
                  class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded"
                >
                  执行中
                </text>
              </view>
              <text v-if="protocol.type" class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                {{ protocol.type }}
              </text>
            </view>
            
            <!-- 方案物品列表 -->
            <view v-if="protocol.items && protocol.items.length > 0" class="space-y-3">
              <view 
                v-for="(item, index) in protocol.items" 
                :key="index" 
                class="p-3 bg-white rounded-xl border border-slate-100 flex items-start gap-3"
              >
                <view class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-lg border border-slate-100 shadow-sm">
                  💊
                </view>
                <view class="flex-1">
                  <text class="text-sm font-bold text-slate-900 block">{{ item.product_name || item.name }}</text>
                  <text class="text-xs text-slate-500 leading-relaxed block">{{ item.instruction || '按需服用' }}</text>
                  <view class="mt-1 flex items-center gap-2">
                    <text class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">
                      {{ item.daily_usage }} {{ item.unit || '次' }}/日
                    </text>
                  </view>
                </view>
              </view>
            </view>
            <view v-else class="py-4 text-center">
              <text class="text-xs text-slate-400">该方案暂无具体项目</text>
            </view>
          </view>
        </view>
        
        <!-- 无方案状态 -->
        <view v-else class="py-12 flex flex-col items-center justify-center text-slate-300">
          <view class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
            <text class="text-3xl grayscale opacity-30">📋</text>
          </view>
          <text class="text-sm font-bold text-slate-400">暂无生效中的健康方案</text>
          <text class="text-xs text-slate-300 mt-1">请联系您的营养师为您制定</text>
        </view>
      </view>

      <!-- 温馨提示 -->
      <view class="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-start gap-3">
        <text class="text-lg">💡</text>
        <text class="text-[11px] text-amber-700 leading-relaxed font-medium">
          请严格按照方案执行，如有身体不适或特殊情况，请及时通过“咨询”按钮联系您的营养师进行方案调整。
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { callCloud } from '@/utils/cloud';

const nutritionist = ref<any>(null);
const protocol = ref<any>(null);
const protocols = ref<any[]>([]); // 支持多个并行方案（如减肥+睡眠）
const loading = ref(false);

const goBack = () => {
  uni.navigateBack();
};

const contactNutritionist = () => {
  uni.navigateTo({ url: '/pages/client/messages/index' });
};

const fetchData = async () => {
  loading.value = true;
  try {
    // 获取当前登录用户信息
    const userInfo = getUserInfo();
    const userId = userInfo?._id || userInfo?.id || uni.getStorageSync('userId');
    const phone = userInfo?.phone || userInfo?.mobile || uni.getStorageSync('phone');
    
    console.log('🔍 获取方案 - userId:', userId);
    console.log('🔍 获取方案 - phone:', phone);
    console.log('🔍 获取方案 - userInfo:', userInfo);
    
    if (!userId && !phone) {
      console.error('❌ 未找到用户ID和手机号');
      loading.value = false;
      return;
    }
    
    const res = await callCloud('client-api', {
      action: 'getProtocolInfo',
      payload: { userId, phone }
    });
    
    console.log('📊 获取方案结果:', res);
    console.log('📊 res.code:', res.code);
    console.log('📊 res.ok:', res.ok);
    console.log('📊 res.data:', res.data);
    
    // 支持 code: 0 或 ok: true 两种响应格式
    const isSuccess = res.code === 0 || res.ok === true;
    
    if (isSuccess && res.data) {
      // 支持多个并行方案（如减肥+睡眠）
      let allProtocols: any[] = [];
      
      // 检查返回的数据结构
      const data = res.data;
      console.log('📊📊📊 FULL DATA:', JSON.stringify(data));
      console.log('📊 data.protocols:', data.protocols);
      console.log('📊 data.protocol:', data.protocol);
      console.log('📊 data keys:', Object.keys(data || {}));
      
      if (data.protocols && Array.isArray(data.protocols) && data.protocols.length > 0) {
        // API 返回多个方案
        allProtocols = data.protocols;
        console.log('✅ 使用 protocols 数组，长度:', allProtocols.length);
      } else if (data.protocol) {
        // API 只返回单个方案，转换为数组
        allProtocols = [data.protocol];
        console.log('✅ 使用单个 protocol');
      } else {
        console.warn('⚠️ 响应中没有找到 protocols 或 protocol');
      }
      
      console.log('📊📊📊 allProtocols 完整内容:', JSON.stringify(allProtocols.map(p => ({name: p.name, status: p.status, items: p.items?.length}))));
      console.log('📊 所有方案数量:', allProtocols.length);
      console.log('📊 所有方案名称:', allProtocols.map(p => p.name));
      
      // 不过滤，直接赋值所有方案
      protocols.value = allProtocols;
      console.log('�📊📊 最终 protocols.value:', protocols.value.length, '个方案:', protocols.value.map(p => p.name));
      
      // 保持向后兼容（取第一个显示的方案）
      protocol.value = protocols.value.length > 0 ? protocols.value[0] : null;
      nutritionist.value = data.nutritionist || null;
    } else {
      console.error('❌ 获取方案失败:', res);
    }
  } catch (e) {
    console.error('获取方案信息失败:', e);
  } finally {
    loading.value = false;
  }
};

onShow(async () => {
  const uid = uni.getStorageSync('userId') || getUserInfo()?._id;
  if (!uid) return;
  await fetchData();
});
</script>

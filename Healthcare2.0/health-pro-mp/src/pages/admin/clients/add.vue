<template>
  <view class="mp-page-shell min-h-screen bg-transparent pb-safe">
    <!-- Header -->
    <view class="bg-white px-5 pt-12 pb-4 border-b border-slate-100 sticky top-0 z-40 flex items-center gap-3">
      <view class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mp-pressable" @click="goBack">
        <text class="text-slate-600 text-lg">←</text>
      </view>
      <text class="text-lg font-black text-slate-900">添加客户</text>
    </view>

    <!-- Form -->
    <view class="p-5 space-y-4">
      <!-- Basic Info -->
      <view class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-500 ml-1">姓名 <text class="text-rose-500">*</text></text>
          <input 
            type="text" 
            v-model="form.name"
            placeholder="请输入客户姓名" 
            class="w-full box-border h-12 bg-slate-50 rounded-xl px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </view>

        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-500 ml-1">手机号 <text class="text-rose-500">*</text></text>
          <input 
            type="number" 
            v-model="form.phone"
            maxlength="11"
            placeholder="请输入11位手机号" 
            class="w-full box-border h-12 bg-slate-50 rounded-xl px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </view>

        <view class="flex gap-4">
          <view class="flex-1 space-y-1">
            <text class="text-xs font-bold text-slate-500 ml-1">性别</text>
            <view class="flex bg-slate-50 rounded-xl p-1 h-12">
              <view 
                class="flex-1 rounded-lg flex items-center justify-center text-sm font-bold transition-all mp-pressable"
                :class="form.gender === 'male' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
                @click="form.gender = 'male'"
              >
                男
              </view>
              <view 
                class="flex-1 rounded-lg flex items-center justify-center text-sm font-bold transition-all mp-pressable"
                :class="form.gender === 'female' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'"
                @click="form.gender = 'female'"
              >
                女
              </view>
            </view>
          </view>
          
          <view class="flex-1 space-y-1">
            <text class="text-xs font-bold text-slate-500 ml-1">年龄</text>
            <input 
              type="number" 
              v-model="form.age"
              placeholder="可选" 
              class="w-full box-border h-12 bg-slate-50 rounded-xl px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </view>
        </view>

        <view class="flex gap-4">
          <view class="flex-1 space-y-1">
            <text class="text-xs font-bold text-slate-500 ml-1">身高 (cm)</text>
            <input 
              type="digit" 
              v-model="form.height"
              placeholder="可选" 
              class="w-full box-border h-12 bg-slate-50 rounded-xl px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </view>
          
          <view class="flex-1 space-y-1">
            <text class="text-xs font-bold text-slate-500 ml-1">体重 (kg)</text>
            <input 
              type="digit" 
              v-model="form.weight"
              placeholder="可选" 
              class="w-full box-border h-12 bg-slate-50 rounded-xl px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </view>
        </view>
      </view>

      <!-- Initial Assessment -->
      <view class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4">
        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-500 ml-1">初始 WROM 评分</text>
          <view class="h-12 bg-slate-50 rounded-xl px-4 flex items-center justify-between">
            <text class="text-sm font-black text-slate-900">{{ form.wrom }}</text>
            <slider 
              class="flex-1 mx-4" 
              :value="form.wrom" 
              :min="0" 
              :max="100" 
              activeColor="#10b981" 
              block-size="20"
              @change="onWromChange"
            />
          </view>
          <text class="text-[10px] text-slate-400 ml-1">默认 60 分，可根据初诊情况调整</text>
        </view>

        <view class="space-y-1">
          <text class="text-xs font-bold text-slate-500 ml-1">备注信息</text>
          <textarea 
            v-model="form.notes"
            placeholder="记录客户主要诉求、病史等..." 
            class="w-full box-border h-32 bg-slate-50 rounded-xl p-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </view>
      </view>

      <!-- Submit Button -->
      <button 
        class="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-200 mp-pressable mt-8"
        @click="handleSubmit"
        :disabled="loading"
      >
        <text v-if="loading">保存中...</text>
        <text v-else>确认添加</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { getUserInfo } from '@/utils/storage';
import { ref } from 'vue'
import { callCloud } from '@/utils/cloud'

const loading = ref(false)
const form = ref({
  name: '',
  phone: '',
  gender: 'female',
  age: '',
  height: '',
  weight: '',
  wrom: 60,
  notes: ''
})

const getApiErrorMessage = (code?: number, msg?: string, fallback = '操作失败') => {
  if (msg) return msg
  if (code === 400) return '请求参数有误'
  if (code === 401) return '登录状态失效，请重新登录'
  if (code === 403) return '权限不足，无法执行此操作'
  if (code === 404) return '目标数据不存在或已被删除'
  return fallback
}

const goBack = () => {
  uni.navigateBack()
}

const onWromChange = (e: any) => {
  form.value.wrom = e.detail.value
}

const handleSubmit = async () => {
  if (!form.value.name || !form.value.phone) {
    uni.showToast({
      title: '请填写姓名和手机号',
      icon: 'none'
    })
    return
  }
  
  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) {
    uni.showToast({
      title: '手机号格式不正确',
      icon: 'none'
    })
    return
  }

  loading.value = true
  
  try {
    const userInfo = getUserInfo();
    const nutritionistId = userInfo ? userInfo._id : '';

    const res = await callCloud('user-center', {
      action: 'create_client',
      params: {
        name: form.value.name,
        phone: form.value.phone,
        gender: form.value.gender,
        age: Number(form.value.age) || null,
        height: Number(form.value.height) || null,
        weight: Number(form.value.weight) || null,
        wrom: form.value.wrom,
        notes: form.value.notes,
        created_by: nutritionistId,
        operatorId: nutritionistId
      }
    });

    if (res.ok) {
      uni.showToast({
        title: '添加成功',
        icon: 'success'
      });
      // 通知列表页刷新
      uni.$emit('refreshClients');
      
      setTimeout(() => {
        uni.navigateBack();
      }, 1500);
    } else if (res.isResourceExhausted) {
      uni.showModal({
        title: '资源超限',
        content: `${res.msg}\n\n当前无法添加客户。`,
        showCancel: false
      });
    } else {
      uni.showToast({
        title: getApiErrorMessage(res.code, res.msg, '添加失败'),
        icon: 'none'
      });
    }
  } catch (err) {
    console.error('Add client failed:', err);
    uni.showToast({
      title: '网络异常，请稍后重试',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}

:deep(input),
:deep(textarea),
:deep(.uni-input-input),
:deep(.uni-textarea-textarea) {
  box-sizing: border-box;
  max-width: 100%;
}
</style>

<template>
  <view>
    <!-- #ifdef H5 -->
    <DesktopLogin />
    <!-- #endif -->

    <!-- #ifndef H5 -->
    <view class="mp-page-shell min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <!-- Background Gradient/Decoration -->
      <view class="absolute inset-0 bg-transparent pointer-events-none"></view>
      
      <!-- Header Section -->
      <view class="relative z-10 flex flex-col items-center mb-8">
        <!-- Logo -->
        <view class="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20 mb-5 transform hover:scale-105 transition-transform duration-300">
          <view class="grid grid-cols-2 gap-1.5">
            <view class="w-3.5 h-3.5 bg-white rounded-[4px] opacity-90"></view>
            <view class="w-3.5 h-3.5 bg-white rounded-[4px] opacity-90"></view>
            <view class="w-3.5 h-3.5 bg-white rounded-[4px] opacity-90"></view>
            <view class="w-3.5 h-3.5 bg-white rounded-[4px] opacity-90"></view>
          </view>
        </view>
        
        <!-- Title -->
        <text class="text-3xl font-black text-slate-800 tracking-tight mb-2">HealthCare Pro</text>
        <!-- Subtitle -->
        <text class="text-sm text-slate-500 font-medium tracking-wide">营养顾问 / 客户双端登录</text>
      </view>

      <!-- Main Card -->
      <view class="relative z-10 w-full max-w-[320px] bg-white rounded-[24px] p-6 shadow-2xl shadow-slate-200/50 border border-white">
        
        <!-- Security Header -->
        <view class="flex items-center justify-center gap-2 mb-6">
          <view class="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
            <text class="text-xs text-emerald-600">🛡️</text>
          </view>
          <text class="text-xs font-bold text-emerald-700 tracking-wide">微信安全授权登录</text>
        </view>

        <!-- Form Section -->
        <view class="space-y-4">
          
          <!-- Account/Phone Input -->
          <view class="space-y-1">
            <text class="text-xs font-bold text-slate-700 block ml-1">手机号/账号</text>
            <view class="relative group">
              <view class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors z-10 flex items-center justify-center">
                <text class="text-base">📱</text>
              </view>
              <input 
                v-model="phoneNumber"
                type="number" 
                maxlength="11"
                placeholder="请输入手机号"
                class="box-border w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </view>
          </view>

          <!-- Password Input -->
          <view class="space-y-1">
            <text class="text-xs font-bold text-slate-700 block ml-1">登录密码</text>
            <view class="relative group">
              <view class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors z-10 flex items-center justify-center">
                <text class="text-base">🔒</text>
              </view>
              <input 
                v-model="password"
                type="password" 
                placeholder="请输入密码"
                class="box-border w-full h-11 bg-white border-2 border-emerald-500/50 rounded-xl pl-10 pr-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
              />
            </view>
          </view>

          <!-- Submit Button -->
          <button 
            @click="handleLogin"
            class="box-border w-full h-11 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/40 active:scale-[0.98] transition-all duration-200 mt-2 flex items-center justify-center gap-2"
          >
            <text>立即登录</text>
            <text class="text-lg">→</text>
          </button>

          <!-- WeChat Login (Optional Visual) -->
          <view class="pt-4 flex flex-col items-center gap-3">
             <text class="text-[10px] text-slate-400">或使用以下方式登录</text>
             <button class="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 transition-colors">
                <text class="text-lg text-emerald-600">💬</text>
             </button>
          </view>

        </view>

      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { callCloud } from '@/utils/cloud';

// #ifdef H5
import DesktopLogin from './components/DesktopLogin.vue';
// #endif

// #ifndef H5
const phoneNumber = ref('');
const password = ref('');

const getLoginErrorMessage = (msg?: string) => {
  const raw = (msg || '').trim();
  const normalized = raw.toLowerCase();
  if (
    raw.includes('账号不存在') ||
    raw.includes('用户不存在') ||
    normalized.includes('account not found') ||
    normalized.includes('user not found')
  ) {
    return '账号未开通，请联系营养师或管理员为您创建账号';
  }
  return raw || '登录失败，请检查手机号和密码';
};

const handleLogin = async () => {
  if (!/^1[3-9]\d{9}$/.test(phoneNumber.value)) {
    uni.showToast({ title: '请输入11位手机号', icon: 'none' });
    return;
  }
  if (!password.value) {
    uni.showToast({ title: '请输入密码', icon: 'none' });
    return;
  }
  
  let shouldHideLoading = true;
  uni.showLoading({ title: '登录中...' });
  
  try {
    const res = await callCloud<any>('user-center', {
      action: 'login',
      params: {
        phone: phoneNumber.value,
        password: password.value
      }
    });

    if (res.ok && res.data) {
      // 验证 token 存在且有效
      const token = res.data.token;
      if (!token || typeof token !== 'string' || token.length === 0) {
        console.error('登录成功但 token 无效:', res.data);
        uni.showToast({ title: '登录异常：令牌无效', icon: 'none' });
        return;
      }
      
      // 存储 token 和用户信息
      uni.setStorageSync('token', token);
      uni.setStorageSync('userInfo', res.data);
      uni.setStorageSync('userId', res.data._id || '');
      
      // 验证存储成功
      const storedToken = uni.getStorageSync('token');
      console.log('Token 存储验证:', storedToken ? '成功' : '失败');
      
      uni.hideLoading();
      shouldHideLoading = false;
      uni.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        const role = res.data?.role;
        const isClient = res.data?.is_client;
        
        // #ifdef H5
        // Web端：只能顾问登录，直接进工作台
        uni.reLaunch({ url: '/pages/admin/dashboard/index' });
        return;
        // #endif

        // #ifndef H5
        // 小程序端：双身份用户显示角色选择
        if (role === 'admin' && isClient) {
          uni.navigateTo({
            url: '/pages/common/role-select/index'
          });
          return;
        }
        
        // 单身份：直接跳转
        if (role === 'admin') {
          uni.reLaunch({ url: '/pages/admin/dashboard/index' });
          return;
        }
        uni.reLaunch({ url: '/pages/client/home/index' });
        return;
        // #endif
      }, 500);
      return;
    }

    if (res.isResourceExhausted) {
      uni.hideLoading();
      shouldHideLoading = false;
      uni.showModal({
        title: '资源超限',
        content: `${res.msg}\n\n当前无法登录。`,
        showCancel: false
      });
    } else if (res.code === 401 && res.msg?.includes('首次登录')) {
      // 首次登录提示，使用Modal显示完整信息
      uni.hideLoading();
      shouldHideLoading = false;
      uni.showModal({
        title: '首次登录提示',
        content: res.msg,
        showCancel: false
      });
    } else {
      uni.hideLoading();
      shouldHideLoading = false;
      uni.showToast({ title: getLoginErrorMessage(res.msg), icon: 'none' });
    }
  } catch (err: any) {
    uni.hideLoading();
    shouldHideLoading = false;
    const message = err?.message || String(err);
    const isCloudConfigError = err?.code === 'SYS_ERR' || message.includes('uniCloud');
    uni.showModal({
      title: '登录失败详情',
      content: isCloudConfigError
        ? '云环境未正确关联或云函数未部署。\n请先关联服务空间并上传 user-center 云函数后重试。'
        : `错误代码: ${err?.code || '无'}\n错误信息: ${message}`,
      showCancel: false
    });
    uni.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
  } finally {
    if (shouldHideLoading) {
      uni.hideLoading();
    }
  }
};
// #endif
</script>

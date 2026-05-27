<template>
  <div class="min-h-screen flex bg-white font-sans">
    <!-- Left Side: Branding & Visuals -->
    <div class="hidden lg:flex lg:w-5/12 xl:w-1/3 bg-slate-900 relative flex-col justify-between p-12 overflow-hidden">
      <!-- Background Elements -->
      <div class="absolute inset-0">
        <div class="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500 rounded-full blur-[120px] mix-blend-screen -translate-y-1/2 translate-x-1/2 opacity-30"></div>
        <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[100px] mix-blend-screen translate-y-1/2 -translate-x-1/4 opacity-30"></div>
      </div>
      
      <!-- Header -->
      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-10">
          <div class="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Database class="w-5 h-5 text-white" />
          </div>
          <span class="text-xl font-bold text-white tracking-wide">HealthCare Pro</span>
        </div>
        
        <h1 class="text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
          数字化<br/>
          <span class="text-emerald-400">精准营养管理</span><br/>
          新范式
        </h1>
        
        <p class="text-slate-400 text-base leading-relaxed max-w-sm">
          全流程客户健康档案追踪，智能库存预警，WROM 核心指标可视化监控。让每一次干预都有据可依。
        </p>
      </div>

      <!-- Security & Privacy Guarantee -->
      <div class="relative z-10 mt-auto">
        <div class="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 flex items-start gap-4 hover:bg-slate-800/70 transition-colors">
          <div class="p-3 bg-emerald-500/10 rounded-xl shrink-0 border border-emerald-500/20">
            <ShieldCheck class="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 class="text-white font-bold text-sm mb-1">企业级数据安全保障</h3>
            <p class="text-slate-400 text-xs leading-relaxed">
              全链路数据加密传输，严格遵循医疗隐私保护标准，多重身份验证机制，守护每一份健康档案的安全。
            </p>
          </div>
        </div>
        <div class="mt-8 text-[10px] text-slate-600 font-medium">
          © 2026 HealthCare Technology Inc.
        </div>
      </div>
    </div>

    <!-- Right Side: Login Form -->
    <div class="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
      <div class="w-full max-w-[420px] bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-10 border border-slate-100">
        
        <!-- Mobile Header -->
        <div class="lg:hidden flex flex-col items-center mb-10">
          <div class="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
            <Database class="w-6 h-6 text-white" />
          </div>
          <h2 class="text-2xl font-bold text-slate-900">HealthCare Pro</h2>
        </div>

        <div class="mb-8">
          <h2 class="text-2xl font-bold text-slate-900 mb-2">{{ isLogin ? '欢迎回来 👋' : '注册营养师账号' }}</h2>
          <p class="text-slate-500 text-sm">{{ isLogin ? '请输入您的手机号以登录控制台。' : '请填写手机号和姓名以完成注册。' }}</p>
        </div>

        <div class="space-y-5">
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 ml-1">手机号</label>
            <div class="relative group">
              <input 
                v-model="formData.phone"
                type="text" 
                class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 pl-11 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                placeholder="13800000000"
                maxlength="11"
              />
              <Phone class="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 group-focus-within:text-emerald-500 transition-colors" />
            </div>
          </div>

          <div v-if="!isLogin" class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 ml-1">姓名</label>
            <div class="relative group">
              <input 
                v-model="formData.username"
                type="text" 
                class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 pl-11 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                placeholder="您的姓名"
              />
              <User class="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 group-focus-within:text-emerald-500 transition-colors" />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 ml-1">密码</label>
            <div class="relative group">
              <input 
                v-model="formData.password"
                type="password" 
                class="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 pl-11 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                placeholder="请输入密码"
              />
              <Lock class="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 group-focus-within:text-emerald-500 transition-colors" />
            </div>
          </div>

          <button 
            @click="handleSubmit"
            :disabled="loading"
            class="w-full h-12 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/30 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">处理中...</span>
            <span v-else>{{ isLogin ? '登录控制台' : '立即注册' }}</span>
            <ArrowRight v-if="!loading" class="w-4 h-4" />
          </button>
        </div>

        <div class="mt-8 pt-8 border-t border-slate-100">
           <p class="text-center text-xs text-slate-400">
             {{ isLogin ? '还没有账号？' : '已有账号？' }} 
             <span 
               @click="toggleMode"
               class="font-bold text-slate-900 cursor-pointer hover:text-emerald-600 transition-colors"
             >
               {{ isLogin ? '注册营养师账号' : '立即登录' }}
             </span>
           </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Database, User, Phone, ArrowRight, ShieldCheck, Lock } from 'lucide-vue-next';
import { callCloud } from '@/utils/cloud';

const isLogin = ref(true);
const loading = ref(false);
const formData = reactive({
  phone: '',
  username: '',
  password: ''
});

const getAuthErrorMessage = (msg: string | undefined, loginMode: boolean) => {
  const raw = (msg || '').trim();
  const normalized = raw.toLowerCase();
  if (
    loginMode &&
    (
      raw.includes('账号不存在') ||
      raw.includes('用户不存在') ||
      normalized.includes('account not found') ||
      normalized.includes('user not found')
    )
  ) {
    return '账号未开通，请联系营养师或管理员为您创建账号';
  }
  if (raw) return raw;
  return loginMode ? '登录失败，请检查手机号和密码' : '注册失败';
};

const toggleMode = () => {
  isLogin.value = !isLogin.value;
  formData.username = '';
  formData.password = '';
  // Keep phone number for convenience
};

const handleSubmit = async () => {
  if (!formData.phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none' });
    return;
  }
  
  if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' });
    return;
  }

  if (!formData.password) {
    uni.showToast({ title: '请输入密码', icon: 'none' });
    return;
  }

  if (!isLogin.value && !formData.username) {
    uni.showToast({ title: '请输入姓名', icon: 'none' });
    return;
  }

  loading.value = true;

  try {
    const action = isLogin.value ? 'login' : 'register_admin';
    const params = {
      phone: formData.phone,
      password: formData.password,
      ...(!isLogin.value && { username: formData.username })
    };

    try {
      const res = await callCloud<any>('user-center', { action, params });
      
      console.log('=== Login Debug ===');
      console.log('Cloud function response:', res);
      console.log('Response ok:', res.ok);
      console.log('Response data:', res.data);
      console.log('Response code:', res.code);
      console.log('Response msg:', res.msg);

      if (res.ok) {
        if (!res.data) {
           throw new Error('Invalid response data');
        }
        uni.setStorageSync('token', res.data.token || '');
        uni.setStorageSync('userInfo', res.data);
        // #ifdef H5
        localStorage.setItem('token', res.data.token || '');
        localStorage.setItem('userInfo', JSON.stringify(res.data));
        // #endif

        let toastTitle = isLogin.value ? 'Login successful' : 'Registration successful';
        if (res.isResourceExhausted) {
          toastTitle = 'Login successful (cloud quota warning)';
        }

        uni.showToast({
          title: toastTitle,
          icon: 'success'
        });

        setTimeout(() => {
          // #ifdef H5
          // H5 uses navigateTo to avoid potential page refresh issues
          uni.navigateTo({
            url: '/pages/admin/dashboard/index'
          });
          // #endif
          // #ifndef H5
          uni.reLaunch({
            url: '/pages/admin/dashboard/index'
          });
          // #endif
        }, 1500);
      } else {
        uni.showToast({
          title: getAuthErrorMessage(res.msg, isLogin.value),
          icon: 'none'
        });
      }
    } catch (err: any) {
      console.error('=== Login Error ===');
      console.error('Auth failed:', err);
      console.error('Error details:', err?.message || err);
      
      const message = err?.message || String(err);
      const isCloudConfigError = err?.code === 'SYS_ERR' || message.includes('uniCloud');
      uni.showModal({
        title: 'Login failed details',
        content: isCloudConfigError
          ? 'Cloud environment not properly associated or cloud functions not deployed.\nPlease associate service space and upload user-center cloud function then retry.'
          : `Error code: ${err?.code || 'None'}\nError message: ${message}`,
        showCancel: false
      });
      uni.showToast({
        title: 'Network error, please try again later',
        icon: 'none'
      });
    } finally {
      loading.value = false;
    }
  } catch (err: any) {
    console.error('Auth failed:', err);
    const message = err?.message || String(err);
    const isCloudConfigError = err?.code === 'SYS_ERR' || message.includes('uniCloud');
    uni.showModal({
      title: 'Login failed details',
      content: isCloudConfigError
        ? 'Cloud environment not properly associated or cloud functions not deployed.\nPlease associate service space and upload user-center cloud function then retry.'
        : `Error code: ${err?.code || 'None'}\nError message: ${message}`,
      showCancel: false
    });
    uni.showToast({
      title: 'Network error, please try again later',
      icon: 'none'
    });
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
      <h1 class="text-xl font-bold text-slate-900 mb-6">登录诊断工具</h1>
      
      <div class="space-y-4">
        <div class="p-4 bg-slate-100 rounded-lg">
          <h2 class="font-semibold text-slate-700 mb-2">步骤 1: 测试登录接口</h2>
          <button 
            @click="testLogin" 
            class="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            :disabled="loading"
          >
            {{ loading ? '测试中...' : '测试登录 (17721199471)' }}
          </button>
        </div>

        <div v-if="loginResult" class="p-4 bg-blue-50 rounded-lg">
          <h3 class="font-semibold text-blue-700 mb-2">登录返回结果:</h3>
          <pre class="text-xs bg-white p-2 rounded overflow-auto max-h-40">{{ JSON.stringify(loginResult, null, 2) }}</pre>
        </div>

        <div class="p-4 bg-slate-100 rounded-lg">
          <h2 class="font-semibold text-slate-700 mb-2">步骤 2: 检查存储状态</h2>
          <button 
            @click="checkStorage" 
            class="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            检查 localStorage
          </button>
        </div>

        <div v-if="storageData" class="p-4 bg-purple-50 rounded-lg">
          <h3 class="font-semibold text-purple-700 mb-2">存储数据:</h3>
          <div class="text-sm space-y-1">
            <p><strong>token:</strong> {{ storageData.token ? '✅ 已存储' : '❌ 未存储' }}</p>
            <p><strong>userInfo:</strong> {{ storageData.userInfo ? '✅ 已存储' : '❌ 未存储' }}</p>
            <pre v-if="storageData.userInfo" class="text-xs bg-white p-2 rounded mt-2">{{ JSON.stringify(storageData.userInfo, null, 2) }}</pre>
          </div>
        </div>

        <div class="p-4 bg-slate-100 rounded-lg">
          <h2 class="font-semibold text-slate-700 mb-2">步骤 3: 测试 Dashboard 接口</h2>
          <button 
            @click="testDashboard" 
            class="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            :disabled="!storageData?.token"
          >
            测试 Dashboard 数据加载
          </button>
        </div>

        <div v-if="dashboardResult" class="p-4 bg-amber-50 rounded-lg">
          <h3 class="font-semibold text-amber-700 mb-2">Dashboard 结果:</h3>
          <p class="text-sm"><strong>code:</strong> {{ dashboardResult.code }}</p>
          <p class="text-sm"><strong>msg:</strong> {{ dashboardResult.msg || '成功' }}</p>
          <pre v-if="dashboardResult.data" class="text-xs bg-white p-2 rounded mt-2 overflow-auto max-h-40">{{ JSON.stringify(dashboardResult.data, null, 2) }}</pre>
        </div>

        <div class="p-4 bg-red-50 rounded-lg">
          <h2 class="font-semibold text-red-700 mb-2">快速修复</h2>
          <button 
            @click="clearAndRelogin" 
            class="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            清除存储并重新登录
          </button>
        </div>
      </div>

      <div class="mt-6 text-center">
        <button @click="goBack" class="text-slate-500 hover:text-slate-700">返回登录页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const loading = ref(false);
const loginResult = ref<any>(null);
const storageData = ref<any>(null);
const dashboardResult = ref<any>(null);

const testLogin = async () => {
  loading.value = true;
  try {
    const result = await uniCloud.callFunction({
      name: 'user-center',
      data: {
        action: 'login',
        params: {
          phone: '17721199471',
          password: '123456'  // 假设密码是 123456，请修改为实际密码
        }
      }
    });
    loginResult.value = result.result;
    
    if (result.result.code === 0 && result.result.data) {
      // 存储到 localStorage
      localStorage.setItem('token', result.result.data.token || '');
      localStorage.setItem('userInfo', JSON.stringify(result.result.data));
      uni.showToast({ title: '登录成功，数据已存储', icon: 'success' });
    }
  } catch (err) {
    loginResult.value = { error: err.message };
    uni.showToast({ title: '登录失败: ' + err.message, icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const checkStorage = () => {
  const token = localStorage.getItem('token');
  const userInfoStr = localStorage.getItem('userInfo');
  let userInfo = null;
  try {
    userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
  } catch (e) {
    console.error('Parse userInfo failed:', e);
  }
  
  storageData.value = {
    token: token ? token.substring(0, 20) + '...' : null,
    userInfo,
    rawToken: token,
    rawUserInfo: userInfoStr
  };
};

const testDashboard = async () => {
  const token = localStorage.getItem('token');
  const userInfoStr = localStorage.getItem('userInfo');
  const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
  
  if (!token || !userInfo?._id) {
    uni.showToast({ title: '请先登录获取 token', icon: 'none' });
    return;
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'client-api',
      data: {
        action: 'getAdminDashboardData',
        payload: {
          userId: userInfo._id,
          token: token  // 携带 token
        }
      }
    });
    dashboardResult.value = result.result;
  } catch (err) {
    dashboardResult.value = { error: err.message };
  }
};

const clearAndRelogin = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userInfo');
  uni.removeStorageSync('token');
  uni.removeStorageSync('userInfo');
  uni.showToast({ title: '已清除，请重新测试登录', icon: 'success' });
  storageData.value = null;
  loginResult.value = null;
  dashboardResult.value = null;
};

const goBack = () => {
  uni.redirectTo({ url: '/pages/common/login/index' });
};
</script>

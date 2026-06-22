/**
 * 云函数调用工具 - 统一 H5 和小程序端的调用方式
 *
 * H5 浏览器模式：通过 HTTP URL 化调用 http-gateway 云函数转发（绕过 SDK 注入问题）
 * 小程序模式：直接使用 uniCloud.callFunction()
 */

// ===== HTTP Gateway 配置 =====
// 在 uniCloud 控制台 → 云函数 → http-gateway 详情 → 查看「默认域名」
// 格式类似: https://xxxx-xxx.api.lncldglobal.com 或支付宝云的默认域名
const GATEWAY_URL = 'https://env-00jy5xpjho0v.dev-hz.cloudbasefunction.cn/http-gateway';

/** 判断当前是否为 H5 浏览器环境 */
const isH5Mode = (): boolean => {
  // #ifdef H5
  return true;
  // #endif
  return false;
};

export const RESOURCE_EXHAUSTED_MESSAGE = '当前云资源额度已用完，请等待额度恢复或切换服务空间后重试';

let isRedirectingToLogin = false;

// ===== 清除认证状态 =====
export const clearAuthState = () => {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
    }
  } catch (e) {}
  try {
    uni.removeStorageSync('token');
    uni.removeStorageSync('userInfo');
    uni.removeStorageSync('userId');
  } catch (e) {}
};

const handleAuthError = () => {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  clearAuthState();
  console.warn('[cloud] Token无效或已过期，即将跳转登录页');
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/common/login/index' });
    isRedirectingToLogin = false;
  }, 800);
};

export const getAuthToken = (): string | null => {
  try {
    let token: string | null = null;
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const localToken = localStorage.getItem('token');
      if (localToken && localToken.length > 0) token = localToken;
    }
    if (!token) {
      const storageToken = uni.getStorageSync('token');
      if (storageToken && typeof storageToken === 'string' && storageToken.length > 0) token = storageToken;
    }
    if (!token) {
      const userInfo = uni.getStorageSync('userInfo');
      if (userInfo && typeof userInfo === 'object') {
        const userToken = (userInfo as any).token || (userInfo as any)._token;
        if (userToken && typeof userToken === 'string' && userToken.length > 0) token = userToken;
      }
    }
    return token;
  } catch (e) {
    return null;
  }
};

const shouldSkipAuth = (name: string, data: Record<string, unknown>): boolean => {
  const publicActions = ['login', 'register_admin', 'getProducts', 'getTemplates'];
  const action = (data as any)?.action || '';
  return publicActions.includes(action);
};

type CloudResult<T> = {
  ok: boolean;
  code: number;
  msg: string;
  data: T | null;
  isResourceExhausted: boolean;
  raw: unknown;
};

/**
 * H5 模式：通过 HTTP 调用网关云函数
 */
const callViaHttpGateway = async <T>(name: string, data: Record<string, unknown>): Promise<CloudResult<T>> => {
  console.log(`[cloud] [HTTP] 调用云函数: ${name}, action: ${data?.action || '?'}`);

  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data })
    });

    const result = await response.json();

    console.log(`[cloud] [HTTP] 响应: code=${result.code}, msg=${result.msg}`);

    if ((result.code === 401 || result.code === 402) && !shouldSkipAuth(name, data)) {
      handleAuthError();
    }

    return {
      ok: result.code === 0,
      code: result.code,
      msg: result.msg || '',
      data: result.data ?? null,
      isResourceExhausted: false,
      raw: result
    };
  } catch (error: any) {
    console.error(`[cloud] [HTTP] ❌ 请求失败:`, error?.message);
    return {
      ok: false,
      code: error?.code || 500,
      msg: error?.message || '网络请求失败',
      data: null,
      isResourceExhausted: false,
      raw: error
    };
  }
};

/**
 * 小程序模式：直接使用 uniCloud.callFunction()
 */
const callViaUniCloud = async <T>(name: string, data: Record<string, unknown>): Promise<CloudResult<T>> => {
  console.log(`[cloud] [SDK] 调用云函数: ${name}, action: ${data?.action || '?'}`);

  if (!uniCloud || typeof uniCloud.callFunction !== 'function') {
    return { ok: false, code: 500, msg: 'uniCloud SDK 未加载', data: null, isResourceExhausted: false, raw: null };
  }

  try {
    const response = await uniCloud.callFunction({ name, data });
    const result = (response as any)?.result || {};
    const code = typeof result.code === 'number' ? result.code : 500;
    const msg = result.msg || result.message || (code === 0 ? '请求成功' : '请求失败');

    console.log(`[cloud] [SDK] 响应: code=${code}, msg=${msg}`);

    if ((code === 401 || code === 402) && !shouldSkipAuth(name, data)) {
      handleAuthError();
    }

    return { ok: code === 0, code, msg, data: result.data ?? null, isResourceExhausted: false, raw: response };
  } catch (error: any) {
    console.error(`[cloud] [SDK] ❌ 异常:`, error?.message);
    return { ok: false, code: error?.code || 500, msg: error?.message || '网络异常', data: null, isResourceExhausted: false, raw: error };
  }
};

/**
 * 统一入口：根据环境自动选择调用方式
 */
export const callCloud = async <T = unknown>(name: string, data: Record<string, unknown> = {}): Promise<CloudResult<T>> => {
  // 附加认证 token
  if (!shouldSkipAuth(name, data)) {
    const token = getAuthToken();
    if (token) {
      if (!(data as any).payload) (data as any).payload = {};
      ((data as any).payload as any).token = token;
      const currentViewRole = uni.getStorageSync('currentViewRole');
      if (currentViewRole) ((data as any).payload as any).currentViewRole = currentViewRole;
    }
  }

  // H5 用 HTTP 网关，小程序用 SDK
  if (isH5Mode()) {
    return callViaHttpGateway<T>(name, data);
  } else {
    return callViaUniCloud<T>(name, data);
  }
};

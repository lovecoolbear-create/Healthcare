export const RESOURCE_EXHAUSTED_MESSAGE = '当前云资源额度已用完，请等待额度恢复或切换服务空间后重试';

let isRedirectingToLogin = false;

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

export const callCloud = async <T = unknown>(name: string, data: Record<string, unknown>): Promise<CloudResult<T>> => {
  const requestData = { ...data };
  const action = (data as any)?.action || '?';

  if (!shouldSkipAuth(name, data)) {
    const token = getAuthToken();
    if (token) {
      if (!requestData.payload) requestData.payload = {};
      (requestData.payload as any).token = token;
      const currentViewRole = uni.getStorageSync('currentViewRole');
      if (currentViewRole) (requestData.payload as any).currentViewRole = currentViewRole;
    }
  }

  try {
    const response = await uniCloud.callFunction({ name, data: requestData });
    const result = (response as any)?.result || {};
    const code = typeof result.code === 'number' ? result.code : 500;
    const msg = result.msg || result.message || (code === 0 ? '请求成功' : '请求失败');

    if ((code === 401 || code === 402) && !shouldSkipAuth(name, data)) {
      console.warn(`[cloud] ${name}.${action} 返回 ${code}: ${msg}`);
      handleAuthError();
    }

    return { ok: code === 0, code, msg, data: result.data ?? null, isResourceExhausted: false, raw: response };
  } catch (error: any) {
    return { ok: false, code: error?.code || 500, msg: error?.message || '网络异常', data: null, isResourceExhausted: false, raw: error };
  }
};

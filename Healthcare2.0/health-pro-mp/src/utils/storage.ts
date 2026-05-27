/**
 * HealthCare Pro - 跨平台存储工具
 * 统一处理 H5 端的 localStorage 和小程序端的 uni storage
 */

/**
 * 获取用户信息（跨平台兼容）
 * H5 端优先从 localStorage 读取，小程序端使用 uni storage
 */
export const getUserInfo = (): any | null => {
  try {
    let userInfo = null;
    
    // #ifdef H5
    try {
      const localUserInfo = localStorage.getItem('userInfo');
      if (localUserInfo) {
        userInfo = JSON.parse(localUserInfo);
        console.log('getUserInfo from localStorage:', userInfo?._id || 'no id');
      }
    } catch (e) {
      console.error('Parse userInfo from localStorage failed:', e);
    }
    // #endif
    
    // 如果 H5 端没读到，或者非 H5 端，使用 uni storage
    if (!userInfo) {
      userInfo = uni.getStorageSync('userInfo');
      console.log('getUserInfo from uni storage:', userInfo?._id || 'no id');
    }
    
    // 验证 userInfo 格式
    if (userInfo && typeof userInfo === 'object') {
      return userInfo;
    }
    
    console.warn('getUserInfo: invalid userInfo format');
    return null;
  } catch (e) {
    console.error('getUserInfo failed:', e);
    return null;
  }
};

/**
 * 获取 Token（跨平台兼容）
 */
export const getToken = (): string | null => {
  try {
    // #ifdef H5
    const localToken = localStorage.getItem('token');
    if (localToken && localToken.length > 0) {
      console.log('getToken from localStorage');
      return localToken;
    }
    // #endif
    
    // 小程序端使用 uni storage
    const storageToken = uni.getStorageSync('token');
    if (storageToken && typeof storageToken === 'string' && storageToken.length > 0) {
      console.log('getToken from uni storage');
      return storageToken;
    }
    
    console.warn('getToken: no token found');
    return null;
  } catch (e) {
    console.error('getToken failed:', e);
    return null;
  }
};

/**
 * 存储用户信息（跨平台）
 */
export const setUserInfo = (userInfo: any): void => {
  uni.setStorageSync('userInfo', userInfo);
  
  // #ifdef H5
  try {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  } catch (e) {
    console.error('Set userInfo to localStorage failed:', e);
  }
  // #endif
};

/**
 * 存储 Token（跨平台）
 */
export const setToken = (token: string): void => {
  uni.setStorageSync('token', token);
  
  // #ifdef H5
  try {
    localStorage.setItem('token', token);
  } catch (e) {
    console.error('Set token to localStorage failed:', e);
  }
  // #endif
};

/**
 * 清除所有用户相关存储
 */
export const clearUserStorage = (): void => {
  uni.removeStorageSync('userInfo');
  uni.removeStorageSync('token');
  
  // #ifdef H5
  try {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
  } catch (e) {
    console.error('Clear localStorage failed:', e);
  }
  // #endif
};

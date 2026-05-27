// 跨端数据同步工具 - 统一 Web 端和小程序端的数据存储与同步
// 确保双端使用相同的数据格式和同步机制

import { callCloud } from './cloud';

// 存储键名统一前缀
const STORAGE_PREFIX = 'healthcare_sync_';

// 同步状态类型
type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// 同步元数据类型
interface SyncMeta {
  version: string;
  timestamp: number;
  deviceType: 'web' | 'mp';
  userId: string;
}

// 带同步标记的数据类型
interface SyncableData<T> {
  data: T;
  meta: SyncMeta;
  pending: boolean;
}

// 检测当前平台
const getPlatform = (): 'web' | 'mp' => {
  // #ifdef H5
  return 'web';
  // #endif
  // #ifndef H5
  return 'mp';
  // #endif
};

// 统一的本地存储接口
const storage = {
  set: (key: string, value: unknown): void => {
    const fullKey = STORAGE_PREFIX + key;
    const data = JSON.stringify(value);
    // #ifdef H5
    localStorage.setItem(fullKey, data);
    // #endif
    // #ifndef H5
    uni.setStorageSync(fullKey, value);
    // #endif
  },

  get: <T = unknown>(key: string, defaultValue?: T): T | undefined => {
    const fullKey = STORAGE_PREFIX + key;
    // #ifdef H5
    const data = localStorage.getItem(fullKey);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data) as T;
    } catch {
      return defaultValue;
    }
    // #endif
    // #ifndef H5
    try {
      return uni.getStorageSync(fullKey) as T ?? defaultValue;
    } catch {
      return defaultValue;
    }
    // #endif
  },

  remove: (key: string): void => {
    const fullKey = STORAGE_PREFIX + key;
    // #ifdef H5
    localStorage.removeItem(fullKey);
    // #endif
    // #ifndef H5
    uni.removeStorageSync(fullKey);
    // #endif
  },

  clear: (): void => {
    // #ifdef H5
    Object.keys(localStorage)
      .filter(k => k.startsWith(STORAGE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
    // #endif
    // #ifndef H5
    uni.clearStorageSync();
    // #endif
  }
};

// 生成同步版本号
const generateSyncVersion = (userId: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${userId}_${timestamp}_${random}`;
};

// 保存数据并标记为待同步
export const saveWithSync = <T>(key: string, data: T, userId: string): SyncableData<T> => {
  const syncData: SyncableData<T> = {
    data,
    meta: {
      version: generateSyncVersion(userId),
      timestamp: Date.now(),
      deviceType: getPlatform(),
      userId
    },
    pending: true
  };
  storage.set(key, syncData);
  return syncData;
};

// 获取带同步标记的数据
export const getWithSync = <T>(key: string): SyncableData<T> | undefined => {
  return storage.get<SyncableData<T>>(key);
};

// 标记数据为已同步
export const markAsSynced = (key: string): void => {
  const data = storage.get<SyncableData<unknown>>(key);
  if (data) {
    data.pending = false;
    storage.set(key, data);
  }
};

// 检查数据是否需要同步
export const needsSync = (key: string, serverVersion?: string): boolean => {
  const local = storage.get<SyncableData<unknown>>(key);
  if (!local) return true;
  if (local.pending) return true;
  if (serverVersion && local.meta.version !== serverVersion) return true;
  return false;
};

// 获取用户 ID
export const getCurrentUserId = (): string | undefined => {
  // #ifdef H5
  const webUserInfo = storage.get<{ _id?: string }>('userInfo');
  return webUserInfo?._id || localStorage.getItem('userId') || undefined;
  // #endif
  // #ifndef H5
  const mpUserInfo = uni.getStorageSync('userInfo') as { _id?: string } | undefined;
  return mpUserInfo?._id || uni.getStorageSync('userId') || undefined;
  // #endif
};

// 双端数据同步主函数
export const syncDataWithServer = async <T>(
  key: string,
  cloudAction: string,
  transform?: (data: T) => unknown
): Promise<{ success: boolean; data?: T; error?: string }> => {
  const userId = getCurrentUserId();
  if (!userId) {
    return { success: false, error: '用户未登录' };
  }

  const localData = getWithSync<T>(key);

  try {
    // 如果本地有待同步的数据，先上传到服务器
    if (localData?.pending) {
      const uploadData = transform ? transform(localData.data) : localData.data;
      const uploadRes = await callCloud('client-api', {
        action: cloudAction,
        payload: {
          userId,
          data: uploadData,
          syncVersion: localData.meta.version
        }
      });

      if (!uploadRes.ok) {
        return { success: false, error: uploadRes.msg };
      }

      markAsSynced(key);
    }

    // 从服务器获取最新数据
    const downloadRes = await callCloud<{ data: T; syncVersion: string }>('client-api', {
      action: `${cloudAction}SyncMeta`,
      payload: { userId }
    });

    if (downloadRes.ok && downloadRes.data) {
      // 检查是否需要更新本地数据
      if (needsSync(key, downloadRes.data.syncVersion)) {
        saveWithSync(key, downloadRes.data.data, userId);
        return { success: true, data: downloadRes.data.data };
      }
    }

    // 无需更新，返回本地数据
    return { success: true, data: localData?.data };
  } catch (error) {
    console.error(`Sync failed for ${key}:`, error);
    return { success: false, error: String(error), data: localData?.data };
  }
};

// 清除所有同步数据（退出登录时调用）
export const clearAllSyncData = (): void => {
  storage.clear();
};

// 导出存储工具供其他模块使用
export { storage, getPlatform, generateSyncVersion };

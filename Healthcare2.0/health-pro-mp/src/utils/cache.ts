/**
 * HealthCare Pro - 企业级缓存策略
 * P1优化：分级缓存机制
 * 
 * 缓存层级：
 * L1: Memory Cache (内存) - 5分钟
 * L2: Session Storage - 15分钟
 * L3: Local Storage - 60分钟
 * L4: Cloud Cache (服务端) - 根据业务场景
 */

// 缓存键前缀
const CACHE_PREFIX = 'hc_';

// 缓存级别枚举
export enum CacheLevel {
  MEMORY = 'memory',      // 内存缓存，页面刷新丢失
  SESSION = 'session',    // 会话级，标签页关闭清除
  LOCAL = 'local',        // 持久化，手动清除
  CLOUD = 'cloud'         // 云端缓存，多设备同步
}

// 缓存级别配置（毫秒）
const LEVEL_CACHE_CONFIG = {
  [CacheLevel.MEMORY]: { ttl: 5 * 60 * 1000, prefix: 'mem_' },
  [CacheLevel.SESSION]: { ttl: 15 * 60 * 1000, prefix: 'sess_' },
  [CacheLevel.LOCAL]: { ttl: 60 * 60 * 1000, prefix: 'loc_' },
  [CacheLevel.CLOUD]: { ttl: 24 * 60 * 60 * 1000, prefix: 'cloud_' }
};

// 内存缓存存储
const memoryCache = new Map<string, { data: any; timestamp: number }>();

// 缓存键生成器
const generateKey = (level: CacheLevel, key: string) => {
  return `${CACHE_PREFIX}${LEVEL_CACHE_CONFIG[level].prefix}${key}`;
};

// 缓存服务
export class CacheService {
  // L1: 内存缓存
  static setMemory(key: string, data: any, customTtl?: number) {
    const ttl = customTtl || LEVEL_CACHE_CONFIG[CacheLevel.MEMORY].ttl;
    memoryCache.set(generateKey(CacheLevel.MEMORY, key), {
      data,
      timestamp: Date.now() + ttl
    });
  }

  static getMemory(key: string): any | null {
    const cacheKey = generateKey(CacheLevel.MEMORY, key);
    const item = memoryCache.get(cacheKey);
    
    if (!item) return null;
    
    if (Date.now() > item.timestamp) {
      memoryCache.delete(cacheKey);
      return null;
    }
    
    return item.data;
  }

  // L2: Session Storage
  static setSession(key: string, data: any) {
    try {
      const cacheKey = generateKey(CacheLevel.SESSION, key);
      const item = {
        data,
        timestamp: Date.now(),
        ttl: LEVEL_CACHE_CONFIG[CacheLevel.SESSION].ttl
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(item));
    } catch (e) {
      console.warn('SessionStorage 存储失败:', e);
    }
  }

  static getSession(key: string): any | null {
    try {
      const cacheKey = generateKey(CacheLevel.SESSION, key);
      const item = sessionStorage.getItem(cacheKey);
      
      if (!item) return null;
      
      const parsed = JSON.parse(item);
      
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  // L3: Local Storage (uni.setStorageSync)
  static setLocal(key: string, data: any, customTtl?: number) {
    const cacheKey = generateKey(CacheLevel.LOCAL, key);
    const item = {
      data,
      timestamp: Date.now(),
      ttl: customTtl || LEVEL_CACHE_CONFIG[CacheLevel.LOCAL].ttl
    };
    uni.setStorageSync(cacheKey, item);
  }

  static getLocal(key: string): any | null {
    const cacheKey = generateKey(CacheLevel.LOCAL, key);
    const item = uni.getStorageSync(cacheKey);
    
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      uni.removeStorageSync(cacheKey);
      return null;
    }
    
    return item.data;
  }

  // 分级缓存策略 - 自动选择最佳缓存级别
  static set(key: string, data: any, level: CacheLevel = CacheLevel.LOCAL) {
    switch (level) {
      case CacheLevel.MEMORY:
        this.setMemory(key, data);
        break;
      case CacheLevel.SESSION:
        this.setSession(key, data);
        break;
      case CacheLevel.LOCAL:
        this.setLocal(key, data);
        break;
      case CacheLevel.CLOUD:
        // 云端缓存通过云函数实现
        break;
    }
  }

  static get(key: string, level: CacheLevel = CacheLevel.LOCAL): any | null {
    switch (level) {
      case CacheLevel.MEMORY:
        return this.getMemory(key);
      case CacheLevel.SESSION:
        return this.getSession(key);
      case CacheLevel.LOCAL:
        return this.getLocal(key);
      default:
        return null;
    }
  }

  // 多级缓存读取策略 (L1 -> L2 -> L3)
  static getMultiLevel(key: string): { data: any; level: CacheLevel } | null {
    // 先查内存
    let data = this.getMemory(key);
    if (data) return { data, level: CacheLevel.MEMORY };
    
    // 再查Session
    data = this.getSession(key);
    if (data) {
      // 回填到内存
      this.setMemory(key, data);
      return { data, level: CacheLevel.SESSION };
    }
    
    // 最后查Local
    data = this.getLocal(key);
    if (data) {
      // 回填到上级缓存
      this.setSession(key, data);
      this.setMemory(key, data);
      return { data, level: CacheLevel.LOCAL };
    }
    
    return null;
  }

  // 清除所有缓存
  static clear() {
    memoryCache.clear();
    
    // 清除SessionStorage中的本应用缓存
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('清除 SessionStorage 失败:', e);
    }
  }
}

// 业务专用缓存键
export const CACHE_KEYS = {
  DASHBOARD: (userId: string) => `dashboard_${userId}`,
  CLIENTS: (userId: string) => `clients_${userId}`,
  CLIENT_DETAIL: (clientId: string) => `client_${clientId}`,
  PRODUCTS: 'products',
  ORDERS: (userId: string) => `orders_${userId}`,
  NOTIFICATIONS: (userId: string) => `notifications_${userId}`,
  REPORTS: (userId: string, days: number) => `reports_${userId}_${days}`
};

// 缓存装饰器 - 用于自动缓存函数结果
export function withCache(
  keyGenerator: (...args: any[]) => string,
  level: CacheLevel = CacheLevel.LOCAL,
  ttl?: number
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const cacheKey = keyGenerator(...args);
      
      // 尝试读取缓存
      const cached = CacheService.get(cacheKey, level);
      if (cached) {
        console.log(`[Cache Hit] ${propertyKey} - ${cacheKey}`);
        return cached;
      }
      
      // 执行原函数
      const result = await originalMethod.apply(this, args);
      
      // 写入缓存
      if (result !== null && result !== undefined) {
        CacheService.set(cacheKey, result, level);
        console.log(`[Cache Set] ${propertyKey} - ${cacheKey}`);
      }
      
      return result;
    };
    
    return descriptor;
  };
}

// Dashboard 专用缓存配置
export const DashboardCache = {
  // 获取Dashboard数据（多级缓存）
  get: (userId: string) => {
    return CacheService.getMultiLevel(CACHE_KEYS.DASHBOARD(userId));
  },
  
  // 设置Dashboard数据（写入多级缓存）
  set: (userId: string, data: any) => {
    const key = CACHE_KEYS.DASHBOARD(userId);
    CacheService.setLocal(key, data, 5 * 60 * 1000); // Dashboard 5分钟
    CacheService.setSession(key, data);
    CacheService.setMemory(key, data);
  },
  
  // 清除Dashboard缓存
  clear: (userId: string) => {
    const key = CACHE_KEYS.DASHBOARD(userId);
    uni.removeStorageSync(generateKey(CacheLevel.LOCAL, key));
    memoryCache.delete(generateKey(CacheLevel.MEMORY, key));
  }
};

// 简化的缓存配置（分钟）
export const CACHE_CONFIG = {
  DAILY_PLAN: 5,      // 健康计划：5分钟
  INVENTORY: 3,       // 库存数据：3分钟
  HEALTH_METRICS: 10, // 健康指标：10分钟
  USER_INFO: 30,      // 用户信息：30分钟
  HISTORY: 60         // 历史记录：1小时
};

// 简化的缓存函数（使用Local级别）
export const setCache = <T>(key: string, data: T, expiresInMinutes: number = 5): void => {
  const item = {
    data,
    timestamp: Date.now(),
    expiresIn: expiresInMinutes * 60 * 1000
  };
  try {
    uni.setStorageSync(CACHE_PREFIX + key, item);
  } catch (e) {
    console.error('设置缓存失败:', e);
  }
};

export const getCache = <T>(key: string): T | null => {
  try {
    const item: { data: T; timestamp: number; expiresIn: number } = uni.getStorageSync(CACHE_PREFIX + key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.expiresIn) {
      uni.removeStorageSync(CACHE_PREFIX + key);
      return null;
    }
    
    return item.data;
  } catch {
    return null;
  }
};

export const clearCache = (key: string): void => {
  uni.removeStorageSync(CACHE_PREFIX + key);
};

export const clearAllCache = (): void => {
  const keys = uni.getStorageInfoSync().keys;
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      uni.removeStorageSync(key);
    }
  });
};

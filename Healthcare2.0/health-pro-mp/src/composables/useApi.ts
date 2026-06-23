/**
 * API 调用封装
 * 统一管理所有云函数调用，减少重复代码
 *
 * 重要：通过 cloud.ts 的 callCloud 统一入口调用，
 *       H5 模式走 HTTP 网关，小程序模式走 uniCloud SDK
 */
import { ref } from 'vue';
import { API_CONFIG } from '@/config/constants';
import logger from '@/utils/logger';
import { callCloud } from '@/utils/cloud';
import type { ApiPayload } from '@/types';

class ApiService {
  private loading = ref(false);
  private error = ref<string | null>(null);

  /**
   * 通用API调用方法
   * @param actionOrFuncName API动作名称（2参数模式）或 云函数名称（3+参数模式）
   * @param actionOrPayload API动作名称（3+参数模式）或 请求参数（2参数模式）
   * @param payloadOrOptions 请求参数（3+参数模式）或 配置选项
   * @param options 配置选项（仅3+参数模式）
   * @returns API响应数据
   *
   * 调用方式：
   *   - 2参数: call('actionName', payload)        → 使用默认 client-api 函数
   *   - 3参数: call('funcName', 'action', payload) → 指定云函数
   */
  async call<T = any>(
    actionOrFuncName: string,
    actionOrPayload: ApiPayload | string,
    payloadOrOptions?: ApiPayload | { showLoading?: boolean; retryOnError?: boolean },
    options?: { showLoading?: boolean; retryOnError?: boolean }
  ): Promise<T> {
    // 兼容两种调用签名
    let functionName: string;
    let action: string;
    let payload: ApiPayload;
    let opts: { showLoading?: boolean; retryOnError?: boolean };

    if (typeof actionOrPayload === 'string') {
      // 3+参数模式: call(funcName, action, payload, options?)
      functionName = actionOrFuncName;
      action = actionOrPayload;
      payload = (payloadOrOptions as ApiPayload) || {};
      opts = options || {};
    } else {
      // 2参数模式: call(action, payload) — 使用默认云函数
      functionName = API_CONFIG.CLOUD_FUNCTION_NAME;
      action = actionOrFuncName;
      payload = actionOrPayload || {};
      opts = (payloadOrOptions as { showLoading?: boolean; retryOnError?: boolean }) || {};
    }

    const { showLoading = false, retryOnError = true } = opts;

    try {
      this.loading.value = showLoading;
      this.error.value = null;

      const userId = uni.getStorageSync('userId');
      const token = uni.getStorageSync('token');

      logger.debug(`📡 API调用: ${functionName}/${action}`, { userId: userId?.slice(0, 8) + '...' });

      // 通过 cloud.ts 统一入口调用（H5 走网关，小程序走 SDK）
      const res = await callCloud(functionName, {
        action,
        payload: {
          ...payload,
          userId,
          token,
        },
      });

      if (!res.ok) {
        throw new Error(res.msg || '请求失败');
      }

      logger.debug(`✅ API成功: ${functionName}/${action}`);
      return res.data as T;

    } catch (err: any) {
      const errorMsg = err.message || '网络异常';

      // 自动重试
      if (retryOnError && !payload._retried) {
        logger.warn(`⚠️ API失败，准备重试: ${action}`, errorMsg);

        await new Promise(resolve =>
          setTimeout(resolve, API_CONFIG.RETRY_DELAY_MS)
        );

        return this.call<T>(functionName, action, { ...payload, _retried: true }, options);
      }

      logger.error(`❌ API错误: ${action}`, errorMsg);
      this.error.value = errorMsg;

      if (showLoading) {
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000,
        });
      }

      throw err;

    } finally {
      this.loading.value = false;
    }
  }

  /**
   * 便捷方法：调用 client-api 云函数（默认函数名）
   */
  async client<T = any>(
    action: string,
    payload: ApiPayload = {},
    options?: { showLoading?: boolean; retryOnError?: boolean }
  ): Promise<T> {
    return this.call<T>(API_CONFIG.CLOUD_FUNCTION_NAME, action, payload, options);
  }

  /**
   * 带重试的API调用（用于关键数据）
   */
  async callWithRetry<T = any>(
    functionName: string,
    action: string,
    payload: ApiPayload = {},
    maxRetry: number = API_CONFIG.MAX_RETRY
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i <= maxRetry; i++) {
      try {
        return await this.call<T>(functionName, action, payload, { retryOnError: false });
      } catch (err: any) {
        lastError = err;
        if (i < maxRetry) {
          logger.warn(`🔄 重试 ${i + 1}/${maxRetry}: ${action}`);
          await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY_MS));
        }
      }
    }

    throw lastError;
  }

  /**
   * 批量并行调用多个API
   */
  async batchCall<T extends any[]>(
    calls: Array<{ functionName?: string; action: string; payload?: ApiPayload }>
  ): Promise<T> {
    return Promise.all(
      calls.map(({ functionName, action, payload }) =>
        this.call(functionName || API_CONFIG.CLOUD_FUNCTION_NAME, action, payload)
      )
    ) as Promise<T>;
  }

  get isLoading() {
    return this.loading.value;
  }

  get lastError() {
    return this.error.value;
  }
}

// 单例模式
export const apiService = new ApiService();

export default apiService;

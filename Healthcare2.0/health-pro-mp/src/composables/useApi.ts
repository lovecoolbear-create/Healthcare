/**
 * API 调用封装
 * 统一管理所有云函数调用，减少重复代码
 */
import { ref } from 'vue';
import { API_CONFIG } from '@/config/constants';
import logger from '@/utils/logger';
import type { ApiResponse, ApiPayload } from '@/types';

class ApiService {
  private loading = ref(false);
  private error = ref<string | null>(null);

  /**
   * 通用API调用方法
   * @param action API动作名称
   * @param payload 请求参数
   * @param options 配置选项
   * @returns API响应数据
   */
  async call<T = any>(
    action: string,
    payload: ApiPayload = {},
    options?: { showLoading?: boolean; retryOnError?: boolean }
  ): Promise<T> {
    const { showLoading = false, retryOnError = true } = options || {};

    try {
      this.loading.value = showLoading;
      this.error.value = null;

      const userId = uni.getStorageSync('userId');
      const token = uni.getStorageSync('token');

      logger.debug(`📡 API调用: ${action}`, { userId: userId?.slice(0, 8) + '...' });

      const res = await uniCloud.callFunction({
        name: API_CONFIG.CLOUD_FUNCTION_NAME,
        data: {
          action,
          payload: {
            ...payload,
            userId,
            token,
          },
        },
      });

      const result = res.result as ApiResponse<T>;

      if (result.code !== 0) {
        throw new Error(result.msg || '请求失败');
      }

      logger.debug(`✅ API成功: ${action}`);
      return result.data;

    } catch (err: any) {
      const errorMsg = err.message || '网络异常';

      // 自动重试
      if (retryOnError && !payload._retried) {
        logger.warn(`⚠️ API失败，准备重试: ${action}`, errorMsg);
        
        await new Promise(resolve => 
          setTimeout(resolve, API_CONFIG.RETRY_DELAY_MS)
        );

        return this.call<T>(action, { ...payload, _retried: true }, options);
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
   * 带重试的API调用（用于关键数据）
   */
  async callWithRetry<T = any>(
    action: string,
    payload: ApiPayload = {},
    maxRetry: number = API_CONFIG.MAX_RETRY
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i <= maxRetry; i++) {
      try {
        return await this.call<T>(action, payload, { retryOnError: false });
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
    calls: Array<{ action: string; payload?: ApiPayload }>
  ): Promise<T> {
    return Promise.all(
      calls.map(({ action, payload }) => this.call(action, payload))
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

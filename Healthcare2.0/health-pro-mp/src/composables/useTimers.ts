/**
 * 定时器统一管理
 * 兼容：Web / 微信小程序 / H5
 */
import { onUnmounted, ref } from 'vue';
import logger from '@/utils/logger';

// 获取兼容的定时器API（小程序没有window对象）
const getTimerAPI = () => {
  if (typeof window !== 'undefined' && window.setTimeout) {
    return {
      setTimeout: window.setTimeout.bind(window),
      setInterval: window.setInterval.bind(window),
      clearTimeout: window.clearTimeout.bind(window),
      clearInterval: window.clearInterval.bind(window),
    };
  }
  // 小程序环境使用全局方法
  return {
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
  };
};

const timerAPI = getTimerAPI();

export function useTimers() {
  const timers = ref<Array<{ id: NodeJS.Timeout; type: 'timeout' | 'interval' }>>([]);

  /**
   * 设置 setTimeout（自动追踪）
   */
  const setTimeout = (fn: () => void, delay?: number): NodeJS.Timeout => {
    const id = timerAPI.setTimeout(fn, delay);
    timers.value.push({ id, type: 'timeout' });
    return id;
  };

  /**
   * 设置 setInterval（自动追踪）
   */
  const setInterval = (fn: () => void, delay?: number): NodeJS.Timeout => {
    const id = timerAPI.setInterval(fn, delay);
    timers.value.push({ id, type: 'interval' });
    return id;
  };

  /**
   * 清除指定定时器
   */
  const clearTimer = (id: NodeJS.Timeout) => {
    const index = timers.value.findIndex(t => t.id === id);
    if (index > -1) {
      const timer = timers.value[index];
      if (timer.type === 'timeout') {
        timerAPI.clearTimeout(timer.id);
      } else {
        timerAPI.clearInterval(timer.id);
      }
      timers.value.splice(index, 1);
    }
  };

  /**
   * 清除所有定时器
   */
  const clearAllTimers = () => {
    logger.debug(`清理 ${timers.value.length} 个定时器`);
    
    timers.value.forEach(timer => {
      if (timer.type === 'timeout') {
        timerAPI.clearTimeout(timer.id);
      } else {
        timerAPI.clearInterval(timer.id);
      }
    });
    
    timers.value = [];
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    if (timers.value.length > 0) {
      clearAllTimers();
    }
  });

  return {
    setTimeout,
    setInterval,
    clearTimer,
    clearAllTimers,
    timerCount: ref(() => timers.value.length),
  };
}

export default useTimers;

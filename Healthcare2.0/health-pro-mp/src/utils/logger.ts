/**
 * 统一日志工具
 * 兼容：Web / 微信小程序 / H5
 */
const __DEV__ = process.env.NODE_ENV !== 'production';

// 检测是否为小程序环境（无 window 对象）
const isMiniProgram = typeof window === 'undefined';

type LogLevel = 'log' | 'warn' | 'error' | 'debug' | 'info';

const LOG_PREFIX = {
  log: '📝',
  warn: '⚠️',
  error: '❌',
  debug: '🔍',
  info: 'ℹ️',
};

const logger = {
  /**
   * 普通日志（仅开发环境）
   */
  log: (...args: any[]) => {
    if (__DEV__) {
      isMiniProgram ? console.log(...args) : console.log(`${LOG_PREFIX.log}[LOG]`, ...args);
    }
  },

  /**
   * 调试日志（仅开发环境）
   */
  debug: (...args: any[]) => {
    if (__DEV__) {
      isMiniProgram ? console.debug(...args) : console.debug(`${LOG_PREFIX.debug}[DEBUG]`, ...args);
    }
  },

  /**
   * 信息日志（仅开发环境）
   */
  info: (...args: any[]) => {
    if (__DEV__) {
      isMiniProgram ? console.info(...args) : console.info(`${LOG_PREFIX.info}[INFO]`, ...args);
    }
  },

  /**
   * 警告日志（所有环境都输出）
   */
  warn: (...args: any[]) => {
    isMiniProgram ? console.warn(...args) : console.warn(`${LOG_PREFIX.warn}[WARN]`, ...args);
  },

  /**
   * 错误日志（所有环境都输出）
   */
  error: (...args: any[]) => {
    isMiniProgram ? console.error(...args) : console.error(`${LOG_PREFIX.error}[ERROR]`, ...args);
  },

  /**
   * 分组日志（小程序环境降级为普通日志）
   */
  group: (label: string, fn: () => void) => {
    if (__DEV__) {
      if (isMiniProgram) {
        // 小程序不支持 console.group，降级为普通日志
        console.log(`--- ${label} ---`);
        fn();
        console.log(`--- ${label} END ---`);
      } else {
        console.group(label);
        fn();
        console.groupEnd();
      }
    }
  },

  /**
   * 性能计时开始（小程序环境降级）
   */
  timeStart: (label: string) => {
    if (__DEV__) {
      if (isMiniProgram) {
        console.log(`[TIMER START] ${label}`);
      } else {
        console.time(`⏱️ ${label}`);
      }
    }
  },

  /**
   * 性能计时结束（小程序环境降级）
   */
  timeEnd: (label: string) => {
    if (__DEV__) {
      if (isMiniProgram) {
        console.log(`[TIMER END] ${label}`);
      } else {
        console.timeEnd(`⏱️ ${label}`);
      }
    }
  },
};

export default logger;

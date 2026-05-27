// 开发环境配置
export const isDevelopment = process.env.NODE_ENV === 'development'

export const devConfig = {
  // WebSocket配置
  websocket: {
    // 开发模式下禁用真实WebSocket连接
    disableRealConnection: isDevelopment,
    // 模拟响应延迟
    mockResponseDelay: 1000,
    // 重试次数
    maxRetries: isDevelopment ? 1 : 3
  },
  
  // 错误处理
  errorHandling: {
    // 开发模式下抑制WebSocket错误
    suppressWebsocketErrors: isDevelopment,
    // 显示详细错误信息
    showDetailedErrors: isDevelopment,
    // 自动重试
    autoRetry: !isDevelopment
  },

  // 日志配置
  logging: {
    // 开发模式下显示所有日志
    verbose: isDevelopment,
    // 过滤的错误类型
    filterErrors: ['WebSocket connection failed', 'closeSocket:fail', 'timeout']
  }
}

/**
 * 开发模式下的错误过滤器
 * @param {any} error - 错误对象
 * @returns {boolean} 是否应该过滤该错误
 */
export const filterDevelopmentErrors = (error) => {
  if (!isDevelopment) return false
  
  const errorString = String(error)
  return devConfig.errorHandling.suppressWebsocketErrors && 
         devConfig.logging.filterErrors.some(filter => 
           errorString.includes(filter)
         )
}

// 重写console.error来过滤开发模式错误
if (isDevelopment && devConfig.errorHandling.suppressWebsocketErrors) {
  const originalConsoleError = console.error
  console.error = function(...args) {
    const errorString = args.join(' ')
    const shouldFilter = devConfig.logging.filterErrors.some(filter => 
      errorString.includes(filter)
    )
    
    if (!shouldFilter) {
      originalConsoleError.apply(console, args)
    } else {
      console.log('🔇 已过滤开发模式错误:', errorString)
    }
  }
}

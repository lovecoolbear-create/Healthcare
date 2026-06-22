// 开发环境配置
export const isDevelopment = process.env.NODE_ENV === 'development'

export const devConfig = {
  websocket: {
    disableRealConnection: isDevelopment,
    mockResponseDelay: 1000,
    maxRetries: isDevelopment ? 1 : 3
  },
  
  errorHandling: {
    suppressWebsocketErrors: isDevelopment,
    showDetailedErrors: isDevelopment,
    autoRetry: !isDevelopment
  },

  logging: {
    verbose: isDevelopment,
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

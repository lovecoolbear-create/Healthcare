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
  },

  // ===== HTTP Gateway 配置（H5 模式使用）=====
  // 用于绕过 CLI 项目 H5 模式下 uniCloud SDK 注入问题
  // 前端通过 HTTP 调用 http-gateway 云函数，在服务端转发 uniCloud.callFunction()
  gateway: {
    /** 网关完整 URL（含 PATH），从 uniCloud 控制台 → 云函数 → http-gateway 详情获取 */
    url: 'https://env-00jy5xpjho0v.dev-hz.cloudbasefunction.cn/http-gateway',
    /** API 密钥，需与 http-gateway 云函数中的 GATEWAY_API_KEY 保持一致 */
    apiKey: 'hc_gateway_2026_secure'
  }
}

// 向后兼容：直接导出 gateway 配置
export const gatewayUrl = devConfig.gateway.url
export const gatewayApiKey = devConfig.gateway.apiKey

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

// WebSocket错误处理和重试机制
class WebSocketHelper {
  constructor() {
    this.retryCount = new Map()
    this.maxRetries = 3
    this.retryDelay = 1000
  }

  // 安全的WebSocket连接
  safeConnect(url, options = {}) {
    // 在开发模式下，如果连接失败，提供模拟响应
    if (process.env.NODE_ENV === 'development') {
      console.log('开发模式：尝试连接WebSocket', url)
    }

    const socketTask = uni.connectSocket({
      url: url,
      protocols: options.protocols || [],
      success: () => {
        console.log('WebSocket连接成功')
        this.retryCount.delete(url)
        options.onSuccess && options.onSuccess()
      },
      fail: (error) => {
        console.error('WebSocket连接失败:', error)
        this.handleConnectionError(url, error, options)
      }
    })

    this.setupEventListeners(socketTask, url, options)
    return socketTask
  }

  setupEventListeners(socketTask, url, options) {
    socketTask.onOpen(() => {
      console.log('WebSocket连接已打开')
      options.onOpen && options.onOpen()
    })

    socketTask.onMessage((res) => {
      options.onMessage && options.onMessage(res.data)
    })

    socketTask.onClose((res) => {
      console.log('WebSocket连接已关闭:', res)
      options.onClose && options.onClose(res)
      this.retryCount.delete(url)
    })

    socketTask.onError((error) => {
      console.error('WebSocket错误:', error)
      options.onError && options.onError(error)
      this.handleConnectionError(url, error, options)
    })
  }

  handleConnectionError(url, error, options) {
    const currentRetries = this.retryCount.get(url) || 0
    
    if (currentRetries < this.maxRetries) {
      this.retryCount.set(url, currentRetries + 1)
      console.log(`WebSocket重试连接 ${currentRetries + 1}/${this.maxRetries}`)
      
      setTimeout(() => {
        this.safeConnect(url, options)
      }, this.retryDelay * (currentRetries + 1))
    } else {
      console.error('WebSocket连接重试次数已达上限')
      options.onFail && options.onFail(error)
      
      // 在开发模式下提供模拟功能
      if (process.env.NODE_ENV === 'development') {
        this.provideMockResponse(url, options)
      }
    }
  }

  // 开发模式下的模拟响应
  provideMockResponse(url, options) {
    console.log('开发模式：使用模拟WebSocket响应')
    
    // 模拟连接成功
    setTimeout(() => {
      options.onOpen && options.onOpen()
      
      // 模拟一些测试数据
      if (options.onMessage) {
        setTimeout(() => {
          options.onMessage(JSON.stringify({
            type: 'mock',
            message: '开发模式模拟数据',
            timestamp: Date.now()
          }))
        }, 1000)
      }
    }, 500)
  }

  // 安全关闭WebSocket
  safeClose(socketTask, code = 1000, reason = 'Normal closure') {
    if (!socketTask) return
    
    // 使用有效的关闭代码
    const validCode = code === 1000 ? 1000 : (code >= 3000 && code <= 4999 ? code : 1000)
    
    socketTask.close({
      code: validCode,
      reason: reason,
      success: () => {
        console.log('WebSocket关闭成功')
      },
      fail: (error) => {
        console.error('WebSocket关闭失败:', error)
      }
    })
  }
}

export default new WebSocketHelper()

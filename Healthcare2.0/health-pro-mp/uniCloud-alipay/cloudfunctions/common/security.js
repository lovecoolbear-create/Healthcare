/**
 * HealthCare Pro - 企业级权限与安全中间件
 * P0级别安全修复 - 统一权限校验
 */

const db = uniCloud.database();
const userCollection = db.collection('he_users');

// Token 解析与验证
const verifyToken = async (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token缺失' };
  }

  // 移除 'Bearer ' 前缀
  const cleanToken = token.replace(/^Bearer\s+/i, '');

  // 查询数据库验证token有效性
  try {
    const userRes = await userCollection.where({
      token: cleanToken,
      token_expires: db.command.gt(Date.now())
    }).get();

    if (userRes.data.length === 0) {
      return { valid: false, error: 'Token无效或已过期' };
    }

    return { 
      valid: true, 
      user: userRes.data[0],
      userId: userRes.data[0]._id,
      role: userRes.data[0].role
    };
  } catch (err) {
    console.error('Token验证失败:', err);
    return { valid: false, error: '验证服务异常' };
  }
};

// 从请求中提取Token
const extractToken = (event) => {
  // 优先从header中获取
  const headers = event.headers || {};
  const headerToken = headers.authorization || headers.Authorization;
  
  // 其次从payload中获取（向后兼容）
  const payload = event.payload || {};
  const params = event.params || {};
  const payloadToken = payload.token || params.token;
  
  // H5 CLI 模式可能从 data 中获取
  const data = event.data || {};
  const dataPayload = data.payload || {};
  const dataToken = data.token || dataPayload.token;
  
  // 直接检查 event.token
  const directToken = event.token;
  
  const token = headerToken || payloadToken || dataToken || directToken || null;
  
  return token;
};

// 统一权限校验中间件
const requireAuth = async (event, options = {}) => {
  const { requireAdmin = false, allowClient = false } = options;
  
  const token = extractToken(event);
  const authResult = await verifyToken(token);
  
  if (!authResult.valid) {
    return {
      authorized: false,
      error: { code: 401, msg: authResult.error || '未授权访问' }
    };
  }

  const { user, userId, role } = authResult;

  // 检查权限等级
  if (requireAdmin && role !== 'admin') {
    return {
      authorized: false,
      error: { code: 403, msg: '权限不足：需要管理员权限' }
    };
  }

  // 如果需要，验证操作者只能操作自己的数据
  if (allowClient && role === 'client') {
    const targetClientId = event.payload?.clientId || event.params?.clientId;
    if (targetClientId && targetClientId !== userId) {
      return {
        authorized: false,
        error: { code: 403, msg: '无权访问其他客户数据' }
      };
    }
  }

  return {
    authorized: true,
    user,
    userId,
    role,
    operatorId: userId // 用于业务操作记录
  };
};

// 数据权限过滤 - 确保用户只能看到自己的数据
const filterByOwnership = (query, userId, role) => {
  if (role === 'admin') {
    // 管理员可以看到所有数据，但优先显示自己创建的客户
    return query;
  }
  
  // 普通用户只能看到自己的数据
  return query.where({
    $or: [
      { _id: userId },
      { created_by: userId },
      { nutritionist_id: userId },
      { client_id: userId }
    ]
  });
};

// 安全日志记录
const logSecurityEvent = async (event, authResult, action) => {
  try {
    const logCollection = db.collection('he_security_logs');
    await logCollection.add({
      action,
      user_id: authResult.userId || 'anonymous',
      role: authResult.role || 'unknown',
      ip: event.headers?.['x-real-ip'] || 'unknown',
      user_agent: event.headers?.['user-agent'] || 'unknown',
      success: authResult.authorized,
      error_msg: authResult.error?.msg || null,
      timestamp: Date.now()
    });
  } catch (err) {
    // 日志记录失败不应影响主流程
    console.error('安全日志记录失败:', err);
  }
};

// Token生成（用于登录后发放）
const generateToken = (userId, role) => {
  const token = 'tk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  const expires = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7天有效期
  
  return {
    token,
    expires,
    token_expires: expires
  };
};

// 密码哈希（简单实现，生产环境建议使用bcrypt）
const hashPassword = (password) => {
  // 使用简单的加盐哈希
  const salt = 'healthcare_salt_v1';
  let hash = 0;
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'hc_' + Math.abs(hash).toString(16);
};

module.exports = {
  verifyToken,
  extractToken,
  requireAuth,
  filterByOwnership,
  logSecurityEvent,
  generateToken,
  hashPassword
};

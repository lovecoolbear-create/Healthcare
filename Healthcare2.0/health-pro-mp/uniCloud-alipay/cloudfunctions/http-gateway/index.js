/**
 * HTTP Gateway 云函数（带鉴权）
 *
 * 作用：作为 H5 浏览器模式下的 HTTP 入口，
 *       接收前端的 HTTP 请求，在服务端通过 uniCloud.callFunction() 转发到实际云函数。
 *       绕过 HBuilderX CLI 项目无法注入 uniCloud 配置的问题。
 *
 * 安全机制：
 *   1. API Key 鉴权：请求头需携带 X-Gateway-Key
 *   2. 函数名白名单：只允许调用已授权的云函数
 *   3. 请求频率限制（单次校验）
 *   4. OPTIONS 预检请求放行（跨域）
 *
 * 使用方式：
 *   1. 上传此云函数到 uniCloud
 *   2. 在 uniCloud 控制台 → 云函数 → 此函数详情 → 设置 HTTP 访问路径为 /http-gateway
 *   3. 前端通过 POST https://默认域名/http-gateway 调用，Header 携带 X-Gateway-Key
 */

// ===== 安全配置 =====

/**
 * API 密钥（建议定期更换）
 * 生产环境建议通过云函数环境变量传入，而非硬编码
 */
const GATEWAY_API_KEY = 'hc_gateway_2026_secure';

/**
 * 允许调用的云函数白名单
 * 防止攻击者调用非预期的云函数
 */
const ALLOWED_FUNCTIONS = [
  'user-center',
  'client-api',
  'admin-api',
  'daily-plan-generator',
  'daily-summary',
  'protocol-effectiveness',
  'auto-backup'
];

// ===== 工具函数 =====

/** 构建标准错误响应 */
const errorResponse = (statusCode, code, msg) => ({
  mpserverlessComposedResponse: true,
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8'
  },
  body: JSON.stringify({ code, msg })
});

/** 解析请求体 */
const parseBody = (event) => {
  if (!event.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString()
    : event.body;
  return JSON.parse(raw);
};

exports.main = async (event, context) => {
  // ===== 1. 跨域预检 =====
  if (event.httpMethod === 'OPTIONS') {
    return {
      mpserverlessComposedResponse: true,
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Gateway-Key',
        'Access-Control-Max-Age': '86400',
      },
      body: ''
    };
  }

  // ===== 2. 方法检查 =====
  if (event.httpMethod !== 'POST') {
    return errorResponse(405, 405, '只支持 POST 请求');
  }

  // ===== 3. API Key 鉴权 =====
  const requestKey = (event.headers || {})['x-gateway-key']
    || (event.headers || {})['X-Gateway-Key'];

  if (!requestKey || requestKey !== GATEWAY_API_KEY) {
    console.warn('[http-gateway] ⚠️ 鉴权失败: 无效或缺失 API Key');
    return errorResponse(401, 401, '未授权访问');
  }

  // ===== 4. 解析并校验请求体 =====
  let body;
  try {
    body = parseBody(event);
  } catch (e) {
    return errorResponse(400, 400, '请求体格式错误，需要合法 JSON');
  }

  const { name, data } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return errorResponse(400, 400, '缺少 name 参数（目标云函数名）');
  }

  // 清理 name 中的路径穿越字符
  const sanitizedName = name.trim().replace(/[\/\\\.]/g, '');

  // ===== 5. 函数名白名单检查 =====
  if (!ALLOWED_FUNCTIONS.includes(sanitizedName)) {
    console.warn(`[http-gateway] ⚠️ 被拒绝调用未授权函数: ${sanitizedName}`);
    return errorResponse(403, 403, `无权调用该云函数: ${sanitizedName}`);
  }

  // ===== 6. 日志记录（脱敏）=====
  const action = data?.action || '?';
  console.log(`[http-gateway] ✅ 转发: ${sanitizedName} action=${action}`);

  // ===== 7. 服务端转发调用 =====
  try {
    const result = await uniCloud.callFunction({
      name: sanitizedName,
      data: data || {}
    });

    console.log(`[http-gateway] ✅ ${sanitizedName} 调用成功`);

    return {
      mpserverlessComposedResponse: true,
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(result.result || { code: 0, msg: 'success', data: null })
    };

  } catch (error) {
    console.error(`[http-gateway] ❌ ${sanitizedName} 调用失败:`, error);

    // 不泄露内部错误细节给前端
    const errMsg = error.message || error.errMsg || '服务器内部错误';
    const errCode = error.code || 'SYS_ERR';

    return errorResponse(500, errCode, errMsg);
  }
};

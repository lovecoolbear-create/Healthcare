/**
 * HTTP Gateway 云函数
 *
 * 作用：作为 H5 浏览器模式下的 HTTP 入口，
 *       接收前端的 HTTP 请求，在服务端通过 uniCloud.callFunction() 转发到实际云函数。
 *       绕过 HBuilderX CLI 项目无法注入 uniCloud 配置的问题。
 *
 * 使用方式：
 *   1. 上传此云函数到 uniCloud
 *   2. 在 uniCloud 控制台 → 云函数 → 此函数详情 → 设置 HTTP 访问路径为 /http-gateway
 *   3. 前端通过 POST https://默认域名/http-gateway 调用
 */

exports.main = async (event, context) => {
  // ===== 跨域处理（预检请求）=====
  if (event.httpMethod === 'OPTIONS') {
    return {
      mpserverlessComposedResponse: true,
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
      body: ''
    };
  }

  // 只接受 POST 请求
  if (event.httpMethod !== 'POST') {
    return {
      mpserverlessComposedResponse: true,
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ code: 405, msg: '只支持 POST 请求' })
    };
  }

  // ===== 解析请求体 =====
  let body = {};
  try {
    if (event.body) {
      body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body);
    }
  } catch (e) {
    return {
      mpserverlessComposedResponse: true,
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ code: 400, msg: '请求体格式错误，需要 JSON' })
    };
  }

  const { name, data } = body;

  if (!name || typeof name !== 'string') {
    return {
      mpserverlessComposedResponse: true,
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ code: 400, msg: '缺少 name 参数（目标云函数名）' })
    };
  }

  // ===== 在服务端调用实际云函数 =====
  try {
    console.log(`[http-gateway] 转发调用: ${name}`, data ? `action=${data.action || '?'}` : '');

    const result = await uniCloud.callFunction({
      name: name,
      data: data || {}
    });

    console.log(`[http-gateway] ${name} 调用成功`);

    // 返回结果给前端
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
    console.error(`[http-gateway] ${name} 调用失败:`, error);

    const errMsg = error.message || error.errMsg || '未知错误';
    const errCode = error.code || 'SYS_ERR';

    return {
      mpserverlessComposedResponse: true,
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        code: errCode,
        msg: errMsg,
        data: null
      })
    };
  }
};

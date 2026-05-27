'use strict';
const { Pool } = require('pg');

// 数据库连接池单例
// 注意：云函数实例复用时可复用连接池，减少握手开销
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      // 腾讯云 PostgreSQL 连接配置
      // 实际部署时建议使用 process.env 获取环境变量
      user: process.env.PG_USER || 'postgres',
      host: process.env.PG_HOST || 'localhost',
      database: process.env.PG_DATABASE || 'healthcare',
      password: process.env.PG_PASSWORD || 'password',
      port: process.env.PG_PORT || 5432,
      ssl: {
        rejectUnauthorized: false // 腾讯云通常需要 SSL 但允许自签名
      }
    });
  }
  return pool;
}

// 通用查询函数
async function query(text, params) {
  const p = getPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('query error', { text, error });
    throw error;
  }
}

module.exports = {
  query,
  getPool
};

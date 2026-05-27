# 双端架构说明

## 当前架构

```
health-pro-mp/
├── cloudfunctions/           ← 小程序后端（微信云开发）
│   ├── user-center/          ← 用户相关云函数
│   └── client-api/           ← 业务数据云函数
├── uniCloud-alipay/          ← H5端后端（支付宝云）
│   └── cloudfunctions/       ← 同一套云函数逻辑
└── src/
    └── utils/
        └── cloud.ts          ← 双端统一调用封装
```

## 双端后端分布

| 端 | 后端服务 | 网络支持 |
|---|---------|---------|
| **微信小程序** | 微信原生云开发 (wx.cloud) | ✅ 5G + WiFi |
| **H5/Web** | uniCloud 支付宝云 | ✅ 5G + WiFi |

## 为什么这样设计？

**问题根源**：uniCloud 阿里云在 5G 网络下请求会被拦截（域名白名单限制）

**解决方案**：
1. **小程序** → 用微信原生云开发（内置支持，无白名单问题）
2. **H5** → 用 uniCloud 支付宝云（Web 访问无白名单限制）

## 前端调用方式

代码中统一使用 `callCloud()`，自动区分平台：

```typescript
// 小程序端编译为 wx.cloud.callFunction()
// H5端编译为 uniCloud.callFunction()
import { callCloud } from '@/utils/cloud';

const result = await callCloud('user-center', { action: 'login' });
```

## 部署步骤

### 1. 微信云开发（小程序端）

1. 登录 https://mp.weixin.qq.com/
2. 进入「云开发」→ 开通并记录环境 ID
3. 修改 `src/main.ts` 中的环境 ID
4. 在微信开发者工具中部署云函数

### 2. 支付宝云（H5端）

已配置完成，无需额外操作

## 环境 ID 配置清单

| 文件 | 配置项 | 说明 |
|-----|-------|------|
| `src/main.ts` | `wx.cloud.init({ env: 'xxx' })` | 替换为微信云开发环境 ID |
| `src/manifest.json` | `h5.uniCloud.spaceId` | 已配置支付宝云 |
| `src/utils/cloud.ts` | `callCloudH5` 中的 spaceId | 已配置支付宝云 |

## 清理后的目录

- ❌ 已删除：`uniCloud-aliyun/`（旧阿里云，废弃）
- ✅ 保留：`uniCloud-alipay/`（H5 后端）
- ✅ 保留：`cloudfunctions/`（小程序后端）

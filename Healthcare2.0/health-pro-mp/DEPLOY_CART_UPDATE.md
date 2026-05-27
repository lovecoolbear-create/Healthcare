# 购物车功能更新部署指南

## 本次更新内容

### 1. 前端更新（已自动保存）
- **头部购物车图标**：页面右上角添加了购物车入口，显示商品数量角标
- **产品列表购物车按钮**：所有产品都显示🛒按钮，紧急（低库存）时为红色，非紧急时为绿色
- **购物车弹窗UI**：支持查看购物车商品、调整数量、删除商品、清空购物车、合并下单
- **订单拆分显示**：订单中的每个产品单独显示状态（待发货/已发货/已收货），支持分别确认收货
- **移除一键补货**：改为购物车模式，用户可以自行选择商品合并下单
- **首页优化**：
  - 修正库存预警数字计算（基于web端同步的方案数据）
  - 修正空状态显示（等待web端同步时显示正确提示）

### 2. 后端更新（需部署）
- **订单结构更新**：每个产品添加独立状态字段（status, sub_order_id, tracking_no, tracking_image, shipped_at, received_at）
- **购物车订单标记**：新增 isCartOrder 字段标记合并订单
- **子订单确认收货API**：新增 confirmSubOrderReceipt 接口，支持单个产品确认收货

## 部署步骤

### 方法1：使用 HBuilderX（推荐）

1. 打开 HBuilderX
2. 打开项目：`/Users/blair/HealthCare/Healthcare2.0/health-pro-mp`
3. 在左侧项目树中找到 `uniCloud-alipay/cloudfunctions/client-api`
4. 右键点击 `client-api` 文件夹
5. 选择「上传部署：client-api」
6. 等待部署完成

### 方法2：使用 uniCloud Web 控制台

1. 访问：https://unicloud.dcloud.net.cn/
2. 登录账号
3. 选择服务空间：`env-00jy5xpjho0v`（Alipay Cloud）
4. 进入「云函数」页面
5. 找到 `client-api` 函数，点击「编辑」
6. 复制本地文件 `uniCloud-alipay/cloudfunctions/client-api/index.js` 的内容
7. 粘贴到编辑器中，点击「保存并部署」

## 部署后测试步骤

1. 打开小程序，进入「我的产品」页面
2. 点击产品旁边的🛒按钮，测试加入购物车功能
3. 点击头部购物车图标，打开购物车弹窗
4. 测试调整数量、删除商品、清空购物车功能
5. 提交购物车订单，测试合并下单
6. 查看订单列表，确认每个产品显示独立状态
7. 测试单个产品确认收货功能

## 文件修改清单

### 前端文件
- `/src/pages/client/inventory/index.vue` - 完整的购物车UI和功能实现
- `/src/pages/client/home/index.vue` - 首页问题修复（库存预警计算、空状态显示）

### 后端文件（需部署）
- `/uniCloud-alipay/cloudfunctions/client-api/index.js`
  - `createRefillOrder`：添加子订单字段和 isCartOrder 标记
  - `confirmSubOrderReceipt`：新增子订单确认收货接口

## 注意事项

1. 部署前请确保已备份数据
2. 新老订单兼容：旧订单没有子订单状态字段，会显示整体订单状态
3. 购物车数据存储在本地，切换设备或清除缓存后会丢失
4. 如遇到问题，可查看控制台日志进行排查

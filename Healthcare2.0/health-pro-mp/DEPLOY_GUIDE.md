# 部署配置指南 - HealthCare Pro

## 部署方式选择

本项目使用 **uniCloud 前端网页托管**，不需要 Netlify 部署。

### 推荐部署方式：uniCloud 前端网页托管

#### 方式一：HBuilderX 可视化上传

1. **打开 HBuilderX**
2. **点击菜单栏**：发行 → 网站-PC Web 或手机 H5
3. **选择**：uniCloud 前端网页托管
4. **点击发行**，自动上传到 uniCloud

#### 方式二：uniCloud CLI 命令行上传

```bash
# 安装 uniCloud CLI
npm install -g @dcloudio/uni-cloud-cli

# 登录 uniCloud
uni-cloud login

# 关联服务空间（使用你的 space-id）
uni-cloud space bind mp-5927ae4f-b97a-4d58-a897-f11cab5f7056

# 上传构建后的文件到前端网页托管
uni-cloud hosting upload --path ./dist/build/web --index index.html
```

#### 方式三：手动上传到 uniCloud 控制台

1. 访问 https://unicloud.dcloud.net.cn/
2. 选择服务空间 → 「前端网页托管」
3. 点击「上传文件」
4. 选择 `dist/build/web` 文件夹下的所有文件
5. 上传完成后获得访问域名

### 域名配置

**测试阶段**：使用 uniCloud 分配的默认域名（如 https://xxxx.unicloud.dcloud.net.cn）

**生产阶段**：
1. 在 uniCloud 控制台 → 前端网页托管 → 域名配置
2. 添加你自己的域名（如 admin.yourcompany.com）
3. 按提示配置 DNS 解析
4. 等待域名生效

### 部署检查清单

| 步骤 | 状态 | 操作 |
|-----|------|------|
| 1. 云函数上传 | ✅ 已完成 | user-center, client-api 已上传 |
| 2. 数据库初始化 | ⚠️ 部分完成 | 部分集合需手动创建 |
| 3. 前端构建 | ✅ 已完成 | dist/build/web 已生成 |
| 4. 前端部署 | ⏳ 待完成 | 需要上传到 uniCloud 托管 |
| 5. 域名绑定 | ⏳ 可选 | 测试阶段可用默认域名 |

### 部署后访问地址

上传完成后，uniCloud 会分配一个默认域名：
```
https://<space-id>.unicloud.dcloud.net.cn
```

### 验证部署

1. 访问分配的域名
2. 点击「注册营养师账号」
3. 填写信息注册
4. 登录后应能看到仪表板

### 注意事项

- **跨域问题**：如果前端和云函数不在同一域名，需要配置 CORS
- **HTTPS**：uniCloud 默认提供 HTTPS，无需额外配置
- **缓存**：上传新版本后，可能需要清除浏览器缓存

### 故障排查

**页面空白**：
- 检查浏览器控制台是否有 404 错误
- 确认所有资源文件都已上传

**云函数调用失败**：
- 检查云函数是否正确上传
- 检查服务空间是否正确关联

**注册失败**：
- 检查 he_users 集合是否存在
- 检查云函数日志（uniCloud 控制台 → 云函数 → 日志）

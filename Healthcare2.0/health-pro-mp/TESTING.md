# 🧪 自动化测试指南

## 已配置工具

### 1. Playwright MCP（IDE 集成）
- 位置：`~/.windsurf/mcp.json`
- 功能：浏览器自动化、截图、表单填写

### 2. Playwright 测试框架（项目级）
- 配置：`playwright.config.ts`
- 测试文件：`tests/*.spec.ts`

## 使用方法

### 方法一：AI 自动测试（推荐）
直接对我说：
```
"帮我测试订单发货流程"
"截图看看库存页面"
"测试管理员登录功能"
```

AI 会自动调用 Playwright MCP 完成测试。

### 方法二：命令行测试

```bash
# 运行所有测试
npm run test

# 可视化模式（有界面）
npm run test:ui

# 调试模式
npm run test:debug

# 查看测试报告
npm run test:report
```

### 方法三：单个测试文件

```bash
npx playwright test tests/orders.spec.ts
```

## 测试场景覆盖

| 模块 | 测试内容 |
|------|---------|
| 订单管理 | 查看订单、发货按钮、标签切换 |
| 库存管理 | 查看库存、添加补货订单 |
| 协议管理 | 协议编辑、保存、状态变更 |

## 添加新测试

在 `tests/` 目录新建 `.spec.ts` 文件：

```typescript
import { test, expect } from '@playwright/test';

test('你的测试描述', async ({ page }) => {
  await page.goto('/#/your-page');
  await expect(page.locator('text=xxx')).toBeVisible();
});
```

## 截图 & 录制

```bash
# 截图
npx playwright screenshot http://localhost:3000 screenshot.png

# 录制操作
npx playwright codegen http://localhost:3000
```

## 故障排除

1. **端口被占用**：确保开发服务器已启动 `npm run dev`
2. **测试失败**：使用 `npm run test:ui` 可视化调试
3. **截图空白**：增加 `page.waitForTimeout(1000)` 等待加载

---

💡 **小贴士**：测试前确保 `npm run dev` 已启动开发服务器！

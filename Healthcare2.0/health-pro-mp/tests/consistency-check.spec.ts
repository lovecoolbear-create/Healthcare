import { test, expect } from '@playwright/test';

/**
 * 多方案一致性与同步验证测试
 * 目的：确保 Web 列表、详情侧边栏以及后台数据库状态在多方案并存时保持完全一致。
 */

test.describe('多方案同步一致性验证', () => {
  const baseUrl = 'http://localhost:3000';
  
  // 模拟营养师登录状态 - 对齐已知有效的 Mock 数据
  const mockNutritionist = {
    id: 'nutri_001',
    name: '测试营养师',
    role: 'nutritionist',
    token: 'mock_token_nutritionist_001'
  };

  // 模拟待测客户（使用演示数据中的客户）
  const testClient = {
    name: '王',
    phone: '17733333333'
  };

  test.beforeEach(async ({ page }) => {
    // 设置本地存储模拟营养师登录 - 必须在 goto 之前执行
    await page.addInitScript((data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userId', data.id);
      localStorage.setItem('userInfo', JSON.stringify(data));
    }, mockNutritionist);
  });

  test('验证多方案添加与状态激活的一致性', async ({ page }) => {
    // 1. 先访问首页以建立访问上下文
    await page.goto(baseUrl);
    await page.waitForTimeout(1000);

    // 2. 通过执行 JS 直接设置认证信息（最稳健的方式）
    await page.evaluate((data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userId', data.id);
      localStorage.setItem('userInfo', JSON.stringify(data));
    }, mockNutritionist);

    // 3. 再次访问客户列表
    await page.goto(`${baseUrl}/pages/admin/clients/index`);
    await page.waitForTimeout(2000);

    // 检查是否还在登录页，如果是，说明 Token 被后端拒绝了
    const loginBtn = page.locator('button:has-text("登录控制台")');
    if (await loginBtn.isVisible()) {
      console.log('Token injection failed, trying UI click...');
      await loginBtn.click(); // 试试直接点登录
      await page.waitForTimeout(2000);
    }

    // 2. 搜索并选择测试客户
    const searchInput = page.locator('input[placeholder*="搜索"]');
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await searchInput.fill(testClient.name);
    await page.waitForTimeout(1000);
    
    // 确保列表已加载并找到客户行
    const clientCell = page.locator(`tr:has-text("${testClient.name}")`).first();
    await expect(clientCell).toBeVisible();

    // 记录初始方案执行状态（如果已存在方案则先清理，这里假设从干净状态开始或记录当前值）
    // 为了测试稳健性，我们直接点击进入详情
    await clientCell.click();
    await page.waitForTimeout(800);

    // 切换到方案标签页
    await page.click('text=健康方案');
    await page.waitForTimeout(500);

    // --- Step 1: 添加第一个方案（减脂） ---
    await page.click('button:has-text("添加方案")');
    await page.waitForTimeout(500);
    // 选择减脂方案（假设在弹窗中）
    await page.click('text=减脂');
    await page.click('button:has-text("确定")');
    await page.waitForTimeout(1000);
    
    // 侧边栏应显示 1 个方案
    const protocolCards = page.locator('.protocol-card');
    await expect(protocolCards).toHaveCount(1);

    // --- Step 2: 添加第二个方案（改善睡眠） ---
    await page.click('button:has-text("添加方案")');
    await page.waitForTimeout(500);
    await page.click('text=改善睡眠');
    await page.click('button:has-text("确定")');
    await page.waitForTimeout(1500);

    // 侧边栏应显示 2 个方案
    await expect(protocolCards).toHaveCount(2);

    // --- Step 3: 返回列表校验汇总数字 ---
    await page.click('button[aria-label="Close"]'); // 关闭侧边栏（假设有关闭按钮或点击遮罩）
    // 或者直接刷新/等待列表更新
    await page.waitForTimeout(500);
    const statusBadge = page.locator(`tr:has-text("${testClient.name}") >> text=方案执行中`);
    await expect(statusBadge).toContainText('2个方案执行中');

    // --- Step 4: 停止一个方案并验证同步 ---
    await clientCell.click(); // 重新打开详情
    await page.click('text=健康方案');
    // 寻找第二个方案的“停止”按钮
    const secondProtocol = protocolCards.nth(1);
    await secondProtocol.locator('button:has-text("停止")').click();
    await page.click('button:has-text("确定")');
    await page.waitForTimeout(1000);

    // 侧边栏状态验证：一个执行中，一个暂停中/已取消
    await expect(secondProtocol).toContainText('暂停中');
    
    // 关闭侧边栏，检查主列表数字是否变回 1
    await page.keyboard.press('Escape'); 
    await page.waitForTimeout(500);
    await expect(page.locator(`tr:has-text("${testClient.name}") >> text=方案执行中`)).toContainText('1个方案执行中');

    // --- Step 5: 【核心 Bug 修复验证】再次添加刚才停止的方案 ---
    await clientCell.click();
    await page.click('text=健康方案');
    await page.click('button:has-text("添加方案")');
    await page.waitForTimeout(500);
    await page.click('text=改善睡眠'); // 重新添加同一个
    await page.click('button:has-text("确定")');
    await page.waitForTimeout(1500);

    // 列表数字应该变回 2（如果 Bug 修复，状态会翻转为 active）
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const finalBadge = page.locator(`tr:has-text("${testClient.name}") >> text=方案执行中`);
    await expect(finalBadge).toContainText('2个方案执行中');
    
    console.log('✅ Consistency check passed: List count matches drawer protocols.');
  });
});

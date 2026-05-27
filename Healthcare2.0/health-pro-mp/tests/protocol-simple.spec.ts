import { test, expect } from '@playwright/test';

/**
 * 配方全生命周期测试 - 简化版
 * 流程：创建 → 编辑 → 同步 → 停止 → 恢复 → 删除
 */

test('配方完整生命周期', async ({ page }) => {
  const baseUrl = 'http://localhost:3000';
  
  // 模拟营养师登录
  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock_token_nutri_001');
    localStorage.setItem('userRole', 'nutritionist');
    localStorage.setItem('userId', 'nutri_001');
  });

  // 1. 创建配方
  await page.goto(`${baseUrl}/pages/admin/protocol/index?clientId=client_001`);
  await expect(page.locator('text=方案制定')).toBeVisible();
  
  await page.fill('input[type="text"]', '自动化测试配方');
  await page.fill('textarea', '测试配方描述');
  await page.click('button:has-text("添加产品")');
  await page.waitForTimeout(200);
  
  // 选择第一个产品
  const select = page.locator('select').first();
  await select.selectOption({ index: 1 });
  
  // 保存
  await page.click('button:has-text("保存")');
  await expect(page.locator('text=成功')).toBeVisible();
  
  // 2. 编辑配方 - 重新进入页面修改
  await page.fill('input[type="text"]', '自动化测试配方-已编辑');
  await page.click('button:has-text("保存")');
  await expect(page.locator('text=成功')).toBeVisible();
  
  // 3. 同步配方
  await page.goto(`${baseUrl}/pages/admin/clients/index`);
  await page.fill('input[placeholder*="搜索"]', '测试客户');
  await page.click('text=测试客户');
  await page.click('text=健康方案');
  
  // 点击同步按钮
  await page.click('button:has-text("同步")');
  await page.click('button:has-text("确认")');
  await expect(page.locator('text=同步成功')).toBeVisible();
  
  // 4. 停止方案
  await page.click('button:has-text("停止")');
  await page.click('button:has-text("确认")');
  await expect(page.locator('text=方案已停止')).toBeVisible();
  await expect(page.locator('text=暂停中')).toBeVisible();
  
  // 5. 恢复方案
  await page.click('button:has-text("恢复执行")');
  await page.click('button:has-text("确认")');
  await expect(page.locator('text=方案已恢复')).toBeVisible();
  await expect(page.locator('text=执行中')).toBeVisible();
  
  // 6. 删除方案
  await page.click('button:has-text("停止")');
  await page.click('button:has-text("确认")');
  await page.click('button:has-text("删除方案")');
  await page.click('button:has-text("确认")');
  await expect(page.locator('text=方案已删除')).toBeVisible();
});

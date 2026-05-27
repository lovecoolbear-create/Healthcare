import { test, expect } from '@playwright/test';

/**
 * 配方全生命周期测试
 * 覆盖：制作 → 编辑 → 同步 → 下发 → 停止 → 恢复 → 删除
 * 同时验证客户端同步
 */

test.describe('配方全生命周期管理', () => {
  const baseUrl = 'http://localhost:3000';
  
  // 模拟数据
  const mockNutritionist = {
    id: 'nutri_001',
    name: '测试营养师',
    role: 'nutritionist',
    token: 'mock_token_nutritionist_001'
  };

  const mockClient = {
    id: 'client_001',
    name: '测试客户',
    phone: '13800138001'
  };

  let createdProtocolId: string | null = null;
  let createdTemplateId: string | null = null;

  test.beforeEach(async ({ page }) => {
    // 设置本地存储模拟营养师登录
    await page.addInitScript((data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userId', data.id);
      localStorage.setItem('userInfo', JSON.stringify(data));
    }, mockNutritionist);
  });

  test('Phase 1: 营养师创建新配方模板', async ({ page }) => {
    // 直接访问配方制定页面（带clientId参数来创建新配方）
    await page.goto(`${baseUrl}/pages/admin/protocol/index?clientId=${mockClient.id}`);
    await page.waitForTimeout(800);

    // 等待页面加载 - 方案制定页面
    await expect(page.locator('text=方案制定')).toBeVisible();

    // 填写配方基本信息
    await page.fill('input[type="text"]', '测试自动化配方');
    await page.fill('textarea', '这是一个用于自动化测试的配方模板');

    // 添加产品项目
    await page.click('button:has-text("添加产品")');
    await page.waitForTimeout(300);

    // 填写产品信息
    const selects = await page.locator('select').all();
    if (selects.length > 0) {
      await selects[0].selectOption({ index: 1 }); // 选择第一个产品
    }

    // 设置每日用量
    const numberInputs = await page.locator('input[type="number"]').all();
    if (numberInputs.length > 0) {
      await numberInputs[0].fill('2');
    }

    // 保存配方 - 使用正确的按钮文本
    await page.click('button:has-text("保存方案")');

    // 验证保存成功
    await expect(page.locator('text=方案制定成功')).toBeVisible();

    // 获取创建的配方ID（从URL）
    const url = page.url();
    const match = url.match(/protocolId=([^&]+)/);
    if (match) {
      createdTemplateId = match[1];
    }

    await page.waitForTimeout(500);
  });

  test('Phase 2: 编辑已有配方', async ({ page }) => {
    test.skip(!createdTemplateId, '跳过：未创建配方模板');
    if (!createdTemplateId) return;

    // 访问客户详情页面来编辑已分配的方案
    await page.goto(`${baseUrl}/pages/admin/clients/index`);
    await page.waitForTimeout(500);

    // 找到客户
    await page.fill('input[placeholder*="搜索"]', mockClient.name);
    await page.waitForTimeout(300);
    await page.click(`text=${mockClient.name}`);
    await page.waitForTimeout(500);

    // 切换到方案标签
    await page.click('text=健康方案');
    await page.waitForTimeout(300);

    // 找到刚创建的配方并点击编辑
    await page.click(`text=测试自动化配方 >> xpath=..//button[contains(text(),"编辑")]`);
    await page.waitForTimeout(500);

    // 修改配方名称
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill('测试自动化配方-已编辑');

    // 保存修改
    await page.click('button:has-text("保存")');

    // 验证编辑成功
    await expect(page.locator('text=保存成功')).toBeVisible();
    await page.waitForTimeout(500);
  });

  test('Phase 3: 同步配方到云端', async ({ page }) => {
    test.skip(!createdTemplateId, '跳过：未创建配方模板');
    if (!createdTemplateId) return;

    // 访问客户详情页面
    await page.goto(`${baseUrl}/pages/admin/clients/index`);
    await page.waitForTimeout(500);

    // 找到客户
    await page.fill('input[placeholder*="搜索"]', mockClient.name);
    await page.waitForTimeout(300);
    await page.click(`text=${mockClient.name}`);
    await page.waitForTimeout(500);

    // 切换到方案标签
    await page.click('text=健康方案');
    await page.waitForTimeout(300);

    // 找到配方并点击同步按钮
    await page.click(`text=测试自动化配方-已编辑 >> xpath=..//button[contains(text(),"同步")]`);

    // 确认同步对话框
    await page.click('button:has-text("确认")');

    // 验证同步成功
    await expect(page.locator('text=同步成功')).toBeVisible();
    await page.waitForTimeout(500);
  });

  test('Phase 4: 验证方案已分配', async ({ page }) => {
    test.skip(!createdTemplateId, '跳过：未创建配方模板');
    if (!createdTemplateId) return;

    // 访问客户详情页面
    await page.goto(`${baseUrl}/pages/admin/clients/index`);
    await page.waitForTimeout(500);

    // 搜索并选择客户
    await page.fill('input[placeholder*="搜索"]', mockClient.name);
    await page.waitForTimeout(300);
    await page.click(`text=${mockClient.name}`);
    await page.waitForTimeout(500);

    // 切换到方案标签
    await page.click('text=健康方案');
    await page.waitForTimeout(300);

    // 验证方案已显示在客户详情中
    await expect(page.locator('text=测试自动化配方-已编辑')).toBeVisible();

    // 【新增同步验证】：关闭抽屉，验证主列表中的状态显示已更新
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // 在主列表中找到该客户的那一行，并检查“方案执行”列
    const clientRow = page.locator('tr').filter({ hasText: mockClient.name });
    await expect(clientRow.locator('text=1个方案执行中')).toBeVisible();

    // 重新打开抽屉继续后续测试
    await page.click(`text=${mockClient.name}`);
    await page.waitForTimeout(500);
    await page.click('text=健康方案');
    
    // 获取方案ID，供后续测试阶段使用
    const protocolElement = page.locator('.protocol-card, [class*="protocol"]').filter({ hasText: '测试自动化配方-已编辑' }).first();
    const idAttr = await protocolElement.getAttribute('data-id');
    if (idAttr) {
      createdProtocolId = idAttr;
      console.log('✅ 成功获取方案ID:', createdProtocolId);
    }

    await page.waitForTimeout(500);
  });

  test('Phase 5: 停止客户方案', async ({ page }) => {
    test.skip(!createdProtocolId, '跳过：未分配方案');
    if (!createdProtocolId) return;

    // 访问客户详情页面
    await page.goto(`${baseUrl}/pages/admin/clients/index`);
    await page.waitForTimeout(500);

    // 搜索并选择客户
    await page.fill('input[placeholder*="搜索"]', mockClient.name);
    await page.waitForTimeout(300);
    await page.click(`text=${mockClient.name}`);
    await page.waitForTimeout(500);

    // 切换到方案标签
    await page.click('text=健康方案');
    await page.waitForTimeout(300);

    // 找到方案并点击停止按钮
    await page.click(`text=测试自动化配方-已编辑 >> xpath=..//button[contains(text(),"停止")]`);

    // 确认停止对话框
    await page.click('button:has-text("确认")');

    // 验证停止成功，状态变为"暂停中"
    await expect(page.locator('text=方案已停止')).toBeVisible();

    // 等待页面刷新
    await page.waitForTimeout(800);

    // 验证状态显示为"暂停中"
    await expect(page.locator('text=暂停中').first()).toBeVisible();

    // 【新增同步验证】：验证主列表中的状态已同步更新（因为停止了，活跃方案数应变为0/未分配）
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const clientRow = page.locator('tr').filter({ hasText: mockClient.name });
    await expect(clientRow.locator('text=未分配方案')).toBeVisible();

    // 重新打开抽屉继续后续测试
    await page.click(`text=${mockClient.name}`);
    await page.waitForTimeout(500);
    await page.click('text=健康方案');

    await page.waitForTimeout(500);
  });

  test('Phase 6: 恢复已停止的方案', async ({ page }) => {
    test.skip(!createdProtocolId, '跳过：未分配方案');
    if (!createdProtocolId) return;

    // 访问客户详情页面
    await page.goto(`${baseUrl}/pages/admin/clients/index`);
    await page.waitForTimeout(500);

    // 搜索并选择客户
    await page.fill('input[placeholder*="搜索"]', mockClient.name);
    await page.waitForTimeout(300);
    await page.click(`text=${mockClient.name}`);
    await page.waitForTimeout(500);

    // 切换到方案标签
    await page.click('text=健康方案');
    await page.waitForTimeout(300);

    // 找到暂停的方案并点击恢复按钮
    await page.click('button:has-text("恢复执行")');

    // 确认恢复对话框
    await page.click('button:has-text("确认")');

    // 验证恢复成功，状态变回"执行中"
    await expect(page.locator('text=方案已恢复')).toBeVisible();

    // 等待页面刷新
    await page.waitForTimeout(800);

    // 验证状态显示为"执行中"
    await expect(page.locator('text=执行中').first()).toBeVisible();

    // 验证按钮恢复为"编辑、同步、停止"
    await expect(page.locator('button:has-text("编辑")').first()).toBeVisible();
    await expect(page.locator('button:has-text("同步")').first()).toBeVisible();
    await expect(page.locator('button:has-text("停止")').first()).toBeVisible();

    await page.waitForTimeout(500);
  });

  test('Phase 7: 停止并删除方案', async ({ page }) => {
    test.skip(!createdProtocolId, '跳过：未分配方案');
    if (!createdProtocolId) return;

    // 访问客户详情页面
    await page.goto(`${baseUrl}/pages/admin/clients/index`);
    await page.waitForTimeout(500);

    // 搜索并选择客户
    await page.fill('input[placeholder*="搜索"]', mockClient.name);
    await page.waitForTimeout(300);
    await page.click(`text=${mockClient.name}`);
    await page.waitForTimeout(500);

    // 切换到方案标签
    await page.click('text=健康方案');
    await page.waitForTimeout(300);

    // 先停止方案（如果还在执行中）
    const stopButton = page.locator('button:has-text("停止")').first();
    if (await stopButton.isVisible().catch(() => false)) {
      await stopButton.click();
      await page.click('button:has-text("确认")');
      await page.waitForTimeout(500);
    }

    // 点击删除按钮
    const deleteButton = page.locator('button:has-text("删除方案")').first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // 确认删除对话框
    await page.click('button:has-text("确认")');

    // 验证删除成功
    await expect(page.locator('text=方案已删除')).toBeVisible();

    // 等待页面刷新
    await page.waitForTimeout(800);

    // 验证方案不再显示
    await expect(page.locator('text=测试自动化配方-已编辑')).not.toBeVisible();

    // 【新增同步验证】：验证主列表中的状态已彻底清除
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const clientRow = page.locator('tr').filter({ hasText: mockClient.name });
    await expect(clientRow.locator('text=未分配方案')).toBeVisible();

    await page.waitForTimeout(500);
  });

  test('Phase 8: 验证客户端同步（小程序端）', async ({ page }) => {
    // 模拟客户端登录
    await page.addInitScript((data) => {
      localStorage.setItem('token', 'mock_client_token_001');
      localStorage.setItem('userRole', 'client');
      localStorage.setItem('userId', data.id);
      localStorage.setItem('userInfo', JSON.stringify(data));
    }, mockClient);

    // 访问小程序端今日打卡页面
    await page.goto(`${baseUrl}/pages/client/today/index`);
    await page.waitForTimeout(800);

    // 验证能看到下发的方案任务
    await expect(page.locator('text=测试自动化配方-已编辑').first()).toBeVisible();

    // 验证方案项目存在
    const items = await page.locator('text=/\\d+次|产品|剂量/').all();
    expect(items.length).toBeGreaterThan(0);

    // 验证可以打卡
    const checkinButton = page.locator('button:has-text("打卡")').first();
    if (await checkinButton.isVisible().catch(() => false)) {
      await checkinButton.click();
      await page.waitForTimeout(300);

      // 验证打卡成功
      await expect(page.locator('text=打卡成功').first()).toBeVisible();
    }

    await page.waitForTimeout(500);
  });

  test('Phase 9: 停止后客户端验证任务消失', async ({ page }) => {
    // 模拟客户端登录
    await page.addInitScript((data) => {
      localStorage.setItem('token', 'mock_client_token_001');
      localStorage.setItem('userRole', 'client');
      localStorage.setItem('userId', data.id);
      localStorage.setItem('userInfo', JSON.stringify(data));
    }, mockClient);

    // 访问小程序端今日打卡页面
    await page.goto(`${baseUrl}/pages/client/today/index`);
    await page.waitForTimeout(800);

    // 验证任务不再显示（或显示为暂停状态）
    const protocolVisible = await page.locator('text=测试自动化配方-已编辑').isVisible().catch(() => false);
    if (protocolVisible) {
      // 如果还显示，应该显示为暂停状态或已完成
      const statusText = await page.locator('text=/暂停中|已完成|已停止/').isVisible().catch(() => false);
      expect(statusText).toBe(true);
    }

    await page.waitForTimeout(500);
  });
});

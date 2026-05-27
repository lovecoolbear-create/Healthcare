import { test, expect } from '@playwright/test';

/**
 * 🎓 积分兑换课程功能测试
 * 
 * 测试范围：
 * - 课程列表展示
 * - 积分兑换课程
 * - 入场券查看
 */

test.describe('🎓 积分兑换课程功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 模拟登录状态
    await page.addInitScript(() => {
      const mockUser = {
        _id: 'test-user-123',
        username: '测试用户',
        phone: '138****1234',
        points: 500,
        streak_days: 7,
        token: 'mock-token',
        token_expires: Date.now() + 24 * 60 * 60 * 1000
      };
      localStorage.setItem('userInfo', JSON.stringify(mockUser));
    });
  });

  test('📚 课程列表页面应正确显示', async ({ page }) => {
    // 在页面加载前设置 mock
    await page.addInitScript(() => {
      const mockUser = {
        _id: 'test-user',
        username: '测试用户',
        points: 500
      };
      localStorage.setItem('userInfo', JSON.stringify(mockUser));
      
      (window as any).uniCloud = {
        callFunction: ({ name, data }: any) => {
          const { action } = data;
          
          if (action === 'getCourses') {
            return Promise.resolve({
              result: {
                code: 0,
                data: [
                  {
                    _id: 'course-001',
                    title: '大健康行业数字化营销实战',
                    lecturer: '张教授 · 营养学会专家',
                    description: '学习如何利用数字化工具提升健康管理效率',
                    startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
                    location: '线上直播',
                    pointsRequired: 200,
                    maxCapacity: 100,
                    enrolledCount: 45,
                    coverEmoji: '🎓',
                    status: 'upcoming',
                    isExchanged: false
                  },
                  {
                    _id: 'course-002',
                    title: '精准营养与慢病管理',
                    lecturer: '李博士 · 临床营养师',
                    description: '深入了解慢病患者的营养需求',
                    startTime: Date.now() + 14 * 24 * 60 * 60 * 1000,
                    location: '上海市静安区',
                    pointsRequired: 300,
                    maxCapacity: 50,
                    enrolledCount: 50,
                    coverEmoji: '🥗',
                    status: 'full',
                    isExchanged: false
                  }
                ]
              }
            });
          }
          
          if (action === 'getUserInfo') {
            return Promise.resolve({
              result: {
                code: 0,
                data: { points: 500, _id: 'test-user', username: '测试用户' }
              }
            });
          }
          
          return Promise.resolve({ result: { code: -1, msg: '未实现' } });
        }
      };
    });
    
    await page.goto('/pages/client/course-exchange/index');
    await page.waitForLoadState('networkidle');
    
    // 等待课程数据加载
    await page.waitForSelector('text=大健康行业数字化营销实战', { timeout: 10000 });
    
    // 验证页面标题
    await expect(page.locator('text=课程兑换').first()).toBeVisible();
    
    // 验证积分显示
    await expect(page.locator('text=可用积分')).toBeVisible();
    await expect(page.locator('text=500')).toBeVisible();
    
    // 验证课程列表
    await expect(page.locator('text=热门课程')).toBeVisible();
    await expect(page.locator('text=大健康行业数字化营销实战')).toBeVisible();
    await expect(page.locator('text=张教授 · 营养学会专家')).toBeVisible();
    
    // 验证积分要求和报名人数
    await expect(page.locator('text=200 积分').first()).toBeVisible();
    await expect(page.locator('text=45/100')).toBeVisible();
  });

  test(' 积分不足时应显示提示', async ({ page }) => {
    // 在页面加载前设置 mock
    await page.addInitScript(() => {
      const mockUser = {
        _id: 'test-user',
        username: '测试用户',
        points: 100
      };
      localStorage.setItem('userInfo', JSON.stringify(mockUser));
      
      (window as any).uniCloud = {
        callFunction: ({ name, data }: any) => {
          const { action } = data;
          
          if (action === 'getCourses') {
            return Promise.resolve({
              result: {
                code: 0,
                data: [
                  {
                    _id: 'course-001',
                    title: '大健康行业数字化营销实战',
                    lecturer: '张教授',
                    description: '学习如何利用数字化工具提升健康管理效率',
                    startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
                    location: '线上直播',
                    pointsRequired: 200,
                    maxCapacity: 100,
                    enrolledCount: 45,
                    coverEmoji: '🎓',
                    status: 'upcoming',
                    isExchanged: false
                  }
                ]
              }
            });
          }
          
          if (action === 'getUserInfo') {
            return Promise.resolve({
              result: {
                code: 0,
                data: { points: 100, _id: 'test-user', username: '测试用户' }
              }
            });
          }
          
          return Promise.resolve({ result: { code: -1, msg: '未实现' } });
        }
      };
    });
    
    await page.goto('/pages/client/course-exchange/index');
    await page.waitForLoadState('networkidle');
    
    // 等待渲染
    await page.waitForTimeout(500);
    
    // 点击课程卡片展开
    await page.click('text=大健康行业数字化营销实战');
    await page.waitForTimeout(200);
    
    // 验证积分不足提示
    await expect(page.locator('text=积分不足')).toBeVisible();
  });

  test('🎫 已兑换课程应显示已报名状态', async ({ page }) => {
    // 在页面加载前设置 mock
    await page.addInitScript(() => {
      const mockUser = {
        _id: 'test-user',
        username: '测试用户',
        points: 350
      };
      localStorage.setItem('userInfo', JSON.stringify(mockUser));
      
      (window as any).uniCloud = {
        callFunction: ({ name, data }: any) => {
          const { action } = data;
          
          if (action === 'getCourses') {
            return Promise.resolve({
              result: {
                code: 0,
                data: [
                  {
                    _id: 'course-003',
                    title: '健康管理师认证培训',
                    lecturer: '王老师 · 资深讲师',
                    description: '系统的健康管理师培训课程',
                    startTime: Date.now() + 3 * 24 * 60 * 60 * 1000,
                    location: '线上直播',
                    pointsRequired: 150,
                    maxCapacity: 200,
                    enrolledCount: 89,
                    coverEmoji: '📜',
                    status: 'upcoming',
                    isExchanged: true,
                    ticketCode: 'TK123456789ABC'
                  }
                ]
              }
            });
          }
          
          if (action === 'getUserInfo') {
            return Promise.resolve({
              result: {
                code: 0,
                data: { points: 350, _id: 'test-user', username: '测试用户' }
              }
            });
          }
          
          return Promise.resolve({ result: { code: -1, msg: '未实现' } });
        }
      };
    });
    
    await page.goto('/pages/client/course-exchange/index');
    await page.waitForLoadState('networkidle');
    
    // 等待渲染
    await page.waitForTimeout(500);
    
    // 点击课程卡片展开
    await page.click('text=健康管理师认证培训');
    await page.waitForTimeout(200);
    
    // 验证已兑换状态
    await expect(page.locator('text=已报名')).toBeVisible();
  });

  test('🔄 兑换课程流程 - 点击展开后直接兑换', async ({ page }) => {
    // 在页面加载前设置 mock
    await page.addInitScript(() => {
      const mockUser = {
        _id: 'test-user',
        username: '测试用户',
        points: 500
      };
      localStorage.setItem('userInfo', JSON.stringify(mockUser));
      
      (window as any).uniCloud = {
        callFunction: ({ name, data }: any) => {
          const { action } = data;
          
          if (action === 'getCourses') {
            return Promise.resolve({
              result: {
                code: 0,
                data: [
                  {
                    _id: 'course-004',
                    title: 'AI时代的健康数据管理',
                    lecturer: '陈博士 · 数据科学家',
                    description: '学习如何使用AI工具分析健康数据',
                    startTime: Date.now() + 5 * 24 * 60 * 60 * 1000,
                    location: '线上直播',
                    pointsRequired: 250,
                    maxCapacity: 80,
                    enrolledCount: 32,
                    coverEmoji: '🤖',
                    status: 'upcoming',
                    isExchanged: false
                  }
                ]
              }
            });
          }
          
          if (action === 'getUserInfo') {
            return Promise.resolve({
              result: {
                code: 0,
                data: { points: 500, _id: 'test-user', username: '测试用户' }
              }
            });
          }
          
          if (action === 'exchangeCourse') {
            (window as any).exchangeCalled = true;
            return Promise.resolve({
              result: {
                code: 0,
                msg: '兑换成功',
                data: { ticketCode: 'TK123456', remainingPoints: 250 }
              }
            });
          }
          
          return Promise.resolve({ result: { code: -1, msg: '未实现' } });
        }
      };
    });
    
    await page.goto('/pages/client/course-exchange/index');
    await page.waitForLoadState('networkidle');
    
    // 等待渲染
    await page.waitForTimeout(500);
    
    // 点击课程卡片展开详情
    await page.click('text=AI时代的健康数据管理');
    await page.waitForTimeout(200);
    
    // 验证展开后显示详情
    await expect(page.locator('text=时间：')).toBeVisible();
    
    // 点击兑换按钮
    await page.click('text=立即兑换 (250积分)');
    await page.waitForTimeout(500);
    
    // 验证兑换API被调用
    const exchangeCalled = await page.evaluate(() => (window as any).exchangeCalled);
    expect(exchangeCalled).toBe(true);
    
    // 验证显示已报名状态
    await expect(page.locator('text=已报名')).toBeVisible();
  });

  test('📅 已结束课程应显示结束状态', async ({ page }) => {
    // 在页面加载前设置 mock
    await page.addInitScript(() => {
      const mockUser = {
        _id: 'test-user',
        username: '测试用户',
        points: 300
      };
      localStorage.setItem('userInfo', JSON.stringify(mockUser));
      
      (window as any).uniCloud = {
        callFunction: ({ name, data }: any) => {
          const { action } = data;
          
          if (action === 'getCourses') {
            return Promise.resolve({
              result: {
                code: 0,
                data: [
                  {
                    _id: 'course-005',
                    title: '过去的课程',
                    lecturer: '某讲师',
                    description: '这是一门已经结束的课程',
                    startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
                    location: '线上直播',
                    pointsRequired: 100,
                    maxCapacity: 100,
                    enrolledCount: 100,
                    coverEmoji: '📚',
                    status: 'ended',
                    isExchanged: false
                  }
                ]
              }
            });
          }
          
          if (action === 'getUserInfo') {
            return Promise.resolve({
              result: {
                code: 0,
                data: { points: 300, _id: 'test-user', username: '测试用户' }
              }
            });
          }
          
          return Promise.resolve({ result: { code: -1, msg: '未实现' } });
        }
      };
    });
    
    await page.goto('/pages/client/course-exchange/index');
    await page.waitForLoadState('networkidle');
    
    // 等待渲染
    await page.waitForTimeout(500);
    
    // 点击课程卡片展开
    await page.click('text=过去的课程');
    await page.waitForTimeout(200);
    
    // 验证已结束状态标签
    await expect(page.locator('text=已结束').first()).toBeVisible();
    
    // 验证按钮显示已结束且不可点击
    const button = page.locator('button:has-text("已结束")');
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  });

  test('🎓 积分兑换课程入口在"我的"页面', async ({ page }) => {
    // 在页面加载前设置 mock
    await page.addInitScript(() => {
      const mockUser = {
        _id: 'test-user',
        username: '测试用户',
        points: 500
      };
      localStorage.setItem('userInfo', JSON.stringify(mockUser));
      
      (window as any).uniCloud = {
        callFunction: ({ name, data }: any) => {
          const { action } = data;
          
          if (action === 'getUserInfo') {
            return Promise.resolve({
              result: {
                code: 0,
                data: { points: 500, _id: 'test-user', username: '测试用户', streak_days: 5 }
              }
            });
          }
          
          return Promise.resolve({ result: { code: -1, msg: '未实现' } });
        }
      };
    });
    
    // 访问"我的"页面
    await page.goto('/pages/client/profile/index');
    await page.waitForLoadState('networkidle');
    
    // 等待菜单渲染
    await page.waitForTimeout(500);
    
    // 验证积分兑换课程菜单存在
    await expect(page.locator('text=积分兑换课程').first()).toBeVisible();
    await expect(page.locator('text=🎓').first()).toBeVisible();
    
    // 点击菜单
    await page.click('text=积分兑换课程');
    
    // 验证跳转
    await page.waitForURL('**/pages/client/course-exchange/index');
  });

});

/**
 * 🔗 端到端完整流程测试
 * 
 * 测试场景：
 * 1. 顾问在Web端创建课程
 * 2. 顾问编辑课程信息
 * 3. 客户在小程序端用积分兑换课程
 * 4. 顾问查看报名客户列表
 */
test.describe('🔗 课程管理端到端流程测试', () => {
  
  const testCourse = {
    title: '测试课程 - 大健康数字化转型',
    lecturer: '王教授 · 数字化专家',
    description: '学习如何利用数字化工具提升健康管理效率',
    location: '线上直播',
    pointsRequired: 200,
    maxCapacity: 50,
    coverEmoji: '🎓'
  };

  const editedCourse = {
    title: '测试课程 - 大健康数字化转型（已更新）',
    lecturer: '李教授 · 资深专家',
    pointsRequired: 250
  };

  const mockClient = {
    _id: 'client-001',
    username: '张客户',
    phone: '138****8888',
    points: 500,
    token: 'client-mock-token'
  };

  const mockAdmin = {
    _id: 'admin-001',
    username: '顾问小王',
    role: 'admin',
    token: 'admin-mock-token'
  };

  test('🔄 完整流程：创建→编辑→兑换→查看报名', async ({ browser }) => {
    // ========== 步骤1: 顾问登录并创建课程 ==========
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    
    // 模拟顾问登录
    await adminPage.addInitScript((admin) => {
      localStorage.setItem('userInfo', JSON.stringify(admin));
      localStorage.setItem('token', admin.token);
      localStorage.setItem('currentViewRole', 'admin');
    }, mockAdmin);

    // 拦截admin-api请求
    let createdCourseId = '';
    let courseCreated = false;
    let courseUpdated = false;
    
    await adminPage.route('**/admin-api', async (route) => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      if (postData.action === 'initCollections') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ code: 0, msg: '初始化成功' })
        });
        return;
      }
      
      if (postData.action === 'getCourses') {
        const courses = courseCreated ? [{
          _id: createdCourseId || 'course-test-001',
          ...testCourse,
          startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
          enrolledCount: 0,
          status: 'upcoming',
          createdAt: Date.now(),
          updatedAt: courseUpdated ? Date.now() : Date.now() - 1000
        }] : [];
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            code: 0, 
            data: courses,
            pagination: { total: courses.length, page: 1, pageSize: 20, totalPages: 1 }
          })
        });
        return;
      }
      
      if (postData.action === 'createCourse') {
        courseCreated = true;
        createdCourseId = 'course-test-' + Date.now();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            msg: '课程创建成功',
            data: {
              _id: createdCourseId,
              ...postData.payload,
              enrolledCount: 0,
              status: 'upcoming',
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          })
        });
        return;
      }
      
      if (postData.action === 'updateCourse') {
        courseUpdated = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            msg: '课程更新成功',
            data: {
              _id: postData.payload.id,
              ...postData.payload,
              updatedAt: Date.now()
            }
          })
        });
        return;
      }
      
      if (postData.action === 'getCourseEnrollments') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 0,
            data: courseCreated ? [{
              _id: 'enroll-001',
              userName: mockClient.username,
              userPhone: mockClient.phone,
              ticketCode: 'TK' + Date.now(),
              exchangedAt: Date.now()
            }] : []
          })
        });
        return;
      }
      
      await route.continue();
    });

    // 访问课程管理页面
    await adminPage.goto('/pages/admin/courses/index');
    await adminPage.waitForLoadState('networkidle');
    
    // 验证空状态
    await expect(adminPage.locator('text=暂无课程')).toBeVisible();
    
    // 点击发布第一门课程
    await adminPage.click('text=+ 发布第一门课程');
    
    // 填写课程信息
    await adminPage.fill('input[placeholder*="大健康"] >> nth=0', testCourse.title);
    await adminPage.fill('input[placeholder*="张教授"]', testCourse.lecturer);
    await adminPage.fill('textarea[placeholder*="课程"]', testCourse.description);
    await adminPage.fill('input[placeholder*="线上直播"]', testCourse.location);
    
    // 选择日期（使用picker）
    await adminPage.click('text=选择日期');
    // 由于uni-app picker难以在Playwright中直接操作，模拟选择
    await adminPage.evaluate(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7);
      (window as any).dateValue = tomorrow.toISOString().split('T')[0];
    });
    
    // 点击发布课程
    await adminPage.click('text=发布课程');
    
    // 验证创建成功
    await expect(adminPage.locator('text=发布成功')).toBeVisible();
    await expect(adminPage.locator(`text=${testCourse.title}`)).toBeVisible();
    
    // 验证课程显示在列表中
    await expect(adminPage.locator(`text=${testCourse.lecturer}`)).toBeVisible();
    await expect(adminPage.locator('text=0/50')).toBeVisible(); // 报名人数
    
    console.log('✅ 步骤1完成: 课程创建成功');

    // ========== 步骤2: 编辑课程 ==========
    // 点击编辑按钮
    await adminPage.click('[title="编辑"]');
    
    // 修改课程信息
    await adminPage.fill('input[placeholder*="大健康"] >> nth=0', editedCourse.title);
    await adminPage.fill('input[placeholder*="张教授"]', editedCourse.lecturer);
    
    // 修改积分要求
    const pointsInput = adminPage.locator('input[type="number"]').nth(0);
    await pointsInput.fill(String(editedCourse.pointsRequired));
    
    // 点击保存
    await adminPage.click('text=保存修改');
    
    // 验证更新成功
    await expect(adminPage.locator('text=保存成功')).toBeVisible();
    await expect(adminPage.locator(`text=${editedCourse.title}`)).toBeVisible();
    
    console.log('✅ 步骤2完成: 课程编辑成功');

    // ========== 步骤3: 客户在小程序端兑换课程 ==========
    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();
    
    // 访问课程兑换页面
    await clientPage.goto('/pages/client/course-exchange/index');
    await clientPage.waitForLoadState('networkidle');
    
    // 在页面加载后覆盖 uniCloud
    // 注意：由于 page.evaluate 参数序列化限制，我们在函数内直接使用外部变量
    const clientData = JSON.stringify(mockClient);
    const courseData = JSON.stringify(editedCourse);
    const courseId = createdCourseId;
    
    await clientPage.evaluate(({ clientData, courseData, courseId }) => {
      const client = JSON.parse(clientData);
      const course = JSON.parse(courseData);
      
      localStorage.setItem('userInfo', JSON.stringify(client));
      localStorage.setItem('token', client.token);
      
      let exchangeCompleted = false;
      let exchangedTicketCode = '';
      
      (window as any).uniCloud = {
        callFunction: ({ name, data }: any) => {
          const { action } = data;
          
          if (action === 'getCourses') {
            return Promise.resolve({
              result: {
                code: 0,
                data: courseId ? [{
                  _id: courseId,
                  title: course.title,
                  lecturer: course.lecturer,
                  description: '测试课程描述',
                  startTime: Date.now() + 7 * 24 * 60 * 60 * 1000,
                  location: '线上直播',
                  pointsRequired: course.pointsRequired,
                  maxCapacity: 50,
                  enrolledCount: exchangeCompleted ? 1 : 0,
                  coverEmoji: '🎓',
                  status: 'upcoming',
                  isExchanged: exchangeCompleted,
                  ticketCode: exchangeCompleted ? exchangedTicketCode : undefined
                }] : []
              }
            });
          }
          
          if (action === 'getUserInfo') {
            return Promise.resolve({
              result: {
                code: 0,
                data: {
                  _id: client._id,
                  username: client.username,
                  points: exchangeCompleted ? client.points - course.pointsRequired : client.points,
                  streak_days: 5
                }
              }
            });
          }
          
          if (action === 'exchangeCourse') {
            exchangeCompleted = true;
            exchangedTicketCode = 'TK' + Date.now() + 'XYZ';
            (window as any).exchangeCompleted = true;
            (window as any).exchangedTicketCode = exchangedTicketCode;
            return Promise.resolve({
              result: {
                code: 0,
                msg: '兑换成功',
                data: {
                  ticketCode: exchangedTicketCode,
                  remainingPoints: client.points - course.pointsRequired
                }
              }
            });
          }
          
          return Promise.resolve({ result: { code: -1, msg: '未实现' } });
        }
      };
    }, { clientData, courseData, courseId });
    
    // 刷新页面使覆盖生效
    await clientPage.reload();
    await clientPage.waitForLoadState('networkidle');
    
    // 验证课程显示
    await expect(clientPage.locator(`text=${editedCourse.title}`)).toBeVisible();
    await expect(clientPage.locator(`text=${editedCourse.pointsRequired}`)).toBeVisible();
    await expect(clientPage.locator('text=立即兑换')).toBeVisible();
    
    // 点击课程卡片展开详情
    await clientPage.click(`text=${editedCourse.title}`);
    
    // 验证展开后显示详情
    await expect(clientPage.locator('text=时间：')).toBeVisible();
    
    // 点击兑换（直接兑换，无确认弹窗）
    await clientPage.click(`text=立即兑换 (${editedCourse.pointsRequired}积分)`);
    
    // 等待兑换完成
    await clientPage.waitForTimeout(500);
    
    // 验证显示已报名状态
    await expect(clientPage.locator('text=已报名')).toBeVisible();
    
    // 获取 ticketCode 用于后续验证
    const exchangedTicketCode = await clientPage.evaluate(() => (window as any).exchangedTicketCode);
    
    console.log('✅ 步骤3完成: 客户兑换成功');

    // ========== 步骤4: 顾问查看报名客户 ==========
    // 回到管理端页面
    await adminPage.reload();
    await adminPage.waitForLoadState('networkidle');
    
    // 点击查看报名按钮
    await adminPage.click('[title="查看报名"]');
    
    // 验证报名列表弹窗
    await expect(adminPage.locator('text=报名名单')).toBeVisible();
    
    // 验证客户信息显示
    await expect(adminPage.locator(`text=${mockClient.username}`)).toBeVisible();
    await expect(adminPage.locator(`text=${mockClient.phone}`)).toBeVisible();
    await expect(adminPage.locator(`text=${exchangedTicketCode}`)).toBeVisible();
    
    // 关闭弹窗
    await adminPage.click('text=关闭');
    
    // 验证报名人数更新
    await expect(adminPage.locator('text=1/50')).toBeVisible();
    
    console.log('✅ 步骤4完成: 查看报名客户成功');

    // 清理
    await adminContext.close();
    await clientContext.close();
    
    console.log('\n🎉 端到端完整流程测试全部通过！');
  });

});

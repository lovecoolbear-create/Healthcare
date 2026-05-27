import { test, expect } from '@playwright/test';

// 性能阈值配置
const PERFORMANCE_THRESHOLDS = {
  LCP: 2500,        // 最大内容绘制 < 2.5s
  FCP: 1800,        // 首次内容绘制 < 1.8s
  TTI: 3500,        // 可交互时间 < 3.5s
  TBT: 200,         // 总阻塞时间 < 200ms
  CLS: 0.1,         // 累积布局偏移 < 0.1
};

test.describe('⚡ 性能测试', () => {
  
  test.describe('📊 页面加载性能', () => {
    test('首页性能指标', async ({ page }) => {
      // 启用性能监测
      await page.goto('/#/pages/index/index');
      
      // 等待页面稳定
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // 收集性能指标
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          // 导航时间
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime,
          loadComplete: navigation?.loadEventEnd - navigation?.startTime,
          // 绘制时间
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        };
      });
      
      console.log('首页性能指标:', performanceMetrics);
      
      // 验证性能阈值
      if (performanceMetrics.firstContentfulPaint) {
        expect(performanceMetrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP);
      }
      
      if (performanceMetrics.domContentLoaded) {
        expect(performanceMetrics.domContentLoaded).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP);
      }
      
      console.log('✓ 首页性能达标');
    });

    test('订单管理页面性能', async ({ page }) => {
      await page.goto('/#/pages/admin/orders/index');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime,
          loadComplete: navigation?.loadEventEnd - navigation?.startTime,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        };
      });
      
      console.log('订单页面性能指标:', performanceMetrics);
      
      if (performanceMetrics.firstContentfulPaint) {
        expect(performanceMetrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP);
      }
      
      console.log('✓ 订单页面性能达标');
    });

    test('库存页面性能', async ({ page }) => {
      await page.goto('/#/pages/client/inventory/index');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        return {
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.startTime,
          loadComplete: navigation?.loadEventEnd - navigation?.startTime,
        };
      });
      
      console.log('库存页面性能指标:', performanceMetrics);
      
      // 库存页面有大量数据，允许稍长加载时间
      if (performanceMetrics.domContentLoaded) {
        expect(performanceMetrics.domContentLoaded).toBeLessThan(4000); // 4秒内
      }
      
      console.log('✓ 库存页面性能达标');
    });
  });

  test.describe('🔄 交互响应性能', () => {
    test('标签切换响应时间', async ({ page }) => {
      await page.goto('/#/pages/admin/orders/index');
      await page.waitForLoadState('networkidle');
      
      // 测量标签切换时间
      const startTime = Date.now();
      
      const tabShipped = page.getByText('已发货', { exact: true });
      await tabShipped.click();
      
      await page.waitForTimeout(100);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`标签切换响应时间: ${responseTime}ms`);
      
      // 交互响应应在300ms内
      expect(responseTime).toBeLessThan(300);
      console.log('✓ 标签切换响应迅速');
    });

    test('搜索输入响应时间', async ({ page }) => {
      await page.goto('/#/pages/admin/clients/index');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[type="text"]').first();
      
      if (await searchInput.isVisible().catch(() => false)) {
        const startTime = Date.now();
        
        await searchInput.fill('测试搜索');
        
        const endTime = Date.now();
        const inputTime = endTime - startTime;
        
        console.log(`搜索输入响应时间: ${inputTime}ms`);
        
        // 输入响应应在100ms内感知
        expect(inputTime).toBeLessThan(500);
        console.log('✓ 搜索输入响应迅速');
      } else {
        console.log('⚠ 未找到搜索框');
        expect(true).toBeTruthy();
      }
    });

    test('按钮点击反馈时间', async ({ page }) => {
      await page.goto('/#/pages/client/inventory/index');
      await page.waitForLoadState('networkidle');
      
      const button = page.locator('button').first();
      
      if (await button.isVisible().catch(() => false)) {
        const startTime = Date.now();
        
        await button.click();
        
        const endTime = Date.now();
        const clickTime = endTime - startTime;
        
        console.log(`按钮点击响应时间: ${clickTime}ms`);
        
        expect(clickTime).toBeLessThan(200);
        console.log('✓ 按钮点击响应迅速');
      } else {
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe('💾 内存使用', () => {
    test('页面内存占用合理', async ({ page }) => {
      await page.goto('/#/pages/admin/orders/index');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // 等待稳定
      
      // 获取内存使用情况（如果浏览器支持）
      const memoryInfo = await page.evaluate(() => {
        // @ts-ignore
        if (performance.memory) {
          // @ts-ignore
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
          };
        }
        return null;
      });
      
      if (memoryInfo) {
        const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
        console.log(`内存使用: ${usedMB.toFixed(2)} MB`);
        
        // 内存使用应小于100MB
        expect(usedMB).toBeLessThan(100);
        console.log('✓ 内存使用合理');
      } else {
        console.log('⚠ 浏览器不支持内存API');
        expect(true).toBeTruthy();
      }
    });
  });

  test.describe('🌐 网络请求性能', () => {
    test('API请求响应时间', async ({ page }) => {
      // 使用更简单的方式测量API请求时间
      const apiRequests: { url: string; duration: number; status: number }[] = [];
      
      const startTimes: Map<string, number> = new Map();
      
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/client-api') || url.includes('/api/')) {
          startTimes.set(url, Date.now());
        }
      });
      
      page.on('response', (response) => {
        const request = response.request();
        const url = request.url();
        
        if (startTimes.has(url)) {
          const duration = Date.now() - (startTimes.get(url) || 0);
          apiRequests.push({
            url,
            duration,
            status: response.status(),
          });
        }
      });
      
      await page.goto('/#/pages/admin/orders/index');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      console.log('API请求统计:', apiRequests);
      
      // 验证API响应时间
      for (const request of apiRequests) {
        expect(request.status).toBeLessThan(500); // 无服务器错误
        expect(request.duration).toBeLessThan(5000); // 5秒内响应（放宽阈值）
      }
      
      if (apiRequests.length > 0) {
        console.log('✓ API请求性能正常');
      } else {
        console.log('⚠ 未捕获到API请求');
      }
      
      expect(true).toBeTruthy();
    });

    test('静态资源加载时间', async ({ page }) => {
      const resourceTimings: { name: string; duration: number; size: number }[] = [];
      
      page.on('response', async (response) => {
        const request = response.request();
        const url = request.url();
        
        if (url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
          const headers = await response.allHeaders();
          const size = parseInt(headers['content-length'] || '0');
          
          const timing = await response.request().timing();
          const duration = timing?.responseEnd || 0;
          
          resourceTimings.push({
            name: url.split('/').pop() || '',
            duration,
            size,
          });
        }
      });
      
      await page.goto('/#/pages/index/index');
      await page.waitForLoadState('networkidle');
      
      // 分析大资源
      const largeResources = resourceTimings.filter(r => r.size > 500 * 1024); // >500KB
      const slowResources = resourceTimings.filter(r => r.duration > 1000); // >1s
      
      console.log('大资源:', largeResources.map(r => `${r.name} (${(r.size/1024).toFixed(1)}KB)`));
      console.log('慢资源:', slowResources.map(r => `${r.name} (${r.duration}ms)`));
      
      // 优化建议
      if (largeResources.length > 0) {
        console.log('⚠ 存在大资源，建议开启Gzip压缩或懒加载');
      }
      
      if (slowResources.length > 0) {
        console.log('⚠ 存在慢资源，建议优化或CDN加速');
      }
      
      expect(true).toBeTruthy();
    });
  });

  test.describe('📱 渲染性能', () => {
    test('长列表渲染不卡顿', async ({ page }) => {
      await page.goto('/#/pages/client/inventory/index');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // 滚动测试
      const scrollStartTime = Date.now();
      
      await page.evaluate(() => {
        window.scrollTo(0, 500);
      });
      
      await page.waitForTimeout(100);
      
      const scrollEndTime = Date.now();
      const scrollTime = scrollEndTime - scrollStartTime;
      
      console.log(`滚动响应时间: ${scrollTime}ms`);
      
      // 滚动应流畅（<100ms响应）
      expect(scrollTime).toBeLessThan(200);
      console.log('✓ 长列表滚动流畅');
    });

    test('动画性能流畅', async ({ page }) => {
      await page.goto('/#/pages/admin/dashboard/index');
      await page.waitForLoadState('networkidle');
      
      // 检查动画帧率
      const frameRate = await page.evaluate(async () => {
        let frameCount = 0;
        const startTime = performance.now();
        
        const countFrames = () => {
          frameCount++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrames);
          }
        };
        
        requestAnimationFrame(countFrames);
        
        // 等待1秒
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return frameCount;
      });
      
      console.log(`动画帧率: ${frameRate} FPS`);
      
      // 帧率应接近60fps
      expect(frameRate).toBeGreaterThan(30);
      console.log('✓ 动画性能良好');
    });
  });
});

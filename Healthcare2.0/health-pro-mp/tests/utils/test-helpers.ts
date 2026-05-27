import { Page } from '@playwright/test';

/**
 * 🛠️ Playwright 测试工具函数
 * 
 * 提供统一的测试辅助函数，避免代码重复
 */

/** 测试服务器基础 URL */
export const baseUrl = 'http://localhost:3000';

/** 智能等待页面加载完成 */
export const waitForPageLoad = async (page: Page, timeout = 10000) => {
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(500);
};

export const mockUniCloudClientApi = async (page: Page) => {
  await page.addInitScript(() => {
    const readJson = <T = any>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    };

    const writeJson = (key: string, value: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
      }
    };

    const now = () => Date.now();
    const uidKey = '__mock_uid__';
    const invKey = '__mock_inventory__';
    const orderKey = '__mock_orders__';
    const logKey = '__mock_inventory_logs__';

    const ensureSeed = () => {
      const localUserInfo = readJson<any>('userInfo', null);
      const inferredUid = String(localUserInfo?._id || localUserInfo?.uid || localUserInfo?.id || '');
      const uid = inferredUid || readJson<string>(uidKey, '') || 'test-client-id';
      writeJson(uidKey, uid);

      const inv = readJson<any[]>(invKey, []);
      if (!Array.isArray(inv) || inv.length === 0) {
        writeJson(invKey, [
          {
            _id: 'inv-vitc',
            user_id: uid,
            product_id: 'prod-vitc',
            name: '维C',
            product_name: '维C',
            stock: 0,
            unit: '瓶',
            icon: '💊',
            capacity: 60,
            daily_usage: 2,
            low_stock_days: 7,
            min_purchase_qty: 1,
            created_at: now(),
            updated_at: now()
          },
          {
            _id: 'inv-fishoil',
            user_id: uid,
            product_id: 'prod-fishoil',
            name: '鱼油',
            product_name: '鱼油',
            stock: 1,
            unit: '瓶',
            icon: '🐟',
            capacity: 90,
            daily_usage: 3,
            low_stock_days: 7,
            min_purchase_qty: 1,
            created_at: now(),
            updated_at: now()
          }
        ]);
      }

      const orders = readJson<any[]>(orderKey, []);
      if (!Array.isArray(orders)) writeJson(orderKey, []);

      const logs = readJson<any[]>(logKey, []);
      if (!Array.isArray(logs)) writeJson(logKey, []);
    };

    ensureSeed();

    const normalizeResult = (result: any) => ({ result });

    const buildOrder = (payload: any) => {
      const userId = String(payload?.userId || readJson<string>(uidKey, 'test-client-id'));
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const orderId = `ORD${now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
      const orderNo = `HP${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.random().toString(16).slice(2, 8).toUpperCase().padEnd(6, '0').slice(0, 6)}`;
      const normalizedItems = items.map((item: any, idx: number) => ({
        inventory_id: String(item?.inventory_id || ''),
        product_id: String(item?.product_id || ''),
        name: String(item?.name || item?.product_name || `商品${idx + 1}`),
        product_name: String(item?.product_name || item?.name || `商品${idx + 1}`),
        quantity: Number(item?.quantity || 1),
        unit: String(item?.unit || '瓶'),
        icon: String(item?.icon || '💊'),
        status: 0,
        sub_order_id: `SUB${now().toString(36)}${idx}`.toUpperCase(),
        tracking_no: '',
        tracking_image: '',
        shipped_at: null,
        received_at: null,
        cancelled_at: null
      }));
      return {
        _id: orderId,
        order_no: orderNo,
        user_id: userId,
        nutritionist_id: 'test-admin-id',
        status: 0,
        items: normalizedItems,
        created_at: now(),
        updated_at: now()
      };
    };

    const addInventoryLog = (log: any) => {
      const logs = readJson<any[]>(logKey, []);
      logs.unshift({
        _id: `LOG${now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
        created_at: now(),
        ...log
      });
      writeJson(logKey, logs);
    };

    const adjustInventoryByItem = (userId: string, productId: string, name: string, delta: number) => {
      const inv = readJson<any[]>(invKey, []);
      const idx = inv.findIndex((row) => String(row?.user_id) === userId && (
        (productId && String(row?.product_id) === productId) ||
        String(row?.name || row?.product_name) === String(name)
      ));
      if (idx >= 0) {
        const before = Number(inv[idx]?.stock || 0);
        const after = Math.max(0, before + delta);
        inv[idx] = { ...inv[idx], stock: after, updated_at: now() };
        writeJson(invKey, inv);
        addInventoryLog({
          user_id: userId,
          inventory_id: String(inv[idx]?._id || ''),
          product_id: String(productId || inv[idx]?.product_id || ''),
          item_name: String(name || inv[idx]?.name || inv[idx]?.product_name || ''),
          change_type: delta >= 0 ? 'order_receipt' : 'task_consume',
          delta,
          before_stock: before,
          after_stock: after
        });
      }
    };

    const handler = async ({ name, data }: any) => {
      const action = String(data?.action || '');
      const payload = data?.payload || {};

      if (String(name) !== 'client-api') {
        return normalizeResult({ code: 0, data: null, msg: 'ok' });
      }

      ensureSeed();

      const orders = readJson<any[]>(orderKey, []);
      const inventory = readJson<any[]>(invKey, []);
      const logs = readJson<any[]>(logKey, []);

      if (action === 'getInventory') {
        const userId = String(payload?.userId || readJson<string>(uidKey, 'test-client-id'));
        return normalizeResult({ code: 0, data: inventory.filter((row) => String(row?.user_id) === userId) });
      }

      if (action === 'getInventoryHistory') {
        const userId = String(payload?.userId || readJson<string>(uidKey, 'test-client-id'));
        const limit = Number(payload?.limit || 10);
        return normalizeResult({ code: 0, data: logs.filter((row) => String(row?.user_id) === userId).slice(0, limit) });
      }

      if (action === 'getOwnProtocol') {
        return normalizeResult({
          code: 0,
          data: {
            protocol: {
              items: [
                { product_id: 'prod-vitc', product_name: '维C', daily_usage: 2, unit: '粒' },
                { product_id: 'prod-fishoil', product_name: '鱼油', daily_usage: 3, unit: '粒' }
              ]
            }
          }
        });
      }

      if (action === 'initInventoryFromProtocol') {
        const userId = String(payload?.userId || readJson<string>(uidKey, 'test-client-id'));
        const seeded = [
          {
            _id: 'inv-vitc',
            user_id: userId,
            product_id: 'prod-vitc',
            name: '维C',
            product_name: '维C',
            stock: 0,
            unit: '瓶',
            icon: '💊',
            capacity: 60,
            daily_usage: 2,
            low_stock_days: 7,
            min_purchase_qty: 1,
            created_at: now(),
            updated_at: now()
          },
          {
            _id: 'inv-fishoil',
            user_id: userId,
            product_id: 'prod-fishoil',
            name: '鱼油',
            product_name: '鱼油',
            stock: 1,
            unit: '瓶',
            icon: '🐟',
            capacity: 90,
            daily_usage: 3,
            low_stock_days: 7,
            min_purchase_qty: 1,
            created_at: now(),
            updated_at: now()
          }
        ];
        writeJson(invKey, seeded);
        return normalizeResult({ code: 0, data: seeded, msg: '初始化成功' });
      }

      if (action === 'getOrders') {
        const userId = String(payload?.userId || 'test-client-id');
        return normalizeResult({ code: 0, data: orders.filter((o) => String(o?.user_id) === userId) });
      }

      if (action === 'getPendingRefills') {
        return normalizeResult({ code: 0, data: orders.filter((o) => Number(o?.status) === 0 || Number(o?.status) === 1) });
      }

      if (action === 'getAdminReports') {
        const rangeDays = Number(payload?.rangeDays) === 30 ? 30 : 7;
        const trend = Array.from({ length: rangeDays }, (_, i) => 60 + ((i * 3) % 35));
        const trendRps = Array.from({ length: rangeDays }, (_, i) => 55 + ((i * 2) % 40));
        return normalizeResult({
          code: 0,
          data: {
            totalClients: 120,
            attentionClients: 18,
            repurchaseAttentionClients: 22,
            todayCheckIns: 35,
            weeklyTrend: trend,
            weeklyTrendRps: trendRps,
            avgRpsScore: 68,
            riskDistribution: {
              low: { count: 72, percent: 60 },
              medium: { count: 36, percent: 30 },
              high: { count: 12, percent: 10 }
            },
            rpsDistribution: {
              low: { count: 66, percent: 55 },
              medium: { count: 36, percent: 30 },
              high: { count: 18, percent: 15 }
            }
          }
        });
      }

      if (action === 'createRefillOrder') {
        const order = buildOrder(payload);
        const next = [order, ...orders];
        writeJson(orderKey, next);
        return normalizeResult({ code: 0, data: { _id: order._id, order_no: order.order_no }, msg: '下单成功' });
      }

      if (action === 'shipOrder') {
        const orderId = String(payload?.orderId || '');
        const itemIndices = Array.isArray(payload?.itemIndices) ? payload.itemIndices.map((n: any) => Number(n)) : [];
        const next = orders.map((o) => {
          if (String(o?._id) !== orderId) return o;
          const items = Array.isArray(o?.items) ? o.items.slice() : [];
          itemIndices.forEach((idx: number) => {
            if (!items[idx]) return;
            items[idx] = { ...items[idx], status: 1, shipped_at: now(), tracking_no: 'SF1234567890' };
          });
          const anyShipped = items.some((it: any) => Number(it?.status) === 1 || Number(it?.status) === 2);
          const allReceived = items.length > 0 && items.every((it: any) => Number(it?.status) === 2);
          const status = allReceived ? 2 : (anyShipped ? 1 : 0);
          return { ...o, items, status, shipped_at: now(), updated_at: now() };
        });
        writeJson(orderKey, next);
        return normalizeResult({ code: 0, data: true, msg: '发货成功' });
      }

      if (action === 'completeOrder') {
        const orderId = String(payload?.orderId || '');
        const itemIndices = Array.isArray(payload?.itemIndices) ? payload.itemIndices.map((n: any) => Number(n)) : [];
        const next = orders.map((o) => {
          if (String(o?._id) !== orderId) return o;
          const items = Array.isArray(o?.items) ? o.items.slice() : [];
          itemIndices.forEach((idx: number) => {
            if (!items[idx]) return;
            items[idx] = { ...items[idx], status: 2, received_at: now() };
            const delta = Number(items[idx]?.quantity || 1);
            adjustInventoryByItem(String(o?.user_id || ''), String(items[idx]?.product_id || ''), String(items[idx]?.name || ''), delta);
          });
          const allReceived = items.length > 0 && items.every((it: any) => Number(it?.status) === 2);
          return { ...o, items, status: allReceived ? 2 : 1, received_at: allReceived ? now() : null, updated_at: now() };
        });
        writeJson(orderKey, next);
        return normalizeResult({ code: 0, data: true, msg: '已完成' });
      }

      if (action === 'confirmOrderReceipt') {
        const orderId = String(payload?.orderId || '');
        const next = orders.map((o) => {
          if (String(o?._id) !== orderId) return o;
          const items = Array.isArray(o?.items) ? o.items.map((it: any) => {
            const delta = Number(it?.quantity || 1);
            adjustInventoryByItem(String(o?.user_id || ''), String(it?.product_id || ''), String(it?.name || ''), delta);
            return { ...it, status: 2, received_at: now() };
          }) : [];
          return { ...o, items, status: 2, received_at: now(), updated_at: now() };
        });
        writeJson(orderKey, next);
        return normalizeResult({ code: 0, data: true, msg: '收货成功' });
      }

      if (action === 'confirmSubOrderReceipt') {
        const orderId = String(payload?.orderId || '');
        const subOrderId = String(payload?.subOrderId || '');
        const next = orders.map((o) => {
          if (String(o?._id) !== orderId) return o;
          const items = Array.isArray(o?.items) ? o.items.map((it: any) => {
            if (String(it?.sub_order_id || '') !== subOrderId) return it;
            const delta = Number(it?.quantity || 1);
            adjustInventoryByItem(String(o?.user_id || ''), String(it?.product_id || ''), String(it?.name || ''), delta);
            return { ...it, status: 2, received_at: now() };
          }) : [];
          const allReceived = items.length > 0 && items.every((it: any) => Number(it?.status) === 2);
          const anyShipped = items.some((it: any) => Number(it?.status) === 1 || Number(it?.status) === 2);
          const status = allReceived ? 2 : (anyShipped ? 1 : 0);
          return { ...o, items, status, updated_at: now() };
        });
        writeJson(orderKey, next);
        return normalizeResult({ code: 0, data: true, msg: '收货成功' });
      }

      if (action === 'cancelOrder') {
        const orderId = String(payload?.orderId || '');
        const itemIndices = Array.isArray(payload?.itemIndices) ? payload.itemIndices.map((n: any) => Number(n)) : null;
        const next = orders.map((o) => {
          if (String(o?._id) !== orderId) return o;
          const items = Array.isArray(o?.items) ? o.items.map((it: any, idx: number) => {
            if (Number(it?.status) !== 0) return it;
            if (itemIndices && !itemIndices.includes(idx)) return it;
            return { ...it, status: 3, cancelled_at: now() };
          }) : [];
          const pendingCount = items.filter((it: any) => Number(it?.status) === 0).length;
          const shippedCount = items.filter((it: any) => Number(it?.status) === 1).length;
          const receivedCount = items.filter((it: any) => Number(it?.status) === 2).length;
          let status = 3;
          if (receivedCount > 0) status = 2;
          else if (shippedCount > 0) status = 1;
          else if (pendingCount > 0) status = 0;
          return { ...o, items, status, updated_at: now() };
        });
        writeJson(orderKey, next);
        return normalizeResult({ code: 0, data: true, msg: '已取消' });
      }

      return normalizeResult({ code: 0, data: null, msg: 'ok' });
    };

    (window as any).__PW_UNICLOUD_CALLFUNCTION__ = handler;
    (window as any).uniCloud = (window as any).uniCloud || {};
    (window as any).uniCloud.callFunction = handler;
  });
};

/** 模拟顾问登录状态 */
export const mockAdminLogin = async (page: Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-admin-token');
    localStorage.setItem('userInfo', JSON.stringify({
      _id: 'test-admin-id',
      username: '测试顾问',
      role: 'admin'
    }));
  });
};

/** 模拟客户登录状态 */
export const mockClientLogin = async (page: Page, day: number = 1, points: number = 10) => {
  interface LoginData {
    day: number;
    points: number;
  }
  
  await page.addInitScript((data: LoginData) => {
    localStorage.setItem('token', 'test-client-token');
    localStorage.setItem('userInfo', JSON.stringify({
      _id: 'test-client-id',
      username: '测试客户',
      role: '',
      phone: '17700000001',
      points: data.points,
      streak_days: data.day,
      last_checkin_date: new Date(Date.now() - (data.day - 1) * 24 * 60 * 60 * 1000).toISOString()
    }));
  }, { day, points });
};

/**
 * 测试数据生成器
 * 提供统一的测试数据生成方法
 */
export const generateTestData = {
  /** 生成测试手机号 */
  phone: () => '177' + Date.now().toString().slice(-8),
  
  /** 生成测试用户名 */
  username: (prefix = '测试用户') => prefix + Date.now().toString().slice(-4),
  
  /** 生成测试密码 */
  password: () => 'Test123456',
  
  /** 生成测试产品名称 */
  productName: () => '测试产品' + Date.now().toString().slice(-4),
  
  /** 生成测试配方名称 */
  templateName: () => '测试配方' + Date.now().toString().slice(-4),
  
  /** 生成测试课程标题 */
  courseTitle: () => '测试课程' + Date.now().toString().slice(-4),
};

/**
 * 常用元素选择器
 * 提供统一的元素定位策略
 */
export const selectors = {
  /** 按钮选择器（多种可能） */
  button: (textPattern: RegExp) => 
    `button, .btn, [role="button"], .uni-btn, .add-btn, .create-btn, .submit-btn`,
  
  /** 输入框选择器 */
  input: {
    phone: 'input[type="tel"], input[name="phone"], input[placeholder*="手机"], input[placeholder*="电话"], uni-input[type="tel"]',
    text: 'input[type="text"], input[name="username"], input[name="name"], uni-input[type="text"]',
    password: 'input[type="password"], input[name="password"], uni-input[type="password"]',
    number: 'input[type="number"], uni-input[type="number"]',
  },
  
  /** 对话框选择器 */
  dialog: '.dialog, .modal, [role="dialog"], .uni-popup, .uni-mask, form, .form',
  
  /** 列表项选择器 */
  listItem: (classPattern: string) => 
    `.${classPattern}-item, .${classPattern}-card, tr, .card, .bg-white`,
};

/**
 * 页面 URL 路径
 * 集中管理所有页面路由
 */
export const routes = {
  auth: {
    login: '/#/pages/common/login/index',
    roleSelect: '/#/pages/common/role-select/index'
  },
  admin: {
    dashboard: '/#/pages/admin/dashboard/index',
    clients: '/#/pages/admin/clients/index',
    products: '/#/pages/admin/products/index',
    templates: '/#/pages/admin/templates/index',
    protocol: '/#/pages/admin/protocol/index',
    courses: '/#/pages/admin/courses/index',
    orders: '/#/pages/admin/orders/index',
    reports: '/#/pages/admin/reports/index',
  },
  client: {
    home: '/#/pages/client/home/index',
    inventory: '/#/pages/client/inventory/index',
    orders: '/#/pages/client/orders/index',
    summary: '/#/pages/client/summary/index',
    trends: '/#/pages/client/trends/index',
  },
};

/**
 * 构建完整 URL
 * @param route - 路由路径
 * @returns 完整 URL
 */
export const buildUrl = (route: string): string => `${baseUrl}${route}`;

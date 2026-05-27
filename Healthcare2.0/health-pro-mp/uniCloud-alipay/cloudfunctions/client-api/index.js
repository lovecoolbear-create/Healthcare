const crypto = require('crypto');
const db = uniCloud.database();
const _ = db.command;

/** 业务订单号：HP + 本地日期(UTC+8)YYYYMMDD + 6位随机十六进制 */
function generateOrderNo() {
  const utc8 = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const y = utc8.getUTCFullYear();
  const m = String(utc8.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc8.getUTCDate()).padStart(2, '0');
  return `HP${y}${m}${d}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** 日志/通知里展示的订单号（优先业务号） */
function orderNoForMessage(orderOrNull, orderId) {
  const fromDoc = orderOrNull && orderOrNull.order_no;
  if (fromDoc && String(fromDoc).trim()) return String(fromDoc).trim();
  const id = orderId || (orderOrNull && orderOrNull._id) || '';
  return id ? id.slice(-8).toUpperCase() : '';
}

// 【关键修复】获取本地时区（中国 UTC+8）的日期字符串
// 避免使用 toISOString() 返回的 UTC 时间导致时区错误
const getLocalDateStr = (date = new Date()) => {
  // 转换为 UTC+8 时区
  const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = utc8Date.getUTCFullYear();
  const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc8Date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 辅助函数：转换订单中的 cloud:// URL 为临时 HTTPS URL
const convertOrderImageUrls = async (orders) => {
  if (!orders || orders.length === 0) return orders;

  // 收集所有需要转换的 cloud:// URL
  const cloudUrls = [];
  const urlMap = new Map();

  orders.forEach(order => {
    // 整体物流图片
    if (order.tracking_image && order.tracking_image.startsWith('cloud://')) {
      cloudUrls.push(order.tracking_image);
    }
    // 子订单物流图片
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        if (item.tracking_image && item.tracking_image.startsWith('cloud://')) {
          cloudUrls.push(item.tracking_image);
        }
      });
    }
  });

  // 如果有 cloud:// URL，批量获取临时 URL
  if (cloudUrls.length > 0) {
    try {
      const uniqueUrls = [...new Set(cloudUrls)];
      const tempUrlRes = await uniCloud.getTempFileURL({
        fileList: uniqueUrls
      });

      if (tempUrlRes.fileList) {
        tempUrlRes.fileList.forEach(item => {
          if (item.tempFileURL) {
            urlMap.set(item.fileID, item.tempFileURL);
          }
        });
      }
    } catch (e) {
      console.log('getTempFileURL failed:', e);
    }
  }

  // 替换订单中的 URL
  return orders.map(order => {
    const newOrder = { ...order };

    // 替换整体物流图片 URL
    if (newOrder.tracking_image && urlMap.has(newOrder.tracking_image)) {
      newOrder.tracking_image = urlMap.get(newOrder.tracking_image);
    }

    // 替换子订单物流图片 URL
    if (newOrder.items && Array.isArray(newOrder.items)) {
      newOrder.items = newOrder.items.map(item => {
        if (item.tracking_image && urlMap.has(item.tracking_image)) {
          return { ...item, tracking_image: urlMap.get(item.tracking_image) };
        }
        return item;
      });
    }

    return newOrder;
  });
};

// 辅助函数：标准化订单 items 数据结构
// 修复旧数据中 items 存储为字符串数组的问题，确保所有子订单都有完整字段
const normalizeOrderItems = (order) => {
  if (!order || !order.items || !Array.isArray(order.items)) {
    return order;
  }

  const normalizedOrder = { ...order };

  // 检查 items 是否是字符串数组（数据损坏）
  if (order.items.length > 0 && typeof order.items[0] === 'string') {
    // 将字符串数组转换为对象数组
    // 根据订单整体状态推断子订单状态
    const inferredStatus = order.status === 3 ? 3 : (order.status === 1 ? 1 : (order.status === 2 ? 2 : 0));

    normalizedOrder.items = order.items.map((itemName, index) => ({
      name: itemName,
      product_name: itemName,
      quantity: 1,
      unit: '瓶',
      status: inferredStatus,
      sub_order_id: `SUB${Date.now()}${index}`,
      tracking_no: order.tracking_no || '',
      tracking_image: '',
      shipped_at: order.shipped_at || null,
      received_at: null,
      cancelled_at: null
    }));
    console.log(`📦 修复订单 ${order._id} 的 items 数据结构，推断状态: ${inferredStatus}`);
  } else if (order.items.length > 0 && typeof order.items[0] === 'object') {
    // 确保所有对象都有完整的字段
    normalizedOrder.items = order.items.map((item, index) => ({
      name: item.name || item.product_name || '未命名产品',
      product_name: item.product_name || item.name || '未命名产品',
      quantity: item.quantity || 1,
      unit: item.unit || '瓶',
      icon: item.icon || '💊',
      status: typeof item.status === 'number' ? item.status : 0, // 0=待发货, 1=已发货, 2=已收货, 3=已取消
      sub_order_id: item.sub_order_id || `SUB${Date.now()}${index}`,
      inventory_id: item.inventory_id || '',
      tracking_no: item.tracking_no || order.tracking_no || '',
      tracking_image: item.tracking_image || '',
      shipped_at: item.shipped_at || null,
      received_at: item.received_at || null,
      cancelled_at: item.cancelled_at || null
    }));
  }

  return normalizedOrder;
};

// ==========================================
// 4板块积分计算系统 + 连续打卡奖励 (v2.0)
// 基础分：饮水1分 + 打卡5分 + 健康指标2分 + 体感2分 = 10分/天
// 全勤奖励：第2天起+2分，每日+2分递增，第7天起封顶+12分
// ==========================================
const WATER_TARGET = 1.5; // 饮水目标：1.5L

const calculateDailyPoints = async (userId, date) => {
  let basePoints = 0;
  const sectionStatus = {
    water: false,
    plan: false,
    metrics: false,
    symptoms: false
  };

  try {
    // 1. 获取今日计划数据（饮水、打卡、体感）
    const planRes = await plansCollection.where({
      user_id: userId,
      date: date
    }).limit(1).get();

    let planData = null;
    if (planRes.data.length > 0) {
      planData = planRes.data[0];
    }

    // 2. 饮水板块 (1分) - 达到1.5L
    if (planData && planData.water_intake >= WATER_TARGET) {
      basePoints += 1;
      sectionStatus.water = true;
    }

    // 3. 打卡板块 (5分) - 所有任务完成
    // 【已修改】聚合所有该日期的方案记录
    const allTodayPlans = await plansCollection.where({
      user_id: userId,
      date: date
    }).get();
    
    if (allTodayPlans.data.length > 0) {
      const allTasks = allTodayPlans.data.flatMap(p => p.tasks || []);
      if (allTasks.length > 0) {
        const allCompleted = allTasks.every(t => t.completed);
        if (allCompleted) {
          basePoints += 5;
          sectionStatus.plan = true;
        }
      }
    }

    // 4. 体感板块 (2分) - 至少一项体感评分>0
    if (planData && planData.symptoms && planData.symptoms.length > 0) {
      const hasSymptom = planData.symptoms.some(s => s.value > 0);
      if (hasSymptom) {
        basePoints += 2;
        sectionStatus.symptoms = true;
      }
    }

    // 5. 健康指标板块 (2分) - 至少一项指标有值
    const metricsRes = await healthLogsCollection.where({
      user_id: userId,
      date: date
    }).get();

    if (metricsRes.data.length > 0) {
      basePoints += 2;
      sectionStatus.metrics = true;
    }

    // 6. 连续打卡全勤奖励（只有拿到满分10分才触发）
    let streakBonus = 0;
    let isPerfect = basePoints === 10;

    if (isPerfect) {
      // 获取用户连续打卡天数
      const userRes = await usersCollection.doc(userId).get();
      const streakDays = (userRes.data && userRes.data.length > 0)
        ? (userRes.data[0].streak_days || 0)
        : 0;

      // 连续第2天起：+2分，每日+2分递增，第7天起封顶+12分
      // 第1天:0, 第2天:+2, 第3天:+4, 第4天:+6, 第5天:+8, 第6天:+10, 第7天+:12(封顶)
      if (streakDays >= 2) {
        streakBonus = Math.min((streakDays - 1) * 2, 12);
      }
    }

    const totalPoints = basePoints + streakBonus;

    return {
      points: totalPoints,
      base: basePoints,
      streakBonus: streakBonus,
      isPerfect: isPerfect,
      sectionStatus,
      breakdown: {
        water: sectionStatus.water ? 1 : 0,
        plan: sectionStatus.plan ? 5 : 0,
        metrics: sectionStatus.metrics ? 2 : 0,
        symptoms: sectionStatus.symptoms ? 2 : 0,
        streakBonus: streakBonus
      }
    };
  } catch (e) {
    console.error('Calculate points error:', e);
    return {
      points: 0,
      base: 0,
      streakBonus: 0,
      isPerfect: false,
      sectionStatus,
      breakdown: {}
    };
  }
};

const usersCollection = db.collection('he_users');
const plansCollection = db.collection('he_daily_plans');
const inventoryCollection = db.collection('he_inventory');
const inventoryLogsCollection = db.collection('he_inventory_logs');
const ordersCollection = db.collection('he_orders');
const productsCollection = db.collection('he_products');
const templatesCollection = db.collection('he_templates');
const interactionLogsCollection = db.collection('he_interaction_logs');
const knowledgeCollection = db.collection('he_knowledge');
const triggersCollection = db.collection('he_triggers');
const scoringConfigCollection = db.collection('he_scoring_config');
const notificationsCollection = db.collection('he_notifications');
const healthLogsCollection = db.collection('he_health_logs');
const coursesCollection = db.collection('he_courses');
const courseExchangesCollection = db.collection('he_course_exchanges');
const checkInRecordsCollection = db.collection('he_check_in_records'); // 【新增】独立打卡记录表

const clampNumber = (value, min, max) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
};

const safeDateKeyFromTs = (ts) => {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return '';
  return getLocalDateStr(new Date(n));
};

const parseDateKeyToTs = (dateKey) => {
  const text = String(dateKey || '').trim();
  if (!text) return 0;
  const parsed = new Date(`${text}T00:00:00+08:00`).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPlanCheckInSummary = (plan) => {
  const tasks = Array.isArray(plan?.tasks) ? plan.tasks : [];
  const total = tasks.length;
  const completed = tasks.filter(t => !!t?.completed).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const waterIntake = Number(plan?.water_intake || 0);
  const symptoms = Array.isArray(plan?.symptoms) ? plan.symptoms : [];
  const hasSymptomLog = symptoms.length > 0;
  const hasActivity = completed > 0 || waterIntake > 0 || hasSymptomLog;
  const symptomAvg = hasSymptomLog
    ? (symptoms.reduce((sum, s) => sum + Number(s?.value || 0), 0) / symptoms.length)
    : 0;
  const symptomPercent = hasSymptomLog ? clampNumber(Math.round((symptomAvg / 10) * 100), 0, 100) : 0;
  return {
    total,
    completed,
    completionRate,
    hasActivity,
    symptomAvg: clampNumber(symptomAvg, 0, 10),
    symptomPercent
  };
};

const getInventoryCoverageDays = (inventoryItems = []) => {
  const daysList = [];
  (Array.isArray(inventoryItems) ? inventoryItems : []).forEach((item) => {
    const capacity = Number(item?.capacity || 30);
    const dailyUsage = Number(item?.daily_usage || 1);
    const stock = Number(item?.stock || 0);
    const safeCapacity = capacity > 0 ? capacity : 30;
    const safeDailyUsage = dailyUsage > 0 ? dailyUsage : 1;
    const totalUnits = stock * safeCapacity;
    const days = totalUnits / safeDailyUsage;
    if (Number.isFinite(days) && days >= 0) daysList.push(days);
  });
  if (!daysList.length) return 0;
  return daysList.reduce((sum, day) => sum + day, 0) / daysList.length;
};

const getInventoryPercent = (inventoryItems = []) => {
  const coverage = getInventoryCoverageDays(inventoryItems);
  if (!Number.isFinite(coverage) || coverage <= 0) return 0;
  if (coverage >= 7) return 100;
  return clampNumber(Math.round((coverage / 7) * 100), 0, 100);
};

const queryByInBatches = async (collection, fieldName, ids, extraWhere = {}, { limit = 10000 } = {}) => {
  const uniqueIds = Array.from(new Set((ids || []).map(id => String(id)).filter(Boolean)));
  if (!uniqueIds.length) return [];
  const chunkSize = 300;
  const results = [];
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const res = await collection.where({
      ...extraWhere,
      [fieldName]: db.command.in(chunk)
    }).limit(limit).get();
    if (Array.isArray(res?.data) && res.data.length) results.push(...res.data);
  }
  return results;
};

const addInventoryLog = async ({
  userId,
  inventoryId,
  productId,
  itemName,
  changeType,
  delta,
  beforeStock,
  afterStock,
  referenceType,
  referenceId,
  remark,
  operatorId,
  operatorRole
}) => {
  await inventoryLogsCollection.add({
    user_id: String(userId || ''),
    inventory_id: String(inventoryId || ''),
    product_id: String(productId || ''),
    item_name: String(itemName || ''),
    change_type: String(changeType || 'manual_adjust'),
    delta: Number(delta || 0),
    before_stock: Number(beforeStock || 0),
    after_stock: Number(afterStock || 0),
    reference_type: String(referenceType || ''),
    reference_id: String(referenceId || ''),
    remark: String(remark || ''),
    operator_id: String(operatorId || ''),
    operator_role: String(operatorRole || ''),
    created_at: Date.now()
  });
};

const doCalculateRPS = async (targetUserId) => {
  const userId = String(targetUserId || '');
  if (!userId) return null;
  const userRes = await usersCollection.doc(userId).get();
  if (!Array.isArray(userRes?.data) || userRes.data.length === 0) return null;
  const user = userRes.data[0];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const plansWindowStart = now - (30 * oneDay);
  const orderWindowStart = now - (180 * oneDay);
  const [orderRes, plansRes] = await Promise.all([
    ordersCollection
      .where({ user_id: userId, created_at: db.command.gte(orderWindowStart) })
      .orderBy('created_at', 'desc')
      .get(),
    plansCollection
      .where({ user_id: userId, created_at: db.command.gte(plansWindowStart) })
      .orderBy('created_at', 'asc')
      .get()
  ]);

  const recentOrders = Array.isArray(orderRes?.data) ? orderRes.data : [];
  const completedOrders = recentOrders
    .filter((order) => Number(order?.status) === 2)
    .sort((a, b) => Number(a?.created_at || 0) - Number(b?.created_at || 0));
  const cancelledOrders = recentOrders.filter((order) => Number(order?.status) === 3 || Number(order?.status) === -1);
  const cancelRate = recentOrders.length > 0 ? (cancelledOrders.length / recentOrders.length) : 0;
  const cancelRateComponent = Math.round(clampNumber((1 - cancelRate) * 30, 0, 30));

  const receiptDelays = completedOrders
    .map((order) => {
      const shippedAt = Number(order?.shipped_at || 0);
      const receivedAt = Number(order?.received_at || order?.updated_at || 0);
      if (!shippedAt || !receivedAt || receivedAt <= shippedAt) return null;
      return (receivedAt - shippedAt) / oneDay;
    })
    .filter((value) => Number.isFinite(value));
  const avgReceiptDelay = receiptDelays.length > 0
    ? receiptDelays.reduce((sum, delay) => sum + delay, 0) / receiptDelays.length
    : 6;
  let receiptDelayComponent = 16;
  if (avgReceiptDelay <= 2) receiptDelayComponent = 25;
  else if (avgReceiptDelay <= 5) receiptDelayComponent = 21;
  else if (avgReceiptDelay <= 8) receiptDelayComponent = 16;
  else if (avgReceiptDelay <= 12) receiptDelayComponent = 11;
  else receiptDelayComponent = 6;

  let repurchaseCycleComponent = 15;
  if (completedOrders.length >= 2) {
    const gaps = [];
    for (let i = 1; i < completedOrders.length; i += 1) {
      const prevTs = Number(completedOrders[i - 1]?.created_at || 0);
      const currTs = Number(completedOrders[i]?.created_at || 0);
      if (currTs > prevTs) gaps.push((currTs - prevTs) / oneDay);
    }
    const avgCycle = gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 35;
    const variance = gaps.length > 1
      ? gaps.reduce((sum, gap) => sum + Math.pow(gap - avgCycle, 2), 0) / gaps.length
      : 0;
    const cycleStd = Math.sqrt(Math.max(0, variance));
    const cycleCV = avgCycle > 0 ? (cycleStd / avgCycle) : 0;
    const lastCompletedTs = Number(completedOrders[completedOrders.length - 1]?.created_at || 0);
    const daysSinceLastCompleted = lastCompletedTs > 0 ? (now - lastCompletedTs) / oneDay : avgCycle;
    const ratio = avgCycle > 0 ? (daysSinceLastCompleted / avgCycle) : 1;
    const ratioPenalty = ratio <= 1.1 ? 0 : Math.min(14, Math.round((ratio - 1.1) * 12));
    const stabilityPenalty = Math.min(8, Math.round(cycleCV * 10));
    repurchaseCycleComponent = Math.max(8, Math.min(30, 30 - ratioPenalty - stabilityPenalty));
  } else if (completedOrders.length === 1) {
    const daysSince = (now - Number(completedOrders[0]?.created_at || now)) / oneDay;
    if (daysSince <= 30) repurchaseCycleComponent = 24;
    else if (daysSince >= 90) repurchaseCycleComponent = 10;
    else repurchaseCycleComponent = 24 - Math.round(((daysSince - 30) / 60) * 14);
  }

  const planRows = Array.isArray(plansRes?.data) ? plansRes.data : [];
  const symptomSnapshots = [];
  planRows.forEach((plan) => {
    const symptoms = Array.isArray(plan?.symptoms) ? plan.symptoms : [];
    if (!symptoms.length) return;
    const avg = symptoms.reduce((sum, symptom) => sum + Number(symptom?.value || 0), 0) / symptoms.length;
    let ts = Number(plan?.created_at || 0);
    if (!Number.isFinite(ts) || ts <= 0) {
      const parsed = parseDateKeyToTs(plan?.date);
      ts = parsed > 0 ? parsed : 0;
    }
    symptomSnapshots.push({ ts, avg: Number.isFinite(avg) ? avg : 0 });
  });
  symptomSnapshots.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
  const symptomCount = symptomSnapshots.length;
  let effectComponent = 9;
  if (symptomCount > 0) {
    const recentWindow = symptomSnapshots.slice(-Math.min(3, symptomCount));
    const baseWindow = symptomSnapshots.slice(0, Math.min(3, symptomCount));
    const recentAvg = recentWindow.reduce((sum, row) => sum + Number(row.avg || 0), 0) / recentWindow.length;
    const baseAvg = baseWindow.reduce((sum, row) => sum + Number(row.avg || 0), 0) / baseWindow.length;
    const effectBase = Math.round((clampNumber(recentAvg, 0, 10) / 10) * 10);
    const trendDelta = recentAvg - baseAvg;
    const trendBonus = Math.max(-3, Math.min(3, Math.round(trendDelta * 1.5)));
    const coverageBonus = Math.min(2, Math.floor(symptomCount / 6));
    effectComponent = Math.max(4, Math.min(15, effectBase + trendBonus + coverageBonus));
  }

  const totalScore = Math.max(0, Math.min(100, Math.round(
    cancelRateComponent +
    receiptDelayComponent +
    repurchaseCycleComponent +
    effectComponent
  )));

  const oldScore = Number(user?.rps_score || 0);
  let trend = 'flat';
  if (totalScore > oldScore) trend = 'up';
  else if (totalScore < oldScore) trend = 'down';

  const updates = {
    rps_score: totalScore,
    rps_trend: trend,
    rps_breakdown: {
      cancel_rate: cancelRateComponent,
      receipt_delay: receiptDelayComponent,
      cycle: repurchaseCycleComponent,
      effect: effectComponent
    },
    last_rps_calc: now
  };

  const isScoreDropped = totalScore < oldScore;
  const isLowScore = totalScore < 60;
  if (isScoreDropped || isLowScore) {
    updates.follow_up_status = '待回复';
    updates.follow_up_updated_at = now;
  }

  await usersCollection.doc(userId).update(updates);

  return {
    score: totalScore,
    trend,
    breakdown: updates.rps_breakdown
  };
};

const doCalculateWROM = async (targetUserId) => {
  const userId = String(targetUserId || '');
  if (!userId) return null;
  const userRes = await usersCollection.doc(userId).get();
  if (!Array.isArray(userRes?.data) || userRes.data.length === 0) return null;
  const client = userRes.data[0];

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - (7 * oneDay);
  const fourteenDaysAgo = now - (14 * oneDay);

  const [plansRes, invRes] = await Promise.all([
    plansCollection.where({ user_id: userId, created_at: db.command.gte(sevenDaysAgo) }).get(),
    inventoryCollection.where({ user_id: userId }).get()
  ]);

  let totalTasks = 0;
  let completedTasks = 0;
  (Array.isArray(plansRes?.data) ? plansRes.data : []).forEach(plan => {
    if (Array.isArray(plan?.tasks) && plan.tasks.length > 0) {
      totalTasks += plan.tasks.length;
      completedTasks += plan.tasks.filter(t => !!t?.completed).length;
    }
  });
  const adherenceScore = totalTasks > 0 ? ((completedTasks / totalTasks) * 40) : 0;

  const inventoryItems = Array.isArray(invRes?.data) ? invRes.data : [];
  const coverageDays = getInventoryCoverageDays(inventoryItems);
  let inventoryScore = 15;
  if (coverageDays > 0) {
    const safeCoverage = clampNumber(coverageDays, 0, 120);
    if (safeCoverage < 7) inventoryScore = Math.round((safeCoverage / 7) * 18);
    else if (safeCoverage <= 45) inventoryScore = 18 + Math.round(((safeCoverage - 7) / 38) * 12);
    else inventoryScore = Math.max(8, 30 - Math.round((safeCoverage - 45) * 0.35));
    if (totalTasks > 0 && completedTasks === 0 && safeCoverage > 45) inventoryScore = Math.min(inventoryScore, 12);
  }

  const symptomPlansRes = await plansCollection
    .where({ user_id: userId, created_at: db.command.gte(fourteenDaysAgo) })
    .orderBy('date', 'asc')
    .get();
  let currentWeekSum = 0;
  let currentWeekCount = 0;
  let lastWeekSum = 0;
  let lastWeekCount = 0;
  const sevenDaysAgoTs = now - (7 * oneDay);
  (Array.isArray(symptomPlansRes?.data) ? symptomPlansRes.data : []).forEach(plan => {
    const symptoms = Array.isArray(plan?.symptoms) ? plan.symptoms : [];
    if (!symptoms.length) return;
    const dailySum = symptoms.reduce((acc, s) => acc + Number(s?.value || 0), 0);
    const dailyAvg = symptoms.length ? (dailySum / symptoms.length) : 0;
    const planTs = Number(plan?.created_at || 0) || parseDateKeyToTs(plan?.date);
    if (planTs >= sevenDaysAgoTs) {
      currentWeekSum += dailyAvg;
      currentWeekCount += 1;
    } else {
      lastWeekSum += dailyAvg;
      lastWeekCount += 1;
    }
  });
  const sCurr = currentWeekCount > 0 ? (currentWeekSum / currentWeekCount) : 5;
  const sLast = lastWeekCount > 0 ? (lastWeekSum / lastWeekCount) : 5;
  let symptomScore = 0;
  if (sCurr >= sLast) {
    symptomScore = 15 + (sCurr - sLast) * 5;
    if (symptomScore > 20) symptomScore = 20;
  } else {
    symptomScore = 15 - (sLast - sCurr) * 10;
    if (symptomScore < 0) symptomScore = 0;
  }

  let engagementScore = 8;
  if (Array.isArray(plansRes?.data) && plansRes.data.length > 0) {
    const activePlanDays = plansRes.data.filter((plan) => {
      const summary = getPlanCheckInSummary(plan);
      return !!summary.hasActivity;
    }).length;
    engagementScore = Math.max(7, Math.min(10, 7 + activePlanDays * 0.5));
  }

  const totalScore = Math.round(adherenceScore + inventoryScore + symptomScore + engagementScore);
  const oldScore = Number(client?.wrom_score || 0);
  let trend = 'flat';
  if (totalScore > oldScore) trend = 'up';
  else if (totalScore < oldScore) trend = 'down';

  const breakdown = {
    adherence: Math.round(adherenceScore),
    inventory: Math.round(inventoryScore),
    symptom: Math.round(symptomScore),
    engagement: Math.round(engagementScore)
  };

  await usersCollection.doc(userId).update({
    wrom_score: totalScore,
    wrom_trend: trend,
    wrom_breakdown: breakdown,
    last_wrom_calc: now
  });

  const rpsResult = await doCalculateRPS(userId);
  return {
    id: userId,
    score: totalScore,
    trend,
    breakdown,
    rps: rpsResult
  };
};

const updateUserScoresIfNeeded = async (targetUserId, { force = false } = {}) => {
  const userId = String(targetUserId || '');
  if (!userId) return null;
  const res = await usersCollection.doc(userId).get();
  if (!Array.isArray(res?.data) || res.data.length === 0) return null;
  const user = res.data[0];
  const now = Date.now();
  const last = Number(user?.last_wrom_calc || 0);
  if (!force && Number.isFinite(last) && last > 0 && (now - last) < 6 * 60 * 60 * 1000) {
    return null;
  }
  return await doCalculateWROM(userId);
};

const verifyToken = async (token) => {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token缺失' };
  }
  const cleanToken = token.replace(/^Bearer\s+/i, '');
  try {
    // 【修复】支持多会话 token 验证
    // 首先尝试用新格式（tokens 数组）验证
    const userRes = await usersCollection.where({
      tokens: db.command.exists(true)
    }).get();
    
    // 在内存中检查 tokens 数组
    for (const user of userRes.data) {
      if (user.tokens && Array.isArray(user.tokens)) {
        const validToken = user.tokens.find(t => t.token === cleanToken && t.expires > Date.now());
        if (validToken) {
          return { valid: true, userId: user._id, role: user.role };
        }
      }
    }
    
    // 如果新格式没有找到，尝试旧格式（向后兼容）
    const oldFormatRes = await usersCollection.where({
      token: cleanToken,
      token_expires: db.command.gt(Date.now())
    }).get();
    
    if (oldFormatRes.data.length > 0) {
      return { valid: true, userId: oldFormatRes.data[0]._id, role: oldFormatRes.data[0].role };
    }
    
    return { valid: false, error: 'Token无效或已过期' };
  } catch (err) {
    return { valid: false, error: '验证服务异常' };
  }
};

const extractToken = (event) => {
  const headers = event.headers || {};
  const payload = event.payload || {};
  const params = event.params || {};
  return headers.authorization || headers.Authorization || payload.token || params.token || event.token || null;
};

/**
 * 补货下单（待发货订单）仅允许：客户身份 + 小程序端调用。
 * 禁止管理员/顾问 token、禁止 H5/App 等环境走 createRefillOrder（与产品规则「仅小程序购物车下单」一致）。
 * @returns {null|{ code: number, msg: string }}
 */
function assertRefillOrderFromClientMiniProgram(context, userRole) {
  if (userRole !== 'client') {
    return { code: 403, msg: '仅客户账号可提交补货订单' };
  }
  const platform = String(context?.PLATFORM || '').trim();
  // 微信开发者工具调试时可能为 devtools；真机/体验版一般为 mp-weixin、mp-alipay 等
  if (platform === 'devtools') {
    return null;
  }
  if (!platform.startsWith('mp-')) {
    console.warn('[createRefillOrder] 拒绝非小程序环境 PLATFORM=', platform || '(empty)', 'role=', userRole);
    return { code: 403, msg: '补货下单仅支持在微信或支付宝小程序内完成' };
  }
  return null;
}

/**
 * 智能合并任务工具函数
 * 将多个方案中同一时间段(slot)的相同产品进行剂量汇总
 */
const mergeTasks = (tasks) => {
  if (!tasks || tasks.length === 0) return [];
  
  const taskMap = new Map();
  
  tasks.forEach(task => {
    // 聚合 Key：名/ID + 时段
    // 【关键修复】必须回退到 task.name，防止缺少 product_name 的不同任务被错误合并为 undefined
    const key = `${task.product_id || task.product_name || task.name}_${task.slot}`;
    
    if (taskMap.has(key)) {
      const existing = taskMap.get(key);
      // 累加剂量
      const newUsage = (existing.daily_usage || 0) + (task.daily_usage || 0);
      existing.daily_usage = newUsage;
      existing.dose = `${newUsage}${existing.unit || '粒'}`;
      
      // 合并说明（去重拼接）
      if (task.instruction && task.instruction !== '按需服用' && !existing.instruction.includes(task.instruction)) {
        existing.instruction = `${existing.instruction}; ${task.instruction}`;
      }
      
      // 【新增】合并方案名称
      if (task.template_name) {
        if (!existing.template_names) {
          existing.template_names = [existing.template_name];
        }
        if (!existing.template_names.includes(task.template_name)) {
          existing.template_names.push(task.template_name);
        }
      }
    } else {
      // 深度拷贝，防止污染原数据
      const clonedTask = JSON.parse(JSON.stringify(task));
      // 初始化方案名称数组
      if (clonedTask.template_name) {
        clonedTask.template_names = [clonedTask.template_name];
      } else {
        clonedTask.template_names = [];
      }
      taskMap.set(key, clonedTask);
    }
  });
  
  return Array.from(taskMap.values());
};

exports.main = async (event, context) => {
  const { action, payload = {} } = event;

  console.log('Action:', action);

  if (action === 'getProducts') {
    try {
      console.log('getProducts: querying database...');
      const res = await productsCollection.orderBy('created_at', 'desc').get();
      console.log('getProducts: success, count:', res.data?.length || 0);
      return { code: 0, data: res.data || [] };
    } catch (dbErr) {
      console.error('getProducts: database error:', dbErr);
      // 如果按 created_at 排序失败，尝试不按排序查询
      try {
        console.log('getProducts: retry without orderBy...');
        const fallbackRes = await productsCollection.get();
        console.log('getProducts: fallback success, count:', fallbackRes.data?.length || 0);
        return { code: 0, data: fallbackRes.data || [] };
      } catch (fallbackErr) {
        console.error('getProducts: fallback also failed:', fallbackErr);
        return { code: 500, msg: '数据库查询失败: ' + (fallbackErr.message || '未知错误') };
      }
    }
  }

  if (action === 'getTemplates') {
    try {
      console.log('getTemplates: querying database...');
      const res = await templatesCollection.orderBy('created_at', 'desc').get();
      console.log('getTemplates: success, count:', res.data?.length || 0);
      return { code: 0, data: res.data || [] };
    } catch (dbErr) {
      console.error('getTemplates: database error:', dbErr);
      try {
        console.log('getTemplates: retry without orderBy...');
        const fallbackRes = await templatesCollection.get();
        console.log('getTemplates: fallback success, count:', fallbackRes.data?.length || 0);
        return { code: 0, data: fallbackRes.data || [] };
      } catch (fallbackErr) {
        console.error('getTemplates: fallback also failed:', fallbackErr);
        return { code: 500, msg: '数据库查询失败: ' + (fallbackErr.message || '未知错误') };
      }
    }
  }

  // ============ 公开接口（不需要token）============

  // 课程列表查询 - 公开访问
  if (action === 'getCourses') {
    try {
      console.log('Fetching courses from he_courses collection...');

      const { userId: targetUserId } = payload;

      let coursesRes;
      try {
        // 查询所有课程
        coursesRes = await coursesCollection.orderBy('startTime', 'asc').get();
        console.log('Courses query result:', coursesRes.data.length, 'courses found');
      } catch (e) {
        console.error('Failed to query courses:', e.message);
        if (e.message && e.message.includes('not found collection')) {
          return { code: 0, data: [], msg: '课程集合未初始化' };
        }
        throw e;
      }

      // 如果有用户ID，查询已兑换的课程
      let exchangedCourseIds = new Set();
      let exchangesRes = { data: [] };
      if (targetUserId) {
        exchangesRes = await courseExchangesCollection.where({
          userId: targetUserId
        }).get();
        exchangedCourseIds = new Set(exchangesRes.data.map(e => e.courseId));
      }

      // 组装课程数据
      const courses = coursesRes.data.map(course => {
        const isExchanged = exchangedCourseIds.has(course._id);
        const exchange = exchangesRes.data.find(e => e.courseId === course._id);

        const now = Date.now();
        const startTime = course.startTime;
        const enrolledCount = course.enrolledCount || 0;
        const maxCapacity = course.maxCapacity || 100;

        let status = course.status || 'upcoming';
        if (startTime < now) {
          status = 'ended';
        } else if (enrolledCount >= maxCapacity) {
          status = 'full';
        }

        return {
          ...course,
          status,
          isExchanged,
          ticketCode: exchange?.ticketCode || null
        };
      });

      return { code: 0, data: courses };
    } catch (err) {
      console.error('getCourses error:', err);
      return { code: 500, msg: '查询课程失败: ' + err.message };
    }
  }

  // ============ 需要认证的接口 ============

  const token = extractToken(event);
  const authResult = await verifyToken(token);

  if (!authResult.valid) {
    return { code: 401, msg: authResult.error || '未授权' };
  }

  const userId = authResult.userId;
  const userRole = authResult.role;

  try {
    switch (action) {
      case 'getUserInfo': {
        const res = await usersCollection.doc(userId).get();
        return { code: 0, data: res.data[0] || {} };
      }

      case 'exchangeCourse': {
        const { userId: targetUserId, courseId } = payload;

        // 检查课程是否存在且可兑换
        const courseRes = await coursesCollection.doc(courseId).get();
        if (courseRes.data.length === 0) {
          return { code: 404, msg: '课程不存在' };
        }
        const course = courseRes.data[0];

        const now = Date.now();
        if (course.startTime < now) {
          return { code: 400, msg: '课程已结束' };
        }
        if ((course.enrolledCount || 0) >= (course.maxCapacity || 100)) {
          return { code: 400, msg: '课程已满员' };
        }

        // 检查是否已兑换
        const existingRes = await courseExchangesCollection.where({
          userId: targetUserId,
          courseId
        }).get();
        if (existingRes.data.length > 0) {
          return { code: 400, msg: '您已兑换过该课程' };
        }

        // 检查用户积分
        const userRes = await usersCollection.doc(targetUserId).get();
        if (userRes.data.length === 0) {
          return { code: 404, msg: '用户不存在' };
        }
        const user = userRes.data[0];
        const userPoints = user.points || 0;
        const requiredPoints = course.pointsRequired || 0;

        if (userPoints < requiredPoints) {
          return { code: 400, msg: '积分不足' };
        }

        // 生成入场券码
        const ticketCode = 'TK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

        // 创建兑换记录
        await courseExchangesCollection.add({
          userId: targetUserId,
          courseId,
          ticketCode,
          pointsUsed: requiredPoints,
          exchangedAt: now,
          status: 'active'
        });

        // 扣除用户积分
        await usersCollection.doc(targetUserId).update({
          points: userPoints - requiredPoints
        });

        // 增加课程报名人数
        await coursesCollection.doc(courseId).update({
          enrolledCount: (course.enrolledCount || 0) + 1
        });

        return {
          code: 0,
          msg: '兑换成功',
          data: { ticketCode, remainingPoints: userPoints - requiredPoints }
        };
      }

      case 'addProduct': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { name, description, category, price, unit, capacity, subUnit, dailyDosage, icon } = payload;
        if (!name) return { code: 400, msg: '产品名称不能为空' };

        const productData = {
          name,
          description: description || '',
          category: category || 'general',
          price: price || 0,
          unit: unit || '瓶',
          capacity: capacity || 1,
          subUnit: subUnit || '粒',
          dailyDosage: dailyDosage || 1,
          icon: icon || '💊',
          created_by: userId,
          created_at: Date.now(),
          updated_at: Date.now()
        };

        const res = await productsCollection.add(productData);
        return { code: 0, msg: '产品添加成功', data: { _id: res.id, ...productData } };
      }

      case 'updateProduct': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { id, name, description, category, price, unit, capacity, subUnit, dailyDosage, icon } = payload;
        if (!id) return { code: 400, msg: '缺少产品ID' };
        if (!name) return { code: 400, msg: '产品名称不能为空' };

        const updateData = {
          name,
          description: description || '',
          category: category || 'general',
          price: price || 0,
          unit: unit || '瓶',
          capacity: capacity || 1,
          subUnit: subUnit || '粒',
          dailyDosage: dailyDosage || 1,
          icon: icon || '💊',
          updated_at: Date.now()
        };

        await productsCollection.doc(id).update(updateData);
        return { code: 0, msg: '产品更新成功' };
      }

      case 'deleteProduct': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { id } = payload;
        if (!id) return { code: 400, msg: '缺少产品ID' };

        await productsCollection.doc(id).remove();
        return { code: 0, msg: '产品删除成功' };
      }

      case 'getProtocolInfo': {
        // 使用payload中的userId或phone（客户ID/手机号），不从Token获取
        let targetUserId = payload.userId;
        const phone = payload.phone;

        // 如果没有userId但有手机号，先用手机号查询用户
        if (!targetUserId && phone) {
          console.log('getProtocolInfo - 使用手机号查询用户:', phone);
          const userRes = await usersCollection.where({ phone }).limit(1).get();
          if (userRes.data.length > 0) {
            targetUserId = userRes.data[0]._id;
            console.log('getProtocolInfo - 根据手机号找到用户ID:', targetUserId);
          }
        }

        if (!targetUserId) {
          return { code: 400, msg: '缺少用户ID或手机号' };
        }

        // 获取用户信息
        const userRes = await usersCollection.doc(targetUserId).get();
        const user = userRes.data[0] || {};

        // 获取营养师信息
        let nutritionist = null;
        if (user.nutritionist_id) {
          const nutriRes = await usersCollection.doc(user.nutrition_id).get();
          nutritionist = nutriRes.data[0] || null;
        }

        // 【已修改】获取该用户的所有计划（支持多个并行方案，如减肥+睡眠）
        // 不再限制为今日计划，获取所有活跃的计划
        const today = new Date().toISOString().split('T')[0];

        console.log('getProtocolInfo - userId:', targetUserId, 'today:', today);

        // 获取所有计划（不限制日期，获取多个方案）
        // 注意：数据库可能使用 user_id 或 userId 字段名
        let planRes;
        try {
          // 先尝试 user_id（下划线）
          planRes = await plansCollection.where({
            user_id: targetUserId
          }).orderBy('created_at', 'desc').get();
          console.log('getProtocolInfo - query by user_id, found:', planRes.data.length);
        } catch (e) {
          console.log('getProtocolInfo - user_id query failed:', e);
          planRes = { data: [] };
        }
        
        // 如果没找到，尝试 userId（驼峰）
        if (planRes.data.length === 0) {
          try {
            planRes = await plansCollection.where({
              userId: targetUserId
            }).orderBy('created_at', 'desc').get();
            console.log('getProtocolInfo - query by userId, found:', planRes.data.length);
          } catch (e) {
            console.log('getProtocolInfo - userId query failed:', e);
          }
        }

        console.log('getProtocolInfo - plans found:', planRes.data.length, 'plans');

        // 将所有计划转换为方案列表
        let protocols = [];
        if (planRes.data.length > 0) {
          // 【修复】从配方库获取真实名称，并建立模板分配日期的映射表
          const planTemplateIds = planRes.data.map(p => p.template_id).filter(Boolean);
          let templateNameMap = new Map();
          if (planTemplateIds.length > 0) {
            try {
              const tmplRes = await templatesCollection.where({ _id: db.command.in(planTemplateIds) }).field({ _id: true, name: true }).get();
              tmplRes.data.forEach(t => templateNameMap.set(t._id, t.name));
            } catch (e) { console.log('getProtocolInfo - template lookup failed:', e); }
          }

          const assignmentMap = new Map();
          if (user.assigned_templates && user.assigned_templates.length > 0) {
            user.assigned_templates.forEach(item => {
              const info = typeof item === 'string' ? { id: item } : item;
              if (info.id && info.added_at) {
                const d = new Date(info.added_at);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                assignmentMap.set(info.id, dateStr);
              }
            });
          }

          protocols = planRes.data.map((plan) => {
            const templateId = plan.template_id;
            const startDate = assignmentMap.get(templateId) || plan.date;
            return {
              id: plan._id,
              name: templateNameMap.get(templateId) || plan.template_name || '健康方案',
              type: plan.type || '综合方案',
              status: plan.status || 'active',
              items: plan.tasks || [],
              date: startDate,
              created_at: plan.created_at,
              template_id: templateId
            };
          });
          console.log('getProtocolInfo - protocols:', JSON.stringify(protocols.map(p => ({id: p.id, name: p.name, date: p.date}))));
        }

        // 第一个方案作为默认方案（向后兼容）
        let protocol = protocols.length > 0 ? protocols[0] : null;
        
        console.log('getProtocolInfo - returning:', {
          protocol: protocol ? protocol.name : null,
          protocolsCount: protocols.length
        });

        return {
          code: 0,
          ok: true,
          data: {
            nutritionist,
            protocol,
            protocols  // 返回所有方案列表（支持多方案）
          }
        };
      }

      case 'systemCleanup': {
        if (userRole !== 'admin') return { code: 403, msg: '无权操作' };
        console.log('🧹 启动系统大扫除...');
        
        // 1. 清理包含“复合维生素”的所有打卡记录
        const res1 = await plansCollection.where({
          'tasks.product_name': /复合维生素/
        }).remove();
        
        // 2. 清理没有 template_id 的孤儿记录
        const res2 = await plansCollection.where({
          template_id: _.exists(false)
        }).remove();
        
        // 3. 清理今天的全部记录，强制重新生成
        const today = getLocalDateStr();
        const res3 = await plansCollection.where({
          date: today
        }).remove();
        
        return {
          code: 0,
          msg: '大扫除完成',
          details: {
            mockRemoved: res1.deleted,
            orphansRemoved: res2.deleted,
            todayReset: res3.deleted
          }
        };
      }

      case 'getAdminDashboardData': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };

        const clientsRes = await usersCollection.where({ role: 'client' }).get();
        const ordersRes = await ordersCollection.where({ status: 0 }).get();

        // 检查今日打卡状态
        const today = getLocalDateStr();
        const pendingCheckIns = [];
        const needsAttentionClients = [];

        for (const client of clientsRes.data) {
          // 【关键修复】查询该用户今日所有方案的打卡记录（不是只查第一个）
          const planRes = await plansCollection.where({
            user_id: client._id,
            date: today
          }).get();

          let checkInStatus = 'not_started';
          let completed = 0;
          let total = 0;
          let symptoms = null;
          let hasLowSymptoms = false;
          let hasLowWrom = false;
          let wromScore = 0;
          let hasTodayData = false;  // 【新增】标记今天是否有计划数据
          
          let sectionStatus = {
            water: { completed: false, current: 0, target: 0 },
            metrics: { completed: false, items: [] },
            symptoms: { completed: false, score: 0 },
            tasks: {
              morning: { completed: false, items: [] },
              noon: { completed: false, items: [] },
              evening: { completed: false, items: [] },
              bedtime: { completed: false, items: [] }
            }
          };

          // 【关键修复】只处理客户当前分配的有效方案
          // 获取客户当前分配 of 方案列表（支持多方案、单方案及对象/字符串的归一化）
          const assignedTemplates = (client.assigned_templates || []).map(item => 
            typeof item === 'string' ? { id: item, status: 'active' } : item
          );
          if (client.assigned_template && !assignedTemplates.some(m => m.id === client.assigned_template)) {
            assignedTemplates.push({ id: client.assigned_template, status: 'active' });
          }
          console.log(`[getAdminDashboardData] 客户 ${client.username} assigned_templates:`, JSON.stringify(assignedTemplates));
          
          const validTemplateIds = new Set(assignedTemplates
            .filter(t => t.status === 'active')
            .map((t) => t.id || t.template_id)
            .filter(Boolean));
          console.log(`[getAdminDashboardData] 客户 ${client.username} validTemplateIds:`, Array.from(validTemplateIds));
          
          // 【关键修复】去重：同一天同一个方案可能因为多次分配产生多条记录，只保留最新的一条
          const latestPlansMap = new Map();
          planRes.data.forEach(p => {
            const tid = p.template_id || 'orphan_' + p._id;
            const existing = latestPlansMap.get(tid);
            if (!existing || (p.created_at || 0) > (existing.created_at || 0)) {
              latestPlansMap.set(tid, p);
            }
          });
          const deduplicatedPlans = Array.from(latestPlansMap.values());

          const validPlans = deduplicatedPlans.filter(plan => {
            // 严禁显示孤儿方案或老旧数据，只要没有关联到当前的活跃 template_id 就完全丢弃
            if (!plan.template_id) {
              console.log(`[getAdminDashboardData] 方案 ${plan.template_name || plan._id} 无 template_id，作为废弃数据排除`);
              return false;
            }
            // 检查是否在客户当前活跃的方案列表中
            const isValid = validTemplateIds.has(String(plan.template_id));
            if (!isValid) {
              console.log(`[getAdminDashboardData] 客户 ${client.username} 方案 ${plan.template_name || plan._id} (template_id: ${plan.template_id}) 不在当前活跃列表中，已排除`);
            }
            return isValid;
          });


          // 【关键修复】合并所有方案的任务数据
          if (validPlans.length > 0) {
            console.log(`[getAdminDashboardData] 客户 ${client.username || client.nickname} 有 ${validPlans.length} 个有效方案（原始 ${planRes.data.length} 个）`);

            // 收集所有任务（不去重）
            const allTasks = [];
            
            for (const planData of validPlans) {
              console.log(`[getAdminDashboardData] 方案 ${planData._id} 任务数: ${planData.tasks?.length || 0}`);
              
              // 【修复】只合并非任务类的 section_status（水、指标、体感）
              // 任务状态由服务端 tasks 数组重新计算，避免客户端快照覆盖
              if (planData.section_status) {
                // 只取 water / metrics / symptoms，不取 tasks（tasks 从服务端 tasks 数组重建）
                if (planData.section_status.water) {
                  sectionStatus.water = { ...sectionStatus.water, ...planData.section_status.water };
                }
                if (planData.section_status.metrics) {
                  sectionStatus.metrics = { ...sectionStatus.metrics, ...planData.section_status.metrics };
                }
                if (planData.section_status.symptoms) {
                  sectionStatus.symptoms = { ...sectionStatus.symptoms, ...planData.section_status.symptoms };
                }
                // 注意：不合并 planData.section_status.tasks，避免旧快照覆盖
              }
              
              // 合并饮水数据（取最大值）
              if (planData.water_intake !== undefined && planData.water_intake > (sectionStatus.water.current || 0)) {
                sectionStatus.water.current = planData.water_intake;
                sectionStatus.water.target = planData.water_target || 2000;
                sectionStatus.water.completed = planData.water_intake >= sectionStatus.water.target;
              }
              
              // 合并健康指标
              if (planData.health_metrics && planData.health_metrics.length > 0) {
                sectionStatus.metrics.items = planData.health_metrics;
                sectionStatus.metrics.completed = planData.health_metrics.every(m => {
                  return m.value !== undefined && m.value !== null && m.value !== '';
                });
              }
              
              // 合并体感数据 - 【核心修复】贪婪收集，确保明细不丢失
              if (planData.symptoms && planData.symptoms.length > 0) {
                const currentSymptoms = planData.symptoms;
                // 【修复】只有分数大于 0 的才认为是有效评分
                const validSymptoms = currentSymptoms.filter(s => s.value !== undefined && s.value !== null && Number(s.value) > 0);
                
                // 如果当前这条记录有有效分数，则更新全局分数和明细
                if (validSymptoms.length > 0) {
                  symptoms = currentSymptoms;
                  const avgScore = validSymptoms.reduce((sum, s) => sum + Number(s.value), 0) / validSymptoms.length;
                  sectionStatus.symptoms.score = avgScore;
                  sectionStatus.symptoms.details = currentSymptoms;
                  sectionStatus.symptoms.completed = true;
                  
                  if (avgScore <= 3) {
                    hasLowSymptoms = true;
                  }
                }
              } else if (planData.section_status?.symptoms?.completed && planData.section_status?.symptoms?.score > 0 && !sectionStatus.symptoms.details) {
                // 如果当前记录没明细但有状态快照且分数大于0，且全局还没存过明细，则尝试保留快照状态
                sectionStatus.symptoms.completed = true;
                sectionStatus.symptoms.score = planData.section_status.symptoms.score || sectionStatus.symptoms.score;
              }

              // 【关键】收集所有任务，不去重
              if (planData.tasks && planData.tasks.length > 0) {
                console.log(`[getAdminDashboardData] 方案 ${planData.template_name || planData._id} 原始任务数: ${planData.tasks.length}`);
                // 【关键修复】统一转换为中文 slot
                const slotToCn = {
                  'morning': '早', 'noon': '中', 'lunch': '中',
                  'evening': '晚', 'bedtime': '睡',
                  '早': '早', '中': '中', '晚': '晚', '睡': '睡'
                };
                for (const task of planData.tasks) {
                  // 【关键修复】使用统一的中文 slot
                  const cnSlot = slotToCn[task.slot] || task.slot;
                  // 【关键修复】将方案名称注入任务，确保详情弹窗能看到来源
                  const templateName = planData.template_name || '执行中方案';
                  const normalizedTask = { ...task, slot: cnSlot, template_name: templateName };
                  // 【关键修复】直接添加任务，不去重
                  allTasks.push(normalizedTask);
                }
              }
            }

            // 统计所有任务
            const rawTotal = planRes.data.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);
            console.log(`[getAdminDashboardData] 客户 ${client.username || client.nickname} - 原始总任务: ${rawTotal}, 实际任务: ${allTasks.length}`);
            
            // 【调试】收集原始任务详情（用于调试）
            const rawMorningTasks = [];
            for (const planData of planRes.data) {
              if (planData.tasks) {
                for (const t of planData.tasks) {
                  if (t.slot === 'morning' || t.slot === '早') {
                    rawMorningTasks.push({
                      plan: planData.template_name || planData._id,
                      name: t.product_name || t.name,
                      slot: t.slot,
                      completed: t.completed
                    });
                  }
                }
              }
            }
            console.log(`[getAdminDashboardData] 原始早晨任务（去重前）:`, rawMorningTasks);
            
            // 【调试】打印去重后每个任务的完成状态
            const slotToCnDebug = { 'morning': '早', 'noon': '中', 'evening': '晚', 'bedtime': '睡', '早': '早', '中': '中', '晚': '晚', '睡': '睡' };
            console.log(`[getAdminDashboardData] 去重后任务详情:`, allTasks.map(t => ({ 
              key: `${t.product_name || t.name || '未命名'}_${slotToCnDebug[t.slot] || t.slot}`,
              name: t.product_name || t.name, 
              slot: t.slot, 
              completed: t.completed 
            })));
            
            // 【关键修复】先清空 items，再从服务端 tasks 数组重新构建
            // 避免客户端 section_status 快照和服务端 tasks 双重叠加
            sectionStatus.tasks = {
              morning: { completed: false, items: [] },
              noon: { completed: false, items: [] },
              evening: { completed: false, items: [] },
              bedtime: { completed: false, items: [] }
            };
            
            for (const task of allTasks) {
              total += 1;
              if (task.completed) completed += 1;
              
              // 按时段分组
              if (task.slot === 'morning' || task.slot === '早') {
                sectionStatus.tasks.morning.items.push(task);
              } else if (task.slot === 'noon' || task.slot === 'lunch' || task.slot === '中' || task.slot === '午') {
                sectionStatus.tasks.noon.items.push(task);
              } else if (task.slot === 'evening' || task.slot === 'dinner' || task.slot === '晚') {
                sectionStatus.tasks.evening.items.push(task);
              } else if (task.slot === 'bedtime' || task.slot === '睡') {
                sectionStatus.tasks.bedtime.items.push(task);
              }
            }
            
            console.log(`[getAdminDashboardData] 客户 ${client.username || client.nickname} - 完成: ${completed}/${total}`);
            
            // 计算各时段完成状态（从服务端 tasks 的真实完成状态计算）
            ['morning', 'noon', 'evening', 'bedtime'].forEach((slot) => {
              const slotTasks = sectionStatus.tasks[slot].items;
              const slotCompleted = slotTasks.filter(t => t.completed).length;
              console.log(`[getAdminDashboardData] 时段 ${slot}: ${slotCompleted}/${slotTasks.length} 完成`);
              if (slotTasks.length > 0) {
                // 修改：只有所有任务都完成才算完成
                sectionStatus.tasks[slot].completed = slotCompleted === slotTasks.length;
              }
            });
            
            // 【调试】打印时段分组详情
            console.log(`[getAdminDashboardData] morning 时段任务详情:`, sectionStatus.tasks.morning.items.map(t => ({name: t.product_name || t.name, completed: t.completed})));
            console.log(`[getAdminDashboardData] noon 时段任务详情:`, sectionStatus.tasks.noon.items.map(t => ({name: t.product_name || t.name, completed: t.completed})));
          
            // 【关键重构】计算四项打卡的综合完成状态
            const isWaterDone = sectionStatus.water.target > 0 ? sectionStatus.water.completed : true;
            const isTasksDone = total > 0 ? (completed >= total) : true;
            const isMetricsDone = (sectionStatus.metrics.items && sectionStatus.metrics.items.length > 0) ? sectionStatus.metrics.completed : true;
            const isSymptomsDone = sectionStatus.symptoms.completed; // 只要填了分值就认为体感已完成

            const isAllDone = isWaterDone && isTasksDone && isMetricsDone && isSymptomsDone;
            
            console.log(`[getAdminDashboardData] 客户 ${client.username || client.nickname} - 综合完成情况:`, {
              isWaterDone, isTasksDone, isMetricsDone, isSymptomsDone, isAllDone
            });

            if (!isAllDone) {
              pendingCheckIns.push({
                ...client,
                today_checkin: {
                  status: isAllDone ? 'completed' : (completed > 0 || !isWaterDone || !isMetricsDone || !isSymptomsDone ? 'partial' : 'not_started'),
                  completed,
                  total,
                  isAllDone,
                  isWaterDone,
                  isTasksDone,
                  isMetricsDone,
                  isSymptomsDone,
                  sectionStatus
                }
              });
            }
            
            // 【持续关注】风险逻辑：WROM 低、体感低、或者有负面指标
            const hasRisk = hasLowSymptoms || hasLowWrom;
            if (hasRisk) {
              needsAttentionClients.push({
                ...client,
                attention_reason: hasLowSymptoms ? 'low_symptoms' : 'low_wrom',
                wrom_score: wromScore,
                symptoms: symptoms,
                today_checkin: {
                  status: isAllDone ? 'completed' : 'partial',
                  completed,
                  total,
                  sectionStatus
                }
              });
            }

            hasTodayData = true;
          }
        }

        const lowStockClients = [];
        const clientIds = clientsRes.data.map(c => c._id);
        
        const allInventoryRes = await inventoryCollection.where({
          user_id: _.in(clientIds)
        }).get();
        const inventoryByUserId = new Map();
        allInventoryRes.data.forEach(inv => {
          if (!inventoryByUserId.has(inv.user_id)) inventoryByUserId.set(inv.user_id, []);
          inventoryByUserId.get(inv.user_id).push(inv);
        });

        // 【修复】先获取所有需要的真实方案配置，因为 assigned_templates 中只存了 id
        const templateIdsToFetch = new Set();
        clientsRes.data.forEach(client => {
          const assignedTemplates = (client.assigned_templates || []).map(item => 
            typeof item === 'string' ? { id: item, status: 'active' } : item
          );
          if (client.assigned_template && !assignedTemplates.some(m => m.id === client.assigned_template)) {
            assignedTemplates.push({ id: client.assigned_template, status: 'active' });
          }
          assignedTemplates
            .filter(t => t.status === 'active')
            .forEach(t => templateIdsToFetch.add(t.id || t.template_id));
        });

        const templatesByKey = new Map();
        if (templateIdsToFetch.size > 0) {
          const templatesRes = await templatesCollection.where({
            _id: _.in(Array.from(templateIdsToFetch))
          }).get();
          templatesRes.data.forEach(t => templatesByKey.set(t._id, t));
        }

        for (const client of clientsRes.data) {
          const assignedTemplates = (client.assigned_templates || []).map(item => 
            typeof item === 'string' ? { id: item, status: 'active' } : item
          );
          if (client.assigned_template && !assignedTemplates.some(m => m.id === client.assigned_template)) {
            assignedTemplates.push({ id: client.assigned_template, status: 'active' });
          }
          if (assignedTemplates.length === 0) continue;

          // 只检查当前活跃的方案
          const activeTemplates = assignedTemplates.filter(t => t.status === 'active');
          if (activeTemplates.length === 0) continue;

          const inventory = inventoryByUserId.get(client._id) || [];
          const inventoryByName = new Map(inventory.map(i => [i.name, i]));

          let hasLowStock = false;
          for (const item of activeTemplates) {
            const templateId = typeof item === 'string' ? item : item.id || item.template_id;
            const template = templatesByKey.get(templateId);
            if (!template) continue;

            const products = template.products || template.items || [];
            for (const product of products) {
              const invItem = inventoryByName.get(product.product_name || product.name);
              const stock = invItem?.stock || 0;
              const threshold = product.low_stock_threshold || 7;
              const dailyUsage = product.daily_usage || 1;
              const daysRemaining = stock > 0 ? Math.floor(stock / dailyUsage) : 0;
              
              if (daysRemaining < threshold || stock === 0) {
                hasLowStock = true;
                break;
              }
            }
            if (hasLowStock) break;
          }

          if (hasLowStock) {
            const lowItems = [];
            const allProducts = [];
            activeTemplates.forEach(t => {
              const tid = typeof t === 'string' ? t : t.id || t.template_id;
              const tmpl = templatesByKey.get(tid);
              if (!tmpl) return;
              const prods = tmpl.products || tmpl.items || [];
              prods.forEach(p => {
                if (allProducts.some(x => (x.product_id || x.product_name) === (p.product_id || p.product_name))) return;
                allProducts.push({ product_id: p.product_id || p.id || '', product_name: p.product_name || p.name || '', daily_usage: p.daily_usage || p.dosage || 1, unit: p.unit || '粒' });
              });
            });
            allProducts.forEach(pItem => {
              const matched = inventory.find(inv => String(inv.product_name || inv.name || '').trim() === String(pItem.product_name).trim()) ||
                              inventory.find(inv => pItem.product_id && inv.product_id && String(inv.product_id) === String(inv.product_id));
              if (!matched) {
                lowItems.push({
                  item_id: '',
                  item_name: pItem.product_name || '未知产品',
                  product_name: pItem.product_name || '未知产品',
                  name: pItem.product_name || '未知产品',
                  stock: 0,
                  days_remaining: 0,
                  unit: pItem.unit || '粒',
                  reason: '无库存记录'
                });
                return;
              }
              const s = Number(matched.stock || 0);
              const u = Number(pItem.daily_usage || 1);
              const c = Number(matched.capacity || 60);
              const daysRem = u > 0 ? Math.floor((s * c) / u) : 0;
              if (daysRem <= (matched.low_stock_days || 7)) {
                lowItems.push({
                  item_id: matched._id,
                  item_name: matched.product_name || pItem.product_name,
                  product_name: matched.product_name || pItem.product_name,
                  name: matched.product_name || pItem.product_name,
                  stock: s,
                  days_remaining: daysRem,
                  unit: matched.unit || pItem.unit || '粒',
                  reason: daysRem <= 0 ? '已耗尽' : `剩${daysRem}天`
                });
              }
            });
            lowStockClients.push({ ...client, low_items: lowItems });
          }
        }

        // 【最终防御】在返回前对所有客户的统计数据进行一次最后的去重和校对
        const finalPendingCheckIns = pendingCheckIns.map(item => {
          const client = { ...item }; // 浅拷贝保留原始字段
          const sectionStatus = client.today_checkin?.sectionStatus;
          
          // 确保名字字段存在（防止 UI 显示 未命名）
          client.name = client.username || client.nickname || (client.phone ? `用户${client.phone.slice(-4)}` : '未知客户');
          
          if (sectionStatus?.tasks) {
            let total = 0;
            let completed = 0;
            
            ['morning', 'noon', 'evening', 'bedtime'].forEach(slot => {
              const section = sectionStatus.tasks[slot];
              if (section && section.items) {
                // 强制按 ID 去重
                const idMap = new Map();
                section.items.forEach((t) => {
                  const tid = (t.product_id || t.id || t._id || t.product_name) + '_' + (t.slot || '');
                  // 如果有冲突，优先保留已完成的
                  if (!idMap.has(tid) || (t.completed && !idMap.get(tid).completed)) {
                    idMap.set(tid, t);
                  }
                });
                
                section.items = Array.from(idMap.values());
                section.total = section.items.length;
                section.completed = section.items.filter((t) => t.completed).length;
                section.completed_status = section.total > 0 && section.items.every((t) => t.completed);
                
                total += section.total;
                completed += section.completed;
              }
            });
            
            client.today_checkin.total = total;
            client.today_checkin.completed = completed;
            client.today_checkin.status = (completed === 0) ? 'not_started' : (completed >= total ? 'completed' : 'partial');
          }
          return client;
        });

        return {
          code: 0,
          data: {
            totalClients: clientsRes.data.length,
            pendingOrders: ordersRes.data,
            pendingCheckIns: finalPendingCheckIns,
            missedCheckIns: finalPendingCheckIns,
            lowStockCount: lowStockClients.length,
            lowStockClients: lowStockClients,
            needsAttentionCount: needsAttentionClients.length,
            needsAttentionClients: needsAttentionClients
          }
        };
      }

      case 'getClients': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        
        // 1. 获取所有客户
        const clientsRes = await usersCollection.where({ role: 'client' }).orderBy('created_at', 'desc').get();
        const clients = clientsRes.data || [];
        if (clients.length === 0) return { code: 0, data: [] };

        const clientIds = clients.map(c => c._id);
        const _ = db.command;

        // 2. 批量获取所有涉及到的数据
        // 2.1 批量获取所有客户的库存
        const allInventoryRes = await inventoryCollection.where({
          user_id: _.in(clientIds)
        }).get();
        const inventoryByUserId = new Map();
        allInventoryRes.data.forEach(inv => {
          if (!inventoryByUserId.has(inv.user_id)) inventoryByUserId.set(inv.user_id, []);
          inventoryByUserId.get(inv.user_id).push(inv);
        });

        // 2.3 批量获取所有客户今日的打卡计划
        const today = getLocalDateStr();
        const allPlansRes = await plansCollection.where({
          user_id: db.command.in(clientIds),
          date: today
        }).get();
        const plansByUserId = new Map();
        allPlansRes.data.forEach(p => {
          if (!plansByUserId.has(p.user_id)) plansByUserId.set(p.user_id, []);
          plansByUserId.get(p.user_id).push(p);
        });

        // 2.2 批量获取补全方案（针对没有 assigned_templates 的用户）
        // 获取没有 assigned_templates 的用户 ID
        // 2. 构建初步的 enriched 数据并收集所有需要的 Template ID
        // 【核心优化】：不再依赖 plansCollection，直接从 User 档案中同步读取状态镜像
        const templateIdsToFetch = new Set();
        const enrichedStep1 = clients.map(client => {
          // 归一化方案数据（支持对象和旧版字符串）
          const assignedTemplates = (client.assigned_templates || []).map(item => 
            typeof item === 'string' ? { id: item, status: 'active' } : item
          );
          
          // 给旧版单数方案字段留最后一点兼容性
          if (client.assigned_template && !assignedTemplates.some(m => m.id === client.assigned_template)) {
            assignedTemplates.push({ id: client.assigned_template, status: 'active' });
          }

          assignedTemplates.forEach(m => templateIdsToFetch.add(m.id));
          return { client, assignedTemplates };
        });

        // 4. 批量获取所有用到的 Template
        let templatesRes = { data: [] };
        if (templateIdsToFetch.size > 0) {
          templatesRes = await templatesCollection.where({
            _id: db.command.in(Array.from(templateIdsToFetch))
          }).get();
        }
        const templatesByKey = new Map();
        templatesRes.data.forEach(t => templatesByKey.set(t._id, t));

        // 5. 组合并计算最终数据
        const finalClients = enrichedStep1.map(({ client, assignedTemplates }) => {
          // 最终计算基础：仅针对活跃方案汇总产品
          const activeTemplates = assignedTemplates.filter(item => item.status === 'active');
          
          // 收集方案产品
          let protocolItems = [];
          activeTemplates.forEach(item => {
            const template = templatesByKey.get(item.id);
            if (template) {
              const items = template.products || template.items || [];
              protocolItems = protocolItems.concat(items.map(p => ({
                product_id: p.product_id || p.id || p._id || '',
                product_name: p.product_name || p.name || p.item_name || p.title || '',
                daily_usage: p.daily_usage || p.dosage || 1,
                unit: p.unit || '粒'
              })));
            }
          });

          if (activeTemplates.length === 0 || protocolItems.length === 0) {
            return {
              ...client,
              assigned_templates: assignedTemplates,
              inventory_summary: { status: 'no_plan', total_count: 0, low_count: 0, low_items: [] }
            };
          }

          // 【去重】优先用 ID 去重（因为 ID 是唯一的），没有 ID 时用名称兜底（兼容旧数据）
          const seenKeys = new Set();
          const uniqueProtocolItems = protocolItems.filter(p => {
            const key = p.product_id || p.product_name;
            if (!key || seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
          });

          // 计算库存
          const userInventory = inventoryByUserId.get(client._id) || [];
          let lowCount = 0;
          const lowItems = [];

          uniqueProtocolItems.forEach(pItem => {
            // 双重容错匹配：优先 ID 匹配，次选名称匹配
            let matched = userInventory.find(inv => pItem.product_id && inv.product_id && String(inv.product_id) === String(pItem.product_id));
            if (!matched) {
              matched = userInventory.find(inv => String(inv.product_name || inv.name || '').trim() === String(pItem.product_name || pItem.name || '').trim());
            }

            if (!matched) {
              // 完全没有入库记录的产品，视为缺货
              lowCount++;
              lowItems.push({ 
                item_id: '', 
                item_name: pItem.product_name || '未知产品', 
                product_name: pItem.product_name || '未知产品', 
                name: pItem.product_name || '未知产品', 
                stock: 0, 
                days_remaining: 0, 
                unit: pItem.unit || '粒',
                reason: '无库存记录' 
              });
            } else {
              const stock = Number(matched.stock || 0);
              const usage = Number(pItem.daily_usage || 1);
              const capacity = Number(matched.capacity || 60);
              const threshold = Number(matched.low_stock_days || 7);
              
              // 关键计算逻辑：剩余天数 = (当前瓶数 * 每瓶容量) / 每日用量
              const totalRemainingUnits = stock * capacity;
              const daysRem = usage > 0 ? (totalRemainingUnits / usage) : 0;

              if (daysRem <= threshold) {
                lowCount++;
                lowItems.push({
                  item_id: matched._id,
                  item_name: matched.product_name || pItem.product_name,
                  product_name: matched.product_name || pItem.product_name,
                  name: matched.product_name || pItem.product_name,
                  stock,
                  days_remaining: Math.round(daysRem),
                  unit: matched.unit || pItem.unit || '粒',
                  reason: daysRem <= 0 ? '已耗尽' : `剩${Math.round(daysRem)}天`
                });
              }
            }
          });

          const clientPlans = plansByUserId.get(client._id) || [];
          let total = 0;
          let completed = 0;

          clientPlans.forEach(plan => {
            const tasks = plan.tasks || [];
            total += tasks.length;
            completed += tasks.filter(t => !!t.completed).length;
          });

          const checkInStatus = total === 0 ? 'not_started' : (completed >= total ? 'completed' : (completed > 0 ? 'partial' : 'not_started'));

          let waterCompleted = false;
          let symptomsCompleted = false;
          let symptomsScore = 0;
          const tasksBySlot = {};

          clientPlans.forEach(plan => {
            if ((plan.water_intake || 0) >= WATER_TARGET) waterCompleted = true;
            if (plan.symptoms && Array.isArray(plan.symptoms)) {
              const scored = plan.symptoms.filter(s => (s.value || 0) > 0);
              if (scored.length > 0) {
                symptomsCompleted = true;
                symptomsScore = scored.reduce((sum, s) => sum + s.value, 0) / scored.length;
              }
            }
            const slot = plan.slot || plan.time_slot || 'morning';
            const tasks = plan.tasks || [];
            if (!tasksBySlot[slot]) tasksBySlot[slot] = { items: [], completed: false };
            tasksBySlot[slot].items = tasksBySlot[slot].items.concat(tasks);
            if (tasks.length > 0 && tasks.every(t => t.completed)) {
              tasksBySlot[slot].completed = true;
            }
          });

          let todayPoints = 0;
          if (clientPlans.length > 0) {
            let dayTasksDone = false;
            let allTasksDone = true;
            for (const p of clientPlans) {
              const t = p.tasks || [];
              if (t.length > 0) {
                if (t.some(x => x.completed)) dayTasksDone = true;
                if (!t.every(x => x.completed)) allTasksDone = false;
              }
            }
            if (dayTasksDone || allTasksDone) todayPoints += 5;
            if (waterCompleted) todayPoints += 1;
            if (symptomsCompleted) todayPoints += 2;
            if (todayPoints >= 8) todayPoints = 10;
          }

          const finalPoints = todayPoints > 0 ? Math.max(todayPoints, Number(client.points || 0)) : Number(client.points || 0);
          const finalStreak = Number(client.streak_days || 0);

          console.log(`[getClients] ${client.username||client.nickname}: todayPts=${todayPoints} dbPoints=${client.points} → ${finalPoints}`);

          return {
            ...client,
            assigned_templates: assignedTemplates,
            points: finalPoints,
            streak_days: finalStreak,
            inventory_summary: {
              status: lowItems.length > 0 ? 'low' : 'normal',
              total_count: uniqueProtocolItems.length,
              low_count: lowItems.length,
              low_items: lowItems
            },
            today_checkin: {
              status: checkInStatus,
              completed,
              total,
              sectionStatus: {
                water: { completed: waterCompleted, current: 0, target: WATER_TARGET * 1000 },
                symptoms: { completed: symptomsCompleted, score: symptomsScore, details: [] },
                metrics: { completed: false },
                tasks: tasksBySlot
              }
            }
          };
        });

        return { code: 0, data: finalClients };
      }

      case 'getAdminReports': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const rangeDays = Number(payload?.rangeDays) === 30 ? 30 : 7;
        const clientsRes = await usersCollection.where({ role: 'client' }).limit(5000).get();
        const clients = Array.isArray(clientsRes?.data) ? clientsRes.data : [];
        const totalClients = clients.length;
        const clientById = new Map();
        clients.forEach((c) => clientById.set(String(c?._id || ''), c));

        if (!totalClients) {
          return {
            code: 0,
            data: {
              totalClients: 0,
              attentionClients: 0,
              repurchaseAttentionClients: 0,
              todayCheckIns: 0,
              weeklyTrend: Array.from({ length: rangeDays }, () => 0),
              weeklyTrendRps: Array.from({ length: rangeDays }, () => 0),
              avgRpsScore: 0,
              riskDistribution: {
                low: { count: 0, percent: 0 },
                medium: { count: 0, percent: 0 },
                high: { count: 0, percent: 0 }
              },
              rpsDistribution: {
                low: { count: 0, percent: 0 },
                medium: { count: 0, percent: 0 },
                high: { count: 0, percent: 0 }
              }
            }
          };
        }

        let lowRiskCount = 0;
        let mediumRiskCount = 0;
        let highRiskCount = 0;
        let lowRpsCount = 0;
        let mediumRpsCount = 0;
        let highRpsCount = 0;
        let rpsTotal = 0;

        clients.forEach((client) => {
          const wromScore = Number(client?.wrom_score || 0);
          const rpsScore = Number.isFinite(Number(client?.rps_score)) ? Number(client?.rps_score) : 0;
          if (wromScore < 60) highRiskCount += 1;
          else if (wromScore < 80) mediumRiskCount += 1;
          else lowRiskCount += 1;

          if (rpsScore < 60) highRpsCount += 1;
          else if (rpsScore < 80) mediumRpsCount += 1;
          else lowRpsCount += 1;

          rpsTotal += rpsScore;
        });

        const todayKey = getLocalDateStr();
        const dateKeys = [];
        for (let i = rangeDays - 1; i >= 0; i -= 1) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          dateKeys.push(getLocalDateStr(d));
        }

        const clientIds = clients.map(c => String(c._id)).filter(Boolean);
        const allInventories = await queryByInBatches(inventoryCollection, 'user_id', clientIds);
        const inventoryByUserId = new Map();
        allInventories.forEach((inv) => {
          const key = String(inv?.user_id || '');
          if (!key) return;
          if (!inventoryByUserId.has(key)) inventoryByUserId.set(key, []);
          inventoryByUserId.get(key).push(inv);
        });

        const weeklyPlans = await queryByInBatches(
          plansCollection,
          'user_id',
          clientIds,
          { date: db.command.in(dateKeys) },
          { limit: 10000 }
        );
        const planMap = new Map();
        weeklyPlans.forEach((plan) => {
          const key = `${String(plan?.user_id || '')}_${String(plan?.date || '')}`;
          if (!planMap.has(key)) planMap.set(key, plan);
        });

        const todayCheckInUsers = new Set();
        weeklyPlans.forEach((plan) => {
          if (String(plan?.date || '') !== todayKey) return;
          const summary = getPlanCheckInSummary(plan);
          if (summary.hasActivity && plan?.user_id) todayCheckInUsers.add(String(plan.user_id));
        });

        const weeklyTrend = dateKeys.map((dateKey) => {
          let dayTotal = 0;
          let dayCount = 0;
          clientIds.forEach((clientId) => {
            const plan = planMap.get(`${clientId}_${dateKey}`);
            const inventoryPercent = getInventoryPercent(inventoryByUserId.get(clientId) || []);
            const fallback = Number(clientById.get(clientId)?.wrom_score || 0);
            if (!plan) {
              dayTotal += fallback;
              dayCount += 1;
              return;
            }
            const checkIn = getPlanCheckInSummary(plan);
            const engagementPercent = checkIn.hasActivity ? 90 : 70;
            const score = Math.round(
              checkIn.completionRate * 0.4 +
              inventoryPercent * 0.3 +
              checkIn.symptomPercent * 0.2 +
              engagementPercent * 0.1
            );
            dayTotal += score;
            dayCount += 1;
          });
          return dayCount > 0 ? Math.round(dayTotal / dayCount) : 0;
        });

        const weeklyTrendRps = dateKeys.map((dateKey) => {
          let dayTotal = 0;
          let dayCount = 0;
          clientIds.forEach((clientId) => {
            const plan = planMap.get(`${clientId}_${dateKey}`);
            const clientRow = clientById.get(clientId);
            const fallbackRps = Number.isFinite(Number(clientRow?.rps_score)) ? Number(clientRow?.rps_score) : 0;
            const inventoryPercent = getInventoryPercent(inventoryByUserId.get(clientId) || []);
            if (!plan) {
              dayTotal += clampNumber(fallbackRps, 0, 100);
              dayCount += 1;
              return;
            }
            const checkIn = getPlanCheckInSummary(plan);
            const behaviorScore = Math.round(
              checkIn.completionRate * 0.5 +
              inventoryPercent * 0.3 +
              checkIn.symptomPercent * 0.2
            );
            const score = Math.round(
              clampNumber(fallbackRps, 0, 100) * 0.7 +
              behaviorScore * 0.3
            );
            dayTotal += clampNumber(score, 0, 100);
            dayCount += 1;
          });
          return dayCount > 0 ? Math.round(dayTotal / dayCount) : 0;
        });

        const attentionClients = highRiskCount;
        const repurchaseAttentionClients = highRpsCount;

        return {
          code: 0,
          data: {
            totalClients,
            attentionClients,
            repurchaseAttentionClients,
            todayCheckIns: todayCheckInUsers.size,
            weeklyTrend,
            weeklyTrendRps,
            avgRpsScore: totalClients > 0 ? Math.round(rpsTotal / totalClients) : 0,
            riskDistribution: {
              low: { count: lowRiskCount, percent: Math.round((lowRiskCount / totalClients) * 100) },
              medium: { count: mediumRiskCount, percent: Math.round((mediumRiskCount / totalClients) * 100) },
              high: { count: highRiskCount, percent: Math.round((highRiskCount / totalClients) * 100) }
            },
            rpsDistribution: {
              low: { count: lowRpsCount, percent: Math.round((lowRpsCount / totalClients) * 100) },
              medium: { count: mediumRpsCount, percent: Math.round((mediumRpsCount / totalClients) * 100) },
              high: { count: highRpsCount, percent: Math.round((highRpsCount / totalClients) * 100) }
            }
          }
        };
      }

      case 'getClientDetail': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { clientId, date } = payload;
        if (!clientId) return { code: 400, msg: '缺少客户ID' };

        console.log('getClientDetail - clientId:', clientId, 'date:', date);

        // 获取客户信息
        const userRes = await usersCollection.doc(clientId).get();
        if (userRes.data.length === 0) {
          return { code: 404, msg: '客户不存在' };
        }
        const user = userRes.data[0];

        // 【修改】查询所有有效期内且状态为active的方案
        const today = getLocalDateStr();
        console.log('getClientDetail - querying active plans for user_id:', clientId, 'today:', today);
        
        // 【新增】如果指定了日期，查询该日期的历史打卡记录
        let historicalPlans = [];
        console.log('[getClientDetail] 历史记录查询参数:', { date, today, clientId, shouldQuery: date && date !== today });
        
        if (date && date !== today) {
          console.log('[getClientDetail] 执行查询:', { user_id: clientId, date: date, collection: 'he_daily_plans' });
          
          const historicalRes = await plansCollection.where({
            user_id: clientId,
            date: date
          }).orderBy('created_at', 'desc').get();
          
          console.log('[getClientDetail] 查询完成，结果数:', historicalRes.data.length);
          
          if (historicalRes.data.length > 0) {
            console.log('[getClientDetail] 第一条记录:', JSON.stringify(historicalRes.data[0], null, 2));
          } else {
            // 【调试】如果没有找到记录，尝试查询该用户所有记录看看
            const allUserPlans = await plansCollection.where({ user_id: clientId }).get();
            console.log('[getClientDetail] 该用户所有记录数:', allUserPlans.data.length);
            if (allUserPlans.data.length > 0) {
              console.log('[getClientDetail] 用户所有日期:', allUserPlans.data.map(p => p.date));
            }
          }
          
          // 【关键修复】处理历史记录，添加 sectionStatus
          historicalPlans = historicalRes.data.map(plan => ({
            ...plan,
            sectionStatus: plan.section_status || {
              water: { completed: (plan.water_intake || 0) >= (plan.water_target || 2000), current: plan.water_intake || 0, target: plan.water_target || 2000 },
              symptoms: { completed: !!(plan.symptoms && plan.symptoms.some(s => s.value > 0)), score: plan.symptoms ? plan.symptoms.reduce((sum, s) => sum + (s.value || 0), 0) / plan.symptoms.length : 0 },
              metrics: { completed: !!(plan.health_metrics && plan.health_metrics.some(m => m.value !== undefined && m.value !== null && m.value !== '')) }
            }
          }));
        }

        // 【关键修复】查询所有状态为 active 的方案（在有效期内的）
        const activePlansRes = await plansCollection.where({
          user_id: clientId,
          status: 'active'
        }).orderBy('created_at', 'desc').get();

        console.log('getClientDetail - active plans found:', activePlansRes.data.length);

        // 过滤出在有效期内的方案
        const todayDate = new Date(today);
        const validPlans = activePlansRes.data.filter(plan => {
          // 如果没有 startDate 或 duration，默认为有效
          if (!plan.startDate && !plan.date) return true;
          
          const startDate = new Date(plan.startDate || plan.date);
          const duration = plan.duration || plan.phases?.[0]?.duration || 30;
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + parseInt(duration));
          
          // 今天是否在有效期内
          return todayDate >= startDate && todayDate <= endDate;
        });

        console.log('getClientDetail - valid plans within duration:', validPlans.length);

        // 【关键修复】如果 he_daily_plans 中没有找到有效方案，
        // 则从 user.assigned_templates 获取分配的方案信息
        let assignedTemplates = [];
        if (validPlans.length === 0) {
          console.log('getClientDetail - no valid plans in he_daily_plans, checking assigned_templates');
          
          // 归一化 assigned_templates 数据
          const assignedMeta = (user.assigned_templates || []).map(item => 
            typeof item === 'string' ? { id: item, status: 'active' } : item
          );
          
          // 过滤出 active 状态的方案
          const activeAssigned = assignedMeta.filter(m => m.status === 'active');
          console.log('getClientDetail - active assigned_templates:', activeAssigned.length);
          
          if (activeAssigned.length > 0) {
            // 获取这些模板的详细信息
            const templateIds = activeAssigned.map(m => m.id);
            const templatesRes = await templatesCollection.where({
              _id: db.command.in(templateIds)
            }).get();
            
            console.log('getClientDetail - templates found:', templatesRes.data.length);
            
            // 转换为 plan 格式
            assignedTemplates = templatesRes.data.map(template => {
              console.log('[调试] 模板原始数据:', template.name);
              console.log('[调试] template.products:', JSON.stringify(template.products));
              console.log('[调试] template.items:', JSON.stringify(template.items));

              // 使用用户档案中保存的 protocol_start_date，如果没有则使用模板分配时的日期
              const protocolStartDate = user.protocol_start_date || today;

              return {
                _id: template._id,
                template_id: template._id,
                template_name: template.name || '未命名方案',
                user_id: clientId,
                status: 'active',
                date: today,
                startDate: protocolStartDate,
                duration: template.duration || template.phases?.[0]?.duration || 30,
                tasks: (template.products || template.items || []).map((product, index) => ({
                  product_id: product.id || product.product_id || product._id || `product_${index}`,
                  product_name: product.product_name || product.name || product.item_name || product.title || '未命名产品',
                  daily_usage: product.daily_usage || product.dosage || 1,
                  unit: product.unit || '粒',
                  frequency: product.frequency || '每日一次',
                  instruction: product.instruction || '',
                  completed: false
                })),
                created_at: Date.now()
              };
            });
            
            console.log('getClientDetail - assignedTemplates converted:', assignedTemplates.length);
          }
        }

        // 同时查询今日计划（用于生成今日打卡任务）
        console.log('getClientDetail - Querying today plans for user:', clientId, 'date:', today);
        const todayPlanRes = await plansCollection.where({
          user_id: clientId,
          date: today
        }).orderBy('created_at', 'desc').get();
        console.log('getClientDetail - Today plans found:', todayPlanRes.data.length);

        // 【关键修复】对今日计划应用与 getDailyPlan/getAdminDashboardData 相同的孤儿过滤
        // 获取客户当前分配的活跃方案 ID 列表
        const clientAssignedTemplates = user.assigned_templates || [];
        const clientActiveTemplateIds = new Set(
          clientAssignedTemplates
            .map(item => typeof item === 'string' ? { id: item, status: 'active' } : item)
            .filter(m => m.status === 'active')
            .map(m => String(m.id || m.template_id))
            .filter(Boolean)
        );
        // 补入旧版单数方案
        if (user.assigned_template && !clientActiveTemplateIds.has(String(user.assigned_template))) {
          clientActiveTemplateIds.add(String(user.assigned_template));
        }
        console.log('getClientDetail - clientActiveTemplateIds:', Array.from(clientActiveTemplateIds));

        // 去重：同一天同一个方案只保留最新的一条
        const todayLatestPlansMap = new Map();
        todayPlanRes.data.forEach(p => {
          const tid = p.template_id || 'orphan_' + p._id;
          const existing = todayLatestPlansMap.get(tid);
          if (!existing || (p.created_at || 0) > (existing.created_at || 0)) {
            todayLatestPlansMap.set(tid, p);
          }
        });
        const todayDeduplicatedPlans = Array.from(todayLatestPlansMap.values());

        // 过滤：只保留当前活跃方案的任务，排除孤儿数据
        const todayValidPlans = todayDeduplicatedPlans.filter(plan => {
          if (!plan.template_id) {
            console.log(`[getClientDetail] 今日方案 ${plan.template_name || plan._id} 无 template_id，作为废弃数据排除`);
            return false;
          }
          const isValid = clientActiveTemplateIds.has(String(plan.template_id));
          if (!isValid) {
            console.log(`[getClientDetail] 今日方案 ${plan.template_name || plan._id} (template_id: ${plan.template_id}) 不在当前活跃列表中，已排除`);
          }
          return isValid;
        });

        console.log(`getClientDetail - Today valid plans after blacklist: ${todayValidPlans.length}`);
        console.log(`getClientDetail - Today valid plans: ${todayValidPlans.length}/${todayPlanRes.data.length}`);

        // 【新增】查询沟通记录
        const interactionsRes = await interactionLogsCollection.where({
          user_id: clientId
        }).orderBy('created_at', 'desc').limit(50).get();
        
        const interactions = interactionsRes.data.map(log => ({
          _id: log._id,
          user_id: log.user_id,
          client_id: log.user_id,
          nutritionist_id: log.nutritionist_id || '',
          nutritionist_name: log.nutritionist_name || '营养顾问',
          sender_role: log.sender_role || 'nutritionist',
          type: log.type || 'wechat',
          content: log.content || '',
          created_at: log.created_at || Date.now(),
          read_at: log.read_at || null
        }));
        
        // 【关键修复】合并 he_daily_plans 和 assigned_templates 的数据源
        const useValidPlans = validPlans.length > 0;
        const allPlans = useValidPlans ? validPlans : assignedTemplates;
        console.log(`getClientDetail - 使用数据源: ${useValidPlans ? 'validPlans(he_daily_plans)' : 'assignedTemplates(模板)'}, 数量:`, allPlans.length);
        
        // 【调试】打印第一个方案的第一个任务，查看实际字段
        if (allPlans.length > 0 && allPlans[0].tasks && allPlans[0].tasks.length > 0) {
          const sampleTask = allPlans[0].tasks[0];
          console.log('[调试] 样例任务数据:', JSON.stringify({
            product_id: sampleTask.product_id,
            product_name: sampleTask.product_name,
            name: sampleTask.name,
            all_fields: Object.keys(sampleTask)
          }));
        }
        
        // 转换所有有效方案为协议格式
        const protocols = allPlans.map(plan => {
          const items = (plan.tasks || []).map(task => ({
            product_id: task.product_id || '',
            product_name: task.product_name || task.name || '未命名产品',
            daily_usage: task.daily_usage || 1,
            unit: task.unit || '粒',
            frequency: task.frequency || '每日一次',
            instruction: task.instruction || '',
            completed: task.completed || false
          }));

          return {
            id: plan._id,
            name: plan.template_name || '健康方案',
            startDate: plan.date,
            template_id: plan.template_id || '',
            status: plan.status || 'active',
            items: items,
            plan_index: plan.plan_index || 0,
            is_secondary: plan.is_secondary || false,
            created_at: plan.created_at,
            phases: [{
              name: '当前阶段',
              status: plan.status || 'active',
              duration: 1,
              currentDay: 1,
              expanded: true,
              products: items.map(item => ({
                name: item.product_name,
                dosage: `${item.daily_usage}${item.unit}`,
                frequency: item.frequency
              }))
            }]
          };
        });

        // 第一个方案作为主方案（向后兼容）
        const protocol = protocols.length > 0 ? protocols[0] : null;

        // 【关键修复】今日打卡状态：使用过滤后的今日计划，排除孤儿方案
        const todayTasks = todayValidPlans.flatMap(p => p.tasks || []);

        // 汇总今日饮水和体感（从所有有效今日方案中汇总）
        const totalWaterIntake = todayValidPlans.reduce((sum, p) => sum + (p.water_intake || 0), 0);
        const allSymptoms = todayValidPlans.flatMap(p => p.symptoms || []);

        console.log('getClientDetail - todayPlans count (valid):', todayValidPlans.length);
        console.log('getClientDetail - todayTasks count:', todayTasks.length);

        return {
          code: 0,
          data: {
            ...user,
            protocol: protocol,  // 主方案（向后兼容）
            protocols: protocols,  // 【修改】所有有效期内且active的方案
            activeProtocolCount: allPlans.length,  // 【修改】使用合并后的方案数量
            plans: allPlans,  // 【修改】返回合并后的所有有效方案
            todayPlans: todayPlanRes.data,  // 【保留】今日计划用于打卡
            historicalPlans: historicalPlans,  // 【新增】指定日期的历史打卡记录
            interactions: interactions,  // 【新增】沟通记录
            today_checkin: todayTasks.length > 0 ? {
              status: todayTasks.every(t => t.completed) ? 'completed' :
                todayTasks.some(t => t.completed) ? 'partial' : 'not_started',
              completed: todayTasks.filter(t => t.completed).length || 0,
              total: todayTasks.length || 0,
              water_intake: totalWaterIntake,
              symptoms: allSymptoms
            } : {
              // 即使没有任务，也返回饮水和体感数据
              status: 'not_started',
              completed: 0,
              total: 0,
              water_intake: totalWaterIntake,
              symptoms: allSymptoms
            }
          }
        };
      }

      // 【新增】查询客户打卡记录（支持管理员和客户自己查询）
      case 'getCheckInRecords': {
        const { clientId, startDate, endDate, limit = 100 } = payload;
        const targetUserId = clientId || userId;

        if (!targetUserId) {
          return { code: 400, msg: '缺少用户ID' };
        }

        // 权限检查：管理员或顾问可以查询其他用户
        const isStaff = userRole === 'admin' || userRole === 'consultant';
        if (clientId && !isStaff) {
          return { code: 403, msg: '需要管理员或顾问权限查询其他用户' };
        }

        // 构建查询条件
        let query = checkInRecordsCollection.where({ user_id: targetUserId });

        if (startDate && endDate) {
          query = query.where({
            date: db.command.gte(startDate).and(db.command.lte(endDate))
          });
        } else if (startDate) {
          query = query.where({ date: db.command.gte(startDate) });
        } else if (endDate) {
          query = query.where({ date: db.command.lte(endDate) });
        }

        const res = await query
          .orderBy('date', 'desc')
          .orderBy('created_at', 'desc')
          .limit(limit)
          .get();

        // 按日期分组汇总
        const recordsByDate = new Map();
        for (const record of res.data) {
          if (!recordsByDate.has(record.date)) {
            recordsByDate.set(record.date, {
              date: record.date,
              records: [],
              totalTasks: 0,
              completedTasks: 0,
              water_intake: 0
            });
          }
          const dayData = recordsByDate.get(record.date);
          dayData.records.push(record);
          if (record.product_id) { // 产品打卡
            dayData.totalTasks++;
            if (record.completed) dayData.completedTasks++;
          }
          if (record.water_intake) {
            dayData.water_intake = record.water_intake;
          }
        }

        return {
          code: 0,
          data: {
            records: res.data,
            summaryByDate: Array.from(recordsByDate.values()),
            total: res.data.length
          }
        };
      }

      case 'getAdminOrders': {
        // 管理员获取所有订单（不限于特定用户）
        const res = await ordersCollection.orderBy('created_at', 'desc').limit(100).get();
        // 标准化订单数据，修复损坏的 items 结构
        const normalizedOrders = res.data.map(order => normalizeOrderItems(order));
        return { code: 0, data: normalizedOrders };
      }

      case 'getOrderById': {
        // 根据订单 _id 或业务订单号 order_no 查询
        const { orderId } = payload;
        if (!orderId) return { code: 400, msg: '缺少订单ID' };
        const key = String(orderId).trim();

        let res = await ordersCollection.doc(key).get();
        if (res.data.length === 0 && key.toUpperCase().startsWith('HP')) {
          const k = key.toUpperCase();
          const byNo = await ordersCollection.where({ order_no: k }).limit(1).get();
          if (byNo.data && byNo.data.length > 0) {
            res = { data: [byNo.data[0]] };
          }
        }
        if (res.data.length === 0) return { code: 404, msg: '订单不存在' };

        const order = res.data[0];
        const normalizedOrder = normalizeOrderItems(order);
        return { code: 0, data: normalizedOrder };
      }

      case 'getOrders': {
        // 客户端获取自己的订单
        const res = await ordersCollection.where({
          user_id: userId
        }).orderBy('created_at', 'desc').limit(50).get();

        // 标准化订单数据，修复损坏的 items 结构
        const normalizedOrders = res.data.map(order => normalizeOrderItems(order));

        // 转换 cloud:// URL 为临时 HTTPS URL
        const ordersWithUrls = await convertOrderImageUrls(normalizedOrders);

        return { code: 0, data: ordersWithUrls };
      }

      case 'getOwnProtocol': {
        console.log('getOwnProtocol - querying for userId:', userId);

        // 【修改】优先查询今日计划，防止历史旧记录混入
        const today = getLocalDateStr();
        const planRes = await plansCollection.where({
          user_id: userId,
          date: today
        }).orderBy('plan_index', 'asc').get();

        console.log('getOwnProtocol - today plans found:', planRes.data.length);
        console.log('getOwnProtocol - today plans data:', JSON.stringify(planRes.data.map(p => ({ id: p._id, status: p.status, template_id: p.template_id, hasTasks: !!p.tasks, tasksLen: p.tasks?.length || 0 }))));

        // 获取用户当前活跃的方案 ID（用于过滤）
        const userResForFilter = await usersCollection.doc(userId).get();
        const userForFilter = userResForFilter.data[0] || {};
        const activeMetaForFilter = (userForFilter.assigned_templates || []).map(item => 
          typeof item === 'string' ? { id: item, status: 'active' } : item
        ).filter(m => m.status === 'active');
        if (userForFilter.assigned_template && !activeMetaForFilter.some(m => m.id === userForFilter.assigned_template)) {
          activeMetaForFilter.push({ id: userForFilter.assigned_template, status: 'active' });
        }
        const currentActiveIds = activeMetaForFilter.map(m => String(m.id));
        console.log('getOwnProtocol - 当前活跃方案ID:', currentActiveIds);

        // 过滤掉已停止的方案，并且只保留在当前活跃方案列表中的计划
        let activePlans = planRes.data.filter(p => {
          if (!p.status || p.status !== 'active') {
            return false;
          }
          if (!p.template_id) {
            console.log(`getOwnProtocol - 方案 ${p.template_name || p._id} 无 template_id，排除`);
            return false;
          }
          if (!currentActiveIds.includes(String(p.template_id))) {
            console.log(`getOwnProtocol - 方案 ${p.template_name || p._id} (template_id: ${p.template_id}) 不在当前活跃列表中，排除`);
            return false;
          }
          return true;
        });

        // 【关键修复】如果今日计划没有有效方案，从 assigned_templates 获取
        if (activePlans.length === 0) {
          console.log('getOwnProtocol - no active plans today, checking assigned_templates');

          const userRes = await usersCollection.doc(userId).get();
          const user = userRes.data[0];

          if (user && user.assigned_templates && user.assigned_templates.length > 0) {
            // 归一化 assigned_templates 数据
            const assignedMeta = user.assigned_templates.map(item =>
              typeof item === 'string' ? { id: item, status: 'active' } : item
            );

            // 过滤出 active 状态的方案
            const activeAssigned = assignedMeta.filter(m => m.status === 'active');
            console.log('getOwnProtocol - active assigned_templates:', activeAssigned.length);

            if (activeAssigned.length > 0) {
              // 获取这些模板的详细信息
              const templateIds = activeAssigned.map(m => m.id);
              const templatesRes = await templatesCollection.where({
                _id: db.command.in(templateIds)
              }).get();
              console.log('getOwnProtocol - templates found:', templatesRes.data.length);
              console.log('getOwnProtocol - templates data:', JSON.stringify(templatesRes.data.map(t => ({ id: t._id, name: t.name, hasProducts: !!t.products, productsLen: t.products?.length, hasItems: !!t.items, itemsLen: t.items?.length }))));

              // 使用用户档案中保存的 protocol_start_date
              const protocolStartDate = user.protocol_start_date || today;

              // 转换为 plan 格式作为 activePlans
              activePlans = templatesRes.data.map((template, index) => {
                const products = template.products || template.items || [];
                const tasks = products.map((product, pIndex) => ({
                  product_id: product.id || product.product_id || `product_${pIndex}`,
                  product_name: product.name || product.product_name || '未命名产品',
                  daily_usage: product.dosage || product.daily_usage || 1,
                  unit: product.unit || '粒',
                  slot: product.slot || product.frequency?.includes('早') ? '早' :
                        product.frequency?.includes('中') ? '中' :
                        product.frequency?.includes('晚') ? '晚' :
                        product.frequency?.includes('睡') ? '睡' : '早',
                  frequency: product.frequency || '每日一次',
                  instruction: product.instruction || '',
                  completed: false
                }));
                
                console.log(`getOwnProtocol - 模板 ${template.name} 生成 ${tasks.length} 个任务`);
                
                return {
                  _id: template._id,
                  template_id: template._id,
                  template_name: template.name || '未命名方案',
                  user_id: userId,
                  status: 'active',
                  date: today,
                  startDate: protocolStartDate,
                  duration: template.duration || template.phases?.[0]?.duration || 30,
                  is_secondary: index > 0, // 第一个为主方案，其余为次要方案
                  plan_index: index,
                  tasks: tasks,
                  created_at: Date.now()
                };
              });
              
              console.log('getOwnProtocol - 从 assigned_templates 构建了', activePlans.length, '个方案');
            }
          }
        }

        if (activePlans.length > 0) {
          // 收集合并标题（智能去重：按+号拆分后统一去重）
          const titleParts = new Set();
          const mergedTasks = [];

          // 【修复】建立模板分配日期的映射表，确保“开始日期”固定为分配方案的那一天
          const userRes = await usersCollection.doc(userId).get();
          const user = userRes.data[0] || {};
          const assignmentMap = new Map();
          if (user.assigned_templates && user.assigned_templates.length > 0) {
            user.assigned_templates.forEach(item => {
              const info = typeof item === 'string' ? { id: item } : item;
              if (info.id && info.added_at) {
                const d = new Date(info.added_at);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                assignmentMap.set(info.id, dateStr);
              }
            });
          }

          const protocols = activePlans.map((plan) => {
            (plan.template_name || '健康方案').split('+').map(s => s.trim()).filter(Boolean)
              .forEach(part => titleParts.add(part));

            const items = (plan.tasks || []).map(t => {
              const dosage = t.daily_usage || 1;
              const unit = t.unit || '粒';
              return {
                product_id: t.product_id,
                product_name: t.product_name || t.name,
                daily_usage: dosage,
                unit: unit,
                slot: t.slot,
                completed: t.completed,
                dose: t.dose || `${dosage}${unit}`,
                instruction: t.instruction || '按需服用'
              };
            });

            mergedTasks.push(...items);
            const startDate = assignmentMap.get(plan.template_id) || plan.date;

            return {
              id: plan._id,
              name: plan.template_name || '健康方案',
              status: plan.status || 'active',
              items: items,
              date: startDate,
              created_at: plan.created_at,
              is_secondary: plan.is_secondary || false,
              plan_index: plan.plan_index || 0
            };
          });

          // 合并后的"虚拟"方案 —— 给小程序首页显示
          const combinedName = Array.from(titleParts).join(' + ') || '今日健康方案';
          const mergedAndSortedTasks = mergeTasks(mergedTasks); // 【关键修复】应用智能合并
          const combinedProtocol = {
            id: 'combined',
            name: combinedName,
            status: 'active',
            items: mergedAndSortedTasks,
            date: today
          };
          
          console.log('✅ getOwnProtocol - 最终合并数据:', {
            combinedName,
            protocolsCount: protocols.length,
            mergedTasksCount: mergedTasks.length,
            finalItemsCount: mergedAndSortedTasks.length
          });
          
          return { code: 0, ok: true, data: {
            protocol: combinedProtocol,  // 合并视图 → 小程序首页任务卡片
            protocols                    // 独立列表 → 其他场景
          }};
        }

        // 如果没有找到任何方案，返回 null
        console.log('getOwnProtocol - no protocol found for user:', userId);
        return { code: 0, ok: true, data: null };
      }

      case 'getInventoryHistory': {
        const { limit = 10 } = payload;
        const res = await inventoryLogsCollection.where({
          user_id: userId
        }).orderBy('created_at', 'desc').limit(limit).get();
        return { code: 0, data: res.data };
      }

      case 'initInventoryFromProtocol': {
        // 根据客户当前的健康方案，为所有尚未有库存记录的产品创建stock=0占位
        const userForInit = (await usersCollection.doc(userId).get()).data[0];
        if (!userForInit) return { code: 404, msg: '用户不存在' };

        const assignedTemplates = userForInit.assigned_templates || [];
        if (userForInit.assigned_template && assignedTemplates.length === 0) {
          // 兼容旧版单模板字段
          assignedTemplates.push({ id: userForInit.assigned_template, status: userForInit.protocol_status || 'active' });
        }
        const activeIds = assignedTemplates
          .filter(t => (typeof t === 'string' ? true : t.status === 'active'))
          .map(t => typeof t === 'string' ? t : t.id);
        
        if (activeIds.length === 0) return { code: 400, msg: '暂无活跃的健康方案' };

        const templatesRes = await templatesCollection.where({ _id: db.command.in(activeIds) }).get();
        let created = 0;
        let skipped = 0;
        
        for (const template of templatesRes.data) {
          const templateItems = template.products || template.items || [];
          for (const item of templateItems) {
            const productId = item.product_id || item.id || '';
            const productName = item.product_name || item.name || '未命名产品';
            
            let existingInv = null;
            if (productId) {
              const r = await inventoryCollection.where({ user_id: userId, product_id: productId }).limit(1).get();
              if (r.data.length > 0) existingInv = r.data[0];
            }
            if (!existingInv && productName) {
              const r = await inventoryCollection.where({ user_id: userId, product_name: productName }).limit(1).get();
              if (r.data.length > 0) existingInv = r.data[0];
            }
            
            if (!existingInv) {
              await inventoryCollection.add({
                user_id: userId,
                product_id: productId,
                name: productName,
                product_name: productName,
                stock: 0,
                unit: item.unit || '瓶',
                icon: item.icon || '💊',
                daily_usage: item.daily_usage || item.dosage || 1,
                low_stock_threshold: 5,
                source: 'protocol_assign',
                template_id: template._id,
                created_at: Date.now(),
                updated_at: Date.now()
              });
              created++;
              console.log(`✅ [initInventoryFromProtocol] 创建"${productName}"库存占位`);
            } else {
              skipped++;
            }
          }
        }
        return { code: 0, ok: true, msg: `已初始化 ${created} 个产品，跳过 ${skipped} 个（已存在）`, data: { created, skipped } };
      }

      case 'getInventory': {
        const res = await inventoryCollection.where({ user_id: userId }).get();
        // 【去重】严格按名称去重，避免同一产品因 ID 不同而重复显示
        const seenKeys = new Set();
        const uniqueData = res.data.filter(item => {
          const key = item.product_name || item.name;
          if (!key || seenKeys.has(key)) return false;
          seenKeys.add(key);
          return true;
        });
        return { code: 0, data: uniqueData };
      }

      case 'createRefillOrder': {
        const refillGate = assertRefillOrderFromClientMiniProgram(context, userRole);
        if (refillGate) return refillGate;

        const { items, isCartOrder } = payload;
        console.log('🔍 后端收到createRefillOrder请求, items:', JSON.stringify(items), 'isCartOrder:', isCartOrder);
        if (!items || items.length === 0) return { code: 400, msg: '请选择产品' };
        console.log('🔍 items数量:', items.length, '产品:', items.map(i => i.name || i.product_name));
        const userRes = await usersCollection.doc(userId).get();
        const user = userRes.data[0] || {};

        // 确保只使用传入的items，不要添加其他产品
        // 为每个产品添加独立状态字段，支持子订单拆分
        const orderItems = items.map((item, index) => ({
          inventory_id: item.inventory_id,
          product_id: item.product_id,
          product_name: item.product_name || item.name,
          name: item.name,
          icon: item.icon || '',
          quantity: item.quantity || 1,
          unit: item.unit || '瓶',
          price: item.price || 0,
          // 每个产品独立状态：0=待发货, 1=已发货, 2=已收货, 3=已取消
          status: 0,
          sub_order_id: `SUB${Date.now()}${index}`, // 子订单ID
          tracking_no: '', // 独立物流单号
          tracking_image: '', // 独立物流图片
          shipped_at: null, // 发货时间
          received_at: null // 收货时间
        }));

        console.log('🔍 将要创建的订单items:', JSON.stringify(orderItems));

        const orderData = {
          order_no: generateOrderNo(),
          user_id: userId,
          nutritionist_id: user.nutritionist_id || '',
          items: orderItems,
          status: 0, // 订单整体状态
          username: user.username || '未知客户',
          phone: user.phone || '',
          quantity: orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0),
          isCartOrder: isCartOrder || false, // 标记是否为购物车合并订单
          created_at: Date.now(),
          updated_at: Date.now()
        };
        const res = await ordersCollection.add(orderData);
        return {
          code: 0,
          msg: '订单创建成功',
          orderId: res.id,
          data: { orderId: res.id, order_no: orderData.order_no }
        };
      }

      case 'uploadTrackingImage': {
        try {
          const { base64Data, fileName } = payload;
          if (!base64Data) {
            return { code: 400, msg: '缺少图片数据' };
          }

          // 上传文件到uniCloud存储
          const uploadRes = await uniCloud.uploadFile({
            fileContent: base64Data,
            cloudPath: `tracking/${fileName || Date.now() + '.jpg'}`
          });

          // 获取真实URL（web端可用）
          let realUrl = uploadRes.fileURL || '';
          if (!realUrl && uploadRes.fileID) {
            // 如果没有直接返回URL，尝试获取临时URL
            try {
              const tempUrlRes = await uniCloud.getTempFileURL({
                fileList: [uploadRes.fileID]
              });
              if (tempUrlRes.fileList && tempUrlRes.fileList[0] && tempUrlRes.fileList[0].tempFileURL) {
                realUrl = tempUrlRes.fileList[0].tempFileURL;
              }
            } catch (e) {
              console.log('getTempFileURL failed:', e);
            }
          }

          return {
            code: 0,
            data: {
              fileID: uploadRes.fileID,
              url: realUrl,
              tempFileURL: realUrl
            },
            msg: '上传成功'
          };
        } catch (err) {
          console.error('uploadTrackingImage error:', err);
          return { code: 500, msg: '上传失败: ' + (err.message || '未知错误') };
        }
      }

      case 'shipOrder': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { orderId, trackingNo, trackingImage, trackingImageUrl, itemIndices } = payload;

        console.log('shipOrder called:', { orderId, trackingNo, itemIndices: itemIndices || 'all pending' });

        // 获取订单信息
        const orderRes = await ordersCollection.doc(orderId).get();
        if (orderRes.data.length === 0) {
          return { code: 404, msg: '订单不存在' };
        }

        const order = orderRes.data[0];
        let items = order.items || [];

        // 先标准化数据（修复字符串状态）
        items = items.map(item => ({
          ...item,
          status: Number(item.status) || 0
        }));

        console.log('Before ship - items status:', items.map(i => ({ name: i.name, status: i.status })));

        // 更新产品状态：将待发货(status=0)的产品标记为已发货(status=1)
        // 如果指定了itemIndices，则只更新指定产品；否则更新所有待发货产品
        const updatedItems = items.map((item, index) => {
          // 如果指定了具体产品索引，只更新指定的
          if (itemIndices && Array.isArray(itemIndices)) {
            if (itemIndices.includes(index) && item.status === 0) {
              console.log(`Shipping item ${index}: ${item.name}`);
              return { 
                ...item, 
                status: 1, 
                shipped_at: Date.now(), 
                tracking_no: trackingNo || '',
                tracking_image: trackingImage || '',
                tracking_image_url: trackingImageUrl || ''
              };
            }
            return item;
          }
          // 否则更新所有待发货的产品
          if (item.status === 0) {
            console.log(`Shipping pending item ${index}: ${item.name}`);
            return { 
              ...item, 
              status: 1, 
              shipped_at: Date.now(), 
              tracking_no: trackingNo || '',
              tracking_image: trackingImage || '',
              tracking_image_url: trackingImageUrl || ''
            };
          }
          return item;
        });

        console.log('After ship - items status:', updatedItems.map(i => ({ name: i.name, status: i.status })));

        // 检查新的订单状态
        const allShipped = updatedItems.every(i => i.status === 1 || i.status === 2);
        const anyShipped = updatedItems.some(i => i.status === 1 || i.status === 2);
        const newStatus = allShipped ? 1 : (anyShipped ? 1 : order.status);

        console.log('New order status:', newStatus, 'allShipped:', allShipped, 'anyShipped:', anyShipped);

        await ordersCollection.doc(orderId).update({
          items: updatedItems,
          status: newStatus,
          tracking_no: trackingNo || '',
          tracking_image: trackingImage || '',
          tracking_image_url: trackingImageUrl || '',
          shipped_at: Date.now(),
          updated_at: Date.now()
        });

        // 记录发货日志
        const shippedCount = updatedItems.filter(i => i.status === 1 && i.shipped_at).length;
        await interactionLogsCollection.add({
          user_id: order.user_id,
          nutritionist_id: userId,
          type: 'order_shipped',
          content: `订单 ${orderNoForMessage(order, orderId)} 已发货，快递单号: ${trackingNo || '无'}`,
          order_id: orderId,
          created_at: Date.now()
        });

        return { code: 0, msg: `订单已发货，共 ${shippedCount} 个产品`, data: { shippedCount } };
      }

      case 'completeOrder': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { orderId, itemIndices } = payload;

        console.log('completeOrder called:', { orderId, itemIndices });

        // 获取订单信息
        const orderRes = await ordersCollection.doc(orderId).get();
        if (orderRes.data.length === 0) {
          return { code: 404, msg: '订单不存在' };
        }

        const order = orderRes.data[0];
        let items = order.items || [];

        // 标准化数据
        items = items.map(item => ({
          ...item,
          status: Number(item.status) || 0
        }));

        console.log('Before complete - items status:', items.map(i => ({ name: i.name, status: i.status })));

        // 更新产品状态：将已发货(status=1)的产品标记为已完成(status=2)
        const updatedItems = items.map((item, index) => {
          if (itemIndices && Array.isArray(itemIndices)) {
            if (itemIndices.includes(index) && item.status === 1) {
              console.log(`Completing item ${index}: ${item.name}`);
              return { ...item, status: 2, completed_at: Date.now() };
            }
            return item;
          }
          // 如果没指定索引，默认完成所有已发货的
          if (item.status === 1) {
            return { ...item, status: 2, completed_at: Date.now() };
          }
          return item;
        });

        console.log('After complete - items status:', updatedItems.map(i => ({ name: i.name, status: i.status })));

        // 检查是否所有产品都已完成
        const allCompleted = updatedItems.every(i => i.status === 2);
        const newStatus = allCompleted ? 2 : order.status;

        console.log('New order status:', newStatus, 'allCompleted:', allCompleted);

        await ordersCollection.doc(orderId).update({
          items: updatedItems,
          status: newStatus,
          updated_at: Date.now()
        });

        // 记录完成日志
        const completedCount = updatedItems.filter(i => i.status === 2 && i.completed_at).length;
        await interactionLogsCollection.add({
          user_id: order.user_id,
          nutritionist_id: userId,
          type: 'order_completed',
          content: `订单 ${orderNoForMessage(order, orderId)} 已标记完成，共 ${completedCount} 个产品`,
          order_id: orderId,
          created_at: Date.now()
        });

        return { code: 0, msg: `订单已完成，共 ${completedCount} 个产品`, data: { completedCount, newStatus } };
      }

      case 'createTemplate': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { name, description, tasks, items, products, category } = payload;
        console.log('createTemplate payload:', JSON.stringify(payload));
        if (!name) return { code: 400, msg: '配方名称不能为空' };

        // 支持 items 或 products 字段
        const productsData = items && items.length > 0 ? items : (products || []);
        console.log('productsData:', JSON.stringify(productsData));

        const templateData = {
          name,
          description: description || '',
          products: productsData,
          category: category || 'general',
          created_by: userId,
          created_at: Date.now(),
          updated_at: Date.now()
        };

        const res = await templatesCollection.add(templateData);
        return { code: 0, msg: '配方创建成功', data: { _id: res.id, ...templateData } };
      }

      case 'updateTemplate': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { id, name, description, tasks, items, products, category } = payload;
        console.log('updateTemplate payload:', JSON.stringify(payload));
        if (!id) return { code: 400, msg: '缺少配方ID' };
        if (!name) return { code: 400, msg: '配方名称不能为空' };

        // 支持 items、products 或 tasks 字段
        const productsData = items && items.length > 0 ? items : (products || []);
        console.log('productsData:', JSON.stringify(productsData));

        const updateData = {
          name,
          description: description || '',
          products: productsData,
          category: category || 'general',
          updated_at: Date.now()
        }

        await templatesCollection.doc(id).update(updateData);
        return { code: 0, msg: '配方更新成功' };
      }

      case 'deleteTemplate': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { id } = payload;
        if (!id) return { code: 400, msg: '缺少配方ID' };

        await templatesCollection.doc(id).remove();
        return { code: 0, msg: '配方删除成功' };
      }

      case 'applyTemplate': {
        const { user_id, clientId, template_id, templateId, startDate, notes } = payload;
        const targetUserId = user_id || clientId;
        const targetTemplateId = template_id || templateId;
        console.log('applyTemplate - targetUserId:', targetUserId, 'targetTemplateId:', targetTemplateId);

        if (!targetUserId || !targetTemplateId) {
          return { code: 400, msg: '缺少客户ID或配方ID' };
        }

        // 获取配方信息
        const templateRes = await templatesCollection.doc(targetTemplateId).get();
        if (templateRes.data.length === 0) {
          return { code: 404, msg: '配方不存在' };
        }
        const template = templateRes.data[0];

        // 获取客户信息
        const clientRes = await usersCollection.doc(targetUserId).get();
        if (clientRes.data.length === 0) {
          return { code: 404, msg: '客户不存在' };
        }
        const client = clientRes.data[0];

        // 【新增】方案名称重复校验：防止为一个客户重复添加同名方案
        const assignedMeta = (client.assigned_templates || []).map(item => 
          typeof item === 'string' ? { id: item, status: 'active' } : item
        );
        const activeIds = assignedMeta.filter(m => m.status === 'active').map(m => m.id);

        if (activeIds.length > 0) {
          console.log('applyTemplate - checking for duplicate names among active protocols:', activeIds.length);
          const activeTemplatesRes = await templatesCollection.where({ _id: db.command.in(activeIds) }).get();
          const duplicate = activeTemplatesRes.data.find(t => 
            String(t.name || '').trim() === String(template.name || '').trim()
          );
          
          if (duplicate) {
            console.warn('applyTemplate - duplicate protocol name detected:', template.name);
            return { 
              code: 400, 
              msg: `该客户已有一个名为“${template.name}”的方案正在执行中，请勿重复添加。` 
            };
          }
        }

        // 为客户创建今日打卡计划
        const today = new Date().toISOString().split('T')[0];
        const planDate = startDate || today;

        // 查询当天已有的方案数量，用于设置方案序号
        const existingPlans = await plansCollection.where({
          user_id: targetUserId,
          date: planDate
        }).get();
        const planIndex = existingPlans.data.length;

        // 将配方中的products/items转换为tasks
        const items = template.products || template.items || [];
        console.log('applyTemplate - template items count:', items.length);
        console.log('applyTemplate - first item:', JSON.stringify(items[0]));
        const timingToSlot = {
          'morning': '早',
          'noon': '中',
          'lunch': '中',
          'afternoon': '中',
          'dinner': '晚',
          'evening': '晚',
          'bedtime': '睡',
          'sleep': '睡',
          '早': '早', '中': '中', '晚': '晚', '睡': '睡'
        };
        const timingToMeal = {
          'morning': '早餐',
          'noon': '午餐',
          'lunch': '午餐',
          'afternoon': '午餐',
          'dinner': '晚餐',
          'evening': '晚餐',
          'bedtime': '睡前',
          'sleep': '睡前'
        };

        const tasks = items.map(item => {
          const dosage = item.daily_usage || item.dosage || 1;
          const unit = item.unit || '粒';
          const timing = item.timing || 'morning';
          const slot = timingToSlot[timing] || item.slot || '早';
          return {
            product_name: item.product_name || item.name || '未命名产品',
            daily_usage: dosage,
            unit: unit,
            dose: `${dosage}${unit}`,
            instruction: item.instruction || item.notes || item.tips || '按需服用',
            frequency: item.frequency ? `${timingToMeal[timing] || ''}${item.frequency}` :
              (timingToMeal[timing] || '每日一次'),
            completed: false,
            product_id: item.product_id || '',
            timing: timing,
            slot: slot,
            reminder_type: item.reminder_type || 'notification'
          };
        });

        // 创建新方案（添加而非替换）
        const planData = {
          user_id: targetUserId,
          date: planDate,
          template_id: targetTemplateId,
          template_name: template.name,
          tasks: tasks,
          notes: notes || '',
          plan_index: planIndex, // 方案序号：0=第一个方案，1=第二个方案
          is_secondary: planIndex > 0, // 是否为附加方案
          created_at: Date.now(),
          updated_at: Date.now()
        };

        // 总是创建新方案（支持多方案并存）
        await plansCollection.add(planData);

        // 【新增】自动初始化库存占位记录（stock=0）
        for (const item of items) {
          const productId = item.product_id || item.id || '';
          const productName = item.product_name || item.name || '未命名产品';
          let existingInv = null;
          if (productId) {
            const r = await inventoryCollection.where({ user_id: targetUserId, product_id: productId }).limit(1).get();
            if (r.data.length > 0) existingInv = r.data[0];
          }
          if (!existingInv && productName) {
            const r = await inventoryCollection.where({ user_id: targetUserId, product_name: productName }).limit(1).get();
            if (r.data.length > 0) existingInv = r.data[0];
          }
          if (!existingInv) {
            await inventoryCollection.add({
              user_id: targetUserId,
              product_id: productId,
              name: productName,
              product_name: productName,
              stock: 0,
              unit: item.unit || '瓶',
              icon: item.icon || '💊',
              daily_usage: item.daily_usage || item.dosage || 1,
              low_stock_threshold: 5,
              source: 'protocol_assign',
              template_id: targetTemplateId,
              created_at: Date.now(),
              updated_at: Date.now()
            });
            console.log(`✅ [applyTemplate] 已为产品"${productName}"创建初始库存记录(stock=0)`);
          }
        }
        // 【新增】持久化分配关系到用户表 he_users
        try {
          const userResForAssign = await usersCollection.doc(targetUserId).get();
          if (userResForAssign.data.length > 0) {
            const userData = userResForAssign.data[0];
            // 归一化旧数据并检查是否存在
            const currentAssignments = (userData.assigned_templates || []).map(item => 
              typeof item === 'string' ? { id: item, status: 'active' } : item
            );
            
            const isAlreadyAssigned = currentAssignments.some(item => item.id === targetTemplateId);
            
            if (!isAlreadyAssigned) {
              console.log('📝 Persisting new status-aware assignment to he_users:', targetTemplateId);
              await usersCollection.doc(targetUserId).update({
                assigned_templates: [...currentAssignments, { id: targetTemplateId, status: 'active', added_at: Date.now() }],
                updated_at: Date.now()
              });
            } else {
              // 【关键修复】激活已存在但处于非 active 状态的方案
              let hasChange = false;
              const updatedAssignments = currentAssignments.map(item => {
                if (item.id === targetTemplateId && item.status !== 'active') {
                  hasChange = true;
                  return { ...item, status: 'active', updated_at: Date.now() };
                }
                return item;
              });

              if (hasChange) {
                console.log('🔄 Reactivating existing assignment:', targetTemplateId);
                await usersCollection.doc(targetUserId).update({
                  assigned_templates: updatedAssignments,
                  updated_at: Date.now()
                });
              }
            }
          }
        } catch (assignErr) {
          console.error('⚠️ Failed to persist assignment to he_users:', assignErr);
          // 这里的失败不阻塞打卡记录的生成
        }

        // 记录互动日志
        await interactionLogsCollection.add({
          user_id: targetUserId,
          nutritionist_id: userId,
          type: 'template',
          content: `营养顾问为您应用了配方：${template.name}${notes ? ` (备注: ${notes})` : ''}`,
          template_id: targetTemplateId,
          created_at: Date.now()
        });

        return { code: 0, msg: '配方应用成功' };
      }
      break;

      case 'updateTaskStatus': {
        const { date, taskIndex, completed, taskInfo } = payload;
        if (!date || taskIndex === undefined) {
          return { code: 400, msg: '缺少日期或任务索引' };
        }

        // 找到当天的计划
        const planRes = await plansCollection.where({
          user_id: userId,
          date: date
        }).get();

        if (planRes.data.length === 0) {
          return { code: 404, msg: '当天没有计划' };
        }

        const plan = planRes.data[0];
        const tasks = plan.tasks || [];

        if (taskIndex < 0 || taskIndex >= tasks.length) {
          return { code: 400, msg: '任务索引无效' };
        }

        const task = tasks[taskIndex];
        task.completed = completed;
        const completedAt = new Date().toISOString();
        if (completed) {
          task.completed_at = completedAt;
        } else {
          delete task.completed_at;
        }

        await plansCollection.doc(plan._id).update({
          tasks: tasks,
          updated_at: Date.now()
        });

        // 创建独立的打卡记录
        const checkInRecord = {
          user_id: userId,
          date: date,
          plan_id: plan._id,
          template_id: plan.template_id || '',
          template_name: plan.template_name || '',
          task_index: taskIndex,
          product_id: task.product_id || '',
          product_name: task.product_name || task.name || '未命名产品',
          slot: task.slot || '',
          timing: task.timing || '',
          daily_usage: task.daily_usage || 1,
          unit: task.unit || '粒',
          completed: completed,
          completed_at: completed ? completedAt : null,
          cancelled_at: !completed ? completedAt : null,
          source: 'daily_plan',
          created_at: Date.now()
        };

        // 检查是否已有记录，有则更新，无则创建
        const existingRecord = await checkInRecordsCollection.where({
          user_id: userId,
          date: date,
          task_index: taskIndex,
          template_id: plan.template_id || ''
        }).limit(1).get();

        if (existingRecord.data.length > 0) {
          await checkInRecordsCollection.doc(existingRecord.data[0]._id).update({
            ...checkInRecord,
            updated_at: Date.now()
          });
        } else {
          await checkInRecordsCollection.add(checkInRecord);
        }

        return { code: 0, msg: '状态已更新', data: { checkInRecord } };
      }

      case 'updateWaterIntake': {
        const { date, waterIntake } = payload;
        const planRes = await plansCollection.where({ user_id: userId, date: date }).get();

        if (planRes.data.length > 0) {
          const planId = planRes.data[0]._id;
          await plansCollection.doc(planId).update({ water_intake: waterIntake });
        } else {
          // Create new plan doc if not exists (though usually plan should exist)
          // But for water log, we allow creating just for logging
          await plansCollection.add({
            user_id: userId,
            date: date,
            tasks: [], // Empty tasks if created by user log
            water_intake: waterIntake,
            symptoms: [],
            updated_at: Date.now()
          });
        }

        // 【新增】创建独立的饮水记录
        await checkInRecordsCollection.add({
          user_id: userId,
          date: date,
          record_type: 'water',  // 记录类型：饮水
          water_intake: waterIntake,
          created_at: Date.now()
        });

        // 计算并返回今日积分
        const pointsData = await calculateDailyPoints(userId, date);
        await updateUserScoresIfNeeded(userId, { force: false });

        return {
          code: 0,
          msg: 'Updated water intake',
          data: {
            points: pointsData.points,
            breakdown: pointsData.breakdown,
            sectionStatus: pointsData.sectionStatus
          }
        };
      }

      case 'updateSymptoms': {
        const { date, symptoms, symptomNotes, section_status } = payload;
        const planRes = await plansCollection.where({ user_id: userId, date: date }).get();

        if (planRes.data.length > 0) {
          const planId = planRes.data[0]._id;
          const updateData = {
            symptoms: symptoms,
            symptom_notes: symptomNotes,
            updated_at: Date.now()
          };
          // 【关键】同时保存 section_status（如果提供）
          if (section_status !== undefined) {
            updateData.section_status = section_status;
          }
          await plansCollection.doc(planId).update(updateData);
        } else {
          const addData = {
            user_id: userId,
            date: date,
            tasks: [],
            water_intake: 0,
            symptoms: symptoms,
            symptom_notes: symptomNotes,
            updated_at: Date.now()
          };
          // 【关键】同时保存 section_status（如果提供）
          if (section_status !== undefined) {
            addData.section_status = section_status;
          }
          await plansCollection.add(addData);
        }

        // 【新增】创建独立的体感记录（每种症状一条记录）
        if (symptoms && symptoms.length > 0) {
          for (const symptom of symptoms) {
            await checkInRecordsCollection.add({
              user_id: userId,
              date: date,
              record_type: 'symptom',  // 记录类型：体感症状
              symptom: symptom,
              symptom_notes: symptomNotes || '',
              created_at: Date.now()
            });
          }
        }

        // 计算并返回今日积分
        const pointsData = await calculateDailyPoints(userId, date);
        await updateUserScoresIfNeeded(userId, { force: false });

        return {
          code: 0,
          msg: 'Updated symptoms',
          data: {
            points: pointsData.points,
            breakdown: pointsData.breakdown,
            sectionStatus: pointsData.sectionStatus
          }
        };
      }

      case 'getHealthMetrics': {
        const { date } = payload;
        const res = await healthLogsCollection
          .where({ user_id: userId, date: date })
          .get();
        return { code: 0, data: res.data };
      }

      case 'updateHealthMetric': {
        const { date, type, value, unit } = payload;
        // Check if metric exists for this date and type
        const res = await healthLogsCollection
          .where({ user_id: userId, date: date, type: type })
          .get();

        if (res.data.length > 0) {
          const logId = res.data[0]._id;
          await healthLogsCollection.doc(logId).update({
            value: value,
            updated_at: Date.now()
          });
        } else {
          await healthLogsCollection.add({
            user_id: userId,
            date: date,
            type: type,
            value: value,
            unit: unit,
            created_at: Date.now()
          });
        }

        // 【新增】创建独立的健康指标记录
        await checkInRecordsCollection.add({
          user_id: userId,
          date: date,
          record_type: 'health_metric',  // 记录类型：健康指标
          metric_type: type,  // weight, blood_pressure, blood_sugar, sleep, etc.
          value: value,
          unit: unit || '',
          created_at: Date.now()
        });

        // 【关键修复】同时更新 he_daily_plans 的 health_metrics 字段，确保 Web 端能正确显示
        const todayPlanRes = await plansCollection.where({
          user_id: userId,
          date: date
        }).get();

        if (todayPlanRes.data.length > 0) {
          // 获取当天的所有健康指标
          const allMetricsRes = await healthLogsCollection
            .where({ user_id: userId, date: date })
            .get();

          const healthMetrics = allMetricsRes.data.map(m => ({
            type: m.type,
            value: m.value,
            unit: m.unit,
            date: m.date
          }));

          // 更新所有今日计划的 health_metrics
          for (const plan of todayPlanRes.data) {
            await plansCollection.doc(plan._id).update({
              health_metrics: healthMetrics,
              updated_at: Date.now()
            });
            console.log(`[updateHealthMetric] Updated plan ${plan._id} health_metrics:`, healthMetrics);
          }
        }

        // 计算并返回今日积分
        const pointsData = await calculateDailyPoints(userId, date);
        await updateUserScoresIfNeeded(userId, { force: false });

        return {
          code: 0,
          msg: 'Updated metric',
          data: {
            points: pointsData.points,
            breakdown: pointsData.breakdown,
            sectionStatus: pointsData.sectionStatus
          }
        };
      }

      case 'getHealthLogRange': {
        const { type, startDate, endDate } = payload;
        const cmd = db.command;
        const res = await healthLogsCollection
          .where({
            user_id: userId,
            type: type,
            date: cmd.gte(startDate).and(cmd.lte(endDate))
          })
          .orderBy('date', 'asc')
          .get();

        // Fetch plans to determine protocol bands
        const plansRes = await plansCollection
          .where({
            user_id: userId,
            date: cmd.gte(startDate).and(cmd.lte(endDate))
          })
          .orderBy('date', 'asc')
          .get();

        const bands = [];
        let currentBand = null;

        for (const plan of plansRes.data) {
          const tName = plan.template_name;
          if (!tName) continue;

          if (!currentBand) {
            currentBand = { name: tName, startDate: plan.date, endDate: plan.date };
          } else if (currentBand.name === tName) {
            currentBand.endDate = plan.date;
          } else {
            bands.push(currentBand);
            currentBand = { name: tName, startDate: plan.date, endDate: plan.date };
          }
        }
        if (currentBand) bands.push(currentBand);

        return { code: 0, data: res.data, protocolBands: bands };
      }

      case 'getWaterLogRange': {
        const { startDate, endDate } = payload;
        const cmd = db.command;
        const res = await plansCollection
          .where({
            user_id: userId,
            date: cmd.gte(startDate).and(cmd.lte(endDate))
          })
          .orderBy('date', 'asc')
          .get();

        // Map to simplified structure
        const data = res.data.map(p => ({
          date: p.date,
          value: p.water_intake || 0
        }));

        return { code: 0, data };
      }

      case 'updateDailyPlan':
      case 'updateDailyPlanTasks': {
        const { user_id, userId, date, template_name, tasks, water_intake, water_target, symptoms, health_metrics, section_status, is_final_sync, client_points, client_streak_days } = payload;
        const actualUserId = user_id || userId; // 兼容两种参数名

        if (!actualUserId || !date) {
          return { code: 400, msg: '缺少用户ID或日期' };
        }

        // 【修复】支持多方案：查找该用户今日所有方案
        const existingPlans = await plansCollection.where({
          user_id: actualUserId,
          date: date
        }).get();

        // 【关键修复】如果当天没有计划，先自动生成计划
        let plansToUpdate = existingPlans.data;
        if (existingPlans.data.length === 0) {
          console.log('[updateDailyPlanTasks] 当天没有计划记录，自动生成...');
          // 调用 generateDailyPlan 生成今日计划
          const genRes = await exports.main({
            action: 'generateDailyPlan',
            payload: { user_id: actualUserId, date, token: extractToken(event) }
          }, context);

          if (genRes.code === 0 && genRes.data) {
            // 重新查询生成的计划
            const newPlansRes = await plansCollection.where({
              user_id: actualUserId,
              date: date
            }).get();
            plansToUpdate = newPlansRes.data;
            console.log('[updateDailyPlanTasks] 自动生成计划成功，数量:', plansToUpdate.length);
          } else {
            console.error('[updateDailyPlanTasks] 自动生成计划失败:', genRes.msg);
            return { code: 500, msg: '当天没有计划且自动生成失败: ' + genRes.msg };
          }
        }

        // 更新所有方案的 tasks（保留其他字段如 water_intake, symptoms 等）
        for (const plan of plansToUpdate) {
          const existingTasks = plan.tasks || [];

          // 【调试】打印接收到的任务和现有任务
          console.log('[updateDailyPlanTasks] Received tasks:', tasks?.map(t => ({ name: t.product_name || t.name, slot: t.slot, completed: t.completed })));
          console.log('[updateDailyPlanTasks] Existing tasks:', existingTasks.map(t => ({ name: t.product_name || t.name, slot: t.slot, completed: t.completed })));

          // 构建更新数据
          const updateData = {
            updated_at: Date.now()
          };

          // 【新增】最终同步标记
          if (is_final_sync) {
            updateData.is_final_sync = true;
            updateData.final_sync_at = Date.now();
          }

          // 【新增】更新各板块状态
          if (water_intake !== undefined) {
            updateData.water_intake = water_intake;
          }
          if (water_target !== undefined) {
            updateData.water_target = water_target;
          }
          if (symptoms !== undefined) {
            updateData.symptoms = symptoms;
          }
          if (health_metrics !== undefined) {
            updateData.health_metrics = health_metrics;
          }
          if (section_status !== undefined) {
            updateData.section_status = section_status;
          }

          // 合并新任务状态：根据 product_name/name + slot 匹配
          if (tasks && tasks.length > 0) {
            console.log(`[updateDailyPlanTasks] 开始合并任务，收到${tasks.length}个任务，现有${existingTasks.length}个任务`);
            // 【调试】打印收到的任务详情
            console.log(`[updateDailyPlanTasks] 收到任务详情:`, tasks.map(t => ({ 
              pid: t.product_id, 
              name: t.product_name || t.name, 
              slot: t.slot, 
              completed: t.completed 
            })));
            console.log(`[updateDailyPlanTasks] 现有任务详情:`, existingTasks.map(t => ({ 
              pid: t.product_id, 
              name: t.product_name || t.name, 
              slot: t.slot, 
              completed: t.completed 
            })));
            
            const mergedTasks = existingTasks.map((et, idx) => {
              const enToCnSlotMap = { 'morning': '早', 'lunch': '中', 'dinner': '晚', 'bedtime': '睡', '早': '早', '中': '中', '晚': '晚', '睡': '睡' };
              const etSlotCn = enToCnSlotMap[et.slot] || et.slot;
              const existingProductName = et.product_name || et.name;

              // 【关键修复】两遍扫描：先严格匹配 product_id，避免同名不同ID的任务被贪婪覆盖
              let updatedTask = tasks.find((t) => {
                const tSlotCn = enToCnSlotMap[t.slot] || t.slot;
                const slotMatch = tSlotCn === etSlotCn;
                const taskIdMatch = (t.product_id && et.product_id) ? t.product_id === et.product_id : false;
                return taskIdMatch && slotMatch;
              });

              // 如果没有匹配到（可能是旧数据没有 product_id），再退化为按名称匹配
              if (!updatedTask) {
                updatedTask = tasks.find((t) => {
                  const tSlotCn = enToCnSlotMap[t.slot] || t.slot;
                  const slotMatch = tSlotCn === etSlotCn;
                  const taskProductName = t.product_name || t.name;
                  const nameMatch = taskProductName === existingProductName;
                  return nameMatch && slotMatch;
                });
              }
              
              if (updatedTask) {
                console.log(`[updateDailyPlanTasks] 任务${idx}匹配成功: ${et.product_name || et.name}(${et.product_id || '无ID'}), 新状态: ${updatedTask.completed}`);
                return {
                  ...et,
                  completed: updatedTask.completed,
                  completed_at: updatedTask.completed ? Date.now() : undefined
                };
              } else {
                console.log(`[updateDailyPlanTasks] 任务${idx}匹配失败: ${et.product_name || et.name}(${et.product_id || '无ID'}) slot:${et.slot}(中文:${etSlotCn})`);
              }
              return et;
            });
            
            // 检查有多少任务被更新
            const updatedCount = mergedTasks.filter((t, i) => t.completed !== existingTasks[i].completed).length;
            console.log(`[updateDailyPlanTasks] 共更新${updatedCount}个任务的状态`);
            
            updateData.tasks = mergedTasks;
          }

          await plansCollection.doc(plan._id).update(updateData);

          console.log(`[updateDailyPlanTasks] Updated plan ${plan._id}:`, updateData);

          // ===================================================================
          // 【关键新增】同步写入 he_check_in_records（双写机制）
          // 确保顾问端"客户详情"通过 getCheckInRecords 能读到完整打卡数据
          // ===================================================================
          try {
            // 1. 同步任务打卡记录
            if (tasks && tasks.length > 0) {
              for (const task of tasks) {
                const productName = task.product_name || task.name || '';
                const taskSlot = task.slot || '';
                if (!productName) continue;

                // 查找已有记录（按 user_id + date + product_name + slot 唯一定位）
                const existingCheckIn = await checkInRecordsCollection.where({
                  user_id: actualUserId,
                  date: date,
                  product_name: productName,
                  slot: taskSlot
                }).limit(1).get();

                const checkInData = {
                  user_id: actualUserId,
                  date: date,
                  record_type: 'task',
                  product_name: productName,
                  product_id: task.product_id || '',
                  slot: taskSlot,
                  completed: !!task.completed,
                  completed_at: task.completed ? Date.now() : null,
                  template_id: plan.template_id || '',
                  template_name: plan.template_name || '',
                  dosage: task.dose || `${task.daily_usage || 1}${task.unit || '粒'}`,
                  unit: task.unit || '粒',
                  daily_usage: task.daily_usage || 1,
                  source: 'sync',
                  updated_at: Date.now()
                };

                if (existingCheckIn.data.length > 0) {
                  await checkInRecordsCollection.doc(existingCheckIn.data[0]._id).update(checkInData);
                } else {
                  checkInData.created_at = Date.now();
                  await checkInRecordsCollection.add(checkInData);
                }
              }
              console.log(`[updateDailyPlanTasks] 已同步 ${tasks.length} 条任务记录到 he_check_in_records`);
            }

            // 2. 同步饮水记录
            if (water_intake !== undefined) {
              const existingWater = await checkInRecordsCollection.where({
                user_id: actualUserId,
                date: date,
                record_type: 'water'
              }).limit(1).get();

              if (existingWater.data.length > 0) {
                await checkInRecordsCollection.doc(existingWater.data[0]._id).update({
                  water_intake: water_intake,
                  updated_at: Date.now()
                });
              } else {
                await checkInRecordsCollection.add({
                  user_id: actualUserId,
                  date: date,
                  record_type: 'water',
                  water_intake: water_intake,
                  created_at: Date.now()
                });
              }
              console.log(`[updateDailyPlanTasks] 已同步饮水记录: ${water_intake}`);
            }

            // 3. 同步体感记录（覆盖式更新：先删后写）
            if (symptoms && Array.isArray(symptoms) && symptoms.length > 0) {
              const oldSymptomRecords = await checkInRecordsCollection.where({
                user_id: actualUserId,
                date: date,
                record_type: 'symptom'
              }).get();

              for (const old of oldSymptomRecords.data) {
                await checkInRecordsCollection.doc(old._id).remove();
              }

              for (const symptom of symptoms) {
                await checkInRecordsCollection.add({
                  user_id: actualUserId,
                  date: date,
                  record_type: 'symptom',
                  symptom: symptom,
                  symptom_notes: payload.symptom_notes || '',
                  created_at: Date.now()
                });
              }
              console.log(`[updateDailyPlanTasks] 已同步 ${symptoms.length} 条体感记录`);
            }

            // 4. 同步健康指标记录
            if (health_metrics && Array.isArray(health_metrics) && health_metrics.length > 0) {
              for (const metric of health_metrics) {
                if (metric.value === '' || metric.value === undefined || metric.value === null) continue;

                const metricType = metric.type || '';
                if (!metricType) continue;

                const existingMetric = await checkInRecordsCollection.where({
                  user_id: actualUserId,
                  date: date,
                  record_type: 'health_metric',
                  metric_type: metricType
                }).limit(1).get();

                if (existingMetric.data.length > 0) {
                  await checkInRecordsCollection.doc(existingMetric.data[0]._id).update({
                    value: metric.value,
                    updated_at: Date.now()
                  });
                } else {
                  await checkInRecordsCollection.add({
                    user_id: actualUserId,
                    date: date,
                    record_type: 'health_metric',
                    metric_type: metricType,
                    value: metric.value,
                    unit: metric.unit || '',
                    created_at: Date.now()
                  });
                }
              }
              console.log(`[updateDailyPlanTasks] 已同步健康指标记录`);
            }
          } catch (checkInErr) {
            // 双写失败不影响主流程，仅记录日志
            console.error('[updateDailyPlanTasks] he_check_in_records 同步失败:', checkInErr);
          }
        }

        let userData = null;
        if (is_final_sync) {
          await updateUserScoresIfNeeded(actualUserId, { force: true });

          const cp = Number(client_points || 0);
          const cs = Number(client_streak_days || 0);
          if (cp > 0 || cs > 0) {
            await usersCollection.doc(actualUserId).update({
              points: cp,
              streak_days: cs,
              last_points_calc: Date.now()
            });
            console.log(`[updateDailyPlanTasks] 积分回写(来自客户端): user=${actualUserId}, points=${cp}, streak=${cs}`);
          }

          const userRes = await usersCollection.doc(actualUserId).get();
          if (userRes.data && userRes.data.length > 0) {
            const user = userRes.data[0];
            userData = {
              points: user.points || 0,
              streak_days: user.streak_days || 0
            };
          }
        }

        return {
          code: 0,
          msg: is_final_sync ? '今日打卡数据已最终同步' : '打卡状态更新成功',
          data: {
            is_final_sync: !!is_final_sync,
            ...userData
          }
        };
      }

      case 'generateDailyPlan': {
        // 根据用户的assigned_templates生成指定日期的每日计划
        const { user_id, date, merge_same_products = true } = payload;
        // 【修复】使用本地时区日期
        const targetDate = date || getLocalDateStr();

        if (!user_id) return { code: 400, msg: '缺少用户ID' };

        // 获取用户信息和当前分配的方案
        const userRes = await usersCollection.doc(user_id).get();
        const user = userRes.data[0];
        if (!user) return { code: 404, msg: '用户不存在' };

        console.log(`[generateDailyPlan] 用户: ${user.username || user.nickname}, 分配模板:`, JSON.stringify(user.assigned_templates || user.assigned_template || []));

        // 【核心优化】：支持对象形式的分配并过滤掉已取消的方案
        const assignedMeta = (user.assigned_templates || []).map(item => 
          typeof item === 'string' ? { id: item, status: 'active' } : item
        );
        
        // 补入旧版单数方案（如果存在且未在列表中）
        if (user.assigned_template && !assignedMeta.some(m => m.id === user.assigned_template)) {
          assignedMeta.push({ id: user.assigned_template, status: 'active' });
        }

        // 仅对活跃方案生成任务
        const activeTemplates = assignedMeta.filter(m => m.status === 'active');
        
        if (activeTemplates.length === 0) return { code: 400, msg: '用户当前没有正在执行的活跃方案' };

        // 时序映射
        const timingToSlot = { 'morning': '早', 'noon': '中', 'lunch': '中', 'dinner': '晚', 'bedtime': '睡' };

        // 批量获取模板数据
        const uniqueTemplateIds = Array.from(new Set(activeTemplates.map(m => String(m.id))));
        const allTemplatesRes = await templatesCollection.where({ _id: db.command.in(uniqueTemplateIds) }).get();
        const templatesByKey = new Map();
        allTemplatesRes.data.forEach(t => templatesByKey.set(t._id, t));

        // 【核心重构】：读取当天已有的计划（按 template_id 索引），用于保留打卡状态
        const existingPlansRes = await plansCollection.where({ user_id: user_id, date: targetDate }).get();
        const existingPlanByTemplateId = new Map();
        let globalWaterIntake = 0;
        let globalPoints = 0;
        let globalSectionStatus = {};

        existingPlansRes.data.forEach(p => {
          if (p.template_id) existingPlanByTemplateId.set(String(p.template_id), p);
          // 取第一条记录的饮水和积分（全局共享）
          if (!globalWaterIntake) globalWaterIntake = p.water_intake || 0;
          if (!globalPoints) globalPoints = p.points || 0;
          if (!globalSectionStatus || Object.keys(globalSectionStatus).length === 0) {
            globalSectionStatus = p.sectionStatus || {};
          }
        });

        // 【关键修复】获取历史任务完成状态 - 按方案分别存储，避免相同产品冲突
        const existingTasksByTemplate = new Map(); // template_id -> Map(index -> task)
        existingPlansRes.data.forEach(p => {
          if (!p.template_id) return;
          const templateId = String(p.template_id);
          if (!existingTasksByTemplate.has(templateId)) {
            existingTasksByTemplate.set(templateId, new Map());
          }
          const taskMap = existingTasksByTemplate.get(templateId);
          (p.tasks || []).forEach((t, idx) => {
            // 用 index 作为 key 精确匹配
            taskMap.set(idx, t);
            // 同时用 product_name + slot 作为备选匹配
            const taskSlot = t.slot || '早';
            taskMap.set(`${t.product_name}_${taskSlot}`, t);
          });
        });

        // 【每个配方独立生成一条计划记录】
        const savedPlanIds = [];
        for (let i = 0; i < activeTemplates.length; i++) {
          const meta = activeTemplates[i];
          const templateId = String(meta.id);
          const template = templatesByKey.get(templateId);
          if (!template) {
            console.log('generateDailyPlan - template not found:', templateId);
            continue;
          }

          // 处理任务数组 - 【修复】同时检查 products 和 items，取有数据的那一个
          let items = [];
          if (template.products && template.products.length > 0) {
            items = template.products;
          } else if (template.items && template.items.length > 0) {
            items = template.items;
          }

          // 【调试】检查产品数据结构
          console.log('generateDailyPlan - Template:', template.name, 'products:', template.products?.length, 'items:', template.items?.length, 'selected:', items.length);
          if (items.length > 0) {
            console.log('generateDailyPlan - First item fields:', Object.keys(items[0]));
            console.log('generateDailyPlan - First item:', JSON.stringify(items[0]));
          }

          // 【数据校对】遍历并标准化任务数据
          const taskMap = existingTasksByTemplate.get(templateId) || new Map();
          
          const tasks = items.map((item, index) => {
            // 【关键修复】优先用 index 精确匹配，避免相同产品冲突
            const timingToSlot = { 'morning': '早', 'noon': '中', 'lunch': '中', 'dinner': '晚', 'bedtime': '睡' };
            const itemSlot = item.slot || timingToSlot[item.timing] || '早';
            // 优先用 index 查找，再用 product_name+slot 备选
            let existingTask = taskMap.get(index);
            if (!existingTask) {
              existingTask = taskMap.get(`${item.product_name}_${itemSlot}`);
            }
            
            // 使用配方中的产品名称
            const productName = item.product_name || item.name || item.item_name || item.title || '未知产品';
            const taskName = productName.trim();

            return {
              product_id: item.product_id || item.id || item._id || '',
              product_name: taskName,
              daily_usage: item.daily_usage || item.usage || 1,
              unit: item.unit || '粒',
              frequency: item.frequency || '每日一次',
              slot: itemSlot,
              timing: item.timing || 'morning',
              duration_days: item.duration_days || 30,
              completed: existingTask ? existingTask.completed : false,
              completed_at: existingTask ? existingTask.completed_at : undefined,
              is_permanent: item.is_permanent || false,
              item_index: index,
              template_id: templateId, // 【新增】强制记录归属模板ID
              template_name: template.name // 【核心修复】将方案名称持久化到每个任务对象
            };
          });

          // 如果任务数组为空，则跳过该计划记录的创建或更新，不生成占位任务
          if (tasks.length === 0) {
            console.log(`[generateDailyPlan] ⚠️ 方案 "${template.name}"(${templateId}) 无产品数据，跳过! products=${template.products?.length||0}, items=${template.items?.length||0}`);
            continue;
          }

          const existingPlan = existingPlanByTemplateId.get(templateId);
          const planData = {
            user_id: user_id,
            date: targetDate,
            template_id: templateId,
            template_name: template.name,  // 使用配方库中的真实名称，不拼接
            tasks: tasks,
            plan_index: i,
            is_secondary: i > 0,
            water_intake: existingPlan ? (existingPlan.water_intake || globalWaterIntake) : globalWaterIntake,
            points: existingPlan ? (existingPlan.points || globalPoints) : globalPoints,
            sectionStatus: existingPlan ? (existingPlan.sectionStatus || globalSectionStatus) : globalSectionStatus,
            updated_at: Date.now(),
            created_at: existingPlan ? existingPlan.created_at : Date.now()
          };

          if (existingPlan) {
            await plansCollection.doc(existingPlan._id).update(planData);
            savedPlanIds.push(existingPlan._id);
          } else {
            const added = await plansCollection.add(planData);
            savedPlanIds.push(added.id);
          }
        }

        // 删除不再活跃的旧计划记录（防止僵尸数据）
        for (const [tid, oldPlan] of existingPlanByTemplateId) {
          if (!uniqueTemplateIds.includes(tid)) {
            await plansCollection.doc(oldPlan._id).remove();
            console.log('generateDailyPlan - 清理旧方案记录:', tid);
          }
        }

        console.log('generateDailyPlan - 完成，共生成', savedPlanIds.length, '条计划');

        // 【关键修复】为了让小程序能立即显示，聚合所有任务并合并重复项
        const finalPlansRes = await plansCollection.where({ _id: db.command.in(savedPlanIds) }).get();
        const aggregatedTasks = finalPlansRes.data.flatMap(p => p.tasks || []);
        const mergedTasks = mergeTasks(aggregatedTasks); // 【关键修复】应用智能合并
        
        return {
          code: 0,
          data: {
            ...finalPlansRes.data[0],
            tasks: mergedTasks,
            plan_ids: savedPlanIds,
            count: savedPlanIds.length,
            original_task_count: aggregatedTasks.length
          }
        };
      }

      case 'deleteDailyPlan': {
        const { user_id, date } = payload;

        if (!user_id) {
          return { code: 400, msg: '缺少用户ID' };
        }

        // 查找并删除计划
        const targetDate = date || new Date().toISOString().split('T')[0];
        const existingPlan = await plansCollection.where({
          user_id: user_id,
          date: targetDate
        }).limit(1).get();

        if (existingPlan.data.length > 0) {
          await plansCollection.doc(existingPlan.data[0]._id).remove();

          // 记录日志
          await interactionLogsCollection.add({
            user_id: user_id,
            nutritionist_id: userId,
            type: 'system',
            content: '营养顾问停止了当前方案执行',
            created_at: Date.now()
          });

          return { code: 0, msg: '方案已停止' };
        } else {
          return { code: 404, msg: '没有找到执行中的方案' };
        }
      }

      case 'quickAssignProtocol': {
        // 【权限控制】只有管理员可以分配方案
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        
        const { clientId, templateId, startDate, notes, urgency = 'normal' } = payload;

        if (!clientId || !templateId) {
          return { code: 400, msg: '缺少客户ID或方案模板ID' };
        }

        // 1. 获取模板信息
        const templateRes = await templatesCollection.doc(templateId).get();
        if (templateRes.data.length === 0) {
          return { code: 404, msg: '方案模板不存在' };
        }
        const template = templateRes.data[0];

        // 2. 获取客户信息
        const clientRes = await usersCollection.doc(clientId).get();
        if (clientRes.data.length === 0) {
          return { code: 404, msg: '客户不存在' };
        }
        const client = clientRes.data[0];

        // 3. 更新客户assigned_template与assigned_templates（以保持单复数方案结构同步）
        const protocolStartDate = startDate || new Date().toISOString().split('T')[0];
        
        const currentAssignments = (client.assigned_templates || []).map(item => 
          typeof item === 'string' ? { id: item, status: 'active' } : item
        );
        if (client.assigned_template && !currentAssignments.some(m => m.id === client.assigned_template)) {
          currentAssignments.push({ id: client.assigned_template, status: 'active' });
        }
        
        const newAssignmentIdx = currentAssignments.findIndex(item => item.id === templateId);
        if (newAssignmentIdx === -1) {
          currentAssignments.push({ id: templateId, status: 'active', added_at: Date.now() });
        } else {
          currentAssignments[newAssignmentIdx].status = 'active';
          currentAssignments[newAssignmentIdx].updated_at = Date.now();
        }

        await usersCollection.doc(clientId).update({
          assigned_template: templateId,
          assigned_templates: currentAssignments,
          protocol_start_date: protocolStartDate,
          protocol_status: 'active',
          protocol_notes: notes || '',
          updated_at: Date.now()
        });

        // 4. 立即生成今日计划
        const today = new Date().toISOString().split('T')[0];
        const items = template.products || template.items || [];
        const tasks = items.map(item => ({
          product_id: item.product_id || '',
          product_name: item.product_name || item.name || '未命名产品',
          daily_usage: item.daily_usage || item.dosage || 1,
          unit: item.unit || '粒',
          instruction: item.instruction || item.notes || '按需服用',
          timing: item.timing || 'morning',
          slot: item.timing === 'evening' || item.timing === 'dinner' ? '晚' : (item.timing === 'noon' || item.timing === 'lunch' || item.timing === 'afternoon' ? '中' : (item.timing === 'bedtime' ? '睡' : '早')),
          completed: false
        }));

        // 检查是否已有今日计划
        const existingPlan = await plansCollection.where({
          user_id: clientId,
          date: today
        }).limit(1).get();

        const planData = {
          user_id: clientId,
          nutritionist_id: userId,
          date: today,
          template_id: templateId,
          template_name: template.name,
          tasks: tasks,
          notes: notes || '',
          created_at: Date.now(),
          updated_at: Date.now()
        };

        if (existingPlan.data.length > 0) {
          await plansCollection.doc(existingPlan.data[0]._id).update(planData);
        } else {
          await plansCollection.add(planData);
        }

        // 5. 【关键】自动初始化库存占位记录（stock=0）for 方案中的每个产品
        // 确保客户"我的库存"立即出现所有产品，并提示补货
        for (const item of items) {
          const productId = item.product_id || '';
          const productName = item.product_name || item.name || '未命名产品';
          
          // 双重容错匹配：先 product_id，再 product_name
          let existingInv = null;
          if (productId) {
            const r = await inventoryCollection.where({ user_id: clientId, product_id: productId }).limit(1).get();
            if (r.data.length > 0) existingInv = r.data[0];
          }
          if (!existingInv && productName) {
            const r = await inventoryCollection.where({ user_id: clientId, product_name: productName }).limit(1).get();
            if (r.data.length > 0) existingInv = r.data[0];
          }
          
          if (!existingInv) {
            // 没有库存记录 → 创建 stock=0 占位，客户和管理员都能看到"需补货"
            await inventoryCollection.add({
              user_id: clientId,
              product_id: productId,
              name: productName,
              product_name: productName,
              stock: 0,
              unit: item.unit || '瓶',
              icon: item.icon || '💊',
              daily_usage: item.daily_usage || item.dosage || 1,
              low_stock_threshold: 5, // 默认低库存阈值
              source: 'protocol_assign',
              template_id: templateId,
              created_at: Date.now(),
              updated_at: Date.now()
            });
            console.log(`✅ [quickAssignProtocol] 已为产品"${productName}"创建初始库存记录(stock=0)`);
          } else {
            console.log(`⚠️ [quickAssignProtocol] 产品"${productName}"已有库存记录，跳过创建`);
          }
        }

        // 6. 记录互动日志
        await interactionLogsCollection.add({
          user_id: clientId,
          nutritionist_id: userId,
          type: 'protocol',
          content: `顾问为您分配了【${template.name}】方案${notes ? '，备注：' + notes : ''}`,
          created_at: Date.now()
        });

        // 7. 发送通知给客户
        await notificationsCollection.add({
          user_id: clientId,
          type: 'protocol',
          title: '新健康方案已分配',
          content: `顾问为您制定了【${template.name}】，今日即可开始打卡！`,
          read_at: null,
          created_at: Date.now()
        });

        return {
          code: 0,
          msg: '方案分配成功',
          data: {
            clientId,
            templateName: template.name,
            startDate: protocolStartDate,
            taskCount: tasks.length,
            urgency
          }
        };
      }

      case 'getProtocolTemplates': {
        // 获取所有可用的方案模板（供顾问快速选择）
        const templatesRes = await templatesCollection.where({
          status: db.command.neq('deleted')
        }).orderBy('created_at', 'desc').get();

        const templates = templatesRes.data.map(t => ({
          id: t._id,
          name: t.name,
          description: t.description || '',
          duration: t.duration || '90',
          productCount: (t.products || t.items || []).length,
          tags: t.tags || [],
          isActive: t.status === 'active'
        }));

        return {
          code: 0,
          data: templates,
          msg: `找到 ${templates.length} 个方案模板`
        };
      }

      case 'confirmOrderReceipt': {
        const { orderId, userId: targetUserId } = payload;
        const uid = targetUserId || userId;

        if (!orderId) {
          return { code: 400, msg: '缺少订单ID' };
        }

        // 获取订单信息
        const orderRes = await ordersCollection.doc(orderId).get();
        if (orderRes.data.length === 0) {
          return { code: 404, msg: '订单不存在' };
        }
        const order = orderRes.data[0];

        // 更新订单状态为已收货
        await ordersCollection.doc(orderId).update({
          status: 2, // 已收货
          received_at: Date.now(),
          updated_at: Date.now()
        });

        // 将订单产品添加到库存
        const orderItems = order.items || [];
        for (const item of orderItems) {
          const productId = item.product_id || item._id;
          const productName = item.product_name || item.name;

          // 检查是否已有该产品库存（优先用product_id，其次用product_name）
          let existingInventory;
          if (productId) {
            existingInventory = await inventoryCollection.where({
              user_id: uid,
              product_id: productId
            }).limit(1).get();
          } else if (productName) {
            existingInventory = await inventoryCollection.where({
              user_id: uid,
              product_name: productName
            }).limit(1).get();
          }

          if (existingInventory && existingInventory.data.length > 0) {
            // 更新现有库存
            const inv = existingInventory.data[0];
            const beforeStock = Number(inv.stock || 0);
            const capacity = Number(inv.capacity || 30);
            const delta = Number(item.quantity || 1) * capacity;
            const afterStock = beforeStock + delta;
            await inventoryCollection.doc(inv._id).update({
              name: inv.name || productName || '未知产品',
              product_id: productId || inv.product_id || '',
              product_name: productName || inv.product_name || inv.name || '未知产品',
              stock: afterStock,
              unit: inv.unit || item.unit || '瓶',
              icon: inv.icon || item.icon || '💊',
              updated_at: Date.now()
            });
            await addInventoryLog({
              userId: uid,
              inventoryId: inv._id,
              productId: productId || inv.product_id || '',
              itemName: productName || inv.product_name || inv.name || '未知产品',
              changeType: 'order_receipt',
              delta,
              beforeStock,
              afterStock,
              referenceType: 'order',
              referenceId: orderId,
              remark: '订单收货入库',
              operatorId: uid,
              operatorRole: 'client'
            });
          } else {
            // 创建新库存记录
            let capacity = 30;
            if (productId) {
              const prodRes = await productsCollection.doc(productId).get();
              if (prodRes.data.length > 0) {
                capacity = Number(prodRes.data[0].capacity || 30);
              }
            }
            const delta = Number(item.quantity || 1) * capacity;
            const addRes = await inventoryCollection.add({
              user_id: uid,
              product_id: productId || '',
              name: productName || '未知产品',
              product_name: productName || '未知产品',
              stock: delta,
              unit: item.unit || '瓶',
              icon: item.icon || '💊',
              created_at: Date.now(),
              updated_at: Date.now()
            });
            await addInventoryLog({
              userId: uid,
              inventoryId: addRes?.id || addRes?._id || '',
              productId: productId || '',
              itemName: productName || '未知产品',
              changeType: 'order_receipt',
              delta,
              beforeStock: 0,
              afterStock: delta,
              referenceType: 'order',
              referenceId: orderId,
              remark: '订单收货入库',
              operatorId: uid,
              operatorRole: 'client'
            });
          }
        }

        await updateUserScoresIfNeeded(uid, { force: true });

        return { code: 0, msg: '收货成功，产品已添加到库存' };
      }

      case 'confirmSubOrderReceipt': {
        // 确认单个产品/子订单收货（支持拆分发货场景）
        const { orderId, subOrderId, inventoryId, userId: targetUserId } = payload;
        const uid = targetUserId || userId;

        if (!orderId || !subOrderId) {
          return { code: 400, msg: '缺少订单ID或子订单ID' };
        }

        // 获取订单信息
        const orderRes = await ordersCollection.doc(orderId).get();
        if (orderRes.data.length === 0) {
          return { code: 404, msg: '订单不存在' };
        }
        const order = orderRes.data[0];

        // 查找要确认的产品
        const itemIndex = order.items.findIndex(item =>
          item.sub_order_id === subOrderId || item.inventory_id === inventoryId
        );

        if (itemIndex === -1) {
          return { code: 404, msg: '未找到该商品' };
        }

        const item = order.items[itemIndex];

        // 检查是否已收货
        if (item.status === 2) {
          return { code: 400, msg: '该商品已收货，无需重复确认' };
        }

        const updatedItems = [...order.items];
        updatedItems[itemIndex] = {
          ...item,
          status: 2, // 已收货
          received_at: Date.now()
        };

        // 检查是否所有产品都已收货，如果是则更新订单整体状态
        const allReceived = updatedItems.every(i => i.status === 2);
        const anyShipped = updatedItems.some(i => i.status === 1 || i.status === 2);

        let newOrderStatus = order.status;
        if (allReceived) {
          newOrderStatus = 2; // 全部已收货
        } else if (anyShipped) {
          newOrderStatus = 1; // 部分已发货/收货
        }

        await ordersCollection.doc(orderId).update({
          items: updatedItems,
          status: newOrderStatus,
          updated_at: Date.now()
        });

        // 将该产品添加到库存
        const productId = item.product_id;
        const productName = item.product_name || item.name;

        // 检查是否已有该产品库存
        let existingInventory;
        if (productId) {
          existingInventory = await inventoryCollection.where({
            user_id: uid,
            product_id: productId
          }).limit(1).get();
        } else if (productName) {
          existingInventory = await inventoryCollection.where({
            user_id: uid,
            product_name: productName
          }).limit(1).get();
        }

        if (existingInventory && existingInventory.data.length > 0) {
          const inv = existingInventory.data[0];
          const beforeStock = Number(inv.stock || 0);
          const capacity = Number(inv.capacity || 30);
          const delta = Number(item.quantity || 1) * capacity;
          const afterStock = beforeStock + delta;
          await inventoryCollection.doc(inv._id).update({
            name: inv.name || productName || '未知产品',
            product_id: productId || inv.product_id || '',
            product_name: productName || inv.product_name || inv.name || '未知产品',
            stock: afterStock,
            unit: inv.unit || item.unit || '瓶',
            icon: inv.icon || item.icon || '💊',
            updated_at: Date.now()
          });
          await addInventoryLog({
            userId: uid,
            inventoryId: inv._id,
            productId: productId || inv.product_id || '',
            itemName: productName || inv.product_name || inv.name || '未知产品',
            changeType: 'order_receipt',
            delta,
            beforeStock,
            afterStock,
            referenceType: 'sub_order',
            referenceId: subOrderId,
            remark: `子订单收货入库 - ${productName || item.name || ''}`,
            operatorId: uid,
            operatorRole: 'client'
          });
        } else {
          let capacity = 30;
          if (productId) {
            const prodRes = await productsCollection.doc(productId).get();
            if (prodRes.data.length > 0) {
              capacity = Number(prodRes.data[0].capacity || 30);
            }
          }
          const delta = Number(item.quantity || 1) * capacity;
          const addRes = await inventoryCollection.add({
            user_id: uid,
            product_id: productId || '',
            name: productName || '未知产品',
            product_name: productName || '未知产品',
            stock: delta,
            unit: item.unit || '瓶',
            icon: item.icon || '💊',
            created_at: Date.now(),
            updated_at: Date.now()
          });
          await addInventoryLog({
            userId: uid,
            inventoryId: addRes?.id || addRes?._id || '',
            productId: productId || '',
            itemName: productName || '未知产品',
            changeType: 'order_receipt',
            delta,
            beforeStock: 0,
            afterStock: delta,
            referenceType: 'sub_order',
            referenceId: subOrderId,
            remark: `子订单收货入库 - ${productName || item.name || ''}`,
            operatorId: uid,
            operatorRole: 'client'
          });
        }
        await updateUserScoresIfNeeded(uid, { force: true });

        return {
          code: 0,
          msg: `${item.name} 收货成功`,
          allReceived: allReceived,
          orderStatus: newOrderStatus
        };
      }

      case 'cancelOrder': {
        const { orderId, itemIndices } = payload;

        if (!orderId) {
          return { code: 400, msg: '缺少订单ID' };
        }

        // 获取订单信息
        const orderRes = await ordersCollection.doc(orderId).get();
        if (orderRes.data.length === 0) {
          return { code: 404, msg: '订单不存在' };
        }

        const order = orderRes.data[0];

        // 权限：客户只能取消自己的订单；管理员可取消任意订单（与发货等后台操作一致）
        if (userRole === 'client') {
          if (String(order.user_id) !== String(userId)) {
            return { code: 403, msg: '无权操作此订单' };
          }
        } else if (userRole !== 'admin') {
          return { code: 403, msg: '需要管理员权限' };
        }

        // 检查订单状态
        // status: 0=待发货, 1=已发货/部分发货, 2=已收货, 3=已取消
        if (order.status === 3) {
          return { code: 400, msg: '订单已取消，无需重复操作' };
        }

        if (order.status === 2) {
          return { code: 400, msg: '订单已收货，无法取消' };
        }

        // 检查是否有未发货的产品可以取消
        const items = order.items || [];

        // 更新产品状态：取消指定或未发货的产品（标记为 status=3 已取消）
        const updatedItems = items.map((item, index) => {
          // 如果指定了具体产品索引，只取消指定的
          if (itemIndices && Array.isArray(itemIndices)) {
            if (itemIndices.includes(index) && item.status === 0) {
              return { ...item, status: 3, cancelled_at: Date.now() };
            }
            return item;
          }
          // 否则取消所有待发货的产品
          if (item.status === 0) {
            return { ...item, status: 3, cancelled_at: Date.now() };
          }
          return item;
        });

        // 统计状态（区分「本次新取消」与历史已取消行）
        const newlyCancelledCount = updatedItems.reduce((acc, item, index) => {
          const prev = items[index];
          if (!prev) return acc;
          if (Number(prev.status) === 0 && Number(item.status) === 3) return acc + 1;
          return acc;
        }, 0);

        if (newlyCancelledCount === 0) {
          return { code: 400, msg: '没有可取消的未发货商品' };
        }

        const totalCancelledLines = updatedItems.filter(i => Number(i.status) === 3).length;
        const shippedCount = updatedItems.filter(i => i.status === 1).length;
        const receivedCount = updatedItems.filter(i => i.status === 2).length;
        const pendingCount = updatedItems.filter(i => i.status === 0).length;

        // 判断新的订单状态
        let newStatus;
        if (pendingCount === 0 && shippedCount === 0 && receivedCount === 0) {
          // 全部取消
          newStatus = 3; // 已取消
        } else if (receivedCount > 0) {
          // 有已收货的
          newStatus = 2; // 已收货
        } else if (shippedCount > 0) {
          // 有已发货但未收货的
          newStatus = 1; // 已发货/部分发货
        } else if (pendingCount > 0) {
          // 还有未发货的
          newStatus = 0; // 待发货
        } else {
          newStatus = 3; // 已取消
        }

        // 更新订单：保留所有产品（包括已取消的）
        await ordersCollection.doc(orderId).update({
          items: updatedItems,
          status: newStatus,
          partially_cancelled_at: Date.now(),
          cancelled_items_count: totalCancelledLines,
          updated_at: Date.now()
        });

        // 记录操作日志（挂在客户名下，便于档案与顾问端查看）
        const cancelledItems = updatedItems.filter((it, idx) => {
          const prev = items[idx];
          return prev && Number(prev.status) === 0 && Number(it.status) === 3;
        });
        const orderLabel = orderNoForMessage(order, orderId);
        const actorText = userRole === 'client' ? '客户' : '管理员';
        await interactionLogsCollection.add({
          user_id: order.user_id,
          nutritionist_id: order.nutritionist_id || '',
          type: 'order_partially_cancelled',
          content: `${actorText}取消了订单 ${orderLabel} 中的 ${newlyCancelledCount} 个未发货产品`,
          order_id: orderId,
          operator_id: userId,
          cancelled_items: cancelledItems.map(i => ({ name: i.name, quantity: i.quantity })),
          created_at: Date.now()
        });

        // 同步给客户：消息中心（小程序「消息」等拉取 getNotifications）
        try {
          const now = Date.now();
          const noticeContent = userRole === 'client'
            ? `您已取消订单 ${orderLabel} 中 ${newlyCancelledCount} 件未发货商品，可在「我的订单」查看。`
            : `订单 ${orderLabel} 中有 ${newlyCancelledCount} 件未发货商品已由管理员取消，请在「我的订单」查看最新状态。`;
          await notificationsCollection.add({
            user_id: order.user_id,
            title: '订单已更新',
            content: noticeContent,
            type: 'order_cancelled',
            status: 'unread',
            read_at: null,
            created_at: now,
            updated_at: now
          });
        } catch (e) {
          console.error('cancelOrder: notification failed', e);
        }

        const allLinesCancelled = updatedItems.length > 0 && updatedItems.every(i => Number(i.status) === 3);
        const msg = allLinesCancelled
          ? '订单已取消'
          : `已取消 ${newlyCancelledCount} 个未发货产品，保留其他产品`;

        return {
          code: 0,
          msg,
          data: {
            newStatus,
            cancelledCount: newlyCancelledCount,
            remainingCount: updatedItems.filter(i => Number(i.status) === 0).length
          }
        };
      }

      case 'getDailyPlan': {
        const { userId: payloadUserId, date } = payload;
        // 【修复】使用本地时区日期
        const targetDate = date || getLocalDateStr();
        const targetUserId = payloadUserId || userId;

        console.log(`[getDailyPlan] 开始 - userId: ${targetUserId}, date: ${targetDate}`);

        // 1. 获取用户当前最新的配方分配状态（用于检测是否脏值）
        const userRes = await usersCollection.doc(targetUserId).get();
        const user = userRes.data[0];
        
        console.log(`[getDailyPlan] 用户数据: ${user ? '存在' : '不存在'}`);
        console.log(`[getDailyPlan] assigned_templates:`, JSON.stringify(user?.assigned_templates));
        console.log(`[getDailyPlan] assigned_template:`, user?.assigned_template);

        // 【核心适配】：仅提取活跃状态的方案 ID 进行比对
        const activeMeta = (user?.assigned_templates || []).map(item => 
          typeof item === 'string' ? { id: item, status: 'active' } : item
        ).filter(m => m.status === 'active');
        
        // 补入旧版单数方案
        if (user?.assigned_template && !activeMeta.some(m => m.id === user.assigned_template)) {
          activeMeta.push({ id: user.assigned_template, status: 'active' });
        }
        
        const currentActiveIds = activeMeta.map(m => String(m.id));
        
        console.log(`[getDailyPlan] 当前活跃方案 ID 列表:`, currentActiveIds);

        // 2. 获取当天的执行计划（新架构：每个配方一条记录）
        const planRes = await plansCollection.where({ user_id: targetUserId, date: targetDate }).get();

        // 【关键修复】去重：同一天同一个方案可能因为多次分配产生多条记录，只保留最新的一条
        const latestPlansMap = new Map();
        planRes.data.forEach(p => {
          const tid = p.template_id || 'orphan_' + p._id;
          const existing = latestPlansMap.get(tid);
          if (!existing || (p.created_at || 0) > (existing.created_at || 0)) {
            latestPlansMap.set(tid, p);
          }
        });
        const deduplicatedPlans = Array.from(latestPlansMap.values());

        if (deduplicatedPlans.length > 0) {
          // 【修复】从所有记录中聚合 template_id，兼容新旧两种格式
          const savedIdSet = new Set();
          deduplicatedPlans.forEach(p => {
            if (p.template_id) savedIdSet.add(String(p.template_id));
            if (p.template_ids) p.template_ids.forEach(id => savedIdSet.add(String(id)));
          });
          const savedIds = Array.from(savedIdSet);

          // 3. 执行脏值检测
          let isDirty = currentActiveIds.length !== savedIds.length ||
                          !currentActiveIds.every(id => savedIds.includes(id));

          // 【关键修复】深层脏值检测：比较配方内的产品是否发生增删改
          if (!isDirty && currentActiveIds.length > 0) {
            try {
              const templatesRes = await templatesCollection.where({
                _id: db.command.in(currentActiveIds)
              }).get();
              
              const templateProductNames = new Set();
              templatesRes.data.forEach(t => {
                 const items = t.products || t.items || [];
                 items.forEach(item => {
                   templateProductNames.add(item.product_name || item.name || '未命名产品');
                 });
              });
              
              const planTaskNames = new Set();
              deduplicatedPlans.forEach(p => {
                 (p.tasks || []).forEach(t => {
                   planTaskNames.add(t.product_name || t.name || '未命名产品');
                 });
              });
              
              // 比较数量和内容
              if (templateProductNames.size !== planTaskNames.size) {
                 isDirty = true;
                 console.log(`🔄 getDailyPlan - 监测到配方内容数量变更 (Template: ${templateProductNames.size}, Plan: ${planTaskNames.size})`);
              } else {
                 for (const name of templateProductNames) {
                   if (!planTaskNames.has(name)) {
                     isDirty = true;
                     console.log(`🔄 getDailyPlan - 监测到配方内容变更 (差异项: ${name})`);
                     break;
                   }
                 }
              }
            } catch (err) {
              console.log('getDailyPlan - deep dirty check failed:', err);
            }
          }

          // 仅对"今天"且方案不一致的情况触发自动同步
          // 【修复】使用本地时区日期进行比较
          if (isDirty && targetDate === getLocalDateStr() && currentActiveIds.length > 0) {
            console.log('🔄 getDailyPlan - 监测到配方变更，正在自动同步...');
            // 【修复】传递原始 token，防止内部调用因缺 token 而返回 401
            const originalToken = extractToken(event);
            const syncRes = await exports.main({
              action: 'generateDailyPlan',
              payload: { user_id: targetUserId, date: targetDate, token: originalToken }
            }, context);
            return syncRes;
          }

          // 【关键修复】只取客户当前活跃的有效方案的任务
          const validPlansForClient = deduplicatedPlans.filter(p => {
            // 严禁显示孤儿方案或老旧数据，只要没有关联到当前的活跃 template_id 就完全丢弃
            if (!p.template_id) {
              console.log(`[getDailyPlan] 方案 ${p.template_name || p._id} 无 template_id，作为废弃数据排除`);
              return false;
            }
            return currentActiveIds.includes(String(p.template_id));
          });
          console.log(`[getDailyPlan] 有效方案数: ${validPlansForClient.length}/${deduplicatedPlans.length}`);
          
          // 【调试】打印每个有效方案的详细信息
          validPlansForClient.forEach((p, idx) => {
            const taskCount = p.tasks?.length || 0;
            console.log(`[getDailyPlan] 有效方案 ${idx + 1}: template_id=${p.template_id}, template_name=${p.template_name}, tasks=${taskCount}`);
            if (p.tasks && p.tasks.length > 0) {
              console.log(`[getDailyPlan]   任务列表: ${p.tasks.map(t => t.product_name).join(', ')}`);
            } else if (p.tasks === undefined) {
              console.log(`[getDailyPlan]   tasks 字段: undefined`);
            } else if (p.tasks === null) {
              console.log(`[getDailyPlan]   tasks 字段: null`);
            } else if (p.tasks.length === 0) {
              console.log(`[getDailyPlan]   tasks 字段: 空数组 []`);
            }
          });
        }

        // 【关键修复】如果数据库中没有记录或任务，但用户有活跃的方案，直接从模板构建任务
        let aggregatedTasks = [];
        let basePlan = null;

        // 从数据库记录中获取有效方案和任务
        let dbValidPlans = [];
        if (deduplicatedPlans.length > 0) {
          dbValidPlans = deduplicatedPlans.filter(p => {
            if (!p.template_id) return false;
            return currentActiveIds.includes(String(p.template_id));
          });
          aggregatedTasks = dbValidPlans.flatMap(p => p.tasks || []);
          basePlan = dbValidPlans.length > 0 ? dbValidPlans[0] : (planRes.data[0] || {});
        }

        if ((aggregatedTasks.length === 0 || (deduplicatedPlans.length === 0 && currentActiveIds.length > 0)) && currentActiveIds.length > 0) {
          console.log('[getDailyPlan] 数据库中无任务或无有效计划，但有活跃方案，尝试从模板直接构建任务...');
          console.log(`[getDailyPlan] currentActiveIds: ${currentActiveIds.join(', ')}`);
          
          try {
            const templatesRes = await templatesCollection.where({
              _id: db.command.in(currentActiveIds)
            }).get();
            
            console.log('[getDailyPlan] 获取到模板数量:', templatesRes.data.length);
            
            if (templatesRes.data.length > 0) {
              const builtTasks = templatesRes.data.flatMap(template => {
                const items = template.products || template.items || [];
                console.log(`[getDailyPlan] 模板 ${template.name || template._id} - products: ${template.products?.length}, items: ${template.items?.length}, selected: ${items.length}`);
                
                return items.map((product, pIndex) => ({
                  product_id: product.id || product.product_id || `product_${pIndex}`,
                  product_name: product.name || product.product_name || '未命名产品',
                  daily_usage: product.dosage || product.daily_usage || 1,
                  unit: product.unit || '粒',
                  slot: product.slot || product.frequency?.includes('早') ? '早' :
                        product.frequency?.includes('中') ? '中' :
                        product.frequency?.includes('晚') ? '晚' :
                        product.frequency?.includes('睡') ? '睡' : '早',
                  frequency: product.frequency || '每日一次',
                  instruction: product.instruction || '',
                  completed: false,
                  template_id: template._id,
                  template_name: template.name
                }));
              });
              
              console.log('[getDailyPlan] 从模板构建了', builtTasks.length, '个任务');
              builtTasks.forEach(t => aggregatedTasks.push(t));
              
              // 构建基础 plan 对象
              if (!basePlan) {
                const firstTemplate = templatesRes.data[0];
                basePlan = {
                  user_id: targetUserId,
                  date: targetDate,
                  template_id: firstTemplate._id,
                  template_name: firstTemplate.name,
                  tasks: []
                };
              }
            }
          } catch (err) {
            console.error('[getDailyPlan] 从模板构建任务失败:', err);
          }
        }
          
        const mergedTasks = mergeTasks(aggregatedTasks); // 【关键修复】应用智能合并
          
        console.log(`[getDailyPlan] 返回任务数: ${mergedTasks.length} (原始: ${aggregatedTasks.length})`);

        if (mergedTasks.length > 0 || basePlan) {
          return { 
            code: 0, 
            data: { 
              ...basePlan, 
              tasks: mergedTasks, 
              plan_count: Math.max(dbValidPlans.length, currentActiveIds.length),
              original_count: aggregatedTasks.length 
            } 
          };
        }

        return { code: 0, data: null };
      }

      // ===== 知识库管理 =====
      case 'getKnowledgeList': {
        const { category, limit = 50 } = payload;
        let query = knowledgeCollection.orderBy('created_at', 'desc');
        if (category && category !== 'all') {
          query = query.where({ category });
        }
        const res = await query.limit(limit).get();
        return { code: 0, data: res.data };
      }

      case 'saveKnowledge': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { id, title, content, category, tags, status } = payload;
        if (!title || !content) return { code: 400, msg: '标题和内容不能为空' };

        const knowledgeData = {
          title,
          content,
          category: category || 'general',
          tags: tags || [],
          status: status || 'active',
          updated_at: Date.now()
        };

        if (id) {
          await knowledgeCollection.doc(id).update(knowledgeData);
          return { code: 0, msg: '知识更新成功' };
        } else {
          knowledgeData.created_by = userId;
          knowledgeData.created_at = Date.now();
          const res = await knowledgeCollection.add(knowledgeData);
          return { code: 0, msg: '知识创建成功', data: { _id: res.id, ...knowledgeData } };
        }
      }

      case 'deleteKnowledge': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { id } = payload;
        if (!id) return { code: 400, msg: '缺少知识ID' };
        await knowledgeCollection.doc(id).remove();
        return { code: 0, msg: '知识删除成功' };
      }

      // ===== 触发器管理 =====
      case 'getTriggers': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const res = await triggersCollection.orderBy('created_at', 'desc').get();
        return { code: 0, data: res.data };
      }

      case 'updateTrigger': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { id, name, condition, action, enabled } = payload;
        if (!id || !name) return { code: 400, msg: '缺少触发器ID或名称' };

        await triggersCollection.doc(id).update({
          name,
          condition: condition || {},
          action: action || {},
          enabled: enabled !== undefined ? enabled : true,
          updated_at: Date.now()
        });
        return { code: 0, msg: '触发器更新成功' };
      }

      // ===== 评分配置 =====
      case 'getScoringConfig': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        // TODO: 实现获取评分配置逻辑
        return { code: 0, msg: '获取成功', data: {} };
        break;
      }

      // ===== 通知系统 =====
      case 'getNotifications': {
        const { limit = 10 } = payload;
        const res = await notificationsCollection.where({
          user_id: userId
        }).orderBy('created_at', 'desc').limit(limit).get();
        return { code: 0, data: res.data };
      }

      case 'getUnreadNotificationCount': {
        const res = await notificationsCollection.where({
          user_id: userId,
          status: 'unread'
        }).count();
        return { code: 0, data: { count: res.total || 0 } };
      }

      case 'markNotificationRead': {
        const { notificationId } = payload;
        if (!notificationId) return { code: 400, msg: '缺少通知ID' };

        await notificationsCollection.doc(notificationId).update({
          read: true,
          read_at: Date.now(),
          updated_at: Date.now()
        });
        return { code: 0, msg: '通知已标记为已读' };
      }

      // ===== 客户消息系统（与营养师互通）=====
      // 【新增】客户发送消息给营养师
      case 'addMyInteractionLog': {
        const { userId: targetUserId, content, type = 'app' } = payload;
        const actualUserId = targetUserId || userId;
        
        if (!actualUserId) {
          return { code: 400, msg: '缺少用户ID' };
        }
        if (!content || !content.trim()) {
          return { code: 400, msg: '缺少消息内容' };
        }
        
        try {
          const now = Date.now();
          
          // 获取用户信息用于显示
          const userRes = await usersCollection.doc(actualUserId).get();
          const user = userRes.data[0] || {};
          
          const logData = {
            user_id: actualUserId,
            client_id: actualUserId,
            nutritionist_id: user.assigned_nutritionist_id || '',
            nutritionist_name: user.assigned_nutritionist_name || '营养顾问',
            sender_role: 'client',
            type: type || 'app',
            content: content.trim(),
            created_at: now,
            updated_at: now,
            read_at: null
          };
          
          const addRes = await interactionLogsCollection.add(logData);
          
          if (addRes.id || addRes._id) {
            // 更新客户的最后互动时间
            try {
              await usersCollection.doc(actualUserId).update({
                last_interaction_at: now,
                updated_at: now
              });
            } catch (e) {
              console.log('Update user last_interaction_at failed:', e);
            }
            
            return {
              code: 0,
              data: {
                _id: addRes.id || addRes._id,
                ...logData
              }
            };
          }
          
          return { code: 500, msg: '发送消息失败' };
        } catch (err) {
          console.error('Add my interaction log error:', err);
          return { code: 500, msg: '发送消息失败: ' + err.message };
        }
      }

      // 【新增】客户获取自己的消息记录
      case 'getMyInteractionLogs': {
        const { userId: targetUserId, limit = 50 } = payload;
        const actualUserId = targetUserId || userId;
        
        if (!actualUserId) {
          return { code: 400, msg: '缺少用户ID' };
        }
        
        try {
          const res = await interactionLogsCollection.where({
            user_id: actualUserId
          }).orderBy('created_at', 'desc').limit(limit).get();
          
          // 按时间正序返回，方便显示
          const logs = res.data.map(log => ({
            _id: log._id,
            user_id: log.user_id,
            client_id: log.user_id,
            nutritionist_id: log.nutritionist_id || '',
            nutritionist_name: log.nutritionist_name || '营养顾问',
            sender_role: log.sender_role || 'nutritionist',
            type: log.type || 'app',
            content: log.content || '',
            created_at: log.created_at || Date.now(),
            read_at: log.read_at || null
          })).sort((a, b) => a.created_at - b.created_at);
          
          return { code: 0, data: logs };
        } catch (err) {
          console.error('Get my interaction logs error:', err);
          return { code: 500, msg: '获取消息失败: ' + err.message };
        }
      }

      // 【新增】标记消息为已读
      case 'markMyInteractionsRead': {
        const { userId: targetUserId } = payload;
        const actualUserId = targetUserId || userId;
        
        if (!actualUserId) {
          return { code: 400, msg: '缺少用户ID' };
        }
        
        try {
          const now = Date.now();
          
          // 查找所有未读的营养师消息
          const unreadRes = await interactionLogsCollection.where({
            user_id: actualUserId,
            sender_role: 'nutritionist',
            read_at: null
          }).get();
          
          // 批量更新为已读
          const updatePromises = unreadRes.data.map(log => 
            interactionLogsCollection.doc(log._id).update({
              read_at: now,
              updated_at: now
            })
          );
          
          await Promise.all(updatePromises);
          
          return { code: 0, data: { readAt: now, count: unreadRes.data.length } };
        } catch (err) {
          console.error('Mark interactions read error:', err);
          return { code: 500, msg: '标记已读失败: ' + err.message };
        }
      }

      // 【新增】获取营养师/管理员的客户消息（所有分配给该营养师的客户的未读消息）
      case 'getAdminClientMessages': {
        if (userRole !== 'admin' && userRole !== 'nutritionist') {
          return { code: 403, msg: '需要管理员或营养师权限' };
        }
        
        const { nutritionistId, limit = 50 } = payload;
        const actualNutritionistId = nutritionistId || userId;
        
        try {
          // 查找所有分配给该营养师的客户
          const clientsRes = await usersCollection.where({
            assigned_nutritionist_id: actualNutritionistId,
            role: 'client'
          }).get();
          
          const clients = clientsRes.data || [];
          const clientIds = clients.map(c => c._id);
          
          if (clientIds.length === 0) {
            return { code: 0, data: [] };
          }
          
          // 创建客户ID到姓名的映射
          const clientNameMap = {};
          clients.forEach(c => {
            clientNameMap[c._id] = c.username || c.nickname || '客户';
          });
          
          // 查询这些客户的所有消息
          const messagesRes = await interactionLogsCollection.where({
            user_id: db.command.in(clientIds)
          }).orderBy('created_at', 'desc').limit(limit).get();
          
          const messages = messagesRes.data.map(msg => ({
            _id: msg._id,
            user_id: msg.user_id,
            client_id: msg.user_id,
            client_name: clientNameMap[msg.user_id] || '客户',
            nutritionist_id: msg.nutritionist_id || '',
            nutritionist_name: msg.nutritionist_name || '营养顾问',
            sender_role: msg.sender_role || 'client',
            type: msg.type || 'app',
            content: msg.content || '',
            created_at: msg.created_at || Date.now(),
            read_at: msg.read_at || null
          }));
          
          return { code: 0, data: messages };
        } catch (err) {
          console.error('Get admin client messages error:', err);
          return { code: 500, msg: '获取客户消息失败: ' + err.message };
        }
      }

      // 【新增】营养师标记客户消息为已读
      case 'markClientMessageRead': {
        if (userRole !== 'admin' && userRole !== 'nutritionist') {
          return { code: 403, msg: '需要管理员或营养师权限' };
        }
        
        const { messageId, clientId } = payload;
        
        if (!messageId) {
          return { code: 400, msg: '缺少消息ID' };
        }
        
        try {
          const now = Date.now();
          
          await interactionLogsCollection.doc(messageId).update({
            read_at: now,
            updated_at: now
          });
          
          return { code: 0, data: { readAt: now } };
        } catch (err) {
          console.error('Mark client message read error:', err);
          return { code: 500, msg: '标记已读失败: ' + err.message };
        }
      }

      // ===== 直接发货订单 =====
      case 'createDirectShipOrder': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { clientId, items, trackingNo, trackingImage, trackingImageUrl } = payload;
        if (!clientId || !items || items.length === 0) return { code: 400, msg: '缺少客户ID或产品' };

        const clientRes = await usersCollection.doc(clientId).get();
        const client = clientRes.data[0] || {};

        const orderData = {
          order_no: generateOrderNo(),
          user_id: clientId,
          nutritionist_id: userId,
          items: items,
          status: 1, // 直接发货状态
          username: client.username || '未知客户',
          phone: client.phone || '',
          quantity: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
          tracking_no: trackingNo || '',
          tracking_image: trackingImage || '',
          tracking_image_url: trackingImageUrl || '',
          shipped_at: Date.now(),
          created_at: Date.now(),
          updated_at: Date.now()
        };

        const res = await ordersCollection.add(orderData);
        return {
          code: 0,
          msg: '发货订单创建成功',
          orderId: res.id,
          data: { orderId: res.id, order_no: orderData.order_no }
        };
      }

      case 'updateOrderLogistics': {
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        const { orderId, trackingNo, trackingImage, trackingImageUrl } = payload;
        if (!orderId) return { code: 400, msg: '缺少订单ID' };

        await ordersCollection.doc(orderId).update({
          tracking_no: trackingNo || '',
          tracking_image: trackingImage || '',
          tracking_image_url: trackingImageUrl || '',
          updated_at: Date.now()
        });
        return { code: 0, msg: '物流信息更新成功' };
      }

      case 'saveProtocol': {
        // 【权限控制】只有管理员可以创建/修改方案
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        
        const { clientId, protocolId, protocolData, deactivateOthers } = payload;

        if (!clientId || !protocolData) {
          return { code: 400, msg: '缺少必要参数' };
        }

        // 如果明确设置了 deactivateOthers=true，才停用其他方案
        if (deactivateOthers === true) {
          await protocolsCollection.where({ user_id: clientId }).update({ status: 'inactive' });
        }

        const protocolRecord = {
          user_id: clientId,
          name: protocolData.name || '健康方案',
          items: protocolData.items || [],
          status: 'active',
          created_at: Date.now(),
          updated_at: Date.now()
        };

        let result;
        if (protocolId) {
          // 更新现有方案
          await protocolsCollection.doc(protocolId).update({
            ...protocolRecord,
            updated_at: Date.now()
          });
          result = { protocolId, msg: '方案更新成功' };
        } else {
          // 创建新方案（默认与现有方案并存）
          const res = await protocolsCollection.add(protocolRecord);
          result = { protocolId: res.id, msg: '新方案创建成功' };
        }

        return { code: 0, ...result };
      }

      case 'stopProtocol': {
        // 【权限控制】只有管理员可以停止方案
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        
        // 停止指定方案（支持多方案管理）
        const { user_id, protocol_id } = payload;

        if (!user_id) {
          return { code: 400, msg: '缺少用户ID' };
        }

        console.log('stopProtocol - user_id:', user_id, 'protocol_id:', protocol_id);

        if (protocol_id) {
          // 停止指定方案
          let planRes = await plansCollection.doc(protocol_id).get();
          
          console.log('stopProtocol - 直接查询结果:', planRes.data.length, '条记录');
          
          // 【修复】如果直接用 ID 查询不到，可能是传入的是模板 ID，尝试按模板 ID 查询
          if (planRes.data.length === 0) {
            console.log('stopProtocol - 直接查询失败，尝试按模板ID查询:', protocol_id);
            planRes = await plansCollection.where({
              user_id: user_id,
              template_id: protocol_id,
              status: 'active'
            }).get();
            console.log('stopProtocol - 按模板ID查询结果:', planRes.data.length, '条记录');
          }
          
          // 【额外尝试】如果还是查不到，尝试不限制状态
          if (planRes.data.length === 0) {
            console.log('stopProtocol - 按模板ID查询失败，尝试不限制状态');
            planRes = await plansCollection.where({
              user_id: user_id,
              template_id: protocol_id
            }).get();
            console.log('stopProtocol - 不限制状态查询结果:', planRes.data.length, '条记录');
          }
          
          // 【最后尝试】如果仍然查不到，说明没有实际的每日计划记录，直接更新用户的 assigned_templates
          if (planRes.data.length === 0) {
            console.log('stopProtocol - 未找到每日计划记录，尝试直接更新 assigned_templates');
            try {
              const userRes = await usersCollection.doc(user_id).get();
              if (userRes.data.length > 0) {
                const user = userRes.data[0];
                const assigned_templates = (user.assigned_templates || []).map(item => {
                  const obj = typeof item === 'string' ? { id: item, status: 'active' } : item;
                  if (obj.id === protocol_id) {
                    return { ...obj, status: 'cancelled' };
                  }
                  return obj;
                });
                await usersCollection.doc(user_id).update({ 
                  assigned_templates,
                  updated_at: Date.now() 
                });
                console.log('✅ 直接更新 assigned_templates 成功');
                return { code: 0, ok: true, msg: '方案已停止' };
              }
            } catch (syncErr) {
              console.error('⚠️ 直接更新 assigned_templates 失败:', syncErr);
            }
            return { code: 404, msg: '方案不存在' };
          }

          // 如果找到多个计划，停止第一个活跃的
          const plan = planRes.data[0];

          // 更新方案状态为 cancelled
          await plansCollection.doc(plan._id).update({
            status: 'cancelled',
            is_active: false,
            stopped_at: Date.now(),
            updated_at: Date.now()
          });

          // 记录操作日志
          await interactionLogsCollection.add({
            user_id: user_id,
            nutritionist_id: userId,
            type: 'protocol_stopped',
            content: `营养顾问停止了方案：${plan.template_name || '未命名方案'}`,
            protocol_id: plan._id,
            created_at: Date.now()
          });

          console.log('stopProtocol - 方案已停止:', plan._id);

          // 【新增同步】同步状态到客户档案 (he_users)
          try {
            const userRes = await usersCollection.doc(user_id).get();
            if (userRes.data.length > 0) {
              const user = userRes.data[0];
              const assigned_templates = (user.assigned_templates || []).map(item => {
                const obj = typeof item === 'string' ? { id: item, status: 'active' } : item;
                if (obj.id === plan.template_id || obj.id === plan._id) {
                  return { ...obj, status: 'cancelled' };
                }
                return obj;
              });
              await usersCollection.doc(user_id).update({ 
                assigned_templates,
                updated_at: Date.now() 
              });
              console.log('✅ 同步停止状态到客户档案成功');
            }
          } catch (syncErr) {
            console.error('⚠️ 同步停止状态失败:', syncErr);
          }

          return { code: 0, ok: true, msg: '方案已停止' };
        } else {
          // 如果没有指定 protocol_id，停止所有活跃方案（向后兼容）
          const today = new Date().toISOString().split('T')[0];
          const activePlans = await plansCollection.where({
            user_id: user_id,
            date: today,
            status: 'active'
          }).get();

          for (const plan of activePlans.data) {
            await plansCollection.doc(plan._id).update({
              status: 'cancelled',
              is_active: false,
              stopped_at: Date.now(),
              updated_at: Date.now()
            });
          }

          // 【同步更新用户档案】
          const userRes = await usersCollection.doc(user_id).get();
          if (userRes.data.length > 0) {
            const uData = userRes.data[0];
            const activeTids = activePlans.data.map(p => p.template_id).filter(Boolean);
            const newAssignments = (uData.assigned_templates || []).map(item => {
              const obj = typeof item === 'string' ? { id: item, status: 'active' } : item;
              if (activeTids.includes(obj.id)) {
                return { ...obj, status: 'cancelled', stopped_at: Date.now() };
              }
              return obj;
            });
            await usersCollection.doc(user_id).update({
              assigned_templates: newAssignments,
              updated_at: Date.now()
            });
            console.log('✅ 批量停止方案状态已同步到用户档案');
          }

          console.log('stopProtocol - 已停止所有今日方案:', activePlans.data.length);
          return { code: 0, ok: true, msg: `已停止 ${activePlans.data.length} 个方案` };
        }
      }

      case 'resumeProtocol': {
        // 【权限控制】只有管理员可以恢复方案
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        
        // 恢复指定方案（支持多方案管理）
        const { user_id, protocol_id } = payload;

        if (!user_id) {
          return { code: 400, msg: '缺少用户ID' };
        }

        console.log('resumeProtocol - user_id:', user_id, 'protocol_id:', protocol_id);

        if (protocol_id) {
          // 恢复指定方案
          const planRes = await plansCollection.doc(protocol_id).get();
          if (planRes.data.length === 0) {
            return { code: 404, msg: '方案不存在' };
          }

          const plan = planRes.data[0];

          // 验证方案属于该用户
          if (plan.user_id !== user_id) {
            return { code: 403, msg: '无权操作该方案' };
          }

          // 更新方案状态为 active
          await plansCollection.doc(protocol_id).update({
            status: 'active',
            is_active: true,
            resumed_at: Date.now(),
            updated_at: Date.now()
          });

          // 记录操作日志
          await interactionLogsCollection.add({
            user_id: user_id,
            nutritionist_id: userId,
            type: 'system',
            content: `顾问恢复了方案"${plan.template_name || '未命名方案'}"的执行`,
            protocol_id: protocol_id,
            created_at: Date.now()
          });

          console.log('resumeProtocol - 方案已恢复:', protocol_id);

          // 【新增同步】同步状态到客户档案 (he_users)
          try {
            const userRes = await usersCollection.doc(user_id).get();
            if (userRes.data.length > 0) {
              const user = userRes.data[0];
              const assigned_templates = (user.assigned_templates || []).map(item => {
                const obj = typeof item === 'string' ? { id: item, status: 'active' } : item;
                if (obj.id === plan.template_id || obj.id === protocol_id) {
                  return { ...obj, status: 'active' };
                }
                return obj;
              });
              await usersCollection.doc(user_id).update({ 
                assigned_templates,
                updated_at: Date.now() 
              });
              console.log('✅ 同步恢复状态到客户档案成功');
            }
          } catch (syncErr) {
            console.error('⚠️ 同步恢复状态失败:', syncErr);
          }

          return { code: 0, ok: true, msg: '方案已恢复' };
        } else {
          return { code: 400, msg: '缺少方案ID' };
        }
      }

      case 'deleteProtocol': {
        // 【权限控制】只有管理员可以删除方案
        if (userRole !== 'admin') return { code: 403, msg: '需要管理员权限' };
        
        // 删除指定方案（支持多方案管理）
        const { user_id, protocol_id } = payload;

        if (!user_id || !protocol_id) {
          return { code: 400, msg: '缺少用户ID或方案ID' };
        }

        console.log('deleteProtocol - user_id:', user_id, 'protocol_id:', protocol_id);

        // 1. 获取方案信息（用于日志）
        const planRes = await plansCollection.doc(protocol_id).get();
        if (planRes.data.length === 0) {
          return { code: 404, msg: '方案不存在' };
        }
        const plan = planRes.data[0];

        // 2. 从用户档案中移除该方案 ID（核心修复：防止僵尸数据）
        const userRes = await usersCollection.doc(user_id).get();
        if (userRes.data.length > 0) {
          const user = userRes.data[0];
          // 【优化删除】支持对象形式的分配记录过滤
          const assigned_templates = (user.assigned_templates || []).filter(item => {
            const tid = typeof item === 'string' ? item : item.id;
            return String(tid) !== String(protocol_id);
          });
          
          const updateData = {
            assigned_templates,
            updated_at: Date.now()
          };
          
          // 如果旧版单数方案字段匹配，也一并重置
          if (String(user.assigned_template) === String(protocol_id)) {
            updateData.assigned_template = '';
          }
          
          await usersCollection.doc(user_id).update(updateData);
        }

        // 3. 永久删除方案执行记录
        await plansCollection.doc(protocol_id).remove();

        // 4. 记录操作日志
        await interactionLogsCollection.add({
          user_id: user_id,
          nutritionist_id: userId,
          type: 'system',
          content: `顾问永久删除了方案"${plan.template_name || '未命名方案'}"`,
          protocol_id: protocol_id,
          created_at: Date.now()
        });

        return { code: 0, ok: true, msg: '方案已从客户档案中永久移除' };
      }

      // 【新增】添加客户沟通记录（营养师发送消息）
      case 'addClientLog': {
        if (userRole !== 'admin' && userRole !== 'nutritionist') {
          return { code: 403, msg: '需要管理员或营养师权限' };
        }
        
        const { clientId, nutritionistId, nutritionistName, content, type = 'wechat', followUpStatus } = payload;
        
        if (!clientId || !content || !content.trim()) {
          return { code: 400, msg: '缺少客户ID或消息内容' };
        }
        
        try {
          const now = Date.now();
          const logData = {
            user_id: clientId,
            client_id: clientId,
            nutritionist_id: nutritionistId || userId || '',
            nutritionist_name: nutritionistName || '营养顾问',
            sender_role: 'nutritionist',
            type: type || 'wechat',
            content: content.trim(),
            follow_up_status: followUpStatus || '待回复',
            created_at: now,
            updated_at: now
          };
          
          const addRes = await interactionLogsCollection.add(logData);
          
            if (addRes.id || addRes._id) {
              // 【关键修复】同步发送通知给小程序，确保客户能收到消息
              try {
                await notificationsCollection.add({
                  user_id: clientId,
                  title: '收到顾问留言',
                  content: content.trim(),
                  type: 'message',
                  status: 'unread',
                  sender_name: nutritionistName || '营养顾问',
                  created_at: now,
                  updated_at: now
                });
                console.log(`🔔 已向客户 ${clientId} 发送留言通知`);
              } catch (e) {
                console.error('Failed to send notification:', e);
              }

              // 【可选】更新客户的跟进状态
              if (followUpStatus) {
              try {
                await usersCollection.doc(clientId).update({
                  follow_up_status: followUpStatus,
                  last_interaction_at: now,
                  updated_at: now
                });
              } catch (e) {
                console.log('Update client follow up status failed:', e);
                // 不影响主流程
              }
            }
            
            return {
              code: 0,
              data: {
                _id: addRes.id || addRes._id,
                ...logData
              }
            };
          }
          
          return { code: 500, msg: '添加沟通记录失败' };
        } catch (err) {
          console.error('Add client log error:', err);
          return { code: 500, msg: '添加沟通记录失败: ' + err.message };
        }
      }

      case 'exportClientData': {
        const { format = 'csv', clientIds } = payload;

        try {
          // 获取客户列表
          let query = usersCollection.where({
            role: 'client'
          });

          // 如果指定了特定客户ID，则只导出这些
          if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
            query = usersCollection.where({
              _id: db.command.in(clientIds)
            });
          }

          const clientsRes = await query.get();
          const clients = clientsRes.data || [];

          if (clients.length === 0) {
            return { code: 404, msg: '没有找到可导出的客户数据' };
          }

          // 准备导出数据
          const exportData = clients.map(client => ({
            id: client._id,
            name: client.username || '',
            phone: client.phone || '',
            gender: client.gender || '',
            age: client.age || '',
            wrom_score: client.wrom_score || 0,
            rps_score: client.rps_score || 0,
            streak_days: client.streak_days || 0,
            last_checkin: client.last_checkin_date || '',
            created_at: client.created_at ? new Date(client.created_at).toISOString() : '',
            updated_at: client.updated_at ? new Date(client.updated_at).toISOString() : ''
          }));

          if (format === 'json') {
            // 返回JSON格式
            return {
              code: 0,
              data: {
                format: 'json',
                count: exportData.length,
                content: exportData
              }
            };
          } else {
            // 生成CSV格式
            const headers = ['ID', '姓名', '手机号', '性别', '年龄', 'WROM评分', 'RPS评分', '连续打卡', '最后打卡', '创建时间', '更新时间'];
            const rows = exportData.map(client => [
              client.id,
              client.name,
              client.phone,
              client.gender,
              client.age,
              client.wrom_score,
              client.rps_score,
              client.streak_days,
              client.last_checkin,
              client.created_at,
              client.updated_at
            ]);

            // 生成CSV内容
            const csvContent = [
              headers.join(','),
              ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            return {
              code: 0,
              data: {
                format: 'csv',
                count: exportData.length,
                filename: `clients_export_${new Date().toISOString().split('T')[0]}.csv`,
                content: csvContent
              }
            };
          }
        } catch (err) {
          console.error('Export client data error:', err);
          return { code: 500, msg: '导出失败: ' + err.message };
        }
      }

      default:
        return { code: 400, msg: '未知操作: ' + action };
    }
  } catch (err) {
    console.error('Error:', err);
    return { code: 500, msg: '服务器错误: ' + (err.message || '未知') };
  }
};

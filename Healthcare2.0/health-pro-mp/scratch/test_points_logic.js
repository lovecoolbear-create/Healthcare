// Mock variables and functions matching client-api
const WATER_TARGET = 1.5;

function getLocalDateStr(date = new Date()) {
  const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const year = utc8Date.getUTCFullYear();
  const month = String(utc8Date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc8Date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const db = {
  command: {
    in: (arr) => arr
  }
};

const usersCollection = {
  doc: (id) => ({
    get: async () => ({
      data: [{
        _id: id,
        username: 'TestUser',
        points: 0,
        streak_days: 0,
        last_stats_update: 0
      }]
    }),
    update: async (data) => {
      console.log('DB Update called with:', data);
      return { ok: true };
    }
  })
};

// Mock plan records for the last 7 days
// Suppose today is Day 6 (index 6).
// We want to test a scenario where:
// - Today (Day 6): base points = 10 (perfect check-in, including metrics)
// - Yesterday (Day 5): base points = 8 (completed tasks, water, symptoms; missing metrics). This should round to 10 points.
// - Day 4: no progress.
// - Other days: no progress.
// We expect:
// - Yesterday (Day 5) progress: true. basePoints = 8. Rounded to 10.
// - Today (Day 6) progress: true. basePoints = 10.
// - Streak before today: Yesterday was active, so streak before today = 1.
// - Today's basePoints = 10, but streak before today = 1 (< 2), so today's streakBonus = 0.
// - Total points = 10 (today) + 10 (yesterday rounded) = 20.
// - Active days in 7 days (loopStreak): Today (1) + Yesterday (1) = 2.
// - Since loopStreak >= 2, we add loop streak bonus = min(2 * 2, 12) = 4.
// - So total points should be 20 + 4 = 24!
// - Consecutive streak: Today is active, yesterday is active, day 4 is inactive. So consecutive streak = 2.

const mockPlans = [
  // Yesterday
  {
    date: getLocalDateStr(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
    water_intake: 1.5,
    tasks: [
      { product_name: 'Vitamin A', completed: true },
      { product_name: 'Vitamin B', completed: true }
    ],
    symptoms: [
      { name: 'Symptom A', value: 5 }
    ]
  },
  // Today
  {
    date: getLocalDateStr(new Date()),
    water_intake: 1.5,
    tasks: [
      { product_name: 'Vitamin A', completed: true },
      { product_name: 'Vitamin B', completed: true }
    ],
    symptoms: [
      { name: 'Symptom A', value: 5 }
    ]
  }
];

const plansCollection = {
  where: () => ({
    get: async () => ({
      data: mockPlans
    })
  })
};

// Today's metrics logged
const healthLogsCollection = {
  where: () => ({
    get: async () => ({
      data: [
        { type: 'weight', value: 70 }
      ]
    })
  })
};

// Replicate the exact calculateAndUpdateUserStats logic we implemented:
const calculateAndUpdateUserStats = async (userId, forceUpdate = false) => {
  try {
    const now = Date.now();
    const todayStr = getLocalDateStr();

    // 1. 获取用户当前数据（检查是否需要更新）
    const userRes = await usersCollection.doc(userId).get();
    if (!userRes.data || userRes.data.length === 0) {
      console.log('❌ calculateAndUpdateUserStats - 用户不存在:', userId);
      return null;
    }

    const user = userRes.data[0];
    const lastStatsUpdate = user.last_stats_update || 0;

    // 如果今天已经更新过且不是强制更新，直接返回现有值
    if (!forceUpdate && lastStatsUpdate >= new Date(todayStr).getTime()) {
      console.log(`⏭️ calculateAndUpdateUserStats - 今日已更新过 (${new Date(lastStatsUpdate).toLocaleString()})`);
      return {
        points: user.points || 0,
        streak_days: user.streak_days || 0,
        dailyResults: user.daily_results || [],
        cached: true
      };
    }

    console.log(`🔄 calculateAndUpdateUserStats - 开始计算用户 ${user.username || userId} 的统计数据(7天模式)...`);

    // 2. 生成最近7天的日期列表（从小到大，按顺序）
    const dates = [];
    const todayObj = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayObj);
      d.setDate(d.getDate() - i);
      dates.push(getLocalDateStr(d));
    }

    // 3. 获取这7天的所有计划记录
    const plansRes = await plansCollection.where({
      user_id: userId,
      date: db.command.in(dates)
    }).get();

    // 按日期分组计划
    const plansByDate = {};
    dates.forEach(d => {
      plansByDate[d] = [];
    });
    plansRes.data.forEach(plan => {
      if (plansByDate[plan.date]) {
        plansByDate[plan.date].push(plan);
      }
    });

    // 4. 获取今天的健康指标记录
    const metricsRes = await healthLogsCollection.where({
      user_id: userId,
      date: todayStr
    }).get();
    const todayHasMetrics = metricsRes.data.length > 0;

    // 5. 循环计算每日的打卡进度和得分情况
    const dailyProgress = {};
    const dailyBasePoints = {};

    for (const d of dates) {
      const dayPlans = plansByDate[d] || [];
      const allTasks = dayPlans.flatMap(p => p.tasks || []);
      const tasksCompleted = allTasks.length > 0 && allTasks.every(t => t.completed);
      
      const waterIntake = dayPlans.length > 0 ? (dayPlans[0].water_intake || 0) : 0;
      const waterDone = waterIntake >= WATER_TARGET;

      const symptoms = dayPlans.length > 0 ? (dayPlans[0].symptoms || []) : [];
      const hasSymptoms = symptoms.length > 0 && symptoms.some(s => s.value > 0);

      const hasRealProgress = tasksCompleted || waterDone || hasSymptoms;
      dailyProgress[d] = hasRealProgress;

      let basePoints = 0;
      if (waterDone) basePoints += 1;
      if (tasksCompleted) basePoints += 5;
      if (hasSymptoms) basePoints += 2;
      if (d === todayStr && todayHasMetrics) basePoints += 2;

      dailyBasePoints[d] = basePoints;
    }

    // 6. 计算连续天数 (currentStreak)
    // 逻辑：如果今天有打卡行为（今日积分 > 0），则从今日起算；然后从昨日往前倒推，遇到没有进度的日期就中断
    let currentStreak = 0;
    const todayActive = dailyBasePoints[todayStr] > 0;
    if (todayActive) {
      currentStreak = 1;
      for (let i = 5; i >= 0; i--) {
        const d = dates[i];
        if (dailyProgress[d]) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      currentStreak = 0;
    }

    // 7. 计算累计得分
    let totalPoints = 0;
    // 过去6天得分：如果这天有真实进度，计算 basePoints 并应用 >=8 分则为 10 分的 rounding 规则
    for (let i = 0; i < 6; i++) {
      const d = dates[i];
      if (dailyProgress[d]) {
        const dayPoints = dailyBasePoints[d];
        totalPoints += (dayPoints >= 8) ? 10 : dayPoints;
      }
    }

    // 今日得分：如果是全勤(10分)，且除去今日的连续天数 >= 2，则增加连续打卡全勤奖励
    const todayBase = dailyBasePoints[todayStr];
    let todayStreakBonus = 0;
    if (todayBase === 10) {
      const streakDaysBeforeToday = Math.max(0, currentStreak - 1);
      if (streakDaysBeforeToday >= 2) {
        todayStreakBonus = Math.min((streakDaysBeforeToday - 1) * 2, 12);
      }
    }
    totalPoints += todayBase + todayStreakBonus;

    // 加上 loop 内部的总 active 连续性奖励（不管连不连续，只要这7天内 active 达到特定次数就加）
    // 小程序：if (streak >= 2) total += Math.min(streak * 2, 12);
    // 其中 streak 是指这7天内 (今日 + 过去有进度的天数)
    let loopStreak = 0;
    dates.forEach(d => {
      if (d === todayStr) {
        loopStreak++; // 今日无条件递增（与小程序完全一致）
      } else if (dailyProgress[d]) {
        loopStreak++;
      }
    });

    if (loopStreak >= 2) {
      totalPoints += Math.min(loopStreak * 2, 12);
    }

    const dailyResults = dates.map(d => {
      const isToday = d === todayStr;
      const bp = dailyBasePoints[d];
      let streakBonus = 0;
      if (isToday && bp === 10) {
        const sDays = Math.max(0, currentStreak - 1);
        if (sDays >= 2) streakBonus = Math.min((sDays - 1) * 2, 12);
      }
      const dayPlans = plansByDate[d] || [];
      const waterVal = dayPlans.length > 0 ? (dayPlans[0].water_intake || 0) : 0;
      return {
        date: d,
        points: isToday ? (bp + streakBonus) : ((bp >= 8) ? 10 : bp),
        isPerfect: bp === 10,
        breakdown: {
          water: (waterVal >= WATER_TARGET) ? 1 : 0,
          plan: (dayPlans.length > 0 && dayPlans.flatMap(p => p.tasks || []).length > 0 && dayPlans.flatMap(p => p.tasks || []).every(t => t.completed)) ? 5 : 0,
          metrics: isToday && todayHasMetrics ? 2 : 0,
          symptoms: (dayPlans.length > 0 && (dayPlans[0].symptoms || []).some(s => s.value > 0)) ? 2 : 0,
          streakBonus
        }
      };
    });

    // 8. 更新数据库
    await usersCollection.doc(userId).update({
      points: totalPoints,
      streak_days: currentStreak,
      last_stats_update: now,
      last_points_calc: now,
      updated_at: now
    });

    console.log(`✅ calculateAndUpdateUserStats 完成 (7天模式):`);
    console.log(`   - 用户 ID: ${userId}`);
    console.log(`   - 最终总积分: ${totalPoints}`);
    console.log(`   - 连续打卡天数: ${currentStreak}天`);

    return {
      points: totalPoints,
      streak_days: currentStreak,
      dailyResults: dailyResults.reverse(), // 保持与原本接口返回的倒序一致
      updated_at: now,
      cached: false
    };
  } catch (e) {
    console.error('❌ calculateAndUpdateUserStats 错误:', e);
    return null;
  }
};

(async () => {
  const result = await calculateAndUpdateUserStats('test-user-1', true);
  console.log('Return Result:', JSON.stringify(result, null, 2));
})();

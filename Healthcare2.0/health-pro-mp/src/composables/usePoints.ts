/**
 * 积分计算逻辑
 * 从 home/index.vue 中提取的纯业务逻辑
 */
import { ref, computed, watch } from 'vue';
import { POINTS } from '@/config/constants';
import logger from '@/utils/logger';
import type { PointsResult, PointsDebugInfo, PlanItem, MetricItem, SymptomItem, UserInfo } from '@/types';

export function usePoints(
  waterIntake: { value: number },
  planData: { value: Record<string, PlanItem[]> },
  protocolsData: { value: any[] },
  metrics: { value: MetricItem[] },
  symptoms: { value: SymptomItem[] },
  userInfo: { value: UserInfo }
) {
  /**
   * 计算今日积分
   * 饮水1分 + 打卡5分 + 指标2分 + 体感2分 = 10分基础分/天
   * 连续打卡全勤奖励：第2天起+2分，每日+2分递增，第7天起封顶+12分
   */
  const calculateTodayPoints = (): PointsResult => {
    let basePoints = 0;
    const debug = {} as PointsDebugInfo;

    // 1. 饮水板块 (1分)
    const waterCompleted = waterIntake.value >= POINTS.WATER_TARGET;
    debug.water = { current: waterIntake.value, target: POINTS.WATER_TARGET, completed: waterCompleted };
    if (waterCompleted) basePoints += 1;

    // 2. 打卡板块 (5分)
    let allTasks: PlanItem[] = [];
    const planTasks = Object.values(planData.value).flat();

    if (planTasks.length === 0 && protocolsData.value.length > 0) {
      protocolsData.value.forEach((p: any) => {
        Object.values(p.tasks || {}).forEach((slotTasks: any) => {
          allTasks = allTasks.concat(slotTasks || []);
        });
      });
    } else {
      allTasks = planTasks;
    }

    const hasTasks = allTasks.length > 0;
    const allTasksCompleted = hasTasks && allTasks.every(t => t.completed);
    debug.plan = {
      taskCount: allTasks.length,
      hasTasks,
      source: planTasks.length > 0 ? 'planData' : (protocolsData.value.length > 0 ? 'protocolsData' : 'none'),
      completedList: allTasks.map(t => ({ id: t.id, name: t.name || t.task_name, completed: t.completed })),
      allTasksCompleted
    };
    if (allTasksCompleted) basePoints += 5;

    // 3. 健康指标板块 (2分)
    const hasMetrics = metrics.value.some(m => {
      const v = m.value;
      return v !== '' && v !== undefined && v !== null && v !== 0 && String(v).trim() !== '';
    });
    debug.metrics = { list: metrics.value.map(m => ({ label: m.label, value: m.value, type: typeof m.value })), hasMetrics };
    if (hasMetrics) basePoints += 2;

    // 4. 体感反馈板块 (2分)
    const hasSymptoms = symptoms.value.some(s => {
      const v = s.value;
      return v !== undefined && v !== null && v !== 0;
    });
    debug.symptoms = { list: symptoms.value.map(s => ({ label: s.label, value: s.value })), hasSymptoms };
    if (hasSymptoms) basePoints += 2;

    // 5. 连续打卡全勤奖励
    let streakBonus = 0;
    if (basePoints === POINTS.MAX_DAILY_POINTS) {
      const streakDays = userInfo.value.streak_days || 0;
      if (streakDays >= POINTS.STREAK_START_DAY) {
        streakBonus = Math.min((streakDays - 1) * 2, POINTS.STREAK_BONUS_MAX);
      }
    }

    // 调试日志
    logger.group('📊 积分计算详情', () => {
      logger.debug(`💧 饮水: ${waterCompleted ? '+1分' : '0分'} (${waterIntake.value}L ${waterCompleted ? '≥' : '<'} ${POINTS.WATER_TARGET}L)`);
      logger.debug(`📋 健康计划: ${allTasksCompleted ? '+5分 (全部完成)' : `0分 (共${allTasks.length}任务)`}`);
      logger.debug(`📊 健康指标: ${hasMetrics ? '+2分' : '0分'}`);
      logger.debug(`💬 体感反馈: ${hasSymptoms ? '+2分' : '0分'}`);
      logger.debug(`🏆 基础分: ${basePoints}/${POINTS.MAX_DAILY_POINTS} | 连续奖励: +${streakBonus} | 总计: ${basePoints + streakBonus}分`);
    });

    return {
      total: basePoints + streakBonus,
      base: basePoints,
      streakBonus,
      isPerfect: basePoints === POINTS.MAX_DAILY_POINTS,
      _debug: debug
    };
  };

  // 本地计算的总积分（实时响应，不依赖云函数）
  const localTotalPoints = computed(() => {
    const todayResult = calculateTodayPoints();
    const serverPoints = userInfo.value.points || 0;
    return Math.max(todayResult.total, serverPoints);
  });

  // 本地计算的坚持天数
  const localStreakDays = computed(() => {
    const serverStreak = userInfo.value.streak_days || 0;
    if (serverStreak > 0) return serverStreak;

    const todayResult = calculateTodayPoints();
    if (todayResult.isPerfect) return 1;
    return 0;
  });

  // 自动同步本地积分到 userInfo
  watch([waterIntake, planData, metrics, symptoms], () => {
    const todayResult = calculateTodayPoints();

    if ((userInfo.value.points || 0) === 0 && todayResult.total > 0) {
      userInfo.value.points = todayResult.total;
      logger.info(`本地积分计算: ${todayResult.total}分 (基础${todayResult.base} + 奖励${todayResult.streakBonus})`);
    }

    if ((userInfo.value.streak_days || 0) === 0 && todayResult.isPerfect) {
      userInfo.value.streak_days = 1;
      logger.info('本地连续天数: 1天 (今日全勤)');
    }
  }, { deep: true, immediate: true });

  return {
    calculateTodayPoints,
    localTotalPoints,
    localStreakDays
  };
}

export default usePoints;

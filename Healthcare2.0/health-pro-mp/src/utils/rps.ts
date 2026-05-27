type RpsKey = 'cancel_rate' | 'receipt_delay' | 'cycle' | 'effect';
type WromKey = 'adherence' | 'inventory' | 'symptom' | 'engagement';

export type RpsBreakdown = Partial<Record<RpsKey, number>>;
export type WromBreakdown = Partial<Record<WromKey, number>>;

type BaseScoreCardItem = {
  label: string;
  max: number;
  score: number;
  percent: number;
  levelText: string;
  levelClass: string;
  barClass: string;
  isPrimary: boolean;
  suggestion: string;
};

export type RpsCardItem = {
  key: RpsKey;
} & BaseScoreCardItem;

export type WromCardItem = {
  key: WromKey;
} & BaseScoreCardItem;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getScore = (value: unknown, max: number) => clamp(Number(value || 0), 0, max);

const getLevelInfo = (percent: number) => {
  if (percent >= 80) {
    return { levelText: '稳定', levelClass: 'bg-emerald-100 text-emerald-600', barClass: 'bg-emerald-500' };
  }
  if (percent >= 50) {
    return { levelText: '可优化', levelClass: 'bg-amber-100 text-amber-600', barClass: 'bg-amber-500' };
  }
  return { levelText: '需跟进', levelClass: 'bg-rose-100 text-rose-600', barClass: 'bg-rose-500' };
};

export const buildRpsBreakdownItems = (breakdown: RpsBreakdown): RpsCardItem[] => {
  const items = [
    {
      key: 'cancel_rate' as const,
      label: '取消率',
      max: 30,
      score: getScore(breakdown?.cancel_rate, 30),
      suggestion: '优先处理取消订单根因，先排查库存响应和沟通时效，再推进复购。'
    },
    {
      key: 'receipt_delay' as const,
      label: '收货时延',
      max: 25,
      score: getScore(breakdown?.receipt_delay, 25),
      suggestion: '跟进发货后签收与确认链路，优先压缩超时确认订单。'
    },
    {
      key: 'cycle' as const,
      label: '周期',
      max: 30,
      score: getScore(breakdown?.cycle, 30),
      suggestion: '复购周期偏离时提前触达，围绕库存覆盖天数设置补货提醒。'
    },
    {
      key: 'effect' as const,
      label: '效果',
      max: 15,
      score: getScore(breakdown?.effect, 15),
      suggestion: '围绕体感改善与执行反馈持续复盘，让客户感知到阶段性效果。'
    }
  ];

  const normalized = items.map((item) => {
    const percent = clamp(Math.round((item.score / item.max) * 100), 0, 100);
    return { ...item, percent, ...getLevelInfo(percent) };
  });

  const sorted = [...normalized].sort((a, b) => (a.percent - b.percent) || (a.score - b.score));
  const primaryKey = sorted[0]?.key || '';

  return normalized.map((item) => ({
    ...item,
    isPrimary: item.key === primaryKey
  }));
};

export const buildWromBreakdownItems = (breakdown: WromBreakdown): WromCardItem[] => {
  const items = [
    {
      key: 'adherence' as const,
      label: '依从',
      max: 40,
      score: getScore(breakdown?.adherence, 40),
      suggestion: '聚焦每日任务完成率，优先修复执行断点。'
    },
    {
      key: 'inventory' as const,
      label: '库存',
      max: 30,
      score: getScore(breakdown?.inventory, 30),
      suggestion: '维持合理覆盖天数，避免缺货或过量囤积。'
    },
    {
      key: 'symptom' as const,
      label: '体感',
      max: 20,
      score: getScore(breakdown?.symptom, 20),
      suggestion: '围绕不适反馈做计划微调，降低执行阻力。'
    },
    {
      key: 'engagement' as const,
      label: '参与',
      max: 10,
      score: getScore(breakdown?.engagement, 10),
      suggestion: '保持基础记录频率，确保健康过程可追踪。'
    }
  ];
  return items.map((item) => {
    const percent = clamp(Math.round((item.score / item.max) * 100), 0, 100);
    return { ...item, percent, ...getLevelInfo(percent), isPrimary: false };
  });
};

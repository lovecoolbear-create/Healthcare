import { ClientInventory } from './types';

/**
 * 计算剩余服用天数
 * 剩余天数 = 当前库存 / (每次服用量 * 每天频次)
 */
export function calculateRemainingDays(inventory: ClientInventory): number {
  const dailyDosage = inventory.dosage_per_time * inventory.frequency_per_day;
  if (dailyDosage <= 0) return 0;
  return Math.floor(inventory.current_stock / dailyDosage);
}

/**
 * 判断是否需要补货提醒
 */
export function shouldAlert(inventory: ClientInventory): boolean {
  const remainingDays = calculateRemainingDays(inventory);
  return remainingDays <= inventory.alert_threshold_days;
}

/**
 * 计算预警日期
 */
export function getAlertDate(inventory: ClientInventory): Date {
  const remainingDays = calculateRemainingDays(inventory);
  const date = new Date(inventory.updated_at);
  date.setDate(date.getDate() + remainingDays);
  return date;
}

/**
 * 模拟打卡后的库存更新
 * 返回更新后的库存数值
 */
export function simulateCheckin(currentStock: number, dosage: number): number {
  return Math.max(0, currentStock - dosage);
}

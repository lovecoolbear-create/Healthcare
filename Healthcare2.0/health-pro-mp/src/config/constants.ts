/**
 * 全局常量配置
 * 集中管理所有魔法数字、字符串和配置项
 */

// ==================== 积分系统 ====================
export const POINTS = {
  WATER_TARGET: 1.5,              // 饮水目标(L)
  WATER_GLASS_SIZE: 0.25,         // 每杯水量(L)
  WATER_DEFAULT_GLASSES: 8,       // 默认目标杯数
  MAX_DAILY_POINTS: 10,           // 每日基础满分
  STREAK_BONUS_MAX: 12,           // 连续打卡奖励上限(第7天起)
  STREAK_START_DAY: 2,            // 从第几天开始有连续奖励
} as const;

// ==================== 打卡时段 ====================
export const TIME_SLOTS = {
  morning: '早',       // 早餐
  noon: '中',          // 午餐
  evening: '晚',        // 晚餐
  bedtime: '睡',        // 睡前
} as const;

// 时段映射（英文→中文）
export const SLOT_MAP: Record<string, string> = {
  morning: TIME_SLOTS.morning,
  noon: TIME_SLOTS.noon,
  lunch: TIME_SLOTS.noon,
  afternoon: TIME_SLOTS.noon,
 午: TIME_SLOTS.noon,
  dinner: TIME_SLOTS.evening,
  evening: TIME_SLOTS.evening,
  bedtime: TIME_SLOTS.bedtime,
};

// ==================== 体感反馈选项 ====================
export const SYMPTOM_OPTIONS = {
  BAD: { value: 2, label: '差', emoji: '😫', color: 'rose' },
  OK: { value: 5, label: '还可以', emoji: '😐', color: 'amber' },
  GOOD: { value: 8, label: '很好', emoji: '😃', color: 'emerald' },
} as const;

// ==================== API 配置 ====================
export const API_CONFIG = {
  CLOUD_FUNCTION_NAME: 'client-api',
  MAX_RETRY: 2,                    // 最大重试次数
  RETRY_DELAY_MS: 500,             // 重试间隔(ms)
  CACHE_TTL_MS: 5 * 60 * 1000,    // 数据缓存5分钟
} as const;

// ==================== UI 配置 ====================
export const UI = {
  TOAST_DURATION: 2000,            // Toast显示时长(ms)
  DEBOUNCE_SAVE_MS: 800,           // 防抖保存延迟(ms)
  SYNC_DEBOUNCE_MS: 1000,          // 同步防抖延迟(ms)
  DATE_CHECK_INTERVAL: 60000,      // 日期检查间隔(ms)
  ACHIEVEMENT_POPUP_DELAY: 1500,   // 成就弹窗延迟(ms)
} as const;

// ==================== 角色权限 ====================
export const ROLES = {
  ADMIN: 'admin',
  CONSULTANT: 'consultant',
  NUTRITIONIST: 'nutritionist',
  CLIENT: 'client',
} as const;

// 允许访问管理后台的角色
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.CONSULTANT, ROLES.NUTRITIONIST];

// ==================== 库存预警 ====================
export const INVENTORY = {
  DEFAULT_LOW_THRESHOLD: 5,        // 默认低库存阈值
  ALERT_BADGE_MAX: 99,             // 徽章最大显示数
} as const;

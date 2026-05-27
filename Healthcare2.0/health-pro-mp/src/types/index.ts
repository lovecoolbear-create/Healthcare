/**
 * 核心类型定义
 * 替代代码中的 any 类型，提供完整的类型安全
 */

// ==================== 用户相关 ====================
export interface UserInfo {
  _id?: string;
  username?: string;
  avatar?: string;
  age?: number;
  gender?: string;
  height?: number;
  weight?: number;
  points?: number;
  streak_days?: number;
  last_streak_date?: string;
  last_stats_update?: number;
  daily_results?: DailyResult[];
  role?: string;
}

// ==================== 每日结果 ====================
export interface DailyResult {
  date: string;        // YYYY-MM-DD
  isPerfect: boolean;  // 是否满分
  points: number;      // 当日积分
  basePoints?: number; // 基础分
  streakBonus?: number;// 连续奖励
}

// ==================== 健康计划 ====================
export interface PlanItem {
  id?: string;
  name?: string;
  task_name?: string;
  instruction?: string;
  slot?: string;
  completed?: boolean;
  template_id?: string;
  template_name?: string;
  product_id?: string;
  product_name?: string;
}

export interface ProtocolData {
  id?: string;
  name: string;
  tasks: Record<string, PlanItem[]>;
  totalTasks: number;
  completedTasks: number;
  items?: ProtocolItem[];
}

export interface ProtocolItem {
  product_id: string;
  product_name: string;
  stock: number;
  low_stock_threshold: number;
  name?: string;
}

// ==================== 健康指标 ====================
export interface MetricItem {
  label: string;
  value: string | number;
  unit: string;
  icon: string;
  type: MetricType;
}

export type MetricType = 
  | 'body_fat'
  | 'lipids'
  | 'visceral_fat'
  | 'weight'
  | 'glucose'
  | 'bmi';

// ==================== 体感反馈 ====================
export interface SymptomItem {
  key: string;
  label: string;
  value: number;
}

// ==================== 积分计算 ====================
export interface PointsResult {
  total: number;
  base: number;
  streakBonus: number;
  isPerfect: boolean;
  _debug?: PointsDebugInfo;
}

export interface PointsDebugInfo {
  water: WaterDebug;
  plan: PlanDebug;
  metrics: MetricsDebug;
  symptoms: SymptomsDebug;
}

export interface WaterDebug {
  current: number;
  target: number;
  completed: boolean;
}

export interface PlanDebug {
  taskCount: number;
  hasTasks: boolean;
  source: string;
  completedList: Array<{ id?: string; name?: string; task_name?: string; completed?: boolean }>;
  allTasksCompleted: boolean;
}

export interface MetricsDebug {
  list: Array<{ label: string; value: string | number; type?: string }>;
  hasMetrics: boolean;
}

export interface SymptomsDebug {
  list: Array<{ label: string; value: number }>;
  hasSymptoms: boolean;
}

// ==================== 7天打卡数据 ====================
export interface WeeklyDayData {
  date: string;
  dayOfMonth: number;
  weekDay: string;
  completed: boolean;
  points: number;
  isToday: boolean;
  isFuture: boolean;
}

// ==================== 库存相关 ====================
export interface InventoryItem {
  _id?: string;
  product_id: string;
  product_name?: string;
  name?: string;
  stock: number;
  low_stock_threshold?: number;
  unit?: string;
  image_url?: string;
}

// ==================== API 通用 ====================
export interface ApiResponse<T = any> {
  code: number;
  msg?: string;
  data: T;
}

export interface ApiPayload {
  userId?: string;
  token?: string;
  [key: string]: any;
}

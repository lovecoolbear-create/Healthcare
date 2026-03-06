export interface Practitioner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  wechat_id?: string;
  custom_tags?: string[];
  created_at: string;
}

export type MetricType = 
  | 'weight' | 'body_fat' | 'waist' 
  | 'blood_sugar' | 'blood_lipids' | 'uric_acid' 
  | 'blood_pressure' | 'sleep_duration' | 'water_intake';

export interface MarketingAsset {
  id: string;
  client_id: string;
  practitioner_id: string;
  type: 'poster' | 'report' | 'testimonial';
  title: string;
  image_url: string;
  is_anonymous: boolean; // 是否脱敏
  created_at: string;
}

export interface OrderRecord {
  id: string;
  client_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  buy_link?: string;
  ordered_at: string;
  delivered_at?: string;
}

export interface Client {
  id: string;
  practitioner_id: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  birthday?: string;
  height_cm?: number;
  weight_kg?: number;
  health_goal?: string; // 调理目标 (Nutritionist focus)
  source?: string;      // 获客来源 (Sales focus)
  health_baseline?: string;
  protocol_id?: string; // 关联的干预方案 ID
  
  // 360° Golden Record - Base Dimensions
  allergies?: string[];
  contraindications?: string[];
  current_medications?: string[]; // 药物-营养素冲突防范
  
  // Dynamic Dimensions (Calculated or recorded)
  adherence_score?: number; // 0-100 (Adherence Score)
  adherence_trend?: 'up' | 'down' | 'stable'; 
  
  inventory_status?: {
    product_id: string;
    current_stock: number; // 当前库存数量
    remaining_days: number; // 库存预估水位 (Inventory Water Level)
    last_calibration_date: string; // 最后一次校准日期
  }[];
  
  feeling_metrics?: {
    energy_score: number; // 0-10
    sleep_score: number;
    mood_score: number;
    trend_pivot: boolean; // 情绪拐点检测
  };
  
  last_physical_feedback?: string; // 最近体感变化
  
  // 4. 客户 360 档案扩展 (Client 360 Extensions)
  follow_up_notes?: FollowUpNote[]; // 随访笔记
  evidence_chain?: EvidenceRecord[]; // 效果对比证据链
  marketing_assets?: MarketingAsset[]; // 营销素材资产 (PDR 6)
  order_history?: OrderRecord[]; // 补货记录 (PDR 4)
  tags?: string[]; // 客户画像标签 (e.g., "不喜欢晨起打扰", "有健身习惯")
  
  risk_level?: 'low' | 'medium' | 'high'; // 风险管理 (PDR 3.3)
  conversion_intent?: 'low' | 'medium' | 'high'; // 成交意向 (PDR 7)
  missed_days?: number; // 连续未打卡天数 (PDR 3.1)
  loyalty_points?: number; // 积分系统 (PDR 扩展：打卡奖励)
  checkin_streak?: number; // 连续打卡天数 (Streak)
  last_checkin_at?: string; // 最近一次打卡时间
  
  // 告警静默规则相关字段 (PDR 1.4)
  last_alert_at?: string; // 最近一次告警触发时间
  last_alert_priority?: 'low' | 'medium' | 'high' | 'critical'; // 最近一次告警优先级
  
  status_label?: string; // [v3.9] 手动标注的客户状态 (如: "减脂中", "动力下降")
  current_phase_index?: number; // [v5.0] 当前方案执行阶段索引 (0-indexed)
  
  slug: string; // URL 混淆 Slug (Random UUID for client access)
  push_subscription?: string; // PWA Web Push Subscription (JSON string)
  
  created_at: string;
}

export interface FollowUpNote {
  id: string;
  client_id: string;
  practitioner_id: string;
  content: string;
  date: string;
  type: 'regular' | 'adjustment' | 'milestone';
  tags?: string[];
  created_at: string;
}

export interface UserTask {
  id: string;
  clientId: string;
  type: 'manual_todo';
  content: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'completed';
  createdAt: string;
  script?: string;
}

export interface EvidenceRecord {
  id: string;
  date: string;
  title: string;
  description?: string;
  is_private: boolean;
  images?: string[]; // 支持多图展示证据
  before_img_url?: string; // 服用前基准图
  after_img_url?: string; // 好转对比图
  metrics?: {
    name: string;
    before_value: string;
    after_value: string;
    unit: string;
    trend: 'up' | 'down';
  }[];
}

// 1. 产品与成分库 (Product & Ingredient Master)
export interface Ingredient {
  id: string;
  name: string; // 如：鱼油、辅酶 Q10
  description?: string;
  benefits?: string[];
  category?: string; // 成分分类
  unit?: string;     // 标准单位 (如 mg, g, IU)
  price_per_unit?: number; // 基准价格 (可选)
  target_metrics?: MetricType[]; // 针对的生理指标 (用于功效闭环关联)
}

export interface ConflictRule {
  id: string;
  medication_keyword: string; // 药物关键词 (如: "华法林")
  ingredient_keyword: string; // 营养素关键词 (如: "辅酶 Q10")
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string; // 风险描述
  suggestion: string; // 专业建议
}

export interface ProductIngredient {
  product_id: string;
  ingredient_id: string;
  amount_per_unit: number; // 含量，如：500
  unit: string; // 单位，如：mg
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  enterprise_name?: string; // 企业名称
  spec_quantity: number; // 规格数量
  spec_unit: string; // 规格单位，如：粒、片、ml
  packaging_unit?: string; // 包装单位，如：瓶、盒、袋
  dosage_unit: string; // 单次剂量单位，如：粒、ml
  category?: string; // 产品分类
  dosage_per_day?: number; // 每日建议剂量
  unit?: string; // 剂量单位 (同 dosage_unit，为兼容性保留)
  
  // 关键字段 (逻辑闭环增强)
  price?: number; // 产品零售价 (用于计算补货额)
  main_efficacy?: string[]; // 主要功效，如：['护肝', '降脂']
  suggested_frequency?: number; // 建议频率
  shelf_life_after_opening_days?: number; // 开封后有效期
  image_url?: string;
  buy_link?: string;
  precautions?: string; // 禁忌项
  
  // 成分关联 (逻辑闭环增强)
  ingredients?: {
    ingredient_id: string;
    amount_per_unit: number; // 每一份(粒/片)的含量
    unit: string; // 含量单位 (mg, IU, mcg)
  }[]; // 核心成分
}

export type TimeSlot = 'morning' | 'noon' | 'evening' | 'night' | 'before_bed';

// 3. SOP 方案引擎 (Protocol Builder)

// 触发器类型
export type TriggerType = 
  | 'stock_low'          // 断货预警
  | 'side_effect'       // 好转反应/副作用反馈
  | 'non_compliance'    // 依从性不足
  | 'phase_complete';   // 阶段完成

export interface ProtocolTrigger {
  id: string;
  name: string;
  description?: string;
  category: 'compliance' | 'inventory' | 'symptom' | 'growth' | 'points';
  is_enabled: boolean;
  updated_at: string;
  client_id?: string; // 所属客户 ID (可选，若为空则为全局)
  is_global?: boolean; // 是否为全局触发器
  
  // A. 条件池 (Condition Pool) - 调用数据实体
  condition: {
    type: 
      | 'stock_level'      // 库存维度: current_stock_count < X
      | 'adherence_streak' // 行为维度: daily_adherence_log 连续 N 天为 0
      | 'vital_trend'      // 体感维度: vital_trend_score 连续 M 次下降
      | 'protocol_duration'; // 时间维度: 距离方案开始已过 P 天
    threshold: number;      // 阈值 (X, N, M, P)
    period_days?: number;   // 计算周期 (可选)
  };

  // B. 动作池 (Action Pool) - 触发移动端任务
  action: {
    type: 
      | 'push_red_dot'      // 红点通知: 在营养师移动端生成一个“待办事项”
      | 'send_template'     // 模版推送: 自动选择一套话术
      | 'highlight_client'; // 状态标记: 将该客户在列表中的权重置顶（红色高亮）
    priority: 'low' | 'medium' | 'high' | 'critical';
    label: string;          // 动作标签 (如: 【沉默关怀】)
    payload_template: string; // 话术模版 (支持变量)
  };
}

export interface GlobalStrategy {
  max_non_emergency_red_dots_per_48h: number; // 全局静默规则
}

// 方案阶段 (The Schedule)
export interface ProtocolPhase {
  id: string;
  protocol_id: string;
  name: string; // 如：冲击期、稳定期、巩固期
  order: number;
  duration_days: number;
  
  // 该阶段的动作 (The Recipe in this phase)
  actions: ProtocolAction[];
}

export interface ProtocolAction {
  id: string;
  phase_id: string;
  product_id: string;
  
  // 使用方法 (Usage Method)
  frequency_per_day: number; // 每天服用几次
  dosage_per_time: string;   // 每次服用量 (如: "1粒", "5ml")
  timing_tag: 'with_meal' | 'empty_stomach' | 'before_bed' | 'after_meal' | 'any_time'; // 服用时间标签
  usage_instructions?: string; // 自定义备注/书写使用方法
  order: number; // 排序
  
  // 兼容性字段 (可选保留)
  time_slot?: TimeSlot;
  dosage?: number;
}

export interface Protocol {
  id: string;
  practitioner_id: string;
  name: string; // 方案名称，如：12周肝脏修复方案
  description?: string;
  category?: string; // 减脂、备孕、睡眠
  
  phases: ProtocolPhase[];
  triggers: ProtocolTrigger[];
  
  created_at: string;
  updated_at: string;
}

// 客户正在执行的方案实例
export interface ClientProtocolInstance {
  id: string;
  client_id: string;
  protocol_id: string;
  start_date: string;
  current_phase_id: string;
  status: 'active' | 'completed' | 'paused';
  
  // 实时依从性与库存 (Dynamic Dimensions)
  adherence_rate: number;
  stock_status: {
    product_id: string;
    remaining_days: number;
  }[];
}

export interface ClientInventory {
  id: string;
  client_id: string;
  product_id: string;
  time_slot: TimeSlot;
  current_stock: number;
  dosage_per_time: number;
  frequency_per_day: number;
  alert_threshold_days: number;
  is_active: boolean;
  updated_at: string;
  // Join fields
  product?: Product;
}

export interface ClientGoal {
  id: string;
  client_id: string;
  goal_title: string;
  contraindications: string[];
  water_target_ml: number;
  created_at: string;
  updated_at: string;
}

export interface CheckinLog {
  id: string;
  client_id: string;
  time_slot: string; // morning, noon, evening, etc.
  slot_id: string;   // v4.0 幂等性标识 (格式: YYYY-MM-DD:slot_name, 如 2024-03-05:morning)
  action_id?: string; // v4.0 关联的方案动作 ID
  product_id?: string; // v4.0 关联的产品 ID
  is_taken: boolean;  // v4.0 是否已服用
  taken_at: string;
  energy_score?: number; // 1-10 (Legacy)
  is_auto_checkin: boolean;
}

export interface HealthMetric {
  id: string;
  client_id: string;
  metric_type: string; // Weight, Waist, BloodSugar, SleepScore, etc.
  metric_value?: number;
  metric_unit?: string;
  image_url?: string;
  is_private: boolean;
  insight_text?: string;
  recorded_at: string;
}

export interface ProfessionalFeed {
  id: string;
  practitioner_id: string;
  client_id?: string;
  title: string;
  content_url: string;
  summary?: string;
  created_at: string;
}

// 4. 真实互动与体征日志 (Interaction & Vitals) [v3.9]
export interface Feedback {
  id: string;
  client_id: string;
  practitioner_id: string;
  content: string;
  sender_type: 'client' | 'practitioner';
  is_read: boolean;
  
  // v4.0 Subjective Feedback
  energy_level?: 1 | 2 | 3 | 4 | 5;
  sleep_quality?: 1 | 2 | 3 | 4 | 5;
  gut_reaction?: 'normal' | 'bloating' | 'diarrhea' | 'constipation';
  
  created_at: string;
}

export interface WeightLog {
  id: string;
  client_id: string;
  weight_kg: number;
  body_fat_percentage?: number; // 体脂率 (%)
  
  // v4.0 Physiological Metrics
  visceral_fat_level?: number; // 内脏脂肪等级
  muscle_mass_kg?: number;     // 肌肉量 (kg)
  is_period?: boolean;         // 生理期标记 (仅女性)
  is_special_event?: boolean;  // 特殊事件标记 (大餐、熬夜、生病等)
  is_anomaly?: boolean;        // 异常数据标记 (系统自动判定或手动确认)
  
  recorded_at: string;
  source: 'manual' | 'report' | 'device';
}

/**
 * [v4.0] 客户端 H5 每日上报聚合结构 (用于 API 提交)
 */
export interface ClientDailyReport {
  client_id: string;
  report_date: string;
  compliance: {
    supplements: Array<{
      action_id: string;
      product_id: string;
      is_taken: boolean;
      consumed_at: string;
    }>;
    water_intake_ml: number;
  };
  feedback: Partial<Feedback>;
  metrics: Partial<WeightLog>;
}

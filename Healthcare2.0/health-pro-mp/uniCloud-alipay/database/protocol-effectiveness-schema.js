/**
 * 配方效果追踪数据模型 (Protocol Effectiveness Tracking)
 * 
 * 用途：
 * 1. 记录每个客户配方使用的完整生命周期
 * 2. 统计配方效果指标（依从性、WROM变化、体感改善等）
 * 3. 支持配方维度分析（哪些配方效果好）
 * 4. 支持客户维度分析（单个客户的配方历史）
 * 
 * 关联集合：
 * - he_user_protocols: 配方主数据
 * - he_daily_plans: 每日打卡数据
 * - he_health_logs: 健康指标
 * - he_users: 用户信息（WROM等）
 */

// ==========================================
// 集合: he_protocol_snapshots
// 用途: 记录配方每日快照，用于效果追踪
// ==========================================
const protocolSnapshotSchema = {
  _id: "snapshot_001",
  
  // 关联信息
  protocol_id: "protocol_001",      // 关联的配方ID
  user_id: "user_001",              // 客户ID
  template_id: "template_001",      // 配方模板ID（可选）
  
  // 日期信息
  date: "2026-04-01",               // 快照日期（YYYY-MM-DD）
  day_number: 5,                    // 配方使用第几天（从1开始）
  
  // 配方状态
  protocol_status: "active",        // pending | active | completed | expired
  is_active_day: true,              // 当日是否为生效日
  
  // 依从性数据（从 daily_plan 采集）
  adherence: {
    total_tasks: 4,                 // 当日总任务数
    completed_tasks: 3,             // 已完成任务数
    completion_rate: 75,            // 完成率（%）
    missed_tasks: ["evening"]       // 未完成的时间段
  },
  
  // 体感数据（从 daily_plan.symptoms 采集）
  symptoms: {
    mood: 8,                        // 心情 0-10
    energy: 7,                      // 精力 0-10
    sleep: 6,                       // 睡眠 0-10
    digestion: 8,                 // 肠道 0-10
    avg_score: 7.25                 // 平均体感分
  },
  
  // 饮水数据
  water_intake: 2.5,                // 当日饮水量（升）
  
  // WROM 快照（从 users.wrom_score 采集）
  wrom: {
    score: 78,                      // 当日WROM评分
    trend: "up",                    // up | down | flat
    breakdown: {                    // 分解维度
      adherence: 30,
      inventory: 25,
      symptom: 15,
      engagement: 8
    }
  },
  
  // 库存消耗（从 inventory 采集）
  inventory_consumption: [
    {
      product_id: "prod_001",
      product_name: "维他命C",
      stock_before: 2.0,
      stock_after: 1.8,
      consumed: 0.2,                  // 当日消耗
      unit: "瓶"
    }
  ],
  
  // 元数据
  created_at: 1712304000000,        // 快照创建时间
  data_source: "daily_plan"          // 数据来源标识
};

// ==========================================
// 集合: he_protocol_effectiveness_reports
// 用途: 配方效果总结报告（方案结束后生成）
// ==========================================
const protocolEffectivenessSchema = {
  _id: "effectiveness_001",
  
  // 关联信息
  protocol_id: "protocol_001",
  user_id: "user_001",
  template_id: "template_001",
  
  // 配方基本信息
  protocol_name: "基础免疫增强方案",
  protocol_duration_days: 90,         // 实际使用天数
  
  // 使用周期
  period: {
    start_date: "2026-01-01",
    end_date: "2026-03-31",
    actual_start_date: "2026-01-01",  // 实际开始（可能有延迟）
    actual_end_date: "2026-03-31"     // 实际结束
  },
  
  // 依从性统计
  adherence: {
    total_days: 90,                   // 总天数
    active_days: 85,                  // 有打卡的天数
    missed_days: 5,                   // 完全未打卡天数
    avg_completion_rate: 82,          // 平均完成率（%）
    best_streak: 21,                  // 最长连续打卡（天）
    adherence_level: "good"           // excellent(>90) | good(70-90) | fair(50-70) | poor(<50)
  },
  
  // 体感改善统计
  symptom_improvement: {
    initial_avg: 5.5,                 // 初期平均体感（前7天）
    final_avg: 7.8,                   // 末期平均体感（后7天）
    improvement_rate: 41.8,           // 改善幅度（%）
    
    // 各维度变化
    dimensions: {
      mood: { initial: 6, final: 8, change: +2 },
      energy: { initial: 5, final: 8, change: +3 },
      sleep: { initial: 5, final: 7, change: +2 },
      digestion: { initial: 6, final: 8, change: +2 }
    },
    
    improvement_level: "显著改善"      // 显著改善 | 轻微改善 | 无变化 | 恶化
  },
  
  // WROM变化
  wrom_progress: {
    initial_score: 65,                // 起始WROM（前7天平均）
    final_score: 82,                  // 结束WROM（后7天平均）
    peak_score: 85,                   // 最高WROM
    lowest_score: 62,                 // 最低WROM
    change: +17,                      // 总变化
    change_rate: 26.2,                // 变化率（%）
    trend: "up"                       // up | down | flat
  },
  
  // 库存消耗统计
  inventory_usage: [
    {
      product_id: "prod_001",
      product_name: "维他命C",
      total_consumed: 180,            // 总消耗（粒）
      avg_daily_usage: 2.0,           // 平均日用量
      expected_duration: 90,          // 预期使用天数
      actual_duration: 90,           // 实际使用天数
      usage_efficiency: 100           // 使用效率（%）
    }
  ],
  
  // 客户反馈
  client_feedback: {
    overall_satisfaction: 4,          // 1-5星
    text_feedback: "精力明显提升，换季不再容易感冒",
    would_recommend: true,             // 是否愿意推荐
    continue_willingness: true          // 是否愿意继续
  },
  
  // 顾问评估
  advisor_evaluation: {
    effectiveness_score: 85,          // 顾问主观评分
    notes: "客户执行度很高，建议续订或升级到进阶方案",
    recommendation: "continue",        // continue | upgrade | adjust | stop
    key_observations: ["依从性优秀", "体感改善明显", "无不良反应"]
  },
  
  // 与其他配方对比（如客户有多个配方历史）
  comparison: {
    previous_protocol_id: "protocol_000",
    previous_effectiveness: 72,
    improvement_vs_previous: 13        // 相比上次的提升
  },
  
  // 报告状态
  status: "completed",                // generating | completed | archived
  
  // 时间戳
  created_at: 1712304000000,
  updated_at: 1712304000000,
  generated_at: 1712304000000
};

// ==========================================
// 集合: he_protocol_templates_usage
// 用途: 配方模板使用统计（用于配方库优化）
// ==========================================
const templateUsageSchema = {
  _id: "template_usage_001",
  
  template_id: "template_001",
  template_name: "基础免疫增强方案",
  
  // 使用统计
  usage_stats: {
    total_assignments: 45,          // 总分配次数
    active_assignments: 12,          // 当前正在使用
    completed_assignments: 30,       // 已完成
    cancelled_assignments: 3         // 取消/中断
  },
  
  // 效果聚合统计
  effectiveness_summary: {
    avg_adherence: 84,               // 平均依从性
    avg_duration_days: 88,           // 平均使用天数
    avg_wrom_improvement: 15.5,      // 平均WROM提升
    completion_rate: 82,             // 完成率（%）
    satisfaction_avg: 4.2            // 平均满意度（1-5）
  },
  
  // 分布统计
  distribution: {
    adherence_distribution: {
      excellent: 15,                 // >90%
      good: 20,                    // 70-90%
      fair: 8,                     // 50-70%
      poor: 2                      // <50%
    },
    effectiveness_distribution: {
      "显著改善": 25,
      "轻微改善": 12,
      "无变化": 5,
      "恶化": 1
    }
  },
  
  // 适用人群标签（基于实际使用数据反推）
  suitable_for: ["免疫力低下", "换季易感", "亚健康人群"],
  
  // 版本历史
  version_history: [
    {
      version: 1,
      changes: "初始版本",
      effectiveness_delta: 0
    }
  ],
  
  last_updated: 1712304000000
};

// 导出用于云函数引用
module.exports = {
  protocolSnapshotSchema,
  protocolEffectivenessSchema,
  templateUsageSchema
};

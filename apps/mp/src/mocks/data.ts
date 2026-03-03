import { 
  Client, 
  ClientInventory, 
  Product, 
  ClientGoal, 
  HealthMetric, 
  ProfessionalFeed,
  Ingredient,
  Protocol,
  ClientProtocolInstance,
  ProtocolTrigger
} from '@healthcare/shared';

// 1. Mock Ingredients
export const mockIngredients: Ingredient[] = [
  { id: 'ing-1', name: 'Omega-3', description: '深海鱼油提取物，含 EPA 和 DHA', benefits: ['抗炎', '心血管健康'] },
  { id: 'ing-2', name: '辅酶 Q10', description: '细胞能量工厂的必需辅酶', benefits: ['线粒体支持', '备孕支持'] },
  { id: 'ing-3', name: '乳酸菌', description: '调节肠道菌群', benefits: ['免疫调节', '消化支持'] },
];

// 2. Mock Products (Product & Ingredient Master)
export const mockProducts: Product[] = [
  {
    id: 'p-1',
    name: '益生菌强效装',
    brand: 'Life-Space',
    spec_quantity: 60,
    spec_unit: '粒/瓶',
    dosage_unit: '粒',
    main_efficacy: ['肠道调理', '免疫提升'],
    suggested_frequency: 1,
    shelf_life_after_opening_days: 90,
    image_url: '',
    precautions: '空腹服用效果佳，开封后建议冷藏',
    ingredients: [
      { ingredient_id: 'ing-3', amount_per_unit: 30, unit: 'Billion CFU' }
    ]
  },
  {
    id: 'p-2',
    name: '辅酶 Q10 200mg',
    brand: 'Swisse',
    spec_quantity: 100,
    spec_unit: '粒/瓶',
    dosage_unit: '粒',
    main_efficacy: ['线粒体能量', '心脏支持'],
    suggested_frequency: 1,
    shelf_life_after_opening_days: 180,
    image_url: '',
    precautions: '随餐服用，避免睡前服用',
    ingredients: [
      { ingredient_id: 'ing-2', amount_per_unit: 200, unit: 'mg' }
    ]
  },
  {
    id: 'p-3',
    name: '深海鱼油 1000mg',
    brand: 'Blackmores',
    spec_quantity: 400,
    spec_unit: '粒/瓶',
    dosage_unit: '粒',
    main_efficacy: ['抗炎', '心血管保护'],
    suggested_frequency: 2,
    shelf_life_after_opening_days: 120,
    image_url: '',
    precautions: '建议晚饭后服用，手术前一周停服',
    ingredients: [
      { ingredient_id: 'ing-1', amount_per_unit: 1000, unit: 'mg' }
    ]
  }
];

// 3. Mock Clients (Customer 360° Golden Record)
export const mockClient: Client = {
  id: 'client-1',
  practitioner_id: 'pract-1',
  name: '王五',
  avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wang',
  phone: '13800138000',
  gender: 'male',
  height_cm: 175,
  weight_kg: 78,
  health_baseline: '胰岛素抵抗，轻度脂肪肝',
  allergies: ['海鲜', '花生'],
  contraindications: ['抗凝药物'],
  current_medications: ['二甲双胍'],
  adherence_score: 95,
  adherence_trend: 'up',
  risk_level: 'low',
  conversion_intent: 'high',
  loyalty_points: 1250,
  checkin_streak: 5,
  missed_days: 0,
  inventory_status: [
    { product_id: 'p-1', remaining_days: 15, last_calibration_date: '2024-03-01' },
    { product_id: 'p-2', remaining_days: 2, last_calibration_date: '2024-03-01' },
    { product_id: 'p-3', remaining_days: 25, last_calibration_date: '2024-03-01' }
  ],
  feeling_metrics: {
    energy_score: 8,
    sleep_score: 7,
    mood_score: 9,
    trend_pivot: false
  },
  last_physical_feedback: '午后疲劳感明显减轻',
  follow_up_notes: [
    { id: 'note-1', client_id: 'client-1', date: '2024-03-01', content: '客户反馈服用鱼油后打嗝有鱼腥味，建议改为餐中服用，观察一周。', type: 'adjustment', practitioner_id: 'pract-1', created_at: '2024-03-01T00:00:00Z' },
    { id: 'note-2', client_id: 'client-1', date: '2024-02-15', content: '入伙第一周，依从性极高，精力值从 4 分提升至 6 分。', type: 'milestone', practitioner_id: 'pract-1', created_at: '2024-02-15T00:00:00Z' }
  ],
  evidence_chain: [
      { 
        id: 'ev-1', 
        date: '2024-03-01', 
        title: '精力与睡眠改善', 
        description: '精力从 4 分提升至 8 分，睡眠质量显著提高。', 
        is_private: false,
        before_img_url: 'https://images.unsplash.com/photo-1541480601022-2308c0f02487?w=300',
        after_img_url: 'https://images.unsplash.com/photo-1541480601022-2308c0f02487?w=300'
      },
      { 
        id: 'ev-2', 
        date: '2024-02-15', 
        title: '指标优化', 
        description: '空腹血糖从 6.2 降至 5.8。', 
        is_private: false,
        before_img_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=300'
      },
      { 
        id: 'ev-3', 
        date: '2024-02-01', 
        title: '初始基准', 
        description: '入伙前基准数据录入。', 
        is_private: true 
      }
    ],
  tags: ['不喜欢晨起打扰', '有健身习惯', '口味偏淡', '高净值客户'],
  marketing_assets: [
    {
      id: 'ma-1',
      client_id: 'client-1',
      practitioner_id: 'pract-1',
      type: 'poster',
      title: '21天精力改善对比图',
      image_url: 'https://placehold.co/400x600?text=Comparison+Poster',
      is_anonymous: true,
      created_at: '2024-03-01T10:00:00Z'
    }
  ],
  order_history: [
    {
      id: 'ord-1',
      client_id: 'client-1',
      product_id: 'p-2',
      quantity: 1,
      status: 'delivered',
      ordered_at: '2024-02-01T09:00:00Z',
      delivered_at: '2024-02-03T14:00:00Z'
    }
  ],
  created_at: '2024-01-01'
};

export const mockClients: Client[] = [
  mockClient,
  {
    id: 'client-2', 
    practitioner_id: 'pract-1', 
    name: '李四', 
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li',
    phone: '13912345678', 
    gender: 'female', 
    adherence_score: 65,
    adherence_trend: 'down',
    risk_level: 'high',
    conversion_intent: 'low',
    loyalty_points: 300,
    health_baseline: '多囊卵巢综合征 (PCOS)',
    allergies: ['乳糖'],
    inventory_status: [
      { product_id: 'p-1', remaining_days: 1, last_calibration_date: '2024-03-01' }
    ],
    feeling_metrics: {
      energy_score: 4,
      sleep_score: 5,
      mood_score: 3,
      trend_pivot: true
    },
    follow_up_notes: [
      { id: 'note-3', client_id: 'client-2', date: '2024-02-28', content: '情绪波动较大，反馈产品颗粒太大吞咽困难。', type: 'regular', practitioner_id: 'pract-1', created_at: '2024-02-28T00:00:00Z' }
    ],
    tags: ['备孕中', '工作压力大'],
    created_at: '2024-01-15'
  },
  {
    id: 'client-3', 
    practitioner_id: 'pract-1', 
    name: '赵六', 
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhao',
    phone: '13788889999', 
    gender: 'male', 
    adherence_score: 45,
    adherence_trend: 'down',
    risk_level: 'medium',
    conversion_intent: 'low',
    loyalty_points: 50,
    health_baseline: '严重睡眠不足，压力性肥胖',
    inventory_status: [
      { product_id: 'p-2', remaining_days: 20, last_calibration_date: '2024-03-01' }
    ],
    feeling_metrics: {
      energy_score: 2,
      sleep_score: 2,
      mood_score: 4,
      trend_pivot: true
    },
    tags: ['高压职业', '经常熬夜'],
    created_at: '2024-02-20',
    missed_days: 3 // 模拟连续 3 天断服
  }
];

// 4. Mock SOP Protocol (Protocol Builder)
export const mockGlobalTriggers: ProtocolTrigger[] = [
  // 1. 依从性干预 (Compliance Triggers)
  {
    id: 'trig-1',
    category: 'compliance',
    name: '连续断服预警',
    description: '解决“买了不吃”的问题',
    condition: {
      type: 'adherence_streak',
      threshold: 2
    },
    action: {
      type: 'push_red_dot',
      priority: 'high',
      label: '【沉默关怀】',
      payload_template: '最近忙吗？看到你 {{threshold}} 天没打卡了，是不是出差忘了带补剂？'
    },
    is_enabled: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'trig-2',
    category: 'compliance',
    name: '依从性跌落提醒',
    description: '打卡率低于阈值',
    condition: {
      type: 'adherence_streak', // 这里借用，后续逻辑会处理
      threshold: 70,
      period_days: 7
    },
    action: {
      type: 'push_red_dot',
      priority: 'medium',
      label: '【低依从客户】',
      payload_template: '打卡率低于 {{threshold}}%，触发营养师【电话/语音深度沟通】任务。'
    },
    is_enabled: true,
    updated_at: new Date().toISOString()
  },
  // 2. 库存与复购干预 (Inventory & Re-purchase Triggers)
  {
    id: 'trig-3',
    category: 'inventory',
    name: '首轮复购预警',
    description: '精准收割，保证不断档',
    condition: {
      type: 'stock_level',
      threshold: 7
    },
    action: {
      type: 'send_template',
      priority: 'high',
      label: '【补货引导】',
      payload_template: '你的 {{product_name}} 快吃完了，现在订购可以保证不断档，身体好转反应更持续。'
    },
    is_enabled: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'trig-4',
    category: 'inventory',
    name: '断货临界通知',
    description: '极速订单跟进',
    condition: {
      type: 'stock_level',
      threshold: 2
    },
    action: {
      type: 'push_red_dot',
      priority: 'critical',
      label: '【极速订单发送】',
      payload_template: '客户库存严重不足（剩余 {{threshold}} 天），请直接跟进确认。'
    },
    is_enabled: true,
    updated_at: new Date().toISOString()
  },
  // 3. 体感与风险干预 (Symptom & Risk Triggers)
  {
    id: 'trig-5',
    category: 'symptom',
    name: '好转反应/副作用对策',
    description: '专业信任的护城河',
    condition: {
      type: 'vital_trend', // 借用
      threshold: 1
    },
    action: {
      type: 'push_red_dot',
      priority: 'critical',
      label: '【紧急干预】',
      payload_template: '检测到不适反馈：建议减量或暂停。弹出预设【科普解释模版】。'
    },
    is_enabled: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'trig-6',
    category: 'symptom',
    name: '情绪/精力连续下滑',
    description: '方案有效性评估',
    condition: {
      type: 'vital_trend',
      threshold: 3
    },
    action: {
      type: 'push_red_dot',
      priority: 'high',
      label: '【方案评估】',
      payload_template: '指标连续 {{threshold}} 次下滑，请重新审核 SOP 配方，考虑升级或更换产品。'
    },
    is_enabled: true,
    updated_at: new Date().toISOString()
  },
  // 4. 商业增长与关系干预 (Growth & Relationship Triggers)
  {
    id: 'trig-7',
    category: 'growth',
    name: '黄金转介绍时机',
    description: '低成本获客的关键',
    condition: {
      type: 'adherence_streak', // 借用
      threshold: 90
    },
    action: {
      type: 'push_red_dot',
      priority: 'medium',
      label: '【成功案例挖掘】',
      payload_template: '依从性 > 90% 且体感持续向上，引导分享。'
    },
    is_enabled: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 'trig-8',
    category: 'growth',
    name: '方案阶段性回访',
    description: '深度关系维护',
    condition: {
      type: 'protocol_duration',
      threshold: 30
    },
    action: {
      type: 'push_red_dot',
      priority: 'medium',
      label: '【深度体检/复盘】',
      payload_template: '入伙已满 {{threshold}} 天，请进行一次深度的月度/季度总结汇报。'
    },
    is_enabled: true,
    updated_at: new Date().toISOString()
  }
];

export const mockProtocol: Protocol = {
  id: 'proto-1',
  practitioner_id: 'pract-1',
  name: '12周肝脏修复与代谢优化方案',
  description: '针对脂肪肝与胰岛素抵抗设计的系统调理方案',
  category: '代谢健康',
  phases: [
    {
      id: 'phase-1',
      protocol_id: 'proto-1',
      name: '冲击激活期',
      order: 1,
      duration_days: 14,
      actions: [
        { id: 'act-1', phase_id: 'phase-1', product_id: 'p-1', frequency_per_day: 1, dosage_per_time: '2粒', timing_tag: 'empty_stomach' },
        { id: 'act-2', phase_id: 'phase-1', product_id: 'p-2', frequency_per_day: 1, dosage_per_time: '2粒', timing_tag: 'with_meal' },
        { id: 'act-3', phase_id: 'phase-1', product_id: 'p-3', frequency_per_day: 1, dosage_per_time: '2粒', timing_tag: 'with_meal' },
      ]
    },
    {
      id: 'phase-2',
      protocol_id: 'proto-1',
      name: '稳定修复期',
      order: 2,
      duration_days: 56,
      actions: [
        { id: 'act-4', phase_id: 'phase-2', product_id: 'p-1', frequency_per_day: 1, dosage_per_time: '1粒', timing_tag: 'empty_stomach' },
        { id: 'act-5', phase_id: 'phase-2', product_id: 'p-2', frequency_per_day: 1, dosage_per_time: '1粒', timing_tag: 'with_meal' },
        { id: 'act-6', phase_id: 'phase-2', product_id: 'p-3', frequency_per_day: 1, dosage_per_time: '1粒', timing_tag: 'with_meal' },
      ]
    }
  ],
  triggers: mockGlobalTriggers.slice(0, 3), // 关联全局触发器示例
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// 5. Mock Protocol Instance
export const mockProtocolInstance: ClientProtocolInstance = {
  id: 'inst-1',
  client_id: 'client-1',
  protocol_id: 'proto-1',
  start_date: new Date().toISOString(),
  current_phase_id: 'phase-1',
  status: 'active',
  adherence_rate: 0.85,
  stock_status: [
    { product_id: 'p-1', remaining_days: 12 },
    { product_id: 'p-2', remaining_days: 4 }, // 触发预警
    { product_id: 'p-3', remaining_days: 25 }
  ]
};

// 6. Mock Inventory (Legacy compatibility)
export const mockInventory: ClientInventory[] = [
  {
    id: 'inv-1',
    client_id: 'client-1',
    product_id: 'p-1',
    time_slot: 'morning',
    current_stock: 45,
    dosage_per_time: 1,
    frequency_per_day: 1,
    alert_threshold_days: 5,
    is_active: true,
    updated_at: new Date().toISOString(),
    product: mockProducts[0],
  },
  {
    id: 'inv-2',
    client_id: 'client-1',
    product_id: 'p-2',
    time_slot: 'noon',
    current_stock: 12,
    dosage_per_time: 2,
    frequency_per_day: 1,
    alert_threshold_days: 3,
    is_active: true,
    updated_at: new Date().toISOString(),
    product: mockProducts[1],
  },
  {
    id: 'inv-3',
    client_id: 'client-1',
    product_id: 'p-3',
    time_slot: 'evening',
    current_stock: 80,
    dosage_per_time: 2,
    frequency_per_day: 1,
    alert_threshold_days: 10,
    is_active: true,
    updated_at: new Date().toISOString(),
    product: mockProducts[2],
  }
];

// 7. Mock Goals
export const mockGoals: ClientGoal = {
  id: 'goal-1',
  client_id: 'client-1',
  goal_title: '改善胰岛素抵抗，提升午后精力',
  contraindications: ['高升糖水果', '精制面食', '熬夜'],
  water_target_ml: 2500,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// 8. Mock Metrics
export const mockMetrics: HealthMetric[] = [
  {
    id: 'm-1',
    client_id: 'client-1',
    metric_type: 'energy_score',
    metric_value: 8,
    is_private: false,
    recorded_at: '2024-03-01T08:00:00Z',
  },
  {
    id: 'm-2',
    client_id: 'client-1',
    metric_type: 'weight',
    metric_value: 75.5,
    metric_unit: 'kg',
    is_private: false,
    recorded_at: '2024-03-01T08:00:00Z',
  },
  {
    id: 'm-3',
    client_id: 'client-1',
    metric_type: 'blood_sugar',
    metric_value: 5.4,
    metric_unit: 'mmol/L',
    is_private: true,
    recorded_at: '2024-03-01T08:00:00Z',
  }
];

// 9. Mock Feed
export const mockFeeds: ProfessionalFeed[] = [
  {
    id: 'f-1',
    practitioner_id: 'pract-1',
    title: '为什么你吃鱼油会打嗝？',
    content_url: 'https://mp.weixin.qq.com/s/example1',
    summary: '鱼油打嗝可能与胃酸不足或服用时间有关...',
    created_at: new Date().toISOString(),
  }
];

// 测试数据 - 创建配方模板
const templates = [
  {
    name: "基础营养补充方案",
    description: "适合初学者的基础营养补充方案，包含维生素和矿物质补充",
    category: "基础营养",
    duration: 7,
    items: [
      {
        product_id: "P001",
        product_name: "维生素C",
        daily_usage: 1,
        timing: "morning",
        reminder_type: "notification",
        notes: "餐后服用"
      },
      {
        product_id: "P002", 
        product_name: "维生素D",
        daily_usage: 1,
        timing: "morning",
        reminder_type: "notification",
        notes: "随餐服用"
      }
    ]
  },
  {
    name: "免疫力提升方案",
    description: "增强免疫力的综合配方，适合季节交替期使用",
    category: "免疫力",
    duration: 14,
    items: [
      {
        product_id: "P003",
        product_name: "锌补充剂",
        daily_usage: 2,
        timing: "afternoon",
        reminder_type: "notification",
        notes: "两餐之间服用"
      },
      {
        product_id: "P001",
        product_name: "维生素C",
        daily_usage: 2,
        timing: "morning",
        reminder_type: "notification",
        notes: "早餐后服用"
      }
    ]
  },
  {
    name: "关节保养方案",
    description: "维护关节健康的专用配方，适合中老年人",
    category: "关节健康",
    duration: 30,
    items: [
      {
        product_id: "P004",
        product_name: "葡萄糖胺",
        daily_usage: 1,
        timing: "evening",
        reminder_type: "notification",
        notes: "晚餐后服用"
      },
      {
        product_id: "P005",
        product_name: "钙镁片",
        daily_usage: 2,
        timing: "morning",
        reminder_type: "notification",
        notes: "分两次服用"
      }
    ]
  }
];

console.log('测试配方数据：', JSON.stringify(templates, null, 2));

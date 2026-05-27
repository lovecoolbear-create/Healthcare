# 健康趋势数据表设计方案

## 1. 数据表结构分析

### 1.1 单表设计 vs 多表设计对比

**多表设计（4个独立表）**:
- weight_records (体重记录表)
- blood_lipids_records (血脂记录表) 
- blood_glucose_records (血糖记录表)
- visceral_fat_records (内脏脂肪记录表)

**缺点**: 
- 查询复杂，需要联合4个表
- 新增指标需要新建表
- 统计汇总困难

**单表设计（推荐）**:
- health_metrics (健康指标统一表)

**优点**:
- 查询简单，一条语句获取所有指标
- 扩展性强，新增指标只需增加类型
- 便于统计分析和趋势展示
- 符合Aliyun UniCloud的文档型数据库特点

### 1.2 推荐方案：统一健康指标表

```json
{
  "health_metrics": {
    "_id": "string",           // 主键ID
    "user_id": "string",       // 用户ID
    "metric_type": "string",   // 指标类型：weight, blood_lipids, blood_glucose, visceral_fat
    "value": "number",         // 数值
    "unit": "string",          // 单位：kg, mmol/L, mg/dL, level等
    "record_date": "date",     // 记录日期
    "record_time": "string",   // 记录时间（可选）
    "notes": "string",         // 备注信息
    "created_at": "date",      // 创建时间
    "updated_at": "date"       // 更新时间
  }
}
```

### 1.3 用户表设计

```json
{
  "users": {
    "_id": "string",           // 用户ID
    "username": "string",      // 用户名
    "email": "string",         // 邮箱
    "phone": "string",         // 手机号
    "avatar": "string",        // 头像URL
    "birth_date": "date",      // 出生日期
    "gender": "string",        // 性别
    "height": "number",        // 身高(cm)
    "target_weight": "number", // 目标体重
    "health_goals": "array",   // 健康目标
    "created_at": "date",      // 注册时间
    "updated_at": "date"       // 更新时间
  }
}
```

### 1.4 每日记录汇总表（可选）

```json
{
  "daily_health_summary": {
    "_id": "string",           // 主键ID
    "user_id": "string",       // 用户ID
    "date": "date",            // 日期
    "metrics_summary": {       // 当日各指标汇总
      "weight": {
        "value": "number",
        "unit": "string"
      },
      "blood_glucose": {
        "value": "number", 
        "unit": "string"
      },
      "blood_lipids": {
        "value": "number",
        "unit": "string"
      },
      "visceral_fat": {
        "value": "number",
        "unit": "string"
      }
    },
    "health_score": "number",  // 健康评分
    "created_at": "date",      // 创建时间
    "updated_at": "date"       // 更新时间
  }
}
```

## 2. 指标类型定义

| 指标类型 | 单位 | 正常范围 | 备注 |
|---------|------|---------|------|
| weight | kg | 因人而异 | 体重 |
| blood_glucose | mmol/L | 3.9-6.1 | 空腹血糖 |
| blood_lipids | mg/dL | 总胆固醇<200 | 血脂 |
| visceral_fat | level | 1-12 | 内脏脂肪等级 |

## 3. 索引建议

在Aliyun UniCloud中，建议为以下字段建立索引：
- user_id（用户查询）
- metric_type（指标类型筛选）
- record_date（时间范围查询）
- user_id + record_date（组合查询）

## 4. 查询示例

**获取用户所有指标的最新记录**:
```javascript
db.collection('health_metrics')
  .where({
    user_id: 'user123'
  })
  .orderBy('record_date', 'desc')
  .limit(4)
  .get()
```

**获取指定时间范围的体重记录**:
```javascript
db.collection('health_metrics')
  .where({
    user_id: 'user123',
    metric_type: 'weight',
    record_date: db.command.gte(startDate).and(db.command.lte(endDate))
  })
  .orderBy('record_date', 'asc')
  .get()
```

## 5. 扩展性考虑

采用单表设计的最大优势是扩展性：
- 新增血压指标：只需添加 `blood_pressure` 类型
- 新增心率指标：只需添加 `heart_rate` 类型
- 新增运动指标：只需添加 `exercise` 类型

无需修改数据库结构，只需在应用层增加相应的业务逻辑即可。
# HealthCare 项目数据架构设计 (Data Schema) - v1.0

作为 CTO，我将 PDR 中的业务逻辑转化为了一套“结构化账本”。即便你不懂数据库，也可以把每一张表看作一个 Excel 工作表。

---

## 1. 人员与关系表 (User & Relationship)

### 1.1 营养师表 (Practitioners)
记录服务提供者的基本信息与专业资产。
| 字段名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `id` | 唯一识别码 | P001 |
| `name` | 姓名 | 张营养师 |
| `wechat_id` | 微信关联 ID | wx_123456 |
| `custom_tags` | 个人自定义标签库 | ["出差多", "喜欢赠品"] |
| `qr_code_url` | 个人专属绑定二维码 | https://... |

### 1.2 客户表 (Clients)
记录客户档案及其归属关系。
| 字段名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `id` | 唯一识别码 | C001 |
| `name` | 姓名 | 王小明 |
| `practitioner_id` | **所属营养师 ID** | P001 (建立 1:N 绑定) |
| `timezone` | 客户所在地时区 | UTC+8 |
| `health_baseline` | 初始健康状态描述 | 失眠严重，伴有高血压 |

---

## 2. 产品与服用方案表 (Product & Protocol)

### 2.1 标准产品库 (Products)
所有可供选择的营养品/保健品。
| 字段名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `id` | 唯一识别码 | Prod_001 |
| `name` | 产品名称 | 深海鱼油胶囊 |
| `spec` | 规格说明 | 60粒/瓶 |
| `standard_dosage` | 标准建议剂量 | 2粒/天 |
| `precautions` | 服用注意事项 | 随餐服用，手术前一周停用 |

### 2.2 客户服用方案表 (Protocols)
营养师为特定客户定制的方案。
| 字段名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `id` | 唯一识别码 | Prot_001 |
| `client_id` | 关联客户 | C001 |
| `product_id` | 关联产品 | Prod_001 |
| `custom_dosage` | **定制剂量** | 1.5粒/次 (支持余量计算) |
| `frequency` | 频率 | 每天 2 次 (早/晚) |
| `start_date` | 开始日期 | 2024-03-01 |

---

## 3. 库存与行为记录表 (Inventory & Behavior)

### 3.1 库存快照表 (Inventory)
实时计算客户手中的剩余量。
| 字段名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `client_id` | 关联客户 | C001 |
| `product_id` | 关联产品 | Prod_001 |
| `current_stock` | **当前剩余量** | 45.5 (基本单位：粒) |
| `last_calibrated_at` | 上次校准时间 | 2024-03-05 10:00 |
| `warning_threshold` | 预警天数阈值 | 5 (天) |

### 3.2 打卡记录表 (CheckIn_Logs)
客户的实际服用行为。
| 字段名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `id` | 唯一流水号 | Log_001 |
| `client_id` | 关联客户 | C001 |
| `protocol_id` | 关联方案 | Prot_001 |
| `checkin_time` | 打卡时间 (本地) | 2024-03-06 08:30 |
| `is_backfill` | 是否补打 | False |

---

## 4. 随访与健康指标表 (Follow-ups & Indicators)

### 4.1 随访小贴条 (FollowUp_Notes)
仅营养师可见的内部备忘录。
| 字段名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `client_id` | 关联客户 | C001 |
| `content` | 文字备注 | 客户反馈睡眠质量提升 |
| `tags` | 勾选的标签 | ["好转中", "按时服用"] |
| `created_at` | 记录时间 | 2024-03-05 |

### 4.2 健康指标记录 (Health_Metrics)
用于生成趋势报告的原始数据（支持 The Mirror 模块）。
| 字段名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `client_id` | 关联客户 | C001 |
| `metric_type` | 指标类型 | 血压 / 血糖 / 睡眠评分 / 精力值(1-10) |
| `value` | 数值 | 135 (收缩压) / 8 (精力值) |
| `image_url` | 拍照识别原图 | https://... (支持隐私加密预览) |
| `is_private` | 是否隐私加密 | True (对比照专用) |
| `recorded_at` | 记录时间 | 2024-03-06 |

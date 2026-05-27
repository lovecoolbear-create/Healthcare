# HealthCare Pro 数据库初始化指南

## 方式一：通过 uniCloud 控制台初始化（推荐）

### 步骤 1：登录 uniCloud 控制台
1. 访问 https://unicloud.dcloud.net.cn/
2. 使用 DCloud 账号登录
3. 选择对应的服务空间

### 步骤 2：创建数据库集合（表）
进入「数据库」→「创建集合」，依次创建以下集合：

| 集合名称 | 用途 | 权限配置 |
|---------|------|---------|
| `he_users` | 用户表 | 根据 schema 配置 |
| `he_daily_plans` | 每日计划 | 用户只能读写自己的数据 |
| `he_inventory` | 库存 | 根据 schema 配置 |
| `he_health_logs` | 健康日志 | 根据 schema 配置 |
| `he_user_protocols` | 用户方案 | 根据 schema 配置 |
| `he_interaction_logs` | 互动记录 | 根据 schema 配置 |
| `he_products` | 产品 | 根据 schema 配置 |
| `he_orders` | 订单 | 根据 schema 配置 |
| `he_refill_requests` | 补货请求 | 根据 schema 配置 |
| `he_templates` | 配方模板 | 根据 schema 配置 |
| `he_knowledge_base` | 知识库 | 根据 schema 配置 |
| `he_triggers` | 触发器配置 | 根据 schema 配置 |
| `he_scoring_config` | 评分配置 | 根据 schema 配置 |
| `he_notifications` | 通知 | 根据 schema 配置 |
| `he_followup_actions` | 跟进动作 | 根据 schema 配置 |

### 步骤 3：导入 Schema 验证规则
1. 在集合详情页 →「数据结构」→「编辑」
2. 复制对应 `.schema.json` 文件内容
3. 粘贴到「JSON Schema」验证器中
4. 保存

### 步骤 4：创建初始管理员账号
在 `he_users` 集合中添加一条记录：

```json
{
  "username": "管理员",
  "phone": "13800000000",
  "password": "admin123",  // 生产环境请使用加密密码
  "role": "admin",
  "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
  "created_at": 1704067200000
}
```

### 步骤 5：创建默认评分配置
在 `he_scoring_config` 集合中添加：

```json
{
  "config": {
    "wrom": {
      "weights": {
        "adherence": 40,
        "inventory": 30,
        "symptom": 20,
        "engagement": 10
      },
      "inventory": {
        "low_days": 7,
        "high_days": 45,
        "max_score_days": 120,
        "hoarding_penalty_cap": 12
      },
      "symptom": {
        "progress_multiplier": 5,
        "regression_multiplier": 10,
        "baseline_score": 15,
        "max_score": 20,
        "min_score": 0
      },
      "engagement": {
        "base_score": 8,
        "min_score": 7,
        "max_score": 10,
        "daily_increment": 0.5
      }
    },
    "rps": {
      "weights": {
        "cancel_rate": 30,
        "receipt_delay": 25,
        "repurchase_cycle": 30,
        "effect": 15
      },
      "thresholds": {
        "low_score": 60,
        "receipt_delay": {
          "excellent": 2,
          "good": 5,
          "average": 8,
          "poor": 12
        },
        "repurchase_cycle": {
          "target_days": 35,
          "max_ratio_penalty": 14,
          "max_stability_penalty": 8
        }
      }
    }
  },
  "created_at": 1704067200000,
  "updated_at": 1704067200000
}
```

## 方式二：使用 HBuilderX 初始化

### 步骤 1：关联服务空间
1. 打开 HBuilderX
2. 右键项目中的 `uniCloud-aliyun` 文件夹
3. 选择「关联云服务空间或项目」
4. 选择/创建服务空间

### 步骤 2：初始化数据库
1. 右键 `uniCloud-aliyun/database`
2. 选择「初始化数据库」
3. 勾选所有 `.schema.json` 文件
4. 点击确认上传

### 步骤 3：上传云函数
1. 右键 `uniCloud-aliyun/cloudfunctions`
2. 选择「上传所有云函数」

## 方式三：使用 uniCloud CLI（命令行）

```bash
# 安装 uniCloud CLI
npm install -g @dcloudio/uni-cloud-cli

# 登录
uni-cloud login

# 关联服务空间（替换 space-id）
uni-cloud space bind <your-space-id>

# 初始化数据库
uni-cloud db init

# 上传云函数
uni-cloud function upload
```

## 验证初始化

### 测试云函数
运行测试脚本：

```bash
cd /Users/blair/HealthCare/Healthcare2.0/health-pro-mp
node test-cloud-functions.js
```

### 测试登录
1. Web 端访问：`http://localhost:3000`（H5 模式）
2. 使用管理员账号登录：13800000000 / admin123
3. 验证能否进入仪表板

### 测试小程序
1. 微信开发者工具导入项目
2. 编译模式选择「微信小程序」
3. 使用客户账号测试打卡功能

## 数据库结构概览

```
uniCloud (MongoDB)
├── he_users           # 用户（营养师 + 客户）
├── he_daily_plans     # 每日打卡计划
├── he_inventory       # 客户库存
├── he_health_logs     # 健康指标记录
├── he_user_protocols  # 营养方案
├── he_interaction_logs # 沟通记录
├── he_products        # 产品库
├── he_orders          # 订单
├── he_refill_requests # 补货申请
├── he_templates       # 配方模板
├── he_knowledge_base  # 知识库
├── he_triggers        # 预警规则
└── he_scoring_config  # 评分配置
```

## 常见问题

**Q: Schema 验证失败？**  
A: 检查 JSON 格式，确保 `bsonType` 值正确（如 `string`, `int`, `array`, `object`）

**Q: 权限配置不生效？**  
A: uniCloud 的权限语法是 `auth.uid == doc.user_id`，不是 SQL 风格

**Q: 如何重置数据库？**  
A: uniCloud 控制台 → 数据库 → 选择集合 →「删除」→ 重新初始化

**Q: 需要创建索引吗？**  
A: 生产环境建议为以下字段创建索引：
- `he_users`: phone, role, nutritionist_id
- `he_daily_plans`: user_id, date
- `he_inventory`: user_id

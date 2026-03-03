# HealthCare MVP 实施计划书 (Tech Implementation Plan)

## 1. 技术栈选择 (Tech Stack) - 基于“快、省、稳”原则
为了在最短时间内跑通 MVP，我选用了目前最主流且开发效率最高的技术组合：

*   **后端与数据库 (The Engine)**：**Supabase (PostgreSQL + Auth)**
    *   **理由**：自带身份认证、实时数据库和 API。我们不需要从零写后端代码，直接操作数据库即可。
*   **营养师 Web 端 (The Brain)**：**Next.js + Tailwind CSS + Shadcn UI**
    *   **理由**：React 生态最强的框架，SSR 性能好，UI 库组件成熟且美观，极速实现响应式移动适配。
*   **客户小程序端 (The Frontline)**：**Taro (React 模式)**
    *   **理由**：用 React 语法写小程序，代码逻辑可以与 Web 端共享，未来还能一键发布为 H5 或 APP。

## 2. 核心功能路线图 (MVP Roadmap)

### **第一阶段：骨架搭建 (Week 1)**
*   [ ] **数据库初始化**：根据 `Data_Schema.md` 在 Supabase 建立核心表（客户、产品、方案、打卡记录）。
*   [ ] **营养师登录**：跑通 Web 端的扫码/账号登录流。

### **第二阶段：核心流闭环 (Week 2-3) - 【最重要】**
*   [ ] **录入流**：Web 端实现客户信息与初始库存录入。
*   [ ] **打卡流**：小程序端实现“一键服用”打卡，同步更新数据库。
*   [ ] **预警流**：实现 Dashboard 的“待补货”自动计算与红点提醒。

### **第三阶段：价值闭环 (Week 4)**
*   [ ] **报告流**：小程序端展示简单的指标趋势图（客观）与文字记录（主观）。
*   [ ] **校准流**：实现营养师发起 -> 客户滑动校准的功能。

## 3. 目录结构设计 (Project Structure)
我们将采用 Monorepo（大仓库）模式管理，方便代码共享：

```bash
/HealthCare
  ├── /docs               # 所有的设计文档 (PDR, BP, Schema)
  ├── /apps
  │    ├── /web           # 营养师端 (Next.js)
  │    └── /mp            # 客户小程序 (Taro)
  └── /packages
       ├── /shared        # 共享的数据类型定义、工具函数
       └── /database      # Drizzle/Supabase 数据库定义
```

## 4. 今日行动指南 (First Steps)
1.  **创建基础目录结构**。
2.  **配置环境依赖**。
3.  **开始第一个核心动作**：将 `Data_Schema.md` 转化为 SQL 脚本并初始化数据库。

---
**CTO 寄语：MVP 的核心是“砍”，只留最能证明价值的骨架。我们先跑通“打卡-库存-预警”这条命脉。**

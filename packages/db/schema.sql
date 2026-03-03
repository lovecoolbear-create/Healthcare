-- HealthCare MVP Database Schema (PostgreSQL) - Refined for Three Core Modules

-- 1. Practitioners (营养师)
CREATE TABLE practitioners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    wechat_id TEXT UNIQUE,
    custom_tags TEXT[], -- 营养师个人习惯的标签库
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Clients (客户)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    birthday DATE,
    health_baseline TEXT, -- 初始健康状态描述
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Products (标准产品库)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    spec_quantity NUMERIC NOT NULL, -- 规格（如：60）
    spec_unit TEXT NOT NULL,       -- 单位（如：粒/瓶）
    image_url TEXT,
    buy_link TEXT,                 -- 外部购买链接
    precautions TEXT,              -- 服用注意事项 SOP
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Client Plans & Inventory (The Human Touch & The Daily Action)
-- 将方案与库存整合，支持按时段聚合
CREATE TABLE client_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    time_slot TEXT NOT NULL DEFAULT 'morning', -- morning, noon, evening, night, before_bed
    current_stock NUMERIC NOT NULL DEFAULT 0,  -- 当前实物库存 (支持 0.5 粒)
    dosage_per_time NUMERIC NOT NULL,          -- 每次服用量
    frequency_per_day INTEGER NOT NULL,        -- 每天次数
    alert_threshold_days INTEGER DEFAULT 3,    -- 预警阈值（天）
    is_active BOOLEAN DEFAULT TRUE,            -- 方案是否正在执行
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Client Core Goals (The Human Touch - 方案置顶)
CREATE TABLE client_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    goal_title TEXT NOT NULL,      -- 如：改善睡眠，提升精力
    contraindications TEXT[],      -- 禁忌食物/行为清单
    water_target_ml INTEGER DEFAULT 2000, -- 喝水目标
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Check-in Logs & Subjective Metrics (The Daily Action - 极速对齐)
CREATE TABLE checkin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    time_slot TEXT NOT NULL,       -- 打卡的时段包
    taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    energy_score INTEGER CHECK (energy_score BETWEEN 1 AND 10), -- 精力滑块评分
    is_auto_checkin BOOLEAN DEFAULT FALSE
);

-- 7. Health Metrics & The Mirror (客观趋势与隐私对比)
CREATE TABLE health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,     -- Weight, Waist, BloodSugar, SleepScore, etc.
    metric_value NUMERIC,
    metric_unit TEXT,
    image_url TEXT,                -- 对比照图片链接
    is_private BOOLEAN DEFAULT FALSE, -- 是否隐私加密预览
    insight_text TEXT,             -- 针对该指标的科普解读（如：线粒体修复中）
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Professional Feeds (The Human Touch - 专业投喂)
CREATE TABLE professional_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID REFERENCES practitioners(id),
    client_id UUID REFERENCES clients(id), -- 如果是 null 则代表发给所有客户
    title TEXT NOT NULL,
    content_url TEXT NOT NULL,     -- 文章链接或富文本内容
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Follow-up Notes (私有随访记录)
CREATE TABLE follow_up_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES practitioners(id),
    content TEXT NOT NULL,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

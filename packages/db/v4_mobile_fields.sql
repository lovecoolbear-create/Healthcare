-- HealthCare v4.0 Backend Fields Preparation
-- Date: 2026-03-05

-- 1. Ensure clients table has all necessary fields
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='gender') THEN
        ALTER TABLE clients ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));
    END IF;
END $$;

-- 2. Feedbacks Table (Communication & Subjective Metrics)
CREATE TABLE IF NOT EXISTS feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    practitioner_id UUID REFERENCES practitioners(id),
    content TEXT NOT NULL,
    sender_type TEXT CHECK (sender_type IN ('client', 'practitioner')),
    is_read BOOLEAN DEFAULT FALSE,
    
    -- v4.0 Subjective Feedback
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 5),
    gut_reaction TEXT CHECK (gut_reaction IN ('normal', 'bloating', 'diarrhea', 'constipation')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Weight Logs Table (Physiological Metrics)
CREATE TABLE IF NOT EXISTS weight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    weight_kg NUMERIC NOT NULL,
    body_fat_percentage NUMERIC,
    
    -- v4.0 Physiological Metrics
    visceral_fat_level NUMERIC,
    muscle_mass_kg NUMERIC,
    is_period BOOLEAN DEFAULT FALSE,
    is_special_event BOOLEAN DEFAULT FALSE,
    is_anomaly BOOLEAN DEFAULT FALSE,
    
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT DEFAULT 'manual'
);

-- 4. Check-in Logs Enhancement (Idempotency & Inventory Rollback)
DO $$ 
BEGIN
    -- Add slot_id for idempotency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checkin_logs' AND column_name='slot_id') THEN
        ALTER TABLE checkin_logs ADD COLUMN slot_id TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_slot_unique ON checkin_logs (client_id, slot_id) WHERE slot_id IS NOT NULL;
    END IF;

    -- Add action/product/taken status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checkin_logs' AND column_name='action_id') THEN
        ALTER TABLE checkin_logs ADD COLUMN action_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checkin_logs' AND column_name='product_id') THEN
        ALTER TABLE checkin_logs ADD COLUMN product_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checkin_logs' AND column_name='is_taken') THEN
        ALTER TABLE checkin_logs ADD COLUMN is_taken BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 5. Inventory Management Function (Handles deduction and rollback)
-- Note: This is a simplified representation of the logic to be implemented in Supabase Edge Functions or Triggers
/*
CREATE OR REPLACE FUNCTION handle_checkin_inventory() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.is_taken = TRUE) THEN
        -- Deduct inventory
        UPDATE client_inventory 
        SET current_stock = current_stock - dosage_per_time
        WHERE client_id = NEW.client_id AND product_id = NEW.product_id;
    ELSIF (TG_OP = 'UPDATE' AND OLD.is_taken = TRUE AND NEW.is_taken = FALSE) THEN
        -- Rollback inventory (Cancel check-in)
        UPDATE client_inventory 
        SET current_stock = current_stock + dosage_per_time
        WHERE client_id = NEW.client_id AND product_id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
*/

-- 6. Comments on columns for clarity
COMMENT ON COLUMN weight_logs.is_period IS '生理期标记 (仅女性)';
COMMENT ON COLUMN weight_logs.is_special_event IS '特殊事件标记 (大餐、熬夜、生病等)';
COMMENT ON COLUMN feedbacks.energy_level IS '精力水平 (1-5)';
COMMENT ON COLUMN feedbacks.gut_reaction IS '肠道反应 (正常/胀气/拉稀/便秘)';
COMMENT ON COLUMN checkin_logs.slot_id IS '打卡槽位唯一标识 (YYYY-MM-DD:slot_name)';

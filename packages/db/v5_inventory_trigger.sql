-- HealthCare v5.0 Inventory Atomic Deduction Trigger
-- Date: 2026-03-06
-- Description: Implements atomic inventory deduction/rollback based on check-in logs.

-- 1. Create the inventory handler function
CREATE OR REPLACE FUNCTION handle_checkin_inventory() RETURNS TRIGGER AS $$
DECLARE
    v_dosage NUMERIC;
    v_client_id UUID;
    v_product_id UUID;
    v_time_slot TEXT;
    v_is_taken BOOLEAN;
BEGIN
    -- Determine target values based on operation
    IF (TG_OP = 'DELETE') THEN
        v_client_id := OLD.client_id;
        v_product_id := OLD.product_id;
        v_time_slot := OLD.time_slot;
        v_is_taken := OLD.is_taken;
    ELSE
        v_client_id := NEW.client_id;
        v_product_id := NEW.product_id;
        v_time_slot := NEW.time_slot;
        v_is_taken := NEW.is_taken;
    END IF;

    -- 1. Get dosage from client_inventory
    -- Note: We match by client, product, and time_slot to ensure we update the correct plan row
    SELECT dosage_per_time INTO v_dosage 
    FROM client_inventory 
    WHERE client_id = v_client_id 
      AND product_id = v_product_id 
      AND time_slot = v_time_slot
    LIMIT 1;

    -- If no matching inventory record found, skip
    IF v_dosage IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 2. Handle Logic based on Operation Type
    
    -- INSERT: If taken, deduct inventory
    IF (TG_OP = 'INSERT') THEN
        IF (v_is_taken = TRUE) THEN
            UPDATE client_inventory 
            SET current_stock = GREATEST(0, current_stock - v_dosage),
                updated_at = NOW()
            WHERE client_id = v_client_id 
              AND product_id = v_product_id 
              AND time_slot = v_time_slot;
        END IF;
    
    -- UPDATE: Handle status changes (Cancellation or Re-taking)
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Case: Cancelled (Taken -> Not Taken)
        IF (OLD.is_taken = TRUE AND NEW.is_taken = FALSE) THEN
            UPDATE client_inventory 
            SET current_stock = current_stock + v_dosage,
                updated_at = NOW()
            WHERE client_id = v_client_id 
              AND product_id = v_product_id 
              AND time_slot = v_time_slot;
        
        -- Case: Re-taken (Not Taken -> Taken)
        ELSIF (OLD.is_taken = FALSE AND NEW.is_taken = TRUE) THEN
            UPDATE client_inventory 
            SET current_stock = GREATEST(0, current_stock - v_dosage),
                updated_at = NOW()
            WHERE client_id = v_client_id 
              AND product_id = v_product_id 
              AND time_slot = v_time_slot;
        END IF;

    -- DELETE: If it was taken, rollback inventory
    ELSIF (TG_OP = 'DELETE') THEN
        IF (v_is_taken = TRUE) THEN
            UPDATE client_inventory 
            SET current_stock = current_stock + v_dosage,
                updated_at = NOW()
            WHERE client_id = v_client_id 
              AND product_id = v_product_id 
              AND time_slot = v_time_slot;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS trg_checkin_inventory ON checkin_logs;
CREATE TRIGGER trg_checkin_inventory
AFTER INSERT OR UPDATE OR DELETE ON checkin_logs
FOR EACH ROW EXECUTE FUNCTION handle_checkin_inventory();

-- 3. Add safety constraint (Optional: Prevent negative stock if business rules require)
-- ALTER TABLE client_inventory ADD CONSTRAINT current_stock_non_negative CHECK (current_stock >= 0);

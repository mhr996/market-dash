-- First, make sure the shops table has a balance column
-- Run this if the balance column doesn't exist
-- ALTER TABLE shops ADD COLUMN IF NOT EXISTS balance DECIMAL DEFAULT 0;

-- MAIN FUNCTION: Update shop balance based on completed orders
CREATE OR REPLACE FUNCTION update_shop_balance(shop_id_param INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    new_balance DECIMAL := 0;
    order_record RECORD;
    payment_type TEXT;
    order_total DECIMAL;
BEGIN
    -- Loop through all completed orders for this shop
    FOR order_record IN 
        SELECT 
            o.id,
            o.payment_method,
            o.status,
            COALESCE(p.sale_price, p.price, 0) as total
        FROM orders o
        JOIN products p ON o.product_id = p.id
        WHERE p.shop = shop_id_param 
        AND o.status = 'completed'
        AND o.payment_method IS NOT NULL
    LOOP
        -- Parse the payment method JSON
        payment_type := order_record.payment_method->>'type';
        order_total := order_record.total;
        
        -- Add to balance for Credit Card and Bank Transfer
        IF payment_type IN ('Credit Card', 'Bank Transfer') THEN
            new_balance := new_balance + order_total;
        -- Subtract from balance for In-store and Cash on Delivery
        ELSIF payment_type IN ('In-store', 'Cash on Delivery') THEN
            new_balance := new_balance - order_total;
        END IF;
    END LOOP;
    
    -- Update the shop's balance
    UPDATE shops 
    SET balance = new_balance 
    WHERE id = shop_id_param;
    
    RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- ONE-TIME SETUP FUNCTION: Recalculate all shop balances
-- Run this ONCE to set up all existing shop balances
-- You can delete this function after running it once
CREATE OR REPLACE FUNCTION recalculate_all_shop_balances()
RETURNS VOID AS $$
DECLARE
    shop_record RECORD;
BEGIN
    -- Loop through all shops
    FOR shop_record IN SELECT id FROM shops LOOP
        PERFORM update_shop_balance(shop_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- AUTOMATIC TRIGGER: Updates balance when order status changes
-- This runs automatically - you don't need to call it
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    shop_id INTEGER;
BEGIN
    -- Only recalculate if status changed to/from completed
    IF (OLD.status != 'completed' AND NEW.status = 'completed') OR 
       (OLD.status = 'completed' AND NEW.status != 'completed') THEN
        
        -- Get the shop ID from the product
        SELECT p.shop INTO shop_id
        FROM products p
        WHERE p.id = NEW.product_id;
        
        -- Recalculate balance for the shop if we found it
        IF shop_id IS NOT NULL THEN
            PERFORM update_shop_balance(shop_id);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
CREATE TRIGGER order_status_change_trigger
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_order_status_change();

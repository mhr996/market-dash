import supabase from './supabase';

/**
 * Update shop balance based on completed orders
 * This is the main function you'll use - it calculates and updates the balance
 * for a specific shop based on their completed orders and payment methods
 *
 * @param shopId - The shop ID to update balance for
 * @returns The new balance amount
 */
export const updateShopBalance = async (shopId: number): Promise<number> => {
    try {
        const { data, error } = await supabase.rpc('update_shop_balance', {
            shop_id_param: shopId,
        });

        if (error) {
            console.error('Error updating shop balance:', error);
            throw error;
        }

        return data || 0;
    } catch (error) {
        console.error('Error updating shop balance:', error);
        throw error;
    }
};

/**
 * Recalculate all shop balances - ONE TIME SETUP FUNCTION
 *
 * WHAT IT DOES:
 * - Goes through ALL shops in your database
 * - Calculates the correct balance for each shop based on their completed orders
 * - Updates the balance column in the shops table
 *
 * WHEN TO USE:
 * - Run this ONCE when you first set up the balance system
 * - Run this if you ever need to "reset" all balances to be correct
 * - Run this if you think balances got messed up somehow
 *
 * CAN YOU DELETE IT LATER?
 * - YES! After running it once, you can delete this function
 * - The main updateShopBalance function will handle future updates automatically
 * - The database trigger will also handle updates automatically
 *
 * HOW TO USE:
 * 1. Run the SQL functions in Supabase first
 * 2. Call this function once: await recalculateAllShopBalances()
 * 3. Delete this function if you want (it's just for initial setup)
 */
export const recalculateAllShopBalances = async (): Promise<void> => {
    try {
        const { error } = await supabase.rpc('recalculate_all_shop_balances');

        if (error) {
            console.error('Error recalculating all shop balances:', error);
            throw error;
        }

        console.log('✅ All shop balances recalculated successfully!');
    } catch (error) {
        console.error('Error recalculating all shop balances:', error);
        throw error;
    }
};

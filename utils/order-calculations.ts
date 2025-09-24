// Utility functions for calculating order totals consistently across the app

export interface OrderWithCalculations {
    products?: {
        price: number;
    };
    delivery_methods?: {
        price: number;
    };
    delivery_location_methods?: {
        price_addition: number;
    };
    selected_features?: Array<{
        price_addition: number;
    }>;
}

/**
 * Calculate the subtotal (product price only)
 */
export const calculateOrderSubtotal = (order: OrderWithCalculations): number => {
    return order.products?.price || 0;
};

/**
 * Calculate delivery fee (base price + location addition)
 */
export const calculateOrderDeliveryFee = (order: OrderWithCalculations): number => {
    if (!order.delivery_methods) return 0;
    const basePrice = order.delivery_methods.price || 0;
    const locationAddition = order.delivery_location_methods?.price_addition || 0;
    return basePrice + locationAddition;
};

/**
 * Calculate features total (sum of all feature price additions)
 */
export const calculateOrderFeaturesTotal = (order: OrderWithCalculations): number => {
    if (!order.selected_features) return 0;
    return order.selected_features.reduce((sum, feature) => sum + (feature.price_addition || 0), 0);
};

/**
 * Calculate the total order amount including product price, delivery, and features
 */
export const calculateOrderTotal = (order: OrderWithCalculations): number => {
    const subtotal = calculateOrderSubtotal(order);
    const deliveryFee = calculateOrderDeliveryFee(order);
    const featuresTotal = calculateOrderFeaturesTotal(order);
    return subtotal + deliveryFee + featuresTotal;
};

/**
 * Check if an order has delivery or features that affect the total
 */
export const hasOrderAdditions = (order: OrderWithCalculations): boolean => {
    return !!(order.delivery_methods || (order.selected_features && order.selected_features.length > 0));
};

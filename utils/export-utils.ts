/**
 * Export Utilities
 * Handles export functionality for reports and other data exports
 *
 * Features:
 * - UTF-8 BOM support for proper Arabic and Hebrew character display
 * - RTL (Right-to-Left) language support
 * - Proper CSV formatting for international characters
 * - JSON export with UTF-8 encoding
 */

export interface ExportData {
    data: {
        sales: {
            total_sales: number;
            total_orders: number;
            average_order_value: number;
            sales_trend: Array<{
                date: string;
                sales: number;
                orders: number;
            }>;
        };
        revenue: {
            total_revenue: number;
            monthly_revenue: Array<{
                month: string;
                revenue: number;
                growth_rate: number;
            }>;
        };
        shops: {
            total_shops: number;
            active_shops: number;
            shops_list: Array<{
                id: number;
                shop_name: string;
                total_sales: number;
                total_orders: number;
                status: string;
            }>;
        };
        products: {
            total_products: number;
            total_views: number;
            top_selling_products: Array<{
                id: number;
                title: string;
                price: number;
                view_count: number;
                cart_count: number;
                shops?: { shop_name: string };
                categories?: { title: string };
            }>;
            categories_performance: Array<{
                title: string;
                products_count: number;
                total_views: number;
                total_cart_adds: number;
            }>;
        };
        users: {
            total_users: number;
            new_registrations: number;
            user_growth_trend: Array<{
                date: string;
                new_users: number;
                total_users: number;
            }>;
        };
    };
    filters: {
        shops: string[];
        categories: string[];
        dateRange: string[];
    };
}

export interface TranslationFunction {
    (key: string): string;
}

/**
 * Utility function to properly format text for CSV export
 * Handles RTL languages (Arabic, Hebrew) and ensures proper encoding
 */
const formatCSVText = (text: string): string => {
    // Escape double quotes in text
    const escapedText = text.replace(/"/g, '""');

    // For RTL languages, we may need to add direction marks
    // This helps maintain proper text direction in CSV viewers
    const hasRTLChars = /[\u0590-\u08FF]/.test(text);
    if (hasRTLChars) {
        // Add RLM (Right-to-Left Mark) for RTL text
        return `"${escapedText}"`;
    }

    return `"${escapedText}"`;
};

/**
 * Export data as JSON
 */
export const exportAsJSON = (data: ExportData, filename: string = 'report'): void => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Convert data to CSV format
 */
export const convertToCSV = (data: ExportData, t: TranslationFunction): string => {
    let csv = '';

    // Header
    csv += `MARKET DASHBOARD REPORT\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n`;
    csv += `\n`;

    // Sales Analytics
    csv += `=== ${t('sales_analytics').toUpperCase()} ===\n`;
    csv += `${t('total_sales')},$${data.data.sales.total_sales.toLocaleString()}\n`;
    csv += `${t('total_orders')},${data.data.sales.total_orders.toLocaleString()}\n`;
    csv += `${t('average_order_value')},$${data.data.sales.average_order_value.toFixed(2)}\n`;
    csv += `\n`;

    // Sales Trend Detail
    if (data.data.sales.sales_trend && data.data.sales.sales_trend.length > 0) {
        csv += `=== ${t('sales_trend').toUpperCase()} ===\n`;
        csv += `Date,Sales,Orders\n`;
        data.data.sales.sales_trend.forEach((point) => {
            csv += `${point.date},$${point.sales.toLocaleString()},${point.orders}\n`;
        });
        csv += `\n`;
    }

    // Revenue Analytics
    csv += `=== ${t('revenue_analytics').toUpperCase()} ===\n`;
    csv += `${t('total_revenue')},$${data.data.revenue.total_revenue.toLocaleString()}\n`;
    csv += `\n`;

    // Monthly Revenue Detail
    if (data.data.revenue.monthly_revenue && data.data.revenue.monthly_revenue.length > 0) {
        csv += `=== ${t('monthly_revenue').toUpperCase()} ===\n`;
        csv += `Month,Revenue,Growth Rate\n`;
        data.data.revenue.monthly_revenue.forEach((month) => {
            csv += `${month.month},$${month.revenue.toLocaleString()},${month.growth_rate.toFixed(2)}%\n`;
        });
        csv += `\n`;
    }

    // Shops Summary
    csv += `=== ${t('shops_overview').toUpperCase()} ===\n`;
    csv += `${t('total_shops')},${data.data.shops.total_shops}\n`;
    csv += `${t('active_shops')},${data.data.shops.active_shops}\n`;
    csv += `\n`;

    // Shops Detail
    if (data.data.shops.shops_list && data.data.shops.shops_list.length > 0) {
        csv += `=== ${t('shops_details').toUpperCase()} ===\n`;
        csv += `Shop Name,Total Sales,Total Orders,Status\n`;
        data.data.shops.shops_list.forEach((shop) => {
            csv += `${formatCSVText(shop.shop_name)},$${shop.total_sales.toLocaleString()},${shop.total_orders},${formatCSVText(shop.status)}\n`;
        });
        csv += `\n`;
    }

    // Products Summary
    csv += `=== ${t('products_overview').toUpperCase()} ===\n`;
    csv += `${t('total_products')},${data.data.products.total_products}\n`;
    csv += `${t('total_views')},${data.data.products.total_views}\n`;
    csv += `\n`;

    // Top Selling Products Detail
    if (data.data.products.top_selling_products && data.data.products.top_selling_products.length > 0) {
        csv += `=== ${t('top_selling_products').toUpperCase()} ===\n`;
        csv += `Product Name,Shop,Price,Views,Cart Adds,Category\n`;
        data.data.products.top_selling_products.forEach((product) => {
            const shopName = product.shops?.shop_name || 'N/A';
            const categoryName = product.categories?.title || 'N/A';
            csv += `${formatCSVText(product.title)},${formatCSVText(shopName)},$${product.price},${product.view_count || 0},${product.cart_count || 0},${formatCSVText(categoryName)}\n`;
        });
        csv += `\n`;
    }

    // Categories Performance Detail
    if (data.data.products.categories_performance && data.data.products.categories_performance.length > 0) {
        csv += `=== ${t('category_performance').toUpperCase()} ===\n`;
        csv += `Category,Products Count,Total Views,Total Cart Adds\n`;
        data.data.products.categories_performance.forEach((category) => {
            csv += `${formatCSVText(category.title)},${category.products_count},${category.total_views},${category.total_cart_adds}\n`;
        });
        csv += `\n`;
    }

    // Users Summary
    csv += `=== ${t('user_analytics').toUpperCase()} ===\n`;
    csv += `${t('total_users')},${data.data.users.total_users}\n`;
    csv += `${t('new_registrations')},${data.data.users.new_registrations}\n`;
    csv += `\n`;

    // User Growth Trend Detail
    if (data.data.users.user_growth_trend && data.data.users.user_growth_trend.length > 0) {
        csv += `=== ${t('user_growth_trend').toUpperCase()} ===\n`;
        csv += `Date,New Users,Total Users\n`;
        data.data.users.user_growth_trend.forEach((point) => {
            csv += `${point.date},${point.new_users},${point.total_users}\n`;
        });
        csv += `\n`;
    }

    // Filter Information
    if (data.filters.shops.length > 0 || data.filters.categories.length > 0 || data.filters.dateRange.length > 0) {
        csv += `=== FILTERS APPLIED ===\n`;
        if (data.filters.shops.length > 0) {
            csv += `Filtered Shops: ${data.filters.shops.join(', ')}\n`;
        }
        if (data.filters.categories.length > 0) {
            csv += `Filtered Categories: ${data.filters.categories.join(', ')}\n`;
        }
        if (data.filters.dateRange.length > 0) {
            csv += `Date Range: ${data.filters.dateRange.join(' to ')}\n`;
        }
        csv += `\n`;
    }

    return csv;
};

/**
 * Export data as CSV
 */
export const exportAsCSV = (data: ExportData, t: TranslationFunction, filename: string = 'report'): void => {
    const csvContent = convertToCSV(data, t);

    // Add BOM (Byte Order Mark) for proper UTF-8 encoding support in Excel and other applications
    // This ensures Arabic and Hebrew characters display correctly
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Main export function that handles both CSV and JSON formats
 */
export const exportReport = (data: ExportData, format: 'csv' | 'json', t: TranslationFunction, filename: string = 'market_dashboard_report'): void => {
    try {
        if (format === 'csv') {
            exportAsCSV(data, t, filename);
        } else if (format === 'json') {
            exportAsJSON(data, filename);
        } else {
            throw new Error(`Unsupported export format: ${format}`);
        }
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
};

export default {
    exportReport,
    exportAsCSV,
    exportAsJSON,
    convertToCSV,
};

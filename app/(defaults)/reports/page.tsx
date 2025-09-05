'use client';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import { getTranslation } from '@/i18n';
import IconDownload from '@/components/icon/icon-download';
import IconCalendar from '@/components/icon/icon-calendar';
import IconBarChart from '@/components/icon/icon-bar-chart';
import IconChartSquare from '@/components/icon/icon-chart-square';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconTrendingDown from '@/components/icon/icon-trending-down';
import IconEye from '@/components/icon/icon-eye';
import IconSettings from '@/components/icon/icon-settings';
import IconRefresh from '@/components/icon/icon-refresh';
import IconUser from '@/components/icon/icon-user';
import IconBox from '@/components/icon/icon-box';
import IconArrowForward from '@/components/icon/icon-arrow-forward';
import IconCaretDown from '@/components/icon/icon-caret-down';
import supabase from '@/lib/supabase';
import SafeApexChart from '@/components/charts/safe-apex-chart';
import MultiSelect from '@/components/multi-select';
import DateRangeSelector from '@/components/date-range-selector';
import Tabs from '@/components/tabs';
import { exportReport as exportReportUtil, type ExportData } from '@/utils/export-utils';

interface ReportData {
    sales: {
        total_revenue: number;
        total_orders: number;
        average_order_value: number;
        growth_rate: number;
        monthly_revenue: Array<{ month: string; revenue: number }>;
    };
    shops: {
        total_shops: number;
        active_shops: number;
        shop_earnings: ShopEarning[];
        top_performing_shops: TopShop[];
    };
    products: {
        total_products: number;
        total_views: number;
        top_selling_products: TopProduct[];
        categories_performance: CategoryPerformance[];
    };
    users: {
        total_users: number;
        new_registrations: number;
        user_growth_trend: UserGrowthPoint[];
    };
}

interface ShopEarning {
    shop_id: number;
    shop_name: string;
    total_revenue: number;
    total_orders: number;
    commission_earned: number;
    logo_url?: string;
    growth_rate?: number;
}

interface TopShop {
    id: number;
    shop_name: string;
    owner_name: string;
    total_revenue: number;
    order_count: number;
    logo_url?: string;
    category_name?: string;
    growth_rate?: number;
}

interface TopProduct {
    id: number;
    title: string;
    shop_name: string;
    total_sales: number;
    revenue: number;
    views: number;
    image_url?: string;
    growth_rate?: number;
}

interface CategoryPerformance {
    category_name: string;
    product_count: number;
    total_sales: number;
    revenue: number;
    growth_rate?: number;
}

interface UserGrowthPoint {
    date: string;
    count: number;
}

const Reports = () => {
    const { t } = getTranslation();
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme) === 'dark';
    const [isMounted, setIsMounted] = useState(false);

    // State management
    const [reportData, setReportData] = useState<ReportData>({
        sales: {
            total_revenue: 0,
            total_orders: 0,
            average_order_value: 0,
            growth_rate: 0,
            monthly_revenue: [],
        },
        shops: {
            total_shops: 0,
            active_shops: 0,
            shop_earnings: [],
            top_performing_shops: [],
        },
        products: {
            total_products: 0,
            total_views: 0,
            top_selling_products: [],
            categories_performance: [],
        },
        users: {
            total_users: 0,
            new_registrations: 0,
            user_growth_trend: [],
        },
    });

    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<Date[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [selectedShops, setSelectedShops] = useState<number[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [exportFormat, setExportFormat] = useState('csv');
    const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');

    // Comparison feature
    const [comparisonMode, setComparisonMode] = useState(false);
    const [comparisonShop1, setComparisonShop1] = useState<number | null>(null);
    const [comparisonShop2, setComparisonShop2] = useState<number | null>(null);

    // Available filters
    const [availableShops, setAvailableShops] = useState<any[]>([]);
    const [availableCategories, setAvailableCategories] = useState<any[]>([]);

    // Tab configuration
    const tabs = [
        { name: t('overview'), icon: 'chart-square' },
        { name: t('sales_analytics'), icon: 'trending-up' },
        { name: t('shop_performance'), icon: 'store' },
        { name: t('product_insights'), icon: 'box' },
        { name: t('user_analytics'), icon: 'user' },
        { name: t('comparison'), icon: 'arrow-forward' },
    ];

    useEffect(() => {
        setIsMounted(true);
        fetchReportData();
        fetchFilterOptions();
    }, []);

    useEffect(() => {
        fetchReportData();
    }, [dateRange, selectedShops, selectedCategories]);

    const fetchFilterOptions = async () => {
        try {
            const [shopsResult, categoriesResult] = await Promise.all([supabase.from('shops').select('id, shop_name, logo_url'), supabase.from('categories').select('id, title')]);

            setAvailableShops(shopsResult.data || []);
            setAvailableCategories(categoriesResult.data || []);
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const startDate = dateRange.length > 0 ? dateRange[0].toISOString() : null;
            const endDate = dateRange.length > 1 ? dateRange[1].toISOString() : null;
            const shopFilter = selectedShops.length > 0 ? selectedShops : null;
            const categoryFilter = selectedCategories.length > 0 ? selectedCategories : null;

            // Fetch orders data with product information for revenue calculation
            let ordersQuery = supabase.from('orders').select(`
                    *,
                    products(id, title, price, shop, shops(id, shop_name))
                `);
            if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
            if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate);

            const { data: orders } = await ordersQuery;

            // Fetch shops data
            let shopsQuery = supabase.from('shops').select('*, profiles(full_name)');
            if (shopFilter) shopsQuery = shopsQuery.in('id', shopFilter);

            const { data: shops } = await shopsQuery;

            // Fetch products data
            let productsQuery = supabase.from('products').select('*, categories(title), shops(shop_name)');
            if (shopFilter) productsQuery = productsQuery.in('shop', shopFilter);
            if (categoryFilter) productsQuery = productsQuery.in('category', categoryFilter);

            const { data: products } = await productsQuery;

            // Fetch users data
            let usersQuery = supabase.from('profiles').select('*');
            if (startDate) usersQuery = usersQuery.gte('registration_date', startDate);
            if (endDate) usersQuery = usersQuery.lte('registration_date', endDate);

            const { data: users } = await usersQuery;

            // Fetch categories data
            const { data: categories } = await supabase.from('categories').select('*');

            // Process the data
            const processedData = processReportData(orders || [], shops || [], products || [], users || [], categories || []);
            setReportData(processedData);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processReportData = (orders: any[], shops: any[], products: any[], users: any[], categories: any[]): ReportData => {
        // Calculate sales metrics using product prices
        const totalRevenue = orders.reduce((sum, order) => sum + (order.products?.price || 0), 0);
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calculate growth rate by comparing with previous period
        const currentDate = new Date();
        const previousPeriodStart = new Date(currentDate);
        previousPeriodStart.setMonth(currentDate.getMonth() - 1);

        const previousPeriodOrders = orders.filter((order) => {
            const orderDate = new Date(order.created_at);
            return orderDate >= previousPeriodStart && orderDate < currentDate;
        });

        const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.products?.price || 0), 0);
        const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        // Calculate monthly revenue trend
        const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
            const month = new Date();
            month.setMonth(month.getMonth() - (11 - i));
            const monthName = month.toLocaleDateString('en', { month: 'short' });

            const monthlyOrders = orders.filter((order) => {
                if (!order.created_at) return false;
                const orderDate = new Date(order.created_at);
                return orderDate.getMonth() === month.getMonth() && orderDate.getFullYear() === month.getFullYear();
            });

            const revenue = monthlyOrders.reduce((sum, order) => sum + (order.products?.price || 0), 0);
            return { month: monthName, revenue };
        });

        // Calculate shop earnings with growth rates
        const shopEarnings: ShopEarning[] = shops
            .map((shop) => {
                const shopOrders = orders.filter((order) => order.products?.shop === shop.id);
                const revenue = shopOrders.reduce((sum, order) => sum + (order.products?.price || 0), 0);
                const commission = revenue * 0.1; // Assuming 10% commission

                // Calculate growth for this shop
                const previousShopOrders = previousPeriodOrders.filter((order) => order.products?.shop === shop.id);
                const previousShopRevenue = previousShopOrders.reduce((sum, order) => sum + (order.products?.price || 0), 0);
                const shopGrowthRate = previousShopRevenue > 0 ? ((revenue - previousShopRevenue) / previousShopRevenue) * 100 : 0;

                return {
                    shop_id: shop.id,
                    shop_name: shop.shop_name || 'Unknown Shop',
                    total_revenue: revenue,
                    total_orders: shopOrders.length,
                    commission_earned: commission,
                    logo_url: shop.logo_url,
                    growth_rate: shopGrowthRate,
                };
            })
            .sort((a, b) => b.total_revenue - a.total_revenue);

        // Calculate top performing shops
        const topPerformingShops: TopShop[] = shopEarnings.slice(0, 10).map((earning) => {
            const shop = shops.find((s) => s.id === earning.shop_id);
            return {
                id: earning.shop_id,
                shop_name: earning.shop_name,
                owner_name: shop?.profiles?.full_name || 'Unknown Owner',
                total_revenue: earning.total_revenue,
                order_count: earning.total_orders,
                logo_url: earning.logo_url,
                growth_rate: earning.growth_rate,
            };
        });

        // Calculate top selling products based on actual orders
        const productSalesMap = new Map();
        orders.forEach((order) => {
            if (order.products) {
                const productId = order.products.id;
                if (productSalesMap.has(productId)) {
                    const existing = productSalesMap.get(productId);
                    existing.sales += 1;
                    existing.revenue += order.products.price || 0;
                } else {
                    productSalesMap.set(productId, {
                        product: order.products,
                        sales: 1,
                        revenue: order.products.price || 0,
                    });
                }
            }
        });

        const topSellingProducts: TopProduct[] = Array.from(productSalesMap.values())
            .map((item) => {
                const product = products.find((p) => p.id === item.product.id) || item.product;
                return {
                    id: item.product.id,
                    title: item.product.title || 'Unknown Product',
                    shop_name: item.product.shops?.shop_name || 'Unknown Shop',
                    total_sales: item.sales,
                    revenue: item.revenue,
                    views: product.view_count || 0,
                    image_url: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
                };
            })
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Calculate category performance based on actual orders
        const categoriesPerformance: CategoryPerformance[] = categories
            .map((category) => {
                const categoryProducts = products.filter((product) => product.category === category.id);

                // Calculate actual sales and revenue for this category
                let totalSales = 0;
                let revenue = 0;

                categoryProducts.forEach((product) => {
                    const productOrders = orders.filter((order) => order.products?.id === product.id);
                    totalSales += productOrders.length;
                    revenue += productOrders.reduce((sum, order) => sum + (order.products?.price || 0), 0);
                });

                return {
                    category_name: category.title || 'Unknown Category',
                    product_count: categoryProducts.length,
                    total_sales: totalSales,
                    revenue: revenue,
                };
            })
            .sort((a, b) => b.revenue - a.revenue);

        // Calculate user growth trend
        const userGrowthTrend: UserGrowthPoint[] = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().split('T')[0];

            const usersOnDay = users.filter((user) => {
                if (!user.registration_date) return false;
                const regDate = new Date(user.registration_date);
                return regDate.toISOString().split('T')[0] === dateString;
            }).length;

            userGrowthTrend.push({
                date: dateString,
                count: usersOnDay,
            });
        }

        return {
            sales: {
                total_revenue: totalRevenue,
                total_orders: totalOrders,
                average_order_value: averageOrderValue,
                growth_rate: growthRate,
                monthly_revenue: monthlyRevenue,
            },
            shops: {
                total_shops: shops.length,
                active_shops: shops.filter((shop) => shop.status === 'active' || !shop.status).length,
                shop_earnings: shopEarnings,
                top_performing_shops: topPerformingShops,
            },
            products: {
                total_products: products.length,
                total_views: products.reduce((sum, product) => sum + (product.view_count || 0), 0),
                top_selling_products: topSellingProducts,
                categories_performance: categoriesPerformance,
            },
            users: {
                total_users: users.length,
                new_registrations: users.filter((user) => {
                    if (!user.registration_date) return false;
                    const regDate = new Date(user.registration_date);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return regDate >= thirtyDaysAgo;
                }).length,
                user_growth_trend: userGrowthTrend,
            },
        };
    };

    const exportReport = async () => {
        try {
            if (!reportData) {
                console.error('No data to export');
                return;
            }

            // Transform the data to match the ExportData interface
            const exportData: ExportData = {
                data: {
                    sales: {
                        total_sales: reportData.sales.total_revenue,
                        total_orders: reportData.sales.total_orders,
                        average_order_value: reportData.sales.average_order_value,
                        sales_trend: reportData.sales.monthly_revenue.map((item) => ({
                            date: item.month,
                            sales: item.revenue,
                            orders: 0, // This field is not available in current data
                        })),
                    },
                    revenue: {
                        total_revenue: reportData.sales.total_revenue,
                        monthly_revenue: reportData.sales.monthly_revenue.map((item) => ({
                            month: item.month,
                            revenue: item.revenue,
                            growth_rate: 0, // This field is not available in current data
                        })),
                    },
                    shops: {
                        total_shops: reportData.shops.total_shops,
                        active_shops: reportData.shops.active_shops,
                        shops_list: reportData.shops.top_performing_shops.map((shop) => ({
                            id: shop.id,
                            shop_name: shop.shop_name,
                            total_sales: shop.total_revenue,
                            total_orders: shop.order_count,
                            status: 'active',
                        })),
                    },
                    products: {
                        total_products: reportData.products.total_products,
                        total_views: reportData.products.total_views,
                        top_selling_products: reportData.products.top_selling_products.map((product) => ({
                            id: product.id,
                            title: product.title,
                            price: product.revenue / (product.total_sales || 1),
                            view_count: product.views,
                            cart_count: 0,
                            shops: { shop_name: product.shop_name },
                            categories: { title: 'N/A' },
                        })),
                        categories_performance: reportData.products.categories_performance.map((category) => ({
                            title: category.category_name,
                            products_count: category.product_count,
                            total_views: 0,
                            total_cart_adds: 0,
                        })),
                    },
                    users: {
                        total_users: reportData.users.total_users,
                        new_registrations: reportData.users.new_registrations,
                        user_growth_trend: reportData.users.user_growth_trend.map((point) => ({
                            date: point.date,
                            new_users: point.count,
                            total_users: point.count,
                        })),
                    },
                },
                filters: {
                    shops: selectedShops.map((id) => id.toString()),
                    categories: selectedCategories.map((id) => id.toString()),
                    dateRange: dateRange.length === 2 ? [dateRange[0].toISOString(), dateRange[1].toISOString()] : [],
                },
            };

            exportReportUtil(exportData, exportFormat as 'csv' | 'json', t, 'market_dashboard_report');
        } catch (error) {
            console.error('Error exporting report:', error);
        }
    };

    const convertToCSV = (data: any) => {
        const { t } = getTranslation();
        let csv = '';

        // Report Header
        csv += `${t('reports')} - ${new Date().toLocaleDateString()}\n`;
        csv += `Generated: ${new Date().toLocaleString()}\n`;

        if (data.date_range) {
            csv += `Date Range: ${new Date(data.date_range.start).toLocaleDateString()} - ${new Date(data.date_range.end).toLocaleDateString()}\n`;
        }

        csv += '\n';

        // Sales Summary
        csv += `=== ${t('sales_analytics').toUpperCase()} ===\n`;
        csv += `${t('total_sales')},$${data.data.sales.total_revenue.toFixed(2)}\n`;
        csv += `${t('total_orders')},${data.data.sales.total_orders}\n`;
        csv += `${t('average_order_value')},$${data.data.sales.average_order_value.toFixed(2)}\n`;
        csv += `${t('growth_rate')},${data.data.sales.growth_rate.toFixed(2)}%\n`;
        csv += '\n';

        // Monthly Revenue Detail
        if (data.data.sales.monthly_revenue && data.data.sales.monthly_revenue.length > 0) {
            csv += `=== ${t('monthly_revenue').toUpperCase()} ===\n`;
            csv += `Month,Revenue\n`;
            data.data.sales.monthly_revenue.forEach((item: any) => {
                csv += `${item.month},$${item.revenue.toFixed(2)}\n`;
            });
            csv += '\n';
        }

        // Shops Summary
        csv += `=== ${t('shops_overview').toUpperCase()} ===\n`;
        csv += `${t('total_shops')},${data.data.shops.total_shops}\n`;
        csv += `${t('active_shops')},${data.data.shops.active_shops}\n`;
        csv += '\n';

        // Top Performing Shops Detail
        if (data.data.shops.top_performing_shops && data.data.shops.top_performing_shops.length > 0) {
            csv += `=== ${t('top_performing_shops').toUpperCase()} ===\n`;
            csv += `Shop Name,Owner,Revenue,Orders,Products,Visit Count\n`;
            data.data.shops.top_performing_shops.forEach((shop: any) => {
                const ownerName = shop.profiles?.full_name || 'N/A';
                const revenue = shop.shop_earnings?.[0]?.total_earnings || 0;
                const orders = shop._count?.orders || 0;
                const products = shop._count?.products || 0;
                const visits = shop.visit_count || 0;
                csv += `"${shop.shop_name}","${ownerName}",$${revenue.toFixed(2)},${orders},${products},${visits}\n`;
            });
            csv += '\n';
        }

        // Products Summary
        csv += `=== ${t('products_overview').toUpperCase()} ===\n`;
        csv += `${t('total_products')},${data.data.products.total_products}\n`;
        csv += `${t('total_views')},${data.data.products.total_views}\n`;
        csv += '\n';

        // Top Selling Products Detail
        if (data.data.products.top_selling_products && data.data.products.top_selling_products.length > 0) {
            csv += `=== ${t('top_selling_products').toUpperCase()} ===\n`;
            csv += `Product Name,Shop,Price,Views,Cart Adds,Category\n`;
            data.data.products.top_selling_products.forEach((product: any) => {
                const shopName = product.shops?.shop_name || 'N/A';
                const categoryName = product.categories?.title || 'N/A';
                csv += `"${product.title}","${shopName}",$${product.price},${product.view_count || 0},${product.cart_count || 0},"${categoryName}"\n`;
            });
            csv += '\n';
        }

        // Categories Performance Detail
        if (data.data.products.categories_performance && data.data.products.categories_performance.length > 0) {
            csv += `=== ${t('category_performance').toUpperCase()} ===\n`;
            csv += `Category,Products Count,Total Views,Total Cart Adds\n`;
            data.data.products.categories_performance.forEach((category: any) => {
                csv += `"${category.title}",${category.products_count},${category.total_views},${category.total_cart_adds}\n`;
            });
            csv += '\n';
        }

        // Users Summary
        csv += `=== ${t('user_analytics').toUpperCase()} ===\n`;
        csv += `${t('total_users')},${data.data.users.total_users}\n`;
        csv += `${t('new_registrations')},${data.data.users.new_registrations}\n`;
        csv += '\n';

        // User Growth Trend Detail
        if (data.data.users.user_growth_trend && data.data.users.user_growth_trend.length > 0) {
            csv += `=== ${t('user_growth_trend').toUpperCase()} ===\n`;
            csv += `Date,New Users,Total Users\n`;
            data.data.users.user_growth_trend.forEach((point: any) => {
                csv += `${point.date},${point.new_users},${point.total_users}\n`;
            });
            csv += '\n';
        }

        // Filter Information
        if (data.filters.shops.length > 0 || data.filters.categories.length > 0) {
            csv += `=== FILTERS APPLIED ===\n`;
            if (data.filters.shops.length > 0) {
                csv += `Filtered Shops: ${data.filters.shops.join(', ')}\n`;
            }
            if (data.filters.categories.length > 0) {
                csv += `Filtered Categories: ${data.filters.categories.join(', ')}\n`;
            }
        }

        return csv;
    };

    const clearFilters = () => {
        setDateRange([]);
        setSelectedShops([]);
        setSelectedCategories([]);
        setActiveTab(0);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className={`panel border-white-light px-6 py-6 shadow-[4px_6px_10px_-3px_#bfc9d4] dark:border-[#1b2e4b] dark:shadow-none ${isRtl ? 'rtl' : 'ltr'}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-black dark:text-white-light">{t('reports')}</h1>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('reports_subtitle')}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button type="button" className="btn btn-primary gap-2" onClick={exportReport} disabled={loading}>
                            <IconDownload className="h-4 w-4" />
                            {t('export_report')}
                        </button>
                        <button type="button" className="btn btn-outline-primary gap-2" onClick={fetchReportData} disabled={loading}>
                            <IconRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            {t('refresh')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters Panel */}
            <div className={`panel ${isRtl ? 'rtl' : 'ltr'}`}>
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <IconSettings className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold text-black dark:text-white-light">{t('filters')}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Date Range Filter */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('date_range')}</label>
                        <DateRangeSelector value={dateRange} onChange={setDateRange} placeholder={t('select_date_range')} isRtl={isRtl} />
                    </div>

                    {/* Export Format */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('export_format')}</label>
                        <div className="relative">
                            <select className="form-select appearance-none pr-10" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                                <option value="csv">CSV (Detailed Report)</option>
                                <option value="json">JSON</option>
                            </select>
                            <IconCaretDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                        <button type="button" className="btn btn-outline-danger w-full" onClick={clearFilters}>
                            <IconRefresh className="h-4 w-4 mx-2" />
                            {t('clear_filters')}
                        </button>
                    </div>
                </div>

                {/* Advanced Filters */}
                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {/* Shop Filter */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('filter_by_shops')}</label>
                        <MultiSelect
                            options={availableShops.map((shop) => ({ id: shop.id, name: shop.shop_name, logo_url: shop.logo_url }))}
                            selectedValues={selectedShops}
                            onChange={setSelectedShops}
                            placeholder={t('select_shops')}
                            isRtl={isRtl}
                        />
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('filter_by_categories')}</label>
                        <MultiSelect
                            options={availableCategories.map((category) => ({ id: category.id, name: category.title }))}
                            selectedValues={selectedCategories}
                            onChange={setSelectedCategories}
                            placeholder={t('select_categories')}
                            isRtl={isRtl}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className={`panel ${isRtl ? 'rtl' : 'ltr'}`}>
                <Tabs tabs={tabs} activeTab={activeTab} onTabClick={setActiveTab} />
            </div>

            {/* Loading State */}
            {loading && (
                <div className="panel">
                    <div className="flex h-64 items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary border-l-transparent"></div>
                            <p className="mt-4 text-gray-600 dark:text-gray-400">{t('loading_report_data')}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Content */}
            {!loading && (
                <div className="space-y-6">
                    {/* Overview Tab */}
                    {activeTab === 0 && (
                        <div className="space-y-6">
                            {/* Overview Cards */}
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {/* Sales Card */}
                                <div className="panel group hover:shadow-lg transition-shadow duration-300">
                                    <div className="mb-5 flex items-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg">
                                            <IconDollarSign className="h-6 w-6" />
                                        </div>
                                        <div className={`${isRtl ? 'mr-4' : 'ml-4'}`}>
                                            <h5 className="text-lg font-semibold dark:text-white-light">{t('total_sales')}</h5>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('revenue_overview')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-2xl font-bold text-black dark:text-white">${reportData.sales.total_revenue.toLocaleString()}</div>
                                        <div
                                            className={`flex items-center text-sm px-2 py-1 rounded-full ${
                                                reportData.sales.growth_rate >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                            }`}
                                        >
                                            {reportData.sales.growth_rate >= 0 ? <IconTrendingUp className="h-3 w-3 mr-1" /> : <IconTrendingDown className="h-3 w-3 mr-1" />}
                                            {Math.abs(reportData.sales.growth_rate).toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {t('total_orders')}: {reportData.sales.total_orders.toLocaleString()}
                                    </div>
                                </div>

                                {/* Shops Card */}
                                <div className="panel group hover:shadow-lg transition-shadow duration-300">
                                    <div className="mb-5 flex items-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-warning to-warning/80 text-white shadow-lg">
                                            <IconShoppingCart className="h-6 w-6" />
                                        </div>
                                        <div className={`${isRtl ? 'mr-4' : 'ml-4'}`}>
                                            <h5 className="text-lg font-semibold dark:text-white-light">{t('active_shops')}</h5>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('shops_overview')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-2xl font-bold text-black dark:text-white">{reportData.shops.active_shops}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            /{reportData.shops.total_shops} {t('total')}
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                        <div
                                            className="bg-warning h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${(reportData.shops.active_shops / reportData.shops.total_shops) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Products Card */}
                                <div className="panel group hover:shadow-lg transition-shadow duration-300">
                                    <div className="mb-5 flex items-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-info to-info/80 text-white shadow-lg">
                                            <IconBox className="h-6 w-6" />
                                        </div>
                                        <div className={`${isRtl ? 'mr-4' : 'ml-4'}`}>
                                            <h5 className="text-lg font-semibold dark:text-white-light">{t('total_products')}</h5>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('products_overview')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-2xl font-bold text-black dark:text-white">{reportData.products.total_products.toLocaleString()}</div>
                                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                            <IconEye className="h-3 w-3" />
                                            {t('views')}
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {reportData.products.total_views.toLocaleString()} {t('total_views')}
                                    </div>
                                </div>

                                {/* Users Card */}
                                <div className="panel group hover:shadow-lg transition-shadow duration-300">
                                    <div className="mb-5 flex items-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-success to-success/80 text-white shadow-lg">
                                            <IconUser className="h-6 w-6" />
                                        </div>
                                        <div className={`${isRtl ? 'mr-4' : 'ml-4'}`}>
                                            <h5 className="text-lg font-semibold dark:text-white-light">{t('total_users')}</h5>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('users_overview')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-2xl font-bold text-black dark:text-white">{reportData.users.total_users.toLocaleString()}</div>
                                        <div className="text-sm text-success">+{reportData.users.new_registrations}</div>
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">
                                        {t('new_registrations')}: {reportData.users.new_registrations}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Charts */}
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Revenue Trend */}
                                <div className="panel">
                                    <div className="mb-5 flex items-center justify-between">
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('revenue_trend')}</h5>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Last 12 months</div>
                                    </div>
                                    {isMounted && reportData.sales.monthly_revenue.length > 0 && (
                                        <SafeApexChart
                                            series={[
                                                {
                                                    name: t('revenue'),
                                                    data: reportData.sales.monthly_revenue.map((item) => item.revenue),
                                                },
                                            ]}
                                            options={{
                                                chart: {
                                                    type: 'line',
                                                    height: 250,
                                                    fontFamily: 'Nunito, sans-serif',
                                                    toolbar: { show: false },
                                                    sparkline: { enabled: false },
                                                },
                                                stroke: {
                                                    curve: 'smooth',
                                                    width: 3,
                                                },
                                                colors: ['#1e40af'],
                                                grid: {
                                                    borderColor: isDark ? '#191e3a' : '#e0e6ed',
                                                },
                                                xaxis: {
                                                    categories: reportData.sales.monthly_revenue.map((item) => item.month),
                                                    labels: {
                                                        style: {
                                                            colors: isDark ? '#bfc9d4' : '#888ea8',
                                                        },
                                                    },
                                                },
                                                yaxis: {
                                                    labels: {
                                                        style: {
                                                            colors: isDark ? '#bfc9d4' : '#888ea8',
                                                        },
                                                        formatter: (value: number) => `$${value.toLocaleString()}`,
                                                    },
                                                },
                                                tooltip: {
                                                    theme: isDark ? 'dark' : 'light',
                                                    y: {
                                                        formatter: (value: number) => `$${value.toLocaleString()}`,
                                                    },
                                                },
                                            }}
                                            height={250}
                                        />
                                    )}
                                </div>

                                {/* Top Categories */}
                                <div className="panel">
                                    <div className="mb-5 flex items-center justify-between">
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('top_categories')}</h5>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">By revenue</div>
                                    </div>
                                    <div className="space-y-3">
                                        {reportData.products.categories_performance.slice(0, 5).map((category, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-3 h-3 rounded-full ${
                                                            index === 0 ? 'bg-primary' : index === 1 ? 'bg-warning' : index === 2 ? 'bg-success' : index === 3 ? 'bg-info' : 'bg-gray-400'
                                                        }`}
                                                    ></div>
                                                    <div>
                                                        <div className="font-medium text-black dark:text-white">{category.category_name}</div>
                                                        <div className="text-xs text-gray-500">{category.product_count} products</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-black dark:text-white">${category.revenue.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500">{category.total_sales} sales</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sales Analytics Tab */}
                    {activeTab === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <div className="panel">
                                    <div className="mb-5 flex items-center justify-between">
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('monthly_revenue')}</h5>
                                        <IconBarChart className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    {isMounted && reportData.sales.monthly_revenue.length > 0 && (
                                        <SafeApexChart
                                            series={[
                                                {
                                                    name: t('revenue'),
                                                    data: reportData.sales.monthly_revenue.map((item) => item.revenue),
                                                },
                                            ]}
                                            options={{
                                                chart: {
                                                    type: 'bar',
                                                    height: 350,
                                                    fontFamily: 'Nunito, sans-serif',
                                                    toolbar: { show: true },
                                                },
                                                colors: ['#1e40af'],
                                                grid: {
                                                    borderColor: isDark ? '#191e3a' : '#e0e6ed',
                                                },
                                                xaxis: {
                                                    categories: reportData.sales.monthly_revenue.map((item) => item.month),
                                                    labels: {
                                                        style: {
                                                            colors: isDark ? '#bfc9d4' : '#888ea8',
                                                        },
                                                    },
                                                },
                                                yaxis: {
                                                    labels: {
                                                        style: {
                                                            colors: isDark ? '#bfc9d4' : '#888ea8',
                                                        },
                                                        formatter: (value: number) => `$${value.toLocaleString()}`,
                                                    },
                                                },
                                                tooltip: {
                                                    theme: isDark ? 'dark' : 'light',
                                                    y: {
                                                        formatter: (value: number) => `$${value.toLocaleString()}`,
                                                    },
                                                },
                                            }}
                                            height={350}
                                        />
                                    )}
                                </div>

                                <div className="panel">
                                    <div className="mb-5 flex items-center justify-between">
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('sales_metrics')}</h5>
                                        <IconChartSquare className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 dark:bg-primary/10">
                                            <div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">{t('average_order_value')}</div>
                                                <div className="text-xl font-bold text-primary">${reportData.sales.average_order_value.toFixed(2)}</div>
                                            </div>
                                            <IconDollarSign className="h-8 w-8 text-primary" />
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 dark:bg-success/10">
                                            <div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">{t('growth_rate')}</div>
                                                <div className="text-xl font-bold text-success">+{reportData.sales.growth_rate.toFixed(1)}%</div>
                                            </div>
                                            <IconTrendingUp className="h-8 w-8 text-success" />
                                        </div>
                                        <div className="flex items-center justify-between p-4 rounded-lg bg-warning/5 dark:bg-warning/10">
                                            <div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">{t('total_orders')}</div>
                                                <div className="text-xl font-bold text-warning">{reportData.sales.total_orders.toLocaleString()}</div>
                                            </div>
                                            <IconShoppingCart className="h-8 w-8 text-warning" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Shop Performance Tab */}
                    {activeTab === 2 && (
                        <div className="space-y-6">
                            <div className="panel">
                                <div className="mb-5 flex items-center justify-between">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('top_performing_shops')}</h5>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {viewMode === 'overview' ? t('overview') : t('detailed')} {t('view')}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {reportData.shops.shop_earnings.slice(0, viewMode === 'overview' ? 5 : 10).map((shop, index) => (
                                        <div
                                            key={shop.shop_id}
                                            className="flex items-center justify-between p-4 rounded-lg border border-white-light dark:border-white-dark hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold ${
                                                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                                                    }`}
                                                >
                                                    {index + 1}
                                                </div>
                                                {shop.logo_url && <img src={shop.logo_url} alt={shop.shop_name} className="w-10 h-10 rounded-full object-cover" />}
                                                <div>
                                                    <div className="font-semibold text-black dark:text-white">{shop.shop_name}</div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {shop.total_orders} {t('orders')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-lg text-black dark:text-white">${shop.total_revenue.toLocaleString()}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {t('commission')}: ${shop.commission_earned.toFixed(2)}
                                                </div>
                                                {shop.growth_rate && (
                                                    <div className={`text-sm ${shop.growth_rate >= 0 ? 'text-success' : 'text-danger'}`}>
                                                        {shop.growth_rate >= 0 ? '+' : ''}
                                                        {shop.growth_rate.toFixed(1)}%
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Product Insights Tab */}
                    {activeTab === 3 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <div className="panel">
                                    <div className="mb-5 flex items-center justify-between">
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('top_selling_products')}</h5>
                                    </div>
                                    <div className="space-y-3">
                                        {reportData.products.top_selling_products.slice(0, 8).map((product, index) => (
                                            <div key={product.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{index + 1}</div>
                                                    {product.image_url && <img src={product.image_url} alt={product.title} className="w-10 h-10 rounded-lg object-cover" />}
                                                    <div>
                                                        <div className="font-medium text-black dark:text-white line-clamp-1">{product.title}</div>
                                                        <div className="text-sm text-gray-500">{product.shop_name}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-black dark:text-white">${product.revenue.toLocaleString()}</div>
                                                    <div className="text-sm text-gray-500">
                                                        {product.total_sales} {t('sales')}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="panel">
                                    <div className="mb-5 flex items-center justify-between">
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('category_performance')}</h5>
                                    </div>
                                    {isMounted && reportData.products.categories_performance.length > 0 && (
                                        <SafeApexChart
                                            series={reportData.products.categories_performance.map((cat) => cat.revenue)}
                                            options={{
                                                chart: {
                                                    type: 'donut',
                                                    height: 300,
                                                    fontFamily: 'Nunito, sans-serif',
                                                },
                                                labels: reportData.products.categories_performance.map((cat) => cat.category_name),
                                                colors: ['#1e40af', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'],
                                                legend: {
                                                    position: 'bottom',
                                                    labels: {
                                                        colors: isDark ? '#bfc9d4' : '#888ea8',
                                                    },
                                                },
                                                tooltip: {
                                                    theme: isDark ? 'dark' : 'light',
                                                    y: {
                                                        formatter: (value: number) => `$${value.toLocaleString()}`,
                                                    },
                                                },
                                            }}
                                            height={300}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* User Analytics Tab */}
                    {activeTab === 4 && (
                        <div className="space-y-6">
                            <div className="panel">
                                <div className="mb-5 flex items-center justify-between">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('user_growth_trend')}</h5>
                                </div>
                                {isMounted && reportData.users.user_growth_trend.length > 0 && (
                                    <SafeApexChart
                                        series={[
                                            {
                                                name: t('new_users'),
                                                data: reportData.users.user_growth_trend.map((point) => point.count),
                                            },
                                        ]}
                                        options={{
                                            chart: {
                                                type: 'area',
                                                height: 350,
                                                fontFamily: 'Nunito, sans-serif',
                                                toolbar: { show: true },
                                            },
                                            fill: {
                                                type: 'gradient',
                                                gradient: {
                                                    shadeIntensity: 1,
                                                    opacityFrom: 0.7,
                                                    opacityTo: 0.3,
                                                    stops: [0, 90, 100],
                                                },
                                            },
                                            colors: ['#10b981'],
                                            grid: {
                                                borderColor: isDark ? '#191e3a' : '#e0e6ed',
                                            },
                                            xaxis: {
                                                categories: reportData.users.user_growth_trend.map((point) => point.date),
                                                labels: {
                                                    style: {
                                                        colors: isDark ? '#bfc9d4' : '#888ea8',
                                                    },
                                                },
                                            },
                                            yaxis: {
                                                labels: {
                                                    style: {
                                                        colors: isDark ? '#bfc9d4' : '#888ea8',
                                                    },
                                                },
                                            },
                                            tooltip: {
                                                theme: isDark ? 'dark' : 'light',
                                            },
                                        }}
                                        height={350}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Comparison Tab */}
                    {activeTab === 5 && (
                        <div className="space-y-6">
                            <div className="panel">
                                <div className="mb-5 flex items-center justify-between">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('shop_comparison')}</h5>
                                    <button
                                        type="button"
                                        className={`btn ${comparisonMode ? 'btn-danger' : 'btn-primary'}`}
                                        onClick={() => {
                                            setComparisonMode(!comparisonMode);
                                            if (!comparisonMode) {
                                                setComparisonShop1(null);
                                                setComparisonShop2(null);
                                            }
                                        }}
                                    >
                                        {comparisonMode ? t('exit_comparison') : t('start_comparison')}
                                    </button>
                                </div>

                                {!comparisonMode ? (
                                    <div className="text-center py-12">
                                        <IconArrowForward className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">{t('compare_shop_performance')}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-500">{t('select_two_shops_to_compare')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('select_first_shop')}</label>
                                                <select className="form-select" value={comparisonShop1 || ''} onChange={(e) => setComparisonShop1(Number(e.target.value) || null)}>
                                                    <option value="">{t('select_shop')}</option>
                                                    {reportData.shops.shop_earnings.map((shop) => (
                                                        <option key={shop.shop_id} value={shop.shop_id}>
                                                            {shop.shop_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('select_second_shop')}</label>
                                                <select className="form-select" value={comparisonShop2 || ''} onChange={(e) => setComparisonShop2(Number(e.target.value) || null)}>
                                                    <option value="">{t('select_shop')}</option>
                                                    {reportData.shops.shop_earnings
                                                        .filter((shop) => shop.shop_id !== comparisonShop1)
                                                        .map((shop) => (
                                                            <option key={shop.shop_id} value={shop.shop_id}>
                                                                {shop.shop_name}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>

                                        {comparisonShop1 && comparisonShop2 && (
                                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                                {[comparisonShop1, comparisonShop2].map((shopId, index) => {
                                                    const shop = reportData.shops.shop_earnings.find((s) => s.shop_id === shopId);
                                                    if (!shop) return null;

                                                    return (
                                                        <div key={shopId} className="panel">
                                                            <div className="mb-4 flex items-center gap-3">
                                                                {shop.logo_url && <img src={shop.logo_url} alt={shop.shop_name} className="w-12 h-12 rounded-full object-cover" />}
                                                                <div>
                                                                    <h6 className="text-lg font-semibold text-black dark:text-white">{shop.shop_name}</h6>
                                                                    <div className="text-sm text-gray-500 dark:text-gray-400">{index === 0 ? t('shop_a') : t('shop_b')}</div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4">
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600 dark:text-gray-400">{t('total_revenue')}</span>
                                                                    <span className="font-semibold">${shop.total_revenue.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600 dark:text-gray-400">{t('total_orders')}</span>
                                                                    <span className="font-semibold">{shop.total_orders.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600 dark:text-gray-400">{t('commission_earned')}</span>
                                                                    <span className="font-semibold">${shop.commission_earned.toFixed(2)}</span>
                                                                </div>
                                                                {shop.growth_rate && (
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600 dark:text-gray-400">{t('growth_rate')}</span>
                                                                        <span className={`font-semibold ${shop.growth_rate >= 0 ? 'text-success' : 'text-danger'}`}>
                                                                            {shop.growth_rate >= 0 ? '+' : ''}
                                                                            {shop.growth_rate.toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Reports;

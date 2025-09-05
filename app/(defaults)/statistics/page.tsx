'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconEye from '@/components/icon/icon-eye';
import IconStore from '@/components/icon/icon-store';
import IconUsers from '@/components/icon/icon-users';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import StatisticsFilter from '@/components/statistics/statistics-filter';

interface ShopStats {
    id: number;
    shop_name: string;
    logo_url: string | null;
    visit_count: number;
    owner: string;
    profiles?: {
        full_name: string;
    } | null;
    _count?: {
        products: number;
        orders: number;
    };
}

interface ProductStats {
    id: number;
    title: string;
    images: string[] | null;
    view_count: number;
    cart_count: number;
    price: number;
    shop: number;
    shops?: {
        shop_name: string;
        logo_url: string | null;
    } | null;
}

interface CategoryStats {
    id: number;
    title: string;
    desc: string | null;
    image_url: string | null;
    view_count: number;
    created_at: string;
    _count?: {
        products: number;
        shops: number;
    };
}

interface SalesShopStats {
    id: number;
    shop_name: string;
    logo_url: string | null;
    total_orders: number;
    total_revenue: number;
    owner: string;
    profiles?: {
        full_name: string;
    } | null;
    _count?: {
        products: number;
        orders: number;
    };
}

interface SalesProductStats {
    id: number;
    title: string;
    images: string[] | null;
    total_orders: number;
    total_revenue: number;
    price: number;
    shop: number;
    shops?: {
        shop_name: string;
        logo_url: string | null;
    } | null;
}

interface SalesCategoryStats {
    id: number;
    title: string;
    desc: string | null;
    image_url: string | null;
    total_orders: number;
    total_revenue: number;
    created_at: string;
    _count?: {
        products: number;
        shops: number;
    };
}

interface OverallStats {
    totalShops: number;
    totalProducts: number;
    totalVisits: number;
    totalViews: number;
    totalCartAdds: number;
    totalOrders: number;
}

interface FilterState {
    shops: number[];
    users: number[];
    timeRange: string;
}

interface FilterOption {
    id: number;
    name: string;
    logo_url?: string;
}

const StatisticsPage = () => {
    const { t } = getTranslation();
    const [loading, setLoading] = useState(true);
    const [overallStats, setOverallStats] = useState<OverallStats>({
        totalShops: 0,
        totalProducts: 0,
        totalVisits: 0,
        totalViews: 0,
        totalCartAdds: 0,
        totalOrders: 0,
    });
    const [topShops, setTopShops] = useState<ShopStats[]>([]);
    const [topProducts, setTopProducts] = useState<ProductStats[]>([]);
    const [mostCartedProducts, setMostCartedProducts] = useState<ProductStats[]>([]);
    const [topCategories, setTopCategories] = useState<CategoryStats[]>([]);

    // Sales data state
    const [bestSellingShops, setBestSellingShops] = useState<SalesShopStats[]>([]);
    const [bestSellingProducts, setBestSellingProducts] = useState<SalesProductStats[]>([]);
    const [bestSellingCategories, setBestSellingCategories] = useState<SalesCategoryStats[]>([]);

    const [activeMainTab, setActiveMainTab] = useState(0); // 0 = Views, 1 = Sales
    const [activeTab, setActiveTab] = useState(0);

    // Filter related state
    const [filters, setFilters] = useState<FilterState>({
        shops: [],
        users: [],
        timeRange: 'all',
    });
    const [allShops, setAllShops] = useState<FilterOption[]>([]);
    const [allUsers, setAllUsers] = useState<FilterOption[]>([]);

    useEffect(() => {
        fetchFilterOptions();
        fetchStatistics();
    }, []);

    // Only fetch statistics when filters actually change
    // Remove the automatic fetching on filter change

    const fetchFilterOptions = async () => {
        try {
            // Fetch all shops for filter options
            const { data: shopsData } = await supabase.from('shops').select('id, shop_name, logo_url').order('shop_name');

            setAllShops(
                (shopsData || []).map((shop) => ({
                    id: shop.id,
                    name: shop.shop_name,
                    logo_url: shop.logo_url,
                })),
            );

            // Fetch all users for filter options
            const { data: usersData } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name');

            setAllUsers(
                (usersData || []).map((user) => ({
                    id: user.id,
                    name: user.full_name || `User ${user.id}`,
                    logo_url: user.avatar_url,
                })),
            );
        } catch (error) {
            console.error('Error fetching filter options:', error);
        }
    };

    const getDateFilter = (timeRange: string) => {
        const now = new Date();
        let startDate = null;

        switch (timeRange) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                return null;
        }

        return startDate?.toISOString();
    };

    const fetchStatistics = async (filtersToApply: FilterState = filters) => {
        try {
            setLoading(true);

            // Build base queries with filters
            let baseShopsQuery = supabase.from('shops').select('id');
            let baseProductsQuery = supabase.from('products').select('id');
            let baseOrdersQuery = supabase.from('orders').select('id');

            // Apply shop filters
            if (filtersToApply.shops.length > 0) {
                baseShopsQuery = baseShopsQuery.in('id', filtersToApply.shops);
                baseProductsQuery = baseProductsQuery.in('shop', filtersToApply.shops);
                baseOrdersQuery = baseOrdersQuery.in('shop', filtersToApply.shops);
            }

            // Apply user filters (shop owners)
            if (filtersToApply.users.length > 0) {
                baseShopsQuery = baseShopsQuery.in('owner', filtersToApply.users);

                // For products and orders, we need to filter by shops owned by selected users
                const { data: userShops } = await supabase.from('shops').select('id').in('owner', filtersToApply.users);

                const userShopIds = userShops?.map((shop) => shop.id) || [];
                if (userShopIds.length > 0) {
                    baseProductsQuery = baseProductsQuery.in('shop', userShopIds);
                    baseOrdersQuery = baseOrdersQuery.in('shop', userShopIds);
                }
            }

            // Apply time range filter
            const dateFilter = getDateFilter(filtersToApply.timeRange);
            if (dateFilter) {
                baseShopsQuery = baseShopsQuery.gte('created_at', dateFilter);
                baseProductsQuery = baseProductsQuery.gte('created_at', dateFilter);
                baseOrdersQuery = baseOrdersQuery.gte('created_at', dateFilter);
            }

            // Fetch overall statistics - simplified approach
            const [shopsResult, productsResult, ordersResult] = await Promise.all([baseShopsQuery, baseProductsQuery, baseOrdersQuery]);

            const shopsCount = shopsResult.data?.length || 0;
            const productsCount = productsResult.data?.length || 0;
            const ordersCount = ordersResult.data?.length || 0;

            // Fetch aggregated stats for visits, views, and cart adds
            let visitQuery = supabase.from('shops').select('visit_count');
            let viewQuery = supabase.from('products').select('view_count');
            let cartQuery = supabase.from('products').select('cart_count');

            // Apply the same filters to aggregated queries
            if (filtersToApply.shops.length > 0) {
                visitQuery = visitQuery.in('id', filtersToApply.shops);
                viewQuery = viewQuery.in('shop', filtersToApply.shops);
                cartQuery = cartQuery.in('shop', filtersToApply.shops);
            }

            if (filtersToApply.users.length > 0) {
                visitQuery = visitQuery.in('owner', filtersToApply.users);

                const { data: userShops } = await supabase.from('shops').select('id').in('owner', filtersToApply.users);

                const userShopIds = userShops?.map((shop) => shop.id) || [];
                if (userShopIds.length > 0) {
                    viewQuery = viewQuery.in('shop', userShopIds);
                    cartQuery = cartQuery.in('shop', userShopIds);
                }
            }

            // Apply time filter to aggregated statistics based on creation dates
            if (dateFilter) {
                visitQuery = visitQuery.gte('created_at', dateFilter);
                viewQuery = viewQuery.gte('created_at', dateFilter);
                cartQuery = cartQuery.gte('created_at', dateFilter);
            }

            const [totalVisitsData, totalViewsData, totalCartAddsData] = await Promise.all([visitQuery, viewQuery, cartQuery]);

            const totalVisits = totalVisitsData.data?.reduce((sum, shop) => sum + (shop.visit_count || 0), 0) || 0;
            const totalViews = totalViewsData.data?.reduce((sum, product) => sum + (product.view_count || 0), 0) || 0;
            const totalCartAdds = totalCartAddsData.data?.reduce((sum, product) => sum + (product.cart_count || 0), 0) || 0;

            setOverallStats({
                totalShops: shopsCount || 0,
                totalProducts: productsCount || 0,
                totalVisits,
                totalViews,
                totalCartAdds,
                totalOrders: ordersCount || 0,
            });

            // Fetch top visited shops with filters
            let topShopsQuery = supabase
                .from('shops')
                .select(
                    `
                    id,
                    shop_name,
                    logo_url,
                    visit_count,
                    owner,
                    profiles!shops_owner_fkey (
                        full_name
                    )
                `,
                )
                .order('visit_count', { ascending: false })
                .limit(50);

            // Apply filters to shops query
            if (filtersToApply.shops.length > 0) {
                topShopsQuery = topShopsQuery.in('id', filtersToApply.shops);
            }
            if (filtersToApply.users.length > 0) {
                topShopsQuery = topShopsQuery.in('owner', filtersToApply.users);
            }
            // Apply time filter to top shops query
            if (dateFilter) {
                topShopsQuery = topShopsQuery.gte('created_at', dateFilter);
            }

            const { data: topShopsData } = await topShopsQuery;

            // Get product and order counts for each shop
            const shopsWithCounts = await Promise.all(
                (topShopsData || []).map(async (shop) => {
                    const [productsCount, ordersCount] = await Promise.all([
                        supabase.from('products').select('id', { count: 'exact', head: true }).eq('shop', shop.id),
                        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('shop', shop.id),
                    ]);

                    return {
                        ...shop,
                        profiles: Array.isArray(shop.profiles) ? shop.profiles[0] : shop.profiles,
                        _count: {
                            products: productsCount.count || 0,
                            orders: ordersCount.count || 0,
                        },
                    };
                }),
            );

            setTopShops(shopsWithCounts);

            // Fetch most viewed products with filters
            let topProductsQuery = supabase
                .from('products')
                .select(
                    `
                    id,
                    title,
                    images,
                    view_count,
                    cart_count,
                    price,
                    shop,
                    shops!products_shop_fkey (
                        shop_name,
                        logo_url
                    )
                `,
                )
                .order('view_count', { ascending: false })
                .limit(50);

            // Apply filters to products query
            if (filtersToApply.shops.length > 0) {
                topProductsQuery = topProductsQuery.in('shop', filtersToApply.shops);
            }
            if (filtersToApply.users.length > 0) {
                const { data: userShops } = await supabase.from('shops').select('id').in('owner', filtersToApply.users);

                const userShopIds = userShops?.map((shop) => shop.id) || [];
                if (userShopIds.length > 0) {
                    topProductsQuery = topProductsQuery.in('shop', userShopIds);
                }
            }
            // Apply time filter to top products query
            if (dateFilter) {
                topProductsQuery = topProductsQuery.gte('created_at', dateFilter);
            }

            const { data: topProductsData } = await topProductsQuery;

            setTopProducts(
                (topProductsData || []).map((product) => ({
                    ...product,
                    shops: Array.isArray(product.shops) ? product.shops[0] : product.shops,
                })),
            );

            // Fetch most carted products with filters
            let mostCartedQuery = supabase
                .from('products')
                .select(
                    `
                    id,
                    title,
                    images,
                    view_count,
                    cart_count,
                    price,
                    shop,
                    shops!products_shop_fkey (
                        shop_name,
                        logo_url
                    )
                `,
                )
                .order('cart_count', { ascending: false })
                .limit(50);

            // Apply filters to carted products query
            if (filtersToApply.shops.length > 0) {
                mostCartedQuery = mostCartedQuery.in('shop', filtersToApply.shops);
            }
            if (filtersToApply.users.length > 0) {
                const { data: userShops } = await supabase.from('shops').select('id').in('owner', filtersToApply.users);

                const userShopIds = userShops?.map((shop) => shop.id) || [];
                if (userShopIds.length > 0) {
                    mostCartedQuery = mostCartedQuery.in('shop', userShopIds);
                }
            }
            // Apply time filter to carted products query
            if (dateFilter) {
                mostCartedQuery = mostCartedQuery.gte('created_at', dateFilter);
            }

            const { data: mostCartedData } = await mostCartedQuery;

            setMostCartedProducts(
                (mostCartedData || []).map((product) => ({
                    ...product,
                    shops: Array.isArray(product.shops) ? product.shops[0] : product.shops,
                })),
            );

            // Fetch most viewed categories with filters
            let topCategoriesQuery = supabase
                .from('categories')
                .select(
                    `
                    id,
                    title,
                    desc,
                    image_url,
                    view_count,
                    created_at
                `,
                )
                .order('view_count', { ascending: false })
                .limit(50);

            // Apply time filter to categories query
            if (dateFilter) {
                topCategoriesQuery = topCategoriesQuery.gte('created_at', dateFilter);
            }

            const { data: topCategoriesData } = await topCategoriesQuery;

            // Get product and shop counts for each category
            const categoriesWithCounts = await Promise.all(
                (topCategoriesData || []).map(async (category) => {
                    let productsCountQuery = supabase.from('products').select('id', { count: 'exact', head: true }).eq('category', category.id);

                    // Apply shop filter to products in this category
                    if (filtersToApply.shops.length > 0) {
                        productsCountQuery = productsCountQuery.in('shop', filtersToApply.shops);
                    }

                    // Apply user filter to products in this category
                    if (filtersToApply.users.length > 0) {
                        const { data: userShops } = await supabase.from('shops').select('id').in('owner', filtersToApply.users);
                        const userShopIds = userShops?.map((shop) => shop.id) || [];
                        if (userShopIds.length > 0) {
                            productsCountQuery = productsCountQuery.in('shop', userShopIds);
                        }
                    }

                    const [productsCount] = await Promise.all([productsCountQuery]);

                    // Get unique shops count for this category
                    let shopsCountQuery = supabase.from('products').select('shop', { count: 'exact', head: true }).eq('category', category.id);

                    // Apply filters to shops count
                    if (filtersToApply.shops.length > 0) {
                        shopsCountQuery = shopsCountQuery.in('shop', filtersToApply.shops);
                    }

                    if (filtersToApply.users.length > 0) {
                        const { data: userShops } = await supabase.from('shops').select('id').in('owner', filtersToApply.users);
                        const userShopIds = userShops?.map((shop) => shop.id) || [];
                        if (userShopIds.length > 0) {
                            shopsCountQuery = shopsCountQuery.in('shop', userShopIds);
                        }
                    }

                    const [shopsCount] = await Promise.all([shopsCountQuery]);

                    return {
                        ...category,
                        _count: {
                            products: productsCount.count || 0,
                            shops: shopsCount.count || 0,
                        },
                    };
                }),
            );

            setTopCategories(categoriesWithCounts);

            // Fetch sales data - best selling shops (based on order count) with filters
            let salesShopsQuery = supabase.from('shops').select(`
                    id,
                    shop_name,
                    logo_url,
                    owner,
                    profiles!shops_owner_fkey (
                        full_name
                    )
                `);

            // Apply filters to sales shops query
            if (filtersToApply.shops.length > 0) {
                salesShopsQuery = salesShopsQuery.in('id', filtersToApply.shops);
            }
            if (filtersToApply.users.length > 0) {
                salesShopsQuery = salesShopsQuery.in('owner', filtersToApply.users);
            }
            if (dateFilter) {
                salesShopsQuery = salesShopsQuery.gte('created_at', dateFilter);
            }

            const { data: salesShopsData } = await salesShopsQuery;

            // Get order counts for each shop with filters
            const shopsWithSalesData = await Promise.all(
                (salesShopsData || []).map(async (shop) => {
                    let shopOrdersQuery = supabase
                        .from('orders')
                        .select(
                            `
                            id,
                            products!orders_product_id_fkey (
                                price
                            )
                        `,
                        )
                        .eq('products.shop', shop.id);

                    // Apply time filter to orders
                    if (dateFilter) {
                        shopOrdersQuery = shopOrdersQuery.gte('created_at', dateFilter);
                    }

                    const { data: shopOrders } = await shopOrdersQuery;

                    const totalOrders = shopOrders?.length || 0;
                    const totalRevenue =
                        shopOrders?.reduce((sum, order) => {
                            const product = Array.isArray(order.products) ? order.products[0] : order.products;
                            return sum + (product?.price || 0);
                        }, 0) || 0;

                    let productsCountQuery = supabase.from('products').select('id', { count: 'exact', head: true }).eq('shop', shop.id);
                    let ordersCountQuery = supabase.from('orders').select('id', { count: 'exact', head: true }).eq('products.shop', shop.id);

                    // Apply time filter to counts
                    if (dateFilter) {
                        productsCountQuery = productsCountQuery.gte('created_at', dateFilter);
                        ordersCountQuery = ordersCountQuery.gte('created_at', dateFilter);
                    }

                    const [productsCount, ordersCount] = await Promise.all([productsCountQuery, ordersCountQuery]);

                    return {
                        ...shop,
                        total_orders: totalOrders,
                        total_revenue: totalRevenue,
                        profiles: Array.isArray(shop.profiles) ? shop.profiles[0] : shop.profiles,
                        _count: {
                            products: productsCount.count || 0,
                            orders: ordersCount.count || 0,
                        },
                    };
                }),
            );

            const sortedSalesShops = shopsWithSalesData
                .filter((shop) => shop.total_orders > 0)
                .sort((a, b) => b.total_orders - a.total_orders)
                .slice(0, 50);

            setBestSellingShops(sortedSalesShops);

            // Fetch sales data - best selling products with filters
            let salesProductsQuery = supabase.from('products').select(`
                    id,
                    title,
                    images,
                    price,
                    shop,
                    shops!products_shop_fkey (
                        shop_name,
                        logo_url
                    )
                `);

            // Apply filters to sales products query
            if (filtersToApply.shops.length > 0) {
                salesProductsQuery = salesProductsQuery.in('shop', filtersToApply.shops);
            }
            if (filtersToApply.users.length > 0) {
                const { data: userShops } = await supabase.from('shops').select('id').in('owner', filtersToApply.users);
                const userShopIds = userShops?.map((shop) => shop.id) || [];
                if (userShopIds.length > 0) {
                    salesProductsQuery = salesProductsQuery.in('shop', userShopIds);
                }
            }
            if (dateFilter) {
                salesProductsQuery = salesProductsQuery.gte('created_at', dateFilter);
            }

            const { data: salesProductsData } = await salesProductsQuery;

            const productsWithSalesData = await Promise.all(
                (salesProductsData || []).map(async (product) => {
                    let ordersCountQuery = supabase.from('orders').select('id', { count: 'exact', head: true }).eq('product_id', product.id);

                    // Apply time filter to orders
                    if (dateFilter) {
                        ordersCountQuery = ordersCountQuery.gte('created_at', dateFilter);
                    }

                    const { count: totalOrders } = await ordersCountQuery;
                    const totalRevenue = (totalOrders || 0) * (product.price || 0);

                    return {
                        ...product,
                        total_orders: totalOrders || 0,
                        total_revenue: totalRevenue,
                        shops: Array.isArray(product.shops) ? product.shops[0] : product.shops,
                    };
                }),
            );

            const sortedSalesProducts = productsWithSalesData
                .filter((product) => product.total_orders > 0)
                .sort((a, b) => b.total_orders - a.total_orders)
                .slice(0, 50);

            setBestSellingProducts(sortedSalesProducts);

            // Fetch sales data - best selling categories with filters
            let salesCategoriesQuery = supabase.from('categories').select(`
                    id,
                    title,
                    desc,
                    image_url,
                    created_at
                `);

            // Apply time filter to categories
            if (dateFilter) {
                salesCategoriesQuery = salesCategoriesQuery.gte('created_at', dateFilter);
            }

            const { data: salesCategoriesData } = await salesCategoriesQuery;

            const categoriesWithSalesData = await Promise.all(
                (salesCategoriesData || []).map(async (category) => {
                    // Get all products in this category with filters
                    let categoryProductsQuery = supabase.from('products').select('id, price').eq('category', category.id);

                    // Apply shop filter
                    if (filtersToApply.shops.length > 0) {
                        categoryProductsQuery = categoryProductsQuery.in('shop', filtersToApply.shops);
                    }

                    // Apply user filter
                    if (filtersToApply.users.length > 0) {
                        const { data: userShops } = await supabase.from('shops').select('id').in('owner', filtersToApply.users);
                        const userShopIds = userShops?.map((shop) => shop.id) || [];
                        if (userShopIds.length > 0) {
                            categoryProductsQuery = categoryProductsQuery.in('shop', userShopIds);
                        }
                    }

                    // Apply time filter
                    if (dateFilter) {
                        categoryProductsQuery = categoryProductsQuery.gte('created_at', dateFilter);
                    }

                    const { data: categoryProducts } = await categoryProductsQuery;
                    const productIds = categoryProducts?.map((p) => p.id) || [];

                    let totalOrders = 0;
                    let totalRevenue = 0;

                    if (productIds.length > 0) {
                        let categoryOrdersQuery = supabase
                            .from('orders')
                            .select(
                                `
                                id,
                                products!orders_product_id_fkey (
                                    price
                                )
                            `,
                            )
                            .in('product_id', productIds);

                        // Apply time filter to orders
                        if (dateFilter) {
                            categoryOrdersQuery = categoryOrdersQuery.gte('created_at', dateFilter);
                        }

                        const { data: categoryOrders } = await categoryOrdersQuery;

                        totalOrders = categoryOrders?.length || 0;
                        totalRevenue =
                            categoryOrders?.reduce((sum, order) => {
                                const product = Array.isArray(order.products) ? order.products[0] : order.products;
                                return sum + (product?.price || 0);
                            }, 0) || 0;
                    }

                    // Get counts with filters applied
                    let productsCountQuery = supabase.from('products').select('id', { count: 'exact', head: true }).eq('category', category.id);
                    let shopsCountQuery = supabase.from('products').select('shop', { count: 'exact', head: true }).eq('category', category.id);

                    // Apply shop filter to counts
                    if (filtersToApply.shops.length > 0) {
                        productsCountQuery = productsCountQuery.in('shop', filtersToApply.shops);
                        shopsCountQuery = shopsCountQuery.in('shop', filtersToApply.shops);
                    }

                    // Apply user filter to counts
                    if (filtersToApply.users.length > 0) {
                        const { data: userShops } = await supabase.from('shops').select('id').in('owner', filtersToApply.users);
                        const userShopIds = userShops?.map((shop) => shop.id) || [];
                        if (userShopIds.length > 0) {
                            productsCountQuery = productsCountQuery.in('shop', userShopIds);
                            shopsCountQuery = shopsCountQuery.in('shop', userShopIds);
                        }
                    }

                    // Apply time filter to counts
                    if (dateFilter) {
                        productsCountQuery = productsCountQuery.gte('created_at', dateFilter);
                        shopsCountQuery = shopsCountQuery.gte('created_at', dateFilter);
                    }

                    const [productsCount, shopsCount] = await Promise.all([productsCountQuery, shopsCountQuery]);

                    return {
                        ...category,
                        total_orders: totalOrders,
                        total_revenue: totalRevenue,
                        _count: {
                            products: productsCount.count || 0,
                            shops: shopsCount.count || 0,
                        },
                    };
                }),
            );

            const sortedSalesCategories = categoriesWithSalesData
                .filter((category) => category.total_orders > 0)
                .sort((a, b) => b.total_orders - a.total_orders)
                .slice(0, 50);

            setBestSellingCategories(sortedSalesCategories);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (newFilters: FilterState) => {
        setFilters(newFilters);
        // Trigger statistics refresh with the new filters
        fetchStatistics(newFilters);
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    const StatCard = ({ icon, title, value, color, trend }: { icon: React.ReactNode; title: string; value: number; color: string; trend?: string }) => (
        <div className="panel h-full">
            <div className="flex items-center justify-between mb-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${color}`}>{icon}</div>
                {trend && (
                    <div className="text-right">
                        <span className="text-xs text-success">+{trend}</span>
                    </div>
                )}
            </div>
            <div className="text-2xl font-bold text-primary">{formatNumber(value)}</div>
            <div className="text-sm font-semibold">{title}</div>
        </div>
    );

    const ShopCard = ({ shop, rank }: { shop: ShopStats; rank: number }) => (
        <Link href={`/shops/preview/${shop.id}`} className="block">
            <div className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">{rank}</div>
                    </div>
                    <div className="flex-shrink-0">
                        <img src={shop.logo_url || '/assets/images/shop-placeholder.jpg'} alt={shop.shop_name} className="w-12 h-12 rounded-lg object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark dark:text-white truncate">{shop.shop_name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {t('owner')}: {shop.profiles?.full_name || shop.owner}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                                {shop._count?.products || 0} {t('products')}
                            </span>
                            <span>
                                {shop._count?.orders || 0} {t('orders')}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-primary">{formatNumber(shop.visit_count || 0)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('visits')}</div>
                    </div>
                </div>
            </div>
        </Link>
    );

    const ProductCard = ({ product, rank, metric }: { product: ProductStats; rank: number; metric: 'views' | 'cart' }) => (
        <Link href={`/products/preview/${product.id}`} className="block">
            <div className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">{rank}</div>
                    </div>
                    <div className="flex-shrink-0">
                        <img src={product.images?.[0] || '/assets/images/placeholder.webp'} alt={product.title} className="w-12 h-12 rounded-lg object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark dark:text-white truncate">{product.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{product.shops?.shop_name}</p>
                        <div className="text-sm font-medium text-primary mt-1">${product.price}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-primary">{formatNumber(metric === 'views' ? product.view_count || 0 : product.cart_count || 0)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{metric === 'views' ? t('views') : t('cart_adds')}</div>
                    </div>
                </div>
            </div>
        </Link>
    );

    const CategoryCard = ({ category, rank }: { category: CategoryStats; rank: number }) => (
        <Link href={`/categories/preview/${category.id}`} className="block">
            <div className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">{rank}</div>
                    </div>
                    <div className="flex-shrink-0">
                        <img src={category.image_url || '/assets/images/placeholder.webp'} alt={category.title} className="w-12 h-12 rounded-lg object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark dark:text-white truncate">{category.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{category.desc?.slice(0, 100) + '...' || t('no_description_available')}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                                {category._count?.products || 0} {t('products')}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-primary">{formatNumber(category.view_count || 0)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('views')}</div>
                    </div>
                </div>
            </div>
        </Link>
    );

    // Sales Cards Components
    const SalesShopCard = ({ shop, rank }: { shop: SalesShopStats; rank: number }) => (
        <Link href={`/shops/preview/${shop.id}`} className="block">
            <div className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success text-white font-bold text-sm">{rank}</div>
                    </div>
                    <div className="flex-shrink-0">
                        <img src={shop.logo_url || '/assets/images/shop-placeholder.jpg'} alt={shop.shop_name} className="w-12 h-12 rounded-lg object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark dark:text-white truncate">{shop.shop_name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {t('owner')}: {shop.profiles?.full_name || shop.owner}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                                {shop._count?.products || 0} {t('products')}
                            </span>
                            <span>
                                ${formatNumber(shop.total_revenue || 0)} {t('revenue')}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-success">{formatNumber(shop.total_orders || 0)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('orders')}</div>
                    </div>
                </div>
            </div>
        </Link>
    );

    const SalesProductCard = ({ product, rank }: { product: SalesProductStats; rank: number }) => (
        <Link href={`/products/preview/${product.id}`} className="block">
            <div className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success text-white font-bold text-sm">{rank}</div>
                    </div>
                    <div className="flex-shrink-0">
                        <img src={product.images?.[0] || '/assets/images/placeholder.webp'} alt={product.title} className="w-12 h-12 rounded-lg object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark dark:text-white truncate">{product.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{product.shops?.shop_name}</p>
                        <div className="text-sm font-medium text-primary mt-1">${product.price}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-success">{formatNumber(product.total_orders || 0)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('orders')}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            ${formatNumber(product.total_revenue || 0)} {t('revenue')}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );

    const SalesCategoryCard = ({ category, rank }: { category: SalesCategoryStats; rank: number }) => (
        <Link href={`/categories/preview/${category.id}`} className="block">
            <div className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success text-white font-bold text-sm">{rank}</div>
                    </div>
                    <div className="flex-shrink-0">
                        <img src={category.image_url || '/assets/images/placeholder.webp'} alt={category.title} className="w-12 h-12 rounded-lg object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark dark:text-white truncate">{category.title}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{category.desc?.slice(0, 100) + '...' || t('no_description_available')}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>
                                {category._count?.products || 0} {t('products')}
                            </span>
                            <span>
                                ${formatNumber(category.total_revenue || 0)} {t('revenue')}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-success">{formatNumber(category.total_orders || 0)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{t('orders')}</div>
                    </div>
                </div>
            </div>
        </Link>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-5 mb-4">
                    <div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                        </svg>
                    </div>
                    <ul className="flex space-x-2 rtl:space-x-reverse">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>{t('statistics')}</span>
                        </li>
                    </ul>
                </div>
                <h1 className="text-2xl font-bold text-dark dark:text-white">{t('statistics_dashboard')}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('comprehensive_analytics_overview')}</p>
            </div>

            {/* Filter Component */}
            <StatisticsFilter shops={allShops} users={allUsers} onFilterChange={handleFilterChange} currentFilters={filters} isLoading={loading} />

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                <StatCard icon={<IconStore className="w-5 h-5 text-white" />} title={t('total_shops')} value={overallStats.totalShops} color="bg-primary" />
                <StatCard icon={<IconShoppingCart className="w-5 h-5 text-white" />} title={t('total_products')} value={overallStats.totalProducts} color="bg-success" />
                <StatCard icon={<IconUsers className="w-5 h-5 text-white" />} title={t('total_visits')} value={overallStats.totalVisits} color="bg-info" />
                <StatCard icon={<IconEye className="w-5 h-5 text-white" />} title={t('total_views')} value={overallStats.totalViews} color="bg-warning" />
                <StatCard icon={<IconShoppingCart className="w-5 h-5 text-white" />} title={t('cart_additions')} value={overallStats.totalCartAdds} color="bg-secondary" />
                <StatCard icon={<IconDollarSign className="w-5 h-5 text-white" />} title={t('total_orders')} value={overallStats.totalOrders} color="bg-danger" />
            </div>

            {/* Main Tabs */}
            <div className="mb-6">
                <div className="border-b border-[#ebedf2] dark:border-[#191e3a]">
                    <ul className="flex flex-wrap -mb-px text-lg font-medium text-center">
                        <li className="mr-8">
                            <button
                                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                                    activeMainTab === 0 ? 'text-primary border-primary' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                }`}
                                onClick={() => {
                                    setActiveMainTab(0);
                                    setActiveTab(0);
                                }}
                            >
                                <IconEye className="w-5 h-5 inline mr-2" />
                                {t('views_analytics')}
                            </button>
                        </li>
                        <li className="mr-8">
                            <button
                                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                                    activeMainTab === 1 ? 'text-success border-success' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                }`}
                                onClick={() => {
                                    setActiveMainTab(1);
                                    setActiveTab(0);
                                }}
                            >
                                <IconDollarSign className="w-5 h-5 inline mr-2" />
                                {t('sales_analytics')}
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            {/* Secondary Tabs */}
            <div className="mb-6">
                <div className="border-b border-[#ebedf2] dark:border-[#191e3a]">
                    <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                        {activeMainTab === 0 ? (
                            // Views tabs
                            <>
                                <li className="mr-2">
                                    <button
                                        className={`inline-block p-4 border-b-2 rounded-t-lg ${
                                            activeTab === 0 ? 'text-primary border-primary' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                        }`}
                                        onClick={() => setActiveTab(0)}
                                    >
                                        <IconTrendingUp className="w-4 h-4 inline mx-2" />
                                        {t('top_visited_shops')}
                                    </button>
                                </li>
                                <li className="mr-2">
                                    <button
                                        className={`inline-block p-4 border-b-2 rounded-t-lg ${
                                            activeTab === 1 ? 'text-primary border-primary' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                        }`}
                                        onClick={() => setActiveTab(1)}
                                    >
                                        <IconEye className="w-4 h-4 inline mx-2" />
                                        {t('most_viewed_products')}
                                    </button>
                                </li>
                                <li className="mr-2">
                                    <button
                                        className={`inline-block p-4 border-b-2 rounded-t-lg ${
                                            activeTab === 2 ? 'text-primary border-primary' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                        }`}
                                        onClick={() => setActiveTab(2)}
                                    >
                                        <IconShoppingCart className="w-4 h-4 inline mx-2" />
                                        {t('most_carted_products')}
                                    </button>
                                </li>
                                <li className="mr-2">
                                    <button
                                        className={`inline-block p-4 border-b-2 rounded-t-lg ${
                                            activeTab === 3 ? 'text-primary border-primary' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                        }`}
                                        onClick={() => setActiveTab(3)}
                                    >
                                        <IconStore className="w-4 h-4 inline mx-2" />
                                        {t('most_viewed_categories')}
                                    </button>
                                </li>
                            </>
                        ) : (
                            // Sales tabs
                            <>
                                <li className="mr-2">
                                    <button
                                        className={`inline-block p-4 border-b-2 rounded-t-lg ${
                                            activeTab === 0 ? 'text-success border-success' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                        }`}
                                        onClick={() => setActiveTab(0)}
                                    >
                                        <IconStore className="w-4 h-4 inline mx-2" />
                                        {t('best_selling_shops')}
                                    </button>
                                </li>
                                <li className="mr-2">
                                    <button
                                        className={`inline-block p-4 border-b-2 rounded-t-lg ${
                                            activeTab === 1 ? 'text-success border-success' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                        }`}
                                        onClick={() => setActiveTab(1)}
                                    >
                                        <IconShoppingCart className="w-4 h-4 inline mx-2" />
                                        {t('best_selling_products')}
                                    </button>
                                </li>
                                <li className="mr-2">
                                    <button
                                        className={`inline-block p-4 border-b-2 rounded-t-lg ${
                                            activeTab === 2 ? 'text-success border-success' : 'border-transparent hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                                        }`}
                                        onClick={() => setActiveTab(2)}
                                    >
                                        <IconTrendingUp className="w-4 h-4 inline mx-2" />
                                        {t('best_selling_categories')}
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>

            {/* Tab Content */}
            {activeMainTab === 0 ? (
                // Views Analytics Content
                <>
                    {activeTab === 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">{t('top_visited_shops')}</h2>
                            {topShops.length > 0 ? (
                                topShops.map((shop, index) => <ShopCard key={shop.id} shop={shop} rank={index + 1} />)
                            ) : (
                                <div className="panel text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">{t('no_shops_found')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">{t('most_viewed_products')}</h2>
                            {topProducts.length > 0 ? (
                                topProducts.map((product, index) => <ProductCard key={product.id} product={product} rank={index + 1} metric="views" />)
                            ) : (
                                <div className="panel text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">{t('no_products_found')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">{t('most_carted_products')}</h2>
                            {mostCartedProducts.length > 0 ? (
                                mostCartedProducts.map((product, index) => <ProductCard key={product.id} product={product} rank={index + 1} metric="cart" />)
                            ) : (
                                <div className="panel text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">{t('no_products_found')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">{t('most_viewed_categories')}</h2>
                            {topCategories.length > 0 ? (
                                topCategories.map((category, index) => <CategoryCard key={category.id} category={category} rank={index + 1} />)
                            ) : (
                                <div className="panel text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">{t('no_categories_found')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                // Sales Analytics Content
                <>
                    {activeTab === 0 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">{t('best_selling_shops')}</h2>
                            {bestSellingShops.length > 0 ? (
                                bestSellingShops.map((shop, index) => <SalesShopCard key={shop.id} shop={shop} rank={index + 1} />)
                            ) : (
                                <div className="panel text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">{t('no_shops_found')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">{t('best_selling_products')}</h2>
                            {bestSellingProducts.length > 0 ? (
                                bestSellingProducts.map((product, index) => <SalesProductCard key={product.id} product={product} rank={index + 1} />)
                            ) : (
                                <div className="panel text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">{t('no_products_found')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">{t('best_selling_categories')}</h2>
                            {bestSellingCategories.length > 0 ? (
                                bestSellingCategories.map((category, index) => <SalesCategoryCard key={category.id} category={category} rank={index + 1} />)
                            ) : (
                                <div className="panel text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">{t('no_categories_found')}</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default StatisticsPage;

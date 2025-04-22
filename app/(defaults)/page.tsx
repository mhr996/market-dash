'use client';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import supabase from '@/lib/supabase';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import ReactApexChart with SSR disabled
const ReactApexChart = dynamic(() => import('react-apexcharts'), { 
    ssr: false,
    loading: () => <div className="h-[200px] flex items-center justify-center">Loading chart...</div>
});

// Icons
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconTrendingDown from '@/components/icon/icon-trending-down';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconStore from '@/components/icon/icon-store';
import IconUsersGroup from '@/components/icon/icon-users-group';
import IconBox from '@/components/icon/icon-box';
import IconHorizontalDots from '@/components/icon/icon-horizontal-dots';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconMenuCharts from '@/components/icon/menu/icon-menu-charts';
import IconMenuComponents from '@/components/icon/menu/icon-menu-components';
import IconMenuNotes from '@/components/icon/menu/icon-menu-notes';
import IconSettings from '@/components/icon/icon-settings';
import IconUser from '@/components/icon/icon-user';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCash from '@/components/icon/icon-cash-banknotes';

interface Stats {
    shops: number;
    products: number;
    users: number;
    orders: number;
    revenue: number;
    shopGrowth: number;
    productGrowth: number;
    userGrowth: number;
    orderGrowth: number;
    revenueGrowth: number;
    recentActivity: any[];
    loading: boolean;
    performanceData: {
        months: string[];
        sales: number[];
    };
}

const HomePage = () => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const [isMounted, setIsMounted] = useState(false);
    const [stats, setStats] = useState<Stats>({
        shops: 0,
        products: 0,
        users: 0,
        orders: 0,
        revenue: 0,
        shopGrowth: 0,
        productGrowth: 0,
        userGrowth: 0,
        orderGrowth: 0,
        revenueGrowth: 0,
        recentActivity: [],
        loading: true,
        performanceData: {
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            sales: [0, 0, 0, 0, 0, 0],
        },
    });

    // Set is mounted for client-side rendering of charts
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Calculate growth percentage
    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return 100; // If there was nothing before, it's 100% growth
        return ((current - previous) / previous) * 100;
    };

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Get current date and previous month's date
                const now = new Date();
                const currentMonth = now.toISOString();
                const lastMonth = new Date(now);
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                const previousMonth = lastMonth.toISOString();

                // Fetch current stats
                const [{ data: currentShops }, { data: currentProducts }, { data: currentUsers }, { data: currentOrders }] = await Promise.all([
                    supabase.from('shops').select('count'),
                    supabase.from('products').select('count'),
                    supabase.from('profiles').select('count'),
                    supabase.from('orders').select('count'),
                ]);

                // Fetch previous month's stats for growth calculation
                const [{ data: previousShops }, { data: previousProducts }, { data: previousUsers }, { data: previousOrders }] = await Promise.all([
                    supabase.from('shops').select('count').lt('created_at', previousMonth),
                    supabase.from('products').select('count').lt('created_at', previousMonth),
                    supabase.from('profiles').select('count').lt('registration_date', previousMonth),
                    supabase.from('orders').select('count').lt('created_at', previousMonth),
                ]);

                // Calculate total revenue
                const { data: orders } = await supabase.from('orders').select('total_amount');
                const totalRevenue = orders ? orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) : 0;

                // Calculate previous month's revenue
                const { data: previousOrdersRevenue } = await supabase.from('orders').select('total_amount').lt('created_at', previousMonth);
                const previousRevenue = previousOrdersRevenue ? previousOrdersRevenue.reduce((sum, order) => sum + (order.total_amount || 0), 0) : 0;

                // Get performance data for the last 6 months
                const performanceData = { months: [] as string[], sales: [] as number[] };
                for (let i = 5; i >= 0; i--) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const monthName = date.toLocaleString('default', { month: 'short' });
                    performanceData.months.push(monthName);

                    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
                    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

                    const { data: monthlyOrders } = await supabase.from('orders').select('total_amount').gte('created_at', startOfMonth).lt('created_at', endOfMonth);

                    const monthlySales = monthlyOrders ? monthlyOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0) : 0;
                    performanceData.sales.push(monthlySales);
                }

                // Get recent activity (newest 5 items from any category)
                const [{ data: recentOrders }, { data: recentUsers }, { data: recentProducts }, { data: recentShops }] = await Promise.all([
                    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(3),
                    supabase.from('profiles').select('*').order('registration_date', { ascending: false }).limit(3),
                    supabase.from('products').select('*').order('created_at', { ascending: false }).limit(3),
                    supabase.from('shops').select('*').order('created_at', { ascending: false }).limit(3),
                ]);

                // Combine all recent activity and sort by date
                const allRecentActivity = [
                    ...(recentOrders || []).map((item) => ({ ...item, type: 'order' })),
                    ...(recentUsers || []).map((item) => ({ ...item, type: 'user' })),
                    ...(recentProducts || []).map((item) => ({ ...item, type: 'product' })),
                    ...(recentShops || []).map((item) => ({ ...item, type: 'shop' })),
                ];

                // Sort by date, considering different date fields for different types
                const sortedActivity = allRecentActivity
                    .sort((a, b) => {
                        const dateA = a.type === 'user' ? new Date(a.registration_date || a.created_at) : new Date(a.created_at);
                        const dateB = b.type === 'user' ? new Date(b.registration_date || b.created_at) : new Date(b.created_at);
                        return dateB.getTime() - dateA.getTime();
                    })
                    .slice(0, 5);

                // Calculate growth rates
                const shopGrowth = calculateGrowth(currentShops?.[0]?.count || 0, previousShops?.[0]?.count || 0);
                const productGrowth = calculateGrowth(currentProducts?.[0]?.count || 0, previousProducts?.[0]?.count || 0);
                const userGrowth = calculateGrowth(currentUsers?.[0]?.count || 0, previousUsers?.[0]?.count || 0);
                const orderGrowth = calculateGrowth(currentOrders?.[0]?.count || 0, previousOrders?.[0]?.count || 0);
                const revenueGrowth = calculateGrowth(totalRevenue, previousRevenue);

                setStats({
                    shops: currentShops?.[0]?.count || 0,
                    products: currentProducts?.[0]?.count || 0,
                    users: currentUsers?.[0]?.count || 0,
                    orders: currentOrders?.[0]?.count || 0,
                    revenue: totalRevenue,
                    shopGrowth,
                    productGrowth,
                    userGrowth,
                    orderGrowth,
                    revenueGrowth,
                    recentActivity: sortedActivity,
                    loading: false,
                    performanceData,
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
                setStats((prev) => ({ ...prev, loading: false }));
            }
        };

        fetchStats();
    }, []);

    // Chart data for business performance
    const performanceChartData: any = {
        series: [
            {
                name: 'Monthly Revenue',
                data: stats.performanceData.sales,
            },
        ],
        options: {
            chart: {
                type: 'area',
                height: 200,
                zoom: {
                    enabled: false,
                },
                toolbar: {
                    show: false,
                },
                fontFamily: 'Nunito, sans-serif',
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                curve: 'smooth',
                width: 2,
            },
            colors: ['#4361ee'],
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.3,
                    stops: [0, 90, 100],
                },
            },
            grid: {
                borderColor: isDark ? '#191e3a' : '#e0e6ed',
                strokeDashArray: 5,
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            xaxis: {
                categories: stats.performanceData.months,
                axisBorder: {
                    show: false,
                },
                labels: {
                    style: {
                        colors: isDark ? '#888ea8' : '#3b3f5c',
                    },
                },
            },
            yaxis: {
                opposite: isRtl ? true : false,
                labels: {
                    style: {
                        colors: isDark ? '#888ea8' : '#3b3f5c',
                    },
                    formatter: function (value: number) {
                        return '$' + value.toFixed(0);
                    },
                },
            },
            tooltip: {
                x: {
                    format: 'MMM',
                },
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                offsetY: -15,
                markers: {
                    width: 10,
                    height: 10,
                    radius: 12,
                },
                itemMargin: {
                    horizontal: 0,
                    vertical: 20,
                },
                fontFamily: 'Nunito, sans-serif',
                fontSize: '13px',
                labels: {
                    colors: isDark ? '#bfc9d4' : '#3b3f5c',
                },
            },
        },
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'order':
                return <IconShoppingCart className="h-4 w-4" />;
            case 'user':
                return <IconUsersGroup className="h-4 w-4" />;
            case 'product':
                return <IconBox className="h-4 w-4" />;
            case 'shop':
                return <IconStore className="h-4 w-4" />;
            default:
                return <IconHorizontalDots className="h-4 w-4" />;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'order':
                return 'success';
            case 'user':
                return 'primary';
            case 'product':
                return 'warning';
            case 'shop':
                return 'info';
            default:
                return 'secondary';
        }
    };

    const getActivityTitle = (item: any) => {
        switch (item.type) {
            case 'order':
                return `New order placed: $${item.total_amount?.toFixed(2) || '0.00'}`;
            case 'user':
                return `New user registered: ${item.email || 'Unknown'}`;
            case 'product':
                return `New product added: ${item.title || 'Unknown'}`;
            case 'shop':
                return `New shop created: ${item.shop_name || 'Unknown'}`;
            default:
                return 'Unknown activity';
        }
    };

    const getActivityDate = (item: any) => {
        const date = item.type === 'user' ? new Date(item.registration_date || item.created_at) : new Date(item.created_at);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return (
        <div>
         

            <div className="pt-5 max-w-[1600px]">
                {/* Welcome Banner */}
                <div className="mb-6">
                    <div className="panel h-full dark:!border-[#191e3a] !bg-gradient-to-r from-blue-500/25 via-sky-500/25 to-cyan-500/25 dark:!bg-gradient-to-r dark:from-blue-500/10 dark:via-sky-500/10 dark:to-cyan-500/10">
                        <div className="flex flex-col sm:flex-row items-start justify-between mb-5">
                            <div>
                                <h5 className="font-semibold text-lg dark:text-white-light">Welcome to Vristo Dashboard</h5>
                                <p className="text-white-dark mt-1">Track your business metrics and performance at a glance.</p>
                            </div>
                            <div className="dropdown mt-4 sm:mt-0">
                                <span className="badge bg-primary text-white text-xs rounded-full px-3 py-1.5">
                                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <div className="mb-5">
                                    <h4 className="text-2xl font-bold text-gray-600 dark:text-white-dark">Business Performance</h4>
                                    <p className="text-white-dark mt-2">Your business is growing! Explore the dashboard to dive deeper into your metrics and analytics.</p>
                                </div>

                                <div className="flex flex-wrap gap-3 mt-5">
                                    <Link href="/analytics" className="btn btn-primary">
                                        <IconMenuCharts className="ltr:mr-2 rtl:ml-2" />
                                        Analytics
                                    </Link>
                                    <Link href="/products" className="btn btn-outline-primary">
                                        <IconMenuComponents className="ltr:mr-2 rtl:ml-2" />
                                        Products
                                    </Link>
                                    <Link href="/orders" className="btn btn-outline-primary">
                                        <IconMenuNotes className="ltr:mr-2 rtl:ml-2" />
                                        Orders
                                    </Link>
                                </div>

                                <div className="absolute bottom-6 left-2 flex flex-wrap justify-start items-center gap-4 pt-5 mt-5 border-t border-white-light dark:border-[#191e3a]">
                                    <div className="flex space-x-3">
                                        <div className="flex flex-col items-center justify-center px-4">
                                            <svg className="h-5 w-5 text-success mb-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <circle opacity="0.5" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                                                <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <p className="text-xs font-semibold">System Normal</p>
                                        </div>
                                        <div className="flex flex-col items-center justify-center px-4">
                                            <svg className="h-5 w-5 text-info mb-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 7V13L15 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                                            </svg>
                                            <p className="text-xs font-semibold">
                                                Last Update: <span className="text-info">Today</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <h4 className="text-lg font-semibold dark:text-white-light mb-4">Revenue Trend</h4>
                                <div className="h-[200px] mb-3">
                                    {isMounted && typeof window !== 'undefined' && (
                                        <ReactApexChart series={performanceChartData.series} options={performanceChartData.options} type="area" height={200} />
                                    )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-gray-500 dark:text-gray-400">Performance over last 6 months</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="mb-6 grid gap-6">
                    {/* First row: Revenue and Users - 2 cards */}
                    <div className="grid gap-6 sm:grid-cols-2">
                        {/* Revenue */}
                        <div className="panel !border-0 border-l-4 !border-l-primary bg-primary/10">
                            <div className="flex items-center">
                                <div className="flex-none">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-white">
                                        <IconCash className="h-7 w-7" />
                                    </div>
                                </div>
                                <div className="ltr:ml-5 rtl:mr-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[15px] font-semibold dark:text-white-light">Total Revenue</h5>
                                        <div className={`badge ${stats.revenueGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                            {stats.revenueGrowth >= 0 ? '+' : ''}
                                            {stats.revenueGrowth.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center">
                                        <div className="text-xl font-bold ltr:mr-3 rtl:ml-3 dark:text-white-light">${stats.revenue.toFixed(2)}</div>
                                        <div className="badge bg-primary/30 text-primary dark:bg-primary dark:text-white-light">YTD</div>
                                    </div>
                                    <div className="mt-4 h-1 bg-[#d3d3d3] dark:bg-dark/40">
                                        <div className={`h-full rounded-full bg-gradient-to-r from-[#4361ee] to-[#805dca]`} style={{ width: `${Math.min(100, Math.abs(stats.revenueGrowth))}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Users */}
                        <div className="panel !border-0 border-l-4 !border-l-primary bg-primary/10">
                            <div className="flex items-center">
                                <div className="flex-none">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-white">
                                        <IconUsersGroup className="h-7 w-7" />
                                    </div>
                                </div>
                                <div className="ltr:ml-5 rtl:mr-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[15px] font-semibold dark:text-white-light">Users</h5>
                                        <div className={`badge ${stats.userGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                            {stats.userGrowth >= 0 ? '+' : ''}
                                            {stats.userGrowth.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center">
                                        <div className="text-xl font-bold ltr:mr-3 rtl:ml-3 dark:text-white-light">{stats.users}</div>
                                        <div className="badge bg-primary/30 text-primary dark:bg-primary dark:text-white-light">Total</div>
                                    </div>
                                    <div className="mt-4 h-1 bg-[#d3d3d3] dark:bg-dark/40">
                                        <div className={`h-full rounded-full bg-gradient-to-r from-[#4361ee] to-[#805dca]`} style={{ width: `${Math.min(100, Math.abs(stats.userGrowth))}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Second row: Shops, Orders, Products - 3 cards */}
                    <div className="grid gap-6 sm:grid-cols-3">
                        {/* Shops */}
                        <div className="panel !border-0 border-l-4 !border-l-success bg-success/10">
                            <div className="flex items-center">
                                <div className="flex-none">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-success text-white">
                                        <IconStore className="h-7 w-7" />
                                    </div>
                                </div>
                                <div className="ltr:ml-5 rtl:mr-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[15px] font-semibold dark:text-white-light">Shops</h5>
                                        <div className={`badge ${stats.shopGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                            {stats.shopGrowth >= 0 ? '+' : ''}
                                            {stats.shopGrowth.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center">
                                        <div className="text-xl font-bold ltr:mr-3 rtl:ml-3 dark:text-white-light">{stats.shops}</div>
                                        <div className="badge bg-success/30 text-success dark:bg-success dark:text-white-light">Total</div>
                                    </div>
                                    <div className="mt-4 h-1 bg-[#d3d3d3] dark:bg-dark/40">
                                        <div className={`h-full rounded-full bg-gradient-to-r from-[#1abc9c] to-[#0ead69]`} style={{ width: `${Math.min(100, Math.abs(stats.shopGrowth))}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Orders */}
                        <div className="panel !border-0 border-l-4 !border-l-danger bg-danger/10">
                            <div className="flex items-center">
                                <div className="flex-none">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-danger text-white">
                                        <IconShoppingCart className="h-7 w-7" />
                                    </div>
                                </div>
                                <div className="ltr:ml-5 rtl:mr-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[15px] font-semibold dark:text-white-light">Orders</h5>
                                        <div className={`badge ${stats.orderGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                            {stats.orderGrowth >= 0 ? '+' : ''}
                                            {stats.orderGrowth.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center">
                                        <div className="text-xl font-bold ltr:mr-3 rtl:ml-3 dark:text-white-light">{stats.orders}</div>
                                        <div className="badge bg-danger/30 text-danger dark:bg-danger dark:text-white-light">Total</div>
                                    </div>
                                    <div className="mt-4 h-1 bg-[#d3d3d3] dark:bg-dark/40">
                                        <div className={`h-full rounded-full bg-gradient-to-r from-[#e7515a] to-[#f07178]`} style={{ width: `${Math.min(100, Math.abs(stats.orderGrowth))}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Products */}
                        <div className="panel !border-0 border-l-4 !border-l-warning bg-warning/10">
                            <div className="flex items-center">
                                <div className="flex-none">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-warning text-white">
                                        <IconBox className="h-7 w-7" />
                                    </div>
                                </div>
                                <div className="ltr:ml-5 rtl:mr-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[15px] font-semibold dark:text-white-light">Products</h5>
                                        <div className={`badge ${stats.productGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                            {stats.productGrowth >= 0 ? '+' : ''}
                                            {stats.productGrowth.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center">
                                        <div className="text-xl font-bold ltr:mr-3 rtl:ml-3 dark:text-white-light">{stats.products}</div>
                                        <div className="badge bg-warning/30 text-warning dark:bg-warning dark:text-white-light">Total</div>
                                    </div>
                                    <div className="mt-4 h-1 bg-[#d3d3d3] dark:bg-dark/40">
                                        <div className={`h-full rounded-full bg-gradient-to-r from-[#e2a03f] to-[#ffbd5a]`} style={{ width: `${Math.min(100, Math.abs(stats.productGrowth))}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Links and Recent Activity */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Quick Links */}
                    <div className="panel h-full lg:col-span-1">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Quick Links</h5>
                        </div>
                        <div className="mb-5 space-y-4">
                            <Link
                                href="/shops"
                                className="flex items-center justify-between p-3 transition-all duration-300 bg-white-light/30 hover:bg-white-light/50 dark:bg-dark dark:hover:bg-dark-light/10 rounded"
                            >
                                <div className="flex items-center">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-success-light dark:bg-success text-success dark:text-success-light">
                                        <IconStore className="h-5 w-5" />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h5 className="text-sm font-semibold dark:text-white-light">Manage Shops</h5>
                                    </div>
                                </div>
                                <div className="text-success">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </Link>
                            <Link
                                href="/products"
                                className="flex items-center justify-between p-3 transition-all duration-300 bg-white-light/30 hover:bg-white-light/50 dark:bg-dark dark:hover:bg-dark-light/10 rounded"
                            >
                                <div className="flex items-center">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-warning-light dark:bg-warning text-warning dark:text-warning-light">
                                        <IconBox className="h-5 w-5" />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h5 className="text-sm font-semibold dark:text-white-light">View Products</h5>
                                    </div>
                                </div>
                                <div className="text-warning">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </Link>
                            <Link
                                href="/orders"
                                className="flex items-center justify-between p-3 transition-all duration-300 bg-white-light/30 hover:bg-white-light/50 dark:bg-dark dark:hover:bg-dark-light/10 rounded"
                            >
                                <div className="flex items-center">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-danger-light dark:bg-danger text-danger dark:text-danger-light">
                                        <IconShoppingCart className="h-5 w-5" />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h5 className="text-sm font-semibold dark:text-white-light">Check Orders</h5>
                                    </div>
                                </div>
                                <div className="text-danger">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </Link>
                            <Link
                                href="/users"
                                className="flex items-center justify-between p-3 transition-all duration-300 bg-white-light/30 hover:bg-white-light/50 dark:bg-dark dark:hover:bg-dark-light/10 rounded"
                            >
                                <div className="flex items-center">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-light dark:bg-primary text-primary dark:text-primary-light">
                                        <IconUsersGroup className="h-5 w-5" />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h5 className="text-sm font-semibold dark:text-white-light">User Management</h5>
                                    </div>
                                </div>
                                <div className="text-primary">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </Link>
                            <Link
                                href="/settings"
                                className="flex items-center justify-between p-3 transition-all duration-300 bg-white-light/30 hover:bg-white-light/50 dark:bg-dark dark:hover:bg-dark-light/10 rounded"
                            >
                                <div className="flex items-center">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-info-light dark:bg-info text-info dark:text-info-light">
                                        <IconSettings className="h-5 w-5" />
                                    </div>
                                    <div className="ltr:ml-3 rtl:mr-3">
                                        <h5 className="text-sm font-semibold dark:text-white-light">Settings</h5>
                                    </div>
                                </div>
                                <div className="text-info">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M9 5L15 12L9 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="panel h-full lg:col-span-2">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Recent Activity</h5>
                        </div>

                        <div className="space-y-7">
                            {stats.loading ? (
                                <div className="flex h-32 items-center justify-center">
                                    <div className="text-lg text-gray-500">Loading activity data...</div>
                                </div>
                            ) : stats.recentActivity.length > 0 ? (
                                stats.recentActivity.map((item, index) => {
                                    const isLast = index === stats.recentActivity.length - 1;
                                    const color = getActivityColor(item.type);
                                    return (
                                        <div className="flex" key={`${item.type}-${index}`}>
                                            <div
                                                className={`relative z-10 shrink-0 ${
                                                    !isLast ? `before:absolute before:left-4 before:top-10 before:h-[calc(100%-24px)] before:w-[2px] before:bg-white-dark/30` : ''
                                                } ltr:mr-2 rtl:ml-2`}
                                            >
                                                <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-${color} text-white shadow shadow-${color}`}>
                                                    {getActivityIcon(item.type)}
                                                </div>
                                            </div>
                                            <div>
                                                <h5 className="font-semibold dark:text-white-light">{getActivityTitle(item)}</h5>
                                                <p className="text-xs text-white-dark">{getActivityDate(item)}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex h-32 items-center justify-center">
                                    <div className="text-lg text-gray-500">No recent activity</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;

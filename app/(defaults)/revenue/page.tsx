'use client';
// Polyfill resolve for ApexCharts when rendering in browser
if (typeof window !== 'undefined' && typeof (window as any).resolve !== 'function') {
    (window as any).resolve = (...args: any[]) => args[args.length - 1];
}
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { sortBy } from 'lodash';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import react-apexcharts without SSR
const ApexChart = dynamic(() => import('react-apexcharts'), {
    ssr: false,
    loading: () => <div className="h-[300px] flex items-center justify-center">Loading chart...</div>,
});

// Icons
import IconCash from '@/components/icon/icon-cash-banknotes';
import IconStore from '@/components/icon/icon-store';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import IconTrendingDown from '@/components/icon/icon-trending-down';
import IconEye from '@/components/icon/icon-eye';

interface RevenueStats {
    totalRevenue: number;
    totalCommissions: number;
    combinedRevenue: number;
    revenueGrowth: number;
    commissionGrowth: number;
    combinedGrowth: number;
    monthlyData: {
        months: string[];
        revenue: number[];
        commissions: number[];
    };
    loading: boolean;
}

interface ShopRevenue {
    id: number;
    shop_name: string;
    owner_name: string;
    revenue: number;
    commission: number;
    commission_rate: number;
    balance: number;
    last_payment_date: string | null;
}

const RevenuePage = () => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const { t } = getTranslation();
    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<RevenueStats>({
        totalRevenue: 0,
        totalCommissions: 0,
        combinedRevenue: 0,
        revenueGrowth: 0,
        commissionGrowth: 0,
        combinedGrowth: 0,
        monthlyData: {
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            revenue: [],
            commissions: [],
        },
        loading: true,
    });
    // Shop revenue table state
    const [shopRevenue, setShopRevenue] = useState<ShopRevenue[]>([]);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<ShopRevenue[]>([]);
    const [records, setRecords] = useState<ShopRevenue[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'desc',
    });

    // Set is mounted for client-side rendering of charts
    useEffect(() => {
        // Make sure we're in client-side environment
        const checkIfMounted = () => {
            if (typeof window !== 'undefined') {
                // Add a small delay to ensure DOM is fully ready
                setTimeout(() => {
                    setIsMounted(true);
                }, 50);
            }
        };

        checkIfMounted();

        return () => {
            setIsMounted(false);
        };
    }, []); // Calculate growth percentage
    const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return 100; // If there was nothing before, it's 100% growth
        return ((current - previous) / previous) * 100;
    };

    // Fetch revenue data from Supabase
    useEffect(() => {
        const fetchRevenueData = async () => {
            setIsLoading(true);

            try {
                // Get all orders with product and shop information
                const { data: orders, error: ordersError } = await supabase.from('orders').select(`
                        *,
                        products(id, title, price, shop, shops(id, shop_name, balance, owner, profiles(full_name)))
                    `);

                if (ordersError) throw ordersError;

                // Get all licenses for commission rates
                const { data: licenses, error: licensesError } = await supabase.from('licenses').select('*');

                if (licensesError) throw licensesError;

                // Calculate revenue statistics
                const now = new Date();
                const currentYear = now.getFullYear();
                const lastYear = currentYear - 1;

                // Filter orders for current and previous year
                const currentYearOrders = orders?.filter((order) => new Date(order.created_at).getFullYear() === currentYear) || [];

                const lastYearOrders = orders?.filter((order) => new Date(order.created_at).getFullYear() === lastYear) || [];

                // Calculate total revenue and commissions
                const currentRevenue = currentYearOrders.reduce((sum, order) => sum + (order.products?.price || 0), 0);
                const lastRevenue = lastYearOrders.reduce((sum, order) => sum + (order.products?.price || 0), 0);

                // Assume 10% commission rate as default (can be made dynamic based on license)
                const defaultCommissionRate = 0.1;
                const currentCommissions = currentRevenue * defaultCommissionRate;
                const lastCommissions = lastRevenue * defaultCommissionRate;

                // Calculate growth rates
                const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;
                const commissionGrowth = lastCommissions > 0 ? ((currentCommissions - lastCommissions) / lastCommissions) * 100 : 0;
                const combinedGrowth = (revenueGrowth + commissionGrowth) / 2;

                // Calculate monthly data for the current year
                const monthlyRevenue = Array(12).fill(0);
                const monthlyCommissions = Array(12).fill(0);

                currentYearOrders.forEach((order) => {
                    const month = new Date(order.created_at).getMonth();
                    const revenue = order.products?.price || 0;
                    monthlyRevenue[month] += revenue;
                    monthlyCommissions[month] += revenue * defaultCommissionRate;
                });

                // Update stats
                setStats({
                    totalRevenue: currentRevenue,
                    totalCommissions: currentCommissions,
                    combinedRevenue: currentRevenue + currentCommissions,
                    revenueGrowth,
                    commissionGrowth,
                    combinedGrowth,
                    monthlyData: {
                        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                        revenue: monthlyRevenue,
                        commissions: monthlyCommissions,
                    },
                    loading: false,
                });

                // Calculate shop revenue data
                const shopRevenueMap = new Map<
                    number,
                    {
                        shop_name: string;
                        owner_name: string;
                        revenue: number;
                        commission: number;
                        balance: number;
                        orders_count: number;
                    }
                >();

                currentYearOrders.forEach((order) => {
                    if (order.products?.shops) {
                        const shopId = order.products.shop;
                        const shop = order.products.shops;
                        const revenue = order.products.price || 0;
                        const commission = revenue * defaultCommissionRate;

                        if (shopRevenueMap.has(shopId)) {
                            const existing = shopRevenueMap.get(shopId)!;
                            existing.revenue += revenue;
                            existing.commission += commission;
                            existing.orders_count += 1;
                        } else {
                            shopRevenueMap.set(shopId, {
                                shop_name: shop.shop_name || 'Unknown Shop',
                                owner_name: shop.profiles?.full_name || 'Unknown Owner',
                                revenue,
                                commission,
                                balance: shop.balance || 0,
                                orders_count: 1,
                            });
                        }
                    }
                });

                // Convert map to array
                const shopRevenueArray: ShopRevenue[] = Array.from(shopRevenueMap.entries()).map(([id, data]) => ({
                    id,
                    shop_name: data.shop_name,
                    owner_name: data.owner_name,
                    revenue: data.revenue,
                    commission: data.commission,
                    commission_rate: defaultCommissionRate * 100, // Convert to percentage
                    balance: data.balance,
                    last_payment_date: null, // This would need to be tracked separately
                }));

                setShopRevenue(shopRevenueArray);
                setInitialRecords(shopRevenueArray);
            } catch (error) {
                console.error('Error fetching revenue data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRevenueData();
    }, []);

    // Table pagination and search effects
    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        setInitialRecords(
            shopRevenue.filter((item) => {
                return item.shop_name.toLowerCase().includes(search.toLowerCase()) || item.owner_name.toLowerCase().includes(search.toLowerCase());
            }),
        );
    }, [shopRevenue, search]);

    useEffect(() => {
        const data = sortBy(initialRecords, sortStatus.columnAccessor as keyof ShopRevenue);
        setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
        setPage(1);
    }, [sortStatus]);

    // Chart data for revenue trends
    const revenueChartData: any = {
        series: [
            { name: t('revenue'), data: stats.monthlyData.revenue },
            {
                name: t('commission_rate'),
                data: stats.monthlyData.commissions,
            },
        ],
        options: {
            chart: {
                type: 'area',
                height: 300,
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
            colors: ['#4361ee', '#805dca'],
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
                categories: stats.monthlyData.months,
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

    // Chart data for revenue distribution (pie chart)
    const distributionChartData: any = {
        series: [stats.totalRevenue, stats.totalCommissions],
        options: {
            chart: {
                type: 'donut',
                height: 300,
                fontFamily: 'Nunito, sans-serif',
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                width: 2,
                colors: isDark ? ['#0e1726'] : ['#fff'],
            },
            colors: ['#4361ee', '#805dca'],
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '14px',
                markers: {
                    width: 10,
                    height: 10,
                    radius: 6,
                },
                itemMargin: {
                    horizontal: 8,
                    vertical: 8,
                },
                labels: {
                    colors: isDark ? '#bfc9d4' : '#3b3f5c',
                },
            },
            labels: [t('shops'), t('commission_rate')],
            tooltip: {
                y: {
                    formatter: function (val: number) {
                        return '$' + val.toFixed(2);
                    },
                },
            },
        },
    };

    // Format currency helper function
    const formatCurrency = (amount: number) => {
        return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    return (
        <div className="relative">
            {isLoading && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white-light/20 backdrop-blur-sm dark:bg-dark/20">
                    <div className="animate-spin rounded-full border-[3px] border-primary border-t-transparent h-12 w-12"></div>
                </div>
            )}
            <div className="pt-5 max-w-[1600px]">
                {/* Page Title */}
                <div className="mb-6">
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('revenue')}</h5>
                </div>

                {/* Stats Cards */}
                <div className="mb-6 grid gap-6">
                    {/* First row: Revenue, Commissions, Combined - 3 cards */}
                    <div className="grid gap-6 sm:grid-cols-2">
                        {/* Total Revenue */}
                        <div className="panel !border-0 border-l-4 !border-l-primary bg-primary/10">
                            <div className="flex items-center">
                                <div className="flex-none">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-white">
                                        <IconCash className="h-7 w-7" />
                                    </div>
                                </div>
                                <div className="ltr:ml-5 rtl:mr-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[15px] font-semibold dark:text-white-light">{t('total_revenue')}</h5>
                                        <div className={`badge ${stats.revenueGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                            {stats.revenueGrowth >= 0 ? '+' : ''}
                                            {stats.revenueGrowth.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center">
                                        <div className="text-xl font-bold ltr:mr-3 rtl:ml-3 dark:text-white-light">{formatCurrency(stats.totalRevenue)}</div>
                                        <div className="badge bg-primary/30 text-primary dark:bg-primary dark:text-white-light">{t('ytd')}</div>
                                    </div>
                                    <div className="mt-4 h-1 bg-[#d3d3d3] dark:bg-dark/40">
                                        <div className={`h-full rounded-full bg-gradient-to-r from-[#4361ee] to-[#805dca]`} style={{ width: `${Math.min(100, Math.abs(stats.revenueGrowth))}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Commission Revenue */}
                        <div className="panel !border-0 border-l-4 !border-l-success bg-success/10">
                            <div className="flex items-center">
                                <div className="flex-none">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-success text-white">
                                        <IconCash className="h-7 w-7" />
                                    </div>
                                </div>
                                <div className="ltr:ml-5 rtl:mr-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[15px] font-semibold dark:text-white-light">{t('commission_rate')}</h5>
                                        <div className={`badge ${stats.commissionGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                            {stats.commissionGrowth >= 0 ? '+' : ''}
                                            {stats.commissionGrowth.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center">
                                        <div className="text-xl font-bold ltr:mr-3 rtl:ml-3 dark:text-white-light">{formatCurrency(stats.totalCommissions)}</div>
                                        <div className="badge bg-success/30 text-success dark:bg-success dark:text-white-light">{t('ytd')}</div>
                                    </div>
                                    <div className="mt-4 h-1 bg-[#d3d3d3] dark:bg-dark/40">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r from-[#1abc9c] to-[#0ead69]`}
                                            style={{ width: `${Math.min(100, Math.abs(stats.commissionGrowth))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Combined Revenue */}
                        {/* <div className="panel !border-0 border-l-4 !border-l-warning bg-warning/10">
                            <div className="flex items-center">
                                <div className="flex-none">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-warning text-white">
                                        <IconCash className="h-7 w-7" />
                                    </div>
                                </div>
                                <div className="ltr:ml-5 rtl:mr-5 w-full">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[15px] font-semibold dark:text-white-light">
                                            {t('total')} {t('revenue')}
                                        </h5>
                                        <div className={`badge ${stats.combinedGrowth >= 0 ? 'badge-outline-success' : 'badge-outline-danger'}`}>
                                            {stats.combinedGrowth >= 0 ? '+' : ''}
                                            {stats.combinedGrowth.toFixed(1)}%
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center">
                                        <div className="text-xl font-bold ltr:mr-3 rtl:ml-3 dark:text-white-light">{formatCurrency(stats.combinedRevenue)}</div>
                                        <div className="badge bg-warning/30 text-warning dark:bg-warning dark:text-white-light">{t('ytd')}</div>
                                    </div>
                                    <div className="mt-4 h-1 bg-[#d3d3d3] dark:bg-dark/40">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r from-[#e2a03f] to-[#ffbd5a]`}
                                            style={{ width: `${Math.min(100, Math.abs(stats.combinedGrowth))}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div> */}
                    </div>
                </div>

                {/* Charts */}
                <div className="mb-6 grid gap-6 lg:grid-cols-2">
                    {/* Revenue Trend */}
                    <div className="panel h-full">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('revenue_trend')}</h5>
                        </div>{' '}
                        <div className="relative">
                            <div className="min-h-[300px]">
                                {isMounted && !stats.loading && <ApexChart series={revenueChartData.series} options={revenueChartData.options} type="area" height={300} />}
                                {(!isMounted || stats.loading) && (
                                    <div className="flex h-[300px] items-center justify-center">
                                        <div className="text-lg text-gray-500">Loading revenue data...</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Revenue Distribution */}
                    <div className="panel h-full">
                        {' '}
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">
                                {t('revenue')} {t('distribution')}
                            </h5>
                        </div>{' '}
                        <div className="relative">
                            <div className="min-h-[300px]">
                                {isMounted && !stats.loading && <ApexChart series={distributionChartData.series} options={distributionChartData.options} type="donut" height={300} />}
                                {(!isMounted || stats.loading) && (
                                    <div className="flex h-[300px] items-center justify-center">
                                        <div className="text-lg text-gray-500">Loading distribution data...</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shop Revenue Table */}
                <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
                    <div className="invoice-table">
                        {' '}
                        <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                            <h5 className="text-lg font-semibold dark:text-white-light">
                                {t('shops')} {t('revenue')}
                            </h5>
                            <div className="ltr:ml-auto rtl:mr-auto">
                                <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>{' '}
                        <div className="datatables pagination-padding relative">
                            <DataTable
                                className={`${stats.loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'}`}
                                records={records}
                                columns={[
                                    {
                                        accessor: 'id',
                                        title: t('id'),
                                        sortable: true,
                                        render: ({ id }) => <strong className="text-info">#{id}</strong>,
                                    },
                                    {
                                        accessor: 'shop_name',
                                        title: t('shop_name'),
                                        sortable: true,
                                    },
                                    {
                                        accessor: 'owner_name',
                                        title: t('shop_owner'),
                                        sortable: true,
                                    },
                                    {
                                        accessor: 'revenue',
                                        title: t('total_revenue'),
                                        sortable: true,
                                        render: ({ revenue }) => formatCurrency(revenue),
                                    },
                                    {
                                        accessor: 'commission_rate',
                                        title: t('commission_rate'),
                                        sortable: true,
                                        render: ({ commission_rate }) => `${commission_rate.toFixed(1)}%`,
                                    },
                                    {
                                        accessor: 'commission',
                                        title: t('commission_rate') + ' ' + t('amount'),
                                        sortable: true,
                                        render: ({ commission }) => formatCurrency(commission),
                                    },
                                    {
                                        accessor: 'balance',
                                        title: t('balance'),
                                        sortable: true,
                                        render: ({ balance }) => formatCurrency(balance),
                                    },
                                    {
                                        accessor: '',
                                        title: t('actions'),
                                        render: ({ id }) => (
                                            <div className="flex items-center gap-2">
                                                <Link href={`/shops/preview/${id}`}>
                                                    <button type="button" className="btn btn-sm btn-outline-info">
                                                        <IconEye className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                                                        {t('preview')}
                                                    </button>
                                                </Link>
                                            </div>
                                        ),
                                    },
                                ]}
                                totalRecords={initialRecords.length}
                                recordsPerPage={pageSize}
                                page={page}
                                onPageChange={(p) => setPage(p)}
                                recordsPerPageOptions={PAGE_SIZES}
                                onRecordsPerPageChange={setPageSize}
                                sortStatus={sortStatus}
                                onSortStatusChange={setSortStatus}
                                paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                            />
                            {stats.loading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm">
                                    <div className="animate-spin rounded-full border-[3px] border-primary border-t-transparent h-10 w-10"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RevenuePage;

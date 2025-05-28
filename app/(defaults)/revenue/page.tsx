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
    const [isLoading, setIsLoading] = useState(true); // Use dummy data for demonstration
    const [stats, setStats] = useState<RevenueStats>({
        totalRevenue: 471464.7,
        totalCommissions: 46604.97,
        combinedRevenue: 518069.67,
        revenueGrowth: 12.5,
        commissionGrowth: 8.7,
        combinedGrowth: 11.9,
        monthlyData: {
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            revenue: [28500, 32700, 36900, 39800, 42500, 45600, 52300, 58700, 62100, 67800, 72600, 78900],
            commissions: [2850, 3270, 3690, 3980, 4250, 4560, 5230, 5870, 6210, 6780, 7260, 7890],
        },
        loading: false,
    }); // Dummy data for demonstration
    const dummyShopRevenue: ShopRevenue[] = [
        { id: 1, shop_name: 'Fashion Boutique', owner_name: 'John Smith', revenue: 42500.75, commission: 4250.07, commission_rate: 10, balance: 38250.68, last_payment_date: '2025-05-15' },
        { id: 2, shop_name: 'Tech Galaxy', owner_name: 'Sarah Johnson', revenue: 78900.5, commission: 7890.05, commission_rate: 10, balance: 71010.45, last_payment_date: '2025-05-10' },
        { id: 3, shop_name: 'Home Decor Plus', owner_name: 'Michael Brown', revenue: 31250.25, commission: 1562.51, commission_rate: 5, balance: 29687.74, last_payment_date: '2025-05-12' },
        { id: 4, shop_name: 'Gourmet Delights', owner_name: 'Emily Davis', revenue: 52780.6, commission: 5278.06, commission_rate: 10, balance: 47502.54, last_payment_date: '2025-05-18' },
        { id: 5, shop_name: 'Sports Universe', owner_name: 'David Wilson', revenue: 64320.3, commission: 6432.03, commission_rate: 10, balance: 57888.27, last_payment_date: '2025-05-05' },
        { id: 6, shop_name: 'Beauty Haven', owner_name: 'Jessica Lee', revenue: 28750.45, commission: 2875.05, commission_rate: 10, balance: 25875.41, last_payment_date: '2025-05-20' },
        { id: 7, shop_name: 'Pet Paradise', owner_name: 'Robert Taylor', revenue: 19680.15, commission: 984.01, commission_rate: 5, balance: 18696.14, last_payment_date: '2025-05-08' },
        { id: 8, shop_name: 'Book Corner', owner_name: 'Jennifer Miller', revenue: 22450.8, commission: 1122.54, commission_rate: 5, balance: 21328.26, last_payment_date: '2025-05-14' },
        { id: 9, shop_name: 'Toy Wonderland', owner_name: 'Daniel Anderson', revenue: 35680.9, commission: 3568.09, commission_rate: 10, balance: 32112.81, last_payment_date: '2025-05-17' },
        { id: 10, shop_name: 'Kitchen Essentials', owner_name: 'Laura Martin', revenue: 48920.7, commission: 4892.07, commission_rate: 10, balance: 44028.63, last_payment_date: '2025-05-09' },
        { id: 11, shop_name: 'Fitness First', owner_name: 'Kevin Thompson', revenue: 56780.25, commission: 5678.03, commission_rate: 10, balance: 51102.23, last_payment_date: '2025-05-11' },
        { id: 12, shop_name: 'Garden Center', owner_name: 'Amanda Garcia', revenue: 39450.6, commission: 1972.53, commission_rate: 5, balance: 37478.07, last_payment_date: '2025-05-19' },
    ];

    // Shop revenue table state
    const [shopRevenue, setShopRevenue] = useState<ShopRevenue[]>(dummyShopRevenue);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<ShopRevenue[]>(dummyShopRevenue);
    const [records, setRecords] = useState<ShopRevenue[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'revenue',
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

    // Fetch revenue data (using dummy data for demonstration)
    useEffect(() => {
        // Simulate loading for a brief moment to demonstrate the loading state
        setIsLoading(true);

        // Using setTimeout to simulate a network request
        const timer = setTimeout(() => {
            // In a real application, you would fetch and process data from the database here
            // For now, we're using the dummy data that's already set in the state
            setIsLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
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

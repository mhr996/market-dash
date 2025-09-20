'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import IconTruck from '@/components/icon/icon-truck';
import IconUsers from '@/components/icon/icon-users';
import IconCar from '@/components/icon/icon-car';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconStore from '@/components/icon/icon-store';
import IconSettings from '@/components/icon/icon-settings';
import DeliveryStatisticsFilter from '@/components/delivery/delivery-statistics-filter';

interface DeliveryCompanyStats {
    id: number;
    company_name: string;
    logo_url: string | null;
    total_drivers: number;
    total_cars: number;
    total_orders: number;
    processing_orders: number;
    on_the_way_orders: number;
    completed_orders: number;
}

interface FilterState {
    shops: number[];
    drivers: number[];
    timeRange: string;
}

interface FilterOption {
    id: number;
    name: string;
    logo_url?: string;
}

const DeliveryDashboard = () => {
    const { t } = getTranslation();
    const [loading, setLoading] = useState(true);
    const [overallStats, setOverallStats] = useState({
        totalCompanies: 0,
        totalProcessing: 0,
        totalOnTheWay: 0,
        totalCompleted: 0,
        totalDrivers: 0,
        totalCars: 0,
    });
    const [topCompanies, setTopCompanies] = useState<DeliveryCompanyStats[]>([]);

    // Filter related state
    const [filters, setFilters] = useState<FilterState>({
        shops: [],
        drivers: [],
        timeRange: 'all',
    });
    const [allShops, setAllShops] = useState<FilterOption[]>([]);
    const [allDrivers, setAllDrivers] = useState<FilterOption[]>([]);

    useEffect(() => {
        fetchFilterOptions();
        fetchStatistics();
    }, []);

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

            // Fetch all drivers for filter options
            const { data: driversData } = await supabase.from('delivery_drivers').select('id, name, avatar_url').order('name');

            setAllDrivers(
                (driversData || []).map((driver) => ({
                    id: driver.id,
                    name: driver.name,
                    logo_url: driver.avatar_url,
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

            // Apply time range filter
            const dateFilter = getDateFilter(filtersToApply.timeRange);

            // Build base queries - get all delivery orders first, then filter
            let baseOrdersQuery = supabase.from('orders').select('*').eq('shipping_method', '"delivery"').eq('confirmed', true);

            // Apply time range filter
            if (dateFilter) {
                baseOrdersQuery = baseOrdersQuery.gte('created_at', dateFilter);
            }

            const { data: ordersData } = await baseOrdersQuery;

            // Apply shop and driver filters after fetching data (like delivery/orders page)
            let filteredOrders = ordersData || [];

            if (filtersToApply.shops.length > 0) {
                filteredOrders = filteredOrders.filter((order) => filtersToApply.shops.includes(order.shop));
            }

            if (filtersToApply.drivers.length > 0) {
                filteredOrders = filteredOrders.filter((order) => order.assigned_driver_id && filtersToApply.drivers.includes(order.assigned_driver_id));
            }

            // Calculate order statistics using filtered orders
            const totalProcessing = filteredOrders?.filter((order) => order.status === 'processing').length || 0;
            const totalOnTheWay = filteredOrders?.filter((order) => order.status === 'on_the_way').length || 0;
            const totalCompleted = filteredOrders?.filter((order) => order.status === 'completed').length || 0;

            // Fetch delivery companies
            let companiesQuery = supabase.from('delivery_companies').select(`
                    id,
                    company_name,
                    logo_url,
                    delivery_drivers(id, name),
                    delivery_cars(id, model)
                `);

            const { data: companiesData } = await companiesQuery;

            // Calculate company statistics
            const companiesWithStats = await Promise.all(
                (companiesData || []).map(async (company) => {
                    // Get orders for this company's shops
                    const { data: companyShops } = await supabase.from('shops').select('id').eq('delivery_companies_id', company.id);

                    const shopIds = companyShops?.map((shop) => shop.id) || [];

                    let companyOrdersQuery = supabase.from('orders').select('id, status, created_at').eq('shipping_method', '"delivery"').eq('confirmed', true).in('shop', shopIds);

                    if (dateFilter) {
                        companyOrdersQuery = companyOrdersQuery.gte('created_at', dateFilter);
                    }

                    const { data: companyOrders } = await companyOrdersQuery;

                    const processingOrders = companyOrders?.filter((order) => order.status === 'processing').length || 0;
                    const onTheWayOrders = companyOrders?.filter((order) => order.status === 'on_the_way').length || 0;
                    const completedOrders = companyOrders?.filter((order) => order.status === 'completed').length || 0;

                    return {
                        ...company,
                        total_drivers: company.delivery_drivers?.length || 0,
                        total_cars: company.delivery_cars?.length || 0,
                        total_orders: companyOrders?.length || 0,
                        processing_orders: processingOrders,
                        on_the_way_orders: onTheWayOrders,
                        completed_orders: completedOrders,
                    };
                }),
            );

            // Calculate overall statistics
            const totalCompanies = companiesData?.length || 0;
            const totalDrivers = companiesWithStats.reduce((sum, company) => sum + company.total_drivers, 0);
            const totalCars = companiesWithStats.reduce((sum, company) => sum + company.total_cars, 0);

            setOverallStats({
                totalCompanies,
                totalProcessing,
                totalOnTheWay,
                totalCompleted,
                totalDrivers,
                totalCars,
            });

            // Sort companies by total orders and set top companies
            const sortedCompanies = companiesWithStats.sort((a, b) => b.total_orders - a.total_orders).slice(0, 10);

            setTopCompanies(sortedCompanies);
        } catch (error) {
            console.error('Error fetching delivery statistics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (newFilters: FilterState) => {
        setFilters(newFilters);
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

    const CompanyCard = ({ company, rank }: { company: DeliveryCompanyStats; rank: number }) => (
        <Link href={`/delivery/companies/preview/${company.id}`} className="block">
            <div className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm">{rank}</div>
                    </div>
                    <div className="flex-shrink-0">
                        <img src={company.logo_url || '/assets/images/company-placeholder.jpg'} alt={company.company_name} className="w-12 h-12 rounded-lg object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-dark dark:text-white truncate">{company.company_name}</h4>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{company.total_drivers} Drivers</span>
                            <span>{company.total_cars} Cars</span>
                            <span>{company.total_orders} Orders</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-primary">{formatNumber(company.total_orders || 0)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Total Orders</div>
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
        <div className="w-full max-w-none p-6">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-5 mb-4">
                    <ul className="flex space-x-2 rtl:space-x-reverse">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/delivery" className="text-primary hover:underline">
                                Delivery
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>Dashboard</span>
                        </li>
                    </ul>
                </div>
                <h1 className="text-2xl font-bold text-dark dark:text-white">Delivery Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage Companies, Fleet & Orders</p>
            </div>

            {/* Filter Component */}
            <DeliveryStatisticsFilter shops={allShops} drivers={allDrivers} onFilterChange={handleFilterChange} currentFilters={filters} isLoading={loading} />

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 w-full max-w-none">
                <StatCard icon={<IconStore className="w-5 h-5 text-white" />} title="Total Companies" value={overallStats.totalCompanies} color="bg-primary" />
                <StatCard icon={<IconSettings className="w-5 h-5 text-white" />} title="Total Processing" value={overallStats.totalProcessing} color="bg-info" />
                <StatCard icon={<IconTruck className="w-5 h-5 text-white" />} title="Total On The Way" value={overallStats.totalOnTheWay} color="bg-warning" />
                <StatCard icon={<IconShoppingCart className="w-5 h-5 text-white" />} title="Total Completed" value={overallStats.totalCompleted} color="bg-success" />
                <StatCard icon={<IconUsers className="w-5 h-5 text-white" />} title="Total Drivers" value={overallStats.totalDrivers} color="bg-secondary" />
                <StatCard icon={<IconCar className="w-5 h-5 text-white" />} title="Total Cars" value={overallStats.totalCars} color="bg-danger" />
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Link href="/delivery/companies" className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary">
                            <IconStore className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-dark dark:text-white">Companies</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage delivery companies</p>
                        </div>
                    </div>
                </Link>

                <Link href="/delivery/cars" className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-danger">
                            <IconCar className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-dark dark:text-white">Cars</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage delivery vehicles</p>
                        </div>
                    </div>
                </Link>

                <Link href="/delivery/drivers" className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
                            <IconUsers className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-dark dark:text-white">Drivers</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage delivery drivers</p>
                        </div>
                    </div>
                </Link>

                <Link href="/delivery/orders" className="panel hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                    <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success">
                            <IconShoppingCart className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-dark dark:text-white">Orders</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage delivery orders</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Top Companies */}
            <div className="space-y-4 w-full max-w-none">
                <h2 className="text-xl font-semibold text-dark dark:text-white mb-4">Top Performing Companies</h2>
                {topCompanies.length > 0 ? (
                    topCompanies.map((company, index) => <CompanyCard key={company.id} company={company} rank={index + 1} />)
                ) : (
                    <div className="panel text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">No companies found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryDashboard;

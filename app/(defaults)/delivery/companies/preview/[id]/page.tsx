'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconEdit from '@/components/icon/icon-edit';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconCalendar from '@/components/icon/icon-calendar';
import IconUser from '@/components/icon/icon-user';
import IconMail from '@/components/icon/icon-mail';
import IconBuilding from '@/components/icon/icon-building';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconLocation from '@/components/icon/icon-map-pin';
import IconCar from '@/components/icon/icon-car';
import { getTranslation } from '@/i18n';
import 'leaflet/dist/leaflet.css';

// Import the map component dynamically with no SSR
const InteractiveMap = dynamic(() => import('@/components/map/interactive-map'), {
    ssr: false, // This will prevent the component from being rendered on the server
});

interface DeliveryCompany {
    id: number;
    company_name: string;
    logo_url: string | null;
    cover_image_url: string | null;
    owner_name: string;
    company_number: string;
    phone: string;
    email: string;
    address: string;
    details: string;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    delivery_prices?: {
        express_price: number;
        fast_price: number;
        standard_price: number;
    };
    delivery_location_prices?: Array<{
        id: number;
        delivery_location: string;
        express_price: number;
        fast_price: number;
        standard_price: number;
    }>;
}

interface Order {
    id: number;
    order_id: string;
    created_at: string;
    status: string;
    total_amount: number;
    shipping_method: any;
    assigned_driver_id?: number;
    assigned_driver?: {
        id: number;
        name: string;
        phone: string;
        avatar_url?: string;
    };
    products: {
        id: number;
        title: string;
        price: number;
        images: string[];
        shops: {
            shop_name: string;
            delivery_companies_id?: number;
        };
    };
    profiles: {
        id: string;
        full_name: string;
        email: string;
    };
}

const DeliveryCompanyPreview = () => {
    // Fix: Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;
    const { t } = getTranslation();
    const router = useRouter();
    const [company, setCompany] = useState<DeliveryCompany | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'company' | 'pricing' | 'drivers_cars' | 'orders'>('company');
    const [unauthorized, setUnauthorized] = useState(false);

    // Drivers and Cars data
    const [drivers, setDrivers] = useState<any[]>([]);
    const [cars, setCars] = useState<any[]>([]);

    // Orders data
    const [orders, setOrders] = useState<any[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    // Fetch company data
    const fetchCompanyData = async () => {
        try {
            const { data, error } = await supabase
                .from('delivery_companies')
                .select(
                    `
                    *,
                    delivery_prices(
                        express_price,
                        fast_price,
                        standard_price
                    ),
                    delivery_location_prices(
                        id,
                        delivery_location,
                        express_price,
                        fast_price,
                        standard_price
                    )
                `,
                )
                .eq('id', id)
                .single();

            if (error) throw error;

            setCompany({
                ...data,
                delivery_prices: data.delivery_prices?.[0] || {
                    standard_price: 0,
                    express_price: 0,
                    overnight_price: 0,
                },
                delivery_location_prices: data.delivery_location_prices || [],
            });

            // Fetch drivers and cars for this company
            const { data: driversData, error: driversError } = await supabase
                .from('delivery_drivers')
                .select(
                    `
                    id,
                    name,
                    avatar_url,
                    phone,
                    delivery_cars(
                        id,
                        plate_number,
                        brand,
                        model
                    )
                `,
                )
                .eq('delivery_companies_id', id);

            if (driversError) throw driversError;

            const { data: carsData, error: carsError } = await supabase
                .from('delivery_cars')
                .select(
                    `
                    id,
                    plate_number,
                    brand,
                    model,
                    color,
                    capacity,
                    delivery_drivers(
                        id,
                        name,
                        phone
                    )
                `,
                )
                .eq('delivery_companies_id', id);

            if (carsError) throw carsError;

            setDrivers(driversData || []);
            setCars(carsData || []);
        } catch (error) {
            setAlert({ visible: true, message: t('error_loading_company'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    // Fetch orders for this delivery company
    const fetchOrders = async () => {
        try {
            setOrdersLoading(true);
            // First, get all orders with basic data
            const { data: ordersData, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
            if (ordersError) throw ordersError;

            if (!ordersData || ordersData.length === 0) {
                setOrders([]);
                return;
            }

            // Get all product IDs from orders
            const productIds = ordersData.map((order) => order.product_id).filter(Boolean);

            if (productIds.length === 0) {
                setOrders([]);
                return;
            }

            // Get products with their shop IDs
            const { data: productsData, error: productsError } = await supabase.from('products').select('id, title, price, images, shop').in('id', productIds);

            if (productsError) throw productsError;

            // Get shop IDs from products
            const shopIds = productsData?.map((p) => p.shop).filter(Boolean) || [];

            if (shopIds.length === 0) {
                setOrders([]);
                return;
            }

            // Get shops with their delivery company info
            const { data: shopsData, error: shopsError } = await supabase.from('shops').select('id, shop_name, delivery_companies_id').in('id', shopIds);

            if (shopsError) throw shopsError;

            // Filter shops that use this delivery company
            const relevantShops = shopsData?.filter((shop) => shop.delivery_companies_id === parseInt(id)) || [];
            const relevantShopIds = relevantShops.map((s) => s.id);

            // Filter products that belong to relevant shops
            const relevantProducts = productsData?.filter((product) => relevantShopIds.includes(product.shop)) || [];

            const relevantProductIds = relevantProducts.map((p) => p.id);

            // Filter orders that have relevant products AND are delivery orders
            const filteredOrders = ordersData.filter((order) => {
                const isRelevantProduct = relevantProductIds.includes(order.product_id);
                const isDelivery = order.shipping_method === '"delivery"' || order.shipping_method === 'delivery';
                return isRelevantProduct && isDelivery;
            });

            if (filteredOrders.length === 0) {
                setOrders([]);
                return;
            }

            // Get driver data for assigned orders
            const assignedDriverIds = filteredOrders.map((order) => order.assigned_driver_id).filter(Boolean);

            let driversData: any[] = [];
            if (assignedDriverIds.length > 0) {
                const { data: drivers, error: driversError } = await supabase.from('delivery_drivers').select('id, name, phone, avatar_url').in('id', assignedDriverIds);

                if (!driversError) {
                    driversData = drivers || [];
                }
            }

            // Get customer data
            const buyerIds = filteredOrders.map((order) => order.buyer_id).filter(Boolean);
            const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('id, full_name, email').in('id', buyerIds);

            if (profilesError) throw profilesError;

            // Format orders for display
            const formattedOrders = filteredOrders.map((order: any) => {
                const product = relevantProducts.find((p) => p.id === order.product_id);
                const driver = driversData.find((d) => d.id === order.assigned_driver_id);
                const profile = profilesData?.find((p) => p.id === order.buyer_id);
                const shop = relevantShops.find((s) => s.id === product?.shop);

                return {
                    id: order.id,
                    order_id: `ORD-${order.id}`,
                    created_at: order.created_at,
                    status: order.status,
                    total_amount: order.total_amount || 0, // Handle missing field
                    shipping_method: order.shipping_method,
                    assigned_driver_id: order.assigned_driver_id,
                    assigned_driver: driver,
                    products: {
                        ...product,
                        shops: shop,
                    },
                    profiles: profile,
                    delivery_type: order.shipping_method === '"delivery"' || order.shipping_method === 'delivery' ? 'delivery' : 'pickup',
                };
            });

            setOrders(formattedOrders);
        } catch (error) {
            setAlert({ visible: true, message: 'Error fetching orders', type: 'danger' });
        } finally {
            setOrdersLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchCompanyData();
        }
    }, [id]);

    // Fetch orders when orders tab is active
    useEffect(() => {
        if (activeTab === 'orders' && company) {
            fetchOrders();
        }
    }, [activeTab, company]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!company) {
        return <div className="flex items-center justify-center h-screen">Company not found</div>;
    }

    return (
        <div className="container mx-auto p-6 w-full max-w-none">
            <div className="flex items-center gap-4 mb-6">
                {' '}
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <Link href={`/delivery/companies/edit/${company.id}`} className="btn btn-primary flex items-center gap-2">
                    <IconEdit className="h-5 w-5" />
                    Edit Company
                </Link>
            </div>
            {/* Breadcrumb Navigation */}
            <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        Home
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/delivery/companies" className="text-primary hover:underline">
                        Companies
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{company.company_name}</span>
                </li>
            </ul>
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}
            {/* Company Header with Cover Image */}
            <div className="mb-6 rounded-md overflow-hidden">
                <div className="relative h-64 w-full">
                    <img src={company.cover_image_url || '/assets/images/img-placeholder-fallback.webp'} alt={`${company.company_name} Cover`} className="h-full w-full object-cover" />
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-6">
                        <div className="flex items-center">
                            <div className="h-24 w-24 rounded-lg border-4 border-white overflow-hidden bg-white mr-4">
                                <img src={company.logo_url || '/assets/images/shop-placeholder.jpg'} alt={company.company_name} className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{company.company_name}</h1>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-lg text-white">{company.owner_name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="mb-5">
                <div className="flex border-b border-[#ebedf2] dark:border-[#191e3a]">
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'company' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('company')}
                    >
                        <div className="flex items-center gap-2">
                            <IconBuilding className="h-5 w-5" />
                            {t('company_info')}
                        </div>
                    </button>
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'pricing' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('pricing')}
                    >
                        <div className="flex items-center gap-2">
                            <IconDollarSign className="h-5 w-5" />
                            {t('pricing')}
                        </div>
                    </button>
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'drivers_cars' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('drivers_cars')}
                    >
                        <div className="flex items-center gap-2">
                            <IconUser className="h-5 w-5" />
                            {t('drivers_cars')}
                        </div>
                    </button>
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'orders' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('orders')}
                    >
                        <div className="flex items-center gap-2">
                            <IconCalendar className="h-5 w-5" />
                            Orders
                        </div>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeTab === 'company' && (
                    <>
                        {/* Owner Information */}
                        <div className="lg:col-span-1">
                            <div className="panel h-full w-full max-w-none">
                                <div className="mb-5 flex flex-col items-center text-center">
                                    <div className="mb-5 h-32 w-32 overflow-hidden rounded-full">
                                        <img src={company.logo_url || '/assets/images/user-placeholder.webp'} alt={company.company_name} className="h-full w-full object-cover" />
                                    </div>
                                    <h5 className="text-xl font-bold text-primary">{company.company_name || 'N/A'}</h5>
                                    <p className="text-gray-500 dark:text-gray-400">Company Owner</p>
                                </div>
                                <div className="space-y-4 border-t border-[#ebedf2] pt-5 dark:border-[#191e3a]">
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-white-light">
                                            <IconMail className="h-5 w-5" />
                                        </span>
                                        <div className="ltr:ml-3 rtl:mr-3">
                                            <h5 className="text-sm font-semibold dark:text-white-light">Email</h5>
                                            <p className="text-gray-500 dark:text-gray-400">{company.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-success-light text-success dark:bg-success dark:text-white-light">
                                            <IconPhone className="h-5 w-5" />
                                        </span>
                                        <div className="ltr:ml-3 rtl:mr-3">
                                            <h5 className="text-sm font-semibold dark:text-white-light">Phone</h5>
                                            <p className="text-gray-500 dark:text-gray-400">{company.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-warning-light text-warning dark:bg-warning dark:text-white-light">
                                            <IconCalendar className="h-5 w-5" />
                                        </span>
                                        <div className="ltr:ml-3 rtl:mr-3">
                                            <h5 className="text-sm font-semibold dark:text-white-light">Registration Date</h5>
                                            <p className="text-gray-500 dark:text-gray-400">{company.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Company Summary */}
                        <div className="lg:col-span-2">
                            <div className="panel h-full w-full max-w-none">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">Company Summary</h5>
                                    <p className="mt-2 text-gray-500 dark:text-gray-400">{company.details || 'No description available.'}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mt-8">
                                    <div>
                                        <h6 className="text-sm font-semibold mb-2">Owner Name</h6>
                                        <span className="badge bg-primary text-white">{company.owner_name || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <h6 className="text-sm font-semibold mb-2">Company Number</h6>
                                        <span className="badge bg-success text-white">{company.company_number || 'N/A'}</span>
                                    </div>
                                    {company.address && (
                                        <div className="sm:col-span-2">
                                            <h6 className="text-sm font-semibold mb-2">Address</h6>
                                            <div className="flex">
                                                <span className="mt-1 ltr:mr-2 rtl:ml-2 text-primary">
                                                    <IconMapPin className="h-5 w-5" />
                                                </span>
                                                <p className="text-gray-500 dark:text-gray-400">{company.address}</p>
                                            </div>
                                        </div>
                                    )}
                                    {company.latitude && company.longitude && (
                                        <div className="sm:col-span-2">
                                            <h6 className="text-sm font-semibold mb-3">Company Location</h6>
                                            <div className="h-[400px] rounded-md overflow-hidden">
                                                <Suspense fallback={<div className="h-full bg-gray-200 flex items-center justify-center">Loading map...</div>}>
                                                    <InteractiveMap position={[company.latitude, company.longitude]} zoom={13} height="400px" shopName={company.company_name} />
                                                </Suspense>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Coordinates: {company.latitude.toFixed(6)}, {company.longitude.toFixed(6)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'pricing' && (
                    <div className="lg:col-span-3">
                        {/* Base Pricing */}
                        <div className="panel mb-5 w-full max-w-none">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('base_delivery_prices')}</h5>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('standard_pricing_for_all_locations')}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                <div className="text-center p-4 bg-danger/10 rounded-lg">
                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">Express (Same Day)</h6>
                                    <p className="text-2xl font-bold text-danger">${company.delivery_prices?.express_price || 0}</p>
                                </div>
                                <div className="text-center p-4 bg-warning/10 rounded-lg">
                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">Fast (2-3 Days)</h6>
                                    <p className="text-2xl font-bold text-warning">${company.delivery_prices?.fast_price || 0}</p>
                                </div>
                                <div className="text-center p-4 bg-success/10 rounded-lg">
                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">Standard (3-5 Days)</h6>
                                    <p className="text-2xl font-bold text-success">${company.delivery_prices?.standard_price || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Location Based Prices */}
                        <div className="panel w-full max-w-none">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('location_based_prices')}</h5>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('specific_pricing_for_different_locations')}</p>
                            </div>
                            {company.delivery_location_prices && company.delivery_location_prices.length > 0 ? (
                                <div className="grid grid-cols-1 gap-6">
                                    {company.delivery_location_prices.map((locationPrice, index) => (
                                        <div key={locationPrice.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h6 className="text-lg font-semibold">{locationPrice.delivery_location}</h6>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                <div className="text-center p-3 bg-danger/10 rounded-lg">
                                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-1">Express (Same Day)</h6>
                                                    <p className="text-xl font-bold text-danger">${locationPrice.express_price}</p>
                                                </div>
                                                <div className="text-center p-3 bg-warning/10 rounded-lg">
                                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-1">Fast (2-3 Days)</h6>
                                                    <p className="text-xl font-bold text-warning">${locationPrice.fast_price}</p>
                                                </div>
                                                <div className="text-center p-3 bg-success/10 rounded-lg">
                                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-1">Standard (3-5 Days)</h6>
                                                    <p className="text-xl font-bold text-success">${locationPrice.standard_price}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <IconLocation className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                    <p>{t('no_location_prices_set')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'drivers_cars' && (
                    <div className="lg:col-span-3">
                        <div className="panel w-full max-w-none">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('drivers_cars')}</h5>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('company_drivers_cars_overview')}</p>
                            </div>

                            {/* Drivers Section */}
                            <div className="mb-8">
                                <h6 className="text-lg font-semibold dark:text-white-light mb-4 flex items-center">
                                    <IconUser className="h-5 w-5 mr-2" />
                                    {t('drivers')} ({drivers.length})
                                </h6>
                                {drivers.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {drivers.map((driver) => (
                                            <div key={driver.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-center mb-3">
                                                    <div className="h-12 w-12 rounded-full overflow-hidden mr-3">
                                                        <img src={driver.avatar_url || '/assets/images/user-placeholder.webp'} alt={driver.name} className="h-full w-full object-cover" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h6 className="font-semibold text-primary text-lg">{driver.name}</h6>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{driver.phone || 'No phone'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    <p className="mb-2">
                                                        <span className="font-medium">{t('assigned_car')}:</span>{' '}
                                                        {driver.delivery_cars && driver.delivery_cars.length > 0 ? driver.delivery_cars[0].plate_number : t('not_assigned')}
                                                    </p>
                                                    {driver.delivery_cars && driver.delivery_cars.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">{driver.delivery_cars[0].brand}</span>
                                                            <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">{driver.delivery_cars[0].model}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <IconUser className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>{t('no_drivers_found')}</p>
                                    </div>
                                )}
                            </div>

                            {/* Cars Section */}
                            <div>
                                <h6 className="text-lg font-semibold dark:text-white-light mb-4 flex items-center">
                                    <IconCar className="h-5 w-5 mr-2" />
                                    {t('cars')} ({cars.length})
                                </h6>
                                {cars.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {cars.map((car) => (
                                            <div key={car.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-center mb-3">
                                                    <div className="h-12 w-12 rounded-md bg-primary-light dark:bg-primary text-primary dark:text-primary-light flex items-center justify-center mr-3">
                                                        <IconCar className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h6 className="font-semibold text-primary text-lg">{car.plate_number}</h6>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{car.brand}</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                                    <p className="mb-2">
                                                        <span className="font-medium">{t('assigned_driver')}:</span>{' '}
                                                        {car.delivery_drivers ? `${car.delivery_drivers.name} - ${car.delivery_drivers.phone || 'No phone'}` : t('not_assigned')}
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">{car.model}</span>
                                                        {car.color && <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">{car.color}</span>}
                                                        {car.capacity && <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">{car.capacity} seats</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                        <IconCar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>{t('no_cars_found')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="lg:col-span-3">
                        <div className="panel w-full max-w-none">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">Orders</h5>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Orders involving this delivery company</p>
                            </div>

                            {ordersLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                    <span className="ml-2">Loading orders...</span>
                                </div>
                            ) : orders.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                                                <th className="text-left py-3 px-4 font-semibold">Customer</th>
                                                <th className="text-left py-3 px-4 font-semibold">Product</th>
                                                <th className="text-left py-3 px-4 font-semibold">Shop</th>
                                                <th className="text-left py-3 px-4 font-semibold">Amount</th>
                                                <th className="text-left py-3 px-4 font-semibold">Status</th>
                                                <th className="text-left py-3 px-4 font-semibold">Driver</th>
                                                <th className="text-left py-3 px-4 font-semibold">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map((order) => (
                                                <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                    <td className="py-3 px-4">
                                                        <span className="font-medium text-primary">{order.order_id}</span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div>
                                                            <div className="font-medium">{order.profiles?.full_name || 'N/A'}</div>
                                                            <div className="text-sm text-gray-500">{order.profiles?.email || 'N/A'}</div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center">
                                                            {order.products?.images && order.products.images.length > 0 && (
                                                                <img src={order.products.images[0]} alt={order.products.title} className="h-10 w-10 rounded object-cover mr-3" />
                                                            )}
                                                            <div>
                                                                <div className="font-medium">{order.products?.title || 'N/A'}</div>
                                                                <div className="text-sm text-gray-500">${order.products?.price || 0}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="font-medium">{order.products?.shops?.shop_name || 'N/A'}</span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="font-semibold text-success">${order.total_amount || 0}</span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className={`badge badge-outline-${order.status === 'completed' ? 'success' : order.status === 'processing' ? 'warning' : 'danger'}`}>
                                                            {order.status || 'pending'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {order.delivery_type === 'pickup' ? (
                                                            <span className="text-gray-500">Pickup</span>
                                                        ) : order.assigned_driver ? (
                                                            <div className="flex items-center">
                                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                                                                    <IconUser className="h-4 w-4 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-medium">{order.assigned_driver.name}</div>
                                                                    <div className="text-xs text-gray-500">{order.assigned_driver.phone}</div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-orange-500">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <IconCalendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No orders found for this delivery company</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryCompanyPreview;

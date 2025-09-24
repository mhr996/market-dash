'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import supabase from '@/lib/supabase';
import { calculateOrderTotal } from '@/utils/order-calculations';
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

interface DeliveryMethod {
    id: number;
    label: string;
    delivery_time: string;
    price: number;
    is_active: boolean;
    delivery_location_methods?: Array<{
        id: number;
        location_name: string;
        price_addition: number;
        is_active: boolean;
    }>;
}

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
    delivery_methods?: DeliveryMethod[];
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
    const [activeTab, setActiveTab] = useState<'company' | 'pricing' | 'drivers_cars' | 'orders' | 'balance'>('company');
    const [unauthorized, setUnauthorized] = useState(false);

    // Drivers and Cars data
    const [drivers, setDrivers] = useState<any[]>([]);
    const [cars, setCars] = useState<any[]>([]);

    // Orders data
    const [orders, setOrders] = useState<any[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);

    // Balance UI state
    const [balance, setBalance] = useState(0);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');

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
                    delivery_methods(
                        id,
                        label,
                        delivery_time,
                        price,
                        is_active,
                        delivery_location_methods(
                            id,
                            location_name,
                            price_addition,
                            is_active
                        )
                    )
                `,
                )
                .eq('id', id)
                .single();

            if (error) throw error;

            setCompany({
                ...data,
                delivery_methods: data.delivery_methods || [],
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
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select(
                    `
                    *,
                    delivery_methods(id, label, delivery_time, price),
                    delivery_location_methods(id, location_name, price_addition),
                    selected_feature_value_ids
                `,
                )
                .order('created_at', { ascending: false });
            if (ordersError) throw ordersError;

            if (!ordersData || ordersData.length === 0) {
                setOrders([]);
                return;
            }

            // Fetch selected features for orders that have them
            const ordersWithFeatures = ordersData.filter((order) => order.selected_feature_value_ids && order.selected_feature_value_ids.length > 0);

            if (ordersWithFeatures.length > 0) {
                const allFeatureValueIds = ordersWithFeatures.flatMap((order) => order.selected_feature_value_ids);

                const { data: featuresData, error: featuresError } = await supabase
                    .from('products_features_values')
                    .select(
                        `
                        id, value, price_addition,
                        products_features_labels!inner(label)
                    `,
                    )
                    .in('id', allFeatureValueIds);

                if (!featuresError && featuresData) {
                    // Add features to orders
                    ordersData.forEach((order) => {
                        if (order.selected_feature_value_ids && order.selected_feature_value_ids.length > 0) {
                            order.selected_features = order.selected_feature_value_ids
                                .map((id: number) => {
                                    const feature = featuresData.find((f: any) => f.id === id);
                                    return feature
                                        ? {
                                              label: feature.products_features_labels[0].label,
                                              value: feature.value,
                                              price_addition: feature.price_addition,
                                          }
                                        : null;
                                })
                                .filter(Boolean);
                        }
                    });
                }
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
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'balance' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('balance')}
                    >
                        <div className="flex items-center gap-2">
                            <IconDollarSign className="h-5 w-5" />
                            Balance
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
                        <div className="panel w-full max-w-none">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">Delivery Methods & Pricing</h5>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Flexible pricing structure with location-based options</p>
                            </div>

                            {company.delivery_methods && company.delivery_methods.length > 0 ? (
                                <div className="space-y-6">
                                    {company.delivery_methods
                                        .filter((method) => method.is_active)
                                        .map((method, methodIndex) => (
                                            <div key={method.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h6 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{method.label}</h6>
                                                    <span className="text-2xl font-bold text-primary">${method.price}</span>
                                                </div>

                                                <div className="mb-3">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                                        Delivery Time: <strong>{method.delivery_time}</strong>
                                                    </span>
                                                </div>

                                                {/* Location-based Pricing */}
                                                {method.delivery_location_methods && method.delivery_location_methods.length > 0 && (
                                                    <div className="mt-4">
                                                        <h6 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">Location-based Pricing</h6>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {method.delivery_location_methods
                                                                .filter((loc) => loc.is_active)
                                                                .map((location, locationIndex) => (
                                                                    <div key={location.id} className="p-3 bg-white dark:bg-gray-900 rounded border">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{location.location_name}</span>
                                                                            <span className="text-sm font-semibold text-primary">+${location.price_addition}</span>
                                                                        </div>
                                                                        <div className="text-xs text-gray-500 mt-1">Total: ${method.price + location.price_addition}</div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <div className="mb-4">
                                        <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1}
                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-sm">No delivery methods configured</p>
                                    <p className="text-xs mt-1">Delivery methods will appear here when added</p>
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
                                                                <div className="text-sm text-gray-500">${calculateOrderTotal(order).toFixed(2)}</div>
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

                {activeTab === 'balance' && (
                    <div className="lg:col-span-3">
                        <div className="panel w-full max-w-none">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">Balance</h5>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Manage company balance and payments</p>
                            </div>

                            {/* Balance Card */}
                            <div
                                className={`panel text-white w-full max-w-none ${
                                    balance > 0
                                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                                        : balance < 0
                                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h5 className="text-lg font-semibold mb-2">Company Balance</h5>
                                        <p className={`text-3xl font-bold ${balance > 0 ? 'text-green-100' : balance < 0 ? 'text-red-100' : 'text-blue-100'}`}>${balance.toFixed(2)}</p>
                                        <p className={`mt-1 ${balance > 0 ? 'text-green-100' : balance < 0 ? 'text-red-100' : 'text-blue-100'}`}>
                                            {balance >= 0 ? 'Amount owed to company' : 'Amount company owes to platform'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <button
                                            className={`btn bg-white hover:bg-gray-100 ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-blue-600'}`}
                                            onClick={() => setShowPaymentModal(true)}
                                        >
                                            Send Payment
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => {
                                        setBalance(0);
                                        setAlert({ visible: true, message: 'Balance reset to $0.00', type: 'success' });
                                    }}
                                >
                                    Reset to $0.00
                                </button>
                                <button
                                    className="btn btn-outline-success"
                                    onClick={() => {
                                        setBalance((prev) => prev + 100);
                                        setAlert({ visible: true, message: 'Added $100.00 to balance', type: 'success' });
                                    }}
                                >
                                    Add $100.00
                                </button>
                                <button
                                    className="btn btn-outline-danger"
                                    onClick={() => {
                                        setBalance((prev) => prev - 50);
                                        setAlert({ visible: true, message: 'Subtracted $50.00 from balance', type: 'success' });
                                    }}
                                >
                                    Subtract $50.00
                                </button>
                            </div>

                            {/* Transaction History */}
                            <div className="mt-8">
                                <h6 className="text-lg font-semibold dark:text-white-light mb-4">Transaction History</h6>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <th className="text-left py-3 px-4 font-semibold">Date</th>
                                                <th className="text-left py-3 px-4 font-semibold">Type</th>
                                                <th className="text-left py-3 px-4 font-semibold">Description</th>
                                                <th className="text-left py-3 px-4 font-semibold">Amount</th>
                                                <th className="text-left py-3 px-4 font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                    <div className="flex flex-col items-center">
                                                        <div className="text-gray-400 mb-2">
                                                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={1}
                                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                />
                                                            </svg>
                                                        </div>
                                                        <p className="text-sm">No transactions found</p>
                                                        <p className="text-xs text-gray-400 mt-1">Transaction history will appear here</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Send Payment</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Amount</label>
                                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="form-input w-full" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description</label>
                                <textarea
                                    value={paymentDescription}
                                    onChange={(e) => setPaymentDescription(e.target.value)}
                                    className="form-textarea w-full"
                                    placeholder="Payment description..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button
                                className="btn btn-primary flex-1"
                                onClick={() => {
                                    const amount = parseFloat(paymentAmount) || 0;
                                    setBalance((prev) => prev + amount);
                                    setAlert({ visible: true, message: `Payment of $${amount.toFixed(2)} sent`, type: 'success' });
                                    setShowPaymentModal(false);
                                    setPaymentAmount('');
                                    setPaymentDescription('');
                                }}
                            >
                                Send Payment
                            </button>
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setPaymentAmount('');
                                    setPaymentDescription('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryCompanyPreview;

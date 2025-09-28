'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconEdit from '@/components/icon/icon-edit';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconClock from '@/components/icon/icon-clock';
import IconCalendar from '@/components/icon/icon-calendar';
import IconUser from '@/components/icon/icon-user';
import IconMail from '@/components/icon/icon-mail';
import IconX from '@/components/icon/icon-x';
import IconCash from '@/components/icon/icon-cash-banknotes';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconCar from '@/components/icon/icon-car';
import IconTruck from '@/components/icon/icon-truck';
import IconBuilding from '@/components/icon/icon-building';
import { getTranslation } from '@/i18n';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';

// Import the map component dynamically with no SSR
const InteractiveMap = dynamic(() => import('@/components/map/interactive-map'), {
    ssr: false,
});

interface WorkHours {
    day: string;
    open: boolean;
    startTime: string;
    endTime: string;
}

interface ShopCategory {
    id: number;
    title: string;
    description: string;
}

interface ShopSubCategory {
    id: number;
    title: string;
    description: string;
    category_id: number;
}

interface DeliveryCompany {
    id: number;
    company_name: string;
    logo_url: string | null;
}

interface Shop {
    id: number;
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    cover_image_url: string | null;
    owner: string;
    status: string;
    public: boolean;
    created_at?: string;
    address?: string;
    work_hours?: WorkHours[];
    phone_numbers?: string[];
    category_shop_id?: number | null;
    subcategory_shop_id?: number | null;
    delivery_companies_id?: number | null;
    gallery?: string[] | null;
    latitude?: number | null;
    longitude?: number | null;
    balance?: number;
    commission_rate?: number;
    profiles?: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
        email?: string | null;
        phone?: string | null;
    };
    categories_shop?: ShopCategory;
    categories_sub_shop?: ShopSubCategory;
    delivery_companies?: DeliveryCompany;
}

interface ShopInfoTabProps {
    shopId: number;
}

const ShopInfoTab = ({ shopId }: ShopInfoTabProps) => {
    const { t } = getTranslation();
    const router = useRouter();
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    // Delivery company and drivers/cars data
    const [deliveryCompany, setDeliveryCompany] = useState<DeliveryCompany | null>(null);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [cars, setCars] = useState<any[]>([]);

    // Pricing data
    const [deliveryPrices, setDeliveryPrices] = useState<{
        express_price: number;
        fast_price: number;
        standard_price: number;
    } | null>(null);
    const [locationPrices, setLocationPrices] = useState<any[]>([]);

    const defaultWorkHours: WorkHours[] = [
        { day: 'Monday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Tuesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Wednesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Thursday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Friday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Saturday', open: false, startTime: '09:00', endTime: '18:00' },
        { day: 'Sunday', open: false, startTime: '09:00', endTime: '18:00' },
    ];

    useEffect(() => {
        const fetchShop = async () => {
            try {
                // Updated query to fetch shop category details
                const { data, error } = await supabase
                    .from('shops')
                    .select(
                        `
                        *, 
                        profiles(id, full_name, avatar_url, email, phone), 
                        categories_shop(*),
                        categories_sub_shop(*),
                        delivery_companies(id, company_name, logo_url)
                    `,
                    )
                    .eq('id', shopId)
                    .single();

                if (error) throw error;

                setShop(data);

                // Fetch delivery company data if shop has one
                if (data.delivery_companies_id) {
                    const { data: deliveryCompanyData, error: deliveryCompanyError } = await supabase
                        .from('delivery_companies')
                        .select('id, company_name, logo_url')
                        .eq('id', data.delivery_companies_id)
                        .single();

                    if (deliveryCompanyError) throw deliveryCompanyError;
                    setDeliveryCompany(deliveryCompanyData);

                    // Fetch drivers for this delivery company
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
                        .eq('delivery_companies_id', data.delivery_companies_id);

                    if (driversError) throw driversError;
                    setDrivers(driversData || []);

                    // Fetch cars for this delivery company
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
                        .eq('delivery_companies_id', data.delivery_companies_id);

                    if (carsError) throw carsError;
                    setCars(carsData || []);

                    // Fetch delivery pricing data
                    const { data: pricingData, error: pricingError } = await supabase
                        .from('delivery_prices')
                        .select('express_price, fast_price, standard_price')
                        .eq('delivery_companies_id', data.delivery_companies_id)
                        .single();

                    if (!pricingError && pricingData) {
                        setDeliveryPrices(pricingData);
                    }

                    // Fetch location-based pricing
                    const { data: locationPricesData, error: locationPricesError } = await supabase
                        .from('delivery_location_prices')
                        .select('id, delivery_location, express_price, fast_price, standard_price')
                        .eq('delivery_companies_id', data.delivery_companies_id)
                        .order('delivery_location', { ascending: true });

                    if (!locationPricesError) {
                        setLocationPrices(locationPricesData || []);
                    }
                }
            } catch (error) {
                setAlert({ visible: true, message: 'Error fetching shop details', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (shopId) {
            fetchShop();
        }
    }, [shopId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Shop Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">The shop you're looking for doesn't exist.</p>
                </div>
            </div>
        );
    }

    const workHours = shop?.work_hours || defaultWorkHours;
    const phoneNumbers = shop?.phone_numbers || [''];
    const gallery = shop?.gallery || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Shop Information</h3>
                <Link href={`/shops/edit/${shop.id}`} className="btn btn-primary flex items-center gap-2">
                    <IconEdit className="h-5 w-5" />
                    Edit Shop
                </Link>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Shop Header with Cover Image */}
            <div className="mb-6 rounded-md overflow-hidden w-full max-w-none">
                <div className="relative h-64 w-full">
                    <img src={shop.cover_image_url || '/assets/images/img-placeholder-fallback.webp'} alt={`${shop.shop_name} Cover`} className="h-full w-full object-cover" />
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-6">
                        <div className="flex items-center">
                            <div className="h-24 w-24 rounded-lg border-4 border-white overflow-hidden bg-white mr-4">
                                <img src={shop.logo_url || '/assets/images/shop-placeholder.jpg'} alt={shop.shop_name} className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{shop.shop_name}</h1>
                                <div className="flex gap-2 mt-1">
                                    <span className={`badge badge-outline-${shop.public ? 'success' : 'danger'}`}>{shop.public ? 'Public' : 'Private'}</span>
                                    <span className={`badge badge-outline-${shop.status === 'Pending' ? 'warning' : shop.status === 'Approved' ? 'success' : 'danger'}`}>
                                        {shop.status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Owner Information and Shop Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Owner Information */}
                <div className="lg:col-span-1">
                    <div className="panel h-full">
                        <div className="mb-5 flex flex-col items-center text-center">
                            <div className="mb-5 h-32 w-32 overflow-hidden rounded-full">
                                <img src={shop.profiles?.avatar_url || '/assets/images/user-placeholder.webp'} alt={shop.profiles?.full_name} className="h-full w-full object-cover" />
                            </div>
                            <h5 className="text-xl font-bold text-primary">{shop.profiles?.full_name || 'N/A'}</h5>
                            <p className="text-gray-500 dark:text-gray-400">Shop Owner</p>
                        </div>
                        <div className="space-y-4 border-t border-[#ebedf2] pt-5 dark:border-[#191e3a]">
                            <div className="flex items-center">
                                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-white-light">
                                    <IconMail className="h-5 w-5" />
                                </span>
                                <div className="ltr:ml-3 rtl:mr-3">
                                    <h5 className="text-sm font-semibold dark:text-white-light">Email</h5>
                                    <p className="text-gray-500 dark:text-gray-400">{shop.profiles?.email || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-success-light text-success dark:bg-success dark:text-white-light">
                                    <IconPhone className="h-5 w-5" />
                                </span>
                                <div className="ltr:ml-3 rtl:mr-3">
                                    <h5 className="text-sm font-semibold dark:text-white-light">Phone</h5>
                                    <p className="text-gray-500 dark:text-gray-400">{shop.profiles?.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-warning-light text-warning dark:bg-warning dark:text-white-light">
                                    <IconCalendar className="h-5 w-5" />
                                </span>
                                <div className="ltr:ml-3 rtl:mr-3">
                                    <h5 className="text-sm font-semibold dark:text-white-light">Registration Date</h5>
                                    <p className="text-gray-500 dark:text-gray-400">{shop.created_at ? new Date(shop.created_at).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Shop Details */}
                <div className="lg:col-span-2">
                    <div className="panel h-full">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">Shop Details</h5>
                            <p className="mt-2 text-gray-500 dark:text-gray-400">{shop.shop_desc || 'No description available.'}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mt-8">
                            <div>
                                <h6 className="text-sm font-semibold mb-2">Category</h6>
                                <span className="badge bg-primary text-white">{shop.categories_shop?.title || 'Uncategorized'}</span>
                            </div>
                            <div>
                                <h6 className="text-sm font-semibold mb-2">Sub Category</h6>
                                <span className="badge bg-secondary text-white">{shop.categories_sub_shop?.title || 'No Sub Category'}</span>
                            </div>
                            <div>
                                <h6 className="text-sm font-semibold mb-2">Visibility</h6>
                                <span className={`badge ${shop.public ? 'bg-success' : 'bg-danger'} text-white`}>{shop.public ? 'Public' : 'Private'}</span>
                            </div>
                            {shop.address && (
                                <div className="sm:col-span-2">
                                    <h6 className="text-sm font-semibold mb-2">Address</h6>
                                    <div className="flex">
                                        <span className="mt-1 ltr:mr-2 rtl:ml-2 text-primary">
                                            <IconMapPin className="h-5 w-5" />
                                        </span>
                                        <p className="text-gray-500 dark:text-gray-400">{shop.address}</p>
                                    </div>
                                </div>
                            )}
                            {phoneNumbers && phoneNumbers.length > 0 && phoneNumbers[0] && (
                                <div className="sm:col-span-2">
                                    <h6 className="text-sm font-semibold mb-2">Contact Numbers</h6>
                                    <div className="space-y-2">
                                        {phoneNumbers.map(
                                            (phone, index) =>
                                                phone && (
                                                    <div key={index} className="flex">
                                                        <span className="mt-1 ltr:mr-2 rtl:ml-2 text-success">
                                                            <IconPhone className="h-5 w-5" />
                                                        </span>
                                                        <p className="text-gray-500 dark:text-gray-400">{phone}</p>
                                                    </div>
                                                ),
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Shop Location */}
            {shop.latitude && shop.longitude && (
                <div className="panel">
                    <div className="mb-5">
                        <h5 className="text-lg font-semibold dark:text-white-light">Shop Location</h5>
                    </div>
                    <div className="h-[400px] rounded-md overflow-hidden">
                        <InteractiveMap position={[shop.latitude, shop.longitude]} height="400px" shopName={shop.shop_name} shopAddress={shop.address} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Coordinates: {shop.latitude.toFixed(6)}, {shop.longitude.toFixed(6)}
                    </p>
                </div>
            )}

            {/* Working Hours */}
            <div className="panel">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">Working Hours</h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {workHours.map((day) => (
                        <div key={day.day} className={`p-3 rounded-md border ${day.open ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <h6 className="font-semibold">{day.day}</h6>
                                <span className={`badge ${day.open ? 'bg-success' : 'bg-danger'} text-white text-xs`}>{day.open ? 'Open' : 'Closed'}</span>
                            </div>
                            {day.open && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {day.startTime} - {day.endTime}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Gallery */}
            {gallery && gallery.length > 0 && (
                <div className="panel">
                    <div className="mb-5">
                        <h5 className="text-lg font-semibold dark:text-white-light">Shop Gallery</h5>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {gallery.map((image, index) => (
                            <div key={index} className="aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                                <img src={image} alt={`Shop Gallery Image ${index + 1}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delivery Information */}
            {shop?.delivery_companies_id ? (
                <div className="panel">
                    <div className="mb-5">
                        <h5 className="text-lg font-semibold dark:text-white-light">{t('delivery_company')}</h5>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('shop_delivery_company_info')}</p>
                    </div>

                    {/* Delivery Company Info */}
                    <div className="mb-8">
                        <div className="flex items-center mb-4">
                            <div className="h-16 w-16 rounded-lg border-2 border-gray-200 overflow-hidden bg-white mr-4">
                                <img src={deliveryCompany?.logo_url || '/assets/images/company-placeholder.jpg'} alt={deliveryCompany?.company_name} className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-primary">{deliveryCompany?.company_name}</h3>
                                <p className="text-gray-500 dark:text-gray-400">{t('delivery_company')}</p>
                            </div>
                        </div>
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

                    {/* Pricing Section */}
                    <div className="mt-8">
                        <h6 className="text-lg font-semibold dark:text-white-light mb-4 flex items-center">
                            <IconCash className="h-5 w-5 mr-2" />
                            {t('delivery_pricing')}
                        </h6>

                        {/* Base Pricing */}
                        <div className="panel mb-5 w-full max-w-none">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('base_delivery_prices')}</h5>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('standard_pricing_for_all_locations')}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                <div className="text-center p-4 bg-danger/10 rounded-lg">
                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">Express (Same Day)</h6>
                                    <p className="text-2xl font-bold text-danger">${deliveryPrices?.express_price || 'N/A'}</p>
                                </div>
                                <div className="text-center p-4 bg-warning/10 rounded-lg">
                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">Fast (2-3 Days)</h6>
                                    <p className="text-2xl font-bold text-warning">${deliveryPrices?.fast_price || 'N/A'}</p>
                                </div>
                                <div className="text-center p-4 bg-success/10 rounded-lg">
                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-2">Standard (3-5 Days)</h6>
                                    <p className="text-2xl font-bold text-success">${deliveryPrices?.standard_price || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Location Based Prices */}
                        <div className="panel">
                            <div className="mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('location_based_prices')}</h5>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('specific_pricing_for_different_locations')}</p>
                            </div>
                            {locationPrices && locationPrices.length > 0 ? (
                                <div className="grid grid-cols-1 gap-6">
                                    {locationPrices.map((locationPrice, index) => (
                                        <div key={locationPrice.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h6 className="text-lg font-semibold">{locationPrice.delivery_location}</h6>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                <div className="text-center p-3 bg-danger/5 rounded-lg">
                                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-1">Express</h6>
                                                    <p className="text-lg font-bold text-danger">${locationPrice.express_price}</p>
                                                </div>
                                                <div className="text-center p-3 bg-warning/5 rounded-lg">
                                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-1">Fast</h6>
                                                    <p className="text-lg font-bold text-warning">${locationPrice.fast_price}</p>
                                                </div>
                                                <div className="text-center p-3 bg-success/5 rounded-lg">
                                                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-1">Standard</h6>
                                                    <p className="text-lg font-bold text-success">${locationPrice.standard_price}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <IconMapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>{t('no_location_prices_set')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="panel">
                    <div className="flex flex-col items-center justify-center p-8">
                        <div className="text-gray-400 mb-4">
                            <IconBuilding className="h-16 w-16" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{t('no_delivery_company')}</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('shop_has_no_delivery_company')}</p>
                        <Link href={`/shops/edit/${shop?.id}`} className="btn btn-primary">
                            {t('select_delivery_company')}
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopInfoTab;

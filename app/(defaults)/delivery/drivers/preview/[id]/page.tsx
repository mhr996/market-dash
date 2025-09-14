'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconEdit from '@/components/icon/icon-edit';
import IconUser from '@/components/icon/icon-user';
import IconBuilding from '@/components/icon/icon-building';
import IconCar from '@/components/icon/icon-car';
import IconCalendar from '@/components/icon/icon-calendar';
import { getTranslation } from '@/i18n';

interface DeliveryDriver {
    id: number;
    name: string;
    avatar_url: string | null;
    phone: string | null;
    id_number: string | null;
    delivery_companies_id: number | null;
    created_at?: string;
    delivery_companies?: {
        id: number;
        company_name: string;
        logo_url: string | null;
    };
    delivery_cars?: {
        id: number;
        plate_number: string;
        brand: string;
        model: string;
    }[];
}

const PreviewDeliveryDriverPage = () => {
    const params = useParams();
    const id = params?.id as string;
    const { t } = getTranslation();
    const router = useRouter();
    const [driver, setDriver] = useState<DeliveryDriver | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'company' | 'cars'>('details');
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchDriver = async () => {
            try {
                const { data, error } = await supabase
                    .from('delivery_drivers')
                    .select(
                        `
                        *,
                        delivery_companies(
                            id,
                            company_name,
                            logo_url
                        ),
                        delivery_cars(
                            id,
                            plate_number,
                            brand,
                            model
                        )
                    `,
                    )
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setDriver(data);
            } catch (error) {
                setAlert({ visible: true, message: 'Error fetching driver details', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchDriver();
        }
    }, [id]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!driver) {
        return <div className="text-center p-6">Driver not found.</div>;
    }

    return (
        <div className="container mx-auto p-6 w-full max-w-none">
            <div className="flex items-center gap-4 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <Link href={`/delivery/drivers/edit/${driver.id}`} className="btn btn-primary flex items-center gap-2">
                    <IconEdit className="h-5 w-5" />
                    Edit Driver
                </Link>
            </div>
            {/* Breadcrumb Navigation */}
            <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        {t('home')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/delivery" className="text-primary hover:underline">
                        {t('delivery')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/delivery/drivers" className="text-primary hover:underline">
                        {t('drivers')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{driver.name}</span>
                </li>
            </ul>
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Driver Header */}
            <div className="mb-6 rounded-md overflow-hidden">
                <div className="relative h-64 w-full bg-gradient-to-r from-green-500 to-green-600">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white">
                            <div className="mb-4">
                                <img src={driver.avatar_url || '/assets/images/user-placeholder.webp'} alt={driver.name} className="w-24 h-24 rounded-full mx-auto border-4 border-white" />
                            </div>
                            <h1 className="text-3xl font-bold">{driver.name}</h1>
                            <p className="text-xl opacity-90">{t('delivery_driver')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="mb-5">
                <div className="flex border-b border-[#ebedf2] dark:border-[#191e3a]">
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        <div className="flex items-center gap-2">
                            <IconUser className="h-5 w-5" />
                            {t('driver_details')}
                        </div>
                    </button>
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'company' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('company')}
                    >
                        <div className="flex items-center gap-2">
                            <IconBuilding className="h-5 w-5" />
                            {t('delivery_company')}
                        </div>
                    </button>
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'cars' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('cars')}
                    >
                        <div className="flex items-center gap-2">
                            <IconCar className="h-5 w-5" />
                            {t('assigned_cars')}
                        </div>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeTab === 'details' && (
                    <>
                        {/* Driver Details */}
                        <div className="lg:col-span-2">
                            <div className="panel h-full w-full max-w-none">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('driver_information')}</h5>
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('driver_name')}</h6>
                                            <p className="text-lg font-bold text-primary">{driver.name}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('phone')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{driver.phone || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('id_number')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{driver.id_number || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('registration_date')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{driver.created_at ? new Date(driver.created_at).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Driver Status */}
                        <div className="lg:col-span-1">
                            <div className="panel h-full w-full max-w-none">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('driver_status')}</h5>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-primary-light dark:bg-primary text-primary dark:text-primary-light flex items-center justify-center">
                                                <IconUser className="h-5 w-5" />
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">{t('driver_id')}</h6>
                                        </div>
                                        <p className="text-2xl font-bold dark:text-white-light">#{driver.id}</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-success-light dark:bg-success text-success dark:text-success-light flex items-center justify-center">
                                                <IconCalendar className="h-5 w-5" />
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">{t('registration_date')}</h6>
                                        </div>
                                        <p className="text-lg font-bold dark:text-white-light">{driver.created_at ? new Date(driver.created_at).toLocaleDateString() : 'N/A'}</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light flex items-center justify-center">
                                                <IconCar className="h-5 w-5" />
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">{t('cars_assigned')}</h6>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-bold dark:text-white-light">{driver.delivery_cars?.length || 0}</p>
                                            {driver.delivery_cars && driver.delivery_cars.length > 0 && (
                                                <span className="badge bg-success/20 text-success dark:bg-success dark:text-white-light">Active</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'company' && (
                    <div className="lg:col-span-3">
                        {driver.delivery_companies ? (
                            <div className="panel w-full max-w-none">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('delivery_company')}</h5>
                                </div>

                                <div className="flex items-center">
                                    <div className="h-16 w-16 rounded-lg border-2 border-gray-200 overflow-hidden bg-white mr-4">
                                        <img
                                            src={driver.delivery_companies.logo_url || '/assets/images/company-placeholder.jpg'}
                                            alt={driver.delivery_companies.company_name}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-primary">{driver.delivery_companies.company_name}</h3>
                                        <p className="text-gray-500 dark:text-gray-400">{t('delivery_company')}</p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('company_name')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{driver.delivery_companies.company_name}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('company_id')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">#{driver.delivery_companies.id}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="panel w-full max-w-none">
                                <div className="flex flex-col items-center justify-center p-8">
                                    <div className="text-gray-400 mb-4">
                                        <IconBuilding className="h-16 w-16" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{t('no_company_assigned')}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">{t('this_driver_has_no_company_assigned')}</p>
                                    <Link href={`/delivery/drivers/edit/${driver.id}`} className="btn btn-primary">
                                        {t('assign_company')}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'cars' && (
                    <div className="lg:col-span-3">
                        {driver.delivery_cars && driver.delivery_cars.length > 0 ? (
                            <div className="panel w-full max-w-none">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('assigned_cars')}</h5>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {driver.delivery_cars.map((car) => (
                                        <div key={car.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-center mb-3">
                                                <div className="h-10 w-10 rounded-md bg-primary-light dark:bg-primary text-primary dark:text-primary-light flex items-center justify-center mr-3">
                                                    <IconCar className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h6 className="font-semibold text-primary">{car.plate_number}</h6>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {car.brand} {car.model}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                <p>
                                                    <span className="font-medium">{t('car_id')}:</span> #{car.id}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="panel w-full max-w-none">
                                <div className="flex flex-col items-center justify-center p-8">
                                    <div className="text-gray-400 mb-4">
                                        <IconCar className="h-16 w-16" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{t('no_cars_assigned')}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">{t('this_driver_has_no_cars_assigned')}</p>
                                    <Link href="/delivery/cars" className="btn btn-primary">
                                        {t('assign_cars')}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PreviewDeliveryDriverPage;

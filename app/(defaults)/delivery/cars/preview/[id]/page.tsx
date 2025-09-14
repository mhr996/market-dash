'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconEdit from '@/components/icon/icon-edit';
import IconCar from '@/components/icon/icon-car';
import IconUser from '@/components/icon/icon-user';
import IconBuilding from '@/components/icon/icon-building';
import IconCalendar from '@/components/icon/icon-calendar';
import { getTranslation } from '@/i18n';

interface DeliveryCar {
    id: number;
    plate_number: string;
    brand: string;
    model: string;
    color: string | null;
    capacity: number | null;
    car_number: string | null;
    car_model: string | null;
    delivery_drivers_id: number | null;
    delivery_companies_id: number | null;
    created_at?: string;
    delivery_drivers?: {
        id: number;
        name: string;
        phone: string | null;
        avatar_url: string | null;
    };
    delivery_companies?: {
        id: number;
        company_name: string;
        logo_url: string | null;
    };
}

const PreviewDeliveryCarPage = () => {
    const params = useParams();
    const id = params?.id as string;
    const { t } = getTranslation();
    const router = useRouter();
    const [car, setCar] = useState<DeliveryCar | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'driver' | 'company'>('details');
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchCar = async () => {
            try {
                const { data, error } = await supabase
                    .from('delivery_cars')
                    .select(
                        `
                        *,
                        delivery_drivers(
                            id,
                            name,
                            phone,
                            avatar_url
                        ),
                        delivery_companies(
                            id,
                            company_name,
                            logo_url
                        )
                    `,
                    )
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setCar(data);
            } catch (error) {
                setAlert({ visible: true, message: 'Error fetching car details', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCar();
        }
    }, [id]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!car) {
        return <div className="text-center p-6">Car not found.</div>;
    }

    return (
        <div className="container mx-auto p-6 w-full max-w-none">
            <div className="flex items-center gap-4 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <Link href={`/delivery/cars/edit/${car.id}`} className="btn btn-primary flex items-center gap-2">
                    <IconEdit className="h-5 w-5" />
                    Edit Car
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
                    <Link href="/delivery/cars" className="text-primary hover:underline">
                        {t('cars')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{car.plate_number}</span>
                </li>
            </ul>
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Car Header */}
            <div className="mb-6 rounded-md overflow-hidden">
                <div className="relative h-64 w-full bg-gradient-to-r from-blue-500 to-blue-600">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white">
                            <IconCar className="h-24 w-24 mx-auto mb-4 opacity-80" />
                            <h1 className="text-3xl font-bold">{car.plate_number}</h1>
                            <p className="text-xl opacity-90">
                                {car.brand} {car.model}
                            </p>
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
                            <IconCar className="h-5 w-5" />
                            {t('car_details')}
                        </div>
                    </button>
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'driver' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('driver')}
                    >
                        <div className="flex items-center gap-2">
                            <IconUser className="h-5 w-5" />
                            {t('assigned_driver')}
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
                </div>
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeTab === 'details' && (
                    <>
                        {/* Car Details */}
                        <div className="lg:col-span-2">
                            <div className="panel h-full w-full max-w-none">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('car_information')}</h5>
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('plate_number')}</h6>
                                            <p className="text-lg font-bold text-primary">{car.plate_number}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('brand')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{car.brand}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('model')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{car.model}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('color')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{car.color || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('capacity')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{car.capacity ? `${car.capacity} passengers` : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('car_number')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{car.car_number || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('car_model')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{car.car_model || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('registration_date')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{car.created_at ? new Date(car.created_at).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Car Status */}
                        <div className="lg:col-span-1">
                            <div className="panel h-full w-full max-w-none">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('car_status')}</h5>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-primary-light dark:bg-primary text-primary dark:text-primary-light flex items-center justify-center">
                                                <IconCar className="h-5 w-5" />
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">{t('car_id')}</h6>
                                        </div>
                                        <p className="text-2xl font-bold dark:text-white-light">#{car.id}</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-success-light dark:bg-success text-success dark:text-success-light flex items-center justify-center">
                                                <IconCalendar className="h-5 w-5" />
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">{t('registration_date')}</h6>
                                        </div>
                                        <p className="text-lg font-bold dark:text-white-light">{car.created_at ? new Date(car.created_at).toLocaleDateString() : 'N/A'}</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light flex items-center justify-center">
                                                <IconUser className="h-5 w-5" />
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">{t('driver_status')}</h6>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-lg font-bold dark:text-white-light">{car.delivery_drivers ? 'Assigned' : 'Unassigned'}</p>
                                            {car.delivery_drivers && <span className="badge bg-success/20 text-success dark:bg-success dark:text-white-light">Active</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'driver' && (
                    <div className="lg:col-span-3">
                        {car.delivery_drivers ? (
                            <div className="panel w-full max-w-none">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('assigned_driver')}</h5>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="mb-5 h-32 w-32 overflow-hidden rounded-full">
                                        <img src={car.delivery_drivers.avatar_url || '/assets/images/user-placeholder.webp'} alt={car.delivery_drivers.name} className="h-full w-full object-cover" />
                                    </div>
                                    <h5 className="text-xl font-bold text-primary">{car.delivery_drivers.name}</h5>
                                    <p className="text-gray-500 dark:text-gray-400">{t('delivery_driver')}</p>

                                    <div className="mt-6 space-y-4 w-full max-w-md">
                                        <div className="flex items-center justify-center">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-white-light">
                                                <IconUser className="h-5 w-5" />
                                            </span>
                                            <div className="ltr:ml-3 rtl:mr-3">
                                                <h5 className="text-sm font-semibold dark:text-white-light">{t('driver_name')}</h5>
                                                <p className="text-gray-500 dark:text-gray-400">{car.delivery_drivers.name}</p>
                                            </div>
                                        </div>
                                        {car.delivery_drivers.phone && (
                                            <div className="flex items-center justify-center">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-success-light text-success dark:bg-success dark:text-white-light">
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                                        />
                                                    </svg>
                                                </span>
                                                <div className="ltr:ml-3 rtl:mr-3">
                                                    <h5 className="text-sm font-semibold dark:text-white-light">{t('phone')}</h5>
                                                    <p className="text-gray-500 dark:text-gray-400">{car.delivery_drivers.phone}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="panel w-full max-w-none">
                                <div className="flex flex-col items-center justify-center p-8">
                                    <div className="text-gray-400 mb-4">
                                        <IconUser className="h-16 w-16" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{t('no_driver_assigned')}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">{t('this_car_has_no_driver_assigned')}</p>
                                    <Link href={`/delivery/cars/edit/${car.id}`} className="btn btn-primary">
                                        {t('assign_driver')}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'company' && (
                    <div className="lg:col-span-3">
                        {car.delivery_companies ? (
                            <div className="panel w-full max-w-none">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('delivery_company')}</h5>
                                </div>

                                <div className="flex items-center">
                                    <div className="h-16 w-16 rounded-lg border-2 border-gray-200 overflow-hidden bg-white mr-4">
                                        <img
                                            src={car.delivery_companies.logo_url || '/assets/images/company-placeholder.jpg'}
                                            alt={car.delivery_companies.company_name}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-primary">{car.delivery_companies.company_name}</h3>
                                        <p className="text-gray-500 dark:text-gray-400">{t('delivery_company')}</p>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('company_name')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">{car.delivery_companies.company_name}</p>
                                        </div>
                                        <div>
                                            <h6 className="text-sm font-semibold mb-2">{t('company_id')}</h6>
                                            <p className="text-gray-500 dark:text-gray-400">#{car.delivery_companies.id}</p>
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
                                    <p className="text-gray-500 dark:text-gray-400 mb-4">{t('this_car_has_no_company_assigned')}</p>
                                    <Link href={`/delivery/cars/edit/${car.id}`} className="btn btn-primary">
                                        {t('assign_company')}
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

export default PreviewDeliveryCarPage;

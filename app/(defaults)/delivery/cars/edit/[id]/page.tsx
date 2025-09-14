'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconCaretDown from '@/components/icon/icon-caret-down';
import Tabs from '@/components/tabs';
import { getTranslation } from '@/i18n';

interface DeliveryCompany {
    id: number;
    company_name: string;
}

interface DeliveryDriver {
    id: number;
    name: string;
    delivery_companies_id: number;
}

interface EditDeliveryCarPageProps {
    params: {
        id: string;
    };
}

const EditDeliveryCarPage = ({ params }: EditDeliveryCarPageProps) => {
    const router = useRouter();
    const { t } = getTranslation();
    const [form, setForm] = useState({
        plate_number: '',
        brand: '',
        model: '',
        color: '',
        capacity: '',
        car_number: '',
        car_model: '',
        delivery_companies_id: '',
        delivery_drivers_id: '',
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    // Dropdown states
    const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
    const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState({ company: '', driver: '' });
    const companyRef = useRef<HTMLDivElement>(null);
    const driverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (companyRef.current && !companyRef.current.contains(event.target as Node)) {
                setIsCompanyDropdownOpen(false);
            }
            if (driverRef.current && !driverRef.current.contains(event.target as Node)) {
                setIsDriverDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch companies
                const { data: companiesData, error: companiesError } = await supabase.from('delivery_companies').select('id, company_name').order('company_name', { ascending: true });
                if (companiesError) throw companiesError;
                setCompanies(companiesData || []);

                // Fetch car data
                const { data: carData, error: carError } = await supabase.from('delivery_cars').select('*').eq('id', params.id).single();
                if (carError) throw carError;

                if (carData) {
                    setForm({
                        plate_number: carData.plate_number || '',
                        brand: carData.brand || '',
                        model: carData.model || '',
                        color: carData.color || '',
                        capacity: carData.capacity?.toString() || '',
                        car_number: carData.car_number || '',
                        car_model: carData.car_model || '',
                        delivery_companies_id: carData.delivery_companies_id?.toString() || '',
                        delivery_drivers_id: carData.delivery_drivers_id?.toString() || '',
                    });
                }
            } catch (error) {
                setAlert({ visible: true, message: t('error_loading_data'), type: 'danger' });
            }
        };
        fetchData();
    }, [params.id]);

    // Fetch drivers when company changes
    useEffect(() => {
        const fetchDrivers = async () => {
            if (form.delivery_companies_id) {
                try {
                    const { data, error } = await supabase
                        .from('delivery_drivers')
                        .select('id, name, delivery_companies_id')
                        .eq('delivery_companies_id', form.delivery_companies_id)
                        .order('name', { ascending: true });
                    if (error) throw error;
                    setDrivers(data || []);
                } catch (error) {
                    // Error fetching drivers
                }
            } else {
                setDrivers([]);
            }
        };
        fetchDrivers();
    }, [form.delivery_companies_id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation
        if (!form.plate_number) {
            setAlert({ visible: true, message: t('plate_number_required'), type: 'danger' });
            setLoading(false);
            return;
        }
        if (!form.brand) {
            setAlert({ visible: true, message: t('brand_required'), type: 'danger' });
            setLoading(false);
            return;
        }
        if (!form.model) {
            setAlert({ visible: true, message: t('model_required'), type: 'danger' });
            setLoading(false);
            return;
        }
        if (!form.delivery_companies_id) {
            setAlert({ visible: true, message: t('company_selection_required'), type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            const updatePayload = {
                plate_number: form.plate_number,
                brand: form.brand,
                model: form.model,
                color: form.color || null,
                capacity: form.capacity ? parseInt(form.capacity) : null,
                car_number: form.car_number || null,
                car_model: form.car_model || null,
                delivery_companies_id: parseInt(form.delivery_companies_id),
                delivery_drivers_id: form.delivery_drivers_id ? parseInt(form.delivery_drivers_id) : null,
            };

            const { error } = await supabase.from('delivery_cars').update(updatePayload).eq('id', params.id);
            if (error) throw error;

            setAlert({ visible: true, message: t('car_updated_successfully'), type: 'success' });
            router.push('/delivery/cars');
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_updating_car'), type: 'danger' });
            setLoading(false);
        }
    };

    const filteredCompanies = companies.filter((company) => company.company_name.toLowerCase().includes(searchTerm.company.toLowerCase()));

    const filteredDrivers = drivers.filter((driver) => driver.name.toLowerCase().includes(searchTerm.driver.toLowerCase()));

    return (
        <div className="container mx-auto p-6 w-full max-w-none">
            <div className="flex items-center gap-5 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
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
                        <span>{t('edit_car')}</span>
                    </li>
                </ul>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Form Container with tabbed layout */}
            <form onSubmit={handleSubmit}>
                <div className="mb-6">
                    <Tabs
                        tabs={[
                            { name: t('basic_info'), icon: 'car' },
                            { name: t('assignment'), icon: 'users' },
                        ]}
                        onTabClick={(tab) => setActiveTab(tab)}
                        activeTab={activeTab}
                    />
                </div>

                {activeTab === 0 && (
                    <div className="panel mb-5 w-full max-w-none">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('basic_information')}</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="plate_number" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('plate_number')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="plate_number"
                                    name="plate_number"
                                    value={form.plate_number}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder={t('enter_plate_number')}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="brand" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('brand')} <span className="text-red-500">*</span>
                                </label>
                                <input type="text" id="brand" name="brand" value={form.brand} onChange={handleInputChange} className="form-input" placeholder={t('enter_brand')} required />
                            </div>
                            <div>
                                <label htmlFor="model" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('model')} <span className="text-red-500">*</span>
                                </label>
                                <input type="text" id="model" name="model" value={form.model} onChange={handleInputChange} className="form-input" placeholder={t('enter_model')} required />
                            </div>
                            <div>
                                <label htmlFor="color" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('color')}
                                </label>
                                <input type="text" id="color" name="color" value={form.color} onChange={handleInputChange} className="form-input" placeholder={t('enter_color')} />
                            </div>
                            <div>
                                <label htmlFor="capacity" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('capacity')}
                                </label>
                                <input
                                    type="number"
                                    id="capacity"
                                    name="capacity"
                                    value={form.capacity}
                                    onChange={handleInputChange}
                                    className="form-input"
                                    placeholder={t('enter_capacity')}
                                    min="1"
                                />
                            </div>
                            <div>
                                <label htmlFor="car_number" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('car_number')}
                                </label>
                                <input type="text" id="car_number" name="car_number" value={form.car_number} onChange={handleInputChange} className="form-input" placeholder={t('enter_car_number')} />
                            </div>
                            <div>
                                <label htmlFor="car_model" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('car_model')}
                                </label>
                                <input type="text" id="car_model" name="car_model" value={form.car_model} onChange={handleInputChange} className="form-input" placeholder={t('enter_car_model')} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 1 && (
                    <div className="panel mb-5 w-full max-w-none">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('assignment')}</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Company Dropdown */}
                            <div ref={companyRef} className="relative">
                                <label htmlFor="delivery_companies_id" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('delivery_company')} <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div
                                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                        onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
                                    >
                                        <span>{form.delivery_companies_id ? companies.find((c) => c.id.toString() === form.delivery_companies_id)?.company_name : t('select_company')}</span>
                                        <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isCompanyDropdownOpen && (
                                        <div className="absolute z-50 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    className="w-full rounded border border-[#e0e6ed] p-2 focus:border-primary focus:outline-none dark:border-[#191e3a] dark:bg-black dark:text-white-dark"
                                                    placeholder={t('search')}
                                                    value={searchTerm.company}
                                                    onChange={(e) => setSearchTerm((prev) => ({ ...prev, company: e.target.value }))}
                                                />
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {filteredCompanies.map((company) => (
                                                    <div
                                                        key={company.id}
                                                        className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]"
                                                        onClick={() => {
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                delivery_companies_id: company.id.toString(),
                                                                delivery_drivers_id: '', // Reset driver when company changes
                                                            }));
                                                            setIsCompanyDropdownOpen(false);
                                                        }}
                                                    >
                                                        {company.company_name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Driver Dropdown */}
                            <div ref={driverRef} className="relative">
                                <label htmlFor="delivery_drivers_id" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('assigned_driver')}
                                </label>
                                <div className="relative">
                                    <div
                                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                        onClick={() => setIsDriverDropdownOpen(!isDriverDropdownOpen)}
                                    >
                                        <span>{form.delivery_drivers_id ? drivers.find((d) => d.id.toString() === form.delivery_drivers_id)?.name : t('select_driver')}</span>
                                        <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isDriverDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isDriverDropdownOpen && (
                                        <div className="absolute z-50 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    className="w-full rounded border border-[#e0e6ed] p-2 focus:border-primary focus:outline-none dark:border-[#191e3a] dark:bg-black dark:text-white-dark"
                                                    placeholder={t('search')}
                                                    value={searchTerm.driver}
                                                    onChange={(e) => setSearchTerm((prev) => ({ ...prev, driver: e.target.value }))}
                                                />
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {filteredDrivers.length > 0 ? (
                                                    filteredDrivers.map((driver) => (
                                                        <div
                                                            key={driver.id}
                                                            className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]"
                                                            onClick={() => {
                                                                setForm((prev) => ({ ...prev, delivery_drivers_id: driver.id.toString() }));
                                                                setIsDriverDropdownOpen(false);
                                                            }}
                                                        >
                                                            {driver.name}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-2 text-gray-500 dark:text-gray-400">{form.delivery_companies_id ? t('no_drivers_found') : t('select_company_first')}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.back()}>
                        {t('cancel')}
                    </button>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? t('submitting') : t('update_car')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditDeliveryCarPage;

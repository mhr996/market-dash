'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconX from '@/components/icon/icon-x';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconPlus from '@/components/icon/icon-plus';
import IconMinus from '@/components/icon/icon-minus';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUpload from '@/components/icon/icon-camera';
import Tabs from '@/components/tabs';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { getTranslation } from '@/i18n';
import DeliveryPricing from '@/components/delivery/delivery-pricing';

// Import the map component dynamically with no SSR
const MapSelector = dynamic(() => import('@/components/map/map-selector'), {
    ssr: false, // This will prevent the component from being rendered on the server
});

interface Profile {
    id: string;
    full_name: string;
    avatar_url?: string;
}

const AddDeliveryCompanyPage = () => {
    const router = useRouter();
    const { t } = getTranslation();
    const [form, setForm] = useState({
        company_name: '',
        logo_url: '',
        cover_image_url: '',
        owner_name: '',
        company_number: '',
        phone: '',
        email: '',
        address: '',
        details: '',
        latitude: null as number | null,
        longitude: null as number | null,
        // New flexible pricing system
        delivery_methods: [] as Array<{
            label: string;
            delivery_time: string;
            price: number;
            is_active: boolean;
            location_prices: Array<{
                location_name: string;
                price_addition: number;
                is_active: boolean;
            }>;
        }>,
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);

    // Temporary file storage for logo and cover before company creation
    const [tempLogoFile, setTempLogoFile] = useState<File | null>(null);
    const [tempCoverFile, setTempCoverFile] = useState<File | null>(null);

    const [activeTab, setActiveTab] = useState(0);

    // Cleanup blob URLs on component unmount
    useEffect(() => {
        return () => {
            if (form.logo_url && form.logo_url.startsWith('blob:')) {
                URL.revokeObjectURL(form.logo_url);
            }
            if (form.cover_image_url && form.cover_image_url.startsWith('blob:')) {
                URL.revokeObjectURL(form.cover_image_url);
            }
        };
    }, [form.logo_url, form.cover_image_url]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    // Handle temporary file storage for logo and cover
    const handleTempLogoUpload = (file: File) => {
        setTempLogoFile(file);
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setForm((prev) => ({
            ...prev,
            logo_url: previewUrl,
        }));
    };

    const handleTempCoverUpload = (file: File) => {
        setTempCoverFile(file);
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setForm((prev) => ({
            ...prev,
            cover_image_url: previewUrl,
        }));
    };

    const handleLocationChange = (lat: number, lng: number) => {
        setForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
        }));
    };

    const handleDeliveryMethodsChange = (methods: any[]) => {
        setForm((prev) => ({
            ...prev,
            delivery_methods: methods,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation: company name and owner name are required.
        if (!form.company_name) {
            setAlert({ visible: true, message: t('company_name_required'), type: 'danger' });
            setLoading(false);
            return;
        }
        if (!form.owner_name) {
            setAlert({ visible: true, message: t('owner_name_required'), type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            // Create delivery company data payload (initially without image URLs)
            const insertPayload = {
                company_name: form.company_name,
                logo_url: '', // Will be set after upload
                cover_image_url: '', // Will be set after upload
                owner_name: form.owner_name,
                company_number: form.company_number,
                phone: form.phone,
                email: form.email,
                address: form.address,
                details: form.details,
                latitude: form.latitude,
                longitude: form.longitude,
            };

            // Insert delivery company data first to get the company ID
            const { data: newCompany, error } = await supabase.from('delivery_companies').insert([insertPayload]).select().single();

            if (error) throw error;

            // Now upload the images to the proper location using the company ID
            let finalLogoUrl = '';
            let finalCoverUrl = '';

            if (tempLogoFile) {
                // Upload logo to Supabase storage
                const logoFileName = `logo-${Date.now()}.${tempLogoFile.name.split('.').pop()}`;
                const { data: logoData, error: logoError } = await supabase.storage.from('delivery').upload(`companies/logos/${newCompany.id}/${logoFileName}`, tempLogoFile);

                if (logoError) throw logoError;

                const { data: logoUrlData } = supabase.storage.from('delivery').getPublicUrl(`companies/logos/${newCompany.id}/${logoFileName}`);
                finalLogoUrl = logoUrlData.publicUrl;
            }

            if (tempCoverFile) {
                // Upload cover to Supabase storage
                const coverFileName = `cover-${Date.now()}.${tempCoverFile.name.split('.').pop()}`;
                const { data: coverData, error: coverError } = await supabase.storage.from('delivery').upload(`companies/covers/${newCompany.id}/${coverFileName}`, tempCoverFile);

                if (coverError) throw coverError;

                const { data: coverUrlData } = supabase.storage.from('delivery').getPublicUrl(`companies/covers/${newCompany.id}/${coverFileName}`);
                finalCoverUrl = coverUrlData.publicUrl;
            }

            // Update company with final image URLs
            if (finalLogoUrl || finalCoverUrl) {
                await supabase
                    .from('delivery_companies')
                    .update({
                        logo_url: finalLogoUrl,
                        cover_image_url: finalCoverUrl,
                    })
                    .eq('id', newCompany.id);
            }

            // Create delivery methods and location pricing
            if (form.delivery_methods.length > 0) {
                for (const method of form.delivery_methods) {
                    if (method.label.trim() && method.delivery_time.trim()) {
                        // Insert delivery method
                        const { data: methodData, error: methodError } = await supabase
                            .from('delivery_methods')
                            .insert([
                                {
                                    delivery_company_id: newCompany.id,
                                    label: method.label.trim(),
                                    delivery_time: method.delivery_time.trim(),
                                    price: method.price || 0,
                                    is_active: method.is_active !== false,
                                },
                            ])
                            .select()
                            .single();

                        if (methodError) throw methodError;

                        // Insert location prices for this method
                        if (method.location_prices && method.location_prices.length > 0) {
                            const locationPricesPayload = method.location_prices
                                .filter((lp) => lp.location_name.trim() !== '')
                                .map((lp) => ({
                                    delivery_company_id: newCompany.id,
                                    delivery_method_id: methodData.id,
                                    location_name: lp.location_name.trim(),
                                    price_addition: lp.price_addition || 0,
                                    is_active: lp.is_active !== false,
                                }));

                            if (locationPricesPayload.length > 0) {
                                const { error: locationError } = await supabase.from('delivery_location_methods').insert(locationPricesPayload);
                                if (locationError) throw locationError;
                            }
                        }
                    }
                }
            }

            setAlert({ visible: true, message: t('company_added_successfully'), type: 'success' });
            // Redirect back to the companies list page after successful insertion
            router.push('/delivery/companies');
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_adding_company'), type: 'danger' });
            // Scroll to top to show error
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setLoading(false);
        }
    };

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
                        <Link href="/delivery/companies" className="text-primary hover:underline">
                            {t('companies')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_company')}</span>
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
                {/* Cover Image */}
                <div className="panel mb-5 overflow-hidden w-full max-w-none">
                    <div className="relative h-52 w-full">
                        <img src={form.cover_image_url || '/assets/images/img-placeholder-fallback.webp'} alt="Company Cover" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                            <div className="text-center flex flex-col items-center justify-center">
                                <h2 className="text-xl font-bold text-white mb-4">{t('company_cover_image')}</h2>
                                {/* Custom Cover Upload Component */}
                                <div className="relative inline-block">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                handleTempCoverUpload(file);
                                            }
                                        }}
                                        className="hidden"
                                        id="cover-upload"
                                    />
                                    <label htmlFor="cover-upload" className="btn btn-primary cursor-pointer">
                                        {t('select_cover')}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <Tabs
                        tabs={[
                            { name: t('basic_info'), icon: 'building' },
                            { name: t('company_details'), icon: 'map-pin' },
                            { name: t('pricing'), icon: 'dollar-sign' },
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
                            {/* Logo Column */}
                            <div className="flex flex-col items-center">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-3">{t('company_logo')}</label>
                                {/* Logo Preview */}
                                <div className="mb-4">
                                    <img src={form.logo_url || '/assets/images/user-placeholder.webp'} alt="Company Logo" className="w-36 h-36 rounded-full object-cover border-2 border-gray-200" />
                                </div>
                                {/* Custom Logo Upload Component */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                handleTempLogoUpload(file);
                                            }
                                        }}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    <label htmlFor="logo-upload" className="btn btn-outline-primary btn-sm cursor-pointer">
                                        {t('select_logo')}
                                    </label>
                                </div>
                            </div>
                            {/* Company Info Column */}
                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="company_name" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('company_name')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="company_name"
                                        name="company_name"
                                        value={form.company_name}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder={t('enter_company_name')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="owner_name" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('owner_name')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="owner_name"
                                        name="owner_name"
                                        value={form.owner_name}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder={t('enter_owner_name')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="company_number" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('company_number')}
                                    </label>
                                    <input
                                        type="text"
                                        id="company_number"
                                        name="company_number"
                                        value={form.company_number}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder={t('enter_company_number')}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('phone')}
                                    </label>
                                    <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleInputChange} className="form-input" placeholder={t('enter_phone_number')} />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('email')}
                                    </label>
                                    <input type="email" id="email" name="email" value={form.email} onChange={handleInputChange} className="form-input" placeholder={t('enter_email')} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 1 && (
                    <div className="panel mb-5 w-full max-w-none">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('company_details')}</h5>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="address" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    {t('address')}
                                </label>
                                <div className="flex items-center">
                                    <span className="mt-1 ltr:mr-2 rtl:ml-2 text-primary">
                                        <IconMapPin className="h-5 w-5" />
                                    </span>
                                    <textarea
                                        id="address"
                                        name="address"
                                        className="form-textarea flex-1"
                                        value={form.address}
                                        onChange={handleInputChange}
                                        placeholder={t('enter_company_address')}
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">{t('company_location')}</label>
                                <div className="h-[400px] mb-4">
                                    <MapSelector
                                        initialPosition={form.latitude && form.longitude ? [form.latitude, form.longitude] : null}
                                        onChange={handleLocationChange}
                                        height="400px"
                                        useCurrentLocationByDefault={true}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{t('click_map_select_location')}</p>
                                {form.latitude && form.longitude && (
                                    <p className="text-sm mt-10">
                                        {t('selected_coordinates')}:{' '}
                                        <span className="font-semibold">
                                            {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                                        </span>
                                    </p>
                                )}
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="details" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    {t('company_details')}
                                </label>
                                <textarea id="details" name="details" className="form-textarea" value={form.details} onChange={handleInputChange} placeholder={t('enter_company_details')} rows={4} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 2 && (
                    <div className="panel mb-5 w-full max-w-none">
                        <DeliveryPricing methods={form.delivery_methods} onChange={handleDeliveryMethodsChange} disabled={loading} />
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.back()}>
                        {t('cancel')}
                    </button>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? t('submitting') : t('add_company')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddDeliveryCompanyPage;

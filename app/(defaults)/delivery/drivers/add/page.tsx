'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUpload from '@/components/icon/icon-camera';
import Tabs from '@/components/tabs';
import { getTranslation } from '@/i18n';

interface DeliveryCompany {
    id: number;
    company_name: string;
}

const AddDeliveryDriverPage = () => {
    const router = useRouter();
    const { t } = getTranslation();
    const [form, setForm] = useState({
        name: '',
        avatar_url: '',
        phone: '',
        id_number: '',
        delivery_companies_id: '',
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
    const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState({ company: '' });
    const companyRef = useRef<HTMLDivElement>(null);

    // Temporary file storage for avatar before driver creation
    const [tempAvatarFile, setTempAvatarFile] = useState<File | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (companyRef.current && !companyRef.current.contains(event.target as Node)) {
                setIsCompanyDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const { data, error } = await supabase.from('delivery_companies').select('id, company_name').order('company_name', { ascending: true });
                if (error) throw error;
                setCompanies(data || []);
            } catch (error) {
                // Error fetching companies
            }
        };
        fetchCompanies();
    }, []);

    // Cleanup blob URLs on component unmount
    useEffect(() => {
        return () => {
            if (form.avatar_url && form.avatar_url.startsWith('blob:')) {
                URL.revokeObjectURL(form.avatar_url);
            }
        };
    }, [form.avatar_url]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    // Handle temporary file storage for avatar
    const handleTempAvatarUpload = (file: File) => {
        setTempAvatarFile(file);
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setForm((prev) => ({
            ...prev,
            avatar_url: previewUrl,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation
        if (!form.name) {
            setAlert({ visible: true, message: t('name_required'), type: 'danger' });
            setLoading(false);
            return;
        }
        if (!form.delivery_companies_id) {
            setAlert({ visible: true, message: t('company_selection_required'), type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            // Create delivery driver data payload (initially without avatar URL)
            const insertPayload = {
                name: form.name,
                avatar_url: '', // Will be set after upload
                phone: form.phone || null,
                id_number: form.id_number || null,
                delivery_companies_id: parseInt(form.delivery_companies_id),
            };

            // Insert delivery driver data first to get the driver ID
            const { data: newDriver, error } = await supabase.from('delivery_drivers').insert([insertPayload]).select().single();

            if (error) throw error;

            // Now upload the avatar to the proper location using the driver ID
            let finalAvatarUrl = '';

            if (tempAvatarFile) {
                // Upload avatar to Supabase storage
                const avatarFileName = `avatar-${Date.now()}.${tempAvatarFile.name.split('.').pop()}`;
                const { data: avatarData, error: avatarError } = await supabase.storage.from('delivery').upload(`drivers/avatars/${newDriver.id}/${avatarFileName}`, tempAvatarFile);

                if (avatarError) throw avatarError;

                const { data: avatarUrlData } = supabase.storage.from('delivery').getPublicUrl(`drivers/avatars/${newDriver.id}/${avatarFileName}`);
                finalAvatarUrl = avatarUrlData.publicUrl;
            }

            // Update driver with final avatar URL
            if (finalAvatarUrl) {
                await supabase
                    .from('delivery_drivers')
                    .update({
                        avatar_url: finalAvatarUrl,
                    })
                    .eq('id', newDriver.id);
            }

            setAlert({ visible: true, message: t('driver_added_successfully'), type: 'success' });
            router.push('/delivery/drivers');
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_adding_driver'), type: 'danger' });
            setLoading(false);
        }
    };

    const filteredCompanies = companies.filter((company) => company.company_name.toLowerCase().includes(searchTerm.company.toLowerCase()));

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
                        <Link href="/delivery/drivers" className="text-primary hover:underline">
                            {t('drivers')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_driver')}</span>
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
                            { name: t('basic_info'), icon: 'user' },
                            { name: t('assignment'), icon: 'building' },
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
                            {/* Avatar Column */}
                            <div className="flex flex-col items-center">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-3">{t('driver_avatar')}</label>
                                {/* Avatar Preview */}
                                <div className="mb-4">
                                    <img src={form.avatar_url || '/assets/images/user-placeholder.webp'} alt="Driver Avatar" className="w-36 h-36 rounded-full object-cover border-2 border-gray-200" />
                                </div>
                                {/* Custom Avatar Upload Component */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                handleTempAvatarUpload(file);
                                            }
                                        }}
                                        className="hidden"
                                        id="avatar-upload"
                                    />
                                    <label htmlFor="avatar-upload" className="btn btn-outline-primary btn-sm cursor-pointer">
                                        {t('select_avatar')}
                                    </label>
                                </div>
                            </div>
                            {/* Driver Info Column */}
                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('driver_name')} <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="name" name="name" value={form.name} onChange={handleInputChange} className="form-input" placeholder={t('enter_driver_name')} required />
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('phone')}
                                    </label>
                                    <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleInputChange} className="form-input" placeholder={t('enter_phone_number')} />
                                </div>
                                <div>
                                    <label htmlFor="id_number" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('id_number')}
                                    </label>
                                    <input type="text" id="id_number" name="id_number" value={form.id_number} onChange={handleInputChange} className="form-input" placeholder={t('enter_id_number')} />
                                </div>
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
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.back()}>
                        {t('cancel')}
                    </button>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? t('submitting') : t('add_driver')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddDeliveryDriverPage;

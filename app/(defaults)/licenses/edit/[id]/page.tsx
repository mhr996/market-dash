'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

interface License {
    id: number;
    title: string;
    desc: string;
    price: number;
    shops: number;
    products: number;
    commission_type: string;
    commission_value: number;
    created_at: string;
}

const EditLicensePage = () => {
    // Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;

    const router = useRouter();
    const { t } = getTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<License>({
        id: 0,
        title: '',
        desc: '',
        price: 0,
        shops: 0,
        products: 0,
        commission_type: '',
        commission_value: 0,
        created_at: '', // This will be populated by fetchLicenseData
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchLicenseData = async () => {
            try {
                const { data, error } = await supabase.from('licenses').select('*').eq('id', id).single();
                if (error) throw error;
                setForm(data);
            } catch (error) {
                console.error('Error fetching license:', error);
                setAlert({ visible: true, message: t('error_loading_license_data'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchLicenseData();
        }
    }, [id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'price' || name === 'shops' || name === 'products' || name === 'commission_value') {
            setForm((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Validate required fields
            if (!form.title) {
                throw new Error(t('license_title_required'));
            }

            if (form.price < 0) {
                throw new Error(t('price_cannot_be_negative'));
            }

            if (form.shops < 0) {
                throw new Error(t('shop_count_cannot_be_negative'));
            }

            if (form.products < 0) {
                throw new Error(t('product_count_cannot_be_negative'));
            }

            // Create update payload with fields we want to update
            const updatePayload = {
                title: form.title,
                desc: form.desc,
                price: form.price,
                shops: form.shops,
                products: form.products,
                commission_type: form.commission_type,
                commission_value: form.commission_value,
            };

            // Update the license
            const { error } = await supabase.from('licenses').update(updatePayload).eq('id', id);

            if (error) throw error;

            // Wait a moment to ensure the update is processed
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Check if the update was successful
            const { data: updatedLicense, error: fetchError } = await supabase.from('licenses').select('*').eq('id', id).single();

            if (fetchError) throw fetchError; // Update was successful
            setForm(updatedLicense);
            setAlert({ visible: true, message: t('license_updated_successfully'), type: 'success' });

            // Redirect back to licenses list after a brief delay
            setTimeout(() => {
                router.push('/licenses');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_updating_license'),
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
                <span className="ml-3">{t('loading')}</span>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-5 mb-6">
                {' '}
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>{' '}
                {/* Breadcrumb Navigation */}
                <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                    <li>
                        <Link href="/" className="text-primary hover:underline">
                            {t('home')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <Link href="/licenses" className="text-primary hover:underline">
                            {t('licenses')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('edit_license')}</span>
                    </li>
                </ul>
            </div>
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}{' '}
            {/* Form Container */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-6 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">{t('edit_license')}</h6>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Title Field */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('license_title')} <span className="text-red-500">*</span>
                            </label>
                            <input type="text" id="title" name="title" value={form.title} onChange={handleInputChange} className="form-input" placeholder={t('enter_license_title')} required />
                        </div>

                        {/* Price Field */}
                        <div>
                            <label htmlFor="price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('price')} <span className="text-red-500">*</span>
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md">
                                    $
                                </span>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    step="0.01"
                                    value={form.price}
                                    onChange={handleInputChange}
                                    className="form-input rounded-l-none"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>
                    </div>{' '}
                    {/* Description Field */}
                    <div>
                        <label htmlFor="desc" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            {t('description')}
                        </label>
                        <textarea id="desc" name="desc" value={form.desc} onChange={handleInputChange} className="form-textarea" placeholder={t('enter_license_description')} rows={4} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Shops Count Field */}
                        <div>
                            <label htmlFor="shops" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('shops_allowed')} <span className="text-red-500">*</span>
                            </label>
                            <input type="number" id="shops" name="shops" value={form.shops} onChange={handleInputChange} className="form-input" placeholder="0" required min="0" />
                        </div>

                        {/* Products Count Field */}
                        <div>
                            <label htmlFor="products" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('products_allowed')} <span className="text-red-500">*</span>
                            </label>
                            <input type="number" id="products" name="products" value={form.products} onChange={handleInputChange} className="form-input" placeholder="0" required min="0" />
                        </div>
                    </div>{' '}
                    {/* Commission Rate Field */}
                    <div className="space-y-4 border-2 border-dashed border-gray-200 p-4 rounded-lg dark:border-gray-700">
                        <div>
                            <label htmlFor="commission_type" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                {t('commission_rate')}
                            </label>
                            <div className="flex space-x-4 mb-4">
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="commission_type"
                                        className="form-radio"
                                        checked={form.commission_type === 'percentage'}
                                        onChange={() => setForm({ ...form, commission_type: 'percentage' })}
                                    />
                                    <span className="ml-2">{t('percentage')}</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input
                                        type="radio"
                                        name="commission_type"
                                        className="form-radio"
                                        checked={form.commission_type === 'fixed'}
                                        onChange={() => setForm({ ...form, commission_type: 'fixed' })}
                                    />
                                    <span className="ml-2">{t('fixed')}</span>
                                </label>
                            </div>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md">
                                    {form.commission_type === 'percentage' ? '%' : '$'}
                                </span>
                                <input
                                    type="number"
                                    id="commission_value"
                                    name="commission_value"
                                    step="0.01"
                                    value={form.commission_value}
                                    onChange={handleInputChange}
                                    className="form-input rounded-l-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('created_date')}</label>
                        <div className="py-2.5 px-4 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-800 dark:text-gray-300">{new Date(form.created_at).toLocaleString()}</div>
                    </div>
                    {/* Action Buttons */}
                    <div className="mt-8 flex items-center justify-end">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger ltr:mr-4 rtl:ml-4">
                            {t('cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? t('saving') : t('save_changes')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditLicensePage;

'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import IconCaretDown from '@/components/icon/icon-caret-down';

interface Subscription {
    id: number;
    license_id: number;
    profile_id: string;
    created_at: string;
    status: string;
    renewal_date?: string;
    license?: {
        title: string;
        price: number;
    };
    profiles?: {
        full_name: string;
        email: string;
    };
}

const EditSubscriptionPage = () => {
    // Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;

    const router = useRouter();
    const { t } = getTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const statusRef = useRef<HTMLDivElement>(null);
    const [form, setForm] = useState<Subscription>({
        id: 0,
        license_id: 0,
        profile_id: '',
        created_at: '',
        status: 'Active',
        renewal_date: '',
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchSubscriptionData = async () => {
            try {
                // Join with licenses and profiles tables to get additional information
                const { data, error } = await supabase.from('subscriptions').select('*, license:license_id(title, price), profiles:profile_id(full_name, email)').eq('id', id).single();

                if (error) throw error;
                setForm(data);
            } catch (error) {
                console.error('Error fetching subscription:', error);
                setAlert({ visible: true, message: 'Error loading subscription data', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchSubscriptionData();
        }
    }, [id]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
                setStatusDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    const handleStatusChange = (status: string) => {
        setForm((prev) => ({ ...prev, status }));
        setStatusDropdownOpen(false);
    };

    const handleRenewalDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, renewal_date: e.target.value }));
    };
    const handleRenewSubscription = (months: number) => {
        // Set renewal date based on the specified months
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + months);
        setForm((prev) => ({
            ...prev,
            renewal_date: renewalDate.toISOString().split('T')[0],
            status: 'Active',
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Validate required fields
            if (!form.status) {
                throw new Error(t('status') + ' is required');
            }

            // Create update payload with fields we want to update
            const updatePayload: any = {
                status: form.status,
            };

            // Add renewal_date if it's provided
            if (form.renewal_date) {
                updatePayload.renewal_date = form.renewal_date;
            }

            // Update the subscription
            const { error } = await supabase.from('subscriptions').update(updatePayload).eq('id', id);

            if (error) throw error;

            // Wait a moment to ensure the update is processed
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Check if the update was successful
            const { data: updatedSubscription, error: fetchError } = await supabase
                .from('subscriptions')
                .select('*, license:license_id(title, price), profiles:profile_id(full_name, email)')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;

            // Update was successful
            setForm(updatedSubscription);
            setAlert({ visible: true, message: t('subscription_updated_successfully'), type: 'success' });

            // Redirect back to subscriptions list after a brief delay
            setTimeout(() => {
                router.push('/subscriptions');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : t('error_updating_subscription'),
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
                        {' '}
                        <Link href="/subscriptions" className="text-primary hover:underline">
                            {t('subscriptions')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>
                            {t('edit')} {t('subscription')}
                        </span>
                    </li>
                </ul>
            </div>
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}{' '}
            {/* Form Container */}
            <div className="panel mb-5">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">
                        {t('edit')} {t('subscription')}
                    </h5>
                </div>

                {/* Subscription Details */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h6 className="mb-3 font-semibold">{t('subscription_details')}</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-medium">{t('id')}:</span> #{form.id}
                        </div>
                        <div>
                            <span className="font-medium">{t('license')}:</span> {form.license?.title || 'N/A'}
                        </div>
                        <div>
                            <span className="font-medium">{t('user')}:</span> {form.profiles?.full_name || 'N/A'}
                        </div>
                        <div>
                            <span className="font-medium">{t('email')}:</span> {form.profiles?.email || 'N/A'}
                        </div>
                        <div>
                            <span className="font-medium">{t('created')}:</span> {form.created_at ? new Date(form.created_at).toLocaleDateString() : ''}
                        </div>
                        <div>
                            <span className="font-medium">{t('price')}:</span> ${form.license?.price || 0}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {' '}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {' '}
                        {/* Status Field */}
                        <div className="relative" ref={statusRef}>
                            <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                {t('status')} <span className="text-red-500">*</span>
                            </label>
                            <div
                                className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                            >
                                <span>{form.status === 'Suspended' ? t('suspended') : form.status}</span>
                                <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>
                            {statusDropdownOpen && (
                                <div className="absolute z-10 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                    <div className="max-h-64 overflow-y-auto">
                                        {['Active', 'Inactive', 'Expired', 'Suspended'].map((status) => (
                                            <div
                                                key={status}
                                                className={`cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a] ${
                                                    form.status === status ? 'bg-primary/10 dark:bg-primary/10' : ''
                                                }`}
                                                onClick={() => handleStatusChange(status)}
                                            >
                                                {status === 'Suspended' ? t('suspended') : status}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>{' '}
                        {/* Renewal Date Field */}
                        <div>
                            <label htmlFor="renewal_date" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                {t('renewal_date')}
                            </label>
                            <input type="date" id="renewal_date" name="renewal_date" value={form.renewal_date || ''} onChange={handleRenewalDateChange} className="form-input" />
                        </div>
                    </div>{' '}
                    {/* Manual Renewal Section */}
                    <div className="panel border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('manual_renewal')}</h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('manual_renewal_description')}</p>
                        </div>{' '}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <button type="button" onClick={() => handleRenewSubscription(1)} className="btn btn-outline-primary">
                                {t('renew_for_1_month')}
                            </button>
                            <button type="button" onClick={() => handleRenewSubscription(3)} className="btn btn-outline-primary">
                                3 {t('months')}
                            </button>
                            <button type="button" onClick={() => handleRenewSubscription(6)} className="btn btn-outline-success">
                                6 {t('months')}
                            </button>
                            <button type="button" onClick={() => handleRenewSubscription(12)} className="btn btn-success">
                                {t('renew_for_1_year')}
                            </button>
                        </div>
                    </div>{' '}
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger">
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

export default EditSubscriptionPage;

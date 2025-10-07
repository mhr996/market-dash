'use client';
import React, { useState, useEffect } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconX from '@/components/icon/icon-x';
import IconLink from '@/components/icon/icon-link';

interface Customer {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    postal_code: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

interface EditCustomerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onSuccess: () => void;
}

const EditCustomerDialog: React.FC<EditCustomerDialogProps> = ({ isOpen, onClose, customer, onSuccess }) => {
    const { t } = getTranslation();
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        postal_code: '',
        status: '',
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        if (customer) {
            setForm({
                full_name: customer.full_name || '',
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                city: customer.city || '',
                country: customer.country || '',
                postal_code: customer.postal_code || '',
                status: customer.status || '',
            });
        }
    }, [customer]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('customers')
                .update({
                    full_name: form.full_name,
                    email: form.email,
                    phone: form.phone || null,
                    address: form.address || null,
                    city: form.city || null,
                    country: form.country || null,
                    postal_code: form.postal_code || null,
                    status: form.status,
                })
                .eq('id', customer.id);

            if (error) throw error;

            setAlert({ visible: true, message: t('customer_updated_successfully'), type: 'success' });
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_updating_customer'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFullEdit = () => {
        if (customer) {
            window.open(`/customers/edit/${customer.id}`, '_blank');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('edit_customer')}</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenFullEdit}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            <IconLink className="h-4 w-4 mr-1" />
                            {t('open_full_edit')}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <IconX className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {alert.visible && (
                        <div className="mb-4">
                            <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('full_name')} <span className="text-red-500">*</span>
                            </label>
                            <input id="full_name" name="full_name" type="text" value={form.full_name} onChange={handleInputChange} placeholder={t('enter_full_name')} required className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('email')} <span className="text-red-500">*</span>
                            </label>
                            <input id="email" name="email" type="email" value={form.email} onChange={handleInputChange} placeholder={t('enter_email')} required className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('phone')}
                            </label>
                            <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleInputChange} placeholder={t('enter_phone')} className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('address')}
                            </label>
                            <input id="address" name="address" type="text" value={form.address} onChange={handleInputChange} placeholder={t('enter_address')} className="form-input w-full" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    {t('city')}
                                </label>
                                <input id="city" name="city" type="text" value={form.city} onChange={handleInputChange} placeholder={t('enter_city')} className="form-input w-full" />
                            </div>

                            <div>
                                <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                    {t('country')}
                                </label>
                                <input id="country" name="country" type="text" value={form.country} onChange={handleInputChange} placeholder={t('enter_country')} className="form-input w-full" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('postal_code')}
                            </label>
                            <input id="postal_code" name="postal_code" type="text" value={form.postal_code} onChange={handleInputChange} placeholder={t('enter_postal_code')} className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('status')} <span className="text-red-500">*</span>
                            </label>
                            <select id="status" name="status" value={form.status} onChange={handleInputChange} required className="form-select w-full">
                                <option value="">{t('select_status')}</option>
                                <option value="active">{t('active')}</option>
                                <option value="inactive">{t('inactive')}</option>
                                <option value="pending">{t('pending')}</option>
                                <option value="suspended">{t('suspended')}</option>
                            </select>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={onClose} disabled={loading} className="btn btn-outline-danger">
                                {t('cancel')}
                            </button>
                            <button type="submit" disabled={loading} className="btn btn-primary">
                                {loading ? t('saving') : t('save_changes')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditCustomerDialog;

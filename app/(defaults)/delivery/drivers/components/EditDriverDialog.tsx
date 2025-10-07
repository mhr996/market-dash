'use client';
import React, { useState, useEffect } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconX from '@/components/icon/icon-x';
import IconLink from '@/components/icon/icon-link';

interface DeliveryDriver {
    id: number;
    name: string;
    avatar_url: string | null;
    phone: string | null;
    id_number: string | null;
    created_at?: string;
    delivery_cars?: Array<{
        id: number;
        plate_number: string;
        brand: string;
        model: string;
    }>;
}

interface EditDriverDialogProps {
    isOpen: boolean;
    onClose: () => void;
    driver: DeliveryDriver | null;
    onSuccess: () => void;
}

const EditDriverDialog: React.FC<EditDriverDialogProps> = ({ isOpen, onClose, driver, onSuccess }) => {
    const { t } = getTranslation();
    const [form, setForm] = useState({
        name: '',
        phone: '',
        id_number: '',
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        if (driver) {
            setForm({
                name: driver.name || '',
                phone: driver.phone || '',
                id_number: driver.id_number || '',
            });
        }
    }, [driver]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!driver) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('delivery_drivers')
                .update({
                    name: form.name,
                    phone: form.phone,
                    id_number: form.id_number,
                })
                .eq('id', driver.id);

            if (error) throw error;

            setAlert({ visible: true, message: t('driver_updated_successfully'), type: 'success' });
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_updating_driver'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFullEdit = () => {
        if (driver) {
            window.open(`/delivery/drivers/edit/${driver.id}`, '_blank');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('edit_driver')}</h3>
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
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('driver_name')} <span className="text-red-500">*</span>
                            </label>
                            <input id="name" name="name" type="text" value={form.name} onChange={handleInputChange} placeholder={t('enter_driver_name')} required className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('phone')}
                            </label>
                            <input id="phone" name="phone" type="tel" value={form.phone} onChange={handleInputChange} placeholder={t('enter_phone_number')} className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="id_number" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('id_number')}
                            </label>
                            <input id="id_number" name="id_number" type="text" value={form.id_number} onChange={handleInputChange} placeholder={t('enter_id_number')} className="form-input w-full" />
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

export default EditDriverDialog;

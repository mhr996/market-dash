'use client';
import React, { useState, useEffect } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconX from '@/components/icon/icon-x';
import IconLink from '@/components/icon/icon-link';

interface User {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

interface EditUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onSuccess: () => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ isOpen, onClose, user, onSuccess }) => {
    const { t } = getTranslation();
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        role: '',
        status: '',
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        if (user) {
            setForm({
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || '',
                role: user.role || '',
                status: user.status || '',
            });
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: form.full_name,
                    email: form.email,
                    phone: form.phone || null,
                    role: form.role,
                    status: form.status,
                })
                .eq('id', user.id);

            if (error) throw error;

            setAlert({ visible: true, message: t('user_updated_successfully'), type: 'success' });
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_updating_user'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFullEdit = () => {
        if (user) {
            window.open(`/users/edit/${user.id}`, '_blank');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('edit_user')}</h3>
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
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('role')} <span className="text-red-500">*</span>
                            </label>
                            <select id="role" name="role" value={form.role} onChange={handleInputChange} required className="form-select w-full">
                                <option value="">{t('select_role')}</option>
                                <option value="admin">{t('admin')}</option>
                                <option value="manager">{t('manager')}</option>
                                <option value="employee">{t('employee')}</option>
                                <option value="user">{t('user')}</option>
                            </select>
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

export default EditUserDialog;

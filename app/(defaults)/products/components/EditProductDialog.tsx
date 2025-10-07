'use client';
import React, { useState, useEffect } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconX from '@/components/icon/icon-x';
import IconLink from '@/components/icon/icon-link';
import IconCalendar from '@/components/icon/icon-calendar';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';

interface Product {
    id: string;
    title: string;
    desc: string | null;
    price: number;
    shop: string;
    category: number | null;
    subcategory_id: number | null;
    brand_id: number | null;
    active: boolean;
    onsale: boolean;
    created_at: string;
    updated_at: string;
}

interface EditProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSuccess: () => void;
}

const EditProductDialog: React.FC<EditProductDialogProps> = ({ isOpen, onClose, product, onSuccess }) => {
    const { t } = getTranslation();
    const [form, setForm] = useState({
        title: '',
        desc: '',
        price: '',
        active: true,
        onsale: false,
    });
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        if (product) {
            setForm({
                title: product.title || '',
                desc: product.desc || '',
                price: product.price?.toString() || '',
                active: product.active ?? true,
                onsale: product.onsale ?? false,
            });
        }
    }, [product]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('products')
                .update({
                    title: form.title,
                    desc: form.desc || null,
                    price: parseFloat(form.price) || 0,
                    active: form.active,
                    onsale: form.onsale,
                })
                .eq('id', product.id);

            if (error) throw error;

            setAlert({ visible: true, message: t('product_updated_successfully'), type: 'success' });
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_updating_product'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFullEdit = () => {
        if (product) {
            window.open(`/products/edit/${product.id}`, '_blank');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('edit_product')}</h3>
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
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('title')} <span className="text-red-500">*</span>
                            </label>
                            <input id="title" name="title" type="text" value={form.title} onChange={handleInputChange} placeholder={t('enter_title')} required className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('price')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="price"
                                name="price"
                                type="number"
                                step="0.01"
                                value={form.price}
                                onChange={handleInputChange}
                                placeholder={t('enter_price')}
                                required
                                className="form-input w-full"
                            />
                        </div>

                        <div>
                            <label htmlFor="desc" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('description')}
                            </label>
                            <textarea id="desc" name="desc" value={form.desc} onChange={handleInputChange} placeholder={t('enter_description')} rows={3} className="form-textarea w-full" />
                        </div>

                        <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                                <input type="checkbox" name="active" checked={form.active} onChange={handleInputChange} className="form-checkbox" />
                                <span className="ml-2 text-sm text-gray-700 dark:text-white">{t('active')}</span>
                            </label>
                            <label className="flex items-center">
                                <input type="checkbox" name="onsale" checked={form.onsale} onChange={handleInputChange} className="form-checkbox" />
                                <span className="ml-2 text-sm text-gray-700 dark:text-white">{t('on_sale')}</span>
                            </label>
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

export default EditProductDialog;

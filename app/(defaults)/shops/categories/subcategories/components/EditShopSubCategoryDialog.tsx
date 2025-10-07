'use client';
import React, { useState, useEffect } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconX from '@/components/icon/icon-x';
import IconLink from '@/components/icon/icon-link';

interface ShopCategory {
    id: number;
    title: string;
    description: string;
    created_at: string;
}

interface ShopSubCategory {
    id: number;
    title: string;
    description: string;
    category_id: number;
    image_url: string | null;
    created_at: string;
    categories_shop?: ShopCategory;
}

interface EditShopSubCategoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    subcategory: ShopSubCategory | null;
    onSuccess: () => void;
}

const EditShopSubCategoryDialog: React.FC<EditShopSubCategoryDialogProps> = ({ isOpen, onClose, subcategory, onSuccess }) => {
    const { t } = getTranslation();
    const [form, setForm] = useState({
        title: '',
        description: '',
        category_id: '',
    });
    const [categories, setCategories] = useState<ShopCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        if (subcategory) {
            setForm({
                title: subcategory.title || '',
                description: subcategory.description || '',
                category_id: subcategory.category_id?.toString() || '',
            });
        }
    }, [subcategory]);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase.from('categories_shop').select('*').order('title', { ascending: true });
                if (error) throw error;
                setCategories(data || []);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subcategory) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('categories_sub_shop')
                .update({
                    title: form.title,
                    description: form.description,
                    category_id: parseInt(form.category_id),
                })
                .eq('id', subcategory.id);

            if (error) throw error;

            setAlert({ visible: true, message: t('subcategory_updated_successfully'), type: 'success' });
            onSuccess();
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_updating_subcategory'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFullEdit = () => {
        if (subcategory) {
            window.open(`/shops/categories/subcategories/edit/${subcategory.id}`, '_blank');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('edit_subcategory')}</h3>
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
                                {t('subcategory_title')} <span className="text-red-500">*</span>
                            </label>
                            <input id="title" name="title" type="text" value={form.title} onChange={handleInputChange} placeholder={t('enter_subcategory_title')} required className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('parent_category')} <span className="text-red-500">*</span>
                            </label>
                            <select id="category_id" name="category_id" value={form.category_id} onChange={handleInputChange} required className="form-select w-full">
                                <option value="">{t('select_category')}</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('description')}
                            </label>
                            <textarea id="description" name="description" value={form.description} onChange={handleInputChange} placeholder={t('enter_description')} rows={3} className="form-textarea w-full" />
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

export default EditShopSubCategoryDialog;

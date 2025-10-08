'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconX from '@/components/icon/icon-x';
import IconLink from '@/components/icon/icon-link';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUpload from '@/components/icon/icon-camera';
import StorageManager from '@/utils/storage-manager';

interface ProductBrand {
    id: number;
    brand: string;
    description: string;
    image_url?: string;
    shop_id?: number | null;
    created_at: string;
    shops?: {
        id: number;
        shop_name: string;
    };
}

interface EditProductBrandDialogProps {
    isOpen: boolean;
    onClose: () => void;
    brand: ProductBrand | null;
    onSuccess: () => void;
}

const EditProductBrandDialog: React.FC<EditProductBrandDialogProps> = React.memo(({ isOpen, onClose, brand, onSuccess }) => {
    const { t } = getTranslation();
    const [form, setForm] = useState({
        brand: '',
        description: '',
        shop_id: '',
    });
    const [shops, setShops] = useState<{ id: number; shop_name: string }[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const shopRef = useRef<HTMLDivElement>(null);

    // Fetch shops on component mount
    useEffect(() => {
        const fetchShops = async () => {
            try {
                const { data, error } = await supabase.from('shops').select('id, shop_name').order('shop_name', { ascending: true });
                if (error) throw error;
                setShops(data || []);
            } catch (error) {
                console.error('Error fetching shops:', error);
            }
        };

        if (isOpen) {
            fetchShops();
        }
    }, [isOpen]);

    useEffect(() => {
        if (brand) {
            setForm({
                brand: brand.brand || '',
                description: brand.description || '',
                shop_id: brand.shop_id?.toString() || '',
            });
            setImagePreview(brand.image_url || '');
        }
    }, [brand]);

    // Handle click outside for dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shopRef.current && !shopRef.current.contains(event.target as Node)) {
                setIsShopDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!brand) return;

            setLoading(true);
            try {
                let imageUrl = brand.image_url;

                // Upload new image if provided
                if (imageFile) {
                    const uploadResult = await StorageManager.uploadFile(imageFile, `brands/${brand.id}`, 'brands');
                    if (uploadResult.success && uploadResult.url) {
                        imageUrl = uploadResult.url;
                    }
                }

                const updateData: any = {
                    brand: form.brand,
                    description: form.description,
                    shop_id: form.shop_id ? parseInt(form.shop_id) : null,
                };

                if (imageUrl) {
                    updateData.image_url = imageUrl;
                }

                const { error } = await supabase.from('categories_brands').update(updateData).eq('id', brand.id);

                if (error) throw error;

                setAlert({ visible: true, message: t('brand_updated_successfully'), type: 'success' });
                onSuccess();
                setTimeout(() => {
                    onClose();
                }, 1500);
            } catch (error: any) {
                setAlert({ visible: true, message: error.message || t('error_updating_brand'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        },
        [brand, form, imageFile, onSuccess, onClose, t],
    );

    const handleOpenFullEdit = useCallback(() => {
        if (brand) {
            window.open(`/products/brands/edit/${brand.id}`, '_blank');
        }
    }, [brand]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('edit_brand')}</h3>
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
                            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('brand_name')} <span className="text-red-500">*</span>
                            </label>
                            <input id="brand" name="brand" type="text" value={form.brand} onChange={handleInputChange} placeholder={t('enter_brand_name')} required className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('description')}
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={form.description}
                                onChange={handleInputChange}
                                placeholder={t('enter_description')}
                                rows={3}
                                className="form-textarea w-full"
                            />
                        </div>

                        {/* Shop Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('shop')}</label>
                            <div className="relative" ref={shopRef}>
                                <div className="form-input w-full cursor-pointer flex items-center justify-between" onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}>
                                    <span>{form.shop_id ? shops.find((s) => s.id.toString() === form.shop_id)?.shop_name : t('select_shop')}</span>
                                    <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isShopDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                                {isShopDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        <div className="p-2">
                                            <input type="text" placeholder={t('search_shop')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input w-full mb-2" />
                                        </div>
                                        <div className="py-1">
                                            <button
                                                type="button"
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={() => {
                                                    setForm((prev) => ({ ...prev, shop_id: '' }));
                                                    setIsShopDropdownOpen(false);
                                                }}
                                            >
                                                {t('clear_selection')}
                                            </button>
                                            {shops
                                                .filter((shop) => shop.shop_name.toLowerCase().includes(searchTerm.toLowerCase()))
                                                .map((shop) => (
                                                    <button
                                                        key={shop.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        onClick={() => {
                                                            setForm((prev) => ({ ...prev, shop_id: shop.id.toString() }));
                                                            setIsShopDropdownOpen(false);
                                                        }}
                                                    >
                                                        {shop.shop_name}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('brand_image')}</label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setImageFile(file);
                                            const reader = new FileReader();
                                            reader.onload = (e) => {
                                                setImagePreview(e.target?.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="hidden"
                                    id="brand-image-upload"
                                />
                                <label htmlFor="brand-image-upload" className="cursor-pointer">
                                    {imagePreview ? (
                                        <div className="space-y-2">
                                            <img src={imagePreview} alt="Brand preview" className="mx-auto h-24 w-24 object-cover rounded" />
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('click_to_change_image')}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <IconUpload className="mx-auto h-12 w-12 text-gray-400" />
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('click_to_upload_image')}</p>
                                        </div>
                                    )}
                                </label>
                            </div>
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
});

EditProductBrandDialog.displayName = 'EditProductBrandDialog';

export default EditProductBrandDialog;

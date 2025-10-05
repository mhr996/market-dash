'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import StorageManager from '@/utils/storage-manager';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import { getTranslation } from '@/i18n';

interface ShopCategory {
    id: number;
    title: string;
    description: string;
    image_url?: string;
    shop_id?: number | null;
    created_at: string;
    shops?: {
        id: number;
        shop_name: string;
    };
}

const EditShopCategory = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const categoryId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [category, setCategory] = useState<ShopCategory | null>(null);
    const [form, setForm] = useState({
        title: '',
        description: '',
        image_url: '',
        shop_id: '',
    });
    const [shops, setShops] = useState<Array<{ id: number; shop_name: string }>>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchCategory = async () => {
            try {
                const { data, error } = await supabase.from('categories_shop').select('*').eq('id', categoryId).single();
                if (error) throw error;
                setCategory(data);
                setForm({
                    title: data.title,
                    description: data.description,
                    image_url: data.image_url || '',
                    shop_id: data.shop_id ? data.shop_id.toString() : '',
                });
                if (data.image_url) {
                    setPreviewUrl(data.image_url);
                }
            } catch (error) {
                setAlert({ visible: true, message: 'Error loading category', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        const fetchShops = async () => {
            try {
                const { data, error } = await supabase.from('shops').select('id, shop_name').order('shop_name');
                if (error) throw error;
                setShops(data || []);
            } catch (error) {}
        };

        if (categoryId) {
            fetchCategory();
            fetchShops();
        }
    }, [categoryId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            let imageUrl = category?.image_url;

            // Upload new image if provided
            if (imageFile) {
                const storageManager = new StorageManager();
                const uploadResult = await StorageManager.uploadFile(imageFile, `shop-categories/${categoryId}`, 'shop-categories');
                if (uploadResult.success && uploadResult.url) {
                    imageUrl = uploadResult.url;
                }
            }

            // Update category
            const updateData: any = {
                title: form.title.trim(),
                description: form.description.trim(),
                image_url: imageUrl,
            };

            // Only add shop_id if the column exists
            if (form.shop_id) {
                updateData.shop_id = parseInt(form.shop_id);
            }

            const { error } = await supabase.from('categories_shop').update(updateData).eq('id', categoryId);

            if (error) throw error;

            setAlert({ visible: true, message: 'Category updated successfully', type: 'success' });
            setTimeout(() => {
                router.push('/shops/categories');
            }, 1500);
        } catch (error) {
            setAlert({ visible: true, message: 'Error updating category', type: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    const handleImageChange = (file: File | null) => {
        setImageFile(file);
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="panel">
            <div className="mb-5">
                <div className="flex items-center gap-4">
                    <Link href="/shops/categories" className="btn btn-outline-primary gap-2">
                        <IconArrowLeft />
                        Back to Categories
                    </Link>
                    <h5 className="text-lg font-semibold dark:text-white-light">Edit Shop Category</h5>
                </div>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? 'Success' : 'Error'}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="title" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                            Category Title *
                        </label>
                        <input id="title" type="text" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </div>

                    <div>
                        <label htmlFor="description" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                            Description *
                        </label>
                        <textarea id="description" className="form-textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="shop_id" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                            Shop Owner
                        </label>
                        <select id="shop_id" className="form-select" value={form.shop_id} onChange={(e) => setForm({ ...form, shop_id: e.target.value })}>
                            <option value="">Select a shop (optional)</option>
                            {shops.map((shop) => (
                                <option key={shop.id} value={shop.id}>
                                    {shop.shop_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">Category Image</label>
                    <div className="relative">
                        <div
                            onClick={() => {
                                const fileInput = document.createElement('input');
                                fileInput.type = 'file';
                                fileInput.accept = 'image/*';
                                fileInput.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                        try {
                                            setSaving(true);
                                            // Upload image to shop-categories storage
                                            const fileExt = file.name.split('.').pop()?.toLowerCase();
                                            const fileName = `${Date.now()}.${fileExt}`;
                                            const filePath = `${categoryId}/${fileName}`;

                                            const { data, error } = await supabase.storage.from('shop-categories').upload(filePath, file);

                                            if (error) throw error;

                                            const {
                                                data: { publicUrl },
                                            } = supabase.storage.from('shop-categories').getPublicUrl(filePath);

                                            setPreviewUrl(publicUrl);
                                            setForm({ ...form, image_url: publicUrl });
                                        } catch (error) {
                                            setAlert({ visible: true, message: 'Error uploading image', type: 'danger' });
                                        } finally {
                                            setSaving(false);
                                        }
                                    }
                                };
                                fileInput.click();
                            }}
                            className="relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b] overflow-hidden"
                        >
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Category" className="h-full w-full rounded-lg object-cover" />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                                            <svg className="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                                />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <svg className="mb-2 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                        />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Upload Category Image</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Link href="/shops/categories" className="btn btn-outline-secondary">
                        Cancel
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Updating...' : 'Update Category'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditShopCategory;

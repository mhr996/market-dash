'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImprovedImageUpload from '@/components/image-upload/improved-image-upload';
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
                    <ImprovedImageUpload
                        type="product"
                        shopId={1}
                        currentUrl={previewUrl}
                        onUploadComplete={(url) => {
                            if (typeof url === 'string') {
                                setPreviewUrl(url);
                                setForm({ ...form, image_url: url });
                            }
                        }}
                        onError={(error) => setAlert({ visible: true, message: error, type: 'danger' })}
                        buttonLabel="Upload Category Image"
                    />
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

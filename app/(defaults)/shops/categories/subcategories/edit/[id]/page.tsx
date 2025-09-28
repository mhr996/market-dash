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

const EditShopSubCategory = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const subCategoryId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [subCategory, setSubCategory] = useState<ShopSubCategory | null>(null);
    const [categories, setCategories] = useState<ShopCategory[]>([]);
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: '',
        image_url: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch subcategory
                const { data: subCategoryData, error: subCategoryError } = await supabase.from('categories_sub_shop').select('*, categories_shop(*)').eq('id', subCategoryId).single();
                if (subCategoryError) throw subCategoryError;

                // Fetch categories
                const { data: categoriesData, error: categoriesError } = await supabase.from('categories_shop').select('*').order('title', { ascending: true });
                if (categoriesError) throw categoriesError;

                setSubCategory(subCategoryData);
                setCategories(categoriesData || []);
                setForm({
                    title: subCategoryData.title,
                    description: subCategoryData.description,
                    category: subCategoryData.category_id?.toString() || '',
                    image_url: subCategoryData.image_url || '',
                });
                if (subCategoryData.image_url) {
                    setPreviewUrl(subCategoryData.image_url);
                }
            } catch (error) {
                setAlert({ visible: true, message: 'Error loading data', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (subCategoryId) {
            fetchData();
        }
    }, [subCategoryId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            let imageUrl = subCategory?.image_url;

            // Upload new image if provided
            if (imageFile) {
                const storageManager = new StorageManager();
                const uploadResult = await StorageManager.uploadFile(imageFile, `shop-subcategory-images/${subCategoryId}`, 'shop-subcategory-images');
                if (uploadResult.success && uploadResult.url) {
                    imageUrl = uploadResult.url;
                }
            }

            // Update subcategory
            const { error } = await supabase
                .from('categories_sub_shop')
                .update({
                    title: form.title.trim(),
                    description: form.description.trim(),
                    category_id: parseInt(form.category),
                    image_url: imageUrl,
                })
                .eq('id', subCategoryId);

            if (error) throw error;

            setAlert({ visible: true, message: 'Subcategory updated successfully', type: 'success' });
            setTimeout(() => {
                router.push('/shops/categories/subcategories');
            }, 1500);
        } catch (error) {
            setAlert({ visible: true, message: 'Error updating subcategory', type: 'danger' });
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
                    <Link href="/shops/categories/subcategories" className="btn btn-outline-primary gap-2">
                        <IconArrowLeft />
                        Back to Subcategories
                    </Link>
                    <h5 className="text-lg font-semibold dark:text-white-light">Edit Shop Subcategory</h5>
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
                            Subcategory Title *
                        </label>
                        <input id="title" type="text" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                    </div>

                    <div>
                        <label htmlFor="category" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                            Category *
                        </label>
                        <select id="category" className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                            <option value="">Select Category</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="description" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                        Description *
                    </label>
                    <textarea id="description" className="form-textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">Subcategory Image</label>
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
                        buttonLabel="Upload Subcategory Image"
                    />
                </div>

                <div className="flex justify-end gap-4">
                    <Link href="/shops/categories/subcategories" className="btn btn-outline-secondary">
                        Cancel
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Updating...' : 'Update Subcategory'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditShopSubCategory;

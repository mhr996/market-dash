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

interface Category {
    id: number;
    title: string;
    desc: string;
    image_url?: string;
    created_at: string;
}

const EditCategory = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const categoryId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [category, setCategory] = useState<Category | null>(null);
    const [form, setForm] = useState({
        title: '',
        desc: '',
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
        const fetchCategory = async () => {
            try {
                const { data, error } = await supabase.from('categories').select('*').eq('id', categoryId).single();
                if (error) throw error;
                setCategory(data);
                setForm({
                    title: data.title,
                    desc: data.desc,
                    image_url: data.image_url || '',
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

        if (categoryId) {
            fetchCategory();
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
                const uploadResult = await StorageManager.uploadFile(imageFile, `categories/${categoryId}`, 'categories');
                if (uploadResult.success && uploadResult.url) {
                    imageUrl = uploadResult.url;
                }
            }

            // Update category
            const { error } = await supabase
                .from('categories')
                .update({
                    title: form.title.trim(),
                    desc: form.desc.trim(),
                    image_url: imageUrl,
                })
                .eq('id', categoryId);

            if (error) throw error;

            setAlert({ visible: true, message: 'Category updated successfully', type: 'success' });
            setTimeout(() => {
                router.push('/products/categories');
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
                    <Link href="/products/categories" className="btn btn-outline-primary gap-2">
                        <IconArrowLeft />
                        Back to Categories
                    </Link>
                    <h5 className="text-lg font-semibold dark:text-white-light">Edit Category</h5>
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
                        <label htmlFor="desc" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                            Description *
                        </label>
                        <textarea id="desc" className="form-textarea" rows={3} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} required />
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
                    <Link href="/products/categories" className="btn btn-outline-secondary">
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

export default EditCategory;

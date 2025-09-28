'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';

interface Category {
    id: number;
    title: string;
    desc: string;
    created_at: string;
}

interface SubCategory {
    id: number;
    title: string;
    desc: string;
    category_id: number;
    image: string | null;
    created_at: string;
    categories?: Category;
}

const PreviewSubCategory = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const subCategoryId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [subCategory, setSubCategory] = useState<SubCategory | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchSubCategory = async () => {
            try {
                const { data, error } = await supabase.from('subcategories').select('*, categories(*)').eq('id', subCategoryId).single();
                if (error) throw error;
                setSubCategory(data);
            } catch (error) {
                setAlert({ visible: true, message: 'Error loading subcategory', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (subCategoryId) {
            fetchSubCategory();
        }
    }, [subCategoryId]);

    const handleDelete = async () => {
        if (!subCategory) return;

        try {
            // First, delete the subcategory folder from storage
            const folderPath = `${subCategory.id}`;
            const { data: files } = await supabase.storage.from('subcategories').list(folderPath);

            if (files && files.length > 0) {
                const filesToDelete = files.map((file) => `${folderPath}/${file.name}`);
                await supabase.storage.from('subcategories').remove(filesToDelete);
            }

            // Then delete the subcategory from database
            const { error } = await supabase.from('subcategories').delete().eq('id', subCategory.id);
            if (error) throw error;

            setAlert({ visible: true, message: 'Subcategory deleted successfully', type: 'success' });
            setTimeout(() => {
                router.push('/products/categories/subcategories');
            }, 1500);
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting subcategory', type: 'danger' });
        } finally {
            setShowDeleteModal(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!subCategory) {
        return (
            <div className="panel">
                <div className="text-center py-8">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-white">Subcategory not found</h3>
                    <Link href="/products/categories/subcategories" className="btn btn-primary mt-4">
                        Back to Subcategories
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="panel">
            <div className="mb-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/products/categories/subcategories" className="btn btn-outline-primary gap-2">
                            <IconArrowLeft />
                            Back to Subcategories
                        </Link>
                        <h5 className="text-lg font-semibold dark:text-white-light">Subcategory Preview</h5>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href={`/products/categories/subcategories/edit/${subCategory.id}`} className="btn btn-primary gap-2">
                            <IconEdit />
                            Edit
                        </Link>
                        <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger gap-2">
                            <IconTrashLines />
                            Delete
                        </button>
                    </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-4">Subcategory Information</h6>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">ID</label>
                            <p className="text-lg font-semibold text-primary">#{subCategory.id}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Title</label>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{subCategory.title}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Description</label>
                            <p className="text-gray-700 dark:text-gray-300">{subCategory.desc}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Category</label>
                            <p className="text-gray-700 dark:text-gray-300">{subCategory.categories?.title || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Created Date</label>
                            <p className="text-gray-700 dark:text-gray-300">
                                {new Date(subCategory.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <h6 className="text-sm font-semibold text-gray-700 dark:text-white mb-4">Subcategory Image</h6>
                    <div className="flex justify-center">
                        {subCategory.image ? (
                            <img src={subCategory.image} alt={subCategory.title} className="w-64 h-64 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                        ) : (
                            <div className="w-64 h-64 bg-gray-200 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Confirm Deletion"
                message="Are you sure you want to delete this subcategory? This action cannot be undone."
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                size="sm"
            />
        </div>
    );
};

export default PreviewSubCategory;

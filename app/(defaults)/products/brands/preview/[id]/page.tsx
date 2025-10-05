'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import IconEdit from '@/components/icon/icon-edit';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import ConfirmModal from '@/components/modals/confirm-modal';

interface Brand {
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

const PreviewBrandPage = () => {
    const router = useRouter();
    const params = useParams();
    const { t } = getTranslation();
    const [brand, setBrand] = useState<Brand | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const brandId = params?.id;

    useEffect(() => {
        if (brandId) {
            fetchBrand();
        }
    }, [brandId]);

    const fetchBrand = async () => {
        try {
            const { data, error } = await supabase.from('categories_brands').select('*, shops!shop_id(id, shop_name)').eq('id', brandId).single();

            if (error) throw error;

            setBrand(data);
        } catch (error) {
            console.error('Error fetching brand:', error);
            setAlert({ visible: true, message: 'Error fetching brand details', type: 'danger' });
        } finally {
            setFetching(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('categories_brands').delete().eq('id', brandId);

            if (error) throw error;

            setAlert({ visible: true, message: 'Brand deleted successfully!', type: 'success' });

            // Redirect after a short delay
            setTimeout(() => {
                router.push('/products/brands');
            }, 1500);
        } catch (error) {
            console.error('Error deleting brand:', error);
            setAlert({ visible: true, message: 'Error deleting brand. Please try again.', type: 'danger' });
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
        }
    };

    if (fetching) {
        return (
            <div className="panel">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (!brand) {
        return (
            <div className="panel">
                <div className="text-center py-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Brand not found</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">The brand you're looking for doesn't exist.</p>
                    <Link href="/products/brands" className="btn btn-primary mt-4">
                        Back to Brands
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="panel">
            <div className="mb-5 flex items-center justify-between">
                <h5 className="text-lg font-semibold dark:text-white-light">Brand Details</h5>
                <div className="flex space-x-2">
                    <Link href={`/products/brands/edit/${brandId}`} className="btn btn-outline-primary">
                        <IconEdit className="h-4 w-4" />
                        Edit
                    </Link>
                    <button onClick={() => setShowDeleteModal(true)} className="btn btn-outline-danger">
                        <IconTrashLines className="h-4 w-4" />
                        Delete
                    </button>
                    <Link href="/products/brands" className="btn btn-outline">
                        Back to Brands
                    </Link>
                </div>
            </div>

            {alert.visible && (
                <div className="mb-4 ml-4 max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? 'Success' : 'Error'}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            <div className="space-y-6">
                {/* Brand Image */}
                <div className="flex justify-center">
                    {brand.image_url ? (
                        <img src={brand.image_url} alt={brand.brand} className="h-48 w-48 rounded-lg object-cover border border-gray-300 dark:border-gray-600" />
                    ) : (
                        <div className="h-48 w-48 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center border border-gray-300 dark:border-gray-600">
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

                {/* Brand Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Brand Name</h3>
                        <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{brand.brand}</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Shop</h3>
                        <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{brand.shops?.shop_name || 'No Shop Assigned'}</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Created Date</h3>
                        <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            {new Date(brand.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2">Brand ID</h3>
                        <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg font-mono">#{brand.id}</p>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg whitespace-pre-wrap">{brand.description}</p>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                title="Delete Brand"
                message={`Are you sure you want to delete the brand "${brand.brand}"? This action cannot be undone.`}
                onCancel={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                size="sm"
            />
        </div>
    );
};

export default PreviewBrandPage;

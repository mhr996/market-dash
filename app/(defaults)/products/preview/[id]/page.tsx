'use client';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import IconEdit from '@/components/icon/icon-edit';
import { getTranslation } from '@/i18n';

interface Product {
    id: string;
    created_at: string;
    shop: string;
    title: string;
    desc: string;
    price: string;
    images: string[];
    category: number | null;
    features?: { label: string; value: string }[];
    shops: {
        shop_name: string;
        owner: string;
    };
    categories?: {
        title: string;
        desc: string;
    };
    sale_price?: number | null;
    discount_type?: 'percentage' | 'fixed' | null;
    discount_value?: number | null;
    discount_start?: string | null;
    discount_end?: string | null;
}

interface ProductDetailsPageProps {
    params: {
        id: string;
    };
}

const ProductDetailsPage = ({ params }: ProductDetailsPageProps) => {
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { t } = getTranslation();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data, error } = await supabase.from('products').select('*, shops(shop_name, owner), categories(title, desc)').eq('id', params.id).single();

                if (error) throw error;
                setProduct(data);
            } catch (error) {
                console.error('Error fetching product:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <h2 className="mb-2 text-xl font-bold">{t('product_not_found')}</h2>
                    <p className="mb-4 text-gray-500">{t('no_description_available')}</p>
                    <Link href="/products" className="btn btn-primary">
                        {t('back_to_products')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-5 mb-6">
                {' '}
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                {/* Breadcrumb Navigation */}
                <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                    <li>
                        <Link href="/" className="text-primary hover:underline">
                            {t('home')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <Link href="/products" className="text-primary hover:underline">
                            {t('products')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('preview')}</span>
                    </li>
                </ul>
            </div>

            <div className="panel">
                <div className="mb-5 flex justify-between">
                    <h2 className="text-2xl font-bold">{product.title}</h2>
                    <Link href={`/products/edit/${product.id}`} className="btn btn-primary gap-2">
                        <IconEdit className="h-5 w-5" />
                        {t('edit_product')}
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Image Gallery */}
                    <div className="space-y-4">
                        <div className="relative h-96 w-full overflow-hidden rounded-lg bg-gray-100">
                            <img src={product.images?.[currentImageIndex] || '/assets/images/product-placeholder.jpg'} alt={product.title} className="h-full w-full object-cover" />
                        </div>
                        {product.images && product.images.length > 1 && (
                            <div className="grid grid-cols-4 gap-2">
                                {product.images.map((image, index) => (
                                    <button
                                        key={index}
                                        className={`relative h-24 w-full overflow-hidden rounded-lg ${index === currentImageIndex ? 'ring-2 ring-primary' : ''}`}
                                        onClick={() => setCurrentImageIndex(index)}
                                    >
                                        <img src={image} alt={`${product.title} - Image ${index + 1}`} className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Details */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold">{t('description')}</h3>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">{product.desc}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold">{t('price')}</h3>
                            {product.sale_price ? (
                                <div className="mt-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl line-through text-gray-500">${parseFloat(product.price).toFixed(2)}</span>
                                        <span className="text-3xl font-bold text-success">${product.sale_price.toFixed(2)}</span>
                                    </div>
                                    <div className="mt-1">
                                        {product.discount_type === 'percentage' && product.discount_value && (
                                            <span className="text-sm bg-success/20 text-success px-2 py-1 rounded-full">{product.discount_value}% OFF</span>
                                        )}
                                        {product.discount_type === 'fixed' && product.discount_value && (
                                            <span className="text-sm bg-success/20 text-success px-2 py-1 rounded-full">${product.discount_value.toFixed(2)} OFF</span>
                                        )}

                                        {(product.discount_start || product.discount_end) && (
                                            <div className="mt-2 text-sm">
                                                <div className="flex flex-col gap-1">
                                                    {' '}
                                                    {product.discount_start && (
                                                        <div className="flex items-center">
                                                            <span className="font-medium mr-2">{t('starts')}:</span>
                                                            <span>{new Date(product.discount_start).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    {product.discount_end && (
                                                        <div className="flex items-center">
                                                            <span className="font-medium mr-2">{t('ends')}:</span>
                                                            <span>{new Date(product.discount_end).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-2 text-2xl font-bold text-primary">${parseFloat(product.price).toFixed(2)}</p>
                            )}
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold">{t('shop')}</h3>
                            <p className="mt-2">{product.shops?.shop_name}</p>
                        </div>

                        {product.categories && (
                            <div>
                                <h3 className="text-lg font-semibold">{t('category')}</h3>
                                <div className="mt-2">
                                    <h4 className="font-medium">{product.categories.title}</h4>
                                    <p className="text-gray-600 dark:text-gray-400">{product.categories.desc}</p>
                                </div>
                            </div>
                        )}

                        {product.features && product.features.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold">{t('product_features')}</h3>
                                <div className="mt-3 space-y-2">
                                    {product.features.map((feature, index) => (
                                        <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{feature.label}</span>
                                            <span className="text-gray-600 dark:text-gray-400">{feature.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-lg font-semibold">{t('created_date')}</h3>
                            <p className="mt-2">{new Date(product.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailsPage;

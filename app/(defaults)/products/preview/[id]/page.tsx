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
    subcategory_id: number | null;
    brand_id?: number | null;
    shops: {
        shop_name: string;
        owner: string;
    };
    categories?: {
        title: string;
        desc: string;
    };
    categories_sub?: {
        title: string;
        desc: string;
    };
    categories_brands?: {
        id: number;
        brand: string;
        description: string;
        image_url?: string;
    };
    sale_price?: number | null;
    discount_type?: 'percentage' | 'fixed' | null;
    discount_value?: number | null;
    discount_start?: string | null;
    discount_end?: string | null;
}

interface FeatureLabel {
    id: number;
    label: string;
    values: FeatureValue[];
}

interface FeatureValue {
    id: number;
    value: string;
    price_addition: number;
    image?: string | null;
    options?: FeatureValueOption[];
}

interface FeatureValueOption {
    id: number;
    option_name: string;
    image?: string | null;
    is_active?: boolean;
}

interface ProductDetailsPageProps {
    params: {
        id: string;
    };
}

const ProductDetailsPage = ({ params }: ProductDetailsPageProps) => {
    const router = useRouter();
    const [product, setProduct] = useState<Product | null>(null);
    const [features, setFeatures] = useState<FeatureLabel[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { t } = getTranslation();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*, shops(shop_name, owner), categories(title, desc), categories_sub(title, desc), categories_brands!brand_id(*)')
                    .eq('id', params.id)
                    .single();

                if (error) throw error;
                setProduct(data);

                // Fetch features from new tables
                await fetchProductFeatures(parseInt(params.id));
            } catch (error) {
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [params.id]);

    const fetchProductFeatures = async (productId: number) => {
        try {
            // Get feature labels for this product
            const { data: labels, error: labelsError } = await supabase.from('products_features_labels').select('*').eq('product_id', productId).order('created_at', { ascending: true });

            if (labelsError) throw labelsError;

            if (labels && labels.length > 0) {
                // Get values for each label
                const labelIds = labels.map((label) => label.id);
                const { data: values, error: valuesError } = await supabase.from('products_features_values').select('*').in('feature_label_id', labelIds).order('created_at', { ascending: true });

                if (valuesError) throw valuesError;

                if (values && values.length > 0) {
                    // Get options for each value
                    const valueIds = values.map((value) => value.id);
                    const { data: options, error: optionsError } = await supabase
                        .from('products_features_value_options')
                        .select('*')
                        .in('feature_value_id', valueIds)
                        .order('created_at', { ascending: true });

                    if (optionsError) throw optionsError;

                    // Group values by label and add options to each value
                    const featuresWithValues = labels.map((label) => ({
                        id: label.id,
                        label: label.label,
                        values: values
                            .filter((value) => value.feature_label_id === label.id)
                            .map((value) => ({
                                id: value.id,
                                value: value.value,
                                price_addition: value.price_addition,
                                image: value.image,
                                options: options?.filter((option) => option.feature_value_id === value.id) || [],
                            })),
                    }));

                    setFeatures(featuresWithValues);
                } else {
                    // No values, just labels
                    const featuresWithValues = labels.map((label) => ({
                        id: label.id,
                        label: label.label,
                        values: [],
                    }));

                    setFeatures(featuresWithValues);
                }
            } else {
                setFeatures([]);
            }
        } catch (error) {
            setFeatures([]);
        }
    };

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
        <div className="container mx-auto p-6 w-full max-w-none">
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

            <div className="panel w-full max-w-none">
                <div className="mb-5 flex justify-between">
                    <h2 className="text-2xl font-bold">{product.title}</h2>
                    <Link href={`/products/edit/${product.id}`} className="btn btn-primary gap-2">
                        <IconEdit className="h-5 w-5" />
                        {t('edit_product')}
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Image Gallery */}
                    <div className="lg:col-span-1 space-y-4">
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
                    <div className="lg:col-span-2 space-y-6">
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

                        {product.categories_sub && (
                            <div>
                                <h3 className="text-lg font-semibold">Subcategory</h3>
                                <div className="mt-2">
                                    <h4 className="font-medium">{product.categories_sub.title}</h4>
                                    <p className="text-gray-600 dark:text-gray-400">{product.categories_sub.desc}</p>
                                </div>
                            </div>
                        )}

                        {product.categories_brands && (
                            <div>
                                <h3 className="text-lg font-semibold">Brand</h3>
                                <div className="mt-2 flex items-center gap-3">
                                    {product.categories_brands.image_url && (
                                        <img src={product.categories_brands.image_url} alt={product.categories_brands.brand} className="h-12 w-12 rounded-lg object-cover" />
                                    )}
                                    <div>
                                        <h4 className="font-medium">{product.categories_brands.brand}</h4>
                                        <p className="text-gray-600 dark:text-gray-400">{product.categories_brands.description}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {features && features.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-4">{t('product_features')}</h3>
                                <div className="space-y-6">
                                    {features.map((feature, featureIndex) => (
                                        <div key={featureIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-4 text-lg">{feature.label}</h4>
                                            <div className="space-y-4">
                                                {feature.values.map((value, valueIndex) => (
                                                    <div key={valueIndex} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            {value.image && <img src={value.image} alt={value.value} className="w-12 h-12 rounded-lg object-cover" />}
                                                            <div>
                                                                <div className="font-medium text-gray-800 dark:text-gray-200 text-lg">{value.value}</div>
                                                                {value.price_addition > 0 && <div className="text-success text-sm">+${value.price_addition.toFixed(2)}</div>}
                                                            </div>
                                                        </div>

                                                        {/* Show Options */}
                                                        {value.options && value.options.length > 0 && (
                                                            <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                                                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Options:</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {value.options.map((option, optionIndex) => (
                                                                        <div
                                                                            key={optionIndex}
                                                                            className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-600"
                                                                        >
                                                                            {option.image && <img src={option.image} alt={option.option_name} className="w-6 h-6 rounded-full object-cover" />}
                                                                            <span className="text-sm text-gray-700 dark:text-gray-300">{option.option_name}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
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

'use client';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import Link from 'next/link';
import IconEdit from '@/components/icon/icon-edit';

interface Product {
    id: string;
    created_at: string;
    shop: string;
    title: string;
    desc: string;
    price: string;
    images: string[];
    category: number | null;
    shops: {
        shop_name: string;
        owner: string;
    };
    categories?: {
        title: string;
        desc: string;
    };
}

interface ProductDetailsPageProps {
    params: {
        id: string;
    };
}

const ProductDetailsPage = ({ params }: ProductDetailsPageProps) => {
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
                    <h2 className="mb-2 text-xl font-bold">Product Not Found</h2>
                    <p className="mb-4 text-gray-500">The product you're looking for doesn't exist or has been removed.</p>
                    <Link href="/products" className="btn btn-primary">
                        Back to Products
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="panel">
            <div className="mb-5 flex justify-between">
                <h2 className="text-2xl font-bold">{product.title}</h2>
                <Link href={`/products/edit/${product.id}`} className="btn btn-primary gap-2">
                    <IconEdit className="h-5 w-5" />
                    Edit Product
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
                        <h3 className="text-lg font-semibold">Description</h3>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{product.desc}</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold">Price</h3>
                        <p className="mt-2 text-2xl font-bold text-primary">${parseFloat(product.price).toFixed(2)}</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold">Shop</h3>
                        <p className="mt-2">{product.shops?.shop_name}</p>
                    </div>

                    {product.categories && (
                        <div>
                            <h3 className="text-lg font-semibold">Category</h3>
                            <div className="mt-2">
                                <h4 className="font-medium">{product.categories.title}</h4>
                                <p className="text-gray-600 dark:text-gray-400">{product.categories.desc}</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-lg font-semibold">Added</h3>
                        <p className="mt-2">{new Date(product.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetailsPage;

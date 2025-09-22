'use client';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import IconPlus from '@/components/icon/icon-plus';
import Link from 'next/link';

// Category interface
interface Category {
    id: number;
    title: string;
    desc: string;
    image_url?: string;
    created_at: string;
}

// SubCategory interface
interface SubCategory {
    id: number;
    title: string;
    desc: string;
    category_id: number;
    created_at: string;
}

const CategoryPreview = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const [category, setCategory] = useState<Category | null>(null);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategory = async () => {
            try {
                const { data, error } = await supabase.from('categories').select('*').eq('id', params?.id).single();

                if (error) throw error;
                setCategory(data);
            } catch (error) {
                console.error('Error fetching category:', error);
                router.push('/categories');
            } finally {
                setLoading(false);
            }
        };

        const fetchSubCategories = async () => {
            try {
                const { data, error } = await supabase.from('categories_sub').select('*').eq('category_id', params?.id).order('created_at', { ascending: false });

                if (error) throw error;
                setSubCategories(data || []);
            } catch (error) {
                console.error('Error fetching subcategories:', error);
            }
        };

        if (params?.id) {
            fetchCategory();
            fetchSubCategories();
        }
    }, [params?.id, router]);

    if (loading) {
        return (
            <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (!category) {
        return (
            <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
                <div className="text-center py-8">
                    <p className="text-gray-500">Category not found</p>
                    <button onClick={() => router.push('/categories')} className="btn btn-primary mt-4">
                        Back to Categories
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
            <div className="space-y-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="btn btn-outline-primary btn-sm">
                            <IconArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <h1 className="text-2xl font-bold">{category.title}</h1>
                    </div>
                    <Link href={`/categories/edit/${category.id}`} className="btn btn-primary">
                        <IconEdit className="w-4 h-4" />
                        Edit
                    </Link>
                </div>

                {/* Category Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Category Image */}
                    <div className="lg:col-span-1">
                        <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                            {category.image_url ? (
                                <img src={category.image_url} alt={category.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                    <img src="/assets/images/img-placeholder-fallback.webp" alt="Placeholder" className="w-24 h-24 object-cover rounded-lg" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Category Information */}
                    <div className="lg:col-span-2 space-y-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Category Name</h3>
                            <p className="text-gray-900 dark:text-white">{category.title}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                            <p className="text-gray-900 dark:text-white">{category.desc || 'No description provided'}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Created Date</h3>
                            <p className="text-gray-900 dark:text-white">{new Date(category.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Connected Sub Categories */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold">Connected Sub Categories ({subCategories.length})</h2>
                        <Link href="/categories/subcategories/add" className="btn btn-primary btn-sm">
                            <IconPlus className="w-4 h-4" />
                            Add Sub Category
                        </Link>
                    </div>

                    {subCategories.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subCategories.map((subCategory) => (
                                <div
                                    key={subCategory.id}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={() => router.push(`/categories/subcategories/preview/${subCategory.id}`)}
                                >
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{subCategory.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{subCategory.desc || 'No description provided'}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>ID: #{subCategory.id}</span>
                                        <span>{new Date(subCategory.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="text-gray-400 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1}
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Sub Categories</h3>
                            <p className="text-gray-500 mb-4">This category doesn't have any sub categories yet.</p>
                            <Link href="/categories/subcategories/add" className="btn btn-primary">
                                <IconPlus className="w-4 h-4" />
                                Create First Sub Category
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryPreview;

'use client';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { getTranslation } from '@/i18n';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';
import Link from 'next/link';

// SubCategory interface
interface SubCategory {
    id: number;
    title: string;
    desc: string;
    category_id: number;
    created_at: string;
    categories?: {
        id: number;
        title: string;
        desc: string;
    };
}

const SubCategoryPreview = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const [subCategory, setSubCategory] = useState<SubCategory | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSubCategory = async () => {
            try {
                const { data, error } = await supabase.from('categories_sub').select('*, categories(*)').eq('id', params?.id).single();

                if (error) throw error;
                setSubCategory(data);
            } catch (error) {
                console.error('Error fetching subcategory:', error);
                router.push('/categories/subcategories');
            } finally {
                setLoading(false);
            }
        };

        if (params?.id) {
            fetchSubCategory();
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

    if (!subCategory) {
        return (
            <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
                <div className="text-center py-8">
                    <p className="text-gray-500">Sub Category not found</p>
                    <button onClick={() => router.push('/categories/subcategories')} className="btn btn-primary mt-4">
                        Back to Sub Categories
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
                        <h1 className="text-2xl font-bold">{subCategory.title}</h1>
                    </div>
                    <Link href={`/categories/subcategories/edit/${subCategory.id}`} className="btn btn-primary">
                        <IconEdit className="w-4 h-4" />
                        Edit
                    </Link>
                </div>

                {/* SubCategory Details */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Sub Category Name</h3>
                        <p className="text-gray-900 dark:text-white">{subCategory.title}</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
                        <p className="text-gray-900 dark:text-white">{subCategory.desc || 'No description provided'}</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Parent Category</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-900 dark:text-white">{subCategory.categories?.title || 'Unknown Category'}</span>
                            {subCategory.categories && (
                                <Link href={`/categories/preview/${subCategory.categories.id}`} className="text-primary hover:underline text-sm">
                                    View Category
                                </Link>
                            )}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Created Date</h3>
                        <p className="text-gray-900 dark:text-white">{new Date(subCategory.created_at).toLocaleDateString()}</p>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Sub Category ID</h3>
                        <p className="text-gray-900 dark:text-white">#{subCategory.id}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubCategoryPreview;

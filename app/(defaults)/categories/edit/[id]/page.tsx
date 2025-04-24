'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

interface Category {
    id: number;
    title: string;
    desc: string;
    created_at: string;
}

const EditCategory = () => {
    // Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;

    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<Category>({
        id: 0,
        title: '',
        desc: '',
        created_at: '', // This will be populated by fetchCategoryData
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchCategoryData = async () => {
            try {
                const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();
                if (error) throw error;
                setForm(data);
            } catch (error) {
                console.error('Error fetching category:', error);
                setAlert({ visible: true, message: 'Error loading category data', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCategoryData();
        }
    }, [id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate required fields
            if (!form.title) {
                throw new Error('Category title is required');
            }

            // Create update payload with fields we want to update
            const updatePayload = {
                title: form.title,
                desc: form.desc,
            };

            try {
                // Update the category
                const { error } = await supabase.from('categories').update(updatePayload).eq('id', id);

                if (error) throw error;

                // Wait a moment to ensure the update is processed
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Check if the update was successful
                const { data: updatedCategory, error: fetchError } = await supabase.from('categories').select('*').eq('id', id).single();

                if (fetchError) throw fetchError;

                // Update was successful
                setForm(updatedCategory);
            } catch (error) {
                console.error('Error updating category:', error);
                throw error;
            }

            setAlert({ visible: true, message: 'Category updated successfully!', type: 'success' });
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error updating category',
                type: 'danger',
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <button onClick={() => router.back()} className="hover:text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>

                    <ul className="flex space-x-2 rtl:space-x-reverse items-center">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                Home
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/categories" className="text-primary hover:underline">
                                Categories
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span className="text-black dark:text-white-dark">Edit Category</span>
                        </li>
                    </ul>
                </div>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Edit Form */}
            <div className="panel mb-5">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">Edit Category</h5>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-5">
                        <div>
                            <label htmlFor="title" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input type="text" id="title" name="title" className="form-input" value={form.title} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label htmlFor="desc" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                Description
                            </label>
                            <textarea id="desc" name="desc" className="form-textarea min-h-[100px]" value={form.desc} onChange={handleInputChange} />
                        </div>
                        <div>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCategory;

'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

const AddCategoryPage = () => {
    const router = useRouter();
    const [form, setForm] = useState({
        title: '',
        desc: '',
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation
        if (!form.title) {
            setAlert({ visible: true, message: 'Category title is required.', type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.from('categories').insert([form]);
            if (error) throw error;
            setAlert({ visible: true, message: 'Category added successfully!', type: 'success' });
            // Redirect back to the categories list page after successful insertion
            router.push('/categories');
        } catch (error: any) {
            console.error(error);
            setAlert({ visible: true, message: error.message || 'Error adding category', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-5 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>

                {/* Breadcrumb Navigation */}
                <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
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
                        <span>Add New Category</span>
                    </li>
                </ul>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Form Container */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">Add New Category</h6>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-white">
                                Category Title <span className="text-red-500">*</span>
                            </label>
                            <input type="text" id="title" name="title" value={form.title} onChange={handleInputChange} className="form-input" placeholder="Enter category title" required />
                        </div>
                        <div>
                            <label htmlFor="desc" className="block text-sm font-bold text-gray-700 dark:text-white">
                                Description
                            </label>
                            <textarea id="desc" name="desc" value={form.desc} onChange={handleInputChange} className="form-textarea" placeholder="Enter category description" rows={4} />
                        </div>

                        {/* Submit Button */}
                        <div className="mt-6">
                            <button type="submit" disabled={loading} className="btn btn-primary w-full">
                                {loading ? 'Submitting...' : 'Add Category'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCategoryPage;

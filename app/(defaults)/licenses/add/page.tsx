'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';

const AddLicensePage = () => {
    const router = useRouter();
    const [form, setForm] = useState({
        title: '',
        desc: '',
        price: 0,
        shops: 0,
        products: 0,
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'price' || name === 'shops' || name === 'products') {
            setForm((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation
        if (!form.title) {
            setAlert({ visible: true, message: 'License title is required.', type: 'danger' });
            setLoading(false);
            return;
        }

        if (form.price < 0) {
            setAlert({ visible: true, message: 'Price cannot be negative.', type: 'danger' });
            setLoading(false);
            return;
        }

        if (form.shops < 0) {
            setAlert({ visible: true, message: 'Shop count cannot be negative.', type: 'danger' });
            setLoading(false);
            return;
        }

        if (form.products < 0) {
            setAlert({ visible: true, message: 'Product count cannot be negative.', type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.from('licenses').insert([form]);
            if (error) throw error;
            setAlert({ visible: true, message: 'License added successfully!', type: 'success' });
            // Redirect back to the licenses list page after successful insertion
            router.push('/licenses');
        } catch (error: any) {
            console.error(error);
            setAlert({ visible: true, message: error.message || 'Error adding license', type: 'danger' });
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
                        <Link href="/licenses" className="text-primary hover:underline">
                            Licenses
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>Add New License</span>
                    </li>
                </ul>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Form Container */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-6 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">Add New License</h6>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Title Field */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                License Title <span className="text-red-500">*</span>
                            </label>
                            <input type="text" id="title" name="title" value={form.title} onChange={handleInputChange} className="form-input" placeholder="Enter license title" required />
                        </div>

                        {/* Price Field */}
                        <div>
                            <label htmlFor="price" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Price <span className="text-red-500">*</span>
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-md">
                                    $
                                </span>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    step="0.01"
                                    value={form.price}
                                    onChange={handleInputChange}
                                    className="form-input rounded-l-none"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Description Field */}
                    <div>
                        <label htmlFor="desc" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                            Description
                        </label>
                        <textarea id="desc" name="desc" value={form.desc} onChange={handleInputChange} className="form-textarea" placeholder="Enter license description" rows={4} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Shops Count Field */}
                        <div>
                            <label htmlFor="shops" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Shops Allowed <span className="text-red-500">*</span>
                            </label>
                            <input type="number" id="shops" name="shops" value={form.shops} onChange={handleInputChange} className="form-input" placeholder="0" required min="0" />
                        </div>

                        {/* Products Count Field */}
                        <div>
                            <label htmlFor="products" className="block text-sm font-bold text-gray-700 dark:text-white mb-2">
                                Products Allowed <span className="text-red-500">*</span>
                            </label>
                            <input type="number" id="products" name="products" value={form.products} onChange={handleInputChange} className="form-input" placeholder="0" required min="0" />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex items-center justify-end">
                        <button type="button" onClick={() => router.back()} className="btn btn-outline-danger ltr:mr-4 rtl:ml-4">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create License'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddLicensePage;

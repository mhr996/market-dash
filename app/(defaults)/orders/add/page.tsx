'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImageUpload from '@/components/image-upload/image-upload';

const AddOrderPage = () => {
    const router = useRouter();
    const [form, setForm] = useState({
        name: '',
        image: null as string | null,
        buyer: '',
        status: 'pending',
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageUpload = (url: string) => {
        setForm((prev) => ({
            ...prev,
            image: url,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!form.name || !form.buyer) {
            setAlert({ visible: true, message: 'Name and buyer are required.', type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.from('orders').insert([form]).select();

            if (error) throw error;

            setAlert({ visible: true, message: 'Order added successfully!', type: 'success' });

            // Redirect back to the orders list page after successful insertion
            setTimeout(() => {
                router.push('/orders');
            }, 1500);
        } catch (error: any) {
            console.error(error);
            setAlert({ visible: true, message: error.message || 'Error adding order', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        Home
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/orders" className="text-primary hover:underline">
                        Orders
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Add</span>
                </li>
            </ul>

            <div className="panel mt-6">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">Add Order</h5>
                </div>

                {alert.visible && (
                    <div className="mb-4">
                        <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col sm:flex-row">
                        <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                            <ImageUpload
                                bucket="orders"
                                userId="temp"
                                url={form.image}
                                placeholderImage="/assets/images/product-placeholder.jpg"
                                onUploadComplete={handleImageUpload}
                                onError={(error) => {
                                    setAlert({
                                        visible: true,
                                        type: 'danger',
                                        message: error,
                                    });
                                }}
                            />
                        </div>
                        <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input type="text" id="name" name="name" className="form-input" value={form.name} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <label htmlFor="buyer" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    Buyer <span className="text-red-500">*</span>
                                </label>
                                <input type="text" id="buyer" name="buyer" className="form-input" value={form.buyer} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <label htmlFor="status" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    Status
                                </label>
                                <select id="status" name="status" className="form-select" value={form.status} onChange={handleInputChange}>
                                    <option value="pending">Pending</option>
                                    <option value="processing">Processing</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Adding...' : 'Add Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddOrderPage;

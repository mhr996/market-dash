'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImageUpload from '@/components/image-upload/image-upload';

interface Order {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    status: string;
}

const EditOrder = () => {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<Order>({
        id: 0,
        name: '',
        image: null,
        buyer: '',
        status: 'pending',
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    const fetchOrderData = async () => {
        try {
            const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
            if (error) throw error;
            setForm(data);
        } catch (error) {
            console.error(error);
            setAlert({ visible: true, message: 'Error fetching order details', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchOrderData();
        }
    }, [id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleImageUpload = async (url: string) => {
        try {
            const { error } = await supabase.from('orders').update({ image: url }).eq('id', id).select();

            if (error) throw error;

            setForm((prev) => ({
                ...prev,
                image: url,
            }));

            setAlert({ visible: true, message: 'Image updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Error updating image:', error);
            setAlert({ visible: true, message: 'Error updating image', type: 'danger' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!form.name || !form.buyer) {
                throw new Error('Name and buyer are required');
            }

            const updatePayload = {
                name: form.name,
                buyer: form.buyer,
                status: form.status,
            };

            const { error } = await supabase.from('orders').update(updatePayload).eq('id', id).select();

            if (error) throw error;

            setAlert({ visible: true, message: 'Order updated successfully!', type: 'success' });

            // Refresh data after successful update
            await fetchOrderData();

            // Redirect after successful update
            setTimeout(() => {
                router.push('/orders');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error updating order',
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
                    <span>Edit Order</span>
                </li>
            </ul>

            <div className="panel mt-6">
                <div className="mb-5">
                    <h5 className="text-lg font-semibold dark:text-white-light">Edit Order</h5>
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
                                userId={id.toString()}
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
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditOrder;

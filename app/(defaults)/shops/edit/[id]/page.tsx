'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImageUpload from '@/components/image-upload/image-upload';

interface Shop {
    id: number;
    created_at: string;
    owner: string; // This is a UUID string
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    active: boolean;
    profiles?: {
        full_name: string;
    };
}

const EditShop = () => {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<Shop>({
        id: 0,
        shop_name: '',
        shop_desc: '',
        logo_url: null,
        owner: '',
        active: true,
        created_at: '', // This will be populated by fetchShopData
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    // Fetch shop data function
    const fetchShopData = async () => {
        try {
            const { data, error } = await supabase.from('shops').select('*, profiles(full_name)').eq('id', id).single();
            if (error) throw error;
            setForm(data);
        } catch (error) {
            console.error(error);
            setAlert({ visible: true, message: 'Error fetching shop details', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchShopData();
        }
    }, [id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleLogoUpload = async (url: string) => {
        try {
            const { error } = await supabase.from('shops').update({ logo_url: url }).eq('id', id).select();

            if (error) throw error;

            setForm((prev) => ({
                ...prev,
                logo_url: url,
            }));

            setAlert({ visible: true, message: 'Logo updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Error updating logo:', error);
            setAlert({ visible: true, message: 'Error updating logo', type: 'danger' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate required fields
            if (!form.shop_name || !form.shop_desc) {
                throw new Error('Shop name and description are required');
            }

            // Create update payload with only the fields we want to update
            const updatePayload = {
                shop_name: form.shop_name,
                shop_desc: form.shop_desc,
                active: form.active,
            };

            const { error } = await supabase.from('shops').update(updatePayload).eq('id', id).select();

            if (error) throw error;

            setAlert({ visible: true, message: 'Shop updated successfully!', type: 'success' });

            // Refresh data after successful update
            await fetchShopData();

            // Redirect after successful update
            setTimeout(() => {
                router.push('/shops');
            }, 1500);
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error updating shop',
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
                            <Link href="/shops" className="text-primary hover:underline">
                                Shops
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span className="text-black dark:text-white-dark">Edit Shop</span>
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
                    <h5 className="text-lg font-semibold dark:text-white-light">Edit Shop</h5>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-col sm:flex-row">
                        <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                            <ImageUpload
                                bucket="shops"
                                userId={id.toString()}
                                url={form.logo_url}
                                placeholderImage="/assets/images/shop-placeholder.webp"
                                onUploadComplete={handleLogoUpload}
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
                                <label htmlFor="shop_name" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    Shop Name <span className="text-red-500">*</span>
                                </label>
                                <input type="text" id="shop_name" name="shop_name" className="form-input" value={form.shop_name} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <label htmlFor="owner" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    Owner
                                </label>
                                <input type="text" id="owner" className="form-input bg-[#eee] dark:bg-[#1b2e4b]" value={form.profiles?.full_name || form.owner} disabled />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="shop_desc" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    Description <span className="text-red-500">*</span>
                                </label>
                                <textarea id="shop_desc" name="shop_desc" className="form-textarea min-h-[100px]" value={form.shop_desc} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">Status</label>
                                <label className="inline-flex">
                                    <input type="checkbox" name="active" className="form-checkbox" checked={form.active} onChange={handleInputChange} />
                                    <span className="relative text-white-dark checked:bg-none">Active</span>
                                </label>
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

export default EditShop;

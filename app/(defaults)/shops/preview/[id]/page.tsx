'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconEdit from '@/components/icon/icon-edit';

interface Shop {
    id: number;
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    owner: string;
    active: boolean;
    created_at?: string;
    profiles?: {
        full_name: string;
        avatar_url?: string | null;
    };
}

const ShopPreview = () => {
    // Fix: Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;
    
    const router = useRouter();
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchShop = async () => {
            try {
                const { data, error } = await supabase.from('shops').select('*, profiles(full_name, avatar_url)').eq('id', id).single();

                if (error) throw error;
                setShop(data);
            } catch (error) {
                console.error(error);
                setAlert({ visible: true, message: 'Error fetching shop details', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchShop();
        }
    }, [id]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!shop) {
        return <div className="text-center p-6">Shop not found.</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 cursor-pointer text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <Link href={`/shops/edit/${shop.id}`} className="btn btn-primary flex items-center gap-2">
                    <IconEdit className="h-5 w-5" />
                    Edit Shop
                </Link>
            </div>

            {/* Breadcrumb Navigation */}
            <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
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
                    <span>Shop Preview</span>
                </li>
            </ul>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Shop Information */}
            <div className="mb-6 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">Shop Information</h6>
                <div className="flex flex-col sm:flex-row">
                    <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                        <img src={shop.logo_url || '/assets/images/shop-placeholder.webp'} alt={shop.shop_name} className="rounded-md object-cover w-full aspect-square" />
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Shop Name</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{shop.shop_name}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Shop Description</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{shop.shop_desc || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Owner</label>
                            <div className="mt-1 flex items-center gap-2">
                                <img src={shop.profiles?.avatar_url || '/assets/images/user-placeholder.webp'} alt={shop.profiles?.full_name} className="h-8 w-8 rounded-full object-cover" />
                                <p className="text-base text-gray-800 dark:text-gray-400">{shop.profiles?.full_name || 'N/A'}</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Registration Date</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{shop.created_at ? new Date(shop.created_at).toLocaleDateString('TR') : 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Status</label>
                            <span className={`badge mt-1 badge-outline-${shop.active ? 'success' : 'danger'}`}>{shop.active ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopPreview;

'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconBuilding from '@/components/icon/icon-building';
import IconPackage from '@/components/icon/icon-package';
import IconShoppingCart from '@/components/icon/icon-shopping-cart';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import { getTranslation } from '@/i18n';
import ProductsTab from '@/components/shops-cms/products-tab';
import BalanceTab from '@/components/shops-cms/balance-tab';
import ShopInfoTab from '@/components/shops-cms/shop-info-tab';

interface Shop {
    id: number;
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    status: string;
    public: boolean;
    created_at: string;
    owner: string;
    address?: string;
    phone_numbers?: string[];
    commission_rate?: number;
    categories_shop?: {
        id: number;
        title: string;
        description: string;
    };
    delivery_companies?: {
        id: number;
        company_name: string;
        logo_url: string | null;
    };
    profiles?: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
        email?: string | null;
        phone?: string | null;
    };
}

const ShopCMS = () => {
    const params = useParams();
    const id = params?.id as string;
    const { t } = getTranslation();
    const router = useRouter();
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'revenue' | 'balance' | 'info'>('products');
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchShop = async () => {
            try {
                const { data, error } = await supabase
                    .from('shops')
                    .select(
                        `
                        *,
                        profiles(id, full_name, avatar_url, email, phone),
                        categories_shop(id, title, description),
                        delivery_companies(id, company_name, logo_url)
                    `,
                    )
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setShop(data);
            } catch (error) {
                console.error('Error fetching shop:', error);
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
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Shop Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">The shop you're looking for doesn't exist.</p>
                    <Link href="/shops/cms" className="btn btn-primary">
                        Back to CMS
                    </Link>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'products', label: 'Products', icon: IconPackage },
        { id: 'balance', label: 'Balance', icon: IconCreditCard },
        { id: 'info', label: 'Shop Info', icon: IconInfoCircle },
    ];

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
            {/* Alert */}
            {alert.visible && (
                <div className="mb-4 ml-4 max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            {/* Breadcrumbs */}
            <div className="flex items-center justify-between flex-wrap gap-4 px-4 py-3">
                <div className="flex items-center space-x-2 text-sm">
                    <Link href="/shops" className="text-primary hover:underline">
                        Shops
                    </Link>
                    <span className="text-gray-400">/</span>
                    <Link href="/shops/cms" className="text-primary hover:underline">
                        CMS
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600 dark:text-gray-400">{shop.shop_name}</span>
                </div>
            </div>

            {/* Shop Header */}
            <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-6">
                    <div className="relative">
                        <img
                            src={shop.logo_url || '/assets/images/user-placeholder.webp'}
                            alt={shop.shop_name}
                            className="w-20 h-20 rounded-xl object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                        />
                        <div
                            className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 ${
                                shop.status === 'Approved' ? 'bg-success' : shop.status === 'Rejected' ? 'bg-danger' : 'bg-warning'
                            }`}
                        ></div>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{shop.shop_name}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{shop.shop_desc}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className={`badge badge-outline-${shop.status === 'Approved' ? 'success' : shop.status === 'Rejected' ? 'danger' : 'warning'}`}>{shop.status}</span>
                            <span className={`badge badge-outline-${shop.public ? 'success' : 'danger'}`}>{shop.public ? 'Public' : 'Private'}</span>
                            {shop.categories_shop && <span className="badge badge-outline-info">{shop.categories_shop.title}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex space-x-8">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-medium text-sm ${
                                    activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'products' && <ProductsTab shopId={shop.id} />}
                {activeTab === 'balance' && <BalanceTab shopId={shop.id} />}
                {activeTab === 'info' && <ShopInfoTab shopId={shop.id} />}
            </div>
        </div>
    );
};

export default ShopCMS;

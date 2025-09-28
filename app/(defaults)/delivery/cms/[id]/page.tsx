'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconBuilding from '@/components/icon/icon-building';
import IconUser from '@/components/icon/icon-user';
import IconCar from '@/components/icon/icon-car';
import IconCreditCard from '@/components/icon/icon-credit-card';
import { getTranslation } from '@/i18n';
import DriversTab from '@/components/delivery-cms/drivers-tab';
import CarsTab from '@/components/delivery-cms/cars-tab';
import BalanceTab from '@/components/delivery-cms/balance-tab';

interface DeliveryCompany {
    id: number;
    company_name: string;
    logo_url: string | null;
    owner_name: string;
    created_at: string;
    delivery_methods?: Array<{
        id: number;
        label: string;
        delivery_time: string;
        price: number;
        is_active: boolean;
    }>;
}

const DeliveryCMS = () => {
    const params = useParams();
    const id = params?.id as string;
    const { t } = getTranslation();
    const router = useRouter();
    const [company, setCompany] = useState<DeliveryCompany | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'drivers' | 'cars' | 'balance'>('drivers');
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const { data, error } = await supabase
                    .from('delivery_companies')
                    .select(
                        `
                        *,
                        delivery_methods(
                            id,
                            label,
                            delivery_time,
                            price,
                            is_active
                        )
                    `,
                    )
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setCompany(data);
            } catch (error) {
                console.error('Error fetching delivery company:', error);
                setAlert({ visible: true, message: 'Error fetching delivery company details', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchCompany();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Company Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">The delivery company you're looking for doesn't exist.</p>
                    <Link href="/delivery/cms" className="btn btn-primary">
                        Back to CMS
                    </Link>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'drivers', label: 'Drivers', icon: IconUser },
        { id: 'cars', label: 'Cars', icon: IconCar },
        { id: 'balance', label: 'Balance', icon: IconCreditCard },
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
                    <Link href="/delivery" className="text-primary hover:underline">
                        Delivery
                    </Link>
                    <span className="text-gray-400">/</span>
                    <Link href="/delivery/cms" className="text-primary hover:underline">
                        CMS
                    </Link>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600 dark:text-gray-400">{company.company_name}</span>
                </div>
            </div>

            {/* Company Header */}
            <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-6">
                    <div className="relative">
                        <img
                            src={company.logo_url || '/assets/images/user-placeholder.webp'}
                            alt={company.company_name}
                            className="w-20 h-20 rounded-xl object-cover border-4 border-white dark:border-gray-800 shadow-lg"
                        />
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-success"></div>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{company.company_name}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Owner: {company.owner_name}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="badge badge-outline-success">Active</span>
                            <span className="badge badge-outline-info">{company.delivery_methods?.length || 0} delivery methods</span>
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
                {activeTab === 'drivers' && <DriversTab companyId={parseInt(id)} />}
                {activeTab === 'cars' && <CarsTab companyId={parseInt(id)} />}
                {activeTab === 'balance' && <BalanceTab companyId={parseInt(id)} />}
            </div>
        </div>
    );
};

export default DeliveryCMS;

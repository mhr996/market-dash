'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    registration_date?: string;
    status?: string;
    profession?: string;
    country?: string;
    address?: string;
    location?: string;
    phone?: string;
    website?: string;
    user_roles?: {
        id: number;
        name: string;
        display_name: string;
    };
}

interface UserShop {
    id: number;
    shop_id: number;
    role: string;
    shops?: {
        shop_name: string;
    } | null;
}

interface UserDeliveryCompany {
    id: number;
    delivery_company_id: number;
    role: string;
    delivery_companies?: {
        company_name: string;
    } | null;
}

const UserPreviewPage = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const { user: currentUser, canAccessUsers } = useAuth();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [userShops, setUserShops] = useState<UserShop[]>([]);
    const [userDeliveryCompanies, setUserDeliveryCompanies] = useState<UserDeliveryCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userId = params?.id as string;
                if (!userId) return;

                // Get user profile with role
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select(
                        `
                        *,
                        user_roles!inner (
                            id,
                            name,
                            display_name
                        )
                    `,
                    )
                    .eq('id', userId)
                    .single();

                if (profileError) throw profileError;
                setUser(profile);

                // Get user's shops
                const { data: shops } = await supabase
                    .from('user_roles_shop')
                    .select(
                        `
                        id,
                        shop_id,
                        role,
                        shops!inner (
                            shop_name
                        )
                    `,
                    )
                    .eq('user_id', userId);

                setUserShops((shops as unknown as UserShop[]) || []);

                // Get user's delivery companies
                const { data: deliveryCompanies } = await supabase
                    .from('user_roles_delivery')
                    .select(
                        `
                        id,
                        delivery_company_id,
                        role,
                        delivery_companies!inner (
                            company_name
                        )
                    `,
                    )
                    .eq('user_id', userId);

                setUserDeliveryCompanies((deliveryCompanies as unknown as UserDeliveryCompany[]) || []);
            } catch (error) {
                console.error('Error fetching user:', error);
                setAlert({ visible: true, message: 'Error fetching user data', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [params?.id, canAccessUsers, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">User Not Found</h2>
                    <Link href="/users" className="btn btn-primary">
                        Back to Users
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            {/* Alert */}
            {alert.visible && (
                <div className="mb-4 max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? t('success') : t('error')}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-5 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Profile</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Info Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className="text-center">
                            <img className="h-24 w-24 rounded-full mx-auto mb-4 object-cover" src={user.avatar_url || `/assets/images/user-placeholder.webp`} alt={user.full_name} />
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{user.full_name}</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-4">{user.email}</p>

                            {/* Role Badge */}
                            <div className="mb-4">
                                <span
                                    className={`badge ${
                                        user.user_roles?.name === 'super_admin'
                                            ? 'badge-danger'
                                            : user.user_roles?.name === 'shop_owner'
                                              ? 'badge-primary'
                                              : user.user_roles?.name === 'delivery_owner'
                                                ? 'badge-success'
                                                : user.user_roles?.name === 'shop_editor'
                                                  ? 'badge-info'
                                                  : user.user_roles?.name === 'driver'
                                                    ? 'badge-warning'
                                                    : 'badge-secondary'
                                    }`}
                                >
                                    {user.user_roles?.display_name || 'User'}
                                </span>
                            </div>

                            {/* Status */}
                            <div className="mb-4">
                                <span className={`badge ${user.status === 'Active' ? 'badge-success' : 'badge-danger'}`}>{user.status || 'Inactive'}</span>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="space-y-3">
                            {user.profession && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Profession:</span>
                                    <span className="text-gray-900 dark:text-white">{user.profession}</span>
                                </div>
                            )}
                            {user.country && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Country:</span>
                                    <span className="text-gray-900 dark:text-white">{user.country}</span>
                                </div>
                            )}
                            {user.phone && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                                    <span className="text-gray-900 dark:text-white">{user.phone}</span>
                                </div>
                            )}
                            {user.website && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Website:</span>
                                    <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                        {user.website}
                                    </a>
                                </div>
                            )}
                            {user.registration_date && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Joined:</span>
                                    <span className="text-gray-900 dark:text-white">{new Date(user.registration_date).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Shops and Delivery Companies */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Shops */}
                    {userShops.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Shops</h3>
                            <div className="space-y-3">
                                {userShops.map((userShop) => (
                                    <div key={userShop.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">{userShop.shops?.shop_name || `Shop ${userShop.shop_id}`}</h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Shop ID: {userShop.shop_id}</p>
                                        </div>
                                        <span className={`badge ${userShop.role === 'shop_owner' ? 'badge-primary' : 'badge-info'}`}>{userShop.role === 'shop_owner' ? 'Owner' : 'Editor'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Delivery Companies */}
                    {userDeliveryCompanies.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Companies</h3>
                            <div className="space-y-3">
                                {userDeliveryCompanies.map((userDelivery) => (
                                    <div key={userDelivery.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                {userDelivery.delivery_companies?.company_name || `Company ${userDelivery.delivery_company_id}`}
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Company ID: {userDelivery.delivery_company_id}</p>
                                        </div>
                                        <span className={`badge ${userDelivery.role === 'delivery_owner' ? 'badge-success' : 'badge-warning'}`}>
                                            {userDelivery.role === 'delivery_owner' ? 'Owner' : 'Driver'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No assignments message */}
                    {userShops.length === 0 && userDeliveryCompanies.length === 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                <p>This user has no shop or delivery company assignments.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserPreviewPage;

'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import IconArrowLeft from '@/components/icon/icon-arrow-left';
import IconEdit from '@/components/icon/icon-edit';

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    username?: string;
    avatar_url: string | null;
    registration_date?: string;
    status?: string;
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
    shops?: UserShop[];
}

interface UserShop {
    id: number;
    shop_id: number;
    role: string;
    shops?: {
        shop_name: string;
    } | null;
}

const UserPreviewPage = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const { user: currentUser, canAccessUsers } = useAuth();
    const [user, setUser] = useState<UserProfile | null>(null);
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

                // Get user profile with role and shops
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select(
                        `
                        *,
                        user_roles!inner (
                            id,
                            name,
                            display_name
                        ),
                        shops:user_roles_shop!user_roles_shop_user_id_fkey (
                            id,
                            shop_id,
                            role,
                            shops!inner (
                                shop_name
                            )
                        )
                    `,
                    )
                    .eq('id', userId)
                    .single();

                if (profileError) throw profileError;
                setUser(profile);
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
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
            <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    {/* Breadcrumb Navigation */}
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/users" className="text-primary hover:underline">
                                {t('users')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>User Profile</span>
                        </li>
                    </ul>
                </div>
            </div>

            {alert.visible && (
                <div className="mb-4 px-5">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? 'Success' : 'Error'}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            <div className="px-5">
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
                                                  : user.user_roles?.name === 'shop_editor'
                                                    ? 'badge-info'
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

                            {/* Action Buttons */}
                            <div className="mt-6 flex gap-2">
                                <Link href={`/users/edit/${user.id}`} className="btn btn-primary flex-1 gap-2">
                                    <IconEdit className="h-4 w-4" />
                                    Edit User
                                </Link>
                            </div>

                            {/* Basic Info */}
                            <div className="space-y-3">
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

                    {/* Shops */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Shops */}
                        {user.shops && user.shops.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assigned Shops</h3>
                                <div className="space-y-3">
                                    {user.shops.map((userShop) => (
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

                        {/* No assignments message */}
                        {(!user.shops || user.shops.length === 0) && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <div className="text-center text-gray-500 dark:text-gray-400">
                                    <p>No shops assigned</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPreviewPage;

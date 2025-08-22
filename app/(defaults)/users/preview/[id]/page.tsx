'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconLinkedin from '@/components/icon/icon-linkedin';
import IconTwitter from '@/components/icon/icon-twitter';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGithub from '@/components/icon/icon-github';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import IconCalendar from '@/components/icon/icon-calendar';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconMail from '@/components/icon/icon-mail';
import IconUser from '@/components/icon/icon-user';
import IconSettings from '@/components/icon/icon-settings';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconClock from '@/components/icon/icon-clock';
import IconCheckCircle from '@/components/icon/icon-circle-check';
import IconXCircle from '@/components/icon/icon-x-circle';
import IconTrendingUp from '@/components/icon/icon-trending-up';
import { getTranslation } from '@/i18n';

interface User {
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
    linkedin_username?: string;
    twitter_username?: string;
    facebook_username?: string;
    github_username?: string;
    // Financial fields (some may not exist yet in DB)
    balance?: number;
    total_spent?: number;
    subscription_status?: string;
    subscription_expires_at?: string;
    last_payment_date?: string;
    payment_method?: string;
}

interface PaymentHistory {
    id: number;
    amount: number;
    date: string;
    status: 'completed' | 'pending' | 'failed';
    description: string;
    payment_method: string;
}

interface RealSubscription {
    id: number;
    status: string;
    created_at: string;
    licenses: {
        id: number;
        title: string;
        desc: string;
        price: number;
        shops: number;
        products: number;
        commission_type: string;
        commission_value: number;
    };
}

interface UserStats {
    total_shops: number;
    total_products: number;
    total_orders: number;
    total_spent: number;
}

const UserPreview = () => {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { t } = getTranslation();

    const [user, setUser] = useState<User | null>(null);
    const [subscription, setSubscription] = useState<RealSubscription | null>(null);
    const [userStats, setUserStats] = useState<UserStats>({
        total_shops: 0,
        total_products: 0,
        total_orders: 0,
        total_spent: 0,
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    // Dummy data for features that don't exist yet
    const [paymentHistory] = useState<PaymentHistory[]>([
        {
            id: 1,
            amount: 99.99,
            date: '2024-08-15',
            status: 'completed',
            description: 'Premium Subscription - Monthly',
            payment_method: 'Credit Card',
        },
        {
            id: 2,
            amount: 49.99,
            date: '2024-07-15',
            status: 'completed',
            description: 'Shop Setup Fee',
            payment_method: 'PayPal',
        },
        {
            id: 3,
            amount: 19.99,
            date: '2024-07-01',
            status: 'pending',
            description: 'Additional Storage',
            payment_method: 'Credit Card',
        },
    ]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Fetch user profile
                const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', id).single();

                if (profileError) throw profileError;

                // Fetch user's subscription
                const { data: subscriptionData, error: subscriptionError } = await supabase
                    .from('subscriptions')
                    .select(
                        `
                        *,
                        licenses (
                            id,
                            title,
                            desc,
                            price,
                            shops,
                            products,
                            commission_type,
                            commission_value
                        )
                    `,
                    )
                    .eq('profile_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                // Fetch user's shops count
                const { count: shopsCount } = await supabase.from('shops').select('*', { count: 'exact', head: true }).eq('owner', id);

                // Fetch user's products count (through shops)
                const { data: userShops } = await supabase.from('shops').select('id').eq('owner', id);

                let productsCount = 0;
                if (userShops && userShops.length > 0) {
                    const shopIds = userShops.map((shop) => shop.id);
                    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).in('shop', shopIds);
                    productsCount = count || 0;
                }

                // Fetch user's orders count
                const { count: ordersCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('buyer', id);

                // Set user data
                setUser(profileData);

                // Set subscription data
                if (!subscriptionError && subscriptionData) {
                    setSubscription(subscriptionData);
                }

                // Set stats
                setUserStats({
                    total_shops: shopsCount || 0,
                    total_products: productsCount,
                    total_orders: ordersCount || 0,
                    total_spent: 0, // TODO: Calculate from orders when payment system is implemented
                });
            } catch (error) {
                console.error(error);
                setAlert({ visible: true, message: 'Error fetching user details', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchUserData();
        }
    }, [id]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: { color: 'text-green-600 bg-green-100', icon: IconCheckCircle },
            completed: { color: 'text-green-600 bg-green-100', icon: IconCheckCircle },
            pending: { color: 'text-yellow-600 bg-yellow-100', icon: IconClock },
            expired: { color: 'text-red-600 bg-red-100', icon: IconXCircle },
            cancelled: { color: 'text-red-600 bg-red-100', icon: IconXCircle },
            failed: { color: 'text-red-600 bg-red-100', icon: IconXCircle },
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3 h-3 mr-1" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">{t('loading')}</div>;
    }

    if (!user) {
        return <div className="text-center p-6">{t('user_not_found')}</div>;
    }

    const tabs = [
        { name: t('overview'), icon: IconUser },
        { name: t('financial'), icon: IconDollarSign },
        { name: t('subscription'), icon: IconCreditCard },
        { name: t('payment_history'), icon: IconClock },
        { name: t('social_accounts'), icon: IconSettings },
    ];

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-5 mb-6">
                <button onClick={() => router.back()} className="hover:text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <ul className="flex space-x-2 rtl:space-x-reverse">
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
                        <span>{t('preview')}</span>
                    </li>
                </ul>
            </div>

            {alert.visible && <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />}

            {/* User Header Card */}
            <div className="panel mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center">
                        <div className="mb-4 sm:mb-0 ltr:sm:mr-6 rtl:sm:ml-6">
                            <img
                                src={user.avatar_url || '/assets/images/user-placeholder.webp'}
                                alt={user.full_name}
                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                            />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{user.full_name}</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-2">{user.profession || t('not_specified')}</p>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                <IconCalendar className="w-4 h-4 ltr:mr-1 rtl:ml-1" />
                                {t('joined')} {user.registration_date ? formatDate(user.registration_date) : t('unknown')}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 lg:mt-0">{getStatusBadge(user.status || 'active')}</div>
                </div>
            </div>

            {/* User Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="panel p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('total_shops')}</p>
                            <p className="text-2xl font-bold text-blue-600">{userStats.total_shops}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <IconUser className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="panel p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('total_products')}</p>
                            <p className="text-2xl font-bold text-green-600">{userStats.total_products}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full">
                            <IconTrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="panel p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('total_orders')}</p>
                            <p className="text-2xl font-bold text-purple-600">{userStats.total_orders}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full">
                            <IconCreditCard className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="panel p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('subscription')}</p>
                            <p className="text-2xl font-bold text-orange-600">{subscription ? subscription.status : t('not_set')}</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-full">
                            <IconClock className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="panel p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('total_spent')}</p>
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(user.total_spent || 0)}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <IconTrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="panel p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('subscription_status')}</p>
                            <p className="text-2xl font-bold text-purple-600">{user.subscription_status || 'Free'}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full">
                            <IconCreditCard className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>

                <div className="panel p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('last_payment')}</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{user.last_payment_date ? formatDate(user.last_payment_date) : t('no_payments')}</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-full">
                            <IconClock className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="panel">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-8 rtl:space-x-reverse">
                        {tabs.map((tab, index) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => setActiveTab(index)}
                                    className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === index
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                                >
                                    <Icon className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                    {tab.name}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Overview Tab */}
                    {activeTab === 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">{t('personal_information')}</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center">
                                        <IconMail className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <div>
                                            <p className="text-sm text-gray-500">{t('email')}</p>
                                            <p className="font-medium">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <IconPhone className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <div>
                                            <p className="text-sm text-gray-500">{t('phone')}</p>
                                            <p className="font-medium">{user.phone || t('not_provided')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <IconMapPin className="w-5 h-5 text-gray-400 ltr:mr-3 rtl:ml-3" />
                                        <div>
                                            <p className="text-sm text-gray-500">{t('location')}</p>
                                            <p className="font-medium">{user.country ? `${user.country}${user.address ? `, ${user.address}` : ''}` : t('not_provided')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold mb-4">{t('account_details')}</h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-500">{t('user_id')}</p>
                                        <p className="font-medium font-mono text-sm">{user.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">{t('website')}</p>
                                        <p className="font-medium">{user.website || t('not_provided')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">{t('preferred_payment_method')}</p>
                                        <p className="font-medium">{user.payment_method || t('not_set')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Financial Tab */}
                    {activeTab === 1 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-6">{t('financial_overview')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-lg">
                                    <h4 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">{t('account_balance')}</h4>
                                    <p className="text-3xl font-bold text-green-600">{formatCurrency(user.balance || 0)}</p>
                                    <p className="text-sm text-green-600 mt-1">{t('available_for_withdrawal')}</p>
                                </div>

                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg">
                                    <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">{t('lifetime_spending')}</h4>
                                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(user.total_spent || 0)}</p>
                                    <p className="text-sm text-blue-600 mt-1">{t('total_amount_spent')}</p>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h4 className="text-lg font-semibold mb-4">{t('financial_summary')}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('this_month_spending')}</p>
                                        <p className="text-xl font-bold">{formatCurrency(234.56)}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('pending_payments')}</p>
                                        <p className="text-xl font-bold">{formatCurrency(19.99)}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('refunds_issued')}</p>
                                        <p className="text-xl font-bold">{formatCurrency(0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Subscription Tab */}
                    {activeTab === 2 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-6">{t('subscription_details')}</h3>
                            {subscription ? (
                                <>
                                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-lg mb-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="text-xl font-bold text-purple-800 dark:text-purple-200">{subscription.licenses.title}</h4>
                                                <p className="text-purple-600 dark:text-purple-300 mt-1">{formatCurrency(subscription.licenses.price)}</p>
                                                <p className="text-sm text-purple-600 dark:text-purple-300 mt-2">{subscription.licenses.desc}</p>
                                            </div>
                                            {getStatusBadge(subscription.status)}
                                        </div>
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-purple-600 dark:text-purple-300">{t('start_date')}</p>
                                                <p className="font-medium">{formatDate(subscription.created_at)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-purple-600 dark:text-purple-300">{t('commission_type')}</p>
                                                <p className="font-medium">
                                                    {subscription.licenses.commission_type} - {subscription.licenses.commission_value}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-semibold mb-4">{t('plan_features')}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('max_shops')}</p>
                                                <p className="text-xl font-bold">{subscription.licenses.shops}</p>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('max_products')}</p>
                                                <p className="text-xl font-bold">{subscription.licenses.products}</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-500 dark:text-gray-400">{t('no_active_subscription')}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment History Tab */}
                    {activeTab === 3 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-6">{t('payment_history')}</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('date')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('description')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('amount')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('payment_method')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {paymentHistory.map((payment) => (
                                            <tr key={payment.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{formatDate(payment.date)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{payment.description}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">{formatCurrency(payment.amount)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{payment.payment_method}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(payment.status)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Social Accounts Tab */}
                    {activeTab === 4 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-6">{t('social_accounts')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="p-3 bg-blue-100 rounded-full ltr:mr-4 rtl:ml-4">
                                        <IconLinkedin className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">LinkedIn</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.linkedin_username || t('not_connected')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="p-3 bg-sky-100 rounded-full ltr:mr-4 rtl:ml-4">
                                        <IconTwitter className="w-6 h-6 text-sky-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Twitter</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.twitter_username || t('not_connected')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="p-3 bg-blue-100 rounded-full ltr:mr-4 rtl:ml-4">
                                        <IconFacebook className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Facebook</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.facebook_username || t('not_connected')}</p>
                                    </div>
                                </div>

                                <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="p-3 bg-gray-100 rounded-full ltr:mr-4 rtl:ml-4">
                                        <IconGithub className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium">GitHub</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.github_username || t('not_connected')}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserPreview;

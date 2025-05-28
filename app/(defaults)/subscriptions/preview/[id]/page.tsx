'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import IconArrowBackward from '@/components/icon/icon-arrow-backward';
import { getTranslation } from '@/i18n';

interface Subscription {
    id: number;
    license_id: number;
    profile_id: string;
    created_at: string;
    status: string;
    license?: {
        id: number;
        title: string;
        desc?: string;
        price: number;
        shops: number;
        products: number;
    };
    profiles?: {
        id: string;
        full_name: string;
        email: string;
        avatar_url?: string;
        phone?: string;
        registration_date?: string;
    };
}

interface SubscriptionDetailsPageProps {
    params: {
        id: string;
    };
}

const SubscriptionDetailsPage = ({ params }: SubscriptionDetailsPageProps) => {
    const router = useRouter();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();

    useEffect(() => {
        const fetchSubscription = async () => {
            try {
                const { data, error } = await supabase.from('subscriptions').select('*, license:license_id(*), profiles:profile_id(*)').eq('id', params.id).single();

                if (error) throw error;
                setSubscription(data);
            } catch (error) {
                console.error('Error fetching subscription:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="flex flex-col items-center justify-center h-80">
                <p className="text-xl font-bold mb-2">{t('subscription_not_found')}</p>
                <Link href="/subscriptions" className="btn btn-primary mt-4">
                    {t('back_to_subscriptions')}
                </Link>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            {/* Breadcrumb Navigation with back button */}
            <div className="flex items-center gap-5 mb-6">
                {' '}
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                {/* Breadcrumb Navigation */}{' '}
                <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                    <li>
                        <Link href="/" className="text-primary hover:underline">
                            {t('home')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <Link href="/subscriptions" className="text-primary hover:underline">
                            {t('subscriptions')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>
                            {t('subscriptions')} #{subscription.id}
                        </span>
                    </li>
                </ul>
            </div>


            {/* Subscription details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Subscription Info */}
                <div className="lg:col-span-8">
                    {' '}
                    <div className="panel h-full">
                        {/* Header */}
                        <div className="flex justify-between mb-5">
                            <h5 className="text-xl font-bold text-gray-800 dark:text-white-light">{t('subscription_details')}</h5>
                            <span className={`badge ${subscription.status === 'Active' ? 'bg-success' : 'bg-danger'} text-white text-base px-4 py-1.5`}>{subscription.status}</span>
                        </div>
                        {/* License Info */}
                        <div className="mb-6">
                            <h6 className="text-base font-semibold text-gray-700 dark:text-white-light mb-2">{t('license_details')}</h6>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('license')} {t('title')}
                                        </p>
                                        <p className="font-semibold">{subscription.license?.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('license')} {t('id')}
                                        </p>
                                        <p className="font-semibold">#{subscription.license_id}</p>
                                    </div>{' '}
                                    {subscription.license?.desc && (
                                        <div className="md:col-span-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
                                            <p>{subscription.license.desc}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('price')}</p>
                                        <p className="font-semibold text-primary">{'$' + subscription.license?.price}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('features')}</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <span className="badge badge-outline-info">
                                                {subscription.license?.shops || 0} {t('shops')}
                                            </span>
                                            <span className="badge badge-outline-primary">
                                                {subscription.license?.products || 0} {t('products')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>{' '}
                        {/* User Info */}
                        <div>
                            <h6 className="text-base font-semibold text-gray-700 dark:text-white-light mb-2">{t('user_details')}</h6>
                            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('full_name')}</p>
                                        <p className="font-semibold">{subscription.profiles?.full_name || t('not_available')}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('email')}</p>
                                        <p className="font-semibold">{subscription.profiles?.email || t('not_available')}</p>
                                    </div>
                                    {subscription.profiles?.phone && (
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('phone')}</p>
                                            <p className="font-semibold">{subscription.profiles.phone}</p>
                                        </div>
                                    )}
                                    {subscription.profiles?.registration_date && (
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('registration_date')}</p>
                                            <p className="font-semibold">{new Date(subscription.profiles.registration_date).toLocaleDateString()}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side Info */}
                <div className="lg:col-span-4">
                    {' '}
                    <div className="panel h-full">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold text-gray-800 dark:text-white-light">{t('subscription_summary')}</h5>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <h6 className="text-sm font-semibold text-gray-700 dark:text-white-light mb-2">{t('id')}</h6>
                                <p className="text-gray-600 dark:text-gray-400">#{subscription.id}</p>
                            </div>
                            <div>
                                <h6 className="text-sm font-semibold text-gray-700 dark:text-white-light mb-2">{t('status')}</h6>
                                <span className={`badge badge-outline-${subscription.status === 'Active' ? 'success' : 'danger'}`}>{subscription.status}</span>
                            </div>
                            <div>
                                <h6 className="text-sm font-semibold text-gray-700 dark:text-white-light mb-2">{t('created_at')}</h6>
                                <p className="text-gray-600 dark:text-gray-400">{new Date(subscription.created_at).toLocaleDateString()}</p>
                            </div>
                            <hr className="border-gray-200 dark:border-gray-700" />{' '}
                            <div className="mt-4">
                                <Link href={`/licenses/preview/${subscription.license_id}`} className="btn btn-outline-primary w-full mb-2">
                                    {t('license_details')}
                                </Link>
                                <Link href={`/users/preview/${subscription.profile_id}`} className="btn btn-outline-info w-full">
                                    {t('user_details')}
                                </Link>
                                <Link href="/subscriptions" className="btn btn-outline-secondary w-full mt-3">
                                    {t('back_to_subscriptions')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionDetailsPage;

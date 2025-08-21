'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import IconArrowBackward from '@/components/icon/icon-arrow-backward';
import IconEdit from '@/components/icon/icon-edit';
import { DataTable, DataTableSortStatus } from 'mantine-datatable';
import { sortBy } from 'lodash';
import { getTranslation } from '@/i18n';

interface PaymentHistory {
    id: number;
    subscription_id: number;
    amount: number;
    payment_date: string;
    payment_method: string;
    status: string;
    transaction_id?: string;
    created_at: string;
}

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
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const { t } = getTranslation();

    // Pagination state for payment history
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<PaymentHistory[]>([]);
    const [records, setRecords] = useState<PaymentHistory[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'desc',
    });

    useEffect(() => {
        const fetchSubscription = async () => {
            try {
                const { data, error } = await supabase.from('subscriptions').select('*, license:license_id(*), profiles:profile_id(*)').eq('id', params.id).single();

                if (error) throw error;
                setSubscription(data);

                // Fetch payment history for this subscription
                await fetchPaymentHistory(data.id);
            } catch (error) {
                console.error('Error fetching subscription:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSubscription();
    }, [params.id]);

    const fetchPaymentHistory = async (subscriptionId: number) => {
        setLoadingPayments(true);
        try {
            // Generate dummy payment history data for demonstration
            const dummyPayments: PaymentHistory[] = [
                {
                    id: 1,
                    subscription_id: subscriptionId,
                    amount: subscription?.license?.price || 0,
                    payment_date: '2024-01-15',
                    payment_method: 'Credit Card',
                    status: 'Completed',
                    transaction_id: 'txn_1234567890',
                    created_at: '2024-01-15T10:30:00Z',
                },
                {
                    id: 2,
                    subscription_id: subscriptionId,
                    amount: subscription?.license?.price || 0,
                    payment_date: '2024-02-15',
                    payment_method: 'Credit Card',
                    status: 'Completed',
                    transaction_id: 'txn_2345678901',
                    created_at: '2024-02-15T10:30:00Z',
                },
                {
                    id: 3,
                    subscription_id: subscriptionId,
                    amount: subscription?.license?.price || 0,
                    payment_date: '2024-03-15',
                    payment_method: 'PayPal',
                    status: 'Completed',
                    transaction_id: 'txn_3456789012',
                    created_at: '2024-03-15T10:30:00Z',
                },
                {
                    id: 4,
                    subscription_id: subscriptionId,
                    amount: subscription?.license?.price || 0,
                    payment_date: '2024-04-15',
                    payment_method: 'Credit Card',
                    status: 'Failed',
                    transaction_id: 'txn_4567890123',
                    created_at: '2024-04-15T10:30:00Z',
                },
                {
                    id: 5,
                    subscription_id: subscriptionId,
                    amount: subscription?.license?.price || 0,
                    payment_date: '2024-05-15',
                    payment_method: 'Bank Transfer',
                    status: 'Completed',
                    transaction_id: 'txn_5678901234',
                    created_at: '2024-05-15T10:30:00Z',
                },
            ];

            setPaymentHistory(dummyPayments);
            setInitialRecords(dummyPayments);
        } catch (error) {
            console.error('Error fetching payment history:', error);
        } finally {
            setLoadingPayments(false);
        }
    };

    // Pagination effects for payment history
    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        setInitialRecords(
            paymentHistory.filter((payment) => {
                const searchTerm = search.toLowerCase();
                return (
                    payment.transaction_id?.toLowerCase().includes(searchTerm) ||
                    payment.payment_method.toLowerCase().includes(searchTerm) ||
                    payment.status.toLowerCase().includes(searchTerm) ||
                    payment.amount.toString().includes(searchTerm)
                );
            }),
        );
    }, [paymentHistory, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof PaymentHistory);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

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
            {/* Header with back button and edit button */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div onClick={() => router.back()} className="cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <Link href={`/subscriptions/edit/${subscription.id}`} className="btn btn-primary flex items-center gap-2">
                    <IconEdit className="h-5 w-5" />
                    {t('edit_subscription')}
                </Link>
            </div>
            {/* Breadcrumb Navigation */}
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
            </div>{' '}
            {/* Subscription History */}
            <div className="mt-8">
                <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
                    <div className="invoice-table">
                        <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('payment_history')}</h5>
                            <div className="ltr:ml-auto rtl:mr-auto">
                                <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="datatables pagination-padding relative">
                            <DataTable
                                className={`${loadingPayments ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'}`}
                                records={records}
                                columns={[
                                    {
                                        accessor: 'id',
                                        title: t('payment_id'),
                                        sortable: true,
                                        render: ({ id }) => <strong className="text-info">#{id}</strong>,
                                    },
                                    {
                                        accessor: 'amount',
                                        title: t('amount'),
                                        sortable: true,
                                        render: ({ amount }) => <span className="font-semibold text-success">${amount}</span>,
                                    },
                                    {
                                        accessor: 'payment_date',
                                        title: t('payment_date'),
                                        sortable: true,
                                        render: ({ payment_date }) => new Date(payment_date).toLocaleDateString(),
                                    },
                                    {
                                        accessor: 'payment_method',
                                        title: t('payment_method'),
                                        sortable: true,
                                    },
                                    {
                                        accessor: 'status',
                                        title: t('status'),
                                        sortable: true,
                                        render: ({ status }) => (
                                            <span
                                                className={`badge ${status === 'Completed' ? 'bg-success' : status === 'Pending' ? 'bg-warning' : status === 'Failed' ? 'bg-danger' : 'bg-secondary'}`}
                                            >
                                                {status}
                                            </span>
                                        ),
                                    },
                                    {
                                        accessor: 'transaction_id',
                                        title: t('transaction_id'),
                                        sortable: true,
                                        render: ({ transaction_id }) => <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{transaction_id}</span>,
                                    },
                                ]}
                                totalRecords={initialRecords.length}
                                recordsPerPage={pageSize}
                                page={page}
                                onPageChange={(p) => setPage(p)}
                                recordsPerPageOptions={PAGE_SIZES}
                                onRecordsPerPageChange={setPageSize}
                                sortStatus={sortStatus}
                                onSortStatusChange={setSortStatus}
                                minHeight={200}
                                paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionDetailsPage;

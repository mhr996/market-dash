'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconClock from '@/components/icon/icon-clock';
import IconCalendar from '@/components/icon/icon-calendar';
import IconUser from '@/components/icon/icon-user';
import IconMail from '@/components/icon/icon-mail';
import IconTruck from '@/components/icon/icon-truck';
import IconBuilding from '@/components/icon/icon-building';
import IconDollarSign from '@/components/icon/icon-dollar-sign';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { sortBy } from 'lodash';
import { getTranslation } from '@/i18n';

interface WorkHours {
    day: string;
    open: boolean;
    startTime: string;
    endTime: string;
}

interface Category {
    id: number;
    title: string;
    desc: string;
}

interface DeliveryCompany {
    id: number;
    company_name: string;
    logo_url: string | null;
}

interface ShopTransaction {
    id: number;
    transaction_id: string;
    amount: number;
    date: string;
    status: 'pending' | 'completed' | 'failed';
    description: string;
    payment_method: string;
}

interface Shop {
    id: number;
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    cover_image_url: string | null;
    owner: string;
    status: string;
    public: boolean;
    created_at?: string;
    address?: string;
    work_hours?: WorkHours[];
    phone_numbers?: string[];
    category_id?: number | null;
    delivery_companies_id?: number | null;
    gallery?: string[] | null;
    latitude?: number | null;
    longitude?: number | null;
    balance?: number;
    commission_rate?: number;
    profiles?: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
        email?: string | null;
        phone?: string | null;
    };
    categories?: Category;
    delivery_companies?: DeliveryCompany;
}

const DeliveryShopPreview = () => {
    const params = useParams();
    const id = params?.id as string;
    const { t } = getTranslation();
    const router = useRouter();
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'owner' | 'details' | 'transactions' | 'delivery'>('owner');
    const [categories, setCategories] = useState<Category[]>([]);
    const [deliveryCompany, setDeliveryCompany] = useState<DeliveryCompany | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    // Transaction-related state
    const [shopTransactions, setShopTransactions] = useState<ShopTransaction[]>([]);
    const [transactionRecords, setTransactionRecords] = useState<ShopTransaction[]>([]);
    const [transactionSearch, setTransactionSearch] = useState('');
    const [transactionPage, setTransactionPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50];
    const [transactionPageSize, setTransactionPageSize] = useState(PAGE_SIZES[0]);
    const [transactionSortStatus, setTransactionSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'date',
        direction: 'desc',
    });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [sendingPayment, setSendingPayment] = useState(false);
    const [platformBalance, setPlatformBalance] = useState(0); // Set to 0 as requested

    // Format currency helper function
    const formatCurrency = (amount: number) => {
        return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Format date helper function
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    useEffect(() => {
        const fetchShop = async () => {
            try {
                const { data, error } = await supabase
                    .from('shops')
                    .select(
                        `
                        *,
                        profiles(id, full_name, avatar_url, email, phone),
                        categories(id, title, desc),
                        delivery_companies(id, company_name, logo_url)
                    `,
                    )
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setShop(data);

                // Fetch delivery company data if shop has one
                if (data.delivery_companies_id) {
                    setDeliveryCompany(data.delivery_companies);
                }

                // Fetch categories for dropdown
                const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('id, title, desc').order('title', { ascending: true });
                if (categoriesError) throw categoriesError;
                setCategories(categoriesData || []);
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

    // Transaction pagination and filtering
    useEffect(() => {
        let filteredTransactions = shopTransactions.filter((transaction) => {
            const searchTerm = transactionSearch.toLowerCase();
            return (
                transaction.transaction_id.toLowerCase().includes(searchTerm) ||
                transaction.description.toLowerCase().includes(searchTerm) ||
                transaction.payment_method.toLowerCase().includes(searchTerm)
            );
        });

        // Sort the filtered transactions
        const sorted = sortBy(filteredTransactions, transactionSortStatus.columnAccessor as keyof ShopTransaction);
        const sortedTransactions = transactionSortStatus.direction === 'desc' ? sorted.reverse() : sorted;

        // Paginate the sorted transactions
        const from = (transactionPage - 1) * transactionPageSize;
        const to = from + transactionPageSize;
        setTransactionRecords([...sortedTransactions.slice(from, to)]);
    }, [transactionPage, transactionPageSize, shopTransactions, transactionSearch, transactionSortStatus]);

    const handleSendPayment = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            setAlert({ visible: true, message: 'Please enter a valid payment amount', type: 'danger' });
            return;
        }

        setSendingPayment(true);
        try {
            // Simulate payment processing
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Add transaction to local state (in real app, this would be saved to database)
            const newTransaction: ShopTransaction = {
                id: Date.now(),
                transaction_id: `TXN-${Date.now()}`,
                amount: parseFloat(paymentAmount),
                date: new Date().toISOString(),
                status: 'completed',
                description: paymentDescription || 'Manual payment',
                payment_method: 'Platform Transfer',
            };

            setShopTransactions((prev) => [newTransaction, ...prev]);
            setPlatformBalance((prev) => prev + parseFloat(paymentAmount));
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentDescription('');
            setAlert({ visible: true, message: 'Payment sent successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error sending payment', type: 'danger' });
        } finally {
            setSendingPayment(false);
        }
    };

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
                    <Link href="/delivery/shops" className="btn btn-primary">
                        Back to Shops
                    </Link>
                </div>
            </div>
        );
    }

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
                    <Link href="/delivery/shops" className="text-primary hover:underline">
                        Delivery Shops
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
                            {deliveryCompany && <span className="badge badge-outline-info">{deliveryCompany.company_name}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('owner')}
                        className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'owner' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        Owner Details
                    </button>
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        Shop Details
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'transactions' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                    >
                        Transactions
                    </button>
                    {deliveryCompany && (
                        <button
                            onClick={() => setActiveTab('delivery')}
                            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'delivery' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        >
                            Delivery Company
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
                {activeTab === 'owner' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Owner Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <IconUser className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                                        <p className="font-medium">{shop.profiles?.full_name || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <IconMail className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                                        <p className="font-medium">{shop.profiles?.email || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <IconPhone className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                                        <p className="font-medium">{shop.profiles?.phone || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <IconCalendar className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Registration Date</p>
                                        <p className="font-medium">{shop.created_at ? formatDate(shop.created_at) : 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <IconBuilding className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Shop ID</p>
                                        <p className="font-medium">#{shop.id}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'details' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Shop Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Description</p>
                                    <p className="text-gray-900 dark:text-white">{shop.shop_desc || 'No description provided'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <IconMapPin className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                                        <p className="font-medium">{shop.address || 'No address provided'}</p>
                                    </div>
                                </div>
                                {shop.phone_numbers && shop.phone_numbers.length > 0 && (
                                    <div className="flex items-center gap-3">
                                        <IconPhone className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Phone Numbers</p>
                                            <div className="space-y-1">
                                                {shop.phone_numbers.map((phone, index) => (
                                                    <p key={index} className="font-medium">
                                                        {phone}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                {shop.categories && (
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Category</p>
                                        <p className="font-medium">{shop.categories.title}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Commission Rate</p>
                                    <p className="font-medium">{shop.commission_rate || 0}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Transactions</h3>
                            <button onClick={() => setShowPaymentModal(true)} className="btn btn-primary">
                                <IconDollarSign className="w-4 h-4 mr-2" />
                                Send Payment
                            </button>
                        </div>

                        {/* Balance Card */}
                        <div
                            className={`bg-gradient-to-r ${
                                platformBalance > 0 ? 'from-green-500 to-green-600' : platformBalance < 0 ? 'from-red-500 to-red-600' : 'from-blue-500 to-blue-600'
                            } rounded-lg p-6 text-white`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Current Balance</p>
                                    <p className="text-3xl font-bold">{formatCurrency(platformBalance)}</p>
                                    <p className="text-green-100 text-sm">Shop balance for transactions</p>
                                </div>
                                <div className="text-right">
                                    <button
                                        onClick={() => setShowPaymentModal(true)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                            platformBalance > 0 ? 'bg-green-600 hover:bg-green-700' : platformBalance < 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        Send Payment
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                <input
                                    type="text"
                                    className="form-input w-auto"
                                    placeholder="Search transactions..."
                                    value={transactionSearch}
                                    onChange={(e) => setTransactionSearch(e.target.value)}
                                />
                            </div>
                            <DataTable
                                records={transactionRecords}
                                columns={[
                                    {
                                        accessor: 'transaction_id',
                                        title: 'Transaction ID',
                                        sortable: true,
                                        render: ({ transaction_id }) => <span className="font-mono text-sm">{transaction_id}</span>,
                                    },
                                    {
                                        accessor: 'amount',
                                        title: 'Amount',
                                        sortable: true,
                                        render: ({ amount }) => (
                                            <span className={`font-semibold ${amount >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {amount >= 0 ? '+' : ''}
                                                {formatCurrency(amount)}
                                            </span>
                                        ),
                                    },
                                    {
                                        accessor: 'description',
                                        title: 'Description',
                                        sortable: true,
                                    },
                                    {
                                        accessor: 'payment_method',
                                        title: 'Payment Method',
                                        sortable: true,
                                    },
                                    {
                                        accessor: 'status',
                                        title: 'Status',
                                        sortable: true,
                                        render: ({ status }) => {
                                            const statusClasses = {
                                                completed: 'badge-outline-success',
                                                pending: 'badge-outline-warning',
                                                failed: 'badge-outline-danger',
                                            };
                                            return <span className={`badge ${statusClasses[status] || 'badge-outline-secondary'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
                                        },
                                    },
                                    {
                                        accessor: 'date',
                                        title: 'Date',
                                        sortable: true,
                                        render: ({ date }) => formatDate(date),
                                    },
                                ]}
                                totalRecords={shopTransactions.length}
                                recordsPerPage={transactionPageSize}
                                page={transactionPage}
                                onPageChange={setTransactionPage}
                                recordsPerPageOptions={PAGE_SIZES}
                                onRecordsPerPageChange={setTransactionPageSize}
                                sortStatus={transactionSortStatus}
                                onSortStatusChange={setTransactionSortStatus}
                                paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} entries`}
                                minHeight={200}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'delivery' && deliveryCompany && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Delivery Company</h3>
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                            <div className="flex items-center gap-4">
                                {deliveryCompany.logo_url && <img src={deliveryCompany.logo_url} alt={deliveryCompany.company_name} className="w-16 h-16 rounded-lg object-cover" />}
                                <div>
                                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white">{deliveryCompany.company_name}</h4>
                                    <p className="text-gray-600 dark:text-gray-400">Assigned delivery company for this shop</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Send Payment</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Amount ($)</label>
                                <input type="number" step="0.01" className="form-input w-full" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                                <textarea className="form-textarea w-full" placeholder="Payment description..." value={paymentDescription} onChange={(e) => setPaymentDescription(e.target.value)} />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        setPaymentAmount('');
                                        setPaymentDescription('');
                                    }}
                                    className="btn btn-outline"
                                    disabled={sendingPayment}
                                >
                                    Cancel
                                </button>
                                <button onClick={handleSendPayment} className="btn btn-primary" disabled={sendingPayment || !paymentAmount}>
                                    {sendingPayment ? 'Sending...' : 'Send Payment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryShopPreview;

'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconEdit from '@/components/icon/icon-edit';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconClock from '@/components/icon/icon-clock';
import IconCalendar from '@/components/icon/icon-calendar';
import IconUser from '@/components/icon/icon-user';
import IconMail from '@/components/icon/icon-mail';
import IconX from '@/components/icon/icon-x';
import IconCash from '@/components/icon/icon-cash-banknotes';
import IconCreditCard from '@/components/icon/icon-credit-card';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { sortBy } from 'lodash';
import { getTranslation } from '@/i18n';
import 'leaflet/dist/leaflet.css';

// Import the map component dynamically with no SSR
const InteractiveMap = dynamic(() => import('@/components/map/interactive-map'), {
    ssr: false, // This will prevent the component from being rendered on the server
});

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

interface ShopSale {
    id: number;
    order_id: string;
    product_name: string;
    quantity: number;
    price: number;
    total: number;
    commission: number;
    commission_rate: number;
    date: string;
    status: string;
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
    status: string; // Shop status (Pending, Approved, etc.)
    public: boolean; // Controls if shop is public or private
    created_at?: string;
    address?: string;
    work_hours?: WorkHours[];
    phone_numbers?: string[];
    category_id?: number | null;
    gallery?: string[] | null;
    latitude?: number | null; // Geographical location data
    longitude?: number | null; // Geographical location data
    balance?: number; // Shop balance/revenue
    commission_rate?: number; // Commission rate percentage
    profiles?: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
        email?: string | null;
        phone?: string | null;
    };
    categories?: Category;
}

const ShopPreview = () => {
    // Fix: Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;
    const { t } = getTranslation();
    const router = useRouter();
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'owner' | 'details' | 'revenue' | 'transactions'>('owner');
    const [categories, setCategories] = useState<Category[]>([]);
    const [unauthorized, setUnauthorized] = useState(false);
    const [productsCount, setProductsCount] = useState<number>(0);
    const [ordersCount, setOrdersCount] = useState<number>(0);
    const [newProductsCount, setNewProductsCount] = useState<number>(0);
    const [newOrdersCount, setNewOrdersCount] = useState<number>(0);
    const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
    const [shopSales, setShopSales] = useState<ShopSale[]>([]);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<ShopSale[]>([]);
    const [records, setRecords] = useState<ShopSale[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'date',
        direction: 'desc',
    });
    const [shopRevenueSummary, setShopRevenueSummary] = useState({
        totalRevenue: 0,
        totalCommission: 0,
        commissionRate: 0,
        netRevenue: 0,
    });
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
    const [transactionPageSize, setTransactionPageSize] = useState(PAGE_SIZES[0]);
    const [transactionSortStatus, setTransactionSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'date',
        direction: 'desc',
    });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [sendingPayment, setSendingPayment] = useState(false);
    const [platformBalance, setPlatformBalance] = useState(2450.75); // Dummy balance owed to shop

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
                // Get current user
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;

                // Get user's role from profiles table
                const { data: profileData, error: profileError } = await supabase.from('profiles').select('role').eq('id', userData?.user?.id).single();

                if (profileError) throw profileError;

                const isAdmin = profileData?.role === 1;

                // Updated query to fetch category details and commission info from licenses
                const { data, error } = await supabase
                    .from('shops')
                    .select(
                        `
                        *, 
                        profiles(id, full_name, avatar_url, email, phone), 
                        categories(*)
                    `,
                    )
                    .eq('id', id)
                    .single();

                if (error) throw error;

                // Check if user has permission to view this shop
                if (!isAdmin && data.owner !== userData?.user?.id) {
                    setUnauthorized(true);
                    setLoading(false);
                    return;
                }

                // Fetch commission rate from shop owner's active subscription
                let commissionRate = 10; // Default commission rate
                try {
                    const { data: subscriptionData, error: subError } = await supabase
                        .from('subscriptions')
                        .select(
                            `
                            licenses(commission_type, commission_value)
                        `,
                        )
                        .eq('profile_id', data.owner)
                        .eq('status', 'Active')
                        .single();

                    if (!subError && subscriptionData?.licenses) {
                        const license = Array.isArray(subscriptionData.licenses) ? subscriptionData.licenses[0] : subscriptionData.licenses;

                        if (license && license.commission_value) {
                            commissionRate = license.commission_value;
                        }
                    }
                } catch (error) {
                    console.log('No active subscription found, using default commission rate');
                }

                // Add commission rate to shop data
                const shopWithCommission = {
                    ...data,
                    commission_rate: commissionRate,
                };

                setShop(shopWithCommission);

                // Also fetch all categories for reference
                const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('*').order('title', { ascending: true });

                if (categoriesError) throw categoriesError;
                setCategories(categoriesData || []);

                // Fetch products count
                const { count: productsCount, error: productsError } = await supabase.from('products').select('id', { count: 'exact' }).eq('shop', data.id);

                if (productsError) throw productsError;
                setProductsCount(productsCount || 0);

                // Calculate new products in the last 7 days
                const lastWeekDate = new Date();
                lastWeekDate.setDate(lastWeekDate.getDate() - 7);

                const { count: newProducts, error: newProductsError } = await supabase
                    .from('products')
                    .select('id', { count: 'exact' })
                    .eq('shop', data.id)
                    .gte('created_at', lastWeekDate.toISOString());

                if (newProductsError) throw newProductsError;
                setNewProductsCount(newProducts || 0);

                // Fetch orders count for this shop (using join with products)
                const { count: ordersCount, error: ordersError } = await supabase.from('orders').select('id, products!inner(shop)', { count: 'exact' }).eq('products.shop', data.id);

                if (ordersError) throw ordersError;
                setOrdersCount(ordersCount || 0);

                // Calculate new orders in the last 7 days for this shop
                const { count: newOrders, error: newOrdersError } = await supabase
                    .from('orders')
                    .select('id, products!inner(shop)', { count: 'exact' })
                    .eq('products.shop', data.id)
                    .gte('created_at', lastWeekDate.toISOString());

                if (newOrdersError) throw newOrdersError;
                setNewOrdersCount(newOrders || 0);
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

    // Fetch real shop sales data when shop data is loaded and revenue tab is active
    useEffect(() => {
        if (shop && activeTab === 'revenue') {
            fetchShopSalesData();
        }
    }, [shop, activeTab, timeFilter]);

    // Function to fetch real sales data from Supabase
    const fetchShopSalesData = async () => {
        if (!shop) return;

        try {
            // Fetch orders with product details for this specific shop
            const { data: ordersData, error } = await supabase
                .from('orders')
                .select(
                    `
                    id,
                    created_at,
                    status,
                    product_id,
                    products!inner (
                        id,
                        title,
                        price,
                        sale_price,
                        shop
                    )
                `,
                )
                .eq('products.shop', shop.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform the data to match our ShopSale interface
            const transformedSales: ShopSale[] =
                ordersData?.map((order) => {
                    const product = Array.isArray(order.products) ? order.products[0] : order.products;
                    const finalPrice = product?.sale_price || product?.price || 0;
                    const quantity = 1; // Orders table doesn't have quantity, defaulting to 1
                    const total = finalPrice * quantity;
                    const commission_rate = shop?.commission_rate || 10; // Use shop's commission rate or default 10%
                    const commission = parseFloat(((total * commission_rate) / 100).toFixed(2));

                    return {
                        id: order.id,
                        order_id: `ORD-${order.id}`,
                        product_name: product?.title || 'Unknown Product',
                        quantity,
                        price: finalPrice,
                        total,
                        commission,
                        commission_rate,
                        date: order.created_at,
                        status: order.status || 'Unknown',
                    };
                }) || [];

            setShopSales(transformedSales);
            setInitialRecords(transformedSales);

            // Filter data based on timeFilter
            filterDataByTime(transformedSales);
        } catch (error) {
            console.error('Error fetching shop sales data:', error);
            setAlert({
                visible: true,
                message: 'Error fetching sales data',
                type: 'danger',
            });
            // Fallback to empty array
            setShopSales([]);
            setInitialRecords([]);
            calculateRevenueSummary([]);
        }
    };

    // Function to filter data by selected time period
    const filterDataByTime = (data: ShopSale[]) => {
        const today = new Date();
        let filteredData = [...data];

        if (timeFilter === 'weekly') {
            // Last 7 days
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            filteredData = data.filter((item) => new Date(item.date) >= weekAgo);
        } else if (timeFilter === 'monthly') {
            // Last 30 days
            const monthAgo = new Date(today);
            monthAgo.setDate(today.getDate() - 30);
            filteredData = data.filter((item) => new Date(item.date) >= monthAgo);
        } else if (timeFilter === 'yearly') {
            // This year
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            filteredData = data.filter((item) => new Date(item.date) >= startOfYear);
        }

        setInitialRecords(filteredData);
        calculateRevenueSummary(filteredData);
    };

    // Calculate revenue summary metrics
    const calculateRevenueSummary = (data: ShopSale[]) => {
        const totalRevenue = data.reduce((sum, sale) => sum + sale.total, 0);
        const totalCommission = data.reduce((sum, sale) => sum + sale.commission, 0);
        const commissionRate = shop?.commission_rate || 10;
        const netRevenue = totalRevenue - totalCommission;

        setShopRevenueSummary({
            totalRevenue,
            totalCommission,
            commissionRate,
            netRevenue,
        });
    };

    // Handle shop transaction data when transactions tab is active
    useEffect(() => {
        if (shop && activeTab === 'transactions') {
            // For now, we'll show a simple message since there's no transactions table
            // In a real-world scenario, you would have a transactions table to track payouts
            const basicTransactions: ShopTransaction[] = [
                {
                    id: 1,
                    transaction_id: `TXN-INITIAL`,
                    amount: shop.balance || 0,
                    date: shop.created_at || new Date().toISOString(),
                    status: 'completed',
                    description: 'Initial shop balance',
                    payment_method: 'Platform Credit',
                },
            ];

            setShopTransactions(basicTransactions);
            setTransactionRecords(basicTransactions);
            setPlatformBalance(shop.balance || 0); // Use actual shop balance
        }
    }, [shop, activeTab]);

    // Transaction search and pagination
    useEffect(() => {
        setTransactionPage(1);
    }, [transactionPageSize]);

    useEffect(() => {
        const from = (transactionPage - 1) * transactionPageSize;
        const to = from + transactionPageSize;
        setTransactionRecords([...shopTransactions].slice(from, to));
    }, [transactionPage, transactionPageSize, shopTransactions]);

    useEffect(() => {
        const filteredTransactions = shopTransactions.filter((item) => {
            return (
                item.transaction_id.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                item.description.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                item.payment_method.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                item.status.toLowerCase().includes(transactionSearch.toLowerCase())
            );
        });

        const sortedTransactions = sortBy(filteredTransactions, transactionSortStatus.columnAccessor);
        setTransactionRecords(transactionSortStatus.direction === 'desc' ? sortedTransactions.reverse() : sortedTransactions);
    }, [transactionSearch, transactionSortStatus, shopTransactions]);

    // Handle sending payment
    const handleSendPayment = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            setAlert({ visible: true, message: 'Please enter a valid payment amount', type: 'danger' });
            return;
        }

        setSendingPayment(true);

        try {
            // Simulate API call delay
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const newTransaction: ShopTransaction = {
                id: shopTransactions.length + 1,
                transaction_id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
                amount: parseFloat(paymentAmount),
                date: new Date().toISOString(),
                status: 'pending',
                description: paymentDescription || 'Admin payment',
                payment_method: 'Bank Transfer',
            };

            const updatedTransactions = [newTransaction, ...shopTransactions];
            setShopTransactions(updatedTransactions);
            setTransactionRecords(updatedTransactions);

            // Update platform balance
            setPlatformBalance((prev) => prev - parseFloat(paymentAmount));

            setAlert({ visible: true, message: 'Payment sent successfully!', type: 'success' });
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentDescription('');
        } catch (error) {
            setAlert({ visible: true, message: 'Failed to send payment', type: 'danger' });
        } finally {
            setSendingPayment(false);
        }
    };

    // Handle send all balance
    const handleSendAllBalance = () => {
        setPaymentAmount(platformBalance.toString());
        setPaymentDescription('Complete balance payout');
    };

    const defaultWorkHours: WorkHours[] = [
        { day: 'Monday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Tuesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Wednesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Thursday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Friday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Saturday', open: false, startTime: '09:00', endTime: '18:00' },
        { day: 'Sunday', open: false, startTime: '09:00', endTime: '18:00' },
    ];

    const workHours = shop?.work_hours || defaultWorkHours;
    const phoneNumbers = shop?.phone_numbers || [''];
    const gallery = shop?.gallery || [];

    // Table pagination effects
    useEffect(() => {
        if (activeTab === 'revenue') {
            setPage(1);
        }
    }, [pageSize, activeTab]);

    useEffect(() => {
        if (activeTab === 'revenue') {
            const from = (page - 1) * pageSize;
            const to = from + pageSize;
            setRecords([...initialRecords.slice(from, to)]);
        }
    }, [page, pageSize, initialRecords, activeTab]);

    // Search effect for shop sales
    useEffect(() => {
        if (activeTab === 'revenue' && shopSales.length > 0) {
            const filtered = shopSales.filter((item) => {
                return (
                    item.product_name.toLowerCase().includes(search.toLowerCase()) ||
                    item.order_id.toLowerCase().includes(search.toLowerCase()) ||
                    item.status.toLowerCase().includes(search.toLowerCase())
                );
            });
            setInitialRecords(filtered);
            calculateRevenueSummary(filtered);
        }
    }, [search, shopSales, activeTab]);

    // Sort effect for shop sales
    useEffect(() => {
        if (activeTab === 'revenue' && initialRecords.length > 0) {
            const data = sortBy(initialRecords, sortStatus.columnAccessor as keyof ShopSale);
            setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
            setPage(1);
        }
    }, [sortStatus, activeTab]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (unauthorized) {
        return (
            <div className="container mx-auto p-6">
                <div className="panel">
                    <div className="flex flex-col items-center justify-center p-6">
                        <div className="text-danger mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Unauthorized Access</h2>
                        <p className="text-gray-500 mb-4">You do not have permission to view this shop.</p>
                        <button onClick={() => router.push('/shops')} className="btn btn-primary">
                            Return to Shops
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!shop) {
        return <div className="text-center p-6">Shop not found.</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
                {' '}
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <span>{shop.shop_name}</span>
                </li>
            </ul>
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}
            {/* Shop Header with Cover Image */}
            <div className="mb-6 rounded-md overflow-hidden">
                <div className="relative h-64 w-full">
                    <img src={shop.cover_image_url || '/assets/images/img-placeholder-fallback.webp'} alt={`${shop.shop_name} Cover`} className="h-full w-full object-cover" />
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-6">
                        <div className="flex items-center">
                            <div className="h-24 w-24 rounded-lg border-4 border-white overflow-hidden bg-white mr-4">
                                <img src={shop.logo_url || '/assets/images/shop-placeholder.jpg'} alt={shop.shop_name} className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{shop.shop_name}</h1>
                                <div className="flex gap-2 mt-1">
                                    <span className={`badge badge-outline-${shop.public ? 'success' : 'danger'}`}>{shop.public ? 'Public' : 'Private'}</span>
                                    <span className={`badge badge-outline-${shop.status === 'Pending' ? 'warning' : shop.status === 'Approved' ? 'success' : 'danger'}`}>
                                        {shop.status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Tabs Navigation */}
            <div className="mb-5">
                <div className="flex border-b border-[#ebedf2] dark:border-[#191e3a]">
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'owner' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('owner')}
                    >
                        <div className="flex items-center gap-2">
                            <IconUser className="h-5 w-5" />
                            Owner Information
                        </div>
                    </button>{' '}
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        <div className="flex items-center gap-2">
                            <IconMapPin className="h-5 w-5" />
                            Shop Details
                        </div>
                    </button>{' '}
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'revenue' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('revenue')}
                    >
                        <div className="flex items-center gap-2">
                            <IconCash className="h-5 w-5" />
                            {t('shop_revenue')}
                        </div>
                    </button>
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'transactions' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('transactions')}
                    >
                        <div className="flex items-center gap-2">
                            <IconCreditCard className="h-5 w-5" />
                            {t('shop_transactions')}
                        </div>
                    </button>
                </div>
            </div>{' '}
            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeTab === 'revenue' && (
                    <div className="lg:col-span-3">
                        {/* Shop Revenue Content */}
                        <div className="panel mb-5">
                            <div className="flex flex-wrap justify-between items-center mb-5">
                                <h5 className="text-lg font-semibold dark:text-white-light">{t('shop_revenue_summary')}</h5>

                                {/* Time Filter */}
                                <div className="flex items-center">
                                    <div className="flex bg-white dark:bg-black border border-[#e0e6ed] dark:border-[#1b2e4b] rounded-md overflow-hidden">
                                        <button
                                            type="button"
                                            className={`px-4 py-2 text-sm ${timeFilter === 'weekly' ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                            onClick={() => setTimeFilter('weekly')}
                                        >
                                            {t('weekly')}
                                        </button>
                                        <button
                                            type="button"
                                            className={`px-4 py-2 text-sm ${timeFilter === 'monthly' ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                            onClick={() => setTimeFilter('monthly')}
                                        >
                                            {t('monthly')}
                                        </button>
                                        <button
                                            type="button"
                                            className={`px-4 py-2 text-sm ${timeFilter === 'yearly' ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                            onClick={() => setTimeFilter('yearly')}
                                        >
                                            {t('this_year')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
                                {/* Total Revenue Card */}
                                <div className="panel bg-primary/10 !border-0 border-l-4 !border-l-primary">
                                    <div className="flex items-center">
                                        <div className="flex-none">
                                            <div className="rounded-md bg-primary/20 p-3">
                                                <IconCash className="h-6 w-6 text-primary" />
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <h5 className="text-lg font-semibold">{t('total_revenue')}</h5>
                                            <p className="text-xl mt-1">{formatCurrency(shopRevenueSummary.totalRevenue)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Commission Rate Card */}
                                <div className="panel bg-success/10 !border-0 border-l-4 !border-l-success">
                                    <div className="flex items-center">
                                        <div className="flex-none">
                                            <div className="rounded-md bg-success/20 p-3">
                                                <IconCash className="h-6 w-6 text-success" />
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <h5 className="text-lg font-semibold">{t('commission_rate')}</h5>
                                            <p className="text-xl mt-1">{shopRevenueSummary.commissionRate}%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Total Commission Card */}
                                <div className="panel bg-warning/10 !border-0 border-l-4 !border-l-warning">
                                    <div className="flex items-center">
                                        <div className="flex-none">
                                            <div className="rounded-md bg-warning/20 p-3">
                                                <IconCash className="h-6 w-6 text-warning" />
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <h5 className="text-lg font-semibold">{t('commission_amount')}</h5>
                                            <p className="text-xl mt-1">{formatCurrency(shopRevenueSummary.totalCommission)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Revenue Card */}
                                <div className="panel bg-info/10 !border-0 border-l-4 !border-l-info">
                                    <div className="flex items-center">
                                        <div className="flex-none">
                                            <div className="rounded-md bg-info/20 p-3">
                                                <IconCash className="h-6 w-6 text-info" />
                                            </div>
                                        </div>
                                        <div className="ml-4">
                                            <h5 className="text-lg font-semibold">{t('net_revenue')}</h5>
                                            <p className="text-xl mt-1">{formatCurrency(shopRevenueSummary.netRevenue)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shop Sales Table */}
                        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
                            <div className="invoice-table">
                                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('sales_history')}</h5>
                                    <div className="ltr:ml-auto rtl:mr-auto">
                                        <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                                    </div>
                                </div>
                                <div className="datatables pagination-padding relative">
                                    <DataTable
                                        className="table-hover whitespace-nowrap"
                                        records={records}
                                        columns={[
                                            {
                                                accessor: 'order_id',
                                                title: t('order_id'),
                                                sortable: true,
                                                render: ({ order_id }) => <span className="font-semibold text-primary">{order_id}</span>,
                                            },
                                            {
                                                accessor: 'product_name',
                                                title: t('product'),
                                                sortable: true,
                                            },
                                            {
                                                accessor: 'quantity',
                                                title: t('qty'),
                                                sortable: true,
                                            },
                                            {
                                                accessor: 'price',
                                                title: t('price'),
                                                sortable: true,
                                                render: ({ price }) => formatCurrency(price),
                                            },
                                            {
                                                accessor: 'total',
                                                title: t('total'),
                                                sortable: true,
                                                render: ({ total }) => formatCurrency(total),
                                            },
                                            {
                                                accessor: 'commission',
                                                title: t('commission'),
                                                sortable: true,
                                                render: ({ commission }) => formatCurrency(commission),
                                            },
                                            {
                                                accessor: 'date',
                                                title: t('date'),
                                                sortable: true,
                                                render: ({ date }) => formatDate(date),
                                            },
                                            {
                                                accessor: 'status',
                                                title: t('status'),
                                                sortable: true,
                                                render: ({ status }) => (
                                                    <span
                                                        className={`badge ${
                                                            status === 'Completed'
                                                                ? 'bg-success'
                                                                : status === 'Processing'
                                                                  ? 'bg-info'
                                                                  : status === 'Shipped'
                                                                    ? 'bg-warning'
                                                                    : status === 'Delivered'
                                                                      ? 'bg-primary'
                                                                      : 'bg-danger'
                                                        }`}
                                                    >
                                                        {status}
                                                    </span>
                                                ),
                                            },
                                        ]}
                                        totalRecords={initialRecords.length}
                                        recordsPerPage={pageSize}
                                        page={page}
                                        onPageChange={setPage}
                                        recordsPerPageOptions={PAGE_SIZES}
                                        onRecordsPerPageChange={setPageSize}
                                        sortStatus={sortStatus}
                                        onSortStatusChange={setSortStatus}
                                        paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'owner' && (
                    <>
                        {/* Owner Information */}
                        <div className="lg:col-span-1">
                            <div className="panel h-full">
                                <div className="mb-5 flex flex-col items-center text-center">
                                    <div className="mb-5 h-32 w-32 overflow-hidden rounded-full">
                                        <img src={shop.profiles?.avatar_url || '/assets/images/user-placeholder.webp'} alt={shop.profiles?.full_name} className="h-full w-full object-cover" />
                                    </div>
                                    <h5 className="text-xl font-bold text-primary">{shop.profiles?.full_name || 'N/A'}</h5>
                                    <p className="text-gray-500 dark:text-gray-400">Shop Owner</p>
                                </div>
                                <div className="space-y-4 border-t border-[#ebedf2] pt-5 dark:border-[#191e3a]">
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-white-light">
                                            <IconMail className="h-5 w-5" />
                                        </span>
                                        <div className="ltr:ml-3 rtl:mr-3">
                                            <h5 className="text-sm font-semibold dark:text-white-light">Email</h5>
                                            <p className="text-gray-500 dark:text-gray-400">{shop.profiles?.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-success-light text-success dark:bg-success dark:text-white-light">
                                            <IconPhone className="h-5 w-5" />
                                        </span>
                                        <div className="ltr:ml-3 rtl:mr-3">
                                            <h5 className="text-sm font-semibold dark:text-white-light">Phone</h5>
                                            <p className="text-gray-500 dark:text-gray-400">{shop.profiles?.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-warning-light text-warning dark:bg-warning dark:text-white-light">
                                            <IconCalendar className="h-5 w-5" />
                                        </span>
                                        <div className="ltr:ml-3 rtl:mr-3">
                                            <h5 className="text-sm font-semibold dark:text-white-light">Registration Date</h5>
                                            <p className="text-gray-500 dark:text-gray-400">{shop.created_at ? new Date(shop.created_at).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shop Summary */}
                        <div className="lg:col-span-2">
                            <div className="panel h-full">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">Shop Summary</h5>
                                    <p className="mt-2 text-gray-500 dark:text-gray-400">{shop.shop_desc || 'No description available.'}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mt-8">
                                    <div>
                                        <h6 className="text-sm font-semibold mb-2">Category</h6>
                                        <span className="badge bg-primary text-white">{shop.categories?.title || 'Uncategorized'}</span>
                                    </div>
                                    <div>
                                        <h6 className="text-sm font-semibold mb-2">Visibility</h6>
                                        <span className={`badge ${shop.public ? 'bg-success' : 'bg-danger'} text-white`}>{shop.public ? 'Public' : 'Private'}</span>
                                    </div>
                                    {shop.address && (
                                        <div className="sm:col-span-2">
                                            <h6 className="text-sm font-semibold mb-2">Address</h6>
                                            <div className="flex">
                                                <span className="mt-1 ltr:mr-2 rtl:ml-2 text-primary">
                                                    <IconMapPin className="h-5 w-5" />
                                                </span>
                                                <p className="text-gray-500 dark:text-gray-400">{shop.address}</p>
                                            </div>
                                        </div>
                                    )}
                                    {phoneNumbers && phoneNumbers.length > 0 && phoneNumbers[0] && (
                                        <div className="sm:col-span-2">
                                            <h6 className="text-sm font-semibold mb-2">Contact Numbers</h6>
                                            <div className="space-y-2">
                                                {phoneNumbers.map(
                                                    (phone, index) =>
                                                        phone && (
                                                            <div key={index} className="flex">
                                                                <span className="mt-1 ltr:mr-2 rtl:ml-2 text-success">
                                                                    <IconPhone className="h-5 w-5" />
                                                                </span>
                                                                <p className="text-gray-500 dark:text-gray-400">{phone}</p>
                                                            </div>
                                                        ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'details' && (
                    <>
                        {/* Shop Details */}
                        <div className="lg:col-span-2">
                            <div className="panel h-full">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">Shop Details</h5>
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    {' '}
                                    {/* Address */}
                                    <div>
                                        <h6 className="text-sm font-semibold mb-3">Address</h6>
                                        <div className="flex">
                                            <span className="mt-1 ltr:mr-2 rtl:ml-2 text-primary">
                                                <IconMapPin className="h-5 w-5" />
                                            </span>
                                            <p className="text-gray-500 dark:text-gray-400">{shop.address || 'No address provided'}</p>
                                        </div>
                                    </div>
                                    {/* Map Location */}
                                    {shop.latitude && shop.longitude && (
                                        <div>
                                            <h6 className="text-sm font-semibold mb-3">Shop Location</h6>
                                            <div className="h-[400px] rounded-md overflow-hidden">
                                                <InteractiveMap position={[shop.latitude, shop.longitude]} height="400px" shopName={shop.shop_name} shopAddress={shop.address} />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Coordinates: {shop.latitude.toFixed(6)}, {shop.longitude.toFixed(6)}
                                            </p>
                                        </div>
                                    )}
                                    {/* Contact Numbers */}
                                    <div>
                                        <h6 className="text-sm font-semibold mb-3">Contact Numbers</h6>
                                        <div className="space-y-2">
                                            {phoneNumbers && phoneNumbers.length > 0 && phoneNumbers[0] ? (
                                                phoneNumbers.map(
                                                    (phone, index) =>
                                                        phone && (
                                                            <div key={index} className="flex">
                                                                <span className="mt-1 ltr:mr-2 rtl:ml-2 text-success">
                                                                    <IconPhone className="h-5 w-5" />
                                                                </span>
                                                                <p className="text-gray-500 dark:text-gray-400">{phone}</p>
                                                            </div>
                                                        ),
                                                )
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">No contact numbers available</p>
                                            )}
                                        </div>
                                    </div>
                                    {/* Category */}
                                    <div>
                                        <h6 className="text-sm font-semibold mb-3">Category</h6>
                                        <div className="flex">
                                            <span className="badge bg-primary text-white">{shop.categories?.title || 'Uncategorized'}</span>
                                            {shop.categories?.desc && <p className="ml-3 text-gray-500 dark:text-gray-400">{shop.categories.desc}</p>}
                                        </div>
                                    </div>
                                    {/* Working Hours */}
                                    <div>
                                        <h6 className="text-sm font-semibold mb-3">Working Hours</h6>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {workHours.map((day) => (
                                                    <div key={day.day} className={`p-3 rounded-md border ${day.open ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10'}`}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h6 className="font-semibold">{day.day}</h6>
                                                            <span className={`badge ${day.open ? 'bg-success' : 'bg-danger'} text-white text-xs`}>{day.open ? 'Open' : 'Closed'}</span>
                                                        </div>
                                                        {day.open && (
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {day.startTime} - {day.endTime}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Gallery */}
                                    {gallery && gallery.length > 0 && (
                                        <div>
                                            <h6 className="text-sm font-semibold mb-3">Shop Gallery</h6>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {gallery.map((image, index) => (
                                                    <div key={index} className="aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                                                        <img src={image} alt={`Shop Gallery Image ${index + 1}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Shop Stats */}
                        <div className="lg:col-span-1">
                            <div className="panel h-full">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">Shop Stats</h5>
                                </div>

                                <div className="space-y-6">
                                    {/* Products Count */}
                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light flex items-center justify-center">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path
                                                        d="M6.17071 16.7071C5.41775 16.7071 4.80103 16.0904 4.80103 15.3374C4.80103 14.5845 5.41775 13.9678 6.17071 13.9678C6.92366 13.9678 7.54038 14.5845 7.54038 15.3374C7.54038 16.0904 6.92366 16.7071 6.17071 16.7071Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path
                                                        d="M6.17071 10.0322C5.41775 10.0322 4.80103 9.41543 4.80103 8.66248C4.80103 7.90953 5.41775 7.29281 6.17071 7.29281C6.92366 7.29281 7.54038 7.90953 7.54038 8.66248C7.54038 9.41543 6.92366 10.0322 6.17071 10.0322Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path opacity="0.5" d="M9 5H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path opacity="0.5" d="M9 9H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path opacity="0.5" d="M9 15H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path opacity="0.5" d="M9 19H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path
                                                        d="M6.17071 19.4465C5.41775 19.4465 4.80103 18.8297 4.80103 18.0768C4.80103 17.3238 5.41775 16.7071 6.17071 16.7071C6.92366 16.7071 7.54038 17.3238 7.54038 18.0768C7.54038 18.8297 6.92366 19.4465 6.17071 19.4465Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path
                                                        d="M6.17071 6.70712C5.41775 6.70712 4.80103 6.0904 4.80103 5.33745C4.80103 4.5845 5.41775 3.96777 6.17071 3.96777C6.92366 3.96777 7.54038 4.5845 7.54038 5.33745C7.54038 6.0904 6.92366 6.70712 6.17071 6.70712Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                </svg>
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">Products</h6>
                                        </div>{' '}
                                        <div className="flex items-center justify-between">
                                            <p className="text-3xl font-bold dark:text-white-light">{productsCount}</p>
                                            {newProductsCount > 0 && <span className="badge bg-success/20 text-success dark:bg-success dark:text-white-light">+{newProductsCount} New</span>}
                                        </div>
                                    </div>

                                    {/* Orders Count */}
                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-warning-light dark:bg-warning text-warning dark:text-warning-light flex items-center justify-center">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                                                    <path
                                                        d="M2 3L2.26491 3.0883C3.58495 3.52832 4.24497 3.74832 4.62248 4.2721C5 4.79587 5 5.49159 5 6.88304V9.5C5 12.3284 5 13.7426 5.87868 14.6213C6.75736 15.5 8.17157 15.5 11 15.5H19"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                    />
                                                    <path
                                                        opacity="0.5"
                                                        d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path
                                                        opacity="0.5"
                                                        d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path opacity="0.5" d="M11 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path
                                                        d="M5 6H16.4504C18.5054 6 19.5328 6 19.9775 6.67426C20.4221 7.34853 20.0173 8.29294 19.2078 10.1818L18.7792 11.1818C18.4013 12.0636 18.2123 12.5045 17.8366 12.7523C17.4609 13 16.9812 13 16.0218 13H5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                </svg>
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">Orders</h6>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-3xl font-bold dark:text-white-light">{ordersCount}</p>
                                            {newOrdersCount > 0 && <span className="badge bg-success/20 text-success dark:bg-success dark:text-white-light">+{newOrdersCount} New</span>}
                                        </div>
                                    </div>

                                    {/* Revenue */}
                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-success-light dark:bg-success text-success dark:text-success-light flex items-center justify-center">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                                                    <path d="M12 6V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path
                                                        d="M15 9.5C15 8.11929 13.6569 7 12 7C10.3431 7 9 8.11929 9 9.5C9 10.8807 10.3431 12 12 12C13.6569 12 15 13.1193 15 14.5C15 15.8807 13.6569 17 12 17C10.3431 17 9 15.8807 9 14.5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                            </div>{' '}
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">Revenue</h6>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-3xl font-bold dark:text-white-light">${shop?.balance ? shop.balance.toFixed(2) : '0.00'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'transactions' && (
                    <div className="lg:col-span-3">
                        {/* Shop Transactions Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            {/* Platform Balance Card */}
                            <div className="lg:col-span-3">
                                <div className="panel bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h5 className="text-lg font-semibold mb-2">{t('shop_balance')}</h5>
                                            <p className="text-3xl font-bold">{formatCurrency(platformBalance)}</p>
                                            <p className="text-blue-100 mt-1">{t('amount_owed_to_shop')}</p>
                                        </div>
                                        <div className="text-right">
                                            <button className="btn btn-primary bg-white text-blue-600 hover:bg-gray-100" onClick={() => setShowPaymentModal(true)}>
                                                {t('send_payment')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Transaction History Table */}
                        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
                            <div className="invoice-table">
                                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                                    <h5 className="text-lg font-semibold dark:text-white-light">{t('transaction_history')}</h5>
                                    <div className="ltr:ml-auto rtl:mr-auto">
                                        <input
                                            type="text"
                                            className="form-input w-auto"
                                            placeholder={t('search_transactions')}
                                            value={transactionSearch}
                                            onChange={(e) => setTransactionSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="datatables pagination-padding relative">
                                    <DataTable
                                        className="table-hover whitespace-nowrap"
                                        records={transactionRecords}
                                        columns={[
                                            {
                                                accessor: 'transaction_id',
                                                title: t('transaction_id'),
                                                sortable: true,
                                                render: ({ transaction_id }) => <div className="font-mono text-sm text-primary">{transaction_id}</div>,
                                            },
                                            {
                                                accessor: 'amount',
                                                title: t('amount'),
                                                sortable: true,
                                                render: ({ amount }) => <div className="font-semibold text-success">+{formatCurrency(amount)}</div>,
                                            },
                                            {
                                                accessor: 'description',
                                                title: t('description'),
                                                sortable: true,
                                            },
                                            {
                                                accessor: 'payment_method',
                                                title: t('payment_method'),
                                                sortable: true,
                                            },
                                            {
                                                accessor: 'date',
                                                title: t('date'),
                                                sortable: true,
                                                render: ({ date }) => formatDate(date),
                                            },
                                            {
                                                accessor: 'status',
                                                title: t('status'),
                                                sortable: true,
                                                render: ({ status }) => (
                                                    <span className={`badge ${status === 'completed' ? 'bg-success' : status === 'pending' ? 'bg-warning' : 'bg-danger'}`}>{t(status)}</span>
                                                ),
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
                                        paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Modal */}
                        {showPaymentModal && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold dark:text-white">{t('send_payment')}</h3>
                                        <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                                            <IconX className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('payment_amount')}</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="form-input w-full"
                                                placeholder="0.00"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('description')}</label>
                                            <input
                                                type="text"
                                                className="form-input w-full"
                                                placeholder={t('payment_description_placeholder')}
                                                value={paymentDescription}
                                                onChange={(e) => setPaymentDescription(e.target.value)}
                                            />
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {t('current_balance')}: <span className="font-semibold">{formatCurrency(platformBalance)}</span>
                                            </p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button type="button" className="btn btn-outline-primary flex-1" onClick={handleSendAllBalance}>
                                                {t('send_all_balance')}
                                            </button>
                                        </div>
                                        <div className="flex gap-3 pt-4 border-t">
                                            <button type="button" className="btn btn-outline-danger flex-1" onClick={() => setShowPaymentModal(false)}>
                                                {t('cancel')}
                                            </button>
                                            <button type="button" className="btn btn-primary flex-1" onClick={handleSendPayment} disabled={sendingPayment}>
                                                {sendingPayment ? t('sending') : t('send_payment')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopPreview;

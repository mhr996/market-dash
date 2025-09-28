'use client';
import React, { useEffect, useState } from 'react';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { sortBy } from 'lodash';
import { getTranslation } from '@/i18n';
import IconCash from '@/components/icon/icon-cash-banknotes';
import IconCreditCard from '@/components/icon/icon-credit-card';
import IconX from '@/components/icon/icon-x';
import IconPlus from '@/components/icon/icon-plus';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import supabase from '@/lib/supabase';

interface ShopTransaction {
    id: number;
    shop_id: number;
    type: 'recharge' | 'withdraw';
    amount: number;
    description: string | null;
    created_at: string;
    created_by: string | null;
}

interface BalanceTabProps {
    shopId: number;
}

const BalanceTab = ({ shopId }: BalanceTabProps) => {
    const { t } = getTranslation();
    const [shopTransactions, setShopTransactions] = useState<ShopTransaction[]>([]);
    const [transactionRecords, setTransactionRecords] = useState<ShopTransaction[]>([]);
    const [transactionSearch, setTransactionSearch] = useState('');
    const [transactionPage, setTransactionPage] = useState(1);
    const [transactionPageSize, setTransactionPageSize] = useState(10);
    const [transactionSortStatus, setTransactionSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'date',
        direction: 'desc',
    });
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [sendingPayment, setSendingPayment] = useState(false);
    const [platformBalance, setPlatformBalance] = useState(0);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    const PAGE_SIZES = [10, 20, 30, 50];

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

    // Fetch shop balance from database
    const fetchShopBalance = async () => {
        try {
            console.log('Fetching balance for shop:', shopId);
            const { data, error } = await supabase.rpc('calculate_shop_balance', {
                shop_id_param: shopId,
            });
            console.log('Balance response:', { data, error });
            if (error) throw error;
            setPlatformBalance(data || 0);
        } catch (error) {
            console.error('Error fetching shop balance:', error);
            setAlert({ visible: true, message: `Error fetching balance: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'danger' });
        }
    };

    // Fetch shop transactions
    const fetchShopTransactions = async () => {
        try {
            console.log('Fetching transactions for shop:', shopId);
            const { data, error } = await supabase.from('shop_transactions').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });
            console.log('Transactions response:', { data, error });
            if (error) throw error;
            setShopTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setAlert({ visible: true, message: `Error fetching transactions: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'danger' });
        }
    };

    // Handle shop transaction data
    useEffect(() => {
        fetchShopBalance();
        fetchShopTransactions();
    }, [shopId]);

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
                item.id.toString().includes(transactionSearch.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(transactionSearch.toLowerCase())) ||
                item.type.toLowerCase().includes(transactionSearch.toLowerCase())
            );
        });

        const sortedTransactions = sortBy(filteredTransactions, transactionSortStatus.columnAccessor);
        setTransactionRecords(transactionSortStatus.direction === 'desc' ? sortedTransactions.reverse() : sortedTransactions);
    }, [transactionSearch, transactionSortStatus, shopTransactions]);

    // Handle recharge transaction
    const handleRecharge = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            setAlert({ visible: true, message: 'Please enter a valid amount', type: 'danger' });
            return;
        }

        setSendingPayment(true);

        try {
            const { data, error } = await supabase.rpc('add_shop_transaction', {
                shop_id_param: shopId,
                type_param: 'recharge',
                amount_param: parseFloat(paymentAmount),
                description_param: paymentDescription || 'Recharge transaction',
            });

            if (error) throw error;

            setAlert({ visible: true, message: 'Recharge successful!', type: 'success' });
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentDescription('');

            // Refresh data
            fetchShopBalance();
            fetchShopTransactions();
        } catch (error) {
            setAlert({ visible: true, message: 'Failed to recharge', type: 'danger' });
        } finally {
            setSendingPayment(false);
        }
    };

    // Handle withdraw transaction
    const handleWithdraw = async () => {
        if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
            setAlert({ visible: true, message: 'Please enter a valid amount', type: 'danger' });
            return;
        }

        if (parseFloat(paymentAmount) > platformBalance) {
            setAlert({ visible: true, message: 'Insufficient balance', type: 'danger' });
            return;
        }

        setSendingPayment(true);

        try {
            const { data, error } = await supabase.rpc('add_shop_transaction', {
                shop_id_param: shopId,
                type_param: 'withdraw',
                amount_param: parseFloat(paymentAmount),
                description_param: paymentDescription || 'Withdraw transaction',
            });

            if (error) throw error;

            setAlert({ visible: true, message: 'Withdraw successful!', type: 'success' });
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentDescription('');

            // Refresh data
            fetchShopBalance();
            fetchShopTransactions();
        } catch (error) {
            setAlert({ visible: true, message: 'Failed to withdraw', type: 'danger' });
        } finally {
            setSendingPayment(false);
        }
    };

    // Handle send all balance (frontend-only)
    const handleSendAllBalance = () => {
        setPaymentAmount(Math.abs(platformBalance).toString());
        setPaymentDescription('Complete balance payout');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Balance & Transactions</h3>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Platform Balance Card */}
            <div className="panel w-full max-w-none">
                <div
                    className={`panel text-white w-full max-w-none ${
                        platformBalance > 0
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : platformBalance < 0
                              ? 'bg-gradient-to-r from-red-500 to-red-600'
                              : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h5 className="text-lg font-semibold mb-2">{t('shop_balance')}</h5>
                            <p className={`text-3xl font-bold ${platformBalance > 0 ? 'text-green-100' : platformBalance < 0 ? 'text-red-100' : 'text-blue-100'}`}>{formatCurrency(platformBalance)}</p>
                            <p className={`mt-1 ${platformBalance > 0 ? 'text-green-100' : platformBalance < 0 ? 'text-red-100' : 'text-blue-100'}`}>
                                {platformBalance >= 0 ? t('amount_owed_to_shop') : 'Amount shop owes to platform'}
                            </p>
                            <p className="text-xs text-gray-300 mt-2">(Frontend-only balance - resets on page refresh)</p>
                        </div>
                        <div className="text-right">
                            <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
                                Manage Balance
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction History Table */}
            <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <h5 className="text-lg font-semibold dark:text-white-light">{t('transaction_history')}</h5>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder={t('search_transactions')} value={transactionSearch} onChange={(e) => setTransactionSearch(e.target.value)} />
                    </div>
                </div>
                <div className="datatables pagination-padding relative">
                    <DataTable
                        className="table-hover whitespace-nowrap"
                        records={transactionRecords}
                        columns={[
                            {
                                accessor: 'id',
                                title: 'ID',
                                sortable: true,
                                render: ({ id }) => <div className="font-mono text-sm text-primary">#{id}</div>,
                            },
                            {
                                accessor: 'type',
                                title: 'Type',
                                sortable: true,
                                render: ({ type }) => <span className={`badge ${type === 'recharge' ? 'bg-success' : 'bg-danger'}`}>{type.toUpperCase()}</span>,
                            },
                            {
                                accessor: 'amount',
                                title: 'Amount',
                                sortable: true,
                                render: ({ amount, type }) => (
                                    <div className={`font-semibold ${type === 'recharge' ? 'text-success' : 'text-danger'}`}>
                                        {type === 'recharge' ? '+' : '-'}
                                        {formatCurrency(amount)}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'description',
                                title: 'Description',
                                sortable: true,
                                render: ({ description }) => <span>{description || 'No description'}</span>,
                            },
                            {
                                accessor: 'created_at',
                                title: 'Date',
                                sortable: true,
                                render: ({ created_at }) => formatDate(created_at),
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

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold dark:text-white">Balance Management</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('payment_amount')}</label>
                                <input type="number" step="0.01" min="0" className="form-input w-full" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
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
                                    {t('current_balance')}:{' '}
                                    <span className={`font-semibold ${platformBalance > 0 ? 'text-green-600' : platformBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                        {formatCurrency(platformBalance)}
                                    </span>
                                </p>
                            </div>
                            <div className="flex gap-3 pt-4 border-t">
                                <button type="button" className="btn btn-outline-danger flex-1" onClick={() => setShowPaymentModal(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-success flex-1" onClick={handleRecharge} disabled={sendingPayment}>
                                    {sendingPayment ? 'Processing...' : 'Recharge'}
                                </button>
                                <button type="button" className="btn btn-danger flex-1" onClick={handleWithdraw} disabled={sendingPayment}>
                                    {sendingPayment ? 'Processing...' : 'Withdraw'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BalanceTab;

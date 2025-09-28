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

interface DeliveryTransaction {
    id: number;
    transaction_id: string;
    amount: number;
    date: string;
    status: 'pending' | 'completed' | 'failed';
    description: string;
    payment_method: string;
}

interface BalanceTabProps {
    companyId: number;
}

const BalanceTab = ({ companyId }: BalanceTabProps) => {
    const { t } = getTranslation();
    const [deliveryTransactions, setDeliveryTransactions] = useState<DeliveryTransaction[]>([]);
    const [transactionRecords, setTransactionRecords] = useState<DeliveryTransaction[]>([]);
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
    const [platformBalance, setPlatformBalance] = useState(0); // Frontend-only balance (always 0)
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

    // Frontend-only balance (no backend calculation)
    const fetchDeliveryBalance = async () => {
        // Balance is always 0 for frontend-only implementation
        setPlatformBalance(0);
    };

    // Handle delivery transaction data
    useEffect(() => {
        fetchDeliveryBalance();

        // Keep transaction table empty for now
        const basicTransactions: DeliveryTransaction[] = [];
        setDeliveryTransactions(basicTransactions);
        setTransactionRecords(basicTransactions);
    }, [companyId]);

    // Transaction search and pagination
    useEffect(() => {
        setTransactionPage(1);
    }, [transactionPageSize]);

    useEffect(() => {
        const from = (transactionPage - 1) * transactionPageSize;
        const to = from + transactionPageSize;
        setTransactionRecords([...deliveryTransactions].slice(from, to));
    }, [transactionPage, transactionPageSize, deliveryTransactions]);

    useEffect(() => {
        const filteredTransactions = deliveryTransactions.filter((item) => {
            return (
                item.transaction_id.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                item.description.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                item.payment_method.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                item.status.toLowerCase().includes(transactionSearch.toLowerCase())
            );
        });

        const sortedTransactions = sortBy(filteredTransactions, transactionSortStatus.columnAccessor);
        setTransactionRecords(transactionSortStatus.direction === 'desc' ? sortedTransactions.reverse() : sortedTransactions);
    }, [transactionSearch, transactionSortStatus, deliveryTransactions]);

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

            const newTransaction: DeliveryTransaction = {
                id: deliveryTransactions.length + 1,
                transaction_id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
                amount: parseFloat(paymentAmount),
                date: new Date().toISOString(),
                status: 'completed', // Mark as completed for prototype
                description: paymentDescription || 'Admin payment',
                payment_method: 'Bank Transfer',
            };

            const updatedTransactions = [newTransaction, ...deliveryTransactions];
            setDeliveryTransactions(updatedTransactions);
            setTransactionRecords(updatedTransactions);

            // Frontend-only balance update (for UI demonstration)
            setPlatformBalance((prev) => prev + parseFloat(paymentAmount));

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
                            <h5 className="text-lg font-semibold mb-2">{t('delivery_balance')}</h5>
                            <p className={`text-3xl font-bold ${platformBalance > 0 ? 'text-green-100' : platformBalance < 0 ? 'text-red-100' : 'text-blue-100'}`}>{formatCurrency(platformBalance)}</p>
                            <p className={`mt-1 ${platformBalance > 0 ? 'text-green-100' : platformBalance < 0 ? 'text-red-100' : 'text-blue-100'}`}>
                                {platformBalance >= 0 ? t('amount_owed_to_delivery') : 'Amount delivery company owes to platform'}
                            </p>
                            <p className="text-xs text-gray-300 mt-2">(Frontend-only balance - resets on page refresh)</p>
                        </div>
                        <div className="text-right">
                            <button
                                className={`btn bg-white hover:bg-gray-100 ${platformBalance > 0 ? 'text-green-600' : platformBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}
                                onClick={() => setShowPaymentModal(true)}
                            >
                                {t('send_payment')}
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
                                render: ({ status }) => <span className={`badge ${status === 'completed' ? 'bg-success' : status === 'pending' ? 'bg-warning' : 'bg-danger'}`}>{t(status)}</span>,
                            },
                        ]}
                        totalRecords={deliveryTransactions.length}
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
                            <h3 className="text-lg font-semibold dark:text-white">{t('send_payment')}</h3>
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
    );
};

export default BalanceTab;

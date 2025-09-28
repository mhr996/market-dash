'use client';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';

// Transaction interface for accounting statements
interface Transaction {
    id: number;
    entity_type: 'shop' | 'delivery';
    entity_id: number;
    entity_name: string;
    type: 'recharge' | 'withdraw';
    amount: number;
    description: string | null;
    created_at: string;
    created_by: string | null;
}

const StatementsList = () => {
    const [items, setItems] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Transaction[]>([]);
    const [records, setRecords] = useState<Transaction[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // State for confirm modal and alert
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                setLoading(true);

                // Fetch shop transactions (if table exists)
                let shopTransactions = [];
                try {
                    const { data, error } = await supabase
                        .from('shop_transactions')
                        .select(
                            `
                            *,
                            shops!shop_transactions_shop_id_fkey(shop_name)
                        `,
                        )
                        .order('created_at', { ascending: false });

                    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = table doesn't exist
                    shopTransactions = data || [];
                } catch (error) {
                    console.log('Shop transactions table not found, skipping...');
                }

                // Fetch delivery transactions (if table exists)
                let deliveryTransactions = [];
                try {
                    const { data, error } = await supabase
                        .from('delivery_transactions')
                        .select(
                            `
                            *,
                            delivery_companies!delivery_transactions_delivery_company_id_fkey(company_name)
                        `,
                        )
                        .order('created_at', { ascending: false });

                    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = table doesn't exist
                    deliveryTransactions = data || [];
                } catch (error) {
                    console.log('Delivery transactions table not found, skipping...');
                }

                // Combine and format transactions
                const allTransactions: Transaction[] = [
                    ...shopTransactions.map((t) => ({
                        id: t.id,
                        entity_type: 'shop' as const,
                        entity_id: t.shop_id,
                        entity_name: t.shops?.shop_name || 'Unknown Shop',
                        type: t.type,
                        amount: t.amount,
                        description: t.description,
                        created_at: t.created_at,
                        created_by: t.created_by,
                    })),
                    ...deliveryTransactions.map((t) => ({
                        id: t.id,
                        entity_type: 'delivery' as const,
                        entity_id: t.delivery_company_id,
                        entity_name: t.delivery_companies?.company_name || 'Unknown Company',
                        type: t.type,
                        amount: t.amount,
                        description: t.description,
                        created_at: t.created_at,
                        created_by: t.created_by,
                    })),
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setItems(allTransactions);
            } catch (error) {
                console.error('Error fetching transactions:', error);
                setAlert({ visible: true, message: 'Error fetching transactions', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchTransactions();
    }, []);

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
            items.filter((item) => {
                const searchTerm = search.toLowerCase();
                return (
                    item.entity_name.toLowerCase().includes(searchTerm) ||
                    (item.description && item.description.toLowerCase().includes(searchTerm)) ||
                    item.type.toLowerCase().includes(searchTerm) ||
                    item.entity_type.toLowerCase().includes(searchTerm)
                );
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof Transaction);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: number | null = null) => {
        if (id) {
            const transaction = items.find((s) => s.id === id);
            if (transaction) {
                setTransactionToDelete(transaction);
                setShowConfirmModal(true);
            }
        }
    };

    // Confirm deletion callback
    const confirmDeletion = async () => {
        if (!transactionToDelete || !transactionToDelete.id) return;
        try {
            const updatedItems = items.filter((s) => s.id !== transactionToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: 'Transaction deleted successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting transaction', type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setTransactionToDelete(null);
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'income':
                return <span className="badge bg-success text-white">Income</span>;
            case 'expense':
                return <span className="badge bg-danger text-white">Expense</span>;
            default:
                return <span className="badge bg-secondary text-white">{type}</span>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published':
                return <span className="badge bg-success text-white">Published</span>;
            case 'draft':
                return <span className="badge bg-warning text-white">Draft</span>;
            case 'archived':
                return <span className="badge bg-secondary text-white">Archived</span>;
            default:
                return <span className="badge bg-secondary text-white">{status}</span>;
        }
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
            {/* Alert */}
            {alert.visible && (
                <div className="mb-4 ml-4 max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? 'Success' : 'Error'}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}
            <div className="invoice-table w-full max-w-none">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-danger gap-2">
                            <IconTrashLines />
                            Delete
                        </button>
                        <Link href="/accounting/statements/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            Add New
                        </Link>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="datatables pagination-padding relative w-full max-w-none">
                    <DataTable
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap cursor-pointer'}`}
                        records={records}
                        onRowClick={(record) => {
                            router.push(`/accounting/statements/preview/${record.id}`);
                        }}
                        columns={[
                            {
                                accessor: 'id',
                                title: 'ID',
                                sortable: true,
                                render: ({ id }) => <strong className="text-info">#{id}</strong>,
                            },
                            {
                                accessor: 'entity_type',
                                title: 'Entity Type',
                                sortable: true,
                                render: ({ entity_type }) => <span className={`badge ${entity_type === 'shop' ? 'bg-primary' : 'bg-info'} text-white`}>{entity_type.toUpperCase()}</span>,
                            },
                            {
                                accessor: 'entity_name',
                                title: 'Entity Name',
                                sortable: true,
                            },
                            {
                                accessor: 'type',
                                title: 'Transaction Type',
                                sortable: true,
                                render: ({ type }) => <span className={`badge ${type === 'recharge' ? 'bg-success' : 'bg-danger'} text-white`}>{type.toUpperCase()}</span>,
                            },
                            {
                                accessor: 'amount',
                                title: 'Amount',
                                sortable: true,
                                render: ({ amount, type }) => (
                                    <span className={`font-semibold ${type === 'recharge' ? 'text-success' : 'text-danger'}`}>
                                        {type === 'recharge' ? '+' : '-'}${amount.toFixed(2)}
                                    </span>
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
                                render: ({ created_at }) => (created_at ? <span>{new Date(created_at).toLocaleDateString()}</span> : ''),
                            },
                        ]}
                        highlightOnHover
                        totalRecords={initialRecords.length}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={(p) => setPage(p)}
                        recordsPerPageOptions={PAGE_SIZES}
                        onRecordsPerPageChange={setPageSize}
                        sortStatus={sortStatus}
                        onSortStatusChange={setSortStatus}
                        selectedRecords={selectedRecords}
                        onSelectedRecordsChange={setSelectedRecords}
                        paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} entries`}
                        minHeight={300}
                    />

                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                </div>
            </div>

            {/* Confirm Deletion Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                title="Confirm Deletion"
                message="Are you sure you want to delete this statement?"
                onCancel={() => {
                    setShowConfirmModal(false);
                    setTransactionToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                size="sm"
            />
        </div>
    );
};

export default StatementsList;

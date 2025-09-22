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

// Statement interface
interface Statement {
    id: number;
    title: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    status: 'draft' | 'published' | 'archived';
    created_at: string;
    due_date?: string;
}

const StatementsList = () => {
    const [items, setItems] = useState<Statement[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Statement[]>([]);
    const [records, setRecords] = useState<Statement[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // State for confirm modal and alert
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [statementToDelete, setStatementToDelete] = useState<Statement | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchStatements = async () => {
            try {
                // Mock data for now
                const mockStatements: Statement[] = [
                    {
                        id: 1,
                        title: 'Monthly Revenue Statement',
                        description: 'Revenue statement for January 2024',
                        amount: 15000.0,
                        type: 'income',
                        status: 'published',
                        created_at: '2024-01-31T00:00:00Z',
                        due_date: '2024-02-15T00:00:00Z',
                    },
                    {
                        id: 2,
                        title: 'Operating Expenses',
                        description: 'Monthly operating expenses report',
                        amount: 8500.0,
                        type: 'expense',
                        status: 'draft',
                        created_at: '2024-01-30T00:00:00Z',
                    },
                ];
                setItems(mockStatements);
            } catch (error) {
                console.error('Error fetching statements:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStatements();
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
                return item.title.toLowerCase().includes(searchTerm) || item.description.toLowerCase().includes(searchTerm);
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof Statement);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: number | null = null) => {
        if (id) {
            const statement = items.find((s) => s.id === id);
            if (statement) {
                setStatementToDelete(statement);
                setShowConfirmModal(true);
            }
        }
    };

    // Confirm deletion callback
    const confirmDeletion = async () => {
        if (!statementToDelete || !statementToDelete.id) return;
        try {
            const updatedItems = items.filter((s) => s.id !== statementToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: 'Statement deleted successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting statement', type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setStatementToDelete(null);
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
                                accessor: 'title',
                                title: 'Title',
                                sortable: true,
                            },
                            {
                                accessor: 'description',
                                title: 'Description',
                                sortable: true,
                                render: ({ description }) => <span>{description.slice(0, 50) || 'N/A'}</span>,
                            },
                            {
                                accessor: 'amount',
                                title: 'Amount',
                                sortable: true,
                                render: ({ amount, type }) => <span className={`font-semibold ${type === 'income' ? 'text-success' : 'text-danger'}`}>${amount.toFixed(2)}</span>,
                            },
                            {
                                accessor: 'type',
                                title: 'Type',
                                sortable: true,
                                render: ({ type }) => getTypeBadge(type),
                            },
                            {
                                accessor: 'status',
                                title: 'Status',
                                sortable: true,
                                render: ({ status }) => getStatusBadge(status),
                            },
                            {
                                accessor: 'created_at',
                                title: 'Created Date',
                                sortable: true,
                                render: ({ created_at }) => (created_at ? <span>{new Date(created_at).toLocaleDateString()}</span> : ''),
                            },
                            {
                                accessor: 'action',
                                title: 'Actions',
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <Link href={`/accounting/statements/edit/${id}`} className="flex hover:text-info" onClick={(e) => e.stopPropagation()}>
                                            <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                />
                                            </svg>
                                        </Link>
                                        <button
                                            type="button"
                                            className="flex hover:text-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteRow(id);
                                            }}
                                        >
                                            <IconTrashLines />
                                        </button>
                                    </div>
                                ),
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
                    setStatementToDelete(null);
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

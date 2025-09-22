'use client';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';

// Receipt interface - based on completed orders
interface Receipt {
    id: number;
    invoice_number: string;
    customer: string;
    total_amount: number;
    created_at: string;
    order_id: number;
}

const ReceiptsList = () => {
    const [items, setItems] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Receipt[]>([]);
    const [records, setRecords] = useState<Receipt[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // State for alert
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchReceipts = async () => {
            try {
                // Fetch completed orders for receipts
                const { data, error } = await supabase
                    .from('orders')
                    .select(
                        `
                                id,
                                created_at,
                                products (
                                    price
                                ),
                                profiles (
                                    full_name
                                )
                            `,
                    )
                    .eq('status', 'completed')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const receipts: Receipt[] =
                    data?.map((order: any) => ({
                        id: order.id,
                        invoice_number: `RCP-${order.id}`,
                        customer: order.profiles?.full_name || 'Unknown Customer',
                        total_amount: order.products?.price || 0,
                        created_at: order.created_at,
                        order_id: order.id,
                    })) || [];

                setItems(receipts);
            } catch (error) {
                console.error('Error fetching receipts:', error);
                setAlert({ visible: true, message: `Error fetching receipts: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchReceipts();
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
                return item.invoice_number.toLowerCase().includes(searchTerm) || item.customer.toLowerCase().includes(searchTerm);
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof Receipt);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const handleDownloadPDF = (orderId: number) => {
        // Navigate to order preview with print/download functionality
        router.push(`/orders/preview/${orderId}?type=receipt`);
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
                        <h5 className="text-lg font-semibold dark:text-white-light">Receipts</h5>
                        <p className="text-gray-500 dark:text-gray-400">Completed orders receipts</p>
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
                            router.push(`/orders/preview/${record.order_id}?type=receipt`);
                        }}
                        columns={[
                            {
                                accessor: 'invoice_number',
                                title: 'Invoice #',
                                sortable: true,
                                render: ({ invoice_number }) => <span className="font-semibold text-primary">{invoice_number}</span>,
                            },
                            {
                                accessor: 'customer',
                                title: 'Customer',
                                sortable: true,
                            },
                            {
                                accessor: 'total_amount',
                                title: 'Total Amount',
                                sortable: true,
                                render: ({ total_amount }) => <span className="font-semibold text-success">${total_amount.toFixed(2)}</span>,
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
                                render: ({ order_id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <button
                                            type="button"
                                            className="flex hover:text-primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownloadPDF(order_id);
                                            }}
                                            title="Download PDF"
                                        >
                                            <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
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
        </div>
    );
};

export default ReceiptsList;

'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';

interface Order {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    status: string;
}

const OrdersList = () => {
    const [items, setItems] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Order[]>([]);
    const [records, setRecords] = useState<Order[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'name',
        direction: 'asc',
    });

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data, error } = await supabase.from('orders').select('*');
                if (error) throw error;
                setItems(data as Order[]);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
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
                return item.name.toLowerCase().includes(search.toLowerCase()) || item.buyer.toLowerCase().includes(search.toLowerCase());
            }),
        );
    }, [search, items]);

    useEffect(() => {
        const data = sortBy(initialRecords, sortStatus.columnAccessor);
        setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortStatus]);

    const handleDelete = async (order: Order | null) => {
        if (!order) return;

        try {
            const { error } = await supabase.from('orders').delete().eq('id', order.id).select();
            if (error) throw error;

            // Remove the order from state arrays
            const updatedItems = items.filter((item) => item.id !== order.id);
            setItems(updatedItems);
            setInitialRecords(
                updatedItems.filter((item) => {
                    return item.name.toLowerCase().includes(search.toLowerCase()) || item.buyer.toLowerCase().includes(search.toLowerCase());
                }),
            );

            setAlert({ visible: true, message: 'Order deleted successfully!', type: 'success' });
        } catch (error) {
            console.error('Error deleting order:', error);
            setAlert({ visible: true, message: 'Error deleting order', type: 'danger' });
        }
        setShowConfirmModal(false);
        setOrderToDelete(null);
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        Home
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Orders</span>
                </li>
            </ul>

            <div className="panel mt-6">
                {/* Confirmation Modal */}
                <ConfirmModal
                    isOpen={showConfirmModal}
                    title="Delete Order"
                    message="Are you sure you want to delete this order?"
                    onConfirm={() => handleDelete(orderToDelete)}
                    onCancel={() => {
                        setShowConfirmModal(false);
                        setOrderToDelete(null);
                    }}
                    confirmLabel="Delete"
                />

                {/* Alert */}
                {alert.visible && (
                    <div className="mb-4">
                        <Alert
                            type={alert.type}
                            title={alert.type === 'success' ? 'Success' : 'Error'}
                            message={alert.message}
                            onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                        />
                    </div>
                )}

                <div className="invoice-table">
                    <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                      
                        <div className="ltr:ml-auto rtl:mr-auto">
                            <input type="text" className="form-input w-auto" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="datatables">
                        <DataTable
                            className={loading ? 'pointer-events-none' : ''}
                            records={records}
                            columns={[
                                {
                                    accessor: 'id',
                                    title: 'ID',
                                    sortable: true,
                                    render: ({ id }) => <strong className="text-info">#{id}</strong>,
                                },
                                {
                                    accessor: 'image',
                                    title: 'Image',
                                    sortable: false,
                                    render: ({ image }) => (
                                        <div className="flex items-center font-semibold">
                                            <div className="w-max rounded-full bg-white-dark/30 p-0.5 ltr:mr-2 rtl:ml-2">
                                                <img className="h-8 w-8 rounded-full object-cover" src={image || '/assets/images/product-placeholder.jpg'} alt="order image" />
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    accessor: 'name',
                                    title: 'Name',
                                    sortable: true,
                                },
                                {
                                    accessor: 'buyer',
                                    title: 'Buyer',
                                    sortable: true,
                                },
                                {
                                    accessor: 'status',
                                    title: 'Status',
                                    sortable: true,
                                    render: ({ status }) => (
                                        <span className={`badge badge-outline-${status === 'completed' ? 'success' : status === 'processing' ? 'warning' : 'danger'}`}>{status}</span>
                                    ),
                                },
                                {
                                    accessor: 'action',
                                    title: 'Actions',
                                    titleClassName: '!text-center',
                                    render: ({ id }) => (
                                        <div className="flex items-center justify-center gap-2">
                                            <Link href={`/orders/preview/${id}`} className="hover:text-info">
                                                <IconEye className="h-5 w-5" />
                                            </Link>
                                            <Link href={`/orders/edit/${id}`} className="hover:text-primary">
                                                <IconEdit className="h-5 w-5" />
                                            </Link>
                                            <button
                                                type="button"
                                                className="hover:text-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const order = items.find((d) => d.id === id);
                                                    setOrderToDelete(order || null);
                                                    setShowConfirmModal(true);
                                                }}
                                            >
                                                <IconTrashLines className="h-5 w-5" />
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
                            minHeight={200}
                            paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} entries`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrdersList;

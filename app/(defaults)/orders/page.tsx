'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconPrinter from '@/components/icon/icon-printer';
import IconDownload from '@/components/icon/icon-download';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import { orders as dummyOrders, Order as OrderData } from './data';
import { generateOrderReceiptPDF } from '@/utils/pdf-generator';

interface Order {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    date: string;
    total: string;
    status: 'completed' | 'processing' | 'cancelled';
    address: string;
    items: { name: string; quantity: number; price: number }[];
}

const OrdersList = () => {
    const { t } = getTranslation();
    const [items, setItems] = useState<OrderData[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<OrderData[]>([]);
    const [records, setRecords] = useState<OrderData[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'desc',
    });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const handlePrintOrder = async (orderId: number) => {
        const order = items.find((item) => item.id === orderId);
        if (!order) return;

        try {
            await generateOrderReceiptPDF(order, {
                filename: `order-${orderId}-receipt.pdf`,
            });
        } catch (error) {
            console.error('Error printing order:', error);
            setAlert({
                visible: true,
                message: t('error_printing_order'),
                type: 'danger',
            });
        }
    };

    const handleDownloadOrderPDF = async (orderId: number) => {
        const order = items.find((item) => item.id === orderId);
        if (!order) return;

        try {
            await generateOrderReceiptPDF(order, {
                filename: `order-${orderId}-receipt.pdf`,
            });
        } catch (error) {
            console.error('Error downloading order PDF:', error);
            setAlert({
                visible: true,
                message: t('error_downloading_pdf'),
                type: 'danger',
            });
        }
    };

    useEffect(() => {
        // Use dummy data instead of Supabase
        setItems(dummyOrders);
        setLoading(false);
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
                return item.name.toLowerCase().includes(search.toLowerCase()) || item.buyer.toLowerCase().includes(search.toLowerCase()) || item.total.toLowerCase().includes(search.toLowerCase());
            }),
        );
    }, [search, items]);

    useEffect(() => {
        const data = sortBy(initialRecords, sortStatus.columnAccessor);
        setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortStatus]);
    const handleDelete = async (order: OrderData | null) => {
        if (!order) return;

        try {
            // Remove from dummy data
            const updatedItems = items.filter((item) => item.id !== order.id);
            setItems(updatedItems);
            setInitialRecords(
                updatedItems.filter((item) => {
                    return item.name.toLowerCase().includes(search.toLowerCase()) || item.buyer.toLowerCase().includes(search.toLowerCase()) || item.total.toLowerCase().includes(search.toLowerCase());
                }),
            );

            setAlert({ visible: true, message: t('order_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Error deleting order:', error);
            setAlert({ visible: true, message: t('error_deleting_order'), type: 'danger' });
        }
        setShowConfirmModal(false);
        setOrderToDelete(null);
    };

    return (
        <div>
            {' '}
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        {t('home')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{t('orders')}</span>
                </li>
            </ul>
            <div className="panel mt-6">
                {/* Confirmation Modal */}{' '}
                <ConfirmModal
                    isOpen={showConfirmModal}
                    title={t('delete_order')}
                    message={t('delete_order_confirmation')}
                    onConfirm={() => handleDelete(orderToDelete)}
                    onCancel={() => {
                        setShowConfirmModal(false);
                        setOrderToDelete(null);
                    }}
                    confirmLabel={t('delete')}
                />
                {/* Alert */}
                {alert.visible && (
                    <div className="mb-4">
                        {' '}
                        <Alert
                            type={alert.type}
                            title={alert.type === 'success' ? t('success') : t('error')}
                            message={alert.message}
                            onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                        />
                    </div>
                )}
                <div className="invoice-table">
                    <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                        <div className="ltr:ml-auto rtl:mr-auto">
                            <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="datatables">
                        <DataTable
                            className={loading ? 'pointer-events-none' : ''}
                            records={records}
                            columns={[
                                {
                                    accessor: 'id',
                                    title: t('order_id'),
                                    sortable: true,
                                    render: ({ id }) => <strong className="text-info">#{id}</strong>,
                                },
                                {
                                    accessor: 'image',
                                    title: t('image'),
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
                                    title: t('order_name'),
                                    sortable: true,
                                },
                                {
                                    accessor: 'buyer',
                                    title: t('customer'),
                                    sortable: true,
                                },
                                {
                                    accessor: 'date',
                                    title: t('date'),
                                    sortable: true,
                                    render: ({ date }) => new Date(date).toLocaleDateString(),
                                },
                                {
                                    accessor: 'total',
                                    title: t('total'),
                                    sortable: true,
                                    render: ({ total }) => <span className="font-semibold text-success">{total}</span>,
                                },
                                {
                                    accessor: 'status',
                                    title: t('status'),
                                    sortable: true,
                                    render: ({ status }) => (
                                        <span className={`badge badge-outline-${status === 'completed' ? 'success' : status === 'processing' ? 'warning' : 'danger'}`}>
                                            {t(`order_status_${status}`)}
                                        </span>
                                    ),
                                },
                                {
                                    accessor: 'action',
                                    title: t('actions'),
                                    titleClassName: '!text-center',
                                    render: ({ id }) => (
                                        <div className="flex items-center justify-center gap-2">
                                            <Link href={`/orders/preview/${id}`} className="hover:text-info" title={t('view_order')}>
                                                <IconEye className="h-5 w-5" />
                                            </Link>{' '}
                                            {/* <button type="button" className="hover:text-primary" title={t('print_order')} onClick={() => handlePrintOrder(id)}>
                                                <IconPrinter className="h-5 w-5" />
                                            </button>{' '} */}
                                            <button type="button" className="hover:text-success" title={t('download_pdf')} onClick={() => handleDownloadOrderPDF(id)}>
                                                <IconDownload className="h-5 w-5" />
                                            </button>
                                            <button
                                                type="button"
                                                className="hover:text-danger"
                                                title={t('delete_order')}
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
                            paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrdersList;

'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconPrinter from '@/components/icon/icon-printer';
import IconDownload from '@/components/icon/icon-download';
import IconUser from '@/components/icon/icon-user';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import { generateOrderReceiptPDF } from '@/utils/pdf-generator';
import supabase from '@/lib/supabase';

// Assignment Modal Component
const AssignmentModal = ({ order, isOpen, onClose, onAssign }: { order: any; isOpen: boolean; onClose: () => void; onAssign: (driverId: number) => void }) => {
    const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (order && isOpen) {
            fetchDrivers();
        }
    }, [order, isOpen]);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            // Get the product's shop ID
            const { data: productData } = await supabase.from('products').select('shop').eq('id', order.product_id).single();

            if (productData?.shop) {
                // Get the shop's delivery company
                const { data: shopData } = await supabase.from('shops').select('delivery_companies_id').eq('id', productData.shop).single();

                if (shopData?.delivery_companies_id) {
                    // Fetch drivers for this delivery company
                    const { data: driversData } = await supabase.from('delivery_drivers').select('id, name, phone, avatar_url').eq('delivery_companies_id', shopData.delivery_companies_id);

                    setDrivers(driversData || []);
                }
            }
        } catch (error) {
            // Error fetching drivers
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = () => {
        if (selectedDriver) {
            onAssign(selectedDriver);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
                <h3 className="text-lg font-semibold mb-4">Assign Driver</h3>

                {loading ? (
                    <div>Loading drivers...</div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Select Driver:</label>
                            <select value={selectedDriver || ''} onChange={(e) => setSelectedDriver(Number(e.target.value))} className="form-select w-full">
                                <option value="">Choose Driver</option>
                                {drivers.map((driver) => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.name} - {driver.phone}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button onClick={onClose} className="btn btn-outline">
                                Cancel
                            </button>
                            <button onClick={handleAssign} disabled={!selectedDriver} className="btn btn-primary">
                                Assign Driver
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Interfaces for Supabase order data
interface OrderData {
    id: number;
    created_at: string;
    buyer_id: string;
    status: string;
    product_id: number;
    shipping_method: any;
    shipping_address: any;
    payment_method: any;
    assigned_driver_id?: number;
    confirmed?: boolean;
    // Joined data
    products?: {
        id: number;
        title: string;
        price: number;
        images: any[];
        shop: number;
        shops?: {
            shop_name: string;
            delivery_companies_id?: number;
        }[];
    };
    profiles?: {
        id: string;
        full_name: string;
        email: string;
    };
    assigned_driver?: {
        id: number;
        name: string;
        phone: string;
        avatar_url?: string;
    };
}

// Helper functions to parse JSON fields
const parseJsonField = (field: any) => {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch {
            return {};
        }
    }
    return field || {};
};

// Helper function to format order data for display
const formatOrderForDisplay = (order: OrderData) => {
    const shippingAddress = parseJsonField(order.shipping_address);
    const paymentMethod = parseJsonField(order.payment_method);
    const shippingMethod = parseJsonField(order.shipping_method);

    // Get delivery type from shipping_method - handle JSON string format
    const deliveryType = order.shipping_method === '"delivery"' || order.shipping_method === 'delivery' ? 'delivery' : 'pickup';

    // Map database status to display status
    const statusMap: { [key: string]: 'completed' | 'processing' | 'cancelled' } = {
        Active: 'processing',
        Completed: 'completed',
        Cancelled: 'cancelled',
        Delivered: 'completed',
        Pending: 'processing',
        Shipped: 'processing',
    };

    return {
        id: order.id,
        name: order.products?.title || 'Product',
        image: order.products?.images?.[0] || null,
        buyer: order.profiles?.full_name || shippingAddress.name || 'Unknown Customer',
        shop_name: order.products?.shops?.[0]?.shop_name || 'Unknown Shop',
        city: shippingAddress.city || 'Unknown City',
        date: order.created_at,
        total: `$${(order.products?.price || 0).toFixed(2)}`,
        status: statusMap[order.status] || 'processing',
        address: `${shippingAddress.address || ''}, ${shippingAddress.city || ''}, ${shippingAddress.zip || ''}`.trim(),
        items: [
            {
                name: order.products?.title || 'Product',
                quantity: 1,
                price: order.products?.price || 0,
            },
        ],
        shipping_method: shippingMethod,
        shipping_address: shippingAddress,
        payment_method: paymentMethod,
        product_id: order.product_id,
        buyer_id: order.buyer_id,
        delivery_type: deliveryType,
        assigned_driver_id: order.assigned_driver_id,
        assigned_driver: order.assigned_driver,
        delivery_company_id: order.products?.shops?.[0]?.delivery_companies_id,
        confirmed: order.confirmed || false,
    };
};

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

const DeliveryOrdersList = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [items, setItems] = useState<OrderData[]>([]);
    const [displayItems, setDisplayItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'date',
        direction: 'desc',
    });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const handlePrintOrder = async (orderId: number) => {
        const order = displayItems.find((item) => item.id === orderId);
        if (!order) return;

        try {
            await generateOrderReceiptPDF(order, {
                filename: `order-${orderId}-receipt.pdf`,
            });
        } catch (error) {
            setAlert({
                visible: true,
                message: t('error_printing_order'),
                type: 'danger',
            });
        }
    };

    const handleDownloadOrderPDF = async (orderId: number) => {
        const order = displayItems.find((item) => item.id === orderId);
        if (!order) return;

        try {
            await generateOrderReceiptPDF(order, {
                filename: `order-${orderId}-receipt.pdf`,
            });
        } catch (error) {
            setAlert({
                visible: true,
                message: t('error_downloading_pdf'),
                type: 'danger',
            });
        }
    };

    useEffect(() => {
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
        const filtered = displayItems.filter((item) => {
            const matchesSearch =
                item.name.toLowerCase().includes(search.toLowerCase()) ||
                item.buyer.toLowerCase().includes(search.toLowerCase()) ||
                item.total.toLowerCase().includes(search.toLowerCase()) ||
                item.shop_name.toLowerCase().includes(search.toLowerCase()) ||
                item.city.toLowerCase().includes(search.toLowerCase());

            // Only show confirmed delivery orders
            const matchesFilter = item.confirmed === true && item.delivery_type === 'delivery';

            return matchesSearch && matchesFilter;
        });
        setInitialRecords(filtered);
    }, [search, displayItems]);

    useEffect(() => {
        const data = sortBy(initialRecords, sortStatus.columnAccessor);
        setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortStatus]);

    const handleDelete = async (order: OrderData | null) => {
        if (!order) return;

        try {
            // Delete from Supabase
            const { error } = await supabase.from('orders').delete().eq('id', order.id);

            if (error) throw error;

            // Update local state
            const updatedItems = items.filter((item) => item.id !== order.id);
            setItems(updatedItems);

            const updatedDisplayItems = displayItems.filter((item) => item.id !== order.id);
            setDisplayItems(updatedDisplayItems);

            setAlert({ visible: true, message: t('order_deleted_successfully'), type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: t('error_deleting_order'), type: 'danger' });
        }
        setShowConfirmModal(false);
        setOrderToDelete(null);
    };

    const handleAssignDriver = async (orderId: number, driverId: number) => {
        try {
            const { error } = await supabase.from('orders').update({ assigned_driver_id: driverId }).eq('id', orderId);

            if (error) throw error;

            // Refresh the data to get the assigned driver info
            await fetchOrders();
            setAlert({ visible: true, message: 'Driver assigned successfully', type: 'success' });

            // Close the assignment modal
            setShowAssignModal(false);
            setSelectedOrder(null);
        } catch (error) {
            setAlert({ visible: true, message: 'Error assigning driver', type: 'danger' });
        }
    };

    const handleRemoveDriver = async (orderId: number) => {
        try {
            const { error } = await supabase.from('orders').update({ assigned_driver_id: null }).eq('id', orderId);

            if (error) throw error;

            // Refresh the data
            await fetchOrders();
            setAlert({ visible: true, message: 'Driver assignment removed', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error removing driver', type: 'danger' });
        }
    };

    const fetchOrders = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select(
                    `
                    *,
                    products(id, title, price, images, shop),
                    profiles(id, full_name, email),
                    assigned_driver:delivery_drivers(id, name, phone, avatar_url)
                `,
                )
                .order('created_at', { ascending: false });

            if (error) throw error;

            setItems(data as OrderData[]);

            // Get all product IDs from orders
            const productIds = data.map((order) => order.product_id).filter(Boolean);

            if (productIds.length === 0) {
                setDisplayItems([]);
                return;
            }

            // Get products with their shop IDs
            const { data: productsData, error: productsError } = await supabase.from('products').select('id, title, price, images, shop').in('id', productIds);

            if (productsError) throw productsError;

            // Get shop IDs from products
            const shopIds = productsData?.map((p) => p.shop).filter(Boolean) || [];

            if (shopIds.length === 0) {
                setDisplayItems([]);
                return;
            }

            // Get shops with their delivery company info
            const { data: shopsData, error: shopsError } = await supabase.from('shops').select('id, shop_name, delivery_companies_id').in('id', shopIds);

            if (shopsError) throw shopsError;

            // Create a map of shop data for easy lookup
            const shopMap = new Map();
            shopsData?.forEach((shop) => {
                shopMap.set(shop.id, shop);
            });

            // Transform data for display with shop information
            const transformed = data.map((order) => {
                const product = productsData?.find((p) => p.id === order.product_id);
                const shop = product ? shopMap.get(product.shop) : null;

                return formatOrderForDisplay({
                    ...order,
                    products: product
                        ? {
                              ...product,
                              shops: shop ? [shop] : [],
                          }
                        : undefined,
                });
            });

            setDisplayItems(transformed);
        } catch (error) {
            setAlert({
                visible: true,
                message: t('error_fetching_orders'),
                type: 'danger',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-none">
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        {t('home')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/delivery" className="text-primary hover:underline">
                        Delivery
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Orders</span>
                </li>
            </ul>
            <div className="panel mt-6 w-full max-w-none">
                {/* Confirmation Modal */}
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
                {/* Assignment Modal */}
                <AssignmentModal
                    order={selectedOrder}
                    isOpen={showAssignModal}
                    onClose={() => {
                        setShowAssignModal(false);
                        setSelectedOrder(null);
                    }}
                    onAssign={(driverId) => {
                        if (selectedOrder) {
                            handleAssignDriver(selectedOrder.id, driverId);
                        }
                    }}
                />
                {/* Alert */}
                {alert.visible && (
                    <div className="mb-4">
                        <Alert
                            type={alert.type}
                            title={alert.type === 'success' ? t('success') : t('error')}
                            message={alert.message}
                            onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                        />
                    </div>
                )}
                <div className="invoice-table overflow-x-auto w-full max-w-none">
                    <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                        <div className="ltr:ml-auto rtl:mr-auto">
                            <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>

                    <div className="datatables w-full max-w-none">
                        <DataTable
                            className={`${loading ? 'pointer-events-none' : 'cursor-pointer'} w-full max-w-none`}
                            records={records}
                            minHeight={200}
                            withBorder={false}
                            withColumnBorders={false}
                            striped
                            highlightOnHover
                            onRowClick={(record) => {
                                router.push(`/orders/preview/${record.id}`);
                            }}
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
                                    accessor: 'shop_name',
                                    title: t('shop_name'),
                                    sortable: true,
                                    render: ({ shop_name }) => <span className="font-medium">{shop_name}</span>,
                                },
                                {
                                    accessor: 'city',
                                    title: t('city'),
                                    sortable: true,
                                    render: ({ city }) => <span className="">{city}</span>,
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
                                    accessor: 'assigned_driver',
                                    title: 'Driver',
                                    sortable: false,
                                    render: ({ assigned_driver, id }) => {
                                        if (assigned_driver) {
                                            return (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                            <IconUser className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium">{assigned_driver.name}</div>
                                                            <div className="text-xs text-gray-500">{assigned_driver.phone}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-warning btn-xs w-full"
                                                        title="Remove Driver Assignment"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveDriver(id);
                                                        }}
                                                    >
                                                        <IconUser className="h-3 w-3" />
                                                        <span className="ml-1">Remove</span>
                                                    </button>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="space-y-2">
                                                <span className="text-orange-500">Unassigned</span>
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-success btn-xs w-full"
                                                    title="Assign Driver"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const order = displayItems.find((d) => d.id === id);
                                                        setSelectedOrder(order);
                                                        setShowAssignModal(true);
                                                    }}
                                                >
                                                    <IconUser className="h-3 w-3" />
                                                    <span className="ml-1">Assign</span>
                                                </button>
                                            </div>
                                        );
                                    },
                                },
                                {
                                    accessor: 'action',
                                    title: t('actions'),
                                    titleClassName: '!text-center',
                                    render: ({ id }) => (
                                        <div className="flex items-center justify-center gap-2">
                                            <Link href={`/orders/preview/${id}`} className="hover:text-info" title={t('view_order')} onClick={(e) => e.stopPropagation()}>
                                                <IconEye className="h-5 w-5" />
                                            </Link>
                                            <button
                                                type="button"
                                                className="hover:text-success"
                                                title={t('download_pdf')}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadOrderPDF(id);
                                                }}
                                            >
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
                            paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryOrdersList;

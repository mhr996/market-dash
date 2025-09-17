'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';
import { getTranslation } from '@/i18n';
import IconPrinter from '@/components/icon/icon-printer';
import IconDownload from '@/components/icon/icon-download';
import IconCheck from '@/components/icon/icon-check';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMessage from '@/components/icon/icon-message';
import IconAlertTriangle from '@/components/icon/icon-info-triangle';
import IconX from '@/components/icon/icon-x';
import IconUser from '@/components/icon/icon-user';
import { generateOrderReceiptPDF } from '@/utils/pdf-generator';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { createPortal } from 'react-dom';

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
    confirmed?: boolean;
    comment?: string;
    assigned_driver?: {
        id: number;
        name: string;
        phone: string;
        avatar_url?: string;
    };
    // Joined data
    products?: {
        id: number;
        title: string;
        price: number;
        images: any[];
        shop: number;
        shops?: {
            shop_name: string;
        };
    };
    profiles?: {
        id: string;
        full_name: string;
        email: string;
        phone: string;
    };
}

// Formatted order interface for display
interface Order {
    id: number;
    date: string;
    buyer: string;
    email: string;
    phone: string;
    shop_name: string;
    product_name: string;
    product_image: string;
    price: number;
    total: string;
    status: 'processing' | 'on_the_way' | 'completed' | 'cancelled' | 'rejected';
    address: string;
    items: { name: string; quantity: number; price: number }[];
    confirmed?: boolean;
    comment?: string;
    assigned_driver?: {
        id: number;
        name: string;
        phone: string;
        avatar_url?: string;
    };
    delivery_type?: string;
}

const PreviewDeliveryOrder = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const orderId = params?.id ? parseInt(params.id as string) : null;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showDangerModal, setShowDangerModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState('');
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    // Status mapping for database values
    const statusMap: { [key: string]: 'processing' | 'on_the_way' | 'completed' | 'cancelled' | 'rejected' } = {
        Active: 'processing',
        Completed: 'completed',
        Cancelled: 'cancelled',
        Rejected: 'rejected',
        Delivered: 'completed',
        Pending: 'processing',
        Shipped: 'on_the_way',
        'On The Way': 'on_the_way',
        Processing: 'processing',
        processing: 'processing',
        on_the_way: 'on_the_way',
        completed: 'completed',
        cancelled: 'cancelled',
        rejected: 'rejected',
    };

    useEffect(() => {
        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('orders')
                .select(
                    `
                    *,
                    products (
                        id,
                        title,
                        price,
                        images,
                        shop,
                        shops (
                            shop_name
                        )
                    ),
                    profiles (
                        id,
                        full_name,
                        email,
                        phone
                    ),
                    assigned_driver (
                        id,
                        name,
                        phone,
                        avatar_url
                    )
                `,
                )
                .eq('id', orderId)
                .single();

            if (error) throw error;

            const shippingAddress = data.shipping_address || {};
            const formattedOrder: Order = {
                id: data.id,
                date: new Date(data.created_at).toLocaleDateString(),
                buyer: data.profiles?.full_name || 'Unknown',
                email: data.profiles?.email || '',
                phone: data.profiles?.phone || '',
                shop_name: data.products?.shops?.shop_name || 'Unknown Shop',
                product_name: data.products?.title || 'Unknown Product',
                product_image: data.products?.images?.[0] || '/assets/images/product-placeholder.png',
                price: data.products?.price || 0,
                total: `$${data.products?.price || 0}`,
                status: statusMap[data.status] || 'processing',
                address: `${shippingAddress.address || ''}, ${shippingAddress.city || ''}, ${shippingAddress.zip || ''}`.trim(),
                items: [
                    {
                        name: data.products?.title || 'Unknown Product',
                        quantity: 1,
                        price: data.products?.price || 0,
                    },
                ],
                confirmed: data.confirmed || false,
                comment: data.comment || '',
                assigned_driver: data.assigned_driver || null,
                delivery_type: data.shipping_method?.type || 'delivery',
            };

            setOrder(formattedOrder);
        } catch (error) {
            console.error('Error fetching order:', error);
            setAlert({ visible: true, message: 'Error loading order details', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId: number, newStatus: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
            if (error) throw error;
            setOrder((prev) => (prev ? { ...prev, status: newStatus as any } : null));
            setAlert({ visible: true, message: 'Status updated successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error updating status', type: 'danger' });
        }
    };

    const handleConfirm = async () => {
        if (!order) return;
        try {
            const { error } = await supabase.from('orders').update({ confirmed: true, status: 'processing' }).eq('id', order.id);
            if (error) throw error;
            setOrder((prev) => (prev ? { ...prev, confirmed: true, status: 'processing' } : null));
            setAlert({ visible: true, message: 'Order confirmed successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error confirming order', type: 'danger' });
        }
    };

    const handleCommentSave = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ comment }).eq('id', orderId);
            if (error) throw error;
            setOrder((prev) => (prev ? { ...prev, comment } : null));
            setAlert({ visible: true, message: 'Comment saved successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error saving comment', type: 'danger' });
        }
    };

    const handleCancelOrder = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: 'cancelled', comment }).eq('id', orderId);
            if (error) throw error;
            setOrder((prev) => (prev ? { ...prev, status: 'cancelled', comment } : null));
            setAlert({ visible: true, message: 'Order cancelled successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error cancelling order', type: 'danger' });
        }
    };

    const handleRejectOrder = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: 'rejected', comment }).eq('id', orderId);
            if (error) throw error;
            setOrder((prev) => (prev ? { ...prev, status: 'rejected', comment } : null));
            setAlert({ visible: true, message: 'Order rejected successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error rejecting order', type: 'danger' });
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPdf = async () => {
        if (!order) return;
        try {
            await generateOrderReceiptPDF(order);
        } catch (error) {
            setAlert({ visible: true, message: 'Error generating PDF', type: 'danger' });
        }
    };

    // Status Component for interactive status display
    const StatusComponent = ({
        currentStatus,
        orderId,
        onStatusChange,
        isConfirmed,
        onConfirm,
        onOpenCommentModal,
        onOpenDangerModal,
        hasAssignedDriver,
        deliveryType,
    }: {
        currentStatus: string;
        orderId: number;
        onStatusChange: (orderId: number, newStatus: string) => void;
        isConfirmed: boolean;
        onConfirm: () => void;
        onOpenCommentModal: () => void;
        onOpenDangerModal: () => void;
        hasAssignedDriver: boolean;
        deliveryType: string;
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        const [showConfirmModal, setShowConfirmModal] = useState(false);
        const [pendingStatus, setPendingStatus] = useState<string>('');
        const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
        const dropdownRef = useRef<HTMLDivElement>(null);
        const triggerRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }, []);

        useEffect(() => {
            if (isOpen && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                });
            }
        }, [isOpen]);

        const statusOptions = [
            { value: 'processing', label: 'Processing', color: 'text-info' },
            { value: 'on_the_way', label: 'On The Way', color: 'text-warning' },
            {
                value: 'completed',
                label: 'Completed',
                color: 'text-success',
                disabled: deliveryType === 'delivery' && !hasAssignedDriver,
            },
        ];

        const currentOption = statusOptions.find((option) => option.value === currentStatus) || statusOptions[0];
        const isArchivedStatus = currentStatus === 'cancelled' || currentStatus === 'rejected';

        const handleStatusSelect = (newStatus: string) => {
            if (newStatus === 'completed') {
                setPendingStatus(newStatus);
                setShowConfirmModal(true);
            } else {
                onStatusChange(orderId, newStatus);
            }
            setIsOpen(false);
        };

        const handleConfirmStatusChange = () => {
            onStatusChange(orderId, pendingStatus);
            setShowConfirmModal(false);
            setPendingStatus('');
        };

        const handleCancelStatusChange = () => {
            setShowConfirmModal(false);
            setPendingStatus('');
        };

        // If it's an archived status, show as read-only badge
        if (isArchivedStatus) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    {currentStatus === 'cancelled' ? 'Cancelled' : 'Rejected'}
                </span>
            );
        }

        // If not confirmed, show confirm button
        if (!isConfirmed) {
            return (
                <button
                    type="button"
                    className="btn btn-sm btn-primary gap-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        onConfirm();
                    }}
                >
                    <IconCheck className="h-4 w-4" />
                    <span>Confirm</span>
                </button>
            );
        }

        return (
            <>
                <div ref={triggerRef} className="relative">
                    <div
                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2 text-xs dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between min-w-[120px]"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                    >
                        <span className={currentOption.color}>{currentOption.label}</span>
                        <IconCaretDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                {/* Portal for dropdown to render outside table container */}
                {isOpen &&
                    createPortal(
                        <div
                            ref={dropdownRef}
                            className="fixed z-[9999] rounded-md border border-gray-300 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800"
                            style={{
                                top: dropdownPosition.top,
                                left: dropdownPosition.left,
                                width: dropdownPosition.width,
                                minWidth: '120px',
                            }}
                        >
                            {statusOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`px-3 py-2 text-xs first:rounded-t-md ${
                                        option.disabled ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700'
                                    }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!option.disabled) {
                                            handleStatusSelect(option.value);
                                        }
                                    }}
                                >
                                    <span className={option.disabled ? 'text-gray-400' : option.color}>
                                        {option.label}
                                        {option.disabled && ' (Assign driver first)'}
                                    </span>
                                </div>
                            ))}
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <div
                                className="cursor-pointer px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenCommentModal();
                                    setIsOpen(false);
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <IconMessage className="h-3 w-3 text-info" />
                                    <span className="text-info">Add Comment</span>
                                </div>
                            </div>
                            <div
                                className="cursor-pointer px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-md"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenDangerModal();
                                    setIsOpen(false);
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <IconAlertTriangle className="h-3 w-3 text-danger" />
                                    <span className="text-danger">Cancel/Reject</span>
                                </div>
                            </div>
                        </div>,
                        document.body,
                    )}

                {/* Confirmation Modal for Completed Status */}
                {showConfirmModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
                            <h3 className="text-lg font-semibold mb-4">Confirm Status Change</h3>
                            <p className="mb-6">Are you sure you want to mark this order as completed? This action cannot be undone.</p>
                            <div className="flex gap-2 justify-end">
                                <button onClick={handleCancelStatusChange} className="btn btn-outline">
                                    Cancel
                                </button>
                                <button onClick={handleConfirmStatusChange} className="btn btn-success">
                                    Yes, Mark as Completed
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    // Comment Modal Component
    const CommentModal = ({ order, isOpen, onClose, onSave }: { order: any; isOpen: boolean; onClose: () => void; onSave: (orderId: number, comment: string) => void }) => {
        const [comment, setComment] = useState('');
        const [loading, setLoading] = useState(false);

        useEffect(() => {
            if (order && isOpen) {
                setComment(order.comment || '');
            }
        }, [order, isOpen]);

        const handleSave = async () => {
            if (!order) return;

            setLoading(true);
            try {
                await onSave(order.id, comment);
                onClose();
            } catch (error) {
                // Error handling is done in parent component
            } finally {
                setLoading(false);
            }
        };

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">Order Comment</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Comment:</label>
                            <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="form-textarea w-full h-32 resize-none" placeholder="Add a comment for this order..." />
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={onClose} className="btn btn-outline" disabled={loading}>
                                Cancel
                            </button>
                            <button onClick={handleSave} className="btn btn-primary" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Comment'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Danger Modal Component for Cancel/Reject actions
    const DangerModal = ({
        order,
        isOpen,
        onClose,
        onCancelOrder,
        onRejectOrder,
    }: {
        order: any;
        isOpen: boolean;
        onClose: () => void;
        onCancelOrder: (orderId: number, comment: string) => void;
        onRejectOrder: (orderId: number, comment: string) => void;
    }) => {
        const [comment, setComment] = useState('');
        const [loading, setLoading] = useState(false);
        const [actionType, setActionType] = useState<'cancel' | 'reject'>('cancel');

        useEffect(() => {
            if (order && isOpen) {
                setComment(order.comment || '');
            }
        }, [order, isOpen]);

        const handleSave = async () => {
            if (!order) return;

            setLoading(true);
            try {
                if (actionType === 'cancel') {
                    await onCancelOrder(order.id, comment);
                } else if (actionType === 'reject') {
                    await onRejectOrder(order.id, comment);
                }
                onClose();
            } catch (error) {
                // Error handling is done in parent component
            } finally {
                setLoading(false);
            }
        };

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4 text-danger">Cancel or Reject Order</h3>
                    <div className="space-y-4">
                        {/* Action Type Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Select Action:</label>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setActionType('cancel')} className={`btn btn-sm ${actionType === 'cancel' ? 'btn-danger' : 'btn-outline-danger'}`}>
                                    Cancel Order
                                </button>
                                <button type="button" onClick={() => setActionType('reject')} className={`btn btn-sm ${actionType === 'reject' ? 'btn-danger' : 'btn-outline-danger'}`}>
                                    Reject Order
                                </button>
                            </div>
                        </div>

                        {/* Comment Field */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Reason <span className="text-danger">*</span>:
                            </label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="form-textarea w-full h-32 resize-none"
                                placeholder="Please provide a reason for this action..."
                                required
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button onClick={onClose} className="btn btn-outline" disabled={loading}>
                                Cancel
                            </button>
                            <button onClick={handleSave} className="btn btn-danger" disabled={loading || !comment.trim()}>
                                {loading ? 'Processing...' : actionType === 'cancel' ? 'Cancel Order' : 'Reject Order'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Order Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">The order you're looking for doesn't exist or has been removed.</p>
                    <Link href="/delivery/orders" className="btn btn-primary">
                        Back to Delivery Orders
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="print:p-0 w-full max-w-none">
            {alert.visible && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${alert.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {alert.message}
                    <button onClick={() => setAlert({ ...alert, visible: false })} className="ml-4 text-white hover:text-gray-200">
                        <IconX className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="pt-5 w-full max-w-none">
                <div className="panel p-0 w-full max-w-none">
                    {/* Header */}
                    <div className="flex flex-wrap justify-between gap-4 px-6 py-6">
                        <div>
                            <ul className="flex space-x-2 rtl:space-x-reverse mb-2">
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
                                    <Link href="/delivery/orders" className="text-primary hover:underline">
                                        Orders
                                    </Link>
                                </li>
                                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                                    <span>Order Details #{order.id}</span>
                                </li>
                            </ul>
                            <h5 className="text-xl font-semibold dark:text-white-light">{t('order_details')}</h5>
                            <p className="text-gray-600 dark:text-gray-400">Order #{order.id}</p>
                        </div>
                        <div className="flex gap-2">
                            {/* PDF/Print buttons - only show for confirmed orders with valid status */}
                            {order?.confirmed && ['processing', 'on_the_way', 'completed'].includes(order.status) && (
                                <>
                                    <button onClick={handlePrint} className="btn btn-primary gap-2">
                                        <IconPrinter className="h-5 w-5" />
                                        {t('print')}
                                    </button>
                                    <button onClick={handleDownloadPdf} className="btn btn-success gap-2">
                                        <IconDownload className="h-5 w-5" />
                                        {t('download_pdf')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Invoice Header */}
                    <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap justify-between gap-4">
                            <div>
                                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice</h4>
                                <p className="text-gray-600 dark:text-gray-400">Order #{order.id}</p>
                                <p className="text-gray-600 dark:text-gray-400">Date: {order.date}</p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-2">
                                    <strong>{t('status')}:</strong>
                                    <StatusComponent
                                        currentStatus={order.status}
                                        orderId={order.id}
                                        onStatusChange={handleStatusUpdate}
                                        isConfirmed={order.confirmed || false}
                                        onConfirm={handleConfirm}
                                        onOpenCommentModal={() => setShowCommentModal(true)}
                                        onOpenDangerModal={() => setShowDangerModal(true)}
                                        hasAssignedDriver={!!order.assigned_driver}
                                        deliveryType={order.delivery_type || 'delivery'}
                                    />
                                </div>
                                {/* Action Buttons next to status */}
                                <div className="flex gap-2 mt-2">
                                    <button type="button" className="btn btn-sm btn-info gap-1 relative" title="Add Comment" onClick={() => setShowCommentModal(true)}>
                                        <IconMessage className="h-4 w-4" />
                                        Comment
                                        {order?.comment && <span className="absolute -top-1 -right-1 h-2 w-2 bg-info rounded-full"></span>}
                                    </button>
                                    <button type="button" className="btn btn-sm btn-danger gap-1" title="Cancel/Reject Order" onClick={() => setShowDangerModal(true)}>
                                        <IconAlertTriangle className="h-4 w-4" />
                                        Cancel/Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="px-6 py-6">
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div>
                                <h5 className="text-lg font-semibold mb-4">Order Information</h5>
                                <div className="space-y-2">
                                    <div>
                                        <strong>Order ID:</strong> #{order.id}
                                    </div>
                                    <div>
                                        <strong>Date:</strong> {order.date}
                                    </div>
                                    <div>
                                        <strong>Shop:</strong> {order.shop_name}
                                    </div>
                                    <div>
                                        <strong>Product:</strong> {order.product_name}
                                    </div>
                                    <div>
                                        <strong>Total:</strong> {order.total}
                                    </div>
                                    <div>
                                        <strong>Type:</strong> {order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
                                    </div>
                                    <div>
                                        <strong>{t('status')}:</strong>
                                        <span className="ml-2">
                                            {!order.confirmed ? (
                                                <span className="text-warning font-medium">Unconfirmed</span>
                                            ) : order.status === 'cancelled' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                    Cancelled
                                                </span>
                                            ) : order.status === 'rejected' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                    Rejected
                                                </span>
                                            ) : (
                                                <span className={`badge badge-outline-${order.status === 'completed' ? 'success' : order.status === 'on_the_way' ? 'warning' : 'info'}`}>
                                                    {order.status === 'on_the_way' ? 'On The Way' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h5 className="text-lg font-semibold mb-4">Customer Information</h5>
                                <div className="space-y-2">
                                    <div>
                                        <strong>Name:</strong> {order.buyer}
                                    </div>
                                    <div>
                                        <strong>Email:</strong> {order.email}
                                    </div>
                                    <div>
                                        <strong>Phone:</strong> {order.phone}
                                    </div>
                                    <div>
                                        <strong>Address:</strong> {order.address}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Driver Information (for delivery orders) */}
                    {order.delivery_type === 'delivery' && (
                        <div className="px-6 py-6 border-t border-gray-200 dark:border-gray-700">
                            <h5 className="text-lg font-semibold mb-4">Driver Information</h5>
                            {order.assigned_driver ? (
                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <IconUser className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{order.assigned_driver.name}</div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">{order.assigned_driver.phone}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                    <p className="text-yellow-800 dark:text-yellow-200">No driver assigned yet</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Order Items */}
                    <div className="px-6 py-6 border-t border-gray-200 dark:border-gray-700">
                        <h5 className="text-lg font-semibold mb-4">Order Items</h5>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-2">Item</th>
                                        <th className="text-left py-2">Quantity</th>
                                        <th className="text-left py-2">Price</th>
                                        <th className="text-left py-2">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item, index) => (
                                        <tr key={index} className="border-b border-gray-200 dark:border-gray-700">
                                            <td className="py-2">{item.name}</td>
                                            <td className="py-2">{item.quantity}</td>
                                            <td className="py-2">${item.price}</td>
                                            <td className="py-2">${item.price * item.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Comment Section */}
                    {order.comment && (
                        <div className="px-6 py-6 border-t border-gray-200 dark:border-gray-700">
                            <h5 className="text-lg font-semibold mb-4">Comments</h5>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <p className="text-gray-700 dark:text-gray-300">{order.comment}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CommentModal order={order} isOpen={showCommentModal} onClose={() => setShowCommentModal(false)} onSave={handleCommentSave} />
            <DangerModal order={order} isOpen={showDangerModal} onClose={() => setShowDangerModal(false)} onCancelOrder={handleCancelOrder} onRejectOrder={handleRejectOrder} />
        </div>
    );
};

export default PreviewDeliveryOrder;

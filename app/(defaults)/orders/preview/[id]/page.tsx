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

// Status Component for order preview
const StatusComponent = ({
    currentStatus,
    orderId,
    onStatusChange,
    isConfirmed,
    onConfirm,
    onUnconfirm,
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
    onUnconfirm: () => void;
    onOpenCommentModal: () => void;
    onOpenDangerModal: () => void;
    hasAssignedDriver: boolean;
    deliveryType: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showUnconfirmModal, setShowUnconfirmModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState('');
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    const archivedStatuses = [
        { value: 'cancelled', label: 'Cancelled', color: 'text-danger' },
        { value: 'rejected', label: 'Rejected', color: 'text-danger' },
    ];

    const currentOption = statusOptions.find((option) => option.value === currentStatus) || archivedStatuses.find((option) => option.value === currentStatus) || statusOptions[0];

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

    const handleUnconfirmOrder = () => {
        setShowUnconfirmModal(true);
        setIsOpen(false);
    };

    const handleConfirmUnconfirm = () => {
        onUnconfirm();
        setShowUnconfirmModal(false);
    };

    const handleCancelUnconfirm = () => {
        setShowUnconfirmModal(false);
    };

    const handleDangerAction = () => {
        onOpenDangerModal();
        setIsOpen(false);
    };

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // If not confirmed, show confirm button
    if (!isConfirmed) {
        return (
            <>
                <button
                    type="button"
                    className="btn btn-success btn-sm gap-2"
                    onClick={(e) => {
                        e.stopPropagation();
                        onConfirm();
                    }}
                >
                    <IconCheck className="h-4 w-4" />
                    <span>Confirm</span>
                </button>
            </>
        );
    }

    // If confirmed, show status dropdown or static badge for archived statuses
    const isArchivedStatus = currentStatus === 'cancelled' || currentStatus === 'rejected';

    if (isArchivedStatus) {
        return (
            <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                style={{ backgroundColor: '#fecaca', color: '#991b1b' }}
            >
                {currentStatus === 'cancelled' ? 'Cancelled' : 'Rejected'}
            </span>
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
            {isOpen &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className="absolute z-50 mt-1 w-48 rounded-md border border-[#e0e6ed] bg-white py-1 shadow-lg dark:border-[#191e3a] dark:bg-[#0e1726]"
                        style={{
                            top: (triggerRef.current?.getBoundingClientRect().bottom || 0) + window.scrollY + 4,
                            left: (triggerRef.current?.getBoundingClientRect().left || 0) + window.scrollX,
                        }}
                    >
                        {statusOptions.map((option) => (
                            <div
                                key={option.value}
                                className={`cursor-pointer px-4 py-2 text-xs hover:bg-[#f1f2f3] dark:hover:bg-[#1b2e4b] ${option.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
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
                            className="cursor-pointer px-4 py-2 text-xs hover:bg-[#f1f2f3] dark:hover:bg-[#1b2e4b]"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleUnconfirmOrder();
                            }}
                        >
                            <span className="text-warning">Unconfirm</span>
                        </div>
                        <div
                            className="cursor-pointer px-4 py-2 text-xs hover:bg-[#f1f2f3] dark:hover:bg-[#1b2e4b]"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDangerAction();
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <IconX className="h-3 w-3 text-danger" />
                                <span className="text-danger">Cancel/Reject</span>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
            {/* Confirm Modal for Completed Status */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Confirm Status Change</h3>
                        <p className="mb-6">Are you sure you want to mark this order as completed?</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={handleCancelStatusChange} className="btn btn-outline">
                                Cancel
                            </button>
                            <button onClick={handleConfirmStatusChange} className="btn btn-success">
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Unconfirm Modal */}
            {showUnconfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Unconfirm Order</h3>
                        <p className="mb-6">Are you sure you want to unconfirm this order?</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={handleCancelUnconfirm} className="btn btn-outline">
                                Cancel
                            </button>
                            <button onClick={handleConfirmUnconfirm} className="btn btn-warning">
                                Unconfirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Comment Modal Component for regular comments
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

interface Order {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    date: string;
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
}

const PreviewOrder = () => {
    const { t } = getTranslation();
    const params = useParams();
    const id = params?.id as string;

    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showDangerModal, setShowDangerModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showUnconfirmModal, setShowUnconfirmModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState('');
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const router = useRouter();

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) return;

            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select(
                        `
                        *,
                        products(
                            id, title, price, images, shop,
                            shops(
                                id, shop_name, logo_url, address, 
                                phone_numbers
                            )
                        ),
                        profiles(
                            id, full_name, email, username, profession, 
                            country, location, phone, website, avatar_url
                        )
                    `,
                    )
                    .eq('id', parseInt(id))
                    .single();

                if (error) throw error;

                // Format the order data for display
                const shippingAddress = parseJsonField(data.shipping_address);
                const paymentMethod = parseJsonField(data.payment_method);
                const shippingMethod = parseJsonField(data.shipping_method);

                // Map database status to display status
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

                const formattedOrder = {
                    id: data.id,
                    name: data.products?.title || 'Product',
                    image: data.products?.images?.[0] || null,
                    buyer: data.profiles?.full_name || shippingAddress.name || 'Unknown Customer',
                    date: data.created_at,
                    total: `$${(data.products?.price || 0).toFixed(2)}`,
                    status: statusMap[data.status] || 'processing',
                    address: `${shippingAddress.address || ''}, ${shippingAddress.city || ''}, ${shippingAddress.zip || ''}`.trim(),
                    confirmed: data.confirmed || false,
                    comment: data.comment || '',
                    assigned_driver: data.assigned_driver || null,
                    items: [
                        {
                            name: data.products?.title || 'Product',
                            quantity: 1,
                            price: data.products?.price || 0,
                        },
                    ],
                    // Comprehensive order data
                    shipping_method: shippingMethod,
                    shipping_address: shippingAddress,
                    payment_method: paymentMethod,
                    product_id: data.product_id,
                    buyer_id: data.buyer_id,
                    // User data
                    user: {
                        id: data.profiles?.id,
                        full_name: data.profiles?.full_name,
                        email: data.profiles?.email,
                        username: data.profiles?.username,
                        profession: data.profiles?.profession,
                        country: data.profiles?.country,
                        location: data.profiles?.location,
                        phone: data.profiles?.phone,
                        website: data.profiles?.website,
                        avatar_url: data.profiles?.avatar_url,
                    },
                    // Shop data
                    shop: {
                        id: data.products?.shops?.id,
                        shop_name: data.products?.shops?.shop_name,
                        logo_url: data.products?.shops?.logo_url,
                        address: data.products?.shops?.address,
                        phone_numbers: data.products?.shops?.phone_numbers,
                    },
                    // Product data
                    product: {
                        id: data.products?.id,
                        title: data.products?.title,
                        price: data.products?.price,
                        images: data.products?.images,
                    },
                };

                setOrder(formattedOrder);
            } catch (error) {
                console.error('Error fetching order:', error);
                setOrder(null);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id]);
    const handlePrint = async () => {
        if (!order) return;

        try {
            await generateOrderReceiptPDF(order, {
                filename: `order-${order.id}-receipt.pdf`,
            });
        } catch (error) {
            console.error('Error printing order:', error);
            setAlert({ visible: true, message: t('error_printing_order'), type: 'danger' });
        }
    };

    const handleDownloadPdf = async () => {
        if (!order) return;

        try {
            await generateOrderReceiptPDF(order, {
                filename: `order-${order.id}-receipt.pdf`,
            });
        } catch (error) {
            console.error('Error downloading PDF:', error);
            setAlert({ visible: true, message: t('error_downloading_pdf'), type: 'danger' });
        }
    };

    const calculateSubtotal = () => {
        if (!order) return 0;
        return order.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    };

    const calculateTax = () => {
        return calculateSubtotal() * 0.1; // 10% tax
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    // Handler functions for editor functionality
    const handleStatusUpdate = async (orderId: number, newStatus: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
            if (error) throw error;

            setOrder((prev: any) => (prev ? { ...prev, status: newStatus } : null));
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

            setOrder((prev: any) => (prev ? { ...prev, confirmed: true, status: 'processing' } : null));
            setShowConfirmModal(false);
            setAlert({ visible: true, message: 'Order confirmed successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error confirming order', type: 'danger' });
        }
    };

    const handleUnconfirm = async () => {
        if (!order) return;
        try {
            const { error } = await supabase.from('orders').update({ confirmed: false }).eq('id', order.id);
            if (error) throw error;

            setOrder((prev: any) => (prev ? { ...prev, confirmed: false } : null));
            setShowUnconfirmModal(false);
            setAlert({ visible: true, message: 'Order unconfirmed successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error unconfirming order', type: 'danger' });
        }
    };

    const handleCommentSave = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ comment }).eq('id', orderId);
            if (error) throw error;

            setOrder((prev: any) => (prev ? { ...prev, comment } : null));
            setAlert({ visible: true, message: 'Comment saved successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error saving comment', type: 'danger' });
        }
    };

    const handleCancelOrder = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: 'cancelled', comment }).eq('id', orderId);
            if (error) throw error;

            setOrder((prev: any) => (prev ? { ...prev, status: 'cancelled', comment } : null));
            setAlert({ visible: true, message: 'Order cancelled successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error cancelling order', type: 'danger' });
        }
    };

    const handleRejectOrder = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: 'rejected', comment }).eq('id', orderId);
            if (error) throw error;

            setOrder((prev: any) => (prev ? { ...prev, status: 'rejected', comment } : null));
            setAlert({ visible: true, message: 'Order rejected successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error rejecting order', type: 'danger' });
        }
    };
    if (loading) {
        return <div className="flex items-center justify-center h-screen">{t('loading')}</div>;
    }

    if (!order) {
        return <div className="flex items-center justify-center h-screen">{t('order_not_found')}</div>;
    }
    return (
        <div className="print:p-0 w-full max-w-none">
            <div onClick={() => router.back()}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </div>
            <ul className="flex space-x-2 rtl:space-x-reverse print:hidden">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        {t('home')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/orders" className="text-primary hover:underline">
                        {t('orders')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>
                        {t('order_details')} #{order.id}
                    </span>
                </li>
            </ul>

            <div className="pt-5 w-full max-w-none">
                <div className="mb-6 flex items-center justify-between print:hidden">
                    <h5 className="text-xl font-semibold dark:text-white-light">{t('order_details')}</h5>
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
                <div className="panel p-0 w-full max-w-none">
                    <div className="flex flex-wrap justify-between gap-4 px-6 py-6">
                        <div className="flex-1">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-primary">{t('order_invoice')}</h1>
                                <p className="text-sm text-gray-500">#{order.id}</p>
                            </div>

                            <div className="space-y-1 text-white-dark">
                                <div>
                                    <strong>{t('order_date')}:</strong> {new Date(order.date).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                    <strong>{t('status')}:</strong>
                                    <StatusComponent
                                        currentStatus={order.status}
                                        orderId={order.id}
                                        onStatusChange={handleStatusUpdate}
                                        isConfirmed={order.confirmed}
                                        onConfirm={handleConfirm}
                                        onUnconfirm={handleUnconfirm}
                                        onOpenCommentModal={() => setShowCommentModal(true)}
                                        onOpenDangerModal={() => setShowDangerModal(true)}
                                        hasAssignedDriver={!!order.assigned_driver}
                                        deliveryType={order.shipping_method?.type || 'pickup'}
                                    />
                                    {/* Action Buttons next to status */}
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

                        <div className="shrink-0">
                            <img src={order.image || '/assets/images/product-placeholder.jpg'} alt={order.name} className="h-32 w-32 rounded-lg object-cover" />
                        </div>
                    </div>

                    {/* Comprehensive Information Grid */}
                    <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-3">
                        {/* Customer Information */}
                        <div className="panel border border-gray-200 dark:border-gray-700">
                            <div className="mb-4 flex items-center gap-3">
                                {order.user?.avatar_url ? (
                                    <img src={order.user.avatar_url} alt={order.user.full_name} className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-semibold">{order.user?.full_name?.charAt(0) || 'U'}</div>
                                )}
                                <h6 className="text-lg font-semibold">{t('customer_information')}</h6>
                            </div>
                            <div className="space-y-3 text-white-dark">
                                <div>
                                    <strong>{t('full_name')}:</strong>
                                    <p className="mt-1">{order.user?.full_name || 'N/A'}</p>
                                </div>
                                {order.user?.username && (
                                    <div>
                                        <strong>{t('username')}:</strong>
                                        <p className="mt-1">@{order.user.username}</p>
                                    </div>
                                )}
                                <div>
                                    <strong>{t('email')}:</strong>
                                    <p className="mt-1">{order.user?.email || 'N/A'}</p>
                                </div>
                                {order.user?.phone && (
                                    <div>
                                        <strong>{t('phone')}:</strong>
                                        <p className="mt-1">{order.user.phone}</p>
                                    </div>
                                )}
                                {order.user?.profession && (
                                    <div>
                                        <strong>{t('profession')}:</strong>
                                        <p className="mt-1">{order.user.profession}</p>
                                    </div>
                                )}
                                {order.user?.country && (
                                    <div>
                                        <strong>{t('country')}:</strong>
                                        <p className="mt-1">{order.user.country}</p>
                                    </div>
                                )}
                                {order.user?.location && (
                                    <div>
                                        <strong>{t('location')}:</strong>
                                        <p className="mt-1">{order.user.location}</p>
                                    </div>
                                )}
                                {order.user?.website && (
                                    <div>
                                        <strong>{t('website')}:</strong>
                                        <p className="mt-1">
                                            <a href={order.user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                {order.user.website}
                                            </a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shop Information */}
                        <div className="panel border border-gray-200 dark:border-gray-700">
                            <div className="mb-4 flex items-center gap-3">
                                {order.shop?.logo_url ? (
                                    <img src={order.shop.logo_url} alt={order.shop.shop_name} className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-white font-semibold">{order.shop?.shop_name?.charAt(0) || 'S'}</div>
                                )}
                                <h6 className="text-lg font-semibold">{t('shop_information')}</h6>
                            </div>
                            <div className="space-y-3 text-white-dark">
                                <div>
                                    <strong>{t('shop_name')}:</strong>
                                    <p className="mt-1">{order.shop?.shop_name || 'N/A'}</p>
                                </div>

                                {order.shop?.address && (
                                    <div>
                                        <strong>{t('shop_address')}:</strong>
                                        <p className="mt-1">{order.shop.address}</p>
                                    </div>
                                )}
                                {order.shop?.phone_numbers && order.shop.phone_numbers.length > 0 && (
                                    <div>
                                        <strong>{t('shop_phone')}:</strong>
                                        <div className="mt-1">
                                            {order.shop.phone_numbers.map((phone: string, index: number) => (
                                                <p key={index}>{phone}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment & Shipping Information */}
                        <div className="panel border border-gray-200 dark:border-gray-700">
                            <h6 className="mb-4 text-lg font-semibold">{t('payment_information')}</h6>
                            <div className="space-y-4 text-white-dark">
                                {/* Payment Method */}
                                <div>
                                    <strong>{t('payment_method')}:</strong>
                                    <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span>{t('payment_type')}:</span>
                                                <span className="font-medium">{order.payment_method?.type || 'N/A'}</span>
                                            </div>
                                            {order.payment_method?.provider && (
                                                <div className="flex justify-between">
                                                    <span>{t('provider')}:</span>
                                                    <span className="font-medium">{order.payment_method.provider}</span>
                                                </div>
                                            )}
                                            {order.payment_method?.card_number && (
                                                <div className="flex justify-between">
                                                    <span>{t('card_number')}:</span>
                                                    <span className="font-medium font-mono">{order.payment_method.card_number}</span>
                                                </div>
                                            )}
                                            {order.payment_method?.name_on_card && (
                                                <div className="flex justify-between">
                                                    <span>{t('name_on_card')}:</span>
                                                    <span className="font-medium">{order.payment_method.name_on_card}</span>
                                                </div>
                                            )}
                                            {order.payment_method?.expiration_date && (
                                                <div className="flex justify-between">
                                                    <span>{t('expiration_date')}:</span>
                                                    <span className="font-medium">{order.payment_method.expiration_date}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping Information */}
                                <div>
                                    <strong>{t('shipping_information')}:</strong>
                                    <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span>{t('shipping_method')}:</span>
                                                <span className="font-medium">{order.shipping_method?.type || 'N/A'}</span>
                                            </div>
                                            {order.shipping_method?.cost && (
                                                <div className="flex justify-between">
                                                    <span>{t('shipping_cost')}:</span>
                                                    <span className="font-medium">${order.shipping_method.cost}</span>
                                                </div>
                                            )}
                                            {order.shipping_method?.duration && (
                                                <div className="flex justify-between">
                                                    <span>{t('shipping_duration')}:</span>
                                                    <span className="font-medium">{order.shipping_method.duration}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="px-6 py-6">
                        <h6 className="mb-4 text-lg font-semibold">{t('delivery_info')}</h6>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="panel border border-gray-200 dark:border-gray-700">
                                <h6 className="mb-3 text-md font-semibold">{t('shipping_address')}</h6>
                                <div className="space-y-2 text-white-dark">
                                    {order.shipping_address?.name && (
                                        <div>
                                            <strong>{t('full_name')}:</strong> {order.shipping_address.name}
                                        </div>
                                    )}
                                    {order.shipping_address?.email && (
                                        <div>
                                            <strong>{t('email')}:</strong> {order.shipping_address.email}
                                        </div>
                                    )}
                                    {order.shipping_address?.phone && (
                                        <div>
                                            <strong>{t('phone')}:</strong> {order.shipping_address.phone}
                                        </div>
                                    )}
                                    {order.shipping_address?.address && (
                                        <div>
                                            <strong>{t('address')}:</strong> {order.shipping_address.address}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        {order.shipping_address?.district && (
                                            <div>
                                                <strong>{t('district')}:</strong> {order.shipping_address.district}
                                            </div>
                                        )}
                                        {order.shipping_address?.city && (
                                            <div>
                                                <strong>{t('city')}:</strong> {order.shipping_address.city}
                                            </div>
                                        )}
                                    </div>
                                    {order.shipping_address?.zip && (
                                        <div>
                                            <strong>{t('zip_code')}:</strong> {order.shipping_address.zip}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="panel border border-gray-200 dark:border-gray-700">
                                <h6 className="mb-3 text-md font-semibold">{t('order_summary')}</h6>
                                <div className="space-y-2 text-white-dark">
                                    <div>
                                        <strong>{t('order_name')}:</strong> {order.name}
                                    </div>
                                    <div>
                                        <strong>{t('total_items')}:</strong> {order.items.length}
                                    </div>
                                    <div>
                                        <strong>{t('order_total')}:</strong> <span className="text-success font-semibold">{order.total}</span>
                                    </div>
                                    <div>
                                        <strong>{t('order_date')}:</strong> {new Date(order.date).toLocaleDateString()}
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
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="px-6 py-6">
                        <h6 className="mb-4 text-lg font-semibold">{t('order_items')}</h6>
                        <div className="table-responsive">
                            <table className="table-striped">
                                <thead>
                                    <tr>
                                        <th>{t('item_name')}</th>
                                        <th className="text-center">{t('quantity')}</th>
                                        <th className="text-right">{t('unit_price')}</th>
                                        <th className="text-right">{t('total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item: any, index: number) => (
                                        <tr key={index}>
                                            <td>{item.name}</td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td className="text-right">${item.price.toFixed(2)}</td>
                                            <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Order Totals */}
                        <div className="mt-6 flex justify-end">
                            <div className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between">
                                    <span>{t('subtotal')}:</span>
                                    <span>${calculateSubtotal().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('tax')} (10%):</span>
                                    <span>${calculateTax().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 font-semibold">
                                    <span>{t('total')}:</span>
                                    <span className="text-success">${calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <CommentModal order={order} isOpen={showCommentModal} onClose={() => setShowCommentModal(false)} onSave={handleCommentSave} />
            <DangerModal order={order} isOpen={showDangerModal} onClose={() => setShowDangerModal(false)} onCancelOrder={handleCancelOrder} onRejectOrder={handleRejectOrder} />

            {/* Alert */}
            {alert.visible && (
                <div className="fixed top-4 right-4 z-50">
                    <div className={`alert alert-${alert.type}`}>
                        <span>{alert.message}</span>
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => setAlert({ visible: false, message: '', type: 'success' })}>
                            ×
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreviewOrder;

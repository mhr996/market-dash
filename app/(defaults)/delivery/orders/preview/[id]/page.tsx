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
import { calculateOrderTotal } from '@/utils/order-calculations';
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

// Status Component for delivery order preview
const StatusComponent = ({
    currentStatus,
    orderId,
    onStatusChange,
    isConfirmed,
    onCompleteOrder,
    onAssignDriver,
    hasAssignedDriver,
    deliveryType,
}: {
    currentStatus: string;
    orderId: number;
    onStatusChange: (orderId: number, newStatus: string) => void;
    isConfirmed: boolean;
    onCompleteOrder: () => void;
    onAssignDriver: () => void;
    hasAssignedDriver: boolean;
    deliveryType: string;
}) => {
    // If not confirmed, show confirm button
    if (!isConfirmed) {
        return (
            <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onCompleteOrder();
                }}
            >
                <span>Confirm Order</span>
            </button>
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

    // For processing status - show ASSIGN button
    if (currentStatus === 'processing') {
        return (
            <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onAssignDriver();
                }}
            >
                <span>ASSIGN</span>
            </button>
        );
    }

    // For on_the_way status - show Complete Order button
    if (currentStatus === 'on_the_way') {
        return (
            <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onCompleteOrder();
                }}
            >
                <span>Complete Order</span>
            </button>
        );
    }

    // For completed orders, show as read-only label
    if (currentStatus === 'completed') {
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</span>;
    }

    // This should never be reached with the new logic, but just in case
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">{currentStatus}</span>;
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

const PreviewDeliveryOrder = () => {
    const { t } = getTranslation();
    const params = useParams();
    const id = params?.id as string;

    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showDangerModal, setShowDangerModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [tracking, setTracking] = useState<any[]>([]);
    const [isEditingComment, setIsEditingComment] = useState(false);
    const [currentComment, setCurrentComment] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    const router = useRouter();

    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase.from('profiles').select('id, full_name').eq('id', user.id).single();
                    setCurrentUser(profile);
                }
            } catch (error) {
                console.error('Error fetching current user:', error);
            }
        };

        const fetchComments = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('order_comments')
                    .select(
                        `
                        *,
                        profiles(id, full_name)
                    `,
                    )
                    .eq('order_id', parseInt(id))
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setComments(data || []);
            } catch (error) {
                console.error('Error fetching comments:', error);
            }
        };

        const fetchTracking = async () => {
            if (!id) return;
            try {
                console.log('Fetching tracking for order:', parseInt(id));
                const { data, error } = await supabase
                    .from('order_tracking')
                    .select(
                        `
                        *,
                        profiles(id, full_name)
                    `,
                    )
                    .eq('order_id', parseInt(id))
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('Error fetching tracking:', error);
                    throw error;
                }
                console.log('Tracking data:', data);
                setTracking(data || []);
            } catch (error) {
                console.error('Error fetching tracking:', error);
            }
        };

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
                                phone_numbers, delivery_companies_id
                            )
                        ),
                        profiles(
                            id, full_name, email, username, profession, 
                            country, location, phone, website, avatar_url
                        ),
                        assigned_driver:delivery_drivers(
                            id, name, phone, avatar_url
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

                // Get delivery type from shipping_method - handle JSON string format
                const deliveryType = data.shipping_method === '"delivery"' || data.shipping_method === 'delivery' ? 'delivery' : 'pickup';

                const formattedOrder = {
                    id: data.id,
                    name: data.products?.title || 'Product',
                    image: data.products?.images?.[0] || null,
                    buyer: data.profiles?.full_name || shippingAddress.name || 'Unknown Customer',
                    date: data.created_at,
                    total: `$${calculateOrderTotal(data).toFixed(2)}`,
                    status: statusMap[data.status] || 'processing',
                    address: `${shippingAddress.address || ''}, ${shippingAddress.city || ''}, ${shippingAddress.zip || ''}`.trim(),
                    confirmed: data.confirmed || false,
                    comment: data.comment || '',
                    assigned_driver: data.assigned_driver || null,
                    delivery_type: deliveryType, // Calculate delivery_type from shipping_method
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

        fetchCurrentUser();
        fetchOrder();
        fetchComments();
        fetchTracking();
    }, [id]);

    // Fetch drivers function
    const fetchDrivers = async () => {
        try {
            // Get the shop's delivery company
            const { data: shopData } = await supabase.from('shops').select('delivery_companies_id').eq('id', order?.shop?.id).single();

            if (shopData?.delivery_companies_id) {
                // Fetch drivers for this delivery company
                const { data: driversData } = await supabase.from('delivery_drivers').select('id, name, phone, avatar_url').eq('delivery_companies_id', shopData.delivery_companies_id);

                setDrivers(driversData || []);
            }
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

    // Fetch drivers when order is loaded
    useEffect(() => {
        if (order?.shop?.id) {
            fetchDrivers();
        }
    }, [order?.shop?.id]);

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

            // Add tracking entry based on status
            let action = '';
            if (newStatus === 'completed') action = 'Completed';
            else if (newStatus === 'on_the_way') action = 'On The Way';
            else if (newStatus === 'processing') action = 'Processing';

            if (action) {
                await addTrackingEntry(action);
            }

            setOrder((prev: any) => (prev ? { ...prev, status: newStatus } : null));
            setAlert({ visible: true, message: 'Status updated successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error updating status', type: 'danger' });
        }
    };

    const handleConfirm = async () => {
        if (!order) return;
        try {
            // For delivery orders, set status to processing
            const newStatus = 'processing';

            const { error } = await supabase.from('orders').update({ confirmed: true, status: newStatus }).eq('id', order.id);

            if (error) throw error;

            // Add tracking entry
            await addTrackingEntry('Confirmed');

            setOrder((prev: any) => (prev ? { ...prev, confirmed: true, status: newStatus } : null));
            setShowConfirmModal(false);
            setAlert({ visible: true, message: 'Order confirmed successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error confirming order', type: 'danger' });
        }
    };

    const handleCommentSave = async (comment: string) => {
        if (!order || !currentUser) return;
        try {
            const { error } = await supabase.from('order_comments').insert({
                order_id: order.id,
                comment,
                user_id: currentUser.id,
            });

            if (error) throw error;

            // Refresh comments
            const { data } = await supabase
                .from('order_comments')
                .select(
                    `
                    *,
                    profiles(id, full_name)
                `,
                )
                .eq('order_id', order.id)
                .order('created_at', { ascending: false });

            setComments(data || []);
            setCurrentComment('');
            setIsEditingComment(false);
            setAlert({ visible: true, message: 'Comment saved successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error saving comment', type: 'danger' });
        }
    };

    const addTrackingEntry = async (action: string, metadata?: any) => {
        if (!order || !currentUser) {
            console.log('addTrackingEntry: Missing order or currentUser', { order: !!order, currentUser: !!currentUser });
            return;
        }
        try {
            console.log('Adding tracking entry:', { order_id: order.id, action, user_id: currentUser.id, metadata });
            const { error } = await supabase.from('order_tracking').insert({
                order_id: order.id,
                action,
                user_id: currentUser.id,
            });

            if (error) {
                console.error('Error inserting tracking entry:', error);
                throw error;
            }

            // Refresh tracking
            const { data } = await supabase
                .from('order_tracking')
                .select(
                    `
                    *,
                    profiles(id, full_name)
                `,
                )
                .eq('order_id', order.id)
                .order('created_at', { ascending: true });

            setTracking(data || []);
        } catch (error) {
            console.error('Error adding tracking entry:', error);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        try {
            const { error } = await supabase.from('order_comments').delete().eq('id', commentId);
            if (error) throw error;

            // Refresh comments
            const { data } = await supabase
                .from('order_comments')
                .select(
                    `
                    *,
                    profiles(id, full_name)
                `,
                )
                .eq('order_id', order.id)
                .order('created_at', { ascending: false });

            setComments(data || []);
            setAlert({ visible: true, message: 'Comment deleted successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting comment', type: 'danger' });
        }
    };

    const handleCancelOrder = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
            if (error) throw error;

            // Add comment
            if (comment.trim()) {
                await handleCommentSave(comment);
            }

            // Add tracking entry
            await addTrackingEntry('Cancelled');

            setOrder((prev: any) => (prev ? { ...prev, status: 'cancelled' } : null));
            setAlert({ visible: true, message: 'Order cancelled successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error cancelling order', type: 'danger' });
        }
    };

    const handleRejectOrder = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: 'rejected' }).eq('id', orderId);
            if (error) throw error;

            // Add comment
            if (comment.trim()) {
                await handleCommentSave(comment);
            }

            // Add tracking entry
            await addTrackingEntry('Rejected');

            setOrder((prev: any) => (prev ? { ...prev, status: 'rejected' } : null));
            setAlert({ visible: true, message: 'Order rejected successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error rejecting order', type: 'danger' });
        }
    };

    const handleAssignDriver = async (driverId: number) => {
        if (!order) return;
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    assigned_driver_id: driverId,
                    status: 'on_the_way', // Automatically change status to on_the_way
                })
                .eq('id', order.id);

            if (error) throw error;

            // Add tracking entry
            await addTrackingEntry('Driver Assigned');

            // Update order with new driver info
            const selectedDriver = drivers.find((d) => d.id === driverId);
            setOrder((prev: any) =>
                prev
                    ? {
                          ...prev,
                          assigned_driver_id: driverId,
                          assigned_driver: selectedDriver,
                          status: 'on_the_way',
                      }
                    : null,
            );

            setShowAssignModal(false);
            setAlert({ visible: true, message: 'Driver assigned successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error assigning driver', type: 'danger' });
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
                    <Link href="/delivery/orders" className="text-primary hover:underline">
                        Delivery Orders
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

                                {/* First row: Status, Type, Driver (for delivery orders), Cancel/Reject */}
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <strong>{t('status')}:</strong>
                                        <StatusComponent
                                            currentStatus={order.status}
                                            orderId={order.id}
                                            onStatusChange={(orderId, newStatus) => {
                                                if (newStatus === 'completed') {
                                                    setShowCompleteModal(true);
                                                } else {
                                                    handleStatusUpdate(orderId, newStatus);
                                                }
                                            }}
                                            isConfirmed={order.confirmed}
                                            onCompleteOrder={() => setShowCompleteModal(true)}
                                            onAssignDriver={() => setShowAssignModal(true)}
                                            hasAssignedDriver={!!order.assigned_driver}
                                            deliveryType={order.delivery_type || 'delivery'}
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <strong>Type:</strong>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                            Delivery
                                        </span>
                                    </div>

                                    {/* Driver info for delivery orders in processing/on_the_way/completed */}
                                    {order.delivery_type === 'delivery' && (order.status === 'processing' || order.status === 'on_the_way' || order.status === 'completed') && (
                                        <div className="flex items-center gap-2">
                                            <strong>Driver:</strong>
                                            {order.assigned_driver ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <IconUser className="h-3 w-3 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium">{order.assigned_driver.name}</div>
                                                        <div className="text-xs text-gray-500">{order.assigned_driver.phone}</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-sm">Unassigned</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Cancel/Reject button - only show for non-completed/non-archived orders */}
                                    {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'rejected' && (
                                        <button type="button" className="btn btn-sm btn-danger gap-1" title="Cancel/Reject Order" onClick={() => setShowDangerModal(true)}>
                                            <IconAlertTriangle className="h-4 w-4 text-white" />
                                            Cancel/Reject
                                        </button>
                                    )}
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
                                            <div className="flex justify-between items-center">
                                                <span>{t('shipping_method')}:</span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    Delivery
                                                </span>
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

                        {/* Comments Section */}
                        <div className="mt-8 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <h6 className="mb-4 text-lg font-semibold">Comments</h6>

                            {/* Comment Input */}
                            <div className="mb-4">
                                <textarea
                                    value={currentComment}
                                    onChange={(e) => setCurrentComment(e.target.value)}
                                    onFocus={() => setIsEditingComment(true)}
                                    placeholder="Add a comment..."
                                    className={`form-textarea w-full ${!isEditingComment ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                                    rows={3}
                                    readOnly={!isEditingComment}
                                />
                                {isEditingComment && (
                                    <div className="mt-2 flex gap-2">
                                        <button onClick={() => handleCommentSave(currentComment)} className="btn btn-primary btn-sm" disabled={!currentComment.trim()}>
                                            Save Comment
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingComment(false);
                                                setCurrentComment('');
                                            }}
                                            className="btn btn-outline btn-sm"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Comments List */}
                            <div className="space-y-3">
                                {comments.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No comments yet</p>
                                ) : (
                                    comments.map((comment) => (
                                        <div key={comment.id} className="border-l-4 border-primary pl-4 py-2 group">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium text-sm">{comment.profiles?.full_name || 'Unknown User'}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                                                    <button
                                                        onClick={() => handleDeleteComment(comment.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                                                        title="Delete comment"
                                                    >
                                                        <IconX className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{comment.comment}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Order Tracking Section */}
                        <div className="mt-6 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                            <h6 className="mb-4 text-lg font-semibold">Order Tracking</h6>

                            <div className="space-y-3">
                                {tracking.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No tracking information yet</p>
                                ) : (
                                    tracking.map((entry, index) => (
                                        <div key={entry.id} className="flex items-center gap-3">
                                            <div className="flex-shrink-0">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <span className="text-xs font-medium text-primary">{index + 1}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium text-sm">{entry.action}</span>
                                                    <span className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-400">by {entry.profiles?.full_name || 'Unknown User'}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <CommentModal order={order} isOpen={showCommentModal} onClose={() => setShowCommentModal(false)} onSave={(orderId: number, comment: string) => handleCommentSave(comment)} />
            <DangerModal order={order} isOpen={showDangerModal} onClose={() => setShowDangerModal(false)} onCancelOrder={handleCancelOrder} onRejectOrder={handleRejectOrder} />

            {/* Confirm Order Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Confirm Order</h3>
                        <p className="mb-6">Are you sure you want to confirm this delivery order?</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowConfirmModal(false)} className="btn btn-outline">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleConfirm();
                                    setShowConfirmModal(false);
                                }}
                                className="btn btn-success"
                            >
                                Yes, Confirm Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Order Modal */}
            {showCompleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Complete Order</h3>
                        <p className="mb-6">Are you sure you want to mark this order as completed? This action cannot be undone.</p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowCompleteModal(false)} className="btn btn-outline">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    handleStatusUpdate(order.id, 'completed');
                                    setShowCompleteModal(false);
                                }}
                                className="btn btn-success"
                            >
                                Yes, Complete Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Driver Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Assign Driver</h3>
                        <p className="mb-4">Select a driver to assign to this order:</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {drivers.length === 0 ? (
                                <p className="text-gray-500 text-sm">No drivers available</p>
                            ) : (
                                drivers.map((driver) => (
                                    <button
                                        key={driver.id}
                                        onClick={() => handleAssignDriver(driver.id)}
                                        className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <IconUser className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-medium">{driver.name}</div>
                                            <div className="text-sm text-gray-500">{driver.phone}</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                            <button onClick={() => setShowAssignModal(false)} className="btn btn-outline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

export default PreviewDeliveryOrder;

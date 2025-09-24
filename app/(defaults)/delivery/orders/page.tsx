'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconPrinter from '@/components/icon/icon-printer';
import IconDownload from '@/components/icon/icon-download';
import IconUser from '@/components/icon/icon-user';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMessage from '@/components/icon/icon-message';
import IconDotsVertical from '@/components/icon/icon-dots-vertical';
import IconX from '@/components/icon/icon-x';
import IconCheck from '@/components/icon/icon-check';
import IconAlertTriangle from '@/components/icon/icon-info-triangle';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import IconClock from '@/components/icon/icon-clock';
import IconSettings from '@/components/icon/icon-settings';
import IconTruck from '@/components/icon/icon-truck';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import { generateOrderReceiptPDF } from '@/utils/pdf-generator';
import supabase from '@/lib/supabase';
import DateRangeSelector from '@/components/date-range-selector';
import MultiSelect from '@/components/multi-select';
import { calculateOrderTotal } from '@/utils/order-calculations';

// Comment Modal Component
const CommentModal = ({
    order,
    isOpen,
    onClose,
    onSave,
    onRefreshComments,
}: {
    order: any;
    isOpen: boolean;
    onClose: () => void;
    onSave: (orderId: number, comment: string) => void;
    onRefreshComments: () => void;
}) => {
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        if (order && isOpen) {
            setComment('');
            fetchComments();
            fetchCurrentUser();
        }
    }, [order, isOpen]);

    const fetchComments = async () => {
        if (!order) return;
        try {
            const { data, error } = await supabase
                .from('order_comments')
                .select(
                    `
                    *,
                    profiles(id, full_name)
                `,
                )
                .eq('order_id', order.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setComments(data || []);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

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

    const handleSaveComment = async () => {
        if (!order || !currentUser || !comment.trim()) return;
        try {
            setLoading(true);
            const { error } = await supabase.from('order_comments').insert({
                order_id: order.id,
                comment: comment.trim(),
                user_id: currentUser.id,
            });

            if (error) throw error;

            await fetchComments();
            setComment('');
            // Refresh the orders with comments list
            onRefreshComments();
        } catch (error) {
            console.error('Error saving comment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        try {
            const { error } = await supabase.from('order_comments').delete().eq('id', commentId);
            if (error) throw error;
            await fetchComments();
            // Refresh the orders with comments list
            onRefreshComments();
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Order Comments</h3>

                {/* Add New Comment */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Add Comment:</label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="form-textarea w-full h-24 resize-none" placeholder="Add a comment for this order..." />
                    <div className="flex gap-2 justify-end mt-2">
                        <button onClick={handleSaveComment} className="btn btn-primary btn-sm" disabled={loading || !comment.trim()}>
                            {loading ? 'Saving...' : 'Save Comment'}
                        </button>
                    </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400">Previous Comments:</h4>
                    {comments.length === 0 ? (
                        <p className="text-gray-500 text-sm">No comments yet</p>
                    ) : (
                        comments.map((commentItem) => (
                            <div key={commentItem.id} className="border-l-4 border-primary pl-4 py-2 group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-sm">{commentItem.profiles?.full_name || 'Unknown User'}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500">{new Date(commentItem.created_at).toLocaleString()}</span>
                                        <button
                                            onClick={() => handleDeleteComment(commentItem.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                                            title="Delete comment"
                                        >
                                            <IconX className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{commentItem.comment}</p>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex gap-2 justify-end mt-6">
                    <button onClick={onClose} className="btn btn-outline">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Tooltip Component for Order Total Breakdown
const OrderTotalTooltip = ({ order }: { order: any }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const iconRef = useRef<HTMLDivElement>(null);

    const calculateSubtotal = () => {
        if (!order) return 0;
        return order.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    };

    const calculateDeliveryFee = () => {
        if (!order?.delivery_methods) return 0;
        const basePrice = order.delivery_methods.price || 0;
        const locationAddition = order.delivery_location_methods?.price_addition || 0;
        return basePrice + locationAddition;
    };

    const calculateFeaturesTotal = () => {
        if (!order?.selected_features) return 0;
        return order.selected_features.reduce((sum: number, feature: any) => sum + (feature.price_addition || 0), 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateDeliveryFee() + calculateFeaturesTotal();
    };

    const hasDeliveryOrFeatures = order?.delivery_methods || (order?.selected_features && order.selected_features.length > 0);

    if (!hasDeliveryOrFeatures) return null;

    return (
        <div
            ref={iconRef}
            className="relative inline-block"
            onMouseEnter={() => {
                if (iconRef.current) {
                    const rect = iconRef.current.getBoundingClientRect();
                    setPosition({
                        top: rect.top - 10,
                        left: rect.left + rect.width / 2,
                    });
                }
                setIsVisible(true);
            }}
            onMouseLeave={() => {
                setIsVisible(false);
            }}
        >
            <IconInfoCircle className="h-4 w-4 text-blue-500 hover:text-blue-700 cursor-pointer ml-1" />
            {isVisible &&
                createPortal(
                    <div
                        className="fixed z-[9999] w-56 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
                        style={{
                            top: `${position.top}px`,
                            left: `${position.left}px`,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>${calculateSubtotal().toFixed(2)}</span>
                            </div>

                            {order?.delivery_methods && (
                                <>
                                    <div className="flex justify-between">
                                        <span>Delivery ({order.delivery_methods.label}):</span>
                                        <span>${order.delivery_methods.price?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    {order?.delivery_location_methods && order.delivery_location_methods.location_name && order.delivery_location_methods.price_addition > 0 && (
                                        <div className="flex justify-between">
                                            <span>Location ({order.delivery_location_methods.location_name}):</span>
                                            <span>+${order.delivery_location_methods.price_addition.toFixed(2)}</span>
                                        </div>
                                    )}
                                </>
                            )}

                            {order?.selected_features && order.selected_features.length > 0 && (
                                <div className="space-y-1">
                                    <div className="font-medium">Features:</div>
                                    {order.selected_features.map((feature: any, index: number) => (
                                        <div key={index} className="flex justify-between">
                                            <span>
                                                {feature.label}: {feature.value}
                                            </span>
                                            <span>+${(feature.price_addition || 0).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-1 font-bold">
                                <span>Total:</span>
                                <span className="text-green-600 dark:text-green-400">${calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>,
                    document.body,
                )}
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

// Actions Menu Component
const ActionsMenu = ({ orderId, onView, onDownload, onDelete }: { orderId: number; onView: () => void; onDownload: () => void; onDelete: () => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
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
            setMenuPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX - 100, // Offset to align menu properly
            });
        }
    }, [isOpen]);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                className="hover:text-gray-600 dark:hover:text-gray-300"
                title="More Actions"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
            >
                <IconDotsVertical className="h-5 w-5" />
            </button>

            {isOpen &&
                createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[9999] rounded-md border border-gray-300 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800"
                        style={{
                            top: menuPosition.top,
                            left: menuPosition.left,
                            minWidth: '120px',
                        }}
                    >
                        <button
                            className="w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 first:rounded-t-md"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction(onView);
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <IconEye className="h-4 w-4" />
                                View Order
                            </div>
                        </button>
                        <button
                            className="w-full px-3 py-2 text-left text-xs text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction(onDownload);
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <IconDownload className="h-4 w-4" />
                                Download PDF
                            </div>
                        </button>
                        <button
                            className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 last:rounded-b-md"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAction(onDelete);
                            }}
                        >
                            <div className="flex items-center gap-2">
                                <IconTrashLines className="h-4 w-4" />
                                Delete Order
                            </div>
                        </button>
                    </div>,
                    document.body,
                )}
        </>
    );
};

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
    comment?: string;
    selected_feature_value_ids?: number[];
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
    delivery_methods?: {
        id: number;
        label: string;
        delivery_time: string;
        price: number;
    };
    delivery_location_methods?: {
        id: number;
        location_name: string;
        price_addition: number;
    };
    selected_features?: Array<{
        label: string;
        value: string;
        price_addition: number;
    }>;
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
    const deliveryType = order.shipping_method === '"delivery"' || order.shipping_method === 'delivery' || shippingMethod?.type === 'delivery' ? 'delivery' : 'pickup';

    // Map database status to display status
    const statusMap: { [key: string]: 'processing' | 'on_the_way' | 'completed' | 'cancelled' | 'rejected' } = {
        Active: 'processing',
        Completed: 'completed',
        Cancelled: 'cancelled', // Keep cancelled as cancelled
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

    return {
        id: order.id,
        name: order.products?.title || 'Product',
        image: order.products?.images?.[0] || null,
        buyer: order.profiles?.full_name || shippingAddress.name || 'Unknown Customer',
        shop_name: order.products?.shops?.[0]?.shop_name || 'Unknown Shop',
        city: shippingAddress.city || 'Unknown City',
        date: order.created_at,
        total: `$${calculateOrderTotal(order).toFixed(2)}`,
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
        comment: order.comment || '',
        delivery_methods: order.delivery_methods,
        delivery_location_methods: order.delivery_location_methods,
        selected_features: order.selected_features || [],
    };
};

interface Order {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    date: string;
    total: string;
    status: 'processing' | 'on_the_way' | 'completed';
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
    const [deliveryFilter, setDeliveryFilter] = useState('processing'); // 'processing', 'on_the_way', 'completed', 'archived'
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'date',
        direction: 'desc',
    });
    const [dateRange, setDateRange] = useState<Date[]>([]);
    const [selectedShops, setSelectedShops] = useState<number[]>([]);
    const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
    const [availableShops, setAvailableShops] = useState<any[]>([]);
    const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
    const [ordersWithComments, setOrdersWithComments] = useState<Set<number>>(new Set());
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showDangerModal, setShowDangerModal] = useState(false);
    const [selectedOrderForComment, setSelectedOrderForComment] = useState<any>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [orderToComplete, setOrderToComplete] = useState<any>(null);
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
        fetchShops();
        fetchDrivers();
        fetchOrdersWithComments();
        fetchCurrentUser();
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

            let matchesFilter = true;

            // For archived orders, show delivery orders that are cancelled or rejected
            if (deliveryFilter === 'archived') {
                const isDelivery = item.delivery_type === 'delivery';
                const isCancelledOrRejected = item.status === 'cancelled' || item.status === 'rejected';
                matchesFilter = isDelivery && isCancelledOrRejected;

                console.log('Archived check:', {
                    id: item.id,
                    delivery_type: item.delivery_type,
                    status: item.status,
                    isDelivery,
                    isCancelledOrRejected,
                    matches: matchesFilter,
                });
            } else {
                // For other filters, only show confirmed delivery orders
                if (item.confirmed !== true || item.delivery_type !== 'delivery') {
                    matchesFilter = false;
                } else {
                    // Filter by status
                    if (deliveryFilter === 'processing') {
                        matchesFilter = item.status === 'processing';
                    } else if (deliveryFilter === 'on_the_way') {
                        matchesFilter = item.status === 'on_the_way';
                    } else if (deliveryFilter === 'completed') {
                        matchesFilter = item.status === 'completed';
                    }
                }
            }

            // Filter by date range
            if (dateRange.length === 2) {
                const itemDate = new Date(item.date);
                if (itemDate < dateRange[0] || itemDate > dateRange[1]) {
                    matchesFilter = false;
                }
            }

            // Filter by selected shops
            if (selectedShops.length > 0) {
                const shopId = item.products?.shops?.[0]?.id;
                if (!shopId || !selectedShops.includes(shopId)) {
                    matchesFilter = false;
                }
            }

            // Filter by selected drivers
            if (selectedDrivers.length > 0) {
                const driverId = item.assigned_driver_id;
                if (!driverId || !selectedDrivers.includes(driverId)) {
                    matchesFilter = false;
                }
            }

            return matchesSearch && matchesFilter;
        });
        setInitialRecords(filtered);
    }, [search, displayItems, deliveryFilter, dateRange, selectedShops, selectedDrivers]);

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
            const { error } = await supabase
                .from('orders')
                .update({
                    assigned_driver_id: driverId,
                    status: 'on_the_way', // Automatically change status to on_the_way when driver is assigned
                })
                .eq('id', orderId);

            if (error) throw error;

            // Refresh the data to get the assigned driver info
            await fetchOrders();
            setAlert({ visible: true, message: 'Driver assigned successfully and order moved to On The Way', type: 'success' });

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

    const handleStatusUpdate = async (orderId: number, newStatus: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);

            if (error) throw error;

            // Update local state immediately for better UX
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, status: newStatus } : item));
            setItems(updatedItems);

            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, status: newStatus } : item));
            setDisplayItems(updatedDisplayItems);

            setAlert({ visible: true, message: 'Order status updated successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error updating order status', type: 'danger' });
        }
    };

    const handleTypeUpdate = async (orderId: number, newType: string) => {
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    shipping_method: `"${newType}"`,
                })
                .eq('id', orderId);

            if (error) throw error;

            // Update local state immediately for better UX
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, delivery_type: newType } : item));
            setItems(updatedItems);

            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, delivery_type: newType } : item));
            setDisplayItems(updatedDisplayItems);

            setAlert({ visible: true, message: 'Order type updated successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error updating order type', type: 'danger' });
        }
    };

    const handleCommentSave = async (orderId: number, comment: string) => {
        if (!currentUser) return;
        try {
            const { error } = await supabase.from('order_comments').insert({
                order_id: orderId,
                comment,
                user_id: currentUser.id,
            });
            if (error) throw error;
            setAlert({ visible: true, message: 'Comment saved successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error saving comment', type: 'danger' });
        }
    };

    const addTrackingEntry = async (orderId: number, action: string) => {
        if (!currentUser) return;
        try {
            const { error } = await supabase.from('order_tracking').insert({
                order_id: orderId,
                action,
                user_id: currentUser.id,
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error adding tracking entry:', error);
        }
    };

    const fetchOrdersWithComments = async () => {
        try {
            const { data, error } = await supabase.from('order_comments').select('order_id').not('order_id', 'is', null);

            if (error) throw error;

            const orderIdsWithComments = new Set(data.map((item) => item.order_id));
            setOrdersWithComments(orderIdsWithComments);
        } catch (error) {
            console.error('Error fetching orders with comments:', error);
        }
    };

    const handleCancelOrder = async (orderId: number, comment: string) => {
        try {
            // Update order status
            const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
            if (error) throw error;

            // Add comment if provided
            if (comment.trim()) {
                await handleCommentSave(orderId, comment);
            }

            // Add tracking entry
            await addTrackingEntry(orderId, 'Order Cancelled');

            // Update local state
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, status: 'cancelled' } : item));
            setItems(updatedItems);
            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, status: 'cancelled' } : item));
            setDisplayItems(updatedDisplayItems);

            setAlert({ visible: true, message: 'Order cancelled successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error cancelling order', type: 'danger' });
        }
    };

    const handleRejectOrder = async (orderId: number, comment: string) => {
        try {
            // Update order status
            const { error } = await supabase.from('orders').update({ status: 'rejected' }).eq('id', orderId);
            if (error) throw error;

            // Add comment if provided
            if (comment.trim()) {
                await handleCommentSave(orderId, comment);
            }

            // Add tracking entry
            await addTrackingEntry(orderId, 'Order Rejected');

            // Update local state
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, status: 'rejected' } : item));
            setItems(updatedItems);
            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, status: 'rejected' } : item));
            setDisplayItems(updatedDisplayItems);

            setAlert({ visible: true, message: 'Order rejected successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error rejecting order', type: 'danger' });
        }
    };

    const handleCompleteOrder = async (order: any) => {
        if (!order) return;

        try {
            const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id);

            if (error) throw error;

            // Refresh the data
            await fetchOrders();
            setAlert({ visible: true, message: 'Order completed successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error completing order', type: 'danger' });
        }
        setShowCompleteModal(false);
        setOrderToComplete(null);
    };

    const fetchShops = async () => {
        try {
            const { data, error } = await supabase.from('shops').select('id, shop_name, logo_url').order('shop_name');
            if (error) throw error;
            setAvailableShops(data || []);
        } catch (error) {
            console.error('Error fetching shops:', error);
        }
    };

    const fetchDrivers = async () => {
        try {
            const { data, error } = await supabase.from('delivery_drivers').select('id, name, phone, avatar_url').order('name');
            if (error) throw error;
            setAvailableDrivers(data || []);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        }
    };

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

    const fetchOrders = async () => {
        try {
            // Build query with filters
            let query = supabase.from('orders').select(
                `
                    *,
                    products(id, title, price, images, shop),
                    profiles(id, full_name, email),
                    assigned_driver:delivery_drivers(id, name, phone, avatar_url),
                    delivery_methods(id, label, delivery_time, price),
                    delivery_location_methods(id, location_name, price_addition)
                `,
            );

            // Apply date range filter
            if (dateRange.length === 2) {
                query = query.gte('created_at', dateRange[0].toISOString()).lte('created_at', dateRange[1].toISOString());
            }

            // Apply delivery type filter - only delivery orders
            // shipping_method is stored as a JSON string "delivery"
            query = query.eq('shipping_method', '"delivery"');

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch selected features for orders that have them
            const ordersWithFeatures = data.filter((order) => order.selected_feature_value_ids && order.selected_feature_value_ids.length > 0);

            if (ordersWithFeatures.length > 0) {
                const allFeatureValueIds = ordersWithFeatures.flatMap((order) => order.selected_feature_value_ids);

                const { data: featuresData, error: featuresError } = await supabase
                    .from('products_features_values')
                    .select(
                        `
                        id, value, price_addition,
                        products_features_labels!inner(label)
                    `,
                    )
                    .in('id', allFeatureValueIds);

                if (!featuresError && featuresData) {
                    // Add features to orders
                    data.forEach((order) => {
                        if (order.selected_feature_value_ids && order.selected_feature_value_ids.length > 0) {
                            order.selected_features = order.selected_feature_value_ids
                                .map((id: number) => {
                                    const feature = featuresData.find((f: any) => f.id === id);
                                    return feature
                                        ? {
                                              label: feature.products_features_labels[0].label,
                                              value: feature.value,
                                              price_addition: feature.price_addition,
                                          }
                                        : null;
                                })
                                .filter(Boolean);
                        }
                    });
                }
            }

            // Debug: show what orders were fetched
            console.log('Fetched orders:', data?.length || 0);
            if (data && data.length > 0) {
                const statusCounts = data.reduce((acc: any, order: any) => {
                    acc[order.status] = (acc[order.status] || 0) + 1;
                    return acc;
                }, {});
                console.log('Status counts:', statusCounts);
            }

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
                {/* Complete Order Modal */}
                <ConfirmModal
                    isOpen={showCompleteModal}
                    title="Complete Order"
                    message="Are you sure you want to mark this order as completed? This action cannot be undone."
                    onConfirm={() => handleCompleteOrder(orderToComplete)}
                    onCancel={() => {
                        setShowCompleteModal(false);
                        setOrderToComplete(null);
                    }}
                    confirmLabel="Yes, Complete Order"
                />
                {/* Comment Modal */}
                <CommentModal
                    order={selectedOrderForComment}
                    isOpen={showCommentModal}
                    onClose={() => {
                        setShowCommentModal(false);
                        setSelectedOrderForComment(null);
                    }}
                    onSave={handleCommentSave}
                    onRefreshComments={fetchOrdersWithComments}
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
                {/* Filters Panel */}
                <div className="panel mb-6 w-full max-w-none">
                    <div className="mb-4 flex items-center gap-2">
                        <IconSettings className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold text-black dark:text-white-light">Filters</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                        {/* Date Range Filter */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</label>
                            <DateRangeSelector value={dateRange} onChange={setDateRange} placeholder="Select date range" isRtl={false} />
                        </div>

                        {/* Shop Filter */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Shops</label>
                            <MultiSelect
                                options={availableShops.map((shop) => ({ id: shop.id, name: shop.shop_name, logo_url: shop.logo_url }))}
                                selectedValues={selectedShops}
                                onChange={setSelectedShops}
                                placeholder="Select shops"
                                isRtl={false}
                            />
                        </div>

                        {/* Driver Filter */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Driver</label>
                            <MultiSelect
                                options={availableDrivers.map((driver) => ({ id: driver.id, name: `${driver.name} - ${driver.phone}`, logo_url: driver.avatar_url }))}
                                selectedValues={selectedDrivers}
                                onChange={setSelectedDrivers}
                                placeholder="Select drivers"
                                isRtl={false}
                            />
                        </div>

                        {/* Clear Filters */}
                        <div className="flex items-end">
                            <button
                                type="button"
                                className="btn btn-outline-danger w-full"
                                onClick={() => {
                                    setDateRange([]);
                                    setSelectedShops([]);
                                    setSelectedDrivers([]);
                                }}
                            >
                                <IconX className="h-4 w-4 mr-2" />
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                <div className="invoice-table overflow-x-auto w-full max-w-none">
                    <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                        <div className="flex flex-wrap gap-3">
                            {/* Processing */}
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryFilter('processing')}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 border-2 ${
                                        deliveryFilter === 'processing'
                                            ? 'bg-gradient-to-r from-info to-blue-500 text-white border-info shadow-lg'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-info hover:shadow-md'
                                    }`}
                                >
                                    <IconSettings className={`h-4 w-4 ${deliveryFilter === 'processing' ? 'text-white' : 'text-info'}`} />
                                    Processing
                                </button>
                            </div>

                            {/* On The Way */}
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryFilter('on_the_way')}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 border-2 ${
                                        deliveryFilter === 'on_the_way'
                                            ? 'bg-gradient-to-r from-warning to-orange-500 text-white border-warning shadow-lg'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-warning hover:shadow-md'
                                    }`}
                                >
                                    <IconTruck className={`h-4 w-4 ${deliveryFilter === 'on_the_way' ? 'text-white' : 'text-warning'}`} />
                                    On The Way
                                </button>
                            </div>

                            {/* Completed */}
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryFilter('completed')}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 border-2 ${
                                        deliveryFilter === 'completed'
                                            ? 'bg-gradient-to-r from-success to-green-500 text-white border-success shadow-lg'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-success hover:shadow-md'
                                    }`}
                                >
                                    <IconCheck className={`h-4 w-4 ${deliveryFilter === 'completed' ? 'text-white' : 'text-success'}`} />
                                    Completed
                                </button>
                            </div>

                            {/* Archived - Icon Only */}
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryFilter('archived')}
                                    className={`p-2 rounded-xl transition-all duration-200 border-2 ${
                                        deliveryFilter === 'archived'
                                            ? 'bg-gradient-to-r from-danger to-red-500 text-white border-danger shadow-lg'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-danger hover:shadow-md'
                                    }`}
                                    title="Archived Orders"
                                >
                                    <IconX className={`h-5 w-5 ${deliveryFilter === 'archived' ? 'text-white' : 'text-danger'}`} />
                                </button>
                            </div>
                        </div>
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
                                router.push(`/delivery/orders/preview/${record.id}`);
                            }}
                            columns={[
                                {
                                    accessor: 'id',
                                    title: t('order_id'),
                                    sortable: true,
                                    render: ({ id }) => <strong className="text-info">#{id}</strong>,
                                },
                                {
                                    accessor: 'date',
                                    title: t('date'),
                                    sortable: true,
                                    render: ({ date }) => new Date(date).toLocaleDateString(),
                                },
                                {
                                    accessor: 'shop_name',
                                    title: t('shop_name'),
                                    sortable: true,
                                    render: ({ shop_name }) => <span className="font-medium">{shop_name}</span>,
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
                                    accessor: 'city',
                                    title: t('city'),
                                    sortable: true,
                                    render: ({ city }) => <span className="">{city}</span>,
                                },
                                {
                                    accessor: 'total',
                                    title: t('total'),
                                    sortable: true,
                                    render: (record: any) => (
                                        <div className="flex items-center">
                                            <span className="font-semibold text-success">{record.total}</span>
                                            <OrderTotalTooltip order={record} />
                                        </div>
                                    ),
                                },
                                {
                                    accessor: 'payment_method',
                                    title: 'Payment',
                                    sortable: true,
                                    width: 120,
                                    render: ({ payment_method }) => {
                                        if (!payment_method) return <span className="text-gray-500">-</span>;

                                        const paymentType = payment_method.type || payment_method;
                                        const getPaymentBadge = (type: string) => {
                                            switch (type) {
                                                case 'Credit Card':
                                                    return (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary whitespace-nowrap">
                                                            Credit Card
                                                        </span>
                                                    );
                                                case 'Bank Transfer':
                                                    return (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info whitespace-nowrap">
                                                            Bank Transfer
                                                        </span>
                                                    );
                                                case 'Cash on Delivery':
                                                    return (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning whitespace-nowrap">
                                                            Cash on Delivery
                                                        </span>
                                                    );
                                                case 'In-store':
                                                    return (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success whitespace-nowrap">
                                                            In-store
                                                        </span>
                                                    );
                                                default:
                                                    return (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary whitespace-nowrap">
                                                            {type}
                                                        </span>
                                                    );
                                            }
                                        };

                                        return getPaymentBadge(paymentType);
                                    },
                                },
                                {
                                    accessor: 'delivery_type',
                                    title: 'Type',
                                    sortable: true,
                                    render: ({ delivery_type }) => (
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                delivery_type === 'delivery' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                                            }`}
                                        >
                                            {delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
                                        </span>
                                    ),
                                },
                                {
                                    accessor: 'status',
                                    title: t('status'),
                                    sortable: true,
                                    render: ({ status, id, assigned_driver }) => {
                                        // Show Complete Order button for on_the_way status
                                        if (status === 'on_the_way') {
                                            return (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-success btn-sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const order = displayItems.find((d) => d.id === id);
                                                        setOrderToComplete(order);
                                                        setShowCompleteModal(true);
                                                    }}
                                                >
                                                    Complete Order
                                                </button>
                                            );
                                        }

                                        // Show status as label for other statuses
                                        const statusConfig = {
                                            processing: { color: 'bg-info/10 text-info', label: 'Processing' },
                                            completed: { color: 'bg-success/10 text-success', label: 'Completed' },
                                            cancelled: { color: 'bg-danger/10 text-danger', label: 'Cancelled' },
                                            rejected: { color: 'bg-danger/10 text-danger', label: 'Rejected' },
                                        };

                                        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', label: status };

                                        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>{config.label}</span>;
                                    },
                                },
                                {
                                    accessor: 'assigned_driver',
                                    title: 'Driver',
                                    sortable: false,
                                    render: ({ assigned_driver, id, status }) => {
                                        if (assigned_driver) {
                                            return (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <IconUser className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{assigned_driver.name}</div>
                                                        <div className="text-xs text-gray-500">{assigned_driver.phone}</div>
                                                    </div>
                                                    {/* Only show unassign button for processing status */}
                                                    {status === 'processing' && (
                                                        <button
                                                            type="button"
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded-full"
                                                            title="Unassign Driver"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveDriver(id);
                                                            }}
                                                        >
                                                            <IconX className="h-4 w-4 text-red-500" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }
                                        // Only show assign button for processing status
                                        if (status === 'processing') {
                                            return (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-success btn-sm"
                                                    title="Assign Driver"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const order = displayItems.find((d) => d.id === id);
                                                        setSelectedOrder(order);
                                                        setShowAssignModal(true);
                                                    }}
                                                >
                                                    <IconUser className="h-4 w-4" />
                                                    <span className="ml-1">ASSIGN</span>
                                                </button>
                                            );
                                        }
                                        // Show "Unassigned" for other statuses
                                        return <span className="text-gray-500 text-sm">Unassigned</span>;
                                    },
                                },
                                {
                                    accessor: 'action',
                                    title: t('actions'),
                                    titleClassName: '!text-center',
                                    render: ({ id }) => {
                                        const order = displayItems.find((d) => d.id === id);
                                        const showDangerIcon = order?.status === 'processing' || order?.status === 'on_the_way';

                                        return (
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    className="hover:text-warning relative"
                                                    title="Add Comment"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedOrderForComment(order);
                                                        setShowCommentModal(true);
                                                    }}
                                                >
                                                    <IconMessage className="h-5 w-5" />
                                                    {ordersWithComments.has(id) ? <span className="absolute -top-1 -right-1 h-2 w-2 bg-warning rounded-full"></span> : null}
                                                </button>
                                                {showDangerIcon && (
                                                    <button
                                                        type="button"
                                                        className="hover:text-danger"
                                                        title="Cancel/Reject Order"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOrderForComment(order);
                                                            setShowDangerModal(true);
                                                        }}
                                                    >
                                                        <IconAlertTriangle className="h-5 w-5" />
                                                    </button>
                                                )}
                                                <ActionsMenu
                                                    orderId={id}
                                                    onView={() => router.push(`/delivery/orders/preview/${id}`)}
                                                    onDownload={() => handleDownloadOrderPDF(id)}
                                                    onDelete={() => {
                                                        const order = items.find((d) => d.id === id);
                                                        setOrderToDelete(order || null);
                                                        setShowConfirmModal(true);
                                                    }}
                                                />
                                            </div>
                                        );
                                    },
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

            {/* Modals */}
            <CommentModal
                order={selectedOrderForComment}
                isOpen={showCommentModal}
                onClose={() => {
                    setShowCommentModal(false);
                    setSelectedOrderForComment(null);
                }}
                onSave={handleCommentSave}
                onRefreshComments={fetchOrdersWithComments}
            />
            <DangerModal
                order={selectedOrderForComment}
                isOpen={showDangerModal}
                onClose={() => {
                    setShowDangerModal(false);
                    setSelectedOrderForComment(null);
                }}
                onCancelOrder={handleCancelOrder}
                onRejectOrder={handleRejectOrder}
            />
        </div>
    );
};

export default DeliveryOrdersList;

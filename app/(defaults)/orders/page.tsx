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
import IconAlertTriangle from '@/components/icon/icon-info-triangle';
import IconDotsVertical from '@/components/icon/icon-dots-vertical';
import IconCheck from '@/components/icon/icon-check';
import IconX from '@/components/icon/icon-x';
import IconClock from '@/components/icon/icon-clock';
import IconSettings from '@/components/icon/icon-settings';
import IconTruck from '@/components/icon/icon-truck';
import IconCalendar from '@/components/icon/icon-calendar';
import IconPackage from '@/components/icon/icon-package';
import IconChevronDown from '@/components/icon/icon-chevron-down';
import IconChevronUp from '@/components/icon/icon-chevron-up';
import IconInfoCircle from '@/components/icon/icon-info-circle';
import IconLayoutGrid from '@/components/icon/icon-layout-grid';
import IconListCheck from '@/components/icon/icon-list-check';
import IconSearch from '@/components/icon/icon-search';
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
import HorizontalFilter from '@/components/filters/horizontal-filter';
import { useAuth } from '@/hooks/useAuth';

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
        return parseFloat(order?.total) || 0;
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

// Delivery Type Dropdown Component
const DeliveryTypeDropdown = ({
    currentType,
    orderId,
    onTypeChange,
    isConfirmed,
}: {
    currentType: string;
    orderId: number;
    onTypeChange: (orderId: number, newType: string) => void;
    isConfirmed: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [pendingType, setPendingType] = useState<string>('');
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const typeOptions = [
        { value: 'pickup', label: 'Pickup', color: 'text-secondary' },
        { value: 'delivery', label: 'Delivery', color: 'text-primary' },
    ];

    const currentOption = typeOptions.find((option) => option.value === currentType) || typeOptions[0];

    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleTypeSelect = (type: string) => {
        if (type !== currentType) {
            setPendingType(type);
            setShowConfirmModal(true);
        }
        setIsOpen(false);
    };

    const handleConfirmTypeChange = () => {
        onTypeChange(orderId, pendingType);
        setShowConfirmModal(false);
        setPendingType('');
    };

    const handleCancelTypeChange = () => {
        setShowConfirmModal(false);
        setPendingType('');
    };

    // If confirmed, show as read-only label
    if (isConfirmed) {
        return (
            <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    currentType === 'delivery' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}
            >
                {currentOption.label}
            </span>
        );
    }

    return (
        <>
            <div ref={triggerRef} className="relative">
                <div
                    className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 min-w-[100px]"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    <span className={`text-xs font-medium ${currentOption.color}`}>{currentOption.label}</span>
                    <IconCaretDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className="absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg z-50 min-w-[120px]"
                        style={{
                            top: (triggerRef.current?.getBoundingClientRect().bottom || 0) + window.scrollY + 4,
                            left: (triggerRef.current?.getBoundingClientRect().left || 0) + window.scrollX,
                        }}
                    >
                        {typeOptions.map((option) => (
                            <div
                                key={option.value}
                                className="px-3 py-2 text-xs first:rounded-t-md last:rounded-b-md cursor-pointer text-gray-800 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleTypeSelect(option.value);
                                }}
                            >
                                <span className={option.color}>{option.label}</span>
                            </div>
                        ))}
                    </div>,
                    document.body,
                )}

            <ConfirmModal
                isOpen={showConfirmModal}
                onCancel={handleCancelTypeChange}
                onConfirm={handleConfirmTypeChange}
                title="Change Order Type"
                message={`Are you sure you want to change this order to ${pendingType === 'delivery' ? 'Delivery' : 'Pickup'}?`}
            />
        </>
    );
};

// Status Component with simplified flow
const StatusComponent = ({
    currentStatus,
    orderId,
    onStatusChange,
    deliveryType,
    isConfirmed,
    onConfirm,
    onUnconfirm,
    onOpenCommentModal,
    onCompleteOrder,
    hasAssignedDriver,
}: {
    currentStatus: string;
    orderId: number;
    onStatusChange: (orderId: number, newStatus: string) => void;
    deliveryType: string;
    isConfirmed: boolean;
    onConfirm: (orderId: number) => void;
    onUnconfirm: (orderId: number) => void;
    onOpenCommentModal: (orderId: number) => void;
    onCompleteOrder: (orderId: number) => void;
    hasAssignedDriver?: boolean;
}) => {
    // If not confirmed, show confirm button
    if (!isConfirmed) {
        return (
            <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onConfirm(orderId);
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
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                {currentStatus === 'cancelled' ? 'Cancelled' : 'Rejected'}
            </span>
        );
    }

    // For delivery orders after confirmation, show as read-only label
    if (deliveryType === 'delivery' && isConfirmed) {
        const statusLabels: { [key: string]: string } = {
            processing: 'Processing',
            on_the_way: 'On The Way',
            completed: 'Completed',
        };

        const statusColors: { [key: string]: string } = {
            processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            on_the_way: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };

        return (
            <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[currentStatus] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}
            >
                {statusLabels[currentStatus] || currentStatus}
            </span>
        );
    }

    // For pickup orders with ready_for_pickup status, show complete order button
    if (deliveryType === 'pickup' && currentStatus === 'ready_for_pickup') {
        return (
            <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={(e) => {
                    e.stopPropagation();
                    onCompleteOrder(orderId);
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
            const viewportWidth = window.innerWidth;
            const menuWidth = 120; // Approximate menu width

            // Calculate left position to keep menu in viewport
            let left = rect.left + window.scrollX;
            if (left + menuWidth > viewportWidth) {
                left = viewportWidth - menuWidth - 10; // 10px margin from edge
            }

            setMenuPosition({
                top: rect.bottom + window.scrollY + 4,
                left: left,
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
                    e.preventDefault();
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
                        className="fixed z-[99999] rounded-md border border-gray-300 bg-white shadow-xl dark:border-gray-600 dark:bg-gray-800"
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
                // Get the shop's delivery companies through the junction table
                const { data: shopDeliveryData } = await supabase.from('shop_delivery_companies').select('delivery_company_id').eq('shop_id', productData.shop).eq('is_active', true);

                if (shopDeliveryData && shopDeliveryData.length > 0) {
                    // Get all delivery company IDs for this shop
                    const deliveryCompanyIds = shopDeliveryData.map((sdc) => sdc.delivery_company_id);

                    // Fetch drivers for these delivery companies
                    const { data: driversData } = await supabase.from('delivery_drivers').select('id, name, phone, avatar_url').in('delivery_company_id', deliveryCompanyIds);

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
    assigned_delivery_company_id?: number;
    confirmed?: boolean;
    total?: string;
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
    assigned_delivery_company?: {
        id: number;
        company_name: string;
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
    const deliveryType = order.shipping_method === '"delivery"' || order.shipping_method === 'delivery' ? 'delivery' : 'pickup';

    // Map database status to display status
    const statusMap: { [key: string]: 'processing' | 'on_the_way' | 'completed' | 'cancelled' | 'rejected' | 'ready_for_pickup' } = {
        Active: 'processing',
        Completed: 'completed',
        Cancelled: 'cancelled',
        Rejected: 'rejected',
        Delivered: 'completed',
        Pending: 'processing',
        Shipped: 'on_the_way',
        'On The Way': 'on_the_way',
        Processing: 'processing',
        'Ready For Pickup': 'ready_for_pickup',
        processing: 'processing',
        on_the_way: 'on_the_way',
        completed: 'completed',
        cancelled: 'cancelled',
        rejected: 'rejected',
        ready_for_pickup: 'ready_for_pickup',
    };

    // Map status to delivery status
    const deliveryStatusMap: { [key: string]: string } = {
        Active: 'preparing',
        Completed: 'delivered',
        Cancelled: 'cancelled',
        Delivered: 'delivered',
        Pending: 'pending',
        Shipped: 'shipped',
    };

    // Use total from database
    const calculateOrderTotal = (order: any) => {
        return order.total || 0;
    };

    return {
        id: order.id,
        name: order.products?.title || 'Product',
        image: order.products?.images?.[0] || null,
        buyer: order.profiles?.full_name || shippingAddress.name || 'Unknown Customer',
        shop_name: order.products?.shops?.[0]?.shop_name || 'Unknown Shop',
        shop: order.products?.shop || null,
        delivery_status: deliveryStatusMap[order.status] || 'pending',
        city: shippingAddress.city || 'Unknown City',
        date: order.created_at,
        total: `$${parseFloat(order.total || '0').toFixed(2)}`,
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
        assigned_delivery_company_id: order.assigned_delivery_company_id,
        assigned_delivery_company: order.assigned_delivery_company,
        confirmed: order.confirmed || false,
        comment: order.comment || '',
        // Delivery and features data
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

const OrdersList = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [items, setItems] = useState<OrderData[]>([]);
    const [displayItems, setDisplayItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Helper function to get accessible shop IDs based on user role
    const getAccessibleShopIds = async (): Promise<number[]> => {
        if (!user) return [];

        if (user.role_name === 'super_admin') {
            // Super admin can see all shops
            const { data: allShops } = await supabase.from('shops').select('id');
            return allShops?.map((shop) => shop.id) || [];
        }

        if (user.shops && user.shops.length > 0) {
            // Shop owner/editor can only see their assigned shops
            return user.shops.map((shop) => shop.shop_id);
        }

        return [];
    };

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [deliveryFilter, setDeliveryFilter] = useState('unconfirmed'); // 'unconfirmed', 'processing', 'on_the_way', 'completed', 'ready_for_pickup', 'archived'
    const [orderTypeFilter, setOrderTypeFilter] = useState('all'); // 'all', 'delivery', 'pickup'
    const [dateRange, setDateRange] = useState<Date[]>([]);
    const [selectedShops, setSelectedShops] = useState<number[]>([]);
    const [availableShops, setAvailableShops] = useState<any[]>([]);
    const [expandedSections, setExpandedSections] = useState({
        delivery: false,
        completed: false,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'date',
        direction: 'desc',
    });

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [showConfirmOrderModal, setShowConfirmOrderModal] = useState(false);
    const [orderToConfirm, setOrderToConfirm] = useState<OrderData | null>(null);
    const [showCompleteOrderModal, setShowCompleteOrderModal] = useState(false);
    const [orderToComplete, setOrderToComplete] = useState<OrderData | null>(null);
    const [showUnconfirmModal, setShowUnconfirmModal] = useState(false);
    const [orderToUnconfirm, setOrderToUnconfirm] = useState<OrderData | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showDangerModal, setShowDangerModal] = useState(false);
    const [selectedOrderForComment, setSelectedOrderForComment] = useState<any>(null);
    const [ordersWithComments, setOrdersWithComments] = useState<Set<number>>(new Set());
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
        if (authLoading) return;

        fetchCurrentUser();
        fetchOrders();
        fetchShops();
        fetchOrdersWithComments();
    }, [user?.role_name, authLoading]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.dropdown-container')) {
                setExpandedSections({
                    delivery: false,
                    completed: false,
                });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [dateRange, selectedShops]);

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
                item.delivery_status.toLowerCase().includes(search.toLowerCase()) ||
                item.city.toLowerCase().includes(search.toLowerCase());

            let matchesFilter = true;
            if (deliveryFilter === 'unconfirmed') {
                // Show only unconfirmed orders
                matchesFilter = !item.confirmed;
            } else if (deliveryFilter === 'processing') {
                // Show only processing orders
                matchesFilter = item.confirmed === true && item.status === 'processing';
            } else if (deliveryFilter === 'on_the_way') {
                // Show only on the way orders
                matchesFilter = item.confirmed === true && item.status === 'on_the_way';
            } else if (deliveryFilter === 'completed') {
                // Show only completed orders
                matchesFilter = item.confirmed === true && item.status === 'completed';
            } else if (deliveryFilter === 'ready_for_pickup') {
                // Show only ready for pickup orders (pickup orders that are ready)
                matchesFilter = item.confirmed === true && item.status === 'ready_for_pickup' && item.delivery_type === 'pickup';
            } else if (deliveryFilter === 'archived') {
                // Show only cancelled and rejected orders
                matchesFilter = item.status === 'cancelled' || item.status === 'rejected';
            }

            // Apply order type filter (additional filter on top of status filter)
            if (orderTypeFilter === 'delivery') {
                matchesFilter = matchesFilter && item.delivery_type === 'delivery';
            } else if (orderTypeFilter === 'pickup') {
                matchesFilter = matchesFilter && item.delivery_type === 'pickup';
            }
            // If orderTypeFilter === 'all', no additional filtering needed

            // Apply date range filter
            if (dateRange.length === 2) {
                const itemDate = new Date(item.date);
                if (itemDate < dateRange[0] || itemDate > dateRange[1]) {
                    matchesFilter = false;
                }
            }

            // Apply shop filter
            if (selectedShops.length > 0) {
                if (!selectedShops.includes(item.shop)) {
                    matchesFilter = false;
                }
            }

            return matchesSearch && matchesFilter;
        });
        setInitialRecords(filtered);
    }, [search, displayItems, deliveryFilter, orderTypeFilter, dateRange, selectedShops]);

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

    const fetchOrdersWithComments = async () => {
        try {
            const { data, error } = await supabase.from('order_comments').select('order_id');

            if (error) throw error;

            // Get unique order IDs
            const orderIds = new Set(data.map((item) => item.order_id));
            setOrdersWithComments(orderIds);
        } catch (error) {
            console.error('Error fetching orders with comments:', error);
        }
    };

    // Function to generate columns based on current filter
    const getColumns = (): any[] => {
        const baseColumns: any[] = [
            {
                accessor: 'id',
                title: t('order_id'),
                sortable: true,
                render: ({ id }: { id: any }) => <strong className="text-info">#{id}</strong>,
            },
            {
                accessor: 'date',
                title: t('date'),
                sortable: true,
                render: ({ date }: { date: any }) => new Date(date).toLocaleDateString(),
            },
            {
                accessor: 'shop_name',
                title: t('shop_name'),
                sortable: true,
                render: ({ shop_name }: { shop_name: any }) => <span className="font-medium">{shop_name}</span>,
            },
            {
                accessor: 'image',
                title: t('image'),
                sortable: false,
                render: ({ image }: { image: any }) => (
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
                render: ({ city }: { city: any }) => <span className="">{city}</span>,
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
                render: ({ payment_method }: { payment_method: any }) => {
                    if (!payment_method) return <span className="text-gray-500">-</span>;

                    const paymentType = payment_method.type || payment_method;
                    const getPaymentBadge = (type: string) => {
                        switch (type) {
                            case 'Credit Card':
                                return <span className="badge badge-outline-primary whitespace-nowrap">Credit Card</span>;
                            case 'Bank Transfer':
                                return <span className="badge badge-outline-info whitespace-nowrap">Bank Transfer</span>;
                            case 'Cash on Delivery':
                                return <span className="badge badge-outline-warning whitespace-nowrap">Cash on Delivery</span>;
                            case 'In-store':
                                return <span className="badge badge-outline-success whitespace-nowrap">In-store</span>;
                            default:
                                return <span className="badge badge-outline-secondary whitespace-nowrap">{type}</span>;
                        }
                    };

                    return getPaymentBadge(paymentType);
                },
            },
            {
                accessor: 'delivery_type',
                title: 'Type',
                sortable: true,
                render: ({ delivery_type, id, confirmed }: { delivery_type: any; id: any; confirmed: any }) => (
                    <DeliveryTypeDropdown currentType={delivery_type} orderId={id} onTypeChange={handleTypeUpdate} isConfirmed={confirmed} />
                ),
            },
            {
                accessor: 'status',
                title: t('status'),
                sortable: true,
                render: ({ status, id, delivery_type, confirmed, assigned_driver }: { status: any; id: any; delivery_type: any; confirmed: any; assigned_driver: any }) => (
                    <StatusComponent
                        currentStatus={status}
                        orderId={id}
                        onStatusChange={handleStatusUpdate}
                        deliveryType={delivery_type}
                        isConfirmed={confirmed}
                        onConfirm={(orderId) => {
                            const order = items.find((item) => item.id === orderId);
                            setOrderToConfirm(order || null);
                            setShowConfirmOrderModal(true);
                        }}
                        onUnconfirm={handleUnconfirm}
                        onOpenCommentModal={handleOpenCommentModal}
                        onCompleteOrder={handleOpenCompleteOrderModal}
                        hasAssignedDriver={!!assigned_driver}
                    />
                ),
            },
        ];

        // Only add driver and company columns for processing, on_the_way, and completed filters
        if (deliveryFilter === 'processing' || deliveryFilter === 'on_the_way' || deliveryFilter === 'completed') {
            // Add delivery company column
            baseColumns.push({
                accessor: 'assigned_delivery_company',
                title: 'Delivery Company',
                sortable: false,
                render: ({ assigned_delivery_company, delivery_type, status, confirmed }: { assigned_delivery_company: any; delivery_type: any; status: any; confirmed: any }) => {
                    // Only show company column for confirmed delivery orders in processing, on_the_way, or completed status
                    if (!confirmed || delivery_type !== 'delivery' || (status !== 'processing' && status !== 'on_the_way' && status !== 'completed')) {
                        return null;
                    }

                    if (assigned_delivery_company) {
                        return (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <IconTruck className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium">{assigned_delivery_company.company_name}</div>
                                </div>
                            </div>
                        );
                    }
                    return <span className="text-gray-500 text-sm">-</span>;
                },
            });

            // Add driver column
            baseColumns.push({
                accessor: 'assigned_driver',
                title: 'Driver',
                sortable: false,
                render: ({ assigned_driver, delivery_type, status, confirmed }: { assigned_driver: any; delivery_type: any; status: any; confirmed: any }) => {
                    // Only show driver column for confirmed delivery orders in processing, on_the_way, or completed status
                    if (!confirmed || delivery_type !== 'delivery' || (status !== 'processing' && status !== 'on_the_way' && status !== 'completed')) {
                        return null;
                    }

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
                            </div>
                        );
                    }
                    return <span className="text-gray-500 text-sm">Unassigned</span>;
                },
            });
        }

        // Add actions column
        baseColumns.push({
            accessor: 'action',
            title: t('actions'),
            render: ({ id }: { id: any }) => (
                <div className="flex items-center justify-center gap-2">
                    <button
                        type="button"
                        className="hover:text-info relative"
                        title="Add Comment"
                        onClick={(e) => {
                            e.stopPropagation();
                            const order = displayItems.find((d) => d.id === id);
                            setSelectedOrderForComment(order);
                            setShowCommentModal(true);
                        }}
                    >
                        <IconMessage className="h-5 w-5" />
                        {ordersWithComments.has(id) && <span className="absolute -top-1 -right-1 h-2 w-2 bg-info rounded-full"></span>}
                    </button>
                    {(() => {
                        const order = displayItems.find((d) => d.id === id);
                        // Don't show cancel/reject for completed or archived orders
                        if (order?.status === 'completed' || order?.status === 'cancelled' || order?.status === 'rejected') {
                            return null;
                        }
                        return (
                            <button
                                type="button"
                                className="text-danger hover:text-red-700 relative"
                                title="Cancel/Reject Order"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderForComment(order);
                                    setShowDangerModal(true);
                                }}
                            >
                                <IconAlertTriangle className="h-5 w-5" />
                            </button>
                        );
                    })()}
                    <ActionsMenu
                        orderId={id}
                        onView={() => router.push(`/orders/preview/${id}`)}
                        onDownload={() => handleDownloadOrderPDF(id)}
                        onDelete={() => handleDelete(displayItems.find((d) => d.id === id) || null)}
                    />
                </div>
            ),
        });

        return baseColumns;
    };

    const handleConfirmOrder = async (order: OrderData | null) => {
        if (!order) return;

        try {
            // Set status based on delivery type
            const newStatus = order.shipping_method === 'pickup' ? 'ready_for_pickup' : 'processing';

            const { error } = await supabase.from('orders').update({ confirmed: true, status: newStatus }).eq('id', order.id);

            if (error) throw error;

            // Add tracking entry
            await addTrackingEntry(order.id, 'Confirmed');

            // Refresh the data
            await fetchOrders();
            setAlert({ visible: true, message: 'Order Confirmed', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error confirming order', type: 'danger' });
        }
        setShowConfirmOrderModal(false);
        setOrderToConfirm(null);
    };

    const handleUnconfirmOrder = async (order: OrderData | null) => {
        if (!order) return;

        try {
            const { error } = await supabase.from('orders').update({ confirmed: false }).eq('id', order.id);

            if (error) throw error;

            // Refresh the data
            await fetchOrders();
            setAlert({ visible: true, message: 'Order Unconfirmed', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error unconfirming order', type: 'danger' });
        }
        setShowUnconfirmModal(false);
        setOrderToUnconfirm(null);
    };

    const handleCompleteOrder = async (order: OrderData | null) => {
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
        setShowCompleteOrderModal(false);
        setOrderToComplete(null);
    };

    const handleOpenCompleteOrderModal = (orderId: number) => {
        const order = items.find((item) => item.id === orderId);
        if (order) {
            setOrderToComplete(order);
            setShowCompleteOrderModal(true);
        }
    };

    const handleStatusUpdate = async (orderId: number, newStatus: string) => {
        try {
            // Get the current order to check if status is changing to/from completed
            const currentOrder = items.find((item) => item.id === orderId);
            const wasCompleted = currentOrder?.status === 'completed';
            const willBeCompleted = newStatus === 'completed';

            const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);

            if (error) throw error;

            // Add tracking entry based on status
            let action = '';
            if (newStatus === 'completed') action = 'Completed';
            else if (newStatus === 'on_the_way') action = 'On The Way';
            else if (newStatus === 'processing') action = 'Processing';

            if (action) {
                await addTrackingEntry(orderId, action);
            }

            // Update shop balance if status changed to/from completed
            if ((!wasCompleted && willBeCompleted) || (wasCompleted && !willBeCompleted)) {
                try {
                    const shopId = currentOrder?.products?.shop || 0;
                    // Update shop balance if needed
                    // await updateShopBalance(shopId);
                } catch (balanceError) {
                    console.error('Error updating shop balance:', balanceError);
                    // Don't fail the entire operation if balance update fails
                }
            }

            // Update local state immediately for better UX
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, status: newStatus } : item));
            setItems(updatedItems);

            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, status: newStatus } : item));
            setDisplayItems(updatedDisplayItems);

            setAlert({ visible: true, message: 'Order status updated successfully', type: 'success' });

            // Refresh data from database to ensure consistency
            fetchOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
            setAlert({ visible: true, message: 'Error updating order status', type: 'danger' });
        }
    };

    const handleTypeUpdate = async (orderId: number, newType: string) => {
        try {
            const { error } = await supabase.from('orders').update({ shipping_method: newType }).eq('id', orderId);

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

    const handleConfirm = async (orderId: number) => {
        try {
            // Find the order to determine its delivery type
            const order = items.find((item) => item.id === orderId);
            // Check shipping_method directly like in preview page
            const newStatus = order?.shipping_method === 'pickup' ? 'ready_for_pickup' : 'processing';

            const { error } = await supabase
                .from('orders')
                .update({
                    confirmed: true,
                    status: newStatus,
                })
                .eq('id', orderId);

            if (error) throw error;

            // Update local state immediately for better UX
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, confirmed: true, status: newStatus } : item));
            setItems(updatedItems);

            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, confirmed: true, status: newStatus } : item));
            setDisplayItems(updatedDisplayItems);

            setAlert({ visible: true, message: 'Order confirmed successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error confirming order', type: 'danger' });
        }
    };

    const handleUnconfirm = async (orderId: number) => {
        try {
            const { error } = await supabase.from('orders').update({ confirmed: false }).eq('id', orderId);

            if (error) throw error;

            // Update local state immediately for better UX
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, confirmed: false } : item));
            setItems(updatedItems);

            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, confirmed: false } : item));
            setDisplayItems(updatedDisplayItems);

            setAlert({ visible: true, message: 'Order unconfirmed successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error unconfirming order', type: 'danger' });
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

    const handleOpenCommentModal = (orderId: number) => {
        const order = displayItems.find((d) => d.id === orderId);
        setSelectedOrderForComment(order);
        setShowCommentModal(true);
        // Refresh comments to ensure we have the latest data
        fetchOrdersWithComments();
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

    const fetchShops = async () => {
        try {
            // Get accessible shop IDs based on user role
            const accessibleShopIds = await getAccessibleShopIds();

            if (accessibleShopIds.length === 0) {
                setAvailableShops([]);
                return;
            }

            const { data: shops, error } = await supabase.from('shops').select('id, shop_name, logo_url').in('id', accessibleShopIds).order('shop_name', { ascending: true });

            if (error) throw error;
            setAvailableShops(shops || []);
        } catch (error) {
            console.error('Error fetching shops:', error);
        }
    };

    const fetchOrders = async () => {
        try {
            // Get accessible shop IDs first
            const accessibleShopIds = await getAccessibleShopIds();

            if (accessibleShopIds.length === 0) {
                setItems([]);
                setDisplayItems([]);
                setLoading(false);
                return;
            }

            // Build query with filters - only fetch orders from accessible shops
            let query = supabase.from('orders').select(
                `
                    *,
                    products!inner(id, title, price, images, shop),
                    profiles(id, full_name, email),
                    assigned_driver:delivery_drivers(id, name, phone, avatar_url),
                    assigned_delivery_company:delivery_companies(id, company_name),
                    delivery_methods(id, label, delivery_time, price),
                    delivery_location_methods(id, location_name, price_addition)
                `,
            );

            // Filter by accessible shops at the database level
            query = query.in('products.shop', accessibleShopIds);

            // Apply date range filter
            if (dateRange.length === 2) {
                query = query.gte('created_at', dateRange[0].toISOString()).lte('created_at', dateRange[1].toISOString());
            }

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

            setItems(data as OrderData[]);

            // Get all product IDs from orders
            const productIds = data.map((order) => order.product_id).filter(Boolean);

            if (productIds.length === 0) {
                setDisplayItems([]);
                return;
            }

            // Get products with their shop IDs (already filtered by accessible shops)
            const { data: productsData, error: productsError } = await supabase.from('products').select('id, title, price, images, shop').in('id', productIds);

            if (productsError) throw productsError;

            // Get shop IDs from products
            const shopIds = productsData?.map((p) => p.shop).filter(Boolean) || [];

            if (shopIds.length === 0) {
                setDisplayItems([]);
                return;
            }

            // Get shops info
            const { data: shopsData, error: shopsError } = await supabase.from('shops').select('id, shop_name').in('id', shopIds);

            if (shopsError) throw shopsError;

            // Create a map of shop data for easy lookup
            const shopMap = new Map();
            shopsData?.forEach((shop) => {
                shopMap.set(shop.id, shop);
            });

            // Transform data for display with shop information
            let transformed = data.map((order) => {
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

            // Apply additional shop filter if selected
            if (selectedShops.length > 0) {
                transformed = transformed.filter((order) => {
                    const product = productsData?.find((p) => p.id === order.product_id);
                    return product && selectedShops.includes(product.shop);
                });
            }

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
                    <span>{t('orders')}</span>
                </li>
            </ul>
            <div className="panel mt-6 w-full max-w-none">
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
                {/* Order Confirmation Modal */}
                <ConfirmModal
                    isOpen={showConfirmOrderModal}
                    title="Confirm Order"
                    message="Are you sure you want to confirm this delivery order?"
                    onConfirm={() => handleConfirmOrder(orderToConfirm)}
                    onCancel={() => {
                        setShowConfirmOrderModal(false);
                        setOrderToConfirm(null);
                    }}
                    confirmLabel="Confirm"
                />
                {/* Order Unconfirm Modal */}
                <ConfirmModal
                    isOpen={showUnconfirmModal}
                    title="Unconfirm Order"
                    message="Are you sure you want to unconfirm this order? It will be moved back to the main orders list."
                    onConfirm={() => handleUnconfirmOrder(orderToUnconfirm)}
                    onCancel={() => {
                        setShowUnconfirmModal(false);
                        setOrderToUnconfirm(null);
                    }}
                    confirmLabel="Unconfirm"
                />
                {/* Complete Order Modal */}
                <ConfirmModal
                    isOpen={showCompleteOrderModal}
                    title="Complete Order"
                    message="Are you sure you want to mark this order as completed? This action cannot be undone."
                    onConfirm={() => handleCompleteOrder(orderToComplete)}
                    onCancel={() => {
                        setShowCompleteOrderModal(false);
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
                        {' '}
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
                        <div className="flex flex-wrap gap-3">
                            {/* Unconfirmed */}
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryFilter('unconfirmed')}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 border-2 ${
                                        deliveryFilter === 'unconfirmed'
                                            ? 'bg-gradient-to-r from-primary to-purple-600 text-white border-primary shadow-lg'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary hover:shadow-md'
                                    }`}
                                >
                                    <IconClock className={`h-4 w-4 ${deliveryFilter === 'unconfirmed' ? 'text-white' : 'text-primary'}`} />
                                    Unconfirmed
                                </button>
                            </div>

                            {/* Pickups - Straightforward */}
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={() => setDeliveryFilter('ready_for_pickup')}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 border-2 ${
                                        deliveryFilter === 'ready_for_pickup'
                                            ? 'bg-gradient-to-r from-warning to-orange-500 text-white border-warning shadow-lg'
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-warning hover:shadow-md'
                                    }`}
                                >
                                    <IconPackage className={`h-4 w-4 ${deliveryFilter === 'ready_for_pickup' ? 'text-white' : 'text-warning'}`} />
                                    Pickups
                                </button>
                            </div>

                            {/* Delivery Section */}
                            <div className="flex items-center">
                                <div className="relative dropdown-container">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedSections((prev) => ({ ...prev, delivery: !prev.delivery }))}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 border-2 ${
                                            deliveryFilter === 'processing' || deliveryFilter === 'on_the_way'
                                                ? 'bg-gradient-to-r from-info to-blue-500 text-white border-info shadow-lg'
                                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-info hover:shadow-md'
                                        }`}
                                    >
                                        <IconTruck className={`h-4 w-4 ${deliveryFilter === 'processing' || deliveryFilter === 'on_the_way' ? 'text-white' : 'text-info'}`} />
                                        Delivery
                                        {expandedSections.delivery ? <IconChevronUp className="h-3 w-3" /> : <IconChevronDown className="h-3 w-3" />}
                                    </button>

                                    {/* Delivery Submenu */}
                                    {expandedSections.delivery && (
                                        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-[200px]">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDeliveryFilter('processing');
                                                    setExpandedSections((prev) => ({ ...prev, delivery: false }));
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${
                                                    deliveryFilter === 'processing' ? 'bg-info/10 text-info' : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <IconSettings className="h-4 w-4" />
                                                Processing
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDeliveryFilter('on_the_way');
                                                    setExpandedSections((prev) => ({ ...prev, delivery: false }));
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${
                                                    deliveryFilter === 'on_the_way' ? 'bg-warning/10 text-warning' : 'text-gray-700 dark:text-gray-300'
                                                }`}
                                            >
                                                <IconTruck className="h-4 w-4" />
                                                On The Way
                                            </button>
                                        </div>
                                    )}
                                </div>
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

                        {/* Filter Toggle Button */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                    showFilters
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary'
                                }`}
                            >
                                <IconSettings className="h-4 w-4" />
                                Filters
                                {showFilters ? <IconCaretDown className="h-3 w-3 rotate-180" /> : <IconCaretDown className="h-3 w-3" />}
                            </button>
                        </div>

                        {/* View Toggle Buttons */}
                        <div className="flex items-center gap-2">
                            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                                        viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <IconLayoutGrid className="h-4 w-4" />
                                    Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                                        viewMode === 'table' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <IconListCheck className="h-4 w-4" />
                                    Table
                                </button>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <input type="text" placeholder="Search orders..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-input pl-10 pr-4 py-2 w-64" />
                                <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Collapsible Filters Row */}
                    {showFilters && (
                        <div className="flex flex-col lg:flex-row gap-4 px-5 py-4 mb-4">
                            {/* Date Range */}
                            <div className="lg:w-64">
                                <DateRangeSelector value={dateRange} onChange={setDateRange} placeholder="Select date range" isRtl={false} />
                            </div>

                            {/* Order Type */}
                            <div className="lg:w-48">
                                <select value={orderTypeFilter} onChange={(e) => setOrderTypeFilter(e.target.value)} className="form-select w-full">
                                    <option value="all">All Types</option>
                                    <option value="delivery">Delivery Only</option>
                                    <option value="pickup">Pickup Only</option>
                                </select>
                            </div>

                            {/* Shop Filter */}
                            <div className="lg:w-64">
                                <MultiSelect
                                    options={availableShops.map((shop) => ({ id: shop.id, name: shop.shop_name, logo_url: shop.logo_url }))}
                                    selectedValues={selectedShops}
                                    onChange={setSelectedShops}
                                    placeholder="Select shops"
                                    isRtl={false}
                                />
                            </div>

                            {/* Clear Filters */}
                            <div className="lg:w-auto">
                                <button
                                    type="button"
                                    className="btn btn-outline-danger"
                                    onClick={() => {
                                        setDateRange([]);
                                        setSelectedShops([]);
                                        setOrderTypeFilter('all');
                                        setDeliveryFilter('unconfirmed');
                                    }}
                                >
                                    <IconX className="h-4 w-4 mr-2" />
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        {viewMode === 'grid' ? (
                            // Card Grid View
                            <div className="p-6">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {initialRecords.slice((page - 1) * pageSize, page * pageSize).map((order) => (
                                        <div
                                            key={order.id}
                                            className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
                                        >
                                            {/* Section 1: Product Image and Details */}
                                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                        <img className="w-full h-full object-cover" src={order.image || '/assets/images/product-placeholder.jpg'} alt={order.name} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{order.name}</h3>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Order #{order.id}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">Shop:</span>
                                                            <span className="text-xs font-medium">{order.shop_name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 2: Customer Details */}
                                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <IconUser className="h-4 w-4 text-gray-500" />
                                                        <span className="text-sm font-medium">{order.buyer}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <IconPackage className="h-4 w-4 text-gray-500" />
                                                        <span className="text-xs text-gray-500">{order.city}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <IconCalendar className="h-4 w-4 text-gray-500" />
                                                        <span className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 3: Payment and Delivery */}
                                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500">Type</span>
                                                        {!order.confirmed ? (
                                                            <DeliveryTypeDropdown currentType={order.delivery_type} orderId={order.id} onTypeChange={handleTypeUpdate} isConfirmed={order.confirmed} />
                                                        ) : (
                                                            <span
                                                                className={`text-xs px-2 py-1 rounded-full ${
                                                                    order.delivery_type === 'delivery'
                                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                                                }`}
                                                            >
                                                                {order.delivery_type === 'delivery' ? 'Delivery' : 'Pickup'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500">Total</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{order.total}</span>
                                                            {order.delivery_methods && <OrderTotalTooltip order={order} />}
                                                        </div>
                                                    </div>
                                                    {order.assigned_driver && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-500">Driver</span>
                                                            <span className="text-xs font-medium">{order.assigned_driver.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Section 4: Status and Actions */}
                                            <div className="p-4 flex-1 flex flex-col justify-between">
                                                {/* Status Badge or Action Button */}
                                                <div className="mb-3">
                                                    <StatusComponent
                                                        currentStatus={order.status}
                                                        orderId={order.id}
                                                        onStatusChange={handleStatusUpdate}
                                                        deliveryType={order.delivery_type}
                                                        isConfirmed={order.confirmed}
                                                        onConfirm={(orderId) => {
                                                            const orderData = items.find((item) => item.id === orderId);
                                                            setOrderToConfirm(orderData || null);
                                                            setShowConfirmOrderModal(true);
                                                        }}
                                                        onUnconfirm={handleUnconfirm}
                                                        onOpenCommentModal={handleOpenCommentModal}
                                                        onCompleteOrder={handleOpenCompleteOrderModal}
                                                        hasAssignedDriver={!!order.assigned_driver}
                                                    />
                                                </div>

                                                {/* Action Menu */}
                                                <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        className="hover:text-info relative"
                                                        title="Add Comment"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOrderForComment(order);
                                                            setShowCommentModal(true);
                                                        }}
                                                    >
                                                        <IconMessage className="h-4 w-4" />
                                                        {ordersWithComments.has(order.id) && <span className="absolute -top-1 -right-1 h-2 w-2 bg-info rounded-full"></span>}
                                                    </button>

                                                    <ActionsMenu
                                                        orderId={order.id}
                                                        onView={() => router.push(`/orders/preview/${order.id}`)}
                                                        onDownload={() => handleDownloadOrderPDF(order.id)}
                                                        onDelete={() => handleDelete(displayItems.find((d) => d.id === order.id) || null)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {initialRecords.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-gray-500 dark:text-gray-400">No orders found.</p>
                                    </div>
                                )}

                                {/* Pagination for Grid View */}
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                            {t('showing')} {(page - 1) * pageSize + 1} {t('to')} {Math.min(page * pageSize, initialRecords.length)} {t('of')} {initialRecords.length} {t('entries')}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="form-select text-sm">
                                            {PAGE_SIZES.map((size) => (
                                                <option key={size} value={size}>
                                                    {size} per page
                                                </option>
                                            ))}
                                        </select>
                                        <div className="flex space-x-1">
                                            <button
                                                onClick={() => setPage(page - 1)}
                                                disabled={page === 1}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setPage(page + 1)}
                                                disabled={page * pageSize >= initialRecords.length}
                                                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Table View
                            <div className="datatables w-full max-w-none">
                                <DataTable
                                    className={`${loading ? 'pointer-events-none' : 'cursor-pointer'} w-full max-w-none`}
                                    records={records as any[]}
                                    minHeight={200}
                                    withBorder={false}
                                    withColumnBorders={false}
                                    striped
                                    highlightOnHover
                                    onRowClick={(record: any) => {
                                        router.push(`/orders/preview/${record.id}`);
                                    }}
                                    columns={getColumns()}
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
                        )}

                        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrdersList;

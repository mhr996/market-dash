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

// Delivery Type Dropdown Component
const DeliveryTypeDropdown = ({ currentType, orderId, onTypeChange }: { currentType: string; orderId: number; onTypeChange: (orderId: number, newType: string) => void }) => {
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

// Status Dropdown Component
const StatusDropdown = ({
    currentStatus,
    orderId,
    onStatusChange,
    hasAssignedDriver,
    onOpenCommentModal,
    onOpenDangerModal,
}: {
    currentStatus: string;
    orderId: number;
    onStatusChange: (orderId: number, newStatus: string) => void;
    hasAssignedDriver: boolean;
    onOpenCommentModal: () => void;
    onOpenDangerModal: () => void;
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
            disabled: !hasAssignedDriver,
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
            <ConfirmModal
                isOpen={showConfirmModal}
                title="Confirm Status Change"
                message="Are you sure you want to mark this order as completed? This action cannot be undone."
                onConfirm={handleConfirmStatusChange}
                onCancel={handleCancelStatusChange}
                confirmLabel="Yes, Mark as Completed"
            />
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
    const statusMap: { [key: string]: 'processing' | 'on_the_way' | 'completed' } = {
        Active: 'processing',
        Completed: 'completed',
        Cancelled: 'completed', // Treat cancelled as completed for display
        Delivered: 'completed',
        Pending: 'processing',
        Shipped: 'on_the_way',
        'On The Way': 'on_the_way',
        Processing: 'processing',
        processing: 'processing',
        on_the_way: 'on_the_way',
        completed: 'completed',
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
        comment: order.comment || '',
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
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<OrderData | null>(null);
    const [showCommentModal, setShowCommentModal] = useState(false);
    const [showDangerModal, setShowDangerModal] = useState(false);
    const [selectedOrderForComment, setSelectedOrderForComment] = useState<any>(null);
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

            let matchesFilter = true;
            // Only show confirmed delivery orders
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
                } else if (deliveryFilter === 'archived') {
                    matchesFilter = item.status === 'cancelled' || item.status === 'rejected';
                }
            }

            return matchesSearch && matchesFilter;
        });
        setInitialRecords(filtered);
    }, [search, displayItems, deliveryFilter]);

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

    const handleCommentSave = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ comment }).eq('id', orderId);
            if (error) throw error;
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, comment } : item));
            setItems(updatedItems);
            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, comment } : item));
            setDisplayItems(updatedDisplayItems);
            setAlert({ visible: true, message: 'Comment saved successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error saving comment', type: 'danger' });
        }
    };

    const handleCancelOrder = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: 'cancelled', comment }).eq('id', orderId);
            if (error) throw error;
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, status: 'cancelled', comment } : item));
            setItems(updatedItems);
            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, status: 'cancelled', comment } : item));
            setDisplayItems(updatedDisplayItems);
            setAlert({ visible: true, message: 'Order cancelled successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error cancelling order', type: 'danger' });
        }
    };

    const handleRejectOrder = async (orderId: number, comment: string) => {
        try {
            const { error } = await supabase.from('orders').update({ status: 'rejected', comment }).eq('id', orderId);
            if (error) throw error;
            const updatedItems = items.map((item) => (item.id === orderId ? { ...item, status: 'rejected', comment } : item));
            setItems(updatedItems);
            const updatedDisplayItems = displayItems.map((item) => (item.id === orderId ? { ...item, status: 'rejected', comment } : item));
            setDisplayItems(updatedDisplayItems);
            setAlert({ visible: true, message: 'Order rejected successfully', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error rejecting order', type: 'danger' });
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
                {/* Comment Modal */}
                <CommentModal
                    order={selectedOrderForComment}
                    isOpen={showCommentModal}
                    onClose={() => {
                        setShowCommentModal(false);
                        setSelectedOrderForComment(null);
                    }}
                    onSave={handleCommentSave}
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
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setDeliveryFilter('processing')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    deliveryFilter === 'processing' ? 'bg-info text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                <IconSettings className={`h-4 w-4 ${deliveryFilter === 'processing' ? 'text-white' : 'text-info'}`} />
                                Processing
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryFilter('on_the_way')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    deliveryFilter === 'on_the_way' ? 'bg-warning text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                <IconTruck className={`h-4 w-4 ${deliveryFilter === 'on_the_way' ? 'text-white' : 'text-warning'}`} />
                                On The Way
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryFilter('completed')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    deliveryFilter === 'completed' ? 'bg-success text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                <IconCheck className={`h-4 w-4 ${deliveryFilter === 'completed' ? 'text-white' : 'text-success'}`} />
                                Completed
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryFilter('archived')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    deliveryFilter === 'archived' ? 'bg-danger text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                <IconX className={`h-4 w-4 ${deliveryFilter === 'archived' ? 'text-white' : 'text-danger'}`} />
                                Archived
                            </button>
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
                                    render: ({ total }) => <span className="font-semibold text-success">{total}</span>,
                                },
                                {
                                    accessor: 'delivery_type',
                                    title: 'Type',
                                    sortable: true,
                                    render: ({ delivery_type, id }) => <DeliveryTypeDropdown currentType={delivery_type} orderId={id} onTypeChange={handleTypeUpdate} />,
                                },
                                {
                                    accessor: 'status',
                                    title: t('status'),
                                    sortable: true,
                                    render: ({ status, id, assigned_driver }) => (
                                        <StatusDropdown
                                            currentStatus={status}
                                            orderId={id}
                                            onStatusChange={handleStatusUpdate}
                                            hasAssignedDriver={!!assigned_driver}
                                            onOpenCommentModal={() => {
                                                const order = displayItems.find((d) => d.id === id);
                                                setSelectedOrderForComment(order);
                                                setShowCommentModal(true);
                                            }}
                                            onOpenDangerModal={() => {
                                                const order = displayItems.find((d) => d.id === id);
                                                setSelectedOrderForComment(order);
                                                setShowDangerModal(true);
                                            }}
                                        />
                                    ),
                                },
                                {
                                    accessor: 'assigned_driver',
                                    title: 'Driver',
                                    sortable: false,
                                    render: ({ assigned_driver, id }) => {
                                        if (assigned_driver) {
                                            return (
                                                <div className="flex items-center gap-2 group">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <IconUser className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium">{assigned_driver.name}</div>
                                                        <div className="text-xs text-gray-500">{assigned_driver.phone}</div>
                                                    </div>
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
                                                </div>
                                            );
                                        }
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
                                    },
                                },
                                {
                                    accessor: 'action',
                                    title: t('actions'),
                                    titleClassName: '!text-center',
                                    render: ({ id }) => (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                className="hover:text-warning relative"
                                                title="Add Comment"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const order = displayItems.find((d) => d.id === id);
                                                    setSelectedOrderForComment(order);
                                                    setShowCommentModal(true);
                                                }}
                                            >
                                                <IconMessage className="h-5 w-5" />
                                                {(() => {
                                                    const order = displayItems.find((d) => d.id === id);
                                                    return order?.comment ? <span className="absolute -top-1 -right-1 h-2 w-2 bg-warning rounded-full"></span> : null;
                                                })()}
                                            </button>
                                            <button
                                                type="button"
                                                className="hover:text-danger"
                                                title="Cancel/Reject Order"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const order = displayItems.find((d) => d.id === id);
                                                    setSelectedOrderForComment(order);
                                                    setShowDangerModal(true);
                                                }}
                                            >
                                                <IconAlertTriangle className="h-5 w-5" />
                                            </button>
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

            {/* Modals */}
            <CommentModal
                order={selectedOrderForComment}
                isOpen={showCommentModal}
                onClose={() => {
                    setShowCommentModal(false);
                    setSelectedOrderForComment(null);
                }}
                onSave={handleCommentSave}
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

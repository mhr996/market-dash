'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconLayoutGrid from '@/components/icon/icon-layout-grid';
import IconListCheck from '@/components/icon/icon-list-check';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import ConfirmModal from '@/components/modals/confirm-modal';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import EditCustomerDialog from './components/EditCustomerDialog';

const CustomersList = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [items, setItems] = useState<
        Array<{
            id: number;
            full_name: string;
            email: string;
            avatar_url: string | null;
            registration_date?: number;
            status?: string;
            uid?: string;
            user_roles?: {
                id: number;
                name: string;
                display_name: string;
            };
        }>
    >([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState(sortBy(items, 'id').reverse());
    const [records, setRecords] = useState(initialRecords);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'registration_date',
        direction: 'desc',
    });

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Alert and delete state
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<any>(null);

    // Edit dialog state
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<any>(null);

    const fetchCustomers = async () => {
        if (authLoading) return;

        try {
            // Only fetch users with role = 4 (customers)
            const { data: customers, error } = await supabase
                .from('profiles')
                .select(
                    `
                    *,
                    user_roles!inner (
                        id,
                        name,
                        display_name
                    )
                `,
                )
                .eq('role', 6) // Only customers
                .order('registration_date', { ascending: false });

            if (error) throw error;

            setItems(customers || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [authLoading]);

    // Delete customer function
    const deleteCustomer = async (customerId: number) => {
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', customerId);
            if (error) throw error;

            setItems(items.filter((customer) => customer.id !== customerId));
            setAlert({ visible: true, message: 'Customer deleted successfully', type: 'success' });
        } catch (error) {
            console.error('Error deleting customer:', error);
            setAlert({ visible: true, message: 'Error deleting customer', type: 'danger' });
        }
    };

    const handleEditClick = (customer: any) => {
        setCustomerToEdit(customer);
        setShowEditDialog(true);
    };

    const handleEditSuccess = () => {
        // Refresh the customers list
        fetchCustomers();
    };

    // Handle delete confirmation
    const handleDeleteClick = (customer: any) => {
        setCustomerToDelete(customer);
        setShowConfirmModal(true);
    };

    // Confirm deletion
    const confirmDeletion = () => {
        if (customerToDelete) {
            deleteCustomer(customerToDelete.id);
            setShowConfirmModal(false);
            setCustomerToDelete(null);
        }
    };

    useEffect(() => {
        const data = sortBy(items, sortStatus.columnAccessor);
        setInitialRecords(sortStatus.direction === 'desc' ? data.reverse() : data);
    }, [items, sortStatus]);

    useEffect(() => {
        let filteredData = initialRecords;

        if (search) {
            filteredData = initialRecords.filter((item) => {
                return (
                    item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                    item.email?.toLowerCase().includes(search.toLowerCase()) ||
                    item.user_roles?.display_name?.toLowerCase().includes(search.toLowerCase())
                );
            });
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords(filteredData.slice(from, to));
    }, [initialRecords, page, pageSize, search]);

    // Show loading while auth is loading
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
            <div className="invoice-table">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <h5 className="text-lg font-semibold dark:text-white">Customers List</h5>
                    </div>

                    {/* View Toggle Buttons */}
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                                    viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                <IconLayoutGrid className="h-4 w-4" />
                                Grid
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                                    viewMode === 'table' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                <IconListCheck className="h-4 w-4" />
                                Table
                            </button>
                        </div>
                    </div>

                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                {/* Alert */}
                {alert.visible && (
                    <div className="mb-4 px-5">
                        <Alert
                            type={alert.type}
                            title={alert.type === 'success' ? 'Success' : 'Error'}
                            message={alert.message}
                            onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                        />
                    </div>
                )}

                <div className="relative">
                    {viewMode === 'grid' ? (
                        // Card Grid View - Redesigned
                        <div className="p-3">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
                                {records.map((customer) => (
                                    <div
                                        key={customer.id}
                                        className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow duration-200"
                                    >
                                        {/* Header with Avatar and Status */}
                                        <div className="p-6 pb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="relative">
                                                    <img
                                                        className="h-14 w-14 rounded-xl object-cover ring-2 ring-gray-100 dark:ring-gray-700"
                                                        src={customer.avatar_url || `/assets/images/user-placeholder.webp`}
                                                        alt={customer.full_name}
                                                    />
                                                    <div
                                                        className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white ${customer.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{customer.full_name}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{customer.email}</p>
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mt-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                        {customer.user_roles?.display_name || 'Customer'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Customer Details */}
                                        <div className="px-3 pb-2">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                                                    <span
                                                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                            customer.status === 'Active'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                        }`}
                                                    >
                                                        {customer.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">Joined</span>
                                                    <span className="text-gray-900 dark:text-white">
                                                        {customer.registration_date ? new Date(customer.registration_date).toLocaleDateString('TR') : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex space-x-3">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(customer);
                                                        }}
                                                        className="inline-flex items-center justify-center w-10 h-10 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                                        title="Edit Customer"
                                                    >
                                                        <IconEdit className="h-4 w-4" />
                                                    </button>
                                                    <Link
                                                        href={`/customers/preview/${customer.id}`}
                                                        className="inline-flex items-center justify-center w-10 h-10 text-white bg-primary border border-transparent rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                                        title="View Customer"
                                                    >
                                                        <IconEye className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteClick(customer)}
                                                        className="inline-flex items-center justify-center w-10 h-10 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
                                                        title="Delete Customer"
                                                    >
                                                        <IconTrashLines className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {records.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 dark:text-gray-400">No customers found.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Table View
                        <div className="datatables pagination-padding relative">
                            <DataTable
                                className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap cursor-pointer'}`}
                                records={records}
                                onRowClick={(record) => {
                                    router.push(`/customers/preview/${record.id}`);
                                }}
                                columns={[
                                    {
                                        accessor: 'id',
                                        title: t('id'),
                                        sortable: true,
                                        render: ({ id }) => <strong className="text-info">#{id.toString().slice(0, 6)}</strong>,
                                    },
                                    {
                                        accessor: 'full_name',
                                        title: t('full_name'),
                                        sortable: true,
                                        render: ({ full_name, avatar_url }) => (
                                            <div className="flex items-center font-semibold">
                                                <div className="w-max rounded-full ltr:mr-2 rtl:ml-2 flex items-center justify-center">
                                                    <img className="h-8 w-8 rounded-full object-cover" src={avatar_url || `/assets/images/user-placeholder.webp`} alt="" />
                                                </div>
                                                <div>{full_name}</div>
                                            </div>
                                        ),
                                    },
                                    {
                                        accessor: 'user_roles.display_name',
                                        title: 'Role',
                                        sortable: true,
                                        render: ({ user_roles }) => <span className="badge badge-secondary">{user_roles?.display_name || 'Customer'}</span>,
                                    },
                                    {
                                        accessor: 'email',
                                        title: t('email'),
                                        sortable: true,
                                    },
                                    {
                                        accessor: 'registration_date',
                                        title: t('registration_date'),
                                        sortable: true,
                                        render: ({ registration_date }) => <span>{registration_date ? new Date(registration_date).toLocaleDateString('TR') : ''}</span>,
                                    },
                                    {
                                        accessor: 'status',
                                        title: t('status'),
                                        sortable: true,
                                        render: ({ status }) => <span className={`badge badge-outline-${status === 'Active' ? 'success' : 'danger'} `}>{status}</span>,
                                    },
                                    {
                                        accessor: 'action',
                                        title: t('actions'),
                                        sortable: false,
                                        textAlignment: 'center',
                                        render: ({ id }) => {
                                            const customer = items.find((c) => c.id === id);
                                            return (
                                                <div className="mx-auto flex w-max items-center gap-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (customer) handleEditClick(customer);
                                                        }}
                                                        className="flex hover:text-info"
                                                    >
                                                        <IconEdit className="h-4.5 w-4.5" />
                                                    </button>
                                                    <Link href={`/customers/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                                        <IconEye />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="flex hover:text-danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (customer) handleDeleteClick(customer);
                                                        }}
                                                    >
                                                        <IconTrashLines />
                                                    </button>
                                                </div>
                                            );
                                        },
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
                                paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                                minHeight={300}
                            />
                        </div>
                    )}
                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                </div>
            </div>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                onCancel={() => setShowConfirmModal(false)}
                onConfirm={confirmDeletion}
                title="Delete Customer"
                message={`Are you sure you want to delete ${customerToDelete?.full_name}? This action cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
            />

            {/* Edit Customer Dialog */}
            <EditCustomerDialog
                isOpen={showEditDialog}
                onClose={() => {
                    setShowEditDialog(false);
                    setCustomerToEdit(null);
                }}
                customer={customerToEdit}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
};

export default CustomersList;

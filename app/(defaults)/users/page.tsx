'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconLayoutGrid from '@/components/icon/icon-layout-grid';
import IconListCheck from '@/components/icon/icon-list-check';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';

const UsersList = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const { user, loading: authLoading, canAccessUsers, canAddUsers, canDeleteUsers, getAccessibleUserIds } = useAuth();
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

    // New state for confirm modal and alert.
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    useEffect(() => {
        const fetchUsers = async () => {
            if (authLoading) return;

            // Check if user can access users page
            if (!canAccessUsers()) {
                router.push('/');
                return;
            }

            try {
                let query = supabase.from('profiles').select(`
                    *,
                    user_roles!inner (
                        id,
                        name,
                        display_name
                    )
                `);

                if (user?.role_name === 'super_admin') {
                    // Super admin sees everyone
                    query = query.order('registration_date', { ascending: false });
                } else {
                    // Get accessible user IDs based on user's roles
                    const accessibleUserIds = await getAccessibleUserIds();

                    if (accessibleUserIds.length === 0) {
                        setItems([]);
                        setLoading(false);
                        return;
                    }

                    query = query.in('id', accessibleUserIds).order('registration_date', { ascending: false });
                }

                const { data, error } = await query;
                if (error) throw error;
                setItems(data || []);
            } catch (error) {
                console.error('Error:', error);
                setAlert({ visible: true, message: 'Error fetching users', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [user?.role_name, authLoading]); // Only depend on role_name and authLoading

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        setInitialRecords(() => {
            return items.filter((item) => {
                return (
                    item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                    item.email?.toLowerCase().includes(search.toLowerCase()) ||
                    (item.registration_date?.toString() || '').includes(search.toLowerCase())
                );
            });
        });
    }, [items, search]);

    useEffect(() => {
        const data2 = sortBy(initialRecords, sortStatus.columnAccessor);
        setRecords(sortStatus.direction === 'desc' ? data2.reverse() : data2);
        setPage(1);
    }, [sortStatus]);

    // Modified deletion function. It sets the user to delete and shows the confirm modal.
    const deleteRow = (id: number | null = null) => {
        if (id) {
            const user = items.find((user) => user.id === id);
            if (user) {
                setUserToDelete(user);
                setShowConfirmModal(true);
            }
        }
    }; // Confirm deletion callback.
    const confirmDeletion = async () => {
        if (!userToDelete || !userToDelete.id) return;

        try {
            // Delete from all related tables first (in order to avoid foreign key constraints)

            // 1. Delete from junction tables
            const { error: shopError } = await supabase.from('user_roles_shop').delete().eq('user_id', userToDelete.id);
            if (shopError) console.warn('Error deleting shop roles:', shopError);

            const { error: deliveryError } = await supabase.from('user_roles_delivery').delete().eq('user_id', userToDelete.id);
            if (deliveryError) console.warn('Error deleting delivery roles:', deliveryError);

            // 2. Delete user's orders (common foreign key constraint)
            const { error: ordersError } = await supabase.from('orders').delete().eq('buyer_id', userToDelete.id);
            if (ordersError) console.warn('Error deleting user orders:', ordersError);

            // 3. Delete from any other tables that might reference the user
            // Add more tables here as needed based on your schema

            // 4. Finally delete from profiles table
            const { error: profileError } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
            if (profileError) {
                console.error('Profile deletion error:', profileError);
                throw new Error(`Cannot delete user: ${profileError.message}. This user may have data in other tables that need to be deleted first.`);
            }

            // Delete from Supabase auth (this requires admin privileges)
            try {
                const { error: authError } = await supabase.auth.admin.deleteUser(userToDelete.id);
                if (authError) {
                    console.warn('Auth deletion error (user might not exist in auth):', authError);
                }
            } catch (authError) {
                console.warn('Auth deletion failed (might need admin key):', authError);
            }

            // Remove the user from state arrays
            const updatedItems = items.filter((user) => user.id !== userToDelete.id);
            setItems(updatedItems);
            setInitialRecords(
                updatedItems.filter((item) => {
                    return (
                        item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                        item.email?.toLowerCase().includes(search.toLowerCase()) ||
                        (item.registration_date?.toString() || '').includes(search.toLowerCase())
                    );
                }),
            );
            setSelectedRecords([]);
            setSearch('');

            setAlert({ visible: true, message: 'User deleted successfully.', type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: `Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setUserToDelete(null);
        }
    };

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
            {' '}
            {/* Alert */}
            {alert.visible && (
                <div className="mb-4 ml-4 max-w-96">
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
                    <div className="flex items-center gap-2">
                        {/* Delete button - only if user can delete users */}
                        {canDeleteUsers() && (
                            <button type="button" className="btn btn-danger gap-2">
                                <IconTrashLines />
                                {t('delete')}
                            </button>
                        )}
                        {/* Add User button - only if user can add users */}
                        {canAddUsers() && (
                            <Link href="/users/add" className="btn btn-primary gap-2">
                                <IconPlus />
                                {t('add_new')}
                            </Link>
                        )}
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

                <div className="relative">
                    {viewMode === 'grid' ? (
                        // Card Grid View
                        <div className="p-5">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {records.map((user) => (
                                    <div
                                        key={user.id}
                                        className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary dark:border-gray-700 dark:bg-gray-800"
                                        onClick={() => router.push(`/users/preview/${user.id}`)}
                                    >
                                        {/* User Avatar and Basic Info */}
                                        <div className="mb-4 flex items-center space-x-3">
                                            <div className="relative">
                                                <img
                                                    className="h-12 w-12 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600"
                                                    src={user.avatar_url || `/assets/images/user-placeholder.webp`}
                                                    alt={user.full_name}
                                                />
                                                <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${user.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{user.full_name}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                            </div>
                                        </div>

                                        {/* User Details */}
                                        <div className="space-y-2 mb-4">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">ID:</span>
                                                <span className="font-mono text-gray-900 dark:text-white">#{user.id.toString().slice(0, 6)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        user.status === 'Active'
                                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                    }`}
                                                >
                                                    {user.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Role:</span>
                                                <span
                                                    className={`badge ${
                                                        user.user_roles?.name === 'super_admin'
                                                            ? 'badge-danger'
                                                            : user.user_roles?.name === 'shop_owner'
                                                              ? 'badge-primary'
                                                              : user.user_roles?.name === 'delivery_owner'
                                                                ? 'badge-success'
                                                                : user.user_roles?.name === 'shop_editor'
                                                                  ? 'badge-info'
                                                                  : user.user_roles?.name === 'driver'
                                                                    ? 'badge-warning'
                                                                    : 'badge-secondary'
                                                    }`}
                                                >
                                                    {user.user_roles?.display_name || 'User'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400">Joined:</span>
                                                <span className="text-gray-900 dark:text-white">{user.registration_date ? new Date(user.registration_date).toLocaleDateString('TR') : 'N/A'}</span>
                                            </div>
                                            {user.uid && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500 dark:text-gray-400">UID:</span>
                                                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate max-w-20">{user.uid.substring(0, 8)}...</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAlert({ visible: true, message: t('cannot_edit_admin_user'), type: 'danger' });
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-info transition-colors"
                                                    title="Edit"
                                                >
                                                    <IconEdit className="h-4 w-4" />
                                                </button>
                                                <Link
                                                    href={`/users/preview/${user.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-2 text-gray-400 hover:text-primary transition-colors"
                                                    title="View"
                                                >
                                                    <IconEye className="h-4 w-4" />
                                                </Link>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteRow(user.id);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-danger transition-colors"
                                                    title="Delete"
                                                >
                                                    <IconTrashLines className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

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
                        <div className="datatables pagination-padding relative">
                            <DataTable
                                className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap cursor-pointer'}`}
                                records={records}
                                onRowClick={(record) => {
                                    router.push(`/users/preview/${record.id}`);
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
                                        accessor: 'email',
                                        title: t('email'),
                                        sortable: true,
                                    },
                                    {
                                        accessor: 'user_roles.display_name',
                                        title: 'Role',
                                        sortable: true,
                                        render: ({ user_roles }) => (
                                            <span
                                                className={`badge ${
                                                    user_roles?.name === 'super_admin'
                                                        ? 'badge-danger'
                                                        : user_roles?.name === 'shop_owner'
                                                          ? 'badge-primary'
                                                          : user_roles?.name === 'delivery_owner'
                                                            ? 'badge-success'
                                                            : user_roles?.name === 'shop_editor'
                                                              ? 'badge-info'
                                                              : user_roles?.name === 'driver'
                                                                ? 'badge-warning'
                                                                : 'badge-secondary'
                                                }`}
                                            >
                                                {user_roles?.display_name || 'User'}
                                            </span>
                                        ),
                                    },
                                    {
                                        accessor: 'uid',
                                        title: t('uid'),
                                        sortable: true,
                                        render: ({ uid }) =>
                                            uid ? (
                                                <div className="relative group">
                                                    <span>{uid.substring(0, 8)}...</span>
                                                    <div className="absolute z-10 hidden group-hover:block bg-dark text-white text-xs rounded p-2 whitespace-nowrap">{uid}</div>
                                                </div>
                                            ) : (
                                                'N/A'
                                            ),
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
                                        render: ({ id, user_roles }) => (
                                            <div className="mx-auto flex w-max items-center gap-4">
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAlert({ visible: true, message: t('cannot_edit_admin_user'), type: 'danger' });
                                                    }}
                                                    className="flex hover:text-info"
                                                >
                                                    <IconEdit className="h-4.5 w-4.5" />
                                                </div>
                                                <Link href={`/users/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                                    <IconEye />
                                                </Link>
                                                {/* Only show delete button if user can delete users */}
                                                {canDeleteUsers() && (
                                                    <button
                                                        type="button"
                                                        className="flex hover:text-danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteRow(id);
                                                        }}
                                                    >
                                                        <IconTrashLines />
                                                    </button>
                                                )}
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
                                paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                                minHeight={300}
                            />
                        </div>
                    )}

                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                </div>
            </div>{' '}
            {/* Confirm Deletion Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                title={t('confirm_deletion')}
                message={t('confirm_delete_user')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setUserToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default UsersList;

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
import EditUserDialog from './components/EditUserDialog';
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
            shops?: Array<{
                id: number;
                shop_id: number;
                role: string;
                shops?: {
                    shop_name: string;
                } | null;
            }>;
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

    // Edit dialog state
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [userToEdit, setUserToEdit] = useState<any>(null);

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const fetchUsers = async () => {
        if (authLoading) return;

        // Check if user can access users page
        if (!canAccessUsers()) {
            router.push('/');
            return;
        }

        try {
            let query = supabase
                .from('profiles')
                .select(
                    `
                *,
                user_roles!inner (
                    id,
                    name,
                    display_name
                ),
                shops:user_roles_shop!user_roles_shop_user_id_fkey (
                    id,
                    shop_id,
                    role,
                    shops!inner (
                        shop_name
                    )
                )
            `,
                )
                .neq('role', 6); // Exclude customers (role=6)

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

    useEffect(() => {
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
    };

    const handleEditClick = (user: any) => {
        setUserToEdit(user);
        setShowEditDialog(true);
    };

    const handleEditSuccess = () => {
        // Refresh the users list
        fetchUsers();
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
                        // Card Grid View - Redesigned
                        <div className="p-3">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
                                {records.map((user) => (
                                    <div
                                        key={user.id}
                                        className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
                                    >
                                        {/* Header with Avatar and Status */}
                                        <div className="p-3 pb-2">
                                            <div className="flex items-center space-x-2">
                                                <div className="relative">
                                                    <img
                                                        className="h-8 w-8 rounded-lg object-cover ring-1 ring-gray-100 dark:ring-gray-700"
                                                        src={user.avatar_url || `/assets/images/user-placeholder.webp`}
                                                        alt={user.full_name}
                                                    />
                                                    <div
                                                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-white ${user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.full_name}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                                                    <span
                                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-0.5 ${
                                                            user.user_roles?.name === 'super_admin'
                                                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                : user.user_roles?.name === 'shop_owner'
                                                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                  : user.user_roles?.name === 'shop_editor'
                                                                    ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                        }`}
                                                    >
                                                        {user.user_roles?.display_name || 'User'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* User Details */}
                                        <div className="px-3 pb-2 flex-1">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                                                    <span
                                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                                            user.status === 'Active'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                        }`}
                                                    >
                                                        {user.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500 dark:text-gray-400">Joined</span>
                                                    <span className="text-gray-900 dark:text-white">{user.registration_date ? new Date(user.registration_date).toLocaleDateString('TR') : 'N/A'}</span>
                                                </div>
                                                {/* Shop Information for shop roles - Always show this section to maintain consistent height */}
                                                <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shops</div>
                                                    {(user.user_roles?.name === 'shop_owner' || user.user_roles?.name === 'shop_editor') && user.shops && user.shops.length > 0 ? (
                                                        <div className="flex flex-wrap gap-0.5">
                                                            {user.shops.slice(0, 2).map((shop, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                                >
                                                                    {shop.shops?.shop_name || `Shop ${shop.shop_id}`}
                                                                </span>
                                                            ))}
                                                            {user.shops.length > 2 && (
                                                                <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                                    +{user.shops.length - 2}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No shops</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(user);
                                                        }}
                                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                                        title="Edit User"
                                                    >
                                                        <IconEdit className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </button>
                                                    <Link
                                                        href={`/users/preview/${user.id}`}
                                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-primary border border-transparent rounded hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary"
                                                        title="View User"
                                                    >
                                                        <IconEye className="h-3 w-3 mr-1" />
                                                        View
                                                    </Link>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteRow(user.id);
                                                    }}
                                                    className="inline-flex items-center p-1 text-xs font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-500"
                                                    title="Delete User"
                                                >
                                                    <IconTrashLines className="h-3 w-3" />
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
                                                          : user_roles?.name === 'shop_editor'
                                                            ? 'badge-info'
                                                            : 'badge-secondary'
                                                }`}
                                            >
                                                {user_roles?.display_name || 'User'}
                                            </span>
                                        ),
                                    },
                                    {
                                        accessor: 'email',
                                        title: t('email'),
                                        sortable: true,
                                    },
                                    {
                                        accessor: 'shops',
                                        title: 'Shops',
                                        sortable: false,
                                        render: ({ shops, user_roles }) => {
                                            if (!['shop_owner', 'shop_editor'].includes(user_roles?.name || '')) {
                                                return <span className="text-gray-400">-</span>;
                                            }
                                            if (!shops || shops.length === 0) {
                                                return <span className="text-gray-400">No shops</span>;
                                            }
                                            return (
                                                <div className="flex flex-wrap gap-1">
                                                    {shops.slice(0, 2).map((shop: any, index: number) => (
                                                        <span
                                                            key={index}
                                                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                        >
                                                            {shop.shops?.shop_name || `Shop ${shop.shop_id}`}
                                                        </span>
                                                    ))}
                                                    {shops.length > 2 && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                                            +{shops.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        },
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
                                        render: ({ id, user_roles }) => {
                                            const user = items.find((u) => u.id === id);
                                            return (
                                                <div className="mx-auto flex w-max items-center gap-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (user) handleEditClick(user);
                                                        }}
                                                        className="flex hover:text-info"
                                                    >
                                                        <IconEdit className="h-4.5 w-4.5" />
                                                    </button>
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
            {/* Edit User Dialog */}
            <EditUserDialog
                isOpen={showEditDialog}
                onClose={() => {
                    setShowEditDialog(false);
                    setUserToEdit(null);
                }}
                user={userToEdit}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
};

export default UsersList;

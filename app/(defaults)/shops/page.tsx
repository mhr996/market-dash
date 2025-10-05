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
import StorageManager from '@/utils/storage-manager';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';

// Updated shop type reflecting the join with profiles, categories, and delivery companies.
interface ShopDeliveryCompany {
    id: number;
    shop_id: number;
    delivery_company_id: number;
    is_active: boolean;
    delivery_companies?: {
        id: number;
        company_name: string;
        logo_url: string | null;
    };
}

interface ShopOwner {
    id: number;
    user_id: string;
    shop_id: number;
    role: string;
    profiles?: {
        full_name: string;
    };
}

interface Shop {
    id: number;
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    active: boolean;
    created_at?: string;
    public: boolean;
    status: string;
    category_shop_id?: number | null;
    subcategory_shop_id?: number | null;
    categories_shop?: {
        id: number;
        title: string;
        description: string;
    };
    categories_sub_shop?: {
        id: number;
        title: string;
        description: string;
    };
    shop_delivery_companies?: ShopDeliveryCompany[];
    shop_owners?: ShopOwner[];
}

const ShopsList = () => {
    const [items, setItems] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();
    const { user, loading: authLoading, hasShopAccess } = useAuth();

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
    const [initialRecords, setInitialRecords] = useState<Shop[]>([]);
    const [records, setRecords] = useState<Shop[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // New state for confirm modal and alert.
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchShops = async () => {
            if (authLoading) return;

            try {
                // Get accessible shop IDs based on user role
                const accessibleShopIds = await getAccessibleShopIds();

                if (accessibleShopIds.length === 0) {
                    setItems([]);
                    setLoading(false);
                    return;
                }

                // Join the profiles table, categories, delivery companies, and shop owners
                const { data, error } = await supabase
                    .from('shops')
                    .select(
                        `
                        *,
                        categories_shop!category_shop_id(*),
                        categories_sub_shop!subcategory_shop_id(*),
                        shop_delivery_companies(
                            id,
                            is_active,
                            delivery_companies(
                                id,
                                company_name,
                                logo_url
                            )
                        ),
                        shop_owners:user_roles_shop(
                            id,
                            user_id,
                            shop_id,
                            role,
                            profiles(
                                full_name,
                                email
                            )
                        )
                    `,
                    )
                    .in('id', accessibleShopIds)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setItems(data as Shop[]);
            } catch (error) {
                console.error('Error fetching shops:', error);
                setAlert({ visible: true, message: 'Error fetching shops', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchShops();
    }, [user?.role_name, authLoading]);

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        setInitialRecords(
            items.filter((item) => {
                const searchTerm = search.toLowerCase();
                return (
                    item.shop_name.toLowerCase().includes(searchTerm) ||
                    // Also search owner names if available.
                    (item.shop_owners?.some((owner) => owner.profiles?.full_name.toLowerCase().includes(searchTerm)) ?? false)
                );
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof Shop);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: number | null = null) => {
        if (id) {
            const shop = items.find((s) => s.id === id);
            if (shop) {
                setShopToDelete(shop);
                setShowConfirmModal(true);
            }
        }
    };

    // Confirm deletion callback.
    const confirmDeletion = async () => {
        if (!shopToDelete || !shopToDelete.id) return;
        try {
            // Delete all shop data from storage (logo, cover, gallery, products)
            await StorageManager.removeShopCompletely(shopToDelete.id);

            const { error } = await supabase.from('shops').delete().eq('id', shopToDelete.id);
            if (error) throw error;
            const updatedItems = items.filter((s) => s.id !== shopToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('shop_deleted_successfully'), type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: t('error_deleting_shop'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setShopToDelete(null);
        }
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
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
            <div className="invoice-table w-full max-w-none">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-danger gap-2">
                            <IconTrashLines />
                            {t('delete')}
                        </button>
                        {/* Only show Add New button for super_admin */}
                        {user?.role_name === 'super_admin' && (
                            <Link href="/shops/add" className="btn btn-primary gap-2">
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
                        <div className="p-6">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {initialRecords.slice((page - 1) * pageSize, page * pageSize).map((shop) => (
                                    <div
                                        key={shop.id}
                                        className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
                                    >
                                        {/* Shop Logo */}
                                        <div className="relative">
                                            <img className="h-48 w-full object-cover rounded-t-xl" src={shop.logo_url || `/assets/images/shop-placeholder.jpg`} alt={shop.shop_name} />
                                            <div className="absolute top-2 right-2">
                                                <span className={`badge ${shop.active ? 'badge-success' : 'badge-danger'}`}>{shop.active ? 'Active' : 'Inactive'}</span>
                                            </div>
                                        </div>

                                        {/* Shop Details */}
                                        <div className="p-6 flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{shop.shop_name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-3">{shop.shop_desc}</p>

                                            {/* Shop Info */}
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                                                    <span className="font-medium capitalize">{shop.status}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-gray-400">Public</span>
                                                    <span className="font-medium">{shop.public ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-gray-400">Created</span>
                                                    <span className="font-medium">{new Date(shop.created_at || '').toLocaleDateString()}</span>
                                                </div>
                                                {shop.shop_owners && shop.shop_owners.length > 0 && (
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-500 dark:text-gray-400">Owners</span>
                                                        <span className="font-medium">{shop.shop_owners.length}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex space-x-3">
                                                    <Link
                                                        href={`/shops/edit/${shop.id}`}
                                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                                        title="Edit Shop"
                                                    >
                                                        <IconEdit className="h-4 w-4 mr-1" />
                                                        Edit
                                                    </Link>
                                                    <Link
                                                        href={`/shops/preview/${shop.id}`}
                                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                                        title="View Shop"
                                                    >
                                                        <IconEye className="h-4 w-4 mr-1" />
                                                        View
                                                    </Link>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShopToDelete(shop);
                                                        setShowConfirmModal(true);
                                                    }}
                                                    className="inline-flex items-center p-2 text-sm font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                    title="Delete Shop"
                                                >
                                                    <IconTrashLines className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {initialRecords.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 dark:text-gray-400">No shops found.</p>
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
                        <div className="datatables pagination-padding relative">
                            <DataTable
                                className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap cursor-pointer'}`}
                                records={records}
                                onRowClick={(record) => {
                                    router.push(`/shops/preview/${record.id}`);
                                }}
                                columns={[
                                    {
                                        accessor: 'id',
                                        title: t('id'),
                                        sortable: true,
                                        render: ({ id }) => <strong className="text-info">#{id}</strong>,
                                    },
                                    {
                                        accessor: 'shop_name',
                                        title: t('shop_name'),
                                        sortable: true,
                                        render: ({ shop_name, logo_url }) => (
                                            <div className="flex items-center font-semibold">
                                                <div className="w-max rounded-full ltr:mr-2 rtl:ml-2 flex items-center justify-center">
                                                    <img className="h-8 w-8 rounded-full object-cover" src={logo_url || `/assets/images/user-placeholder.webp`} alt="" />
                                                </div>
                                                <div>{shop_name}</div>
                                            </div>
                                        ),
                                    },
                                    {
                                        accessor: 'shop_owners',
                                        title: t('shop_owner'),
                                        sortable: false,
                                        render: ({ shop_owners }) => {
                                            const owners = shop_owners || [];

                                            if (owners.length === 0) {
                                                return <span className="text-gray-500">Unassigned</span>;
                                            }

                                            // Show all owners (shop_owner, shop_editor, etc.)

                                            return (
                                                <div className="flex flex-wrap gap-1">
                                                    {owners.map((owner, index) => (
                                                        <span key={index} className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
                                                            {owner.profiles?.full_name || 'Unknown'} ({owner.role})
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        },
                                    },
                                    {
                                        accessor: 'created_at',
                                        title: t('registration_date'),
                                        sortable: true,
                                        render: ({ created_at }) => (created_at ? <span>{new Date(created_at).toLocaleDateString('TR')}</span> : ''),
                                    },
                                    {
                                        accessor: 'status',
                                        title: t('status'),
                                        sortable: true,
                                        render: ({ status }) => {
                                            let statusClass = 'warning';
                                            if (status === 'Approved') statusClass = 'success';
                                            else if (status === 'Rejected') statusClass = 'danger';

                                            return <span className={`badge badge-outline-${statusClass}`}>{status ? t(status.toLowerCase()) : t('pending')}</span>;
                                        },
                                    },
                                    {
                                        accessor: 'visibility',
                                        title: t('visibility'),
                                        sortable: true,
                                        render: ({ public: isPublic }) => <span className={`badge badge-outline-${isPublic ? 'success' : 'danger'}`}>{isPublic ? t('public') : t('private')}</span>,
                                    },
                                    {
                                        accessor: 'categories_shop.title',
                                        title: 'Category',
                                        sortable: true,
                                        render: ({ categories_shop }) => <span className="badge bg-primary text-white">{categories_shop?.title || 'Uncategorized'}</span>,
                                    },
                                    {
                                        accessor: 'categories_sub_shop.title',
                                        title: 'Sub Category',
                                        sortable: true,
                                        render: ({ categories_sub_shop }) => <span className="badge bg-secondary text-white">{categories_sub_shop?.title || 'No Sub Category'}</span>,
                                    },
                                    {
                                        accessor: 'shop_delivery_companies',
                                        title: 'Delivery Companies',
                                        sortable: false,
                                        render: ({ shop_delivery_companies }) => {
                                            if (!shop_delivery_companies || shop_delivery_companies.length === 0) {
                                                return <span className="text-gray-400">No delivery companies</span>;
                                            }

                                            const activeCompanies = shop_delivery_companies.filter((sdc) => sdc.is_active);

                                            if (activeCompanies.length === 0) {
                                                return <span className="text-gray-400">No active companies</span>;
                                            }

                                            return (
                                                <div className="space-y-1">
                                                    {activeCompanies.slice(0, 2).map((sdc, index) => (
                                                        <div key={sdc.id} className="flex items-center space-x-1">
                                                            <span className="badge bg-success text-white text-xs">{sdc.delivery_companies?.company_name || `Company ${sdc.delivery_company_id}`}</span>
                                                        </div>
                                                    ))}
                                                    {activeCompanies.length > 2 && <div className="text-xs text-gray-500">+{activeCompanies.length - 2} more</div>}
                                                </div>
                                            );
                                        },
                                    },
                                    {
                                        accessor: 'action',
                                        title: t('actions'),
                                        sortable: false,
                                        textAlignment: 'center',
                                        render: ({ id }) => (
                                            <div className="mx-auto flex w-max items-center gap-4">
                                                <Link href={`/shops/edit/${id}`} className="flex hover:text-info" onClick={(e) => e.stopPropagation()}>
                                                    <IconEdit className="h-4.5 w-4.5" />
                                                </Link>
                                                <Link href={`/shops/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                                    <IconEye />
                                                </Link>
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
            </div>

            {/* Confirm Deletion Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                title={t('confirm_deletion')}
                message={t('confirm_delete_shop')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setShopToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default ShopsList;

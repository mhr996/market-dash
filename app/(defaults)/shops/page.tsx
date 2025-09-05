'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
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

// Updated shop type reflecting the join with profiles.
interface Shop {
    id: number;
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    owner: string;
    active: boolean;
    created_at?: string;
    public: boolean;
    status: string;
    profiles?: {
        full_name: string;
    };
}

const ShopsList = () => {
    const [items, setItems] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();

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
            try {
                // Join the profiles table to fetch owner's full name.
                const { data, error } = await supabase.from('shops').select('*, profiles(full_name)').order('created_at', { ascending: false });
                if (error) throw error;
                setItems(data as Shop[]);
            } catch (error) {
                console.error('Error fetching shops:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchShops();
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
        setInitialRecords(
            items.filter((item) => {
                const searchTerm = search.toLowerCase();
                return (
                    item.shop_name.toLowerCase().includes(searchTerm) ||
                    // Also search owner name if available.
                    (item.profiles?.full_name.toLowerCase().includes(searchTerm) ?? false)
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
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: t('error_deleting_shop'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setShopToDelete(null);
        }
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
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
                        <button type="button" className="btn btn-danger gap-2">
                            <IconTrashLines />
                            {t('delete')}
                        </button>
                        <Link href="/shops/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new')}
                        </Link>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

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
                                accessor: 'owner',
                                title: t('shop_owner'),
                                sortable: true,
                                render: ({ owner, profiles }) => <span>{profiles ? profiles.full_name : owner}</span>,
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

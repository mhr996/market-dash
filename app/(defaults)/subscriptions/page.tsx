'use client';
import IconEye from '@/components/icon/icon-eye';
import IconEdit from '@/components/icon/icon-edit';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

// Subscription interface
interface Subscription {
    id: number;
    license_id: number;
    profile_id: string;
    created_at: string;
    status: string;
    license?: {
        title: string;
    };
    profiles?: {
        full_name: string;
        email: string;
    };
}

const SubscriptionsList = () => {
    const [items, setItems] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Subscription[]>([]);
    const [records, setRecords] = useState<Subscription[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // State for alert
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchSubscriptions = async () => {
            try {
                // Join with licenses and profiles tables to get additional information
                const { data, error } = await supabase.from('subscriptions').select('*, license:license_id(title), profiles:profile_id(full_name, email)').order('created_at', { ascending: false });

                if (error) throw error;
                setItems(data as Subscription[]);
            } catch (error) {
                console.error('Error fetching subscriptions:', error);
                setAlert({ visible: true, message: 'Error fetching subscriptions', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };
        fetchSubscriptions();
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
                    item.id.toString().includes(searchTerm) ||
                    item.license?.title.toLowerCase().includes(searchTerm) ||
                    item.profiles?.full_name.toLowerCase().includes(searchTerm) ||
                    item.profiles?.email.toLowerCase().includes(searchTerm) ||
                    item.status.toLowerCase().includes(searchTerm)
                );
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof Subscription);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

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
                {/* Header with title */}
                <div className="mb-4.5 flex flex-col px-5">
                    <div className="mb-5">
                        <h5 className="text-lg font-semibold dark:text-white-light">Subscriptions</h5>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('view_only_mode')}</p>
                        </div>
                        <div className="ltr:ml-auto rtl:mr-auto">
                            <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="datatables pagination-padding relative">
                    <DataTable
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap cursor-pointer'}`}
                        records={records}
                        onRowClick={(record) => {
                            router.push(`/subscriptions/preview/${record.id}`);
                        }}
                        columns={[
                            {
                                accessor: 'id',
                                title: t('id'),
                                sortable: true,
                                render: ({ id }) => <strong className="text-info">#{id}</strong>,
                            },
                            {
                                accessor: 'license_id',
                                title: t('license'),
                                sortable: true,
                                render: ({ license }) => <span>{license?.title || 'N/A'}</span>,
                            },
                            {
                                accessor: 'profile_id',
                                title: t('user'),
                                sortable: true,
                                render: ({ profiles }) => (
                                    <div>
                                        <p className="font-semibold">{profiles?.full_name || 'N/A'}</p>
                                        <p className="text-gray-600 text-xs">{profiles?.email || ''}</p>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'status',
                                title: t('status'),
                                sortable: true,
                                render: ({ status }) => <span className={`badge badge-outline-${status === 'Active' ? 'success' : 'danger'}`}>{status}</span>,
                            },
                            {
                                accessor: 'created_at',
                                title: t('created_date'),
                                sortable: true,
                                render: ({ created_at }) => (created_at ? <span>{new Date(created_at).toLocaleDateString()}</span> : ''),
                            },
                            {
                                accessor: 'action',
                                title: t('actions'),
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <Link href={`/subscriptions/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                            <IconEye />
                                        </Link>
                                        <Link href={`/subscriptions/edit/${id}`} className="flex hover:text-info" onClick={(e) => e.stopPropagation()}>
                                            <IconEdit />
                                        </Link>
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
        </div>
    );
};

export default SubscriptionsList;

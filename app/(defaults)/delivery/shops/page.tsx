'use client';
import IconEye from '@/components/icon/icon-eye';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';

interface DeliveryCompany {
    id: number;
    company_name: string;
    logo_url: string | null;
}

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
    delivery_companies_id?: number | null;
    profiles?: {
        full_name: string;
    };
    delivery_companies?: DeliveryCompany;
}

const DeliveryShopsList = () => {
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

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchShops = async () => {
            try {
                // Join the profiles table and delivery_companies table to fetch owner's full name and delivery company info
                const { data, error } = await supabase
                    .from('shops')
                    .select(
                        `
                        *,
                        profiles(full_name),
                        delivery_companies(id, company_name, logo_url)
                    `,
                    )
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setItems(data as Shop[]);
            } catch (error) {
                setAlert({ visible: true, message: 'Error fetching shops', type: 'danger' });
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
                    (item.profiles?.full_name.toLowerCase().includes(searchTerm) ?? false) ||
                    (item.delivery_companies?.company_name.toLowerCase().includes(searchTerm) ?? false)
                );
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof Shop);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

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
                        <h1 className="text-xl font-semibold text-black dark:text-white-light">Delivery Shops</h1>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="datatables pagination-padding relative w-full max-w-none">
                    <DataTable
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap cursor-pointer'}`}
                        records={records}
                        onRowClick={(record) => {
                            router.push(`/delivery/shops/preview/${record.id}`);
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
                                accessor: 'delivery_companies.company_name',
                                title: 'Delivery Company',
                                sortable: true,
                                render: ({ delivery_companies }) => (
                                    <div className="flex items-center">
                                        {delivery_companies ? (
                                            <>
                                                {delivery_companies.logo_url && (
                                                    <img className="h-6 w-6 rounded-full object-cover mr-2" src={delivery_companies.logo_url} alt={delivery_companies.company_name} />
                                                )}
                                                <span className="font-medium">{delivery_companies.company_name}</span>
                                            </>
                                        ) : (
                                            <span className="text-gray-500">No Company Assigned</span>
                                        )}
                                    </div>
                                ),
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
                                        <Link href={`/delivery/shops/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
                                            <IconEye />
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

export default DeliveryShopsList;

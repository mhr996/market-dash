'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconBuilding from '@/components/icon/icon-building';
import IconSearch from '@/components/icon/icon-search';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { sortBy } from 'lodash';
import { getTranslation } from '@/i18n';

interface Shop {
    id: number;
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    status: string;
    public: boolean;
    created_at: string;
    owner: string;
    profiles?: {
        full_name: string;
    };
    categories_shop?: {
        id: number;
        title: string;
        description: string;
    };
}

const CMSSelector = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [shops, setShops] = useState<Shop[]>([]);
    const [records, setRecords] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'shop_name',
        direction: 'asc',
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const { data, error } = await supabase
                    .from('shops')
                    .select(
                        `
                        id,
                        shop_name,
                        shop_desc,
                        logo_url,
                        status,
                        public,
                        created_at,
                        owner,
                        profiles(full_name),
                        categories_shop(id, title, description)
                    `,
                    )
                    .order('shop_name', { ascending: true });

                if (error) throw error;
                const formattedShops = (data || []).map((shop) => ({
                    ...shop,
                    profiles: Array.isArray(shop.profiles) ? shop.profiles[0] : shop.profiles,
                    categories_shop: Array.isArray(shop.categories_shop) ? shop.categories_shop[0] : shop.categories_shop,
                }));
                setShops(formattedShops);
            } catch (error) {
                console.error('Error fetching shops:', error);
                setAlert({ visible: true, message: 'Error fetching shops', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        fetchShops();
    }, []);

    // Search and filter
    useEffect(() => {
        let filteredShops = shops.filter((shop) => {
            const searchTerm = search.toLowerCase();
            return (
                shop.shop_name.toLowerCase().includes(searchTerm) ||
                shop.shop_desc.toLowerCase().includes(searchTerm) ||
                (shop.profiles?.full_name.toLowerCase().includes(searchTerm) ?? false) ||
                shop.categories_shop?.title.toLowerCase().includes(searchTerm)
            );
        });

        // Sort the filtered shops
        const sorted = sortBy(filteredShops, sortStatus.columnAccessor as keyof Shop);
        const sortedShops = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

        // Paginate the sorted shops
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...sortedShops.slice(from, to)]);
    }, [page, pageSize, shops, search, sortStatus]);

    const handleShopSelect = (shopId: number) => {
        router.push(`/shops/cms/${shopId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shop CMS</h1>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <div className="relative">
                            <input type="text" className="form-input pl-10" placeholder="Search shops..." value={search} onChange={(e) => setSearch(e.target.value)} />
                            <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="datatables pagination-padding relative w-full max-w-none">
                    <DataTable
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap cursor-pointer'}`}
                        records={records}
                        onRowClick={(record) => {
                            handleShopSelect(record.id);
                        }}
                        columns={[
                            {
                                accessor: 'id',
                                title: 'ID',
                                sortable: true,
                                render: ({ id }) => <strong className="text-info">#{id}</strong>,
                            },
                            {
                                accessor: 'shop_name',
                                title: 'Shop Name',
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
                                title: 'Owner',
                                sortable: true,
                                render: ({ owner, profiles }) => <span>{profiles ? profiles.full_name : owner}</span>,
                            },
                            {
                                accessor: 'created_at',
                                title: 'Registration Date',
                                sortable: true,
                                render: ({ created_at }) => (created_at ? <span>{new Date(created_at).toLocaleDateString('TR')}</span> : ''),
                            },
                            {
                                accessor: 'status',
                                title: 'Status',
                                sortable: true,
                                render: ({ status }) => {
                                    let statusClass = 'warning';
                                    if (status === 'Approved') statusClass = 'success';
                                    else if (status === 'Rejected') statusClass = 'danger';

                                    return <span className={`badge badge-outline-${statusClass}`}>{status || 'Pending'}</span>;
                                },
                            },
                            {
                                accessor: 'visibility',
                                title: 'Visibility',
                                sortable: true,
                                render: ({ public: isPublic }) => <span className={`badge badge-outline-${isPublic ? 'success' : 'danger'}`}>{isPublic ? 'Public' : 'Private'}</span>,
                            },
                            {
                                accessor: 'categories_shop.title',
                                title: 'Category',
                                sortable: true,
                                render: ({ categories_shop }) => <span className="badge bg-primary text-white">{categories_shop?.title || 'Uncategorized'}</span>,
                            },
                            {
                                accessor: 'action',
                                title: 'Actions',
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <button
                                            type="button"
                                            className="flex hover:text-primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleShopSelect(id);
                                            }}
                                        >
                                            <IconBuilding className="h-4.5 w-4.5" />
                                        </button>
                                    </div>
                                ),
                            },
                        ]}
                        highlightOnHover
                        totalRecords={shops.length}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={(p) => setPage(p)}
                        recordsPerPageOptions={PAGE_SIZES}
                        onRecordsPerPageChange={setPageSize}
                        sortStatus={sortStatus}
                        onSortStatusChange={setSortStatus}
                        paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} entries`}
                        minHeight={300}
                    />

                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                </div>
            </div>
        </div>
    );
};

export default CMSSelector;

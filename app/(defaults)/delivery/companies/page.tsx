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

// Updated delivery company type reflecting the join with delivery_methods.
interface DeliveryMethod {
    id: number;
    label: string;
    delivery_time: string;
    price: number;
    is_active: boolean;
}

interface Shop {
    id: number;
    shop_name: string;
    logo_url: string | null;
}

interface ShopDeliveryCompany {
    id: number;
    is_active: boolean;
    shops?: Shop;
}

interface DeliveryCompany {
    id: number;
    company_name: string;
    logo_url: string | null;
    owner_name: string;
    created_at?: string;
    delivery_methods?: DeliveryMethod[];
    shop_delivery_companies?: ShopDeliveryCompany[];
}

const DeliveryCompaniesList = () => {
    const [items, setItems] = useState<DeliveryCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<DeliveryCompany[]>([]);
    const [records, setRecords] = useState<DeliveryCompany[]>([]);
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
    const [companyToDelete, setCompanyToDelete] = useState<DeliveryCompany | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                // Join the delivery_methods table to fetch pricing information.
                const { data, error } = await supabase
                    .from('delivery_companies')
                    .select(
                        `
                        *,
                        delivery_methods(
                            id,
                            label,
                            delivery_time,
                            price,
                            is_active
                        ),
                        shop_delivery_companies(
                            id,
                            is_active,
                            shops(
                                id,
                                shop_name,
                                logo_url
                            )
                        )
                    `,
                    )
                    .order('created_at', { ascending: false });
                if (error) throw error;
                console.log('Delivery companies fetched successfully:', data);
                setItems(data as DeliveryCompany[]);
            } catch (error) {
                console.error('Error fetching delivery companies:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
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
                return item.company_name.toLowerCase().includes(searchTerm) || item.owner_name.toLowerCase().includes(searchTerm);
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof DeliveryCompany);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: number | null = null) => {
        if (id) {
            const company = items.find((c) => c.id === id);
            if (company) {
                setCompanyToDelete(company);
                setShowConfirmModal(true);
            }
        }
    };

    // Confirm deletion callback.
    const confirmDeletion = async () => {
        if (!companyToDelete || !companyToDelete.id) return;
        try {
            const { error } = await supabase.from('delivery_companies').delete().eq('id', companyToDelete.id);
            if (error) throw error;
            const updatedItems = items.filter((c) => c.id !== companyToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('company_deleted_successfully'), type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: t('error_deleting_company'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setCompanyToDelete(null);
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
                        <Link href="/delivery/companies/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new')}
                        </Link>
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
                        <div className="p-3">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
                                {initialRecords.slice((page - 1) * pageSize, page * pageSize).map((company) => (
                                    <div
                                        key={company.id}
                                        className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
                                    >
                                        {/* Company Logo */}
                                        <div className="relative">
                                            <img className="h-20 w-full object-cover rounded-t-xl" src={company.logo_url || `/assets/images/company-placeholder.jpg`} alt={company.company_name} />
                                        </div>

                                        {/* Company Details */}
                                        <div className="p-3 flex-1">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{company.company_name}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">Owner: {company.owner_name}</p>

                                            {/* Company Info */}
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-gray-400">Methods</span>
                                                    <span className="font-medium">{company.delivery_methods?.length || 0}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-gray-400">Shops</span>
                                                    <span className="font-medium">{company.shop_delivery_companies?.length || 0}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex space-x-1">
                                                    <Link
                                                        href={`/delivery/companies/edit/${company.id}`}
                                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                                        title="Edit Company"
                                                    >
                                                        <IconEdit className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Link>
                                                    <Link
                                                        href={`/delivery/companies/preview/${company.id}`}
                                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-primary border border-transparent rounded hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary"
                                                        title="View Company"
                                                    >
                                                        <IconEye className="h-3 w-3 mr-1" />
                                                        View
                                                    </Link>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCompanyToDelete(company);
                                                        setShowConfirmModal(true);
                                                    }}
                                                    className="inline-flex items-center p-1 text-xs font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-500"
                                                    title="Delete Company"
                                                >
                                                    <IconTrashLines className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {initialRecords.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 dark:text-gray-400">No companies found.</p>
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
                                    router.push(`/delivery/companies/preview/${record.id}`);
                                }}
                                columns={[
                                    {
                                        accessor: 'id',
                                        title: t('id'),
                                        sortable: true,
                                        render: ({ id }) => <strong className="text-info">#{id}</strong>,
                                    },
                                    {
                                        accessor: 'company_name',
                                        title: t('company_name'),
                                        sortable: true,
                                        render: ({ company_name, logo_url }) => (
                                            <div className="flex items-center font-semibold">
                                                <div className="w-max rounded-full ltr:mr-2 rtl:ml-2 flex items-center justify-center">
                                                    <img className="h-8 w-8 rounded-full object-cover" src={logo_url || `/assets/images/user-placeholder.webp`} alt="" />
                                                </div>
                                                <div>{company_name}</div>
                                            </div>
                                        ),
                                    },
                                    {
                                        accessor: 'owner',
                                        title: t('owner_name'),
                                        sortable: true,
                                        render: ({ owner_name }) => <span>{owner_name}</span>,
                                    },
                                    {
                                        accessor: 'created_at',
                                        title: t('registration_date'),
                                        sortable: true,
                                        render: ({ created_at }) => (created_at ? <span>{new Date(created_at).toLocaleDateString('TR')}</span> : ''),
                                    },
                                    {
                                        accessor: 'delivery_methods',
                                        title: 'Delivery Methods',
                                        sortable: false,
                                        render: ({ delivery_methods }) => {
                                            if (!delivery_methods || delivery_methods.length === 0) {
                                                return <span className="text-gray-400">No methods</span>;
                                            }

                                            const activeMethods = delivery_methods.filter((method) => method.is_active);

                                            if (activeMethods.length === 0) {
                                                return <span className="text-gray-400">No active methods</span>;
                                            }

                                            return (
                                                <div className="space-y-1">
                                                    {activeMethods.slice(0, 2).map((method, index) => (
                                                        <div key={method.id} className="text-xs">
                                                            <span className="font-medium text-gray-700 dark:text-gray-300">{method.label}</span>
                                                            <span className="text-gray-500 dark:text-gray-400 ml-1">({method.delivery_time})</span>
                                                            <span className="font-semibold text-primary ml-1">${method.price}</span>
                                                        </div>
                                                    ))}
                                                    {activeMethods.length > 2 && <div className="text-xs text-gray-500">+{activeMethods.length - 2} more</div>}
                                                </div>
                                            );
                                        },
                                    },
                                    {
                                        accessor: 'shop_delivery_companies',
                                        title: 'Assigned Shops',
                                        sortable: false,
                                        render: ({ shop_delivery_companies }) => {
                                            if (!shop_delivery_companies || shop_delivery_companies.length === 0) {
                                                return <span className="text-gray-400">No shops assigned</span>;
                                            }

                                            const activeShops = shop_delivery_companies.filter((sdc) => sdc.is_active && sdc.shops);

                                            if (activeShops.length === 0) {
                                                return <span className="text-gray-400">No active shops</span>;
                                            }

                                            return (
                                                <div className="space-y-1">
                                                    {activeShops.slice(0, 2).map((sdc, index) => (
                                                        <div key={sdc.id} className="flex items-center space-x-1">
                                                            <span className="badge bg-success text-white text-xs">{sdc.shops?.shop_name || `Shop ${sdc.id}`}</span>
                                                        </div>
                                                    ))}
                                                    {activeShops.length > 2 && <div className="text-xs text-gray-500">+{activeShops.length - 2} more</div>}
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
                                                <Link href={`/delivery/companies/edit/${id}`} className="flex hover:text-info" onClick={(e) => e.stopPropagation()}>
                                                    <IconEdit className="h-4.5 w-4.5" />
                                                </Link>
                                                <Link href={`/delivery/companies/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
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
                message={t('confirm_delete_company')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setCompanyToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default DeliveryCompaniesList;

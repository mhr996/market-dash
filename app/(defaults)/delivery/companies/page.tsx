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
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';

// Updated delivery company type reflecting the join with delivery_prices.
interface DeliveryCompany {
    id: number;
    company_name: string;
    logo_url: string | null;
    owner_name: string;
    created_at?: string;
    delivery_prices?: {
        express_price: number;
        fast_price: number;
        standard_price: number;
    };
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
                // Join the delivery_prices table to fetch pricing information.
                const { data, error } = await supabase
                    .from('delivery_companies')
                    .select(
                        `
                        *,
                        delivery_prices(
                            express_price, 
                            fast_price, 
                            standard_price
                        )
                    `,
                    )
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setItems(data as DeliveryCompany[]);
            } catch (error) {
                // Error fetching delivery companies
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
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="datatables pagination-padding relative w-full max-w-none">
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
                                accessor: 'express_price',
                                title: t('express_same_day'),
                                sortable: true,
                                render: ({ delivery_prices }) => {
                                    const prices = Array.isArray(delivery_prices) ? delivery_prices[0] : delivery_prices;
                                    return <span className="font-semibold text-danger">${prices?.express_price || 'N/A'}</span>;
                                },
                            },
                            {
                                accessor: 'fast_price',
                                title: t('fast_2_3_days'),
                                sortable: true,
                                render: ({ delivery_prices }) => {
                                    const prices = Array.isArray(delivery_prices) ? delivery_prices[0] : delivery_prices;
                                    return <span className="font-semibold text-warning">${prices?.fast_price || 'N/A'}</span>;
                                },
                            },
                            {
                                accessor: 'standard_price',
                                title: t('standard_3_5_days'),
                                sortable: true,
                                render: ({ delivery_prices }) => {
                                    const prices = Array.isArray(delivery_prices) ? delivery_prices[0] : delivery_prices;
                                    return <span className="font-semibold text-success">${prices?.standard_price || 'N/A'}</span>;
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

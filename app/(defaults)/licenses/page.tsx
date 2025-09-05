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

// License interface
interface License {
    id: number;
    title: string;
    desc: string;
    price: number;
    created_at: string;
    shops: number;
    products: number;
}

const LicensesList = () => {
    const [items, setItems] = useState<License[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<License[]>([]);
    const [records, setRecords] = useState<License[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // State for confirm modal and alert
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [licenseToDelete, setLicenseToDelete] = useState<License | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchLicenses = async () => {
            try {
                const { data, error } = await supabase.from('licenses').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                setItems(data as License[]);
            } catch (error) {
                console.error('Error fetching licenses:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLicenses();
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
                return item.title.toLowerCase().includes(searchTerm) || item.desc.toLowerCase().includes(searchTerm);
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof License);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);
    const deleteRow = (id: number | null = null) => {
        if (id) {
            const license = items.find((c) => c.id === id);
            if (license) {
                setLicenseToDelete(license);
                setShowConfirmModal(true);
            }
        }
    };

    // Confirm deletion callback
    const confirmDeletion = async () => {
        if (!licenseToDelete || !licenseToDelete.id) return;
        try {
            const { error } = await supabase.from('licenses').delete().eq('id', licenseToDelete.id);
            if (error) throw error;
            setItems((prevItems) => prevItems.filter((item) => item.id !== licenseToDelete.id));
            setAlert({ visible: true, message: t('license_deleted_successfully'), type: 'success' });
        } catch (error: any) {
            console.error('Error deleting license:', error);
            setAlert({ visible: true, message: error.message || t('error_deleting_license'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setLicenseToDelete(null);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
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
            {/* Confirm Modal */}
            {showConfirmModal && licenseToDelete && (
                <ConfirmModal
                    isOpen={showConfirmModal}
                    title={t('delete_license')}
                    message={`${t('confirm_delete_license')} "${licenseToDelete.title}"`}
                    onConfirm={confirmDeletion}
                    onCancel={() => {
                        setShowConfirmModal(false);
                        setLicenseToDelete(null);
                    }}
                />
            )}
            <div className="invoice-table">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    {' '}
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-danger gap-2" onClick={() => deleteRow(selectedRecords[0]?.id)}>
                            <IconTrashLines />
                            {t('delete')}
                        </button>
                        <Link href="/licenses/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new')}
                        </Link>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>
                <div className="datatables pagination-padding relative">
                    {' '}
                    <DataTable
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap cursor-pointer'}`}
                        records={records}
                        onRowClick={(record) => {
                            router.push(`/licenses/preview/${record.id}`);
                        }}
                        columns={[
                            {
                                accessor: 'id',
                                title: t('id'),
                                sortable: true,
                                render: ({ id }) => <strong className="text-info">#{id}</strong>,
                            },
                            {
                                accessor: 'title',
                                title: t('title'),
                                sortable: true,
                            },
                            {
                                accessor: 'desc',
                                title: t('description'),
                                sortable: true,
                            },
                            {
                                accessor: 'price',
                                title: t('price'),
                                sortable: true,
                                render: ({ price }) => formatCurrency(price),
                            },
                            {
                                accessor: 'shops',
                                title: t('shops'),
                                sortable: true,
                                render: ({ shops }) => <span className="badge badge-outline-info">{shops}</span>,
                            },
                            {
                                accessor: 'products',
                                title: t('products'),
                                sortable: true,
                                render: ({ products }) => <span className="badge badge-outline-primary">{products}</span>,
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
                                        <Link href={`/licenses/edit/${id}`} className="flex hover:text-info" onClick={(e) => e.stopPropagation()}>
                                            <IconEdit className="h-4.5 w-4.5" />
                                        </Link>
                                        <Link href={`/licenses/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
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
                        minHeight={300}
                    />
                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                </div>
            </div>
        </div>
    );
};

export default LicensesList;

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

interface DeliveryCar {
    id: number;
    plate_number: string;
    brand: string;
    model: string;
    color: string | null;
    capacity: number | null;
    car_number: string | null;
    car_model: string | null;
    delivery_drivers_id: number | null;
    created_at?: string;
    delivery_drivers?: {
        id: number;
        name: string;
        phone: string | null;
    };
}

const DeliveryCarsList = () => {
    const [items, setItems] = useState<DeliveryCar[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<DeliveryCar[]>([]);
    const [records, setRecords] = useState<DeliveryCar[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // New state for confirm modal and alert.
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [carToDelete, setCarToDelete] = useState<DeliveryCar | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchCars = async () => {
            try {
                const { data, error } = await supabase
                    .from('delivery_cars')
                    .select(
                        `
                        *,
                        delivery_drivers(
                            id,
                            name,
                            phone
                        )
                    `,
                    )
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setItems(data as DeliveryCar[]);
            } catch (error) {
                // Error fetching delivery cars
            } finally {
                setLoading(false);
            }
        };
        fetchCars();
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
                    item.plate_number.toLowerCase().includes(searchTerm) ||
                    item.brand.toLowerCase().includes(searchTerm) ||
                    item.model.toLowerCase().includes(searchTerm) ||
                    item.color?.toLowerCase().includes(searchTerm) ||
                    item.delivery_drivers?.name.toLowerCase().includes(searchTerm)
                );
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof DeliveryCar);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: number | null = null) => {
        if (id) {
            const car = items.find((c) => c.id === id);
            if (car) {
                setCarToDelete(car);
                setShowConfirmModal(true);
            }
        }
    };

    // Confirm deletion callback.
    const confirmDeletion = async () => {
        if (!carToDelete || !carToDelete.id) return;
        try {
            const { error } = await supabase.from('delivery_cars').delete().eq('id', carToDelete.id);
            if (error) throw error;
            const updatedItems = items.filter((c) => c.id !== carToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('car_deleted_successfully'), type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: t('error_deleting_car'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setCarToDelete(null);
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
                        <Link href="/delivery/cars/add" className="btn btn-primary gap-2">
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
                            router.push(`/delivery/cars/preview/${record.id}`);
                        }}
                        columns={[
                            {
                                accessor: 'id',
                                title: t('id'),
                                sortable: true,
                                render: ({ id }) => <strong className="text-info">#{id}</strong>,
                            },
                            {
                                accessor: 'plate_number',
                                title: t('plate_number'),
                                sortable: true,
                                render: ({ plate_number }) => <span className="font-semibold">{plate_number}</span>,
                            },
                            {
                                accessor: 'brand',
                                title: t('brand'),
                                sortable: true,
                            },
                            {
                                accessor: 'model',
                                title: t('model'),
                                sortable: true,
                            },
                            {
                                accessor: 'color',
                                title: t('color'),
                                sortable: true,
                                render: ({ color }) => <span className="badge bg-primary text-white">{color || 'N/A'}</span>,
                            },
                            {
                                accessor: 'capacity',
                                title: t('capacity'),
                                sortable: true,
                                render: ({ capacity }) => <span>{capacity || 'N/A'}</span>,
                            },
                            {
                                accessor: 'delivery_drivers.name',
                                title: t('driver'),
                                sortable: false,
                                render: ({ delivery_drivers }) => <span className="font-semibold text-success">{delivery_drivers?.name || 'Unassigned'}</span>,
                            },
                            {
                                accessor: 'created_at',
                                title: t('registration_date'),
                                sortable: true,
                                render: ({ created_at }) => (created_at ? <span>{new Date(created_at).toLocaleDateString('TR')}</span> : ''),
                            },
                            {
                                accessor: 'action',
                                title: t('actions'),
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <Link href={`/delivery/cars/edit/${id}`} className="flex hover:text-info" onClick={(e) => e.stopPropagation()}>
                                            <IconEdit className="h-4.5 w-4.5" />
                                        </Link>
                                        <Link href={`/delivery/cars/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
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
                message={t('confirm_delete_car')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setCarToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default DeliveryCarsList;

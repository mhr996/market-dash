'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconCar from '@/components/icon/icon-car';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { sortBy } from 'lodash';
import Link from 'next/link';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';

interface Car {
    id: number;
    plate_number: string;
    brand: string;
    model: string;
    color: string | null;
    capacity: number | null;
    car_number: string | null;
    car_model: string | null;
    delivery_drivers_id: number | null;
    created_at: string;
    delivery_drivers?: {
        id: number;
        name: string;
        phone: string | null;
    };
}

interface CarsTabProps {
    companyId: number;
}

const CarsTab = ({ companyId }: CarsTabProps) => {
    const { t } = getTranslation();
    const router = useRouter();
    const [cars, setCars] = useState<Car[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Car[]>([]);
    const [records, setRecords] = useState<Car[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Car[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [carToDelete, setCarToDelete] = useState<Car | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        fetchCars();
    }, [companyId]);

    const fetchCars = async () => {
        try {
            setLoading(true);
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
            setCars(data || []);
        } catch (error) {
            console.error('Error fetching cars:', error);
            setAlert({
                visible: true,
                message: 'Error fetching cars',
                type: 'danger',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (car: Car) => {
        setCarToDelete(car);
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!carToDelete) return;

        try {
            const { error } = await supabase.from('delivery_cars').delete().eq('id', carToDelete.id);
            if (error) throw error;

            setAlert({ visible: true, message: 'Car deleted successfully', type: 'success' });
            fetchCars();
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting car', type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setCarToDelete(null);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRecords.length === 0) return;

        try {
            const carIds = selectedRecords.map((car) => car.id);
            const { error } = await supabase.from('delivery_cars').delete().in('id', carIds);
            if (error) throw error;

            setAlert({ visible: true, message: `${selectedRecords.length} cars deleted successfully`, type: 'success' });
            setSelectedRecords([]);
            fetchCars();
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting cars', type: 'danger' });
        }
    };

    // Filter and search logic
    useEffect(() => {
        let filteredItems = cars.filter((car) => {
            const matchesSearch =
                car.brand.toLowerCase().includes(search.toLowerCase()) ||
                car.model.toLowerCase().includes(search.toLowerCase()) ||
                car.plate_number.toLowerCase().includes(search.toLowerCase()) ||
                (car.color || '').toLowerCase().includes(search.toLowerCase()) ||
                (car.delivery_drivers?.name || '').toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });

        // Sort the filtered items
        const sorted = sortBy(filteredItems, sortStatus.columnAccessor as keyof Car);
        const sortedItems = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

        setInitialRecords(sortedItems);
    }, [cars, search, sortStatus]);

    // Pagination effect
    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Cars</h3>
                <div className="flex items-center gap-4">
                    <input type="text" className="form-input w-64" placeholder="Search cars..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <Link href={`/delivery/cars/add?company=${companyId}`} className="btn btn-primary">
                        <IconPlus className="h-4 w-4 mr-2" />
                        Add Car
                    </Link>
                </div>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Bulk Actions */}
            {selectedRecords.length > 0 && (
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            {selectedRecords.length} car{selectedRecords.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex items-center gap-2">
                            <button type="button" className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                                <IconTrashLines className="h-4 w-4 mr-1" />
                                Delete Selected
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cars Table */}
            <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
                <div className="invoice-table">
                    <div className="datatables pagination-padding relative">
                        <DataTable
                            className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'}`}
                            records={records}
                            columns={[
                                {
                                    accessor: 'id',
                                    title: 'ID',
                                    sortable: true,
                                    render: ({ id }) => <strong className="text-info">#{id}</strong>,
                                },
                                {
                                    accessor: 'plate_number',
                                    title: 'Plate Number',
                                    sortable: true,
                                    render: ({ plate_number }) => <span className="font-semibold">{plate_number}</span>,
                                },
                                {
                                    accessor: 'brand',
                                    title: 'Brand',
                                    sortable: true,
                                    render: ({ brand }) => <span>{brand}</span>,
                                },
                                {
                                    accessor: 'model',
                                    title: 'Model',
                                    sortable: true,
                                    render: ({ model }) => <span>{model}</span>,
                                },
                                {
                                    accessor: 'color',
                                    title: 'Color',
                                    sortable: true,
                                    render: ({ color }) => <span className="badge bg-primary text-white">{color || 'N/A'}</span>,
                                },
                                {
                                    accessor: 'capacity',
                                    title: 'Capacity',
                                    sortable: true,
                                    render: ({ capacity }) => <span>{capacity || 'N/A'}</span>,
                                },
                                {
                                    accessor: 'delivery_drivers.name',
                                    title: 'Driver',
                                    sortable: false,
                                    render: ({ delivery_drivers }) => <span className="font-semibold text-success">{delivery_drivers?.name || 'Unassigned'}</span>,
                                },
                                {
                                    accessor: 'created_at',
                                    title: 'Added',
                                    sortable: true,
                                    render: ({ created_at }) => <span className="text-sm">{new Date(created_at).toLocaleDateString()}</span>,
                                },
                                {
                                    accessor: 'action',
                                    title: 'Actions',
                                    sortable: false,
                                    textAlignment: 'center',
                                    render: ({ id }) => (
                                        <div className="flex items-center justify-center gap-2">
                                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => router.push(`/delivery/cars/preview/${id}`)}>
                                                <IconEye className="h-4 w-4" />
                                            </button>
                                            <button type="button" className="btn btn-outline-info btn-sm" onClick={() => router.push(`/delivery/cars/edit/${id}`)}>
                                                <IconEdit className="h-4 w-4" />
                                            </button>
                                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleDelete({ id } as Car)}>
                                                <IconTrashLines className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ),
                                },
                            ]}
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
                        />
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                title="Delete Car"
                message="Are you sure you want to delete this car? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setCarToDelete(null);
                }}
                confirmLabel="Delete"
            />
        </div>
    );
};

export default CarsTab;

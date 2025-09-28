'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconUser from '@/components/icon/icon-user';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { sortBy } from 'lodash';
import Link from 'next/link';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';

interface Driver {
    id: number;
    name: string;
    phone: string | null;
    id_number: string | null;
    avatar_url: string | null;
    created_at: string;
    delivery_drivers_id: number;
    delivery_cars?: Array<{
        id: number;
        plate_number: string;
        brand: string;
        model: string;
    }>;
}

interface DriversTabProps {
    companyId: number;
}

const DriversTab = ({ companyId }: DriversTabProps) => {
    const { t } = getTranslation();
    const router = useRouter();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Driver[]>([]);
    const [records, setRecords] = useState<Driver[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Driver[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        fetchDrivers();
    }, [companyId]);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('delivery_drivers')
                .select(
                    `
                    *,
                    delivery_cars(
                        id,
                        plate_number,
                        brand,
                        model
                    )
                `,
                )
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDrivers(data || []);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            setAlert({
                visible: true,
                message: 'Error fetching drivers',
                type: 'danger',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (driver: Driver) => {
        setDriverToDelete(driver);
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!driverToDelete) return;

        try {
            const { error } = await supabase.from('delivery_drivers').delete().eq('id', driverToDelete.id);
            if (error) throw error;

            setAlert({ visible: true, message: 'Driver deleted successfully', type: 'success' });
            fetchDrivers();
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting driver', type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setDriverToDelete(null);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRecords.length === 0) return;

        try {
            const driverIds = selectedRecords.map((driver) => driver.id);
            const { error } = await supabase.from('delivery_drivers').delete().in('id', driverIds);
            if (error) throw error;

            setAlert({ visible: true, message: `${selectedRecords.length} drivers deleted successfully`, type: 'success' });
            setSelectedRecords([]);
            fetchDrivers();
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting drivers', type: 'danger' });
        }
    };

    // Filter and search logic
    useEffect(() => {
        let filteredItems = drivers.filter((driver) => {
            const matchesSearch =
                driver.name.toLowerCase().includes(search.toLowerCase()) ||
                (driver.phone || '').toLowerCase().includes(search.toLowerCase()) ||
                (driver.id_number || '').toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });

        // Sort the filtered items
        const sorted = sortBy(filteredItems, sortStatus.columnAccessor as keyof Driver);
        const sortedItems = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

        setInitialRecords(sortedItems);
    }, [drivers, search, sortStatus]);

    // Pagination effect
    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Drivers</h3>
                <div className="flex items-center gap-4">
                    <input type="text" className="form-input w-64" placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <Link href={`/delivery/drivers/add?company=${companyId}`} className="btn btn-primary">
                        <IconPlus className="h-4 w-4 mr-2" />
                        Add Driver
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
                            {selectedRecords.length} driver{selectedRecords.length > 1 ? 's' : ''} selected
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

            {/* Drivers Table */}
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
                                    accessor: 'name',
                                    title: 'Driver',
                                    sortable: true,
                                    render: ({ name, avatar_url, phone }) => (
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ltr:mr-3 rtl:ml-3">
                                                {avatar_url ? <img className="w-10 h-10 rounded-full object-cover" src={avatar_url} alt={name} /> : <IconUser className="w-5 h-5 text-primary" />}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{name}</div>
                                                <div className="text-sm text-gray-500">{phone}</div>
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    accessor: 'id_number',
                                    title: 'ID Number',
                                    sortable: true,
                                    render: ({ id_number }) => <span className="font-mono text-sm">{id_number || 'N/A'}</span>,
                                },
                                {
                                    accessor: 'delivery_cars',
                                    title: 'Assigned Cars',
                                    sortable: false,
                                    render: ({ delivery_cars }) => (
                                        <div className="flex flex-wrap gap-1">
                                            {delivery_cars && delivery_cars.length > 0 ? (
                                                delivery_cars.map((car) => (
                                                    <span key={car.id} className="badge bg-primary text-white text-xs">
                                                        {car.plate_number}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-500 text-sm">No cars assigned</span>
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    accessor: 'created_at',
                                    title: 'Joined',
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
                                            <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => router.push(`/delivery/drivers/preview/${id}`)}>
                                                <IconEye className="h-4 w-4" />
                                            </button>
                                            <button type="button" className="btn btn-outline-info btn-sm" onClick={() => router.push(`/delivery/drivers/edit/${id}`)}>
                                                <IconEdit className="h-4 w-4" />
                                            </button>
                                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleDelete({ id } as Driver)}>
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
                title="Delete Driver"
                message="Are you sure you want to delete this driver? This action cannot be undone."
                onConfirm={confirmDelete}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setDriverToDelete(null);
                }}
                confirmLabel="Delete"
            />
        </div>
    );
};

export default DriversTab;

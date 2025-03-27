'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';

const ComponentsAppsInvoiceList = () => {
    const [items, setItems] = useState<
        Array<{
            id: number;
            full_name: string;
            email: string;
            avatar_url: string | null;
            registration_date?: number; // changed to number for timestamp
            status?: string;
            uid?: string;
        }>
    >([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState(sortBy(items, 'firstName'));
    const [records, setRecords] = useState(initialRecords);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'firstName',
        direction: 'asc',
    });

    // New state for confirm modal and alert.
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data, error } = await supabase.from('profiles').select('*');
                if (error) throw error;
                setItems(data);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
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
        setInitialRecords(() => {
            return items.filter((item) => {
                return (
                    item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                    item.email?.toLowerCase().includes(search.toLowerCase()) ||
                    (item.registration_date?.toString() || '').includes(search.toLowerCase())
                );
            });
        });
    }, [items, search]);

    useEffect(() => {
        const data2 = sortBy(initialRecords, sortStatus.columnAccessor);
        setRecords(sortStatus.direction === 'desc' ? data2.reverse() : data2);
        setPage(1);
    }, [sortStatus]);

    // Modified deletion function. It sets the user to delete and shows the confirm modal.
    const deleteRow = (id: number | null = null) => {
        if (id) {
            const user = items.find((user) => user.id === id);
            if (user) {
                setUserToDelete(user);
                setShowConfirmModal(true);
            }
        }
    };

    // Confirm deletion callback.
    const confirmDeletion = async () => {
        if (!userToDelete || !userToDelete.id) return;

        setAlert({ visible: true, message: 'Deleting an Admin is not possible', type: 'danger' });
        setShowConfirmModal(false);
        setUserToDelete(null);

        // try {
        //     // Delete from profiles table
        //     const { error: profileError } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
        //     if (profileError) throw profileError;

        //     // Delete account from supabase (admin API)
        //     const { error: authError } = await supabase.auth.admin.deleteUser(userToDelete.id);
        //     if (authError) throw authError;

        //     // Remove the user from state arrays.
        //     const updatedItems = items.filter((user) => user.id !== userToDelete.id);
        //     setItems(updatedItems);
        //     setInitialRecords(
        //         updatedItems.filter((item) => {
        //             return (
        //                 item.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        //                 item.email?.toLowerCase().includes(search.toLowerCase()) ||
        //                 (item.registration_date?.toLowerCase() || '').includes(search.toLowerCase())
        //             );
        //         }),
        //     );
        //     setSelectedRecords([]);
        //     setSearch('');
        //     // Optionally, a refresh of pagination can be done here.
        //     setAlert({ visible: true, message: 'User deleted successfully.', type: 'success' });
        // } catch (error) {
        //     console.error('Deletion error:', error);
        //     setAlert({ visible: true, message: 'Error deleting user.', type: 'danger' });
        // } finally {
        //     setShowConfirmModal(false);
        //     setUserToDelete(null);
        // }
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
            {/* Alert */}
            {alert.visible && (
                <div className="mb-4 ml-4 max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? 'Success' : 'Error'}
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
                            Delete
                        </button>
                        <Link href="/users/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            Add New
                        </Link>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="datatables pagination-padding relative">
                    <DataTable
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'}`}
                        records={records}
                        columns={[
                            {
                                accessor: 'id',
                                sortable: true,
                                render: (row, index) => {
                                    const offset = (page - 1) * pageSize;
                                    return offset + index + 1;
                                },
                            },
                            {
                                accessor: 'full_name',
                                sortable: true,
                                render: ({ full_name, avatar_url }) => (
                                    <div className="flex items-center font-semibold">
                                        <div className="w-max rounded-full ltr:mr-2 rtl:ml-2 flex items-center justify-center">
                                            <img className="h-8 w-8 rounded-full object-cover" src={avatar_url || `/assets/images/user-placeholder.webp`} alt="" />
                                        </div>
                                        <div>{full_name}</div>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'email',
                                sortable: true,
                            },
                            {
                                accessor: 'registration_date',
                                sortable: true,
                                render: ({ registration_date }) => <span>{registration_date ? new Date(registration_date).toLocaleDateString("TR") : ''}</span>,
                            },
                            {
                                accessor: 'status',
                                sortable: true,
                                render: ({ status }) => <span className={`badge badge-outline-${status === 'Active' ? 'success' : 'danger'} `}>{status}</span>,
                            },
                            {
                                accessor: 'action',
                                title: 'Actions',
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <div
                                            onClick={() => {
                                                setAlert({ visible: true, message: "You can't edit an Admin User", type: 'danger' });
                                            }}
                                            className="flex hover:text-info"
                                        >
                                            <IconEdit className="h-4.5 w-4.5" />
                                        </div>
                                        <Link href={`/users/preview/${id}`} className="flex hover:text-primary">
                                            <IconEye />
                                        </Link>
                                        <button type="button" className="flex hover:text-danger" onClick={() => deleteRow(id)}>
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
                        paginationText={({ from, to, totalRecords }) => `Showing  ${from} to ${to} of ${totalRecords} entries`}
                        minHeight={300}
                    />

                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                </div>
            </div>

            {/* Confirm Deletion Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                title="Confirm Deletion"
                message="Are you sure you want to delete this user?"
                onCancel={() => {
                    setShowConfirmModal(false);
                    setUserToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                size="sm"
            />
        </div>
    );
};

export default ComponentsAppsInvoiceList;

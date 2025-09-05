'use client';
import IconEdit from '@/components/icon/icon-edit';
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

// Category interface
interface Category {
    id: number;
    title: string;
    desc: string;
    image_url?: string;
    created_at: string;
}

const CategoriesList = () => {
    const [items, setItems] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = getTranslation();
    const router = useRouter();

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Category[]>([]);
    const [records, setRecords] = useState<Category[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<any>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // State for confirm modal and alert
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                setItems(data as Category[]);
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCategories();
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
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor as keyof Category);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: number | null = null) => {
        if (id) {
            const category = items.find((c) => c.id === id);
            if (category) {
                setCategoryToDelete(category);
                setShowConfirmModal(true);
            }
        }
    };

    // Confirm deletion callback
    const confirmDeletion = async () => {
        if (!categoryToDelete || !categoryToDelete.id) return;
        try {
            // First, delete the category folder from storage
            const folderPath = `${categoryToDelete.id}`;
            const { data: files } = await supabase.storage.from('categories').list(folderPath);

            if (files && files.length > 0) {
                const filesToDelete = files.map((file) => `${folderPath}/${file.name}`);
                await supabase.storage.from('categories').remove(filesToDelete);
            }

            // Then delete the category from database
            const { error } = await supabase.from('categories').delete().eq('id', categoryToDelete.id);
            if (error) throw error;

            const updatedItems = items.filter((c) => c.id !== categoryToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('category_deleted_successfully'), type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: t('error_deleting_category'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setCategoryToDelete(null);
        }
    };

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
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-danger gap-2">
                            <IconTrashLines />
                            {t('delete')}
                        </button>
                        <Link href="/categories/add" className="btn btn-primary gap-2">
                            <IconPlus />
                            {t('add_new')}
                        </Link>
                    </div>
                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="datatables pagination-padding relative">
                    <DataTable
                        className={`${loading ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap cursor-pointer'}`}
                        records={records}
                        onRowClick={(record) => {
                            router.push(`/categories/preview/${record.id}`);
                        }}
                        columns={[
                            {
                                accessor: 'id',
                                title: t('id'),
                                sortable: true,
                                render: ({ id }) => <strong className="text-info">#{id}</strong>,
                            },
                            {
                                accessor: 'image_url',
                                title: t('image'),
                                sortable: false,
                                render: ({ image_url }) => (
                                    <div className="flex justify-center">
                                        {image_url ? (
                                            <img src={image_url} alt="Category" className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                                        ) : (
                                            <img
                                                src="/assets/images/img-placeholder-fallback.webp"
                                                alt="Placeholder"
                                                className="w-10 aspect-square object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                                            />
                                        )}
                                    </div>
                                ),
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
                                render: ({ desc }) => <span>{desc.slice(0, 100) || 'N/A'}</span>,
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
                                        <Link href={`/categories/edit/${id}`} className="flex hover:text-info" onClick={(e) => e.stopPropagation()}>
                                            <IconEdit className="h-4.5 w-4.5" />
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
                message={t('confirm_delete_category')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setCategoryToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default CategoriesList;

'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconLayoutGrid from '@/components/icon/icon-layout-grid';
import IconListCheck from '@/components/icon/icon-list-check';
import IconEye from '@/components/icon/icon-eye';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import EditProductCategoryDialog from './components/EditProductCategoryDialog';

// Category interface
interface Category {
    id: number;
    title: string;
    desc: string;
    description: string | null;
    image_url: string | null;
    shop_id?: number | null;
    created_at: string;
    updated_at: string;
    shops?: {
        id: number;
        shop_name: string;
    };
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

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // State for confirm modal and alert
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    // Edit dialog state
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase.from('categories').select('*, shops(id, shop_name)').order('created_at', { ascending: false });
                if (error) throw error;
                setItems(data as Category[]);
            } catch (error) {
                setAlert({ visible: true, message: 'Error fetching categories', type: 'danger' });
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

    const handleEditClick = (category: Category) => {
        setCategoryToEdit(category);
        setShowEditDialog(true);
    };

    const handleEditSuccess = () => {
        // Refresh the categories list
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase.from('categories').select('*, shops(id, shop_name)').order('created_at', { ascending: false });
                if (error) throw error;
                setItems(data as Category[]);
            } catch (error) {
                // Error fetching categories
            }
        };
        fetchCategories();
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
            setAlert({ visible: true, message: t('error_deleting_category'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setCategoryToDelete(null);
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
                        <Link href="/products/categories/add" className="btn btn-primary gap-2">
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
                                {initialRecords.slice((page - 1) * pageSize, page * pageSize).map((category) => (
                                    <div
                                        key={category.id}
                                        className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
                                    >
                                        {/* Category Image */}
                                        <div className="relative">
                                            <img className="h-20 w-full object-cover rounded-t-xl" src={category.image_url || `/assets/images/category-placeholder.jpg`} alt={category.title} />
                                        </div>

                                        {/* Category Details */}
                                        <div className="p-3 flex-1">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{category.title}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{category.desc}</p>

                                            {/* Shop Info */}
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-gray-400">Shop</span>
                                                    <span className="font-medium truncate">{category.shops?.shop_name || 'Global'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditClick(category);
                                                        }}
                                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                                        title="Edit Category"
                                                    >
                                                        <IconEdit className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </button>
                                                    <Link
                                                        href={`/products/categories/preview/${category.id}`}
                                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-primary border border-transparent rounded hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary"
                                                        title="View Category"
                                                    >
                                                        <IconEye className="h-3 w-3 mr-1" />
                                                        View
                                                    </Link>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCategoryToDelete(category);
                                                        setShowConfirmModal(true);
                                                    }}
                                                    className="inline-flex items-center p-1 text-xs font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-500"
                                                    title="Delete Category"
                                                >
                                                    <IconTrashLines className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {records.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 dark:text-gray-400">No categories found.</p>
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
                                    router.push(`/products/categories/preview/${record.id}`);
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
                                        title: t('category'),
                                        sortable: true,
                                        render: ({ title, image_url }) => (
                                            <div className="flex items-center font-semibold">
                                                <div className="w-max rounded-full ltr:mr-2 rtl:ml-2">
                                                    {image_url ? (
                                                        <img className="h-8 w-8 rounded-md object-cover" src={image_url} alt={title} />
                                                    ) : (
                                                        <div className="h-8 w-8 rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                                />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>{title}</div>
                                            </div>
                                        ),
                                    },
                                    {
                                        accessor: 'desc',
                                        title: t('description'),
                                        sortable: true,
                                        render: ({ desc }) => <span>{desc.slice(0, 100) || 'N/A'}</span>,
                                    },
                                    {
                                        accessor: 'shops',
                                        title: 'Shop Owner',
                                        sortable: true,
                                        render: ({ shops }) => <span className="badge badge-outline-primary">{shops?.shop_name || 'No Shop Assigned'}</span>,
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
                                        render: ({ id }) => {
                                            const category = items.find((c) => c.id === id);
                                            return (
                                                <div className="mx-auto flex w-max items-center gap-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (category) handleEditClick(category);
                                                        }}
                                                        className="flex hover:text-info"
                                                    >
                                                        <IconEdit className="h-4.5 w-4.5" />
                                                    </button>
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
                                            );
                                        },
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

            {/* Edit Product Category Dialog */}
            <EditProductCategoryDialog
                isOpen={showEditDialog}
                onClose={() => {
                    setShowEditDialog(false);
                    setCategoryToEdit(null);
                }}
                category={categoryToEdit}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
};

export default CategoriesList;

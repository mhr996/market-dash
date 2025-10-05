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

interface Category {
    id: number;
    title: string;
    desc: string;
    created_at: string;
}

interface SubCategory {
    id: number;
    title: string;
    desc: string;
    category_id: number;
    image: string | null;
    shop_id?: number | null;
    created_at: string;
    categories?: Category;
    shops?: {
        id: number;
        shop_name: string;
    };
}

const SubCategoriesList = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [items, setItems] = useState<SubCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<SubCategory[]>([]);
    const [records, setRecords] = useState<SubCategory[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<SubCategory[]>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Modal and alert states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [subCategoryToDelete, setSubCategoryToDelete] = useState<SubCategory | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        const fetchSubCategories = async () => {
            try {
                const { data, error } = await supabase.from('categories_sub').select('*, categories(*), shops(id, shop_name)').order('created_at', { ascending: false });
                if (error) throw error;

                setItems(data as SubCategory[]);
            } catch (error) {
            } finally {
                setLoading(false);
            }
        };
        fetchSubCategories();
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
                return (
                    item.title.toLowerCase().includes(search.toLowerCase()) ||
                    item.desc.toLowerCase().includes(search.toLowerCase()) ||
                    item.categories?.title.toLowerCase().includes(search.toLowerCase())
                );
            }),
        );
    }, [items, search]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: number | null = null) => {
        if (id) {
            const subCategory = items.find((s) => s.id === id);
            if (subCategory) {
                setSubCategoryToDelete(subCategory);
                setShowConfirmModal(true);
            }
        }
    };

    const confirmDeletion = async () => {
        if (!subCategoryToDelete) return;
        try {
            const { error } = await supabase.from('categories_sub').delete().eq('id', subCategoryToDelete.id);
            if (error) throw error;

            const updatedItems = items.filter((s) => s.id !== subCategoryToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('subcategory_deleted'), type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: t('error_deleting_subcategory'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setSubCategoryToDelete(null);
        }
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
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
                        <Link href="/categories/subcategories/add" className="btn btn-primary gap-2">
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
                        <div className="p-6">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {initialRecords.slice((page - 1) * pageSize, page * pageSize).map((subcategory) => (
                                    <div
                                        key={subcategory.id}
                                        className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
                                    >
                                        {/* Subcategory Image */}
                                        <div className="relative">
                                            <img className="h-48 w-full object-cover rounded-t-xl" src={subcategory.image || `/assets/images/subcategory-placeholder.jpg`} alt={subcategory.title} />
                                        </div>

                                        {/* Subcategory Details */}
                                        <div className="p-6 flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{subcategory.title}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-3">{subcategory.desc}</p>

                                            {/* Category and Shop Info */}
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-gray-400">Category</span>
                                                    <span className="font-medium">{subcategory.categories?.title || 'N/A'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-gray-400">Shop</span>
                                                    <span className="font-medium">{subcategory.shops?.shop_name || 'Global'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-500 dark:text-gray-400">Created</span>
                                                    <span className="font-medium">{new Date(subcategory.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
                                            <div className="flex items-center justify-between">
                                                <div className="flex space-x-3">
                                                    <Link
                                                        href={`/categories/subcategories/edit/${subcategory.id}`}
                                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                                        title="Edit Subcategory"
                                                    >
                                                        <IconEdit className="h-4 w-4 mr-1" />
                                                        Edit
                                                    </Link>
                                                    <Link
                                                        href={`/categories/subcategories/preview/${subcategory.id}`}
                                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                                        title="View Subcategory"
                                                    >
                                                        <IconEye className="h-4 w-4 mr-1" />
                                                        View
                                                    </Link>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSubCategoryToDelete(subcategory);
                                                        setShowConfirmModal(true);
                                                    }}
                                                    className="inline-flex items-center p-2 text-sm font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                                    title="Delete Subcategory"
                                                >
                                                    <IconTrashLines className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {records.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 dark:text-gray-400">No subcategories found.</p>
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
                                    router.push(`/categories/subcategories/preview/${record.id}`);
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
                                        title: t('subcategory'),
                                        sortable: true,
                                        render: ({ title, image }) => (
                                            <div className="flex items-center font-semibold">
                                                <div className="w-max rounded-full ltr:mr-2 rtl:ml-2">
                                                    {image ? (
                                                        <img className="h-8 w-8 rounded-md object-cover" src={image} alt={title} />
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
                                        render: ({ desc }) => <span className="truncate max-w-xs">{desc || 'N/A'}</span>,
                                    },
                                    {
                                        accessor: 'categories.title',
                                        title: t('category'),
                                        sortable: true,
                                        render: ({ categories }) => <span>{categories?.title || 'N/A'}</span>,
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
                                        render: ({ created_at }) => <span>{new Date(created_at).toLocaleDateString()}</span>,
                                    },
                                    {
                                        accessor: 'action',
                                        title: t('actions'),
                                        sortable: false,
                                        textAlignment: 'center',
                                        render: ({ id }) => (
                                            <div className="mx-auto flex w-max items-center gap-4">
                                                <Link href={`/categories/subcategories/edit/${id}`} className="flex hover:text-info" onClick={(e) => e.stopPropagation()}>
                                                    <IconEdit className="h-4.5 w-4.5" />
                                                </Link>
                                                <Link href={`/categories/subcategories/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
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
            <ConfirmModal
                isOpen={showConfirmModal}
                title={t('confirm_deletion')}
                message={t('confirm_delete_subcategory')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setSubCategoryToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default SubCategoriesList;

'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconSettings from '@/components/icon/icon-settings';
import IconX from '@/components/icon/icon-x';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import StorageManager from '@/utils/storage-manager';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import MultiSelect from '@/components/multi-select';

interface Category {
    id: number;
    title: string;
    desc: string;
    image_url: string | null;
    created_at?: string;
}

interface SubCategory {
    id: number;
    title: string;
    desc: string;
    category_id: number;
    created_at?: string;
}

interface Product {
    id: string;
    created_at: string;
    shop: string;
    title: string;
    desc: string;
    price: string;
    images: string[];
    category: number | null;
    subcategory_id: number | null;
    shops?: {
        shop_name: string;
    };
    categories?: Category;
    categories_sub?: SubCategory;
    sale_price?: number | null;
    discount_type?: 'percentage' | 'fixed' | null;
    discount_value?: number | null;
    discount_start?: string | null;
    discount_end?: string | null;
    onSale?: boolean;
    active: boolean;
}

const ProductsList = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Product[]>([]);
    const [records, setRecords] = useState<Product[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Product[]>([]);

    const [search, setSearch] = useState('');
    const [selectedShops, setSelectedShops] = useState<number[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>([]);
    const [availableShops, setAvailableShops] = useState<any[]>([]);
    const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
    const [availableSubcategories, setAvailableSubcategories] = useState<SubCategory[]>([]);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // Modal and alert states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    useEffect(() => {
        fetchProducts();
        fetchShops();
        fetchCategories();
        fetchSubcategories();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase.from('products').select('*, shops(shop_name), categories(*), categories_sub(*)').order('created_at', { ascending: false });
            if (error) throw error;

            setItems(data as Product[]);
        } catch (error) {
            console.error('Error fetching products:', error);
            setAlert({ visible: true, message: `Error fetching products: ${error}`, type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const fetchShops = async () => {
        try {
            const { data: shops, error } = await supabase.from('shops').select('id, shop_name, logo_url').order('shop_name', { ascending: true });
            if (error) throw error;
            setAvailableShops(shops || []);
        } catch (error) {
            console.error('Error fetching shops:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data: categories, error } = await supabase.from('categories').select('id, title, desc, image_url').order('title', { ascending: true });
            if (error) throw error;
            setAvailableCategories(categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchSubcategories = async () => {
        try {
            const { data: subcategories, error } = await supabase.from('categories_sub').select('id, title, desc, category_id').order('title', { ascending: true });
            if (error) throw error;
            setAvailableSubcategories(subcategories || []);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
        }
    };

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
                const matchesSearch =
                    item.title.toLowerCase().includes(search.toLowerCase()) ||
                    item.desc.toLowerCase().includes(search.toLowerCase()) ||
                    item.shops?.shop_name.toLowerCase().includes(search.toLowerCase()) ||
                    item.categories?.title.toLowerCase().includes(search.toLowerCase()) ||
                    item.categories_sub?.title.toLowerCase().includes(search.toLowerCase());

                let matchesFilters = true;

                // Apply shop filter
                if (selectedShops.length > 0) {
                    matchesFilters = matchesFilters && selectedShops.includes(parseInt(item.shop));
                }

                // Apply category filter
                if (selectedCategories.length > 0) {
                    matchesFilters = matchesFilters && item.category !== null && selectedCategories.includes(item.category);
                }

                // Apply subcategory filter
                if (selectedSubcategories.length > 0) {
                    matchesFilters = matchesFilters && item.subcategory_id !== null && selectedSubcategories.includes(item.subcategory_id);
                }

                return matchesSearch && matchesFilters;
            }),
        );
    }, [items, search, selectedShops, selectedCategories, selectedSubcategories]);

    useEffect(() => {
        const sorted = sortBy(initialRecords, sortStatus.columnAccessor);
        setRecords(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
        setPage(1);
    }, [sortStatus, initialRecords]);

    const deleteRow = (id: string | null = null) => {
        if (id) {
            const product = items.find((p) => p.id === id);
            if (product) {
                setProductToDelete(product);
                setShowConfirmModal(true);
            }
        }
    };

    const confirmDeletion = async () => {
        if (!productToDelete) return;
        try {
            // Delete product images from storage using new folder structure
            await StorageManager.removeProductImages(parseInt(productToDelete.shop), parseInt(productToDelete.id));

            // Delete product record
            const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
            if (error) throw error;

            const updatedItems = items.filter((p) => p.id !== productToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: t('product_deleted'), type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: t('error_deleting_product'), type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setProductToDelete(null);
        }
    };

    const toggleProductStatus = async (id: string, status: boolean) => {
        try {
            const { error } = await supabase.from('products').update({ active: status }).eq('id', id);
            if (error) throw error;

            const updatedItems = items.map((item) => (item.id === id ? { ...item, active: status } : item));
            setItems(updatedItems);
        } catch (error) {
            // Error updating product status
        }
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
            {' '}
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
            {/* Filters Panel */}
            <div className="panel mb-6 w-full max-w-none">
                <div className="mb-4 flex items-center gap-2">
                    <IconSettings className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-black dark:text-white-light">Filters</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    {/* Shop Filter */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Shops</label>
                        <MultiSelect
                            options={availableShops.map((shop) => ({ id: shop.id, name: shop.shop_name, logo_url: shop.logo_url || undefined }))}
                            selectedValues={selectedShops}
                            onChange={setSelectedShops}
                            placeholder="Select shops"
                            isRtl={false}
                        />
                    </div>

                    {/* Category Filter */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Categories</label>
                        <MultiSelect
                            options={availableCategories.map((category) => ({ id: category.id, name: category.title, logo_url: category.image_url || undefined }))}
                            selectedValues={selectedCategories}
                            onChange={setSelectedCategories}
                            placeholder="Select categories"
                            isRtl={false}
                        />
                    </div>

                    {/* Subcategory Filter */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Subcategories</label>
                        <MultiSelect
                            options={availableSubcategories.map((subcategory) => ({ id: subcategory.id, name: subcategory.title }))}
                            selectedValues={selectedSubcategories}
                            onChange={setSelectedSubcategories}
                            placeholder="Select subcategories"
                            isRtl={false}
                        />
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                        <button
                            type="button"
                            className="btn btn-outline-danger w-full"
                            onClick={() => {
                                setSelectedShops([]);
                                setSelectedCategories([]);
                                setSelectedSubcategories([]);
                            }}
                        >
                            <IconX className="h-4 w-4 mr-2" />
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>
            <div className="invoice-table w-full max-w-none">
                <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                    <div className="flex items-center gap-2">
                        <button type="button" className="btn btn-danger gap-2">
                            <IconTrashLines />
                            {t('delete')}
                        </button>
                        <Link href="/products/add" className="btn btn-primary gap-2">
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
                            router.push(`/products/preview/${record.id}`);
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
                                title: t('products'),
                                sortable: true,
                                render: ({ title, images }) => {
                                    let imageList: any[] = [];

                                    imageList = typeof images === 'string' ? JSON.parse(images || '[]') : images;

                                    return (
                                        <div className="flex items-center font-semibold">
                                            <div className="w-max rounded-full ltr:mr-2 rtl:ml-2">
                                                <img className="h-8 w-8 rounded-md object-cover" src={imageList[0] || `/assets/images/product-placeholder.jpg`} alt={title} />
                                            </div>
                                            <div>{title}</div>
                                        </div>
                                    );
                                },
                            },
                            {
                                accessor: 'price',
                                title: t('price'),
                                sortable: true,
                                render: ({ price, sale_price, discount_type, discount_value, discount_start, discount_end, onSale }) => (
                                    <div>
                                        {sale_price ? (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="line-through text-gray-500">${parseFloat(price).toFixed(2)}</span>
                                                    {onSale && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">ON SALE</span>}
                                                </div>
                                                <span className="text-success font-bold">${sale_price.toFixed(2)}</span>
                                                {discount_type === 'percentage' && discount_value && (
                                                    <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded-full w-fit mt-1">{discount_value}% OFF</span>
                                                )}
                                                {discount_start && discount_end && (
                                                    <span className="text-xs text-gray-500 mt-1">
                                                        {new Date() < new Date(discount_start) ? t('starts') : new Date() > new Date(discount_end) ? t('expired') : t('limited_time')}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span>${parseFloat(price).toFixed(2)}</span>
                                                {onSale && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">ON SALE</span>}
                                            </div>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'shops.shop_name',
                                title: t('shop'),
                                sortable: true,
                            },
                            {
                                accessor: 'categories.title',
                                title: t('category'),
                                sortable: true,
                                render: ({ categories }) => <span>{categories?.title || 'N/A'}</span>,
                            },
                            {
                                accessor: 'categories_sub.title',
                                title: 'Subcategory',
                                sortable: true,
                                render: ({ categories_sub }) => <span>{categories_sub?.title || 'N/A'}</span>,
                            },
                            {
                                accessor: 'created_at',
                                title: t('created_date'),
                                sortable: true,
                                render: ({ created_at }) => <span>{new Date(created_at).toLocaleDateString()}</span>,
                            },
                            {
                                accessor: 'active',
                                title: t('status'),
                                sortable: true,
                                textAlignment: 'center',
                                render: ({ id, active }) => (
                                    <div className="flex items-center justify-start w-full">
                                        <span
                                            className={`cursor-pointer inline-block w-[60px] text-center px-1 py-1 text-xs rounded-full ${
                                                active ? 'bg-success/20 text-success hover:bg-success/30' : 'bg-danger/20 text-danger hover:bg-danger/30'
                                            } transition-all duration-300`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleProductStatus(id, !active);
                                            }}
                                        >
                                            {active ? t('active') : t('inactive')}
                                        </span>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'action',
                                title: t('actions'),
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <Link href={`/products/edit/${id}`} className="flex hover:text-info" onClick={(e) => e.stopPropagation()}>
                                            <IconEdit className="h-4.5 w-4.5" />
                                        </Link>
                                        <Link href={`/products/preview/${id}`} className="flex hover:text-primary" onClick={(e) => e.stopPropagation()}>
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
            </div>{' '}
            <ConfirmModal
                isOpen={showConfirmModal}
                title={t('confirm_deletion')}
                message={t('confirm_delete_product')}
                onCancel={() => {
                    setShowConfirmModal(false);
                    setProductToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel={t('delete')}
                cancelLabel={t('cancel')}
                size="sm"
            />
        </div>
    );
};

export default ProductsList;

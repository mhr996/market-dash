'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconSettings from '@/components/icon/icon-settings';
import IconX from '@/components/icon/icon-x';
import IconLayoutGrid from '@/components/icon/icon-layout-grid';
import IconListCheck from '@/components/icon/icon-list-check';
import { sortBy } from 'lodash';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';
import supabase from '@/lib/supabase';
import StorageManager from '@/utils/storage-manager';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ConfirmModal from '@/components/modals/confirm-modal';
import { getTranslation } from '@/i18n';
import EditProductDialog from './components/EditProductDialog';
import MultiSelect from '@/components/multi-select';
import CategoryFilters from '@/components/filters/category-filters';
import HorizontalFilter from '@/components/filters/horizontal-filter';
import { useAuth } from '@/hooks/useAuth';

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
    updated_at: string;
    shop: string;
    title: string;
    desc: string;
    price: number;
    images: string[];
    category: number | null;
    subcategory_id: number | null;
    brand_id: number | null;
    active: boolean;
    onsale: boolean;
    shops?: {
        shop_name: string;
    };
    categories?: Category;
    categories_sub?: SubCategory;
    categories_brands?: {
        id: number;
        brand: string;
        description: string;
        image_url?: string;
    };
    sale_price?: number | null;
    discount_type?: 'percentage' | 'fixed' | null;
    discount_value?: number | null;
    discount_start?: string | null;
    discount_end?: string | null;
    onSale?: boolean;
}

const ProductsList = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // Helper function to get accessible shop IDs based on user role
    const getAccessibleShopIds = async (): Promise<number[]> => {
        if (!user) return [];

        if (user.role_name === 'super_admin') {
            // Super admin can see all shops
            const { data: allShops } = await supabase.from('shops').select('id');
            return allShops?.map((shop) => shop.id) || [];
        }

        if (user.shops && user.shops.length > 0) {
            // Shop owner/editor can only see their assigned shops
            return user.shops.map((shop) => shop.shop_id);
        }

        return [];
    };

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

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Modal and alert states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    // Edit dialog state
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);

    useEffect(() => {
        if (authLoading) return;

        fetchProducts();
        fetchShops();
        fetchCategories();
        fetchSubcategories();
    }, [user?.role_name, authLoading]);

    const fetchProducts = async () => {
        try {
            // Get accessible shop IDs based on user role
            const accessibleShopIds = await getAccessibleShopIds();

            if (accessibleShopIds.length === 0) {
                setItems([]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('products')
                .select('*, shops(shop_name), categories(*), categories_sub(*), categories_brands!brand_id(*)')
                .in('shop', accessibleShopIds)
                .order('created_at', { ascending: false });
            if (error) throw error;

            setItems(data as Product[]);
        } catch (error) {
            setAlert({ visible: true, message: `Error fetching products: ${error}`, type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const fetchShops = async () => {
        try {
            // Get accessible shop IDs based on user role
            const accessibleShopIds = await getAccessibleShopIds();

            if (accessibleShopIds.length === 0) {
                setAvailableShops([]);
                return;
            }

            const { data: shops, error } = await supabase.from('shops').select('id, shop_name, logo_url').in('id', accessibleShopIds).order('shop_name', { ascending: true });
            if (error) throw error;
            setAvailableShops(shops || []);
        } catch (error) {}
    };

    const fetchCategories = async () => {
        try {
            const { data: categories, error } = await supabase.from('categories').select('id, title, desc, image_url').order('title', { ascending: true });
            if (error) throw error;
            setAvailableCategories(categories || []);
        } catch (error) {}
    };

    const fetchSubcategories = async () => {
        try {
            const { data: subcategories, error } = await supabase.from('categories_sub').select('id, title, desc, category_id').order('title', { ascending: true });
            if (error) throw error;
            setAvailableSubcategories(subcategories || []);
        } catch (error) {}
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

    const handleEditClick = (product: Product) => {
        setProductToEdit(product);
        setShowEditDialog(true);
    };

    const handleEditSuccess = () => {
        // Refresh the products list
        fetchProducts();
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

                <div className="space-y-6">
                    {/* Shop Filter */}
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Shops</label>
                        <HorizontalFilter
                            items={availableShops.map((shop) => ({
                                id: shop.id,
                                name: shop.shop_name,
                                image_url: shop.logo_url || undefined,
                            }))}
                            selectedItems={selectedShops}
                            onSelectionChange={setSelectedShops}
                            placeholder="No shops available"
                            showImages={true}
                        />
                    </div>

                    {/* Category and Subcategory Filters */}
                    <CategoryFilters
                        categories={availableCategories}
                        subcategories={availableSubcategories}
                        selectedCategories={selectedCategories}
                        selectedSubcategories={selectedSubcategories}
                        onCategoriesChange={useCallback((categoryIds: number[]) => setSelectedCategories(categoryIds), [])}
                        onSubcategoriesChange={useCallback((subcategoryIds: number[]) => setSelectedSubcategories(subcategoryIds), [])}
                    />

                    {/* Clear Filters */}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => {
                                setSelectedShops([]);
                                setSelectedCategories([]);
                                setSelectedSubcategories([]);
                            }}
                        >
                            <IconX className="h-4 w-4 mr-2" />
                            Clear All Filters
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
                        {/* Show Add New button for super_admin, shop_owner, and shop_editor */}
                        {(user?.role_name === 'super_admin' || user?.role_name === 'shop_owner' || user?.role_name === 'shop_editor') && (
                            <Link href="/products/add" className="btn btn-primary gap-2">
                                <IconPlus />
                                {t('add_new')}
                            </Link>
                        )}
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
                                {initialRecords.slice((page - 1) * pageSize, page * pageSize).map((product) => {
                                    let imageList: any[] = [];
                                    imageList = typeof product.images === 'string' ? JSON.parse(product.images || '[]') : product.images;

                                    return (
                                        <div
                                            key={product.id}
                                            className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-shadow duration-200 flex flex-col h-full"
                                        >
                                            {/* Product Image */}
                                            <div className="relative">
                                                <img className="h-20 w-full object-cover rounded-t-xl" src={imageList[0] || `/assets/images/product-placeholder.jpg`} alt={product.title} />
                                                {product.onSale && (
                                                    <div className="absolute top-1 right-1">
                                                        <span className="bg-orange-500 text-white px-1 py-0.5 rounded-full text-xs font-medium">SALE</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product Details */}
                                            <div className="p-3 flex-1">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{product.title}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">{product.desc}</p>

                                                {/* Price */}
                                                <div className="mb-2">
                                                    {product.sale_price ? (
                                                        <div className="flex items-center gap-1">
                                                            <span className="line-through text-gray-500 text-xs">${product.price.toFixed(2)}</span>
                                                            <span className="text-sm font-bold text-success">${product.sale_price.toFixed(2)}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">${product.price.toFixed(2)}</span>
                                                    )}
                                                </div>

                                                {/* Shop and Category */}
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-500 dark:text-gray-400">Shop</span>
                                                        <span className="font-medium truncate">{product.shops?.shop_name || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-500 dark:text-gray-400">Category</span>
                                                        <span className="font-medium truncate">{product.categories?.title || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-gray-500 dark:text-gray-400">Status</span>
                                                        <span className={`badge ${product.active ? 'badge-success' : 'badge-danger'}`}>{product.active ? 'Active' : 'Inactive'}</span>
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
                                                                handleEditClick(product);
                                                            }}
                                                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                                            title="Edit Product"
                                                        >
                                                            <IconEdit className="h-3 w-3 mr-1" />
                                                            Edit
                                                        </button>
                                                        <Link
                                                            href={`/products/preview/${product.id}`}
                                                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-primary border border-transparent rounded hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-primary"
                                                            title="View Product"
                                                        >
                                                            <IconEye className="h-3 w-3 mr-1" />
                                                            View
                                                        </Link>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setProductToDelete(product);
                                                            setShowConfirmModal(true);
                                                        }}
                                                        className="inline-flex items-center p-1 text-xs font-medium text-red-600 hover:text-red-800 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-500"
                                                        title="Delete Product"
                                                    >
                                                        <IconTrashLines className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {records.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-gray-500 dark:text-gray-400">No products found.</p>
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
                                                            <span className="line-through text-gray-500">${price.toFixed(2)}</span>
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
                                                        <span>${price.toFixed(2)}</span>
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
                                        accessor: 'brands.name',
                                        title: 'Brand',
                                        sortable: true,
                                        render: ({ categories_brands }) => <span className="badge bg-info text-white">{categories_brands?.brand || 'No Brand'}</span>,
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
                                        render: ({ id }) => {
                                            const product = items.find((p) => p.id === id);
                                            return (
                                                <div className="mx-auto flex w-max items-center gap-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (product) handleEditClick(product);
                                                        }}
                                                        className="flex hover:text-info"
                                                    >
                                                        <IconEdit className="h-4.5 w-4.5" />
                                                    </button>
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
            {/* Edit Product Dialog */}
            <EditProductDialog
                isOpen={showEditDialog}
                onClose={() => {
                    setShowEditDialog(false);
                    setProductToEdit(null);
                }}
                product={productToEdit}
                onSuccess={handleEditSuccess}
            />
        </div>
    );
};

export default ProductsList;

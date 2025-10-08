'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconSettings from '@/components/icon/icon-settings';
import IconX from '@/components/icon/icon-x';
import IconLayoutGrid from '@/components/icon/icon-layout-grid';
import IconListCheck from '@/components/icon/icon-list-check';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconCheck from '@/components/icon/icon-check';
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
import UnifiedPagination from '@/components/pagination/unified-pagination';
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
    const [availableBrands, setAvailableBrands] = useState<any[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    // Quick edit states
    const [quickEditProducts, setQuickEditProducts] = useState<Map<string, Partial<Product>>>(new Map());
    const [hasChanges, setHasChanges] = useState(false);
    const [showSalePriceDialog, setShowSalePriceDialog] = useState(false);
    const [currentProductId, setCurrentProductId] = useState<string | null>(null);

    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    // View mode state
    const [viewMode, setViewMode] = useState<'grid' | 'table' | 'quick-edit'>('grid');

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
        fetchBrands();
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

    const fetchBrands = async () => {
        try {
            const { data: brands, error } = await supabase.from('brands').select('id, name').order('name', { ascending: true });
            if (error) throw error;
            setAvailableBrands(brands || []);
        } catch (error) {
            console.error('Error fetching brands:', error);
        }
    };

    useEffect(() => {
        setPage(1);
    }, [pageSize]);

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
        const sortedRecords = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...sortedRecords.slice(from, to)]);
    }, [sortStatus, initialRecords, page, pageSize]);

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

    // Quick edit functions
    const updateQuickEditProduct = (productId: string, field: keyof Product, value: any) => {
        setQuickEditProducts((prev) => {
            const newMap = new Map(prev);
            const current = newMap.get(productId) || {};
            newMap.set(productId, { ...current, [field]: value });
            return newMap;
        });
        setHasChanges(true);
    };

    const getQuickEditValue = (productId: string, field: keyof Product, originalValue: any) => {
        const edited = quickEditProducts.get(productId);
        return edited?.[field] !== undefined ? edited[field] : originalValue;
    };

    const saveQuickEditChanges = async () => {
        try {
            setLoading(true);
            const updates = Array.from(quickEditProducts.entries()).map(([id, changes]) => ({
                id,
                ...changes,
            }));

            for (const update of updates) {
                const { error } = await supabase.from('products').update(update).eq('id', update.id);

                if (error) throw error;
            }

            setQuickEditProducts(new Map());
            setHasChanges(false);
            await fetchProducts();
            setAlert({ visible: true, message: 'Products updated successfully!', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error updating products', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const discardQuickEditChanges = () => {
        setQuickEditProducts(new Map());
        setHasChanges(false);
    };

    const deleteQuickEditProduct = async (productId: string) => {
        try {
            setLoading(true);
            const { error } = await supabase.from('products').delete().eq('id', productId);

            if (error) throw error;

            setQuickEditProducts((prev) => {
                const newMap = new Map(prev);
                newMap.delete(productId);
                return newMap;
            });

            await fetchProducts();
            setAlert({ visible: true, message: 'Product deleted successfully!', type: 'success' });
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting product', type: 'danger' });
        } finally {
            setLoading(false);
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

                        {/* Filter Toggle Button */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                    showFilters
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary'
                                }`}
                            >
                                <IconSettings className="h-4 w-4" />
                                Filters
                                {showFilters ? <IconCaretDown className="h-3 w-3 rotate-180" /> : <IconCaretDown className="h-3 w-3" />}
                            </button>

                            {/* Clear Filters Button - Only show when filters are toggled on */}
                            {showFilters && (
                                <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => {
                                        setSelectedShops([]);
                                        setSelectedCategories([]);
                                        setSelectedSubcategories([]);
                                    }}
                                >
                                    <IconX className="h-4 w-4 mr-1" />
                                    Clear
                                </button>
                            )}
                        </div>
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
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                                    viewMode === 'table' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                <IconListCheck className="h-4 w-4" />
                                Table
                            </button>
                            <button
                                onClick={() => setViewMode('quick-edit')}
                                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                                    viewMode === 'quick-edit' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                <IconEdit className="h-4 w-4" />
                                Quick Edit
                            </button>
                        </div>
                    </div>

                    <div className="ltr:ml-auto rtl:mr-auto">
                        <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                {/* Collapsible Filters Row */}
                {showFilters && (
                    <div className="px-5 py-2 mb-4">
                        {/* Shop Filter */}
                        <div>
                            <MultiSelect
                                options={availableShops.map((shop) => ({ id: shop.id, name: shop.shop_name, logo_url: shop.logo_url }))}
                                selectedValues={selectedShops}
                                onChange={setSelectedShops}
                                placeholder="Select shops"
                                isRtl={false}
                            />
                        </div>
                    </div>
                )}

                {/* Categories Row */}
                {showFilters && (
                    <div className="px-5 py-2 mb-4">
                        <div className="w-full max-w-full overflow-hidden">
                            <HorizontalFilter
                                items={availableCategories.map((category) => ({
                                    id: category.id,
                                    name: category.title,
                                    image_url: category.image_url || undefined,
                                }))}
                                selectedItems={selectedCategories}
                                onSelectionChange={setSelectedCategories}
                                placeholder="No categories available"
                                showImages={true}
                            />
                        </div>
                    </div>
                )}

                {/* Subcategories Row - Only show when categories are selected */}
                {selectedCategories.length > 0 && (
                    <div className="px-5 py-2 mb-4">
                        <div className="w-full max-w-full overflow-hidden">
                            <HorizontalFilter
                                items={availableSubcategories
                                    .filter((sub) => selectedCategories.includes(sub.category_id))
                                    .map((subcategory) => ({
                                        id: subcategory.id,
                                        name: subcategory.title,
                                        image_url: undefined,
                                    }))}
                                selectedItems={selectedSubcategories}
                                onSelectionChange={setSelectedSubcategories}
                                placeholder="No subcategories available"
                                showImages={false}
                            />
                        </div>
                    </div>
                )}

                <div className="relative">
                    {viewMode === 'grid' && (
                        // Card Grid View
                        <div className="datatables pagination-padding relative">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 p-3">
                                {records.map((product) => {
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

                            {/* Grid Pagination */}
                            <UnifiedPagination page={page} pageSize={pageSize} totalRecords={initialRecords.length} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizes={PAGE_SIZES} />
                        </div>
                    )}

                    {viewMode === 'table' && (
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
                                sortStatus={sortStatus}
                                onSortStatusChange={setSortStatus}
                                selectedRecords={selectedRecords}
                                onSelectedRecordsChange={setSelectedRecords}
                                minHeight={300}
                            />

                            {/* Table Pagination */}
                            <UnifiedPagination page={page} pageSize={pageSize} totalRecords={initialRecords.length} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizes={PAGE_SIZES} />
                        </div>
                    )}

                    {viewMode === 'quick-edit' && (
                        // Quick Edit View
                        <div className="datatables pagination-padding relative">
                            {/* Quick Edit Actions */}
                            <div className="mb-4 flex items-center justify-between px-5 py-2">
                                <div className="flex items-center gap-2">
                                    {hasChanges && <span className="text-xs bg-warning/20 text-warning px-2 py-1 rounded-full">{quickEditProducts.size} changes pending</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasChanges && (
                                        <>
                                            <button onClick={discardQuickEditChanges} className="btn btn-outline-danger btn-sm">
                                                <IconX className="h-4 w-4 mr-1" />
                                                Discard
                                            </button>
                                            <button onClick={saveQuickEditChanges} className="btn btn-primary btn-sm" disabled={loading}>
                                                <IconCheck className="h-4 w-4 mr-1" />
                                                Save Changes
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Quick Edit Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800">
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Image</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shop</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subcategory</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brand</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sale Price</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                        {records.map((product) => {
                                            const editedProduct = quickEditProducts.get(product.id);
                                            const hasChanges = editedProduct && Object.keys(editedProduct).length > 0;

                                            return (
                                                <tr key={product.id} className={hasChanges ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}>
                                                    {/* Image */}
                                                    <td className="px-4 py-3">
                                                        <div className="w-12 h-12 rounded-md overflow-hidden">
                                                            {(() => {
                                                                let imageList: any[] = [];
                                                                imageList = typeof product.images === 'string' ? JSON.parse(product.images || '[]') : product.images;
                                                                return (
                                                                    <img className="w-full h-full object-cover" src={imageList[0] || `/assets/images/product-placeholder.jpg`} alt={product.title} />
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>

                                                    {/* Title */}
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            className="form-input w-full text-sm"
                                                            value={getQuickEditValue(product.id, 'title', product.title)}
                                                            onChange={(e) => updateQuickEditProduct(product.id, 'title', e.target.value)}
                                                        />
                                                    </td>

                                                    {/* Shop */}
                                                    <td className="px-4 py-3">
                                                        <select
                                                            className="form-select w-full text-sm"
                                                            value={getQuickEditValue(product.id, 'shop', product.shops?.shop_name) || ''}
                                                            onChange={(e) => updateQuickEditProduct(product.id, 'shop', e.target.value)}
                                                        >
                                                            <option value="">Select Shop</option>
                                                            {availableShops.map((shop) => (
                                                                <option key={shop.id} value={shop.shop_name}>
                                                                    {shop.shop_name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* Category */}
                                                    <td className="px-4 py-3">
                                                        <select
                                                            className="form-select w-full text-sm"
                                                            value={getQuickEditValue(product.id, 'category', product.category) || ''}
                                                            onChange={(e) => updateQuickEditProduct(product.id, 'category', e.target.value ? parseInt(e.target.value) : null)}
                                                        >
                                                            <option value="">Select Category</option>
                                                            {availableCategories.map((category) => (
                                                                <option key={category.id} value={category.id}>
                                                                    {category.title}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* Subcategory */}
                                                    <td className="px-4 py-3">
                                                        <select
                                                            className="form-select w-full text-sm"
                                                            value={getQuickEditValue(product.id, 'subcategory_id', product.subcategory_id) || ''}
                                                            onChange={(e) => updateQuickEditProduct(product.id, 'subcategory_id', e.target.value ? parseInt(e.target.value) : null)}
                                                        >
                                                            <option value="">Select Subcategory</option>
                                                            {availableSubcategories
                                                                .filter((sub) => sub.category_id === getQuickEditValue(product.id, 'category', product.category))
                                                                .map((subcategory) => (
                                                                    <option key={subcategory.id} value={subcategory.id}>
                                                                        {subcategory.title}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    </td>

                                                    {/* Brand */}
                                                    <td className="px-4 py-3">
                                                        <select
                                                            className="form-select w-full text-sm"
                                                            value={getQuickEditValue(product.id, 'brand_id', product.brand_id) || ''}
                                                            onChange={(e) => updateQuickEditProduct(product.id, 'brand_id', e.target.value ? parseInt(e.target.value) : null)}
                                                        >
                                                            <option value="">Select Brand</option>
                                                            {availableBrands.map((brand) => (
                                                                <option key={brand.id} value={brand.id}>
                                                                    {brand.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    {/* Price */}
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="form-input w-full text-sm"
                                                            value={getQuickEditValue(product.id, 'price', product.price)}
                                                            onChange={(e) => updateQuickEditProduct(product.id, 'price', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </td>

                                                    {/* Sale Price */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                className="form-checkbox"
                                                                checked={getQuickEditValue(product.id, 'onsale', product.onsale) || false}
                                                                onChange={(e) => {
                                                                    updateQuickEditProduct(product.id, 'onsale', e.target.checked);
                                                                    if (e.target.checked) {
                                                                        setCurrentProductId(product.id);
                                                                        setShowSalePriceDialog(true);
                                                                    }
                                                                }}
                                                            />
                                                            {getQuickEditValue(product.id, 'onsale', product.onsale) && (
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    className="form-input w-20 text-sm"
                                                                    value={getQuickEditValue(product.id, 'sale_price', product.sale_price) || ''}
                                                                    onChange={(e) => updateQuickEditProduct(product.id, 'sale_price', parseFloat(e.target.value) || 0)}
                                                                    placeholder="Sale Price"
                                                                />
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-4 py-3">
                                                        <select
                                                            className="form-select w-full text-sm"
                                                            value={getQuickEditValue(product.id, 'active', product.active) ? 'active' : 'inactive'}
                                                            onChange={(e) => updateQuickEditProduct(product.id, 'active', e.target.value === 'active')}
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                        </select>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => deleteQuickEditProduct(product.id)} className="text-danger hover:text-danger-dark" title="Delete Product">
                                                                <IconTrashLines className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Quick Edit Pagination */}
                            <UnifiedPagination page={page} pageSize={pageSize} totalRecords={initialRecords.length} onPageChange={setPage} onPageSizeChange={setPageSize} pageSizes={PAGE_SIZES} />
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
            {/* Sale Price Dialog */}
            {showSalePriceDialog && currentProductId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Set Sale Price</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Sale Price</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input w-full"
                                    placeholder="Enter sale price"
                                    value={getQuickEditValue(currentProductId, 'sale_price', '') || ''}
                                    onChange={(e) => updateQuickEditProduct(currentProductId, 'sale_price', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Discount Type</label>
                                <select
                                    className="form-select w-full"
                                    value={getQuickEditValue(currentProductId, 'discount_type', 'percentage') || 'percentage'}
                                    onChange={(e) => updateQuickEditProduct(currentProductId, 'discount_type', e.target.value)}
                                >
                                    <option value="percentage">Percentage</option>
                                    <option value="fixed">Fixed Amount</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Discount Value</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-input w-full"
                                    placeholder="Enter discount value"
                                    value={getQuickEditValue(currentProductId, 'discount_value', '') || ''}
                                    onChange={(e) => updateQuickEditProduct(currentProductId, 'discount_value', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Start Date</label>
                                    <input
                                        type="date"
                                        className="form-input w-full"
                                        value={getQuickEditValue(currentProductId, 'discount_start', '') || ''}
                                        onChange={(e) => updateQuickEditProduct(currentProductId, 'discount_start', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">End Date</label>
                                    <input
                                        type="date"
                                        className="form-input w-full"
                                        value={getQuickEditValue(currentProductId, 'discount_end', '') || ''}
                                        onChange={(e) => updateQuickEditProduct(currentProductId, 'discount_end', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => {
                                    setShowSalePriceDialog(false);
                                    setCurrentProductId(null);
                                }}
                                className="btn btn-outline-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowSalePriceDialog(false);
                                    setCurrentProductId(null);
                                }}
                                className="btn btn-primary"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductsList;

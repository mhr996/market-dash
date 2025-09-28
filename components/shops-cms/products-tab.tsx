'use client';
import IconEdit from '@/components/icon/icon-edit';
import IconEye from '@/components/icon/icon-eye';
import IconPlus from '@/components/icon/icon-plus';
import IconTrashLines from '@/components/icon/icon-trash-lines';
import IconTag from '@/components/icon/icon-tag';
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
    categories?: {
        id: number;
        title: string;
        description: string;
    };
    categories_sub?: {
        id: number;
        title: string;
        description: string;
    };
    sale_price?: number | null;
    discount_type?: 'percentage' | 'fixed' | null;
    discount_value?: number | null;
    discount_start?: string | null;
    discount_end?: string | null;
    onsale?: boolean;
    active: boolean;
}

interface ProductsTabProps {
    shopId: number;
}

const ProductsTab = ({ shopId }: ProductsTabProps) => {
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
    const [showOnSaleOnly, setShowOnSaleOnly] = useState(false);
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
    }, [shopId]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('products')
                .select(
                    `
                    *,
                    shops(shop_name),
                    categories(*),
                    categories_sub(*)
                `,
                )
                .eq('shop', shopId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            setAlert({ visible: true, message: 'Error fetching products', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (product: Product) => {
        setProductToDelete(product);
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;

        try {
            // Delete images from storage
            if (productToDelete.images && productToDelete.images.length > 0) {
                await StorageManager.removeProductImages(Number(shopId), Number(productToDelete.id));
            }

            // Delete product from database
            const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);

            if (error) throw error;

            setAlert({ visible: true, message: 'Product deleted successfully', type: 'success' });
            fetchProducts();
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting product', type: 'danger' });
        } finally {
            setShowConfirmModal(false);
            setProductToDelete(null);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRecords.length === 0) return;

        try {
            for (const product of selectedRecords) {
                // Delete images from storage
                if (product.images && product.images.length > 0) {
                    await StorageManager.removeProductImages(Number(shopId), Number(product.id));
                }

                // Delete product from database
                await supabase.from('products').delete().eq('id', product.id);
            }

            setAlert({ visible: true, message: `${selectedRecords.length} products deleted successfully`, type: 'success' });
            setSelectedRecords([]);
            fetchProducts();
        } catch (error) {
            setAlert({ visible: true, message: 'Error deleting products', type: 'danger' });
        }
    };

    const handleToggleActive = async (product: Product) => {
        try {
            const { error } = await supabase.from('products').update({ active: !product.active }).eq('id', product.id);

            if (error) throw error;

            setAlert({ visible: true, message: `Product ${!product.active ? 'activated' : 'deactivated'} successfully`, type: 'success' });
            fetchProducts();
        } catch (error) {
            setAlert({ visible: true, message: 'Error updating product status', type: 'danger' });
        }
    };

    // Filter and search logic
    useEffect(() => {
        let filteredItems = items.filter((item) => {
            const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase());
            const matchesOnSale = !showOnSaleOnly || item.onsale === true;
            return matchesSearch && matchesOnSale;
        });

        // Sort the filtered items
        const sorted = sortBy(filteredItems, sortStatus.columnAccessor as keyof Product);
        const sortedItems = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;

        setInitialRecords(sortedItems);
    }, [items, search, showOnSaleOnly, sortStatus]);

    // Pagination effect
    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    const formatPrice = (price: string) => {
        return `$${parseFloat(price).toFixed(2)}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStatusBadge = (active: boolean) => {
        return active ? <span className="badge bg-success text-white">Active</span> : <span className="badge bg-danger text-white">Inactive</span>;
    };

    const getDiscountInfo = (product: Product) => {
        if (!product.sale_price || !product.discount_type || !product.discount_value) return null;

        const originalPrice = parseFloat(product.price);
        const salePrice = product.sale_price;
        const discount = product.discount_type === 'percentage' ? (product.discount_value / 100) * originalPrice : product.discount_value;
        const percentage = Math.round((discount / originalPrice) * 100);

        return (
            <div className="text-xs text-gray-500">
                {product.discount_type === 'percentage' ? `${product.discount_value}% off` : `$${product.discount_value} off`} ({percentage}% off)
            </div>
        );
    };

    const isDiscountActive = (product: Product) => {
        if (!product.discount_start || !product.discount_end) return true;
        const now = new Date();
        const start = new Date(product.discount_start);
        const end = new Date(product.discount_end);
        return now >= start && now <= end;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Products</h3>
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => setShowOnSaleOnly(!showOnSaleOnly)} className={`btn btn-sm ${showOnSaleOnly ? 'btn-primary' : 'btn-outline-primary'}`}>
                        <IconTag className="h-4 w-4 mr-1" />
                        On Sale Only
                    </button>
                    <input type="text" className="form-input w-64" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    <Link href={`/products/add?shop=${shopId}`} className="btn btn-primary">
                        <IconPlus className="h-4 w-4 mr-2" />
                        Add Product
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
                            {selectedRecords.length} product{selectedRecords.length > 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-2">
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={handleBulkDelete}>
                                <IconTrashLines className="h-4 w-4 mr-1" />
                                Delete Selected
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Products Table */}
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
                                    accessor: 'title',
                                    title: 'Product',
                                    sortable: true,
                                    render: ({ title, images, onsale }) => (
                                        <div className="flex items-center">
                                            <div className="w-max rounded-full ltr:mr-2 rtl:ml-2">
                                                {images && images.length > 0 ? (
                                                    <img className="h-8 w-8 rounded-md object-cover" src={images[0]} alt={title} />
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
                                            <div>
                                                <div className="font-semibold">{title}</div>
                                                {onsale && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">ON SALE</span>}
                                            </div>
                                        </div>
                                    ),
                                },
                                {
                                    accessor: 'price',
                                    title: 'Price',
                                    sortable: true,
                                    render: ({ price, sale_price, discount_type, discount_value, discount_start, discount_end, onsale }) => (
                                        <div>
                                            {sale_price ? (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="line-through text-gray-500">${parseFloat(price).toFixed(2)}</span>
                                                        {onsale && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">ON SALE</span>}
                                                    </div>
                                                    <span className="text-success font-bold">${sale_price.toFixed(2)}</span>
                                                    {discount_type && discount_value && (
                                                        <div className="text-xs text-gray-500">{discount_type === 'percentage' ? `${discount_value}% off` : `$${discount_value} off`}</div>
                                                    )}
                                                    {discount_start && discount_end && (
                                                        <div className="text-xs text-gray-500">
                                                            {new Date(discount_start).toLocaleDateString()} - {new Date(discount_end).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span>${parseFloat(price).toFixed(2)}</span>
                                                    {onsale && <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">ON SALE</span>}
                                                </div>
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    accessor: 'categories.title',
                                    title: 'Category',
                                    sortable: true,
                                    render: ({ categories }) => <span className="badge bg-primary text-white">{categories?.title || 'Uncategorized'}</span>,
                                },
                                {
                                    accessor: 'categories_sub.title',
                                    title: 'Sub Category',
                                    sortable: true,
                                    render: ({ categories_sub }) => <span className="badge bg-secondary text-white">{categories_sub?.title || 'No Sub Category'}</span>,
                                },
                                {
                                    accessor: 'active',
                                    title: 'Status',
                                    sortable: true,
                                    render: ({ active }) => getStatusBadge(active),
                                },
                                {
                                    accessor: 'created_at',
                                    title: 'Created',
                                    sortable: true,
                                    render: ({ created_at }) => formatDate(created_at),
                                },
                                {
                                    accessor: 'action',
                                    title: 'Actions',
                                    sortable: false,
                                    textAlignment: 'center',
                                    render: ({ id, active }) => (
                                        <div className="mx-auto flex w-max items-center gap-4">
                                            <button type="button" className="flex hover:text-primary" onClick={() => router.push(`/products/preview/${id}`)}>
                                                <IconEye className="h-4.5 w-4.5" />
                                            </button>
                                            <button type="button" className="flex hover:text-primary" onClick={() => router.push(`/products/edit/${id}`)}>
                                                <IconEdit className="h-4.5 w-4.5" />
                                            </button>
                                            <button type="button" className="flex hover:text-danger" onClick={() => handleToggleActive({ id, active } as Product)}>
                                                <IconSettings className="h-4.5 w-4.5" />
                                            </button>
                                            <button type="button" className="flex hover:text-danger" onClick={() => handleDelete({ id } as Product)}>
                                                <IconTrashLines className="h-4.5 w-4.5" />
                                            </button>
                                        </div>
                                    ),
                                },
                            ]}
                            totalRecords={initialRecords.length}
                            recordsPerPage={pageSize}
                            page={page}
                            onPageChange={setPage}
                            recordsPerPageOptions={PAGE_SIZES}
                            onRecordsPerPageChange={setPageSize}
                            sortStatus={sortStatus}
                            onSortStatusChange={setSortStatus}
                            selectedRecords={selectedRecords}
                            onSelectedRecordsChange={setSelectedRecords}
                            paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} entries`}
                        />
                    </div>
                </div>
            </div>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                onCancel={() => setShowConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Delete Product"
                message={`Are you sure you want to delete "${productToDelete?.title}"? This action cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
            />
        </div>
    );
};

export default ProductsTab;

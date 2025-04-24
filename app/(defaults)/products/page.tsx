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

interface Category {
    id: number;
    title: string;
    desc: string;
    created_at: string;
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
    shops?: {
        shop_name: string;
    };
    categories?: Category;
    sale_price?: number | null;
    discount_type?: 'percentage' | 'fixed' | null;
    discount_value?: number | null;
    discount_start?: string | null;
    discount_end?: string | null;
    active: boolean;
}

const ProductsList = () => {
    const [items, setItems] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<Product[]>([]);
    const [records, setRecords] = useState<Product[]>([]);
    const [selectedRecords, setSelectedRecords] = useState<Product[]>([]);

    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'title',
        direction: 'asc',
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
        const fetchProducts = async () => {
            try {
                const { data, error } = await supabase.from('products').select('*, shops(shop_name), categories(*)');
                if (error) throw error;

                setItems(data as Product[]);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
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
                    item.shops?.shop_name.toLowerCase().includes(search.toLowerCase()) ||
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
            // Delete images from storage first
            if (productToDelete.images?.length) {
                await Promise.all(
                    productToDelete.images.map(async (imageUrl) => {
                        const path = imageUrl.split('/').pop(); // Get filename from URL
                        if (path) {
                            await supabase.storage.from('products').remove([path]);
                        }
                    }),
                );
            }

            // Delete product record
            const { error } = await supabase.from('products').delete().eq('id', productToDelete.id);
            if (error) throw error;

            const updatedItems = items.filter((p) => p.id !== productToDelete.id);
            setItems(updatedItems);
            setAlert({ visible: true, message: 'Product deleted successfully.', type: 'success' });
        } catch (error) {
            console.error('Deletion error:', error);
            setAlert({ visible: true, message: 'Error deleting product.', type: 'danger' });
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
            console.error('Error updating product status:', error);
        }
    };

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
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
                        <Link href="/products/add" className="btn btn-primary gap-2">
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
                                title: 'ID',
                                sortable: true,
                                render: ({ id }) => <strong className="text-info">#{id}</strong>,
                            },
                            {
                                accessor: 'title',
                                title: 'Product',
                                sortable: true,
                                render: ({ title, images }) => {
                                    let imageList = [];

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
                                title: 'Price',
                                sortable: true,
                                render: ({ price, sale_price, discount_type, discount_value, discount_start, discount_end }) => (
                                    <div>
                                        {sale_price ? (
                                            <div className="flex flex-col">
                                                <span className="line-through text-gray-500">${parseFloat(price).toFixed(2)}</span>
                                                <span className="text-success font-bold">${sale_price.toFixed(2)}</span>
                                                {discount_type === 'percentage' && discount_value && (
                                                    <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded-full w-fit mt-1">{discount_value}% OFF</span>
                                                )}
                                                {discount_start && discount_end && (
                                                    <span className="text-xs text-gray-500 mt-1">
                                                        {new Date() < new Date(discount_start) ? 'Starts soon' : new Date() > new Date(discount_end) ? 'Expired' : 'Limited time'}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span>${parseFloat(price).toFixed(2)}</span>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                accessor: 'shops.shop_name',
                                title: 'Shop',
                                sortable: true,
                            },
                            {
                                accessor: 'categories.title',
                                title: 'Category',
                                sortable: true,
                                render: ({ categories }) => <span>{categories?.title || 'N/A'}</span>,
                            },
                            {
                                accessor: 'created_at',
                                title: 'Created Date',
                                sortable: true,
                                render: ({ created_at }) => <span>{new Date(created_at).toLocaleDateString()}</span>,
                            },
                            {
                                accessor: 'active',
                                title: 'Status',
                                sortable: true,
                                textAlignment: 'center',
                                render: ({ id, active }) => (
                                    <div className="flex items-center justify-start w-full">
                                        <span
                                            className={`cursor-pointer inline-block w-[60px] text-center px-1 py-1 text-xs rounded-full ${
                                                active ? 'bg-success/20 text-success hover:bg-success/30' : 'bg-danger/20 text-danger hover:bg-danger/30'
                                            } transition-all duration-300`}
                                            onClick={() => toggleProductStatus(id, !active)}
                                        >
                                            {active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'action',
                                title: 'Actions',
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <Link href={`/products/edit/${id}`} className="flex hover:text-info">
                                            <IconEdit className="h-4.5 w-4.5" />
                                        </Link>
                                        <Link href={`/products/preview/${id}`} className="flex hover:text-primary">
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
                        paginationText={({ from, to, totalRecords }) => `Showing ${from} to ${to} of ${totalRecords} entries`}
                        minHeight={300}
                    />

                    {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                </div>
            </div>

            <ConfirmModal
                isOpen={showConfirmModal}
                title="Confirm Deletion"
                message="Are you sure you want to delete this product? This will also delete all associated images."
                onCancel={() => {
                    setShowConfirmModal(false);
                    setProductToDelete(null);
                }}
                onConfirm={confirmDeletion}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                size="sm"
            />
        </div>
    );
};

export default ProductsList;

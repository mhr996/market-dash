'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getTranslation } from '@/i18n';
import IconPrinter from '@/components/icon/icon-printer';
import IconDownload from '@/components/icon/icon-download';
import { generateOrderReceiptPDF } from '@/utils/pdf-generator';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

// Interfaces for Supabase order data
interface OrderData {
    id: number;
    created_at: string;
    buyer_id: string;
    status: string;
    product_id: number;
    shipping_method: any;
    shipping_address: any;
    payment_method: any;
    // Joined data
    products?: {
        id: number;
        title: string;
        price: number;
        images: any[];
        shop: number;
        shops?: {
            shop_name: string;
        };
    };
    profiles?: {
        id: string;
        full_name: string;
        email: string;
    };
}

// Helper functions to parse JSON fields
const parseJsonField = (field: any) => {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch {
            return {};
        }
    }
    return field || {};
};

interface Order {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    date: string;
    total: string;
    status: 'completed' | 'processing' | 'cancelled';
    address: string;
    items: { name: string; quantity: number; price: number }[];
}

const PreviewOrder = () => {
    const { t } = getTranslation();
    const params = useParams();
    const id = params?.id as string;

    const [order, setOrder] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) return;

            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select(
                        `
                        *,
                        products(
                            id, title, price, images, shop,
                            shops(
                                id, shop_name, logo_url, address, 
                                phone_numbers
                            )
                        ),
                        profiles(
                            id, full_name, email, username, profession, 
                            country, location, phone, website, avatar_url
                        )
                    `,
                    )
                    .eq('id', parseInt(id))
                    .single();

                if (error) throw error;

                // Format the order data for display
                const shippingAddress = parseJsonField(data.shipping_address);
                const paymentMethod = parseJsonField(data.payment_method);
                const shippingMethod = parseJsonField(data.shipping_method);

                const formattedOrder = {
                    id: data.id,
                    name: data.products?.title || 'Product',
                    image: data.products?.images?.[0] || null,
                    buyer: data.profiles?.full_name || shippingAddress.name || 'Unknown Customer',
                    date: data.created_at,
                    total: `$${(data.products?.price || 0).toFixed(2)}`,
                    status: data.status,
                    address: `${shippingAddress.address || ''}, ${shippingAddress.city || ''}, ${shippingAddress.zip || ''}`.trim(),
                    items: [
                        {
                            name: data.products?.title || 'Product',
                            quantity: 1,
                            price: data.products?.price || 0,
                        },
                    ],
                    // Comprehensive order data
                    shipping_method: shippingMethod,
                    shipping_address: shippingAddress,
                    payment_method: paymentMethod,
                    product_id: data.product_id,
                    buyer_id: data.buyer_id,
                    // User data
                    user: {
                        id: data.profiles?.id,
                        full_name: data.profiles?.full_name,
                        email: data.profiles?.email,
                        username: data.profiles?.username,
                        profession: data.profiles?.profession,
                        country: data.profiles?.country,
                        location: data.profiles?.location,
                        phone: data.profiles?.phone,
                        website: data.profiles?.website,
                        avatar_url: data.profiles?.avatar_url,
                    },
                    // Shop data
                    shop: {
                        id: data.products?.shops?.id,
                        shop_name: data.products?.shops?.shop_name,
                        logo_url: data.products?.shops?.logo_url,
                        address: data.products?.shops?.address,
                        phone_numbers: data.products?.shops?.phone_numbers,
                    },
                    // Product data
                    product: {
                        id: data.products?.id,
                        title: data.products?.title,
                        price: data.products?.price,
                        images: data.products?.images,
                    },
                };

                setOrder(formattedOrder);
            } catch (error) {
                console.error('Error fetching order:', error);
                setOrder(null);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id]);
    const handlePrint = async () => {
        if (!order) return;

        try {
            await generateOrderReceiptPDF(order, {
                filename: `order-${order.id}-receipt.pdf`,
            });
        } catch (error) {
            console.error('Error printing order:', error);
            alert(t('error_printing_order'));
        }
    };

    const handleDownloadPdf = async () => {
        if (!order) return;

        try {
            await generateOrderReceiptPDF(order, {
                filename: `order-${order.id}-receipt.pdf`,
            });
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert(t('error_downloading_pdf'));
        }
    };

    const calculateSubtotal = () => {
        if (!order) return 0;
        return order.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    };

    const calculateTax = () => {
        return calculateSubtotal() * 0.1; // 10% tax
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };
    if (loading) {
        return <div className="flex items-center justify-center h-screen">{t('loading')}</div>;
    }

    if (!order) {
        return <div className="flex items-center justify-center h-screen">{t('order_not_found')}</div>;
    }
    return (
        <div className="print:p-0">
            <div onClick={() => router.back()}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            </div>
            <ul className="flex space-x-2 rtl:space-x-reverse print:hidden">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        {t('home')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/orders" className="text-primary hover:underline">
                        {t('orders')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>
                        {t('order_details')} #{order.id}
                    </span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-6 flex items-center justify-between print:hidden">
                    <h5 className="text-xl font-semibold dark:text-white-light">{t('order_details')}</h5>
                    <div className="flex gap-2">
                        <button onClick={handlePrint} className="btn btn-primary gap-2">
                            <IconPrinter className="h-5 w-5" />
                            {t('print')}
                        </button>
                        <button onClick={handleDownloadPdf} className="btn btn-success gap-2">
                            <IconDownload className="h-5 w-5" />
                            {t('download_pdf')}
                        </button>
                    </div>
                </div>

                {/* Invoice Header */}
                <div className="panel">
                    <div className="flex flex-wrap justify-between gap-4 px-4 py-6">
                        <div className="flex-1">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-primary">{t('order_invoice')}</h1>
                                <p className="text-sm text-gray-500">#{order.id}</p>
                            </div>

                            <div className="space-y-1 text-white-dark">
                                <div>
                                    <strong>{t('order_date')}:</strong> {new Date(order.date).toLocaleDateString()}
                                </div>
                                <div>
                                    <strong>{t('status')}:</strong>
                                    <span className={`badge badge-outline-${order.status === 'completed' ? 'success' : order.status === 'processing' ? 'warning' : 'danger'} mx-2`}>
                                        {t(`${order.status}`)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0">
                            <img src={order.image || '/assets/images/product-placeholder.jpg'} alt={order.name} className="h-32 w-32 rounded-lg object-cover" />
                        </div>
                    </div>

                    {/* Comprehensive Information Grid */}
                    <div className="grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-3">
                        {/* Customer Information */}
                        <div className="panel border border-gray-200 dark:border-gray-700">
                            <div className="mb-4 flex items-center gap-3">
                                {order.user?.avatar_url ? (
                                    <img src={order.user.avatar_url} alt={order.user.full_name} className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-semibold">{order.user?.full_name?.charAt(0) || 'U'}</div>
                                )}
                                <h6 className="text-lg font-semibold">{t('customer_information')}</h6>
                            </div>
                            <div className="space-y-3 text-white-dark">
                                <div>
                                    <strong>{t('full_name')}:</strong>
                                    <p className="mt-1">{order.user?.full_name || 'N/A'}</p>
                                </div>
                                {order.user?.username && (
                                    <div>
                                        <strong>{t('username')}:</strong>
                                        <p className="mt-1">@{order.user.username}</p>
                                    </div>
                                )}
                                <div>
                                    <strong>{t('email')}:</strong>
                                    <p className="mt-1">{order.user?.email || 'N/A'}</p>
                                </div>
                                {order.user?.phone && (
                                    <div>
                                        <strong>{t('phone')}:</strong>
                                        <p className="mt-1">{order.user.phone}</p>
                                    </div>
                                )}
                                {order.user?.profession && (
                                    <div>
                                        <strong>{t('profession')}:</strong>
                                        <p className="mt-1">{order.user.profession}</p>
                                    </div>
                                )}
                                {order.user?.country && (
                                    <div>
                                        <strong>{t('country')}:</strong>
                                        <p className="mt-1">{order.user.country}</p>
                                    </div>
                                )}
                                {order.user?.location && (
                                    <div>
                                        <strong>{t('location')}:</strong>
                                        <p className="mt-1">{order.user.location}</p>
                                    </div>
                                )}
                                {order.user?.website && (
                                    <div>
                                        <strong>{t('website')}:</strong>
                                        <p className="mt-1">
                                            <a href={order.user.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                {order.user.website}
                                            </a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Shop Information */}
                        <div className="panel border border-gray-200 dark:border-gray-700">
                            <div className="mb-4 flex items-center gap-3">
                                {order.shop?.logo_url ? (
                                    <img src={order.shop.logo_url} alt={order.shop.shop_name} className="h-12 w-12 rounded-full object-cover" />
                                ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-white font-semibold">{order.shop?.shop_name?.charAt(0) || 'S'}</div>
                                )}
                                <h6 className="text-lg font-semibold">{t('shop_information')}</h6>
                            </div>
                            <div className="space-y-3 text-white-dark">
                                <div>
                                    <strong>{t('shop_name')}:</strong>
                                    <p className="mt-1">{order.shop?.shop_name || 'N/A'}</p>
                                </div>
                              
                                {order.shop?.address && (
                                    <div>
                                        <strong>{t('shop_address')}:</strong>
                                        <p className="mt-1">{order.shop.address}</p>
                                    </div>
                                )}
                                {order.shop?.phone_numbers && order.shop.phone_numbers.length > 0 && (
                                    <div>
                                        <strong>{t('shop_phone')}:</strong>
                                        <div className="mt-1">
                                            {order.shop.phone_numbers.map((phone: string, index: number) => (
                                                <p key={index}>{phone}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                              
                            </div>
                        </div>

                        {/* Payment & Shipping Information */}
                        <div className="panel border border-gray-200 dark:border-gray-700">
                            <h6 className="mb-4 text-lg font-semibold">{t('payment_information')}</h6>
                            <div className="space-y-4 text-white-dark">
                                {/* Payment Method */}
                                <div>
                                    <strong>{t('payment_method')}:</strong>
                                    <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span>{t('payment_type')}:</span>
                                                <span className="font-medium">{order.payment_method?.type || 'N/A'}</span>
                                            </div>
                                            {order.payment_method?.provider && (
                                                <div className="flex justify-between">
                                                    <span>{t('provider')}:</span>
                                                    <span className="font-medium">{order.payment_method.provider}</span>
                                                </div>
                                            )}
                                            {order.payment_method?.card_number && (
                                                <div className="flex justify-between">
                                                    <span>{t('card_number')}:</span>
                                                    <span className="font-medium font-mono">{order.payment_method.card_number}</span>
                                                </div>
                                            )}
                                            {order.payment_method?.name_on_card && (
                                                <div className="flex justify-between">
                                                    <span>{t('name_on_card')}:</span>
                                                    <span className="font-medium">{order.payment_method.name_on_card}</span>
                                                </div>
                                            )}
                                            {order.payment_method?.expiration_date && (
                                                <div className="flex justify-between">
                                                    <span>{t('expiration_date')}:</span>
                                                    <span className="font-medium">{order.payment_method.expiration_date}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Shipping Information */}
                                <div>
                                    <strong>{t('shipping_information')}:</strong>
                                    <div className="mt-2 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span>{t('shipping_method')}:</span>
                                                <span className="font-medium">{order.shipping_method?.type || 'N/A'}</span>
                                            </div>
                                            {order.shipping_method?.cost && (
                                                <div className="flex justify-between">
                                                    <span>{t('shipping_cost')}:</span>
                                                    <span className="font-medium">${order.shipping_method.cost}</span>
                                                </div>
                                            )}
                                            {order.shipping_method?.duration && (
                                                <div className="flex justify-between">
                                                    <span>{t('shipping_duration')}:</span>
                                                    <span className="font-medium">{order.shipping_method.duration}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="px-4 py-6">
                        <h6 className="mb-4 text-lg font-semibold">{t('delivery_info')}</h6>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="panel border border-gray-200 dark:border-gray-700">
                                <h6 className="mb-3 text-md font-semibold">{t('shipping_address')}</h6>
                                <div className="space-y-2 text-white-dark">
                                    {order.shipping_address?.name && (
                                        <div>
                                            <strong>{t('full_name')}:</strong> {order.shipping_address.name}
                                        </div>
                                    )}
                                    {order.shipping_address?.email && (
                                        <div>
                                            <strong>{t('email')}:</strong> {order.shipping_address.email}
                                        </div>
                                    )}
                                    {order.shipping_address?.phone && (
                                        <div>
                                            <strong>{t('phone')}:</strong> {order.shipping_address.phone}
                                        </div>
                                    )}
                                    {order.shipping_address?.address && (
                                        <div>
                                            <strong>{t('address')}:</strong> {order.shipping_address.address}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        {order.shipping_address?.district && (
                                            <div>
                                                <strong>{t('district')}:</strong> {order.shipping_address.district}
                                            </div>
                                        )}
                                        {order.shipping_address?.city && (
                                            <div>
                                                <strong>{t('city')}:</strong> {order.shipping_address.city}
                                            </div>
                                        )}
                                    </div>
                                    {order.shipping_address?.zip && (
                                        <div>
                                            <strong>{t('zip_code')}:</strong> {order.shipping_address.zip}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="panel border border-gray-200 dark:border-gray-700">
                                <h6 className="mb-3 text-md font-semibold">{t('order_summary')}</h6>
                                <div className="space-y-2 text-white-dark">
                                    <div>
                                        <strong>{t('order_name')}:</strong> {order.name}
                                    </div>
                                    <div>
                                        <strong>{t('total_items')}:</strong> {order.items.length}
                                    </div>
                                    <div>
                                        <strong>{t('order_total')}:</strong> <span className="text-success font-semibold">{order.total}</span>
                                    </div>
                                    <div>
                                        <strong>{t('order_date')}:</strong> {new Date(order.date).toLocaleDateString()}
                                    </div>
                                    <div>
                                        <strong>{t('status')}:</strong>
                                        <span className={`badge badge-outline-${order.status === 'completed' ? 'success' : order.status === 'processing' ? 'warning' : 'danger'} mx-2`}>
                                            {t(`${order.status}`)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div className="px-4 py-6">
                        <h6 className="mb-4 text-lg font-semibold">{t('order_items')}</h6>
                        <div className="table-responsive">
                            <table className="table-striped">
                                <thead>
                                    <tr>
                                        <th>{t('item_name')}</th>
                                        <th className="text-center">{t('quantity')}</th>
                                        <th className="text-right">{t('unit_price')}</th>
                                        <th className="text-right">{t('total')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item: any, index: number) => (
                                        <tr key={index}>
                                            <td>{item.name}</td>
                                            <td className="text-center">{item.quantity}</td>
                                            <td className="text-right">${item.price.toFixed(2)}</td>
                                            <td className="text-right">${(item.price * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Order Totals */}
                        <div className="mt-6 flex justify-end">
                            <div className="w-full max-w-xs space-y-2">
                                <div className="flex justify-between">
                                    <span>{t('subtotal')}:</span>
                                    <span>${calculateSubtotal().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>{t('tax')} (10%):</span>
                                    <span>${calculateTax().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 font-semibold">
                                    <span>{t('total')}:</span>
                                    <span className="text-success">${calculateTotal().toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreviewOrder;

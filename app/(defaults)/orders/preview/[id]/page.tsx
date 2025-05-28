'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getTranslation } from '@/i18n';
import { orders, Order as OrderData } from '../../data';
import IconPrinter from '@/components/icon/icon-printer';
import IconDownload from '@/components/icon/icon-download';
import { generateOrderReceiptPDF } from '@/utils/pdf-generator';
import { useRouter } from 'next/navigation';

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
    // Fix: Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;

    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        if (id) {
            // Find order from dummy data
            const foundOrder = orders.find((o) => o.id === parseInt(id));
            setOrder(foundOrder || null);
            setLoading(false);
        }
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
        return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
                        <button className="btn btn-primary gap-2">
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
                                    <span className={`badge badge-outline-${order.status === 'completed' ? 'success' : order.status === 'processing' ? 'warning' : 'danger'} ml-2`}>
                                        {t(`order_status_${order.status}`)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0">
                            <img src={order.image || '/assets/images/product-placeholder.jpg'} alt={order.name} className="h-20 w-20 rounded-lg object-cover" />
                        </div>
                    </div>

                    {/* Customer Information */}
                    <div className="grid grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-2">
                        <div>
                            <h6 className="mb-3 text-lg font-semibold">{t('customer_information')}</h6>
                            <div className="space-y-2 text-white-dark">
                                <div>
                                    <strong>{t('name')}:</strong> {order.buyer}
                                </div>
                                <div>
                                    <strong>{t('address')}:</strong> {order.address}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h6 className="mb-3 text-lg font-semibold">{t('order_summary')}</h6>
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
                                    {order.items.map((item, index) => (
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

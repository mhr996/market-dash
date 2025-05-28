'use client';
import React from 'react';
import { getTranslation } from '@/i18n';

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

interface OrderData {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    date: string;
    total: string;
    status: 'completed' | 'processing' | 'cancelled';
    address: string;
    items: OrderItem[];
}

interface OrderReceiptProps {
    order: OrderData;
    isVisible: boolean;
}

const OrderReceipt: React.FC<OrderReceiptProps> = ({ order, isVisible }) => {
    const { t } = getTranslation();

    const calculateSubtotal = () => {
        return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    };

    const calculateTax = () => {
        return calculateSubtotal() * 0.1; // 10% tax
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    return (
        <div
            id="order-receipt"
            className={`${isVisible ? 'block' : 'hidden'} print:block`}
            style={{
                position: 'fixed',
                top: '-9999px',
                left: '-9999px',
                width: '210mm',
                minHeight: '297mm',
                padding: '20mm',
                backgroundColor: 'white',
                color: 'black',
                fontSize: '12pt',
                lineHeight: '1.5',
            }}
        >
            {/* Receipt Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #000', paddingBottom: '20px' }}>
                <h1 style={{ fontSize: '24pt', fontWeight: 'bold', margin: '0 0 10px 0' }}>{t('order_invoice')}</h1>
                <p style={{ fontSize: '14pt', margin: '0', color: '#666' }}>
                    {t('order_id')}: #{order.id}
                </p>
                <p style={{ fontSize: '12pt', margin: '5px 0 0 0', color: '#666' }}>
                    {t('order_date')}: {new Date(order.date).toLocaleDateString()}
                </p>
            </div>

            {/* Company Info (You can customize this) */}
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: '0 0 10px 0' }}>Your Company Name</h2>
                <p style={{ margin: '0', fontSize: '10pt', color: '#666' }}>
                    123 Business Street
                    <br />
                    City, State 12345
                    <br />
                    Phone: (555) 123-4567
                    <br />
                    Email: info@company.com
                </p>
            </div>

            {/* Customer Information */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0 0 10px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>{t('customer_information')}</h3>
                <p style={{ margin: '0', fontSize: '11pt' }}>
                    <strong>{t('name')}:</strong> {order.buyer}
                    <br />
                    <strong>{t('address')}:</strong> {order.address}
                </p>
            </div>

            {/* Order Status */}
            <div style={{ marginBottom: '30px' }}>
                <p style={{ margin: '0', fontSize: '11pt' }}>
                    <strong>{t('status')}:</strong>
                    <span
                        style={{
                            marginLeft: '10px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: order.status === 'completed' ? '#10b981' : order.status === 'processing' ? '#f59e0b' : '#ef4444',
                            color: 'white',
                            fontSize: '10pt',
                        }}
                    >
                        {t(`order_status_${order.status}`)}
                    </span>
                </p>
            </div>

            {/* Order Items Table */}
            <div style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0 0 15px 0', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>{t('order_items')}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f5f5f5', background: 'red' }}>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>{t('item_name')}</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{t('quantity')}</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{t('unit_price')}</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{t('total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr key={index}>
                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.name}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>${item.price.toFixed(2)}</td>
                                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Order Summary */}
            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '11pt' }}>
                            <span>{t('subtotal')}:</span>
                            <span>${calculateSubtotal().toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '11pt' }}>
                            <span>{t('tax')} (10%):</span>
                            <span>${calculateTax().toFixed(2)}</span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '10px 0',
                                fontSize: '14pt',
                                fontWeight: 'bold',
                                borderTop: '2px solid #000',
                                marginTop: '10px',
                            }}
                        >
                            <span>{t('total')}:</span>
                            <span>${calculateTotal().toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div
                style={{
                    marginTop: '50px',
                    paddingTop: '20px',
                    borderTop: '1px solid #ccc',
                    textAlign: 'center',
                    fontSize: '9pt',
                    color: '#666',
                }}
            >
                <p style={{ margin: '0' }}>Thank you for your business!</p>
                <p style={{ margin: '5px 0 0 0' }}>This is a computer-generated receipt. No signature required.</p>
            </div>
        </div>
    );
};

export default OrderReceipt;

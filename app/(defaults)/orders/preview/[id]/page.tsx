'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';

interface Order {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    status: string;
}

const PreviewOrder = () => {
    // Fix: Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
                if (error) throw error;
                setOrder(data);
            } catch (error) {
                console.error('Error fetching order:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchOrder();
        }
    }, [id]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!order) {
        return <div className="flex items-center justify-center h-screen">Order not found</div>;
    }

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        Home
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/orders" className="text-primary hover:underline">
                        Orders
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Preview Order #{order.id}</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-6 flex items-center justify-between">
                    <h5 className="text-xl font-semibold dark:text-white-light">Order Details</h5>
                    <Link href={`/orders/edit/${id}`} className="btn btn-primary">
                        Edit Order
                    </Link>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="panel h-full">
                        <div className="mb-5">
                            <div className="flex flex-col items-center justify-center">
                                <div className="mb-5 h-40 w-40 overflow-hidden rounded-full">
                                    <img src={order.image || '/assets/images/product-placeholder.jpg'} alt="Order" className="h-full w-full object-cover" />
                                </div>
                                <h4 className="text-xl font-semibold text-primary">{order.name}</h4>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4 border-t border-[#d3d3d3]/30 pt-5">
                            <div className="flex items-center">
                                <span className="flex-shrink-0 font-semibold text-white-dark">Order ID:</span>
                                <span className="ml-2">#{order.id}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="flex-shrink-0 font-semibold text-white-dark">Buyer:</span>
                                <span className="ml-2">{order.buyer}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="flex-shrink-0 font-semibold text-white-dark">Status:</span>
                                <span className={`badge badge-outline-${order.status === 'completed' ? 'success' : order.status === 'processing' ? 'warning' : 'danger'} ml-2`}>{order.status}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PreviewOrder;

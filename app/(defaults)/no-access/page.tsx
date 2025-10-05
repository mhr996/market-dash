'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const NoAccessPage = () => {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        // If user is not loaded yet, wait
        if (loading) return;

        // If no user, redirect to login
        if (!user) {
            router.push('/login');
            return;
        }

        // If user has access, redirect based on role
        if (user.role_name === 'super_admin') {
            router.push('/');
            return;
        }

        // If shop_editor, redirect to orders (their main page)
        if (user.role_name === 'shop_editor') {
            router.push('/orders');
            return;
        }

        // If shop_owner, redirect to products (their main page)
        if (user.role_name === 'shop_owner') {
            router.push('/products');
            return;
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full space-y-8 text-center">
                <div>
                    <div className="mx-auto h-24 w-24 text-red-500">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                            />
                        </svg>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Access Denied</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
                </div>
                <div className="space-y-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>
                            Your current role: <span className="font-semibold capitalize">{user?.role_name?.replace('_', ' ')}</span>
                        </p>
                        <p className="mt-1">Contact your administrator if you believe this is an error.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href={user?.role_name === 'shop_owner' ? '/products' : '/'}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Go to Dashboard
                        </Link>
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoAccessPage;

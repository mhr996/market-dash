'use client';
import AnalyticsDashboard from '@/components/analytics/analytics-dashboard';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const AnalyticsPage = () => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user || user.role === 6) {
            router.push('/no-access');
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

    if (!user || user.role === 6) {
        return null;
    }

    return <AnalyticsDashboard />;
};

export default AnalyticsPage;

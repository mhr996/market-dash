import AnalyticsDashboard from '@/components/analytics/analytics-dashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Analytics Dashboard',
};

const AnalyticsPage = () => {
    return <AnalyticsDashboard />;
};

export default AnalyticsPage;

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import IconEdit from '@/components/icon/icon-edit';
import IconArrowBackward from '@/components/icon/icon-arrow-backward';
import IconEye from '@/components/icon/icon-eye';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { sortBy } from 'lodash';
import { getTranslation } from '@/i18n';

interface License {
    id: number;
    title: string;
    desc: string;
    price: number;
    shops: number;
    products: number;
    commission_type: string;
    commission_value: number;
    created_at: string;
}

interface Subscriber {
    id: number;
    profile_id: string;
    created_at: string;
    status: string;
    profiles?: {
        full_name: string;
        email: string;
    };
}

interface LicenseDetailsPageProps {
    params: {
        id: string;
    };
}

const LicenseDetailsPage = ({ params }: LicenseDetailsPageProps) => {
    const router = useRouter();
    const [license, setLicense] = useState<License | null>(null);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSubscribers, setLoadingSubscribers] = useState(true);
    const { t } = getTranslation();

    // State for subscribers table pagination and search
    const [search, setSearch] = useState('');
    const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'id',
        direction: 'asc',
    });

    useEffect(() => {
        const fetchLicense = async () => {
            try {
                const { data, error } = await supabase.from('licenses').select('*').eq('id', params.id).single();
                if (error) throw error;
                setLicense(data);
            } catch (error) {
                console.error('Error fetching license:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLicense();
    }, [params.id]);

    useEffect(() => {
        const fetchSubscribers = async () => {
            if (!license) return;

            try {
                setLoadingSubscribers(true);
                const { data, error } = await supabase.from('subscriptions').select('*, profiles:profile_id(full_name, email)').eq('license_id', params.id);

                if (error) throw error;
                setSubscribers(data as Subscriber[]);
            } catch (error) {
                console.error('Error fetching subscribers:', error);
            } finally {
                setLoadingSubscribers(false);
            }
        };

        if (license) {
            fetchSubscribers();
        }
    }, [license, params.id]);

    useEffect(() => {
        // Filter subscribers based on search term
        const filtered = subscribers.filter((item) => {
            const searchTerm = search.toLowerCase();
            return (
                item.id.toString().includes(searchTerm) ||
                item.profiles?.full_name.toLowerCase().includes(searchTerm) ||
                item.profiles?.email.toLowerCase().includes(searchTerm) ||
                item.status.toLowerCase().includes(searchTerm)
            );
        });

        // Apply sorting
        const sorted = sortBy(filtered, sortStatus.columnAccessor);
        setFilteredSubscribers(sortStatus.direction === 'desc' ? sorted.reverse() : sorted);
    }, [subscribers, search, sortStatus]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
            </div>
        );
    }

    if (!license) {
        return (
            <div className="flex flex-col items-center justify-center h-80">
                <p className="text-xl font-bold mb-2">{t('license_not_found')}</p>
                <Link href="/licenses" className="btn btn-primary mt-4">
                    {t('back_to_licenses')}
                </Link>
            </div>
        );
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(value);
    };

    return (
        <div className="container mx-auto p-6">
            {' '}
            {/* Header with back button */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                {' '}
                <div onClick={() => router.back()} className="cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <Link href={`/licenses/edit/${license.id}`} className="btn btn-primary flex items-center gap-2">
                    <IconEdit className="h-5 w-5" />
                    {t('edit_license')}
                </Link>
            </div>
            {/* Breadcrumb Navigation */}
            <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        {t('home')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/licenses" className="text-primary hover:underline">
                        {t('licenses')}
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{license.title}</span>
                </li>
            </ul>
            {/* License details card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main License Info */}
                <div className="lg:col-span-8">
                    <div className="panel h-full">
                        {/* Header */}
                        <div className="flex justify-between mb-5">
                            <h5 className="text-xl font-bold text-gray-800 dark:text-white-light">{license.title}</h5>
                            <span className="badge bg-primary text-white text-base px-4 py-1.5">{formatCurrency(license.price)}</span>
                        </div>
                        {/* Description */}
                        <div className="mb-6">
                            <h6 className="text-base font-semibold text-gray-700 dark:text-white-light mb-2">{t('description')}</h6>
                            <p className="text-gray-600 dark:text-gray-400">{license.desc || t('no_description_available')}</p>
                        </div>{' '}
                        {/* Features */}
                        <div>
                            <h6 className="text-base font-semibold text-gray-700 dark:text-white-light mb-3">{t('features')}</h6>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                <div className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white-light/30 dark:bg-dark/40">
                                    <div className="flex h-11 w-11 min-w-[2.75rem] items-center justify-center rounded-md bg-primary-light dark:bg-primary text-primary dark:text-white-light">
                                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M3.79424 12.0291C4.33141 9.34329 4.59999 8.00036 5.48746 7.13543C5.65149 6.97557 5.82894 6.8301 6.01786 6.70061C7.04004 6 8.40956 6 11.1486 6H12.8515C15.5906 6 16.9601 6 17.9823 6.70061C18.1712 6.8301 18.3486 6.97557 18.5127 7.13543C19.4001 8.00036 19.6687 9.34329 20.2059 12.0291C20.9771 15.8851 21.3627 17.8131 20.475 19.1793C20.3143 19.4267 20.1265 19.6555 19.915 19.8616C18.7381 21 16.7024 21 12.631 21H11.369C7.29765 21 5.26196 21 4.08506 19.8616C3.87355 19.6555 3.68576 19.4267 3.52506 19.1793C2.63734 17.8131 3.02295 15.8851 3.79424 12.0291Z"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                            />
                                            <path opacity="0.5" d="M9 6V5C9 3.34315 10.3431 2 12 2C13.6569 2 15 3.34315 15 5V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <p className="text-gray-400 text-sm">{t('allowed_shops')}</p>
                                        <h5 className="text-xl font-semibold text-gray-800 dark:text-white-light">{license.shops}</h5>
                                    </div>
                                </div>

                                <div className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white-light/30 dark:bg-dark/40">
                                    <div className="flex h-11 w-11 min-w-[2.75rem] items-center justify-center rounded-md bg-warning-light dark:bg-warning text-warning dark:text-warning-light">
                                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M20.5 7.27783L12 2.0835L3.5 7.27783V14.8335L12 20.0278L20.5 14.8335V7.27783Z" stroke="currentColor" strokeWidth="1.5" />
                                            <path opacity="0.5" d="M12 13.0835L20.5 7.27783M12 13.0835V20.0278M12 13.0835L3.5 7.27783" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <p className="text-gray-400 text-sm">{t('allowed_products')}</p>
                                        <h5 className="text-xl font-semibold text-gray-800 dark:text-white-light">{license.products}</h5>
                                    </div>
                                </div>

                                <div className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-white-light/30 dark:bg-dark/40">
                                    <div className="flex h-11 w-11 min-w-[2.75rem] items-center justify-center rounded-md bg-success-light dark:bg-success text-success dark:text-success-light">
                                        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path
                                                d="M10.0464 14.4463C10.2442 14.6441 10.5622 14.6441 10.76 14.4463L14.76 10.4463C14.9578 10.2485 14.9578 9.93057 14.76 9.73278C14.5622 9.53499 14.2442 9.53499 14.0464 9.73278L10.4 13.3792L8.95355 11.9328C8.75576 11.735 8.43782 11.735 8.24003 11.9328C8.04224 12.1306 8.04224 12.4485 8.24003 12.6463L10.0464 14.4463Z"
                                                fill="currentColor"
                                            />
                                            <path
                                                d="M4.49999 12C4.49999 7.85786 7.85785 4.5 12 4.5C16.1421 4.5 19.5 7.85786 19.5 12C19.5 16.1421 16.1421 19.5 12 19.5C7.85785 19.5 4.49999 16.1421 4.49999 12Z"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                            />
                                        </svg>
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4">
                                        <p className="text-gray-400 text-sm">{t('commission_rate')}</p>
                                        <h5 className="text-xl font-semibold text-gray-800 dark:text-white-light">
                                            {license.commission_value}
                                            {license.commission_type === 'percentage' ? '%' : ' USD'}
                                        </h5>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Subscribers Table */}
                        <div className="mt-8">
                            <div className="flex justify-between items-center mb-5">
                                <h6 className="text-base font-semibold text-gray-700 dark:text-white-light">{t('subscriptions')}</h6>
                                <input type="text" className="form-input w-auto" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>

                            <div className="datatables relative">
                                <DataTable
                                    className={`${loadingSubscribers ? 'filter blur-sm pointer-events-none' : 'table-hover whitespace-nowrap'}`}
                                    records={filteredSubscribers}
                                    columns={[
                                        {
                                            accessor: 'id',
                                            title: t('id'),
                                            sortable: true,
                                            render: ({ id }) => <strong className="text-info">#{id}</strong>,
                                        },
                                        {
                                            accessor: 'profiles.full_name',
                                            title: t('user'),
                                            sortable: true,
                                            render: ({ profiles }) => (
                                                <div>
                                                    <p className="font-semibold">{profiles?.full_name || t('not_available')}</p>
                                                    <p className="text-gray-600 text-xs">{profiles?.email || ''}</p>
                                                </div>
                                            ),
                                        },
                                        {
                                            accessor: 'status',
                                            title: t('status'),
                                            sortable: true,
                                            render: ({ status }) => <span className={`badge badge-outline-${status === 'Active' ? 'success' : 'danger'}`}>{status}</span>,
                                        },
                                        {
                                            accessor: 'created_at',
                                            title: t('created_date'),
                                            sortable: true,
                                            render: ({ created_at }) => (created_at ? <span>{new Date(created_at).toLocaleDateString()}</span> : ''),
                                        },
                                        {
                                            accessor: 'action',
                                            title: t('actions'),
                                            sortable: false,
                                            textAlignment: 'center',
                                            render: ({ id }) => (
                                                <div className="mx-auto flex w-max items-center gap-4">
                                                    <Link href={`/subscriptions/preview/${id}`} className="flex hover:text-primary">
                                                        <IconEye />
                                                    </Link>
                                                </div>
                                            ),
                                        },
                                    ]}
                                    highlightOnHover
                                    sortStatus={sortStatus}
                                    onSortStatusChange={setSortStatus}
                                    minHeight={200}
                                    noRecordsText={subscribers.length === 0 ? t('no_subscribers') : ''}
                                />
                                {loadingSubscribers && <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-black-dark-light bg-opacity-60 backdrop-blur-sm" />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side Info */}
                <div className="lg:col-span-4">
                    <div className="panel h-full">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold text-gray-800 dark:text-white-light">{t('license_summary')}</h5>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <h6 className="text-sm font-semibold text-gray-700 dark:text-white-light mb-2">{t('id')}</h6>
                                <p className="text-gray-600 dark:text-gray-400">#{license.id}</p>
                            </div>

                            <div>
                                <h6 className="text-sm font-semibold text-gray-700 dark:text-white-light mb-2">{t('created_date')}</h6>
                                <p className="text-gray-600 dark:text-gray-400">{new Date(license.created_at).toLocaleDateString()}</p>
                            </div>

                            <div>
                                <h6 className="text-sm font-semibold text-gray-700 dark:text-white-light mb-2">{t('price')}</h6>
                                <div className="flex items-center">
                                    <span className="text-xl font-bold text-primary">{formatCurrency(license.price)}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{t('per_license')}</span>
                                </div>
                            </div>
                            <div>
                                <h6 className="text-sm font-semibold text-gray-700 dark:text-white-light mb-2">{t('subscriptions')}</h6>
                                <div className="flex items-center">
                                    <span className="text-xl font-bold text-success">{subscribers.length}</span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{t('users')}</span>
                                </div>
                            </div>

                            <hr className="border-gray-200 dark:border-gray-700" />

                            <div className="mt-4">
                                <Link href={`/licenses/edit/${license.id}`} className="btn btn-primary w-full">
                                    {t('edit_license')}
                                </Link>
                                <Link href="/licenses" className="btn btn-outline-primary w-full mt-3">
                                    {t('back_to_licenses')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LicenseDetailsPage;

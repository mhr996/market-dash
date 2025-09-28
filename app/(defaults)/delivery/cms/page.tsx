'use client';
import { DataTableSortStatus, DataTable } from 'mantine-datatable';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconBuilding from '@/components/icon/icon-building';
import IconEye from '@/components/icon/icon-eye';
import { sortBy } from 'lodash';

interface DeliveryCompany {
    id: number;
    company_name: string;
    logo_url: string | null;
    owner_name: string;
    created_at: string;
    delivery_methods?: Array<{
        id: number;
        label: string;
        delivery_time: string;
        price: number;
        is_active: boolean;
    }>;
}

const DeliveryCMSSelector = () => {
    const { t } = getTranslation();
    const router = useRouter();
    const [companies, setCompanies] = useState<DeliveryCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const PAGE_SIZES = [10, 20, 30, 50, 100];
    const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
    const [initialRecords, setInitialRecords] = useState<DeliveryCompany[]>([]);
    const [records, setRecords] = useState<DeliveryCompany[]>([]);
    const [search, setSearch] = useState('');
    const [sortStatus, setSortStatus] = useState<DataTableSortStatus>({
        columnAccessor: 'created_at',
        direction: 'desc',
    });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('delivery_companies')
                .select(
                    `
                    *,
                    delivery_methods(
                        id,
                        label,
                        delivery_time,
                        price,
                        is_active
                    )
                `,
                )
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCompanies(data || []);
        } catch (error) {
            console.error('Error fetching delivery companies:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize;
        setRecords([...initialRecords.slice(from, to)]);
    }, [page, pageSize, initialRecords]);

    useEffect(() => {
        let filteredItems = companies.filter((company) => {
            const matchesSearch = company.company_name.toLowerCase().includes(search.toLowerCase()) || company.owner_name.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });

        const sorted = sortBy(filteredItems, sortStatus.columnAccessor as keyof DeliveryCompany);
        const sortedItems = sortStatus.direction === 'desc' ? sorted.reverse() : sorted;
        setInitialRecords(sortedItems);
    }, [search, companies, sortStatus]);

    const handleCompanySelect = (companyId: number) => {
        router.push(`/delivery/cms/${companyId}`);
    };

    return (
        <div className="w-full max-w-none">
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <a href="/" className="text-primary hover:underline">
                        {t('home')}
                    </a>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Delivery</span>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>CMS</span>
                </li>
            </ul>
            <div className="panel mt-6 w-full max-w-none">
                <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Delivery Companies CMS</h5>
                    <div className="flex items-center gap-4">
                        <input type="text" className="form-input w-64" placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                </div>

                <div className="datatables">
                    <DataTable
                        className={`${loading ? 'pointer-events-none' : 'cursor-pointer'}`}
                        records={records}
                        onRowClick={(record) => {
                            router.push(`/delivery/cms/${record.id}`);
                        }}
                        columns={[
                            {
                                accessor: 'id',
                                title: 'ID',
                                sortable: true,
                                render: ({ id }) => <strong className="text-info">#{id}</strong>,
                            },
                            {
                                accessor: 'company_name',
                                title: 'Company Name',
                                sortable: true,
                                render: ({ company_name, logo_url }) => (
                                    <div className="flex items-center font-semibold">
                                        <div className="w-max rounded-full ltr:mr-2 rtl:ml-2 flex items-center justify-center">
                                            <img className="h-8 w-8 rounded-full object-cover" src={logo_url || `/assets/images/user-placeholder.webp`} alt="" />
                                        </div>
                                        <div>{company_name}</div>
                                    </div>
                                ),
                            },
                            {
                                accessor: 'owner_name',
                                title: 'Owner',
                                sortable: true,
                                render: ({ owner_name }) => <span>{owner_name}</span>,
                            },
                            {
                                accessor: 'created_at',
                                title: 'Registration Date',
                                sortable: true,
                                render: ({ created_at }) => (created_at ? <span>{new Date(created_at).toLocaleDateString('TR')}</span> : ''),
                            },
                            {
                                accessor: 'action',
                                title: 'Actions',
                                sortable: false,
                                textAlignment: 'center',
                                render: ({ id }) => (
                                    <div className="mx-auto flex w-max items-center gap-4">
                                        <button
                                            type="button"
                                            className="flex hover:text-primary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCompanySelect(id);
                                            }}
                                        >
                                            <IconBuilding className="h-4.5 w-4.5" />
                                        </button>
                                    </div>
                                ),
                            },
                        ]}
                        totalRecords={initialRecords.length}
                        recordsPerPage={pageSize}
                        page={page}
                        onPageChange={(p) => setPage(p)}
                        recordsPerPageOptions={PAGE_SIZES}
                        onRecordsPerPageChange={setPageSize}
                        sortStatus={sortStatus}
                        onSortStatusChange={setSortStatus}
                        paginationText={({ from, to, totalRecords }) => `${t('showing')} ${from} ${t('to')} ${to} ${t('of')} ${totalRecords} ${t('entries')}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default DeliveryCMSSelector;

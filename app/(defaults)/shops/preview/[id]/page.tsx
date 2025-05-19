'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconEdit from '@/components/icon/icon-edit';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconClock from '@/components/icon/icon-clock';
import IconCalendar from '@/components/icon/icon-calendar';
import IconUser from '@/components/icon/icon-user';
import IconMail from '@/components/icon/icon-mail';
import IconX from '@/components/icon/icon-x';
import 'leaflet/dist/leaflet.css';

// Import the map component dynamically with no SSR
const InteractiveMap = dynamic(() => import('@/components/map/interactive-map'), {
    ssr: false, // This will prevent the component from being rendered on the server
});

interface WorkHours {
    day: string;
    open: boolean;
    startTime: string;
    endTime: string;
}

interface Category {
    id: number;
    title: string;
    desc: string;
}

interface Shop {
    id: number;
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    cover_image_url: string | null;
    owner: string;
    status: string; // Shop status (Pending, Approved, etc.)
    public: boolean; // Controls if shop is public or private
    created_at?: string;
    address?: string;
    work_hours?: WorkHours[];
    phone_numbers?: string[];
    category_id?: number | null;
    gallery?: string[] | null;
    latitude?: number | null; // Geographical location data
    longitude?: number | null; // Geographical location data
    profiles?: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
        email?: string | null;
        phone?: string | null;
    };
    categories?: Category;
}

const ShopPreview = () => {
    // Fix: Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;

    const router = useRouter();
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'owner' | 'details'>('owner');
    const [categories, setCategories] = useState<Category[]>([]);
    const [unauthorized, setUnauthorized] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchShop = async () => {
            try {
                // Get current user
                const { data: userData, error: userError } = await supabase.auth.getUser();
                if (userError) throw userError;

                // Get user's role from profiles table
                const { data: profileData, error: profileError } = await supabase.from('profiles').select('role').eq('id', userData?.user?.id).single();

                if (profileError) throw profileError;

                const isAdmin = profileData?.role === 1;

                // Updated query to fetch category details as well
                const { data, error } = await supabase.from('shops').select('*, profiles(id, full_name, avatar_url, email, phone), categories(*)').eq('id', id).single();

                if (error) throw error;

                // Check if user has permission to view this shop
                if (!isAdmin && data.owner !== userData?.user?.id) {
                    setUnauthorized(true);
                    setLoading(false);
                    return;
                }

                setShop(data);

                // Also fetch all categories for reference
                const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('*').order('title', { ascending: true });

                if (categoriesError) throw categoriesError;
                setCategories(categoriesData || []);
            } catch (error) {
                console.error(error);
                setAlert({ visible: true, message: 'Error fetching shop details', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchShop();
        }
    }, [id]);

    const defaultWorkHours: WorkHours[] = [
        { day: 'Monday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Tuesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Wednesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Thursday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Friday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Saturday', open: false, startTime: '09:00', endTime: '18:00' },
        { day: 'Sunday', open: false, startTime: '09:00', endTime: '18:00' },
    ];

    const workHours = shop?.work_hours || defaultWorkHours;
    const phoneNumbers = shop?.phone_numbers || [''];
    const gallery = shop?.gallery || [];

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (unauthorized) {
        return (
            <div className="container mx-auto p-6">
                <div className="panel">
                    <div className="flex flex-col items-center justify-center p-6">
                        <div className="text-danger mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="40"
                                height="40"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Unauthorized Access</h2>
                        <p className="text-gray-500 mb-4">You do not have permission to view this shop.</p>
                        <button onClick={() => router.push('/shops')} className="btn btn-primary">
                            Return to Shops
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!shop) {
        return <div className="text-center p-6">Shop not found.</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 cursor-pointer text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <Link href={`/shops/edit/${shop.id}`} className="btn btn-primary flex items-center gap-2">
                    <IconEdit className="h-5 w-5" />
                    Edit Shop
                </Link>
            </div>

            {/* Breadcrumb Navigation */}
            <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        Home
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/shops" className="text-primary hover:underline">
                        Shops
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>{shop.shop_name}</span>
                </li>
            </ul>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Shop Header with Cover Image */}
            <div className="mb-6 rounded-md overflow-hidden">
                <div className="relative h-64 w-full">
                    <img src={shop.cover_image_url || '/assets/images/img-placeholder-fallback.webp'} alt={`${shop.shop_name} Cover`} className="h-full w-full object-cover" />
                    <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-6">
                        <div className="flex items-center">
                            <div className="h-24 w-24 rounded-lg border-4 border-white overflow-hidden bg-white mr-4">
                                <img src={shop.logo_url || '/assets/images/shop-placeholder.jpg'} alt={shop.shop_name} className="h-full w-full object-cover" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">{shop.shop_name}</h1>
                                <div className="flex gap-2 mt-1">
                                    <span className={`badge badge-outline-${shop.public ? 'success' : 'danger'}`}>{shop.public ? 'Public' : 'Private'}</span>
                                    <span className={`badge badge-outline-${shop.status === 'Pending' ? 'warning' : shop.status === 'Approved' ? 'success' : 'danger'}`}>
                                        {shop.status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="mb-5">
                <div className="flex border-b border-[#ebedf2] dark:border-[#191e3a]">
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'owner' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('owner')}
                    >
                        <div className="flex items-center gap-2">
                            <IconUser className="h-5 w-5" />
                            Owner Information
                        </div>
                    </button>
                    <button
                        type="button"
                        className={`p-4 border-b-2 ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent hover:border-gray-300'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        <div className="flex items-center gap-2">
                            <IconMapPin className="h-5 w-5" />
                            Shop Details
                        </div>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeTab === 'owner' && (
                    <>
                        {/* Owner Information */}
                        <div className="lg:col-span-1">
                            <div className="panel h-full">
                                <div className="mb-5 flex flex-col items-center text-center">
                                    <div className="mb-5 h-32 w-32 overflow-hidden rounded-full">
                                        <img src={shop.profiles?.avatar_url || '/assets/images/user-placeholder.webp'} alt={shop.profiles?.full_name} className="h-full w-full object-cover" />
                                    </div>
                                    <h5 className="text-xl font-bold text-primary">{shop.profiles?.full_name || 'N/A'}</h5>
                                    <p className="text-gray-500 dark:text-gray-400">Shop Owner</p>
                                </div>
                                <div className="space-y-4 border-t border-[#ebedf2] pt-5 dark:border-[#191e3a]">
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-light text-primary dark:bg-primary dark:text-white-light">
                                            <IconMail className="h-5 w-5" />
                                        </span>
                                        <div className="ltr:ml-3 rtl:mr-3">
                                            <h5 className="text-sm font-semibold dark:text-white-light">Email</h5>
                                            <p className="text-gray-500 dark:text-gray-400">{shop.profiles?.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-success-light text-success dark:bg-success dark:text-white-light">
                                            <IconPhone className="h-5 w-5" />
                                        </span>
                                        <div className="ltr:ml-3 rtl:mr-3">
                                            <h5 className="text-sm font-semibold dark:text-white-light">Phone</h5>
                                            <p className="text-gray-500 dark:text-gray-400">{shop.profiles?.phone || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-warning-light text-warning dark:bg-warning dark:text-white-light">
                                            <IconCalendar className="h-5 w-5" />
                                        </span>
                                        <div className="ltr:ml-3 rtl:mr-3">
                                            <h5 className="text-sm font-semibold dark:text-white-light">Registration Date</h5>
                                            <p className="text-gray-500 dark:text-gray-400">{shop.created_at ? new Date(shop.created_at).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shop Summary */}
                        <div className="lg:col-span-2">
                            <div className="panel h-full">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">Shop Summary</h5>
                                    <p className="mt-2 text-gray-500 dark:text-gray-400">{shop.shop_desc || 'No description available.'}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mt-8">
                                    <div>
                                        <h6 className="text-sm font-semibold mb-2">Category</h6>
                                        <span className="badge bg-primary text-white">{shop.categories?.title || 'Uncategorized'}</span>
                                    </div>
                                    <div>
                                        <h6 className="text-sm font-semibold mb-2">Visibility</h6>
                                        <span className={`badge ${shop.public ? 'bg-success' : 'bg-danger'} text-white`}>{shop.public ? 'Public' : 'Private'}</span>
                                    </div>
                                    {shop.address && (
                                        <div className="sm:col-span-2">
                                            <h6 className="text-sm font-semibold mb-2">Address</h6>
                                            <div className="flex">
                                                <span className="mt-1 ltr:mr-2 rtl:ml-2 text-primary">
                                                    <IconMapPin className="h-5 w-5" />
                                                </span>
                                                <p className="text-gray-500 dark:text-gray-400">{shop.address}</p>
                                            </div>
                                        </div>
                                    )}
                                    {phoneNumbers && phoneNumbers.length > 0 && phoneNumbers[0] && (
                                        <div className="sm:col-span-2">
                                            <h6 className="text-sm font-semibold mb-2">Contact Numbers</h6>
                                            <div className="space-y-2">
                                                {phoneNumbers.map(
                                                    (phone, index) =>
                                                        phone && (
                                                            <div key={index} className="flex">
                                                                <span className="mt-1 ltr:mr-2 rtl:ml-2 text-success">
                                                                    <IconPhone className="h-5 w-5" />
                                                                </span>
                                                                <p className="text-gray-500 dark:text-gray-400">{phone}</p>
                                                            </div>
                                                        ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'details' && (
                    <>
                        {/* Shop Details */}
                        <div className="lg:col-span-2">
                            <div className="panel h-full">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">Shop Details</h5>
                                </div>

                                <div className="grid grid-cols-1 gap-5">
                                    {' '}
                                    {/* Address */}
                                    <div>
                                        <h6 className="text-sm font-semibold mb-3">Address</h6>
                                        <div className="flex">
                                            <span className="mt-1 ltr:mr-2 rtl:ml-2 text-primary">
                                                <IconMapPin className="h-5 w-5" />
                                            </span>
                                            <p className="text-gray-500 dark:text-gray-400">{shop.address || 'No address provided'}</p>
                                        </div>
                                    </div>
                                    {/* Map Location */}
                                    {shop.latitude && shop.longitude && (
                                        <div>
                                            <h6 className="text-sm font-semibold mb-3">Shop Location</h6>
                                            <div className="h-[400px] rounded-md overflow-hidden">
                                                <InteractiveMap position={[shop.latitude, shop.longitude]} height="400px" shopName={shop.shop_name} shopAddress={shop.address} />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">
                                                Coordinates: {shop.latitude.toFixed(6)}, {shop.longitude.toFixed(6)}
                                            </p>
                                        </div>
                                    )}
                                    {/* Contact Numbers */}
                                    <div>
                                        <h6 className="text-sm font-semibold mb-3">Contact Numbers</h6>
                                        <div className="space-y-2">
                                            {phoneNumbers && phoneNumbers.length > 0 && phoneNumbers[0] ? (
                                                phoneNumbers.map(
                                                    (phone, index) =>
                                                        phone && (
                                                            <div key={index} className="flex">
                                                                <span className="mt-1 ltr:mr-2 rtl:ml-2 text-success">
                                                                    <IconPhone className="h-5 w-5" />
                                                                </span>
                                                                <p className="text-gray-500 dark:text-gray-400">{phone}</p>
                                                            </div>
                                                        ),
                                                )
                                            ) : (
                                                <p className="text-gray-500 dark:text-gray-400">No contact numbers available</p>
                                            )}
                                        </div>
                                    </div>
                                    {/* Category */}
                                    <div>
                                        <h6 className="text-sm font-semibold mb-3">Category</h6>
                                        <div className="flex">
                                            <span className="badge bg-primary text-white">{shop.categories?.title || 'Uncategorized'}</span>
                                            {shop.categories?.desc && <p className="ml-3 text-gray-500 dark:text-gray-400">{shop.categories.desc}</p>}
                                        </div>
                                    </div>
                                    {/* Working Hours */}
                                    <div>
                                        <h6 className="text-sm font-semibold mb-3">Working Hours</h6>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {workHours.map((day) => (
                                                    <div key={day.day} className={`p-3 rounded-md border ${day.open ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10'}`}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h6 className="font-semibold">{day.day}</h6>
                                                            <span className={`badge ${day.open ? 'bg-success' : 'bg-danger'} text-white text-xs`}>{day.open ? 'Open' : 'Closed'}</span>
                                                        </div>
                                                        {day.open && (
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                {day.startTime} - {day.endTime}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Gallery */}
                                    {gallery && gallery.length > 0 && (
                                        <div>
                                            <h6 className="text-sm font-semibold mb-3">Shop Gallery</h6>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                                {gallery.map((image, index) => (
                                                    <div key={index} className="aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                                                        <img src={image} alt={`Shop Gallery Image ${index + 1}`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Shop Stats */}
                        <div className="lg:col-span-1">
                            <div className="panel h-full">
                                <div className="mb-5">
                                    <h5 className="text-lg font-semibold dark:text-white-light">Shop Stats</h5>
                                </div>

                                <div className="space-y-6">
                                    {/* Products Count */}
                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light flex items-center justify-center">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path
                                                        d="M6.17071 16.7071C5.41775 16.7071 4.80103 16.0904 4.80103 15.3374C4.80103 14.5845 5.41775 13.9678 6.17071 13.9678C6.92366 13.9678 7.54038 14.5845 7.54038 15.3374C7.54038 16.0904 6.92366 16.7071 6.17071 16.7071Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path
                                                        d="M6.17071 10.0322C5.41775 10.0322 4.80103 9.41543 4.80103 8.66248C4.80103 7.90953 5.41775 7.29281 6.17071 7.29281C6.92366 7.29281 7.54038 7.90953 7.54038 8.66248C7.54038 9.41543 6.92366 10.0322 6.17071 10.0322Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path opacity="0.5" d="M9 5H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path opacity="0.5" d="M9 9H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path opacity="0.5" d="M9 15H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path opacity="0.5" d="M9 19H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path
                                                        d="M6.17071 19.4465C5.41775 19.4465 4.80103 18.8297 4.80103 18.0768C4.80103 17.3238 5.41775 16.7071 6.17071 16.7071C6.92366 16.7071 7.54038 17.3238 7.54038 18.0768C7.54038 18.8297 6.92366 19.4465 6.17071 19.4465Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path
                                                        d="M6.17071 6.70712C5.41775 6.70712 4.80103 6.0904 4.80103 5.33745C4.80103 4.5845 5.41775 3.96777 6.17071 3.96777C6.92366 3.96777 7.54038 4.5845 7.54038 5.33745C7.54038 6.0904 6.92366 6.70712 6.17071 6.70712Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                </svg>
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">Products</h6>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-3xl font-bold dark:text-white-light">24</p>
                                            <span className="badge bg-success/20 text-success dark:bg-success dark:text-white-light">+3 New</span>
                                        </div>
                                    </div>

                                    {/* Orders Count */}
                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-warning-light dark:bg-warning text-warning dark:text-warning-light flex items-center justify-center">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
                                                    <path
                                                        d="M2 3L2.26491 3.0883C3.58495 3.52832 4.24497 3.74832 4.62248 4.2721C5 4.79587 5 5.49159 5 6.88304V9.5C5 12.3284 5 13.7426 5.87868 14.6213C6.75736 15.5 8.17157 15.5 11 15.5H19"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                    />
                                                    <path
                                                        opacity="0.5"
                                                        d="M7.5 18C8.32843 18 9 18.6716 9 19.5C9 20.3284 8.32843 21 7.5 21C6.67157 21 6 20.3284 6 19.5C6 18.6716 6.67157 18 7.5 18Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path
                                                        opacity="0.5"
                                                        d="M16.5 18.0001C17.3284 18.0001 18 18.6716 18 19.5001C18 20.3285 17.3284 21.0001 16.5 21.0001C15.6716 21.0001 15 20.3285 15 19.5001C15 18.6716 15.6716 18.0001 16.5 18.0001Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <path opacity="0.5" d="M11 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path
                                                        d="M5 6H16.4504C18.5054 6 19.5328 6 19.9775 6.67426C20.4221 7.34853 20.0173 8.29294 19.2078 10.1818L18.7792 11.1818C18.4013 12.0636 18.2123 12.5045 17.8366 12.7523C17.4609 13 16.9812 13 16.0218 13H5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                </svg>
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">Orders</h6>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-3xl font-bold dark:text-white-light">45</p>
                                            <span className="badge bg-success/20 text-success dark:bg-success dark:text-white-light">+5 New</span>
                                        </div>
                                    </div>

                                    {/* Revenue */}
                                    <div>
                                        <div className="flex items-center mb-3">
                                            <div className="h-9 w-9 rounded-md bg-success-light dark:bg-success text-success dark:text-success-light flex items-center justify-center">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                                                    <path d="M12 6V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                                    <path
                                                        d="M15 9.5C15 8.11929 13.6569 7 12 7C10.3431 7 9 8.11929 9 9.5C9 10.8807 10.3431 12 12 12C13.6569 12 15 13.1193 15 14.5C15 15.8807 13.6569 17 12 17C10.3431 17 9 15.8807 9 14.5"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                            </div>
                                            <h6 className="text-sm font-semibold ltr:ml-3 rtl:mr-3">Revenue</h6>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-3xl font-bold dark:text-white-light">$2,450</p>
                                            <span className="badge bg-success/20 text-success dark:bg-success dark:text-white-light">+2.5%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ShopPreview;

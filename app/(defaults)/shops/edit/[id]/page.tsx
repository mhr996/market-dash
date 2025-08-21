'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImprovedImageUpload from '@/components/image-upload/improved-image-upload';
import StorageManager from '@/utils/storage-manager';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconClock from '@/components/icon/icon-clock';
import IconCalendar from '@/components/icon/icon-calendar';
import IconPlus from '@/components/icon/icon-plus';
import IconMinus from '@/components/icon/icon-minus';
import IconX from '@/components/icon/icon-x';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUpload from '@/components/icon/icon-camera';
import AnimateHeight from 'react-animate-height';
import Tabs from '@/components/tabs';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import { getTranslation } from '@/i18n';

// Import the map component dynamically with no SSR
const MapSelector = dynamic(() => import('@/components/map/map-selector'), {
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
    created_at: string;
    owner: string; // This is a UUID string
    shop_name: string;
    shop_desc: string;
    logo_url: string | null;
    cover_image_url: string | null;
    public: boolean;
    status: string;
    statusDropdownOpen?: boolean;
    address?: string;
    work_hours?: WorkHours[];
    phone_numbers?: string[];
    category_id?: number | null;
    gallery?: string[];
    latitude?: number | null;
    longitude?: number | null;
    profiles?: {
        full_name: string;
        email?: string;
    };
}

const EditShop = () => {
    // Fix: Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;

    const router = useRouter();
    const { t } = getTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [searchCategoryTerm, setSearchCategoryTerm] = useState('');
    const categoryRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);

    const [form, setForm] = useState<Shop>({
        id: 0,
        shop_name: '',
        shop_desc: '',
        logo_url: null,
        cover_image_url: null,
        owner: '',
        public: true,
        status: 'Approved',
        created_at: '',
        address: '',
        phone_numbers: [''],
        category_id: null,
        gallery: [],
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    // Set up default work hours if none exist
    const defaultWorkHours: WorkHours[] = [
        { day: 'Monday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Tuesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Wednesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Thursday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Friday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Saturday', open: false, startTime: '10:00', endTime: '16:00' },
        { day: 'Sunday', open: false, startTime: '10:00', endTime: '16:00' },
    ];
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
                setForm((prev) => ({ ...prev, statusDropdownOpen: false }));
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch shop data and categories
    const fetchShopData = async () => {
        try {
            // Fetch shop data
            const { data, error } = await supabase.from('shops').select('*, profiles(full_name, email)').eq('id', id).single();
            if (error) throw error;

            // If work_hours is not set, initialize with default work hours
            if (!data.work_hours) {
                data.work_hours = defaultWorkHours;
            }

            // If phone_numbers is not set, initialize with an empty array
            if (!data.phone_numbers) {
                data.phone_numbers = [''];
            }

            // If gallery is not set, initialize with an empty array
            if (!data.gallery) {
                data.gallery = [];
            }

            setForm(data);

            // Fetch categories
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

    useEffect(() => {
        if (id) {
            fetchShopData();
        }
    }, [id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleWorkHoursChange = (index: number, field: keyof WorkHours, value: string | boolean) => {
        setForm((prev) => {
            const updatedWorkHours = [...(prev.work_hours || defaultWorkHours)];
            updatedWorkHours[index] = {
                ...updatedWorkHours[index],
                [field]: value,
                // Reset times to default if closed
                ...(field === 'open' &&
                    value === false && {
                        startTime: '09:00',
                        endTime: '18:00',
                    }),
            };
            return { ...prev, work_hours: updatedWorkHours };
        });
    };

    const handlePhoneChange = (index: number, value: string) => {
        setForm((prev) => {
            const updatedPhones = [...(prev.phone_numbers || [''])];
            updatedPhones[index] = value;
            return { ...prev, phone_numbers: updatedPhones };
        });
    };

    const addPhoneNumber = () => {
        if ((form.phone_numbers?.length || 0) < 3) {
            setForm((prev) => ({
                ...prev,
                phone_numbers: [...(prev.phone_numbers || []), ''],
            }));
        }
    };

    const removePhoneNumber = (index: number) => {
        if ((form.phone_numbers?.length || 0) > 1) {
            setForm((prev) => {
                const updatedPhones = [...(prev.phone_numbers || [])];
                updatedPhones.splice(index, 1);
                return { ...prev, phone_numbers: updatedPhones };
            });
        }
    };

    // New image upload handlers for improved system
    const handleLogoUpload = (url: string) => {
        setForm((prev) => ({
            ...prev,
            logo_url: url,
        }));
    };

    const handleCoverUpload = (url: string) => {
        setForm((prev) => ({
            ...prev,
            cover_image_url: url,
        }));
    };

    const handleGalleryUpload = (urls: string | string[]) => {
        const urlArray = Array.isArray(urls) ? urls : [urls];
        setForm((prev) => ({
            ...prev,
            gallery: urlArray,
        }));
    };

    const handleGalleryError = (error: string) => {
        setAlert({ visible: true, message: error, type: 'danger' });
    };

    const removeGalleryImage = async (index: number) => {
        if (!form.gallery || form.gallery.length === 0) return;

        try {
            const imageUrl = form.gallery[index];

            // Remove from storage using the improved storage manager
            await StorageManager.removeShopGalleryImage(parseInt(id as string), imageUrl);

            // Update form state
            const updatedGallery = [...form.gallery];
            updatedGallery.splice(index, 1);

            setForm((prev) => ({
                ...prev,
                gallery: updatedGallery,
            }));

            // Update database
            await supabase.from('shops').update({ gallery: updatedGallery }).eq('id', id);
        } catch (error) {
            console.error('Error removing gallery image:', error);
            setAlert({ visible: true, message: 'Error removing image', type: 'danger' });
        }
    };

    const filteredCategories = categories.filter((category) => category.title.toLowerCase().includes(searchCategoryTerm.toLowerCase()));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Validate required fields
            if (!form.shop_name) {
                throw new Error('Shop name is required');
            }

            // Create update payload with all fields
            const updatePayload = {
                shop_name: form.shop_name,
                shop_desc: form.shop_desc,
                logo_url: form.logo_url,
                cover_image_url: form.cover_image_url,
                public: form.public,
                status: form.status,
                address: form.address,
                work_hours: form.work_hours || defaultWorkHours,
                phone_numbers: form.phone_numbers?.filter((phone) => phone.trim() !== '') || [],
                category_id: form.category_id,
                gallery: form.gallery,
                latitude: form.latitude,
                longitude: form.longitude,
            };

            // Update the shop data in Supabase
            const { error } = await supabase.from('shops').update(updatePayload).eq('id', id);

            if (error) throw error;

            // Fetch the updated shop data to confirm changes
            const { data: updatedShop, error: fetchError } = await supabase.from('shops').select('*, profiles(full_name, email)').eq('id', id).single();

            if (fetchError) throw fetchError;

            // Update the form with the fetched data
            setForm(updatedShop);
            setAlert({ visible: true, message: 'Shop updated successfully!', type: 'success' });

            // Scroll to top to show alert
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error(error);
            setAlert({
                visible: true,
                message: error instanceof Error ? error.message : 'Error updating shop',
                type: 'danger',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                {' '}
                <div className="flex items-center gap-5">
                    {' '}
                    <button onClick={() => router.back()} className="hover:text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <ul className="flex space-x-2 rtl:space-x-reverse items-center">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/shops" className="text-primary hover:underline">
                                {t('shops')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span className="text-black dark:text-white-dark">
                                {t('edit')} {form.shop_name}
                            </span>
                        </li>
                    </ul>
                </div>
            </div>{' '}
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}
            {/* Edit Form */}
            <form onSubmit={handleSubmit}>
                {/* Cover Image */}
                <div className="panel mb-5 overflow-hidden">
                    {' '}
                    <div className="relative h-52 w-full">
                        <img src={form.cover_image_url || '/assets/images/img-placeholder-fallback.webp'} alt={t('shop_cover_image')} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-white mb-4">{t('shop_cover_image')}</h2>
                                <ImprovedImageUpload
                                    type="shop-cover"
                                    shopId={parseInt(id as string)}
                                    currentUrl={form.cover_image_url}
                                    onUploadComplete={async (url) => {
                                        if (typeof url === 'string') {
                                            // Update form state
                                            setForm((prev) => ({ ...prev, cover_image_url: url }));

                                            // Update database immediately
                                            try {
                                                const { error } = await supabase.from('shops').update({ cover_image_url: url }).eq('id', id);

                                                if (error) throw error;

                                                setAlert({
                                                    visible: true,
                                                    type: 'success',
                                                    message: t('cover_image_updated_successfully'),
                                                });
                                            } catch (error) {
                                                console.error('Error updating cover image in database:', error);
                                                setAlert({
                                                    visible: true,
                                                    type: 'danger',
                                                    message: t('error_updating_cover_image'),
                                                });
                                            }
                                        }
                                    }}
                                    onError={(error) => {
                                        setAlert({
                                            visible: true,
                                            type: 'danger',
                                            message: error,
                                        });
                                    }}
                                    buttonLabel={t('change_cover')}
                                />
                            </div>
                        </div>
                    </div>
                </div>{' '}
                <div className="mb-6">
                    <Tabs
                        tabs={[
                            { name: t('basic_info'), icon: 'store' },
                            { name: t('shop_details'), icon: 'map-pin' },
                            { name: t('working_hours'), icon: 'clock' },
                            { name: t('gallery'), icon: 'image' },
                        ]}
                        onTabClick={(tab) => setActiveTab(tab)}
                        activeTab={activeTab}
                    />
                </div>
                {activeTab === 0 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('basic_information')}</h5>
                        </div>
                        <div className="flex flex-col sm:flex-row">
                            <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                                <label className="mb-2 block text-sm font-semibold">{t('shop_logo')}</label>
                                <ImprovedImageUpload
                                    type="shop-logo"
                                    shopId={parseInt(id as string)}
                                    currentUrl={form.logo_url}
                                    onUploadComplete={async (url) => {
                                        if (typeof url === 'string') {
                                            // Update form state
                                            setForm((prev) => ({ ...prev, logo_url: url }));

                                            // Update database immediately
                                            try {
                                                const { error } = await supabase.from('shops').update({ logo_url: url }).eq('id', id);

                                                if (error) throw error;

                                                setAlert({
                                                    visible: true,
                                                    type: 'success',
                                                    message: t('logo_updated_successfully'),
                                                });
                                            } catch (error) {
                                                console.error('Error updating logo in database:', error);
                                                setAlert({
                                                    visible: true,
                                                    type: 'danger',
                                                    message: t('error_updating_logo'),
                                                });
                                            }
                                        }
                                    }}
                                    onError={(error) => {
                                        setAlert({
                                            visible: true,
                                            type: 'danger',
                                            message: error,
                                        });
                                    }}
                                />
                            </div>{' '}
                            <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="shop_name" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                        {t('shop_name')} <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="shop_name" name="shop_name" className="form-input" value={form.shop_name} onChange={handleInputChange} required />
                                </div>
                                <div>
                                    <label htmlFor="owner" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                        {t('shop_owner')}
                                    </label>
                                    <input type="text" id="owner" className="form-input bg-[#eee] dark:bg-[#1b2e4b]" value={form.profiles?.full_name || form.owner} disabled />
                                </div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="shop_desc" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                        {t('shop_description')}
                                    </label>
                                    <textarea id="shop_desc" name="shop_desc" className="form-textarea min-h-[100px]" value={form.shop_desc} onChange={handleInputChange} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-white ">{t('visibility')}</label>
                                    <label className="inline-flex cursor-pointer items-center">
                                        <input type="checkbox" name="public" className="form-checkbox" checked={form.public} onChange={handleInputChange} />
                                        <span className="relative text-white-dark checked:bg-none ml-2">{form.public ? t('public') : t('private')}</span>
                                    </label>
                                </div>{' '}
                                <div className="relative" ref={statusRef}>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-white">{t('status')}</label>{' '}
                                    <div
                                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                        onClick={() => {
                                            setForm((prev) => ({ ...prev, statusDropdownOpen: !prev.statusDropdownOpen }));
                                        }}
                                    >
                                        <span>{t(form.status?.toLowerCase())}</span>
                                        <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${form.statusDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>{' '}
                                    {form.statusDropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                            <div className="max-h-64 overflow-y-auto">
                                                {['Approved', 'Pending', 'Rejected', 'Banned'].map((status) => (
                                                    <div
                                                        key={status}
                                                        className={`cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a] ${
                                                            form.status === status ? 'bg-primary/10 dark:bg-primary/10' : ''
                                                        }`}
                                                        onClick={() => {
                                                            setForm((prev) => ({ ...prev, status: status, statusDropdownOpen: false }));
                                                        }}
                                                    >
                                                        {t(status.toLowerCase())}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>{' '}
                                <div ref={categoryRef} className="relative">
                                    <label htmlFor="category_id" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                        {t('category')}
                                    </label>
                                    <div
                                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    >
                                        <span>{form.category_id ? categories.find((c) => c.id === form.category_id)?.title || t('select_category') : t('select_category')}</span>
                                        <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>{' '}
                                    {isCategoryDropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    className="w-full rounded border border-[#e0e6ed] p-2 focus:border-primary focus:outline-none dark:border-[#191e3a] dark:bg-black dark:text-white-dark"
                                                    placeholder={t('search_categories')}
                                                    value={searchCategoryTerm}
                                                    onChange={(e) => setSearchCategoryTerm(e.target.value)}
                                                />
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {filteredCategories.map((category) => (
                                                    <div
                                                        key={category.id}
                                                        className={`cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a] ${
                                                            form.category_id === category.id ? 'bg-primary/10 dark:bg-primary/10' : ''
                                                        }`}
                                                        onClick={() => {
                                                            setForm((prev) => ({ ...prev, category_id: category.id }));
                                                            setIsCategoryDropdownOpen(false);
                                                        }}
                                                    >
                                                        {category.title}
                                                    </div>
                                                ))}
                                                {filteredCategories.length === 0 && <div className="px-4 py-2 text-gray-500 dark:text-gray-400">No categories found</div>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 1 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">Shop Details</h5>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="address" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    Address
                                </label>
                                <div className="flex items-center">
                                    <span className="mt-1 ltr:mr-2 rtl:ml-2 text-primary">
                                        <IconMapPin className="h-5 w-5" />
                                    </span>
                                    <textarea
                                        id="address"
                                        name="address"
                                        className="form-textarea flex-1"
                                        value={form.address}
                                        onChange={handleInputChange}
                                        placeholder="Enter shop address"
                                        rows={2}
                                    />
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">Shop Location</label>{' '}
                                <div className="h-[400px] mb-4">
                                    {' '}
                                    <MapSelector
                                        initialPosition={form.latitude && form.longitude ? [form.latitude, form.longitude] : null}
                                        onChange={(lat, lng) => {
                                            setForm((prev) => ({
                                                ...prev,
                                                latitude: lat,
                                                longitude: lng,
                                            }));
                                        }}
                                        height="400px"
                                        useCurrentLocationByDefault={false}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Click on the map to select your shop's location.</p>
                                {form.latitude && form.longitude && (
                                    <p className="text-sm mt-10">
                                        Selected coordinates:{' '}
                                        <span className="font-semibold">
                                            {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                                        </span>
                                    </p>
                                )}
                            </div>

                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">Phone Numbers (Up to 3)</label>
                                <div className="space-y-3">
                                    {form.phone_numbers?.map((phone, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <span className="mt-1 ltr:mr-2 rtl:ml-2 text-success">
                                                <IconPhone className="h-5 w-5" />
                                            </span>
                                            <input type="tel" className="form-input flex-1" placeholder="Enter phone number" value={phone} onChange={(e) => handlePhoneChange(index, e.target.value)} />
                                            {index > 0 && (
                                                <button type="button" className="hover:text-danger" onClick={() => removePhoneNumber(index)}>
                                                    <IconX className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {(form.phone_numbers?.length || 0) < 3 && (
                                        <button type="button" className="btn btn-outline-primary btn-sm mt-2" onClick={addPhoneNumber}>
                                            <IconPlus className="h-4 w-4 mr-2" />
                                            Add Phone Number
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 2 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">Working Hours</h5>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Set your shop's working hours for each day of the week</p>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {(form.work_hours || defaultWorkHours).map((day, index) => (
                                <div key={day.day} className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center">
                                            <h6 className="text-lg font-semibold min-w-[100px]">{day.day}</h6>
                                            <label className="inline-flex cursor-pointer">
                                                <input type="checkbox" className="form-checkbox" checked={day.open} onChange={(e) => handleWorkHoursChange(index, 'open', e.target.checked)} />
                                                <span className="relative text-white-dark checked:bg-none ml-2">{day.open ? 'Open' : 'Closed'}</span>
                                            </label>
                                        </div>

                                        <AnimateHeight duration={300} height={day.open ? 'auto' : 0}>
                                            <div className={`flex flex-wrap items-center gap-4 ${day.open ? 'mt-4 sm:mt-0' : ''}`}>
                                                <div className="flex items-center">
                                                    <span className="text-blue-500 mr-2">From:</span>
                                                    <input
                                                        type="time"
                                                        className="form-input w-auto"
                                                        value={day.startTime}
                                                        onChange={(e) => handleWorkHoursChange(index, 'startTime', e.target.value)}
                                                        disabled={!day.open}
                                                    />
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mr-2">To:</span>
                                                    <input
                                                        type="time"
                                                        className="form-input w-auto"
                                                        value={day.endTime}
                                                        onChange={(e) => handleWorkHoursChange(index, 'endTime', e.target.value)}
                                                        disabled={!day.open}
                                                    />
                                                </div>
                                            </div>
                                        </AnimateHeight>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 3 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">Shop Gallery</h5>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Upload images for your shop gallery</p>
                        </div>

                        <ImprovedImageUpload
                            type="shop-gallery"
                            shopId={parseInt(id as string)}
                            currentUrls={form.gallery || []}
                            onUploadComplete={handleGalleryUpload}
                            onError={handleGalleryError}
                            maxFiles={10}
                            buttonLabel="Add Gallery Image"
                            className="mb-5"
                        />
                    </div>
                )}
                <div className="flex justify-end gap-4">
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.back()}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditShop;

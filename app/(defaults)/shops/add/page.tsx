'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImprovedImageUpload from '@/components/image-upload/improved-image-upload';
import StorageManager from '@/utils/storage-manager';
import IconX from '@/components/icon/icon-x';
import IconPhone from '@/components/icon/icon-phone';
import IconMapPin from '@/components/icon/icon-map-pin';
import IconClock from '@/components/icon/icon-clock';
import IconPlus from '@/components/icon/icon-plus';
import IconMinus from '@/components/icon/icon-minus';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUpload from '@/components/icon/icon-camera';
import AnimateHeight from 'react-animate-height';
import Tabs from '@/components/tabs';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { getTranslation } from '@/i18n';

// Import the map component dynamically with no SSR
const MapSelector = dynamic(() => import('@/components/map/map-selector'), {
    ssr: false, // This will prevent the component from being rendered on the server
});

interface Profile {
    id: string;
    full_name: string;
    avatar_url?: string;
}

interface Category {
    id: number;
    title: string;
    desc: string;
}

interface DeliveryCompany {
    id: number;
    company_name: string;
}

interface WorkHours {
    day: string;
    open: boolean;
    startTime: string;
    endTime: string;
}

const AddShopPage = () => {
    const router = useRouter();
    const { t } = getTranslation();
    const [form, setForm] = useState({
        shop_name: '',
        shop_desc: '',
        logo_url: '',
        cover_image_url: '',
        owner: '',
        public: true, // Renamed from active to public - controls shop visibility
        status: 'Approved',
        statusDropdownOpen: false, // Track if status dropdown is open
        address: '',
        work_hours: null as WorkHours[] | null,
        phone_numbers: [''],
        category_id: null as number | null,
        delivery_companies_id: null as number | null,
        gallery: [] as string[],
        latitude: null as number | null, // Shop location coordinates
        longitude: null as number | null, // Shop location coordinates
    });

    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<Profile[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // Temporary file storage for logo and cover before shop creation
    const [tempLogoFile, setTempLogoFile] = useState<File | null>(null);
    const [tempCoverFile, setTempCoverFile] = useState<File | null>(null);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [searchCategoryTerm, setSearchCategoryTerm] = useState('');

    // Delivery company states
    const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([]);
    const [isDeliveryCompanyDropdownOpen, setIsDeliveryCompanyDropdownOpen] = useState(false);
    const [searchDeliveryCompanyTerm, setSearchDeliveryCompanyTerm] = useState('');
    const deliveryCompanyRef = useRef<HTMLDivElement>(null);

    // Pricing states
    const [deliveryPrices, setDeliveryPrices] = useState<{
        express_price: number;
        fast_price: number;
        standard_price: number;
    } | null>(null);
    const [locationPrices, setLocationPrices] = useState<any[]>([]);
    const [newLocationPrice, setNewLocationPrice] = useState({
        location: '',
        express_price: '',
        fast_price: '',
        standard_price: '',
    }); // Define default work hours in a useEffect to make it reactive to language changes
    useEffect(() => {
        // Create default work hours with current language translations
        const defaultWorkHours: WorkHours[] = [
            { day: t('monday'), open: true, startTime: '09:00', endTime: '18:00' },
            { day: t('tuesday'), open: true, startTime: '09:00', endTime: '18:00' },
            { day: t('wednesday'), open: true, startTime: '09:00', endTime: '18:00' },
            { day: t('thursday'), open: true, startTime: '09:00', endTime: '18:00' },
            { day: t('friday'), open: true, startTime: '09:00', endTime: '18:00' },
            { day: t('saturday'), open: false, startTime: '10:00', endTime: '16:00' },
            { day: t('sunday'), open: false, startTime: '10:00', endTime: '16:00' },
        ];

        // If work_hours is null, initialize with default hours
        if (form.work_hours === null) {
            setForm((prev) => ({
                ...prev,
                work_hours: defaultWorkHours,
            }));
        } else {
            // If work_hours already exists, update only the day names with current translations
            setForm((prev) => ({
                ...prev,
                work_hours: prev.work_hours
                    ? prev.work_hours.map((workHour, index) => ({
                          ...workHour,
                          day: defaultWorkHours[index].day, // Update day with current translation
                      }))
                    : null,
            }));
        }
    }, []); // Re-run when the translation function changes (language changes)

    // Cleanup blob URLs on component unmount
    useEffect(() => {
        return () => {
            if (form.logo_url && form.logo_url.startsWith('blob:')) {
                URL.revokeObjectURL(form.logo_url);
            }
            if (form.cover_image_url && form.cover_image_url.startsWith('blob:')) {
                URL.revokeObjectURL(form.cover_image_url);
            }
        };
    }, [form.logo_url, form.cover_image_url]);

    // Fetch current user, all users, and categories
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get current user
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (user) {
                    setForm((prev) => ({ ...prev, owner: user.id }));
                }

                // Fetch all users
                const { data: profiles, error } = await supabase.from('profiles').select('id, full_name, avatar_url');

                if (error) throw error;
                setUsers(profiles || []);
                setFilteredUsers(profiles || []);

                // Fetch all categories
                const { data: categoriesData, error: categoriesError } = await supabase.from('categories').select('*').order('title', { ascending: true });

                if (categoriesError) throw categoriesError;
                setCategories(categoriesData || []);

                // Fetch delivery companies
                const { data: deliveryCompaniesData, error: deliveryCompaniesError } = await supabase.from('delivery_companies').select('id, company_name').order('company_name', { ascending: true });

                if (deliveryCompaniesError) throw deliveryCompaniesError;
                setDeliveryCompanies(deliveryCompaniesData || []);
            } catch (error) {
                // Error fetching data
            }
        };
        fetchData();
    }, []);

    // Filter users based on search term
    useEffect(() => {
        const filtered = users.filter((user) => user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()));
        setFilteredUsers(filtered);
    }, [searchTerm, users]); // Handle click outside for user dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
            if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
                setForm((prev) => ({ ...prev, statusDropdownOpen: false }));
            }
            if (deliveryCompanyRef.current && !deliveryCompanyRef.current.contains(event.target as Node)) {
                setIsDeliveryCompanyDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    // Pricing handlers
    const handlePricingChange = (field: string, value: string) => {
        setDeliveryPrices((prev) => ({
            express_price: prev?.express_price || 0,
            fast_price: prev?.fast_price || 0,
            standard_price: prev?.standard_price || 0,
            [field]: parseFloat(value) || 0,
        }));
    };

    const handleLocationPriceChange = (id: number, field: string, value: string) => {
        setLocationPrices((prev) => prev.map((price) => (price.id === id ? { ...price, [field]: value } : price)));
    };

    const addLocationPrice = () => {
        if (newLocationPrice.location.trim()) {
            const newPrice = {
                id: Date.now(), // Temporary ID
                delivery_location: newLocationPrice.location,
                express_price: parseFloat(newLocationPrice.express_price) || 0,
                fast_price: parseFloat(newLocationPrice.fast_price) || 0,
                standard_price: parseFloat(newLocationPrice.standard_price) || 0,
            };
            setLocationPrices((prev) => [...prev, newPrice]);
            setNewLocationPrice({
                location: '',
                express_price: '',
                fast_price: '',
                standard_price: '',
            });
        }
    };

    const removeLocationPrice = (id: number) => {
        setLocationPrices((prev) => prev.filter((price) => price.id !== id));
    };

    // Fetch pricing data when delivery company is selected
    const fetchPricingData = async (deliveryCompanyId: number) => {
        try {
            // Fetch delivery pricing data
            const { data: pricingData, error: pricingError } = await supabase
                .from('delivery_prices')
                .select('express_price, fast_price, standard_price')
                .eq('delivery_companies_id', deliveryCompanyId)
                .single();

            if (!pricingError && pricingData) {
                setDeliveryPrices(pricingData);
            } else {
                // Set default values if no pricing exists
                setDeliveryPrices({
                    express_price: 0,
                    fast_price: 0,
                    standard_price: 0,
                });
            }

            // Fetch location-based pricing
            const { data: locationPricesData, error: locationPricesError } = await supabase
                .from('delivery_location_prices')
                .select('id, delivery_location, express_price, fast_price, standard_price')
                .eq('delivery_companies_id', deliveryCompanyId)
                .order('delivery_location', { ascending: true });

            if (!locationPricesError) {
                setLocationPrices(locationPricesData || []);
            }
        } catch (error) {
            // Error fetching pricing data
        }
    };

    // Handle temporary file storage for logo and cover
    const handleTempLogoUpload = (file: File) => {
        setTempLogoFile(file);
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setForm((prev) => ({
            ...prev,
            logo_url: previewUrl,
        }));
    };

    const handleTempCoverUpload = (file: File) => {
        setTempCoverFile(file);
        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setForm((prev) => ({
            ...prev,
            cover_image_url: previewUrl,
        }));
    };

    const handleLocationChange = (lat: number, lng: number) => {
        setForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
        }));
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setShowDropdown(true);
        setFilteredUsers(users);
    };

    const handleWorkHoursChange = (index: number, field: keyof WorkHours, value: string | boolean) => {
        if (!form.work_hours) return;

        setForm((prev) => {
            const updatedWorkHours = [...prev.work_hours!];
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
            const updatedPhones = [...prev.phone_numbers];
            updatedPhones[index] = value;
            return { ...prev, phone_numbers: updatedPhones };
        });
    };

    const addPhoneNumber = () => {
        if (form.phone_numbers.length < 3) {
            setForm((prev) => ({
                ...prev,
                phone_numbers: [...prev.phone_numbers, ''],
            }));
        }
    };

    const removePhoneNumber = (index: number) => {
        if (form.phone_numbers.length > 1) {
            setForm((prev) => {
                const updatedPhones = [...prev.phone_numbers];
                updatedPhones.splice(index, 1);
                return { ...prev, phone_numbers: updatedPhones };
            });
        }
    };

    const filteredCategories = categories.filter((category) => category.title.toLowerCase().includes(searchCategoryTerm.toLowerCase()));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation: shop name and owner are required.
        if (!form.shop_name) {
            setAlert({ visible: true, message: t('shop_name_required'), type: 'danger' });
            setLoading(false);
            return;
        }
        if (!form.owner) {
            setAlert({ visible: true, message: t('shop_owner_required'), type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            // Create shop data payload (initially without image URLs)
            const insertPayload = {
                shop_name: form.shop_name,
                shop_desc: form.shop_desc,
                logo_url: '', // Will be set after upload
                cover_image_url: '', // Will be set after upload
                owner: form.owner,
                public: form.public,
                status: form.status,
                address: form.address,
                work_hours: form.work_hours,
                phone_numbers: form.phone_numbers.filter((phone) => phone.trim() !== ''),
                category_id: form.category_id,
                delivery_companies_id: form.delivery_companies_id,
                gallery: form.gallery,
                latitude: form.latitude,
                longitude: form.longitude,
            };

            // Insert shop data first to get the shop ID
            const { data: newShop, error } = await supabase.from('shops').insert([insertPayload]).select().single();

            if (error) throw error;

            // Initialize the improved folder structure for the new shop
            await StorageManager.initializeShopStructure(newShop.id);

            // Now upload the images to the proper location using the shop ID
            let finalLogoUrl = '';
            let finalCoverUrl = '';

            if (tempLogoFile) {
                const logoResult = await StorageManager.uploadShopLogo(newShop.id, tempLogoFile);
                if (logoResult.success && logoResult.url) {
                    finalLogoUrl = logoResult.url;
                }
            }

            if (tempCoverFile) {
                const coverResult = await StorageManager.uploadShopCover(newShop.id, tempCoverFile);
                if (coverResult.success && coverResult.url) {
                    finalCoverUrl = coverResult.url;
                }
            }

            // Update shop with final image URLs
            if (finalLogoUrl || finalCoverUrl) {
                await supabase
                    .from('shops')
                    .update({
                        logo_url: finalLogoUrl,
                        cover_image_url: finalCoverUrl,
                    })
                    .eq('id', newShop.id);
            }

            setAlert({ visible: true, message: t('shop_added_successfully'), type: 'success' });
            // Redirect back to the shops list page after successful insertion
            router.push('/shops');
        } catch (error: any) {
            setAlert({ visible: true, message: error.message || t('error_adding_shop'), type: 'danger' });
            // Scroll to top to show error
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 w-full max-w-none">
            <div className="flex items-center gap-5 mb-6">
                {' '}
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>{' '}
                {/* Breadcrumb Navigation */}
                <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
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
                        <span>{t('add_new_shop')}</span>
                    </li>
                </ul>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Form Container with tabbed layout */}
            <form onSubmit={handleSubmit}>
                {/* Cover Image */}
                <div className="panel mb-5 overflow-hidden">
                    <div className="relative h-52 w-full">
                        <img src={form.cover_image_url || '/assets/images/img-placeholder-fallback.webp'} alt="Shop Cover" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                            {' '}
                            <div className="text-center flex flex-col items-center justify-center">
                                <h2 className="text-xl font-bold text-white mb-4">{t('shop_cover_image')}</h2>
                                {/* Custom Cover Upload Component */}
                                <div className="relative inline-block">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                handleTempCoverUpload(file);
                                            }
                                        }}
                                        className="hidden"
                                        id="cover-upload"
                                    />
                                    <label htmlFor="cover-upload" className="btn btn-primary cursor-pointer">
                                        {t('select_cover')}
                                    </label>
                                </div>
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
                            { name: t('delivery'), icon: 'truck' },
                        ]}
                        onTabClick={(tab) => setActiveTab(tab)}
                        activeTab={activeTab}
                    />
                </div>{' '}
                {activeTab === 0 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('basic_information')}</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Logo Column */}
                            <div className="flex flex-col items-center">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-3">{t('shop_logo')}</label>
                                {/* Logo Preview */}
                                <div className="mb-4">
                                    <img src={form.logo_url || '/assets/images/shop-placeholder.jpg'} alt="Shop Logo" className="w-36 h-36 rounded-full object-cover border-2 border-gray-200" />
                                </div>
                                {/* Custom Logo Upload Component */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                handleTempLogoUpload(file);
                                            }
                                        }}
                                        className="hidden"
                                        id="logo-upload"
                                    />
                                    <label htmlFor="logo-upload" className="btn btn-outline-primary btn-sm cursor-pointer">
                                        {t('select_logo')}
                                    </label>
                                </div>
                            </div>
                            {/* Shop Info Column */}{' '}
                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="shop_name" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('shop_name')} <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="shop_name"
                                        name="shop_name"
                                        value={form.shop_name}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder={t('enter_shop_name')}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="shop_desc" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('shop_description')}
                                    </label>
                                    <textarea
                                        id="shop_desc"
                                        name="shop_desc"
                                        value={form.shop_desc}
                                        onChange={handleInputChange}
                                        className="form-textarea"
                                        placeholder={t('enter_shop_description')}
                                        rows={4}
                                    />
                                </div>
                                <div className="relative" ref={dropdownRef}>
                                    <label htmlFor="owner" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('shop_owner')} <span className="text-red-500">*</span>
                                    </label>{' '}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={t('search_users')}
                                            className="form-input pr-8"
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                        />
                                        {searchTerm && (
                                            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-danger" onClick={handleClearSearch}>
                                                <IconX className="h-4 w-4" />
                                            </button>
                                        )}
                                        {showDropdown && (
                                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1b2e4b] border border-[#ebedf2] dark:border-[#191e3a] rounded-md shadow-lg max-h-60 overflow-auto">
                                                <div className="py-1">
                                                    {filteredUsers.map((user) => (
                                                        <div
                                                            key={user.id}
                                                            className="flex items-center px-4 py-2 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/10"
                                                            onClick={() => {
                                                                setForm((prev) => ({ ...prev, owner: user.id }));
                                                                setSearchTerm(user.full_name);
                                                                setShowDropdown(false);
                                                            }}
                                                        >
                                                            <img src={user.avatar_url || '/assets/images/user-placeholder.webp'} alt={user.full_name} className="w-8 h-8 rounded-full mr-2" />
                                                            <span className="text-black dark:text-white">{user.full_name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>{' '}
                                <div ref={categoryRef} className="relative">
                                    <label htmlFor="category_id" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        {t('category')}
                                    </label>
                                    <div
                                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    >
                                        <span>{form.category_id ? categories.find((c) => c.id === form.category_id)?.title || t('select_category') : t('select_category')}</span>
                                        <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

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
                                                {filteredCategories.length === 0 && <div className="px-4 py-2 text-gray-500 dark:text-gray-400">{t('no_categories_found')}</div>}
                                            </div>
                                        </div>
                                    )}
                                </div>{' '}
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
                                        <span>{t(form.status.toLowerCase())}</span>
                                        <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${form.statusDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                    {form.statusDropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                            <div className="max-h-64 overflow-y-auto">
                                                {' '}
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
                                </div>
                            </div>
                        </div>
                    </div>
                )}{' '}
                {activeTab === 1 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('shop_details')}</h5>
                        </div>
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="address" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    {t('address')}
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
                                        placeholder={t('enter_shop_address')}
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">{t('shop_location')}</label>{' '}
                                <div className="h-[400px] mb-4">
                                    <MapSelector
                                        initialPosition={form.latitude && form.longitude ? [form.latitude, form.longitude] : null}
                                        onChange={handleLocationChange}
                                        height="400px"
                                        useCurrentLocationByDefault={true}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{t('click_map_select_location')}</p>{' '}
                                {form.latitude && form.longitude && (
                                    <p className="text-sm mt-10">
                                        {t('selected_coordinates')}:{' '}
                                        <span className="font-semibold">
                                            {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                                        </span>
                                    </p>
                                )}
                            </div>{' '}
                            <div className="sm:col-span-2">
                                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                    {t('phone_numbers')} ({t('up_to_3')})
                                </label>
                                <div className="space-y-3">
                                    {form.phone_numbers.map((phone, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <span className="mt-1 ltr:mr-2 rtl:ml-2 text-success">
                                                <IconPhone className="h-5 w-5" />
                                            </span>
                                            <input
                                                type="tel"
                                                className="form-input flex-1"
                                                placeholder={t('enter_phone_number')}
                                                value={phone}
                                                onChange={(e) => handlePhoneChange(index, e.target.value)}
                                            />
                                            {index > 0 && (
                                                <button type="button" className="hover:text-danger" onClick={() => removePhoneNumber(index)}>
                                                    <IconX className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {form.phone_numbers.length < 3 && (
                                        <button type="button" className="btn btn-outline-primary btn-sm mt-2" onClick={addPhoneNumber}>
                                            <IconPlus className="h-4 w-4 mr-2" />
                                            {t('add_phone_number')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}{' '}
                {activeTab === 2 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('working_hours')}</h5>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('set_working_hours')}</p>
                        </div>{' '}
                        <div className="grid grid-cols-1 gap-6">
                            {form.work_hours?.map((day, index) => (
                                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center">
                                            <h6 className="text-lg mx-2 font-semibold min-w-[100px]">{day.day}</h6>{' '}
                                            <label className="inline-flex cursor-pointer">
                                                <input type="checkbox" className="form-checkbox" checked={day.open} onChange={(e) => handleWorkHoursChange(index, 'open', e.target.checked)} />
                                                <span className="relative text-white-dark checked:bg-none ml-2">{day.open ? t('open') : t('closed')}</span>
                                            </label>
                                        </div>

                                        <AnimateHeight duration={300} height={day.open ? 'auto' : 0}>
                                            <div className={`flex flex-wrap items-center gap-4 ${day.open ? 'mt-4 sm:mt-0' : ''}`}>
                                                {' '}
                                                <div className="flex items-center">
                                                    <span className="mx-2">{t('from')}:</span>
                                                    <input
                                                        type="time"
                                                        className="form-input w-auto"
                                                        value={day.startTime}
                                                        onChange={(e) => handleWorkHoursChange(index, 'startTime', e.target.value)}
                                                        disabled={!day.open}
                                                    />
                                                </div>
                                                <div className="flex items-center">
                                                    <span className="mx-2">{t('to')}:</span>
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
                )}{' '}
                {activeTab === 3 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('shop_gallery')}</h5>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('upload_gallery_images_info')}</p>
                        </div>

                        {/* Note: Gallery uploads will be available after shop creation */}
                        <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                            <div className="text-center">
                                <IconUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('gallery_after_creation')}</h3>
                                <p className="text-gray-500 dark:text-gray-400">{t('gallery_after_creation_desc')}</p>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 4 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">{t('delivery_settings')}</h5>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('select_delivery_company_for_shop')}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {/* Delivery Company Selection */}
                            <div ref={deliveryCompanyRef} className="relative">
                                <label htmlFor="delivery_companies_id" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    {t('delivery_company')}
                                </label>
                                <div className="relative">
                                    <div
                                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                        onClick={() => setIsDeliveryCompanyDropdownOpen(!isDeliveryCompanyDropdownOpen)}
                                    >
                                        <span>{form.delivery_companies_id ? deliveryCompanies.find((c) => c.id === form.delivery_companies_id)?.company_name : t('select_delivery_company')}</span>
                                        <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isDeliveryCompanyDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isDeliveryCompanyDropdownOpen && (
                                        <div className="absolute z-50 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    className="w-full rounded border border-[#e0e6ed] p-2 focus:border-primary focus:outline-none dark:border-[#191e3a] dark:bg-black dark:text-white-dark"
                                                    placeholder={t('search')}
                                                    value={searchDeliveryCompanyTerm}
                                                    onChange={(e) => setSearchDeliveryCompanyTerm(e.target.value)}
                                                />
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {deliveryCompanies
                                                    .filter((company) => company.company_name.toLowerCase().includes(searchDeliveryCompanyTerm.toLowerCase()))
                                                    .map((company) => (
                                                        <div
                                                            key={company.id}
                                                            className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]"
                                                            onClick={() => {
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    delivery_companies_id: company.id,
                                                                }));
                                                                setIsDeliveryCompanyDropdownOpen(false);
                                                                // Fetch pricing data for the selected company
                                                                fetchPricingData(company.id);
                                                            }}
                                                        >
                                                            {company.company_name}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Pricing Section - Only show if delivery company is selected */}
                            {form.delivery_companies_id && (
                                <div className="mt-8">
                                    <div className="mb-5">
                                        <h5 className="text-lg font-semibold dark:text-white-light">{t('delivery_pricing')}</h5>
                                        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('manage_delivery_prices_for_shop')}</p>
                                    </div>

                                    {/* Base Pricing */}
                                    <div className="panel mb-5">
                                        <div className="mb-5">
                                            <h5 className="text-lg font-semibold dark:text-white-light">{t('base_delivery_prices')}</h5>
                                            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('standard_pricing_for_all_locations')}</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                            <div>
                                                <label htmlFor="express_price" className="block text-sm font-bold text-gray-700 dark:text-white">
                                                    Express (Same Day) <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                    <input
                                                        type="number"
                                                        id="express_price"
                                                        className="form-input pl-8"
                                                        value={deliveryPrices?.express_price || ''}
                                                        onChange={(e) => handlePricingChange('express_price', e.target.value)}
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        min="0"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="fast_price" className="block text-sm font-bold text-gray-700 dark:text-white">
                                                    Fast (2-3 Days) <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                    <input
                                                        type="number"
                                                        id="fast_price"
                                                        className="form-input pl-8"
                                                        value={deliveryPrices?.fast_price || ''}
                                                        onChange={(e) => handlePricingChange('fast_price', e.target.value)}
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        min="0"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="standard_price" className="block text-sm font-bold text-gray-700 dark:text-white">
                                                    Standard (3-5 Days) <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                                    <input
                                                        type="number"
                                                        id="standard_price"
                                                        className="form-input pl-8"
                                                        value={deliveryPrices?.standard_price || ''}
                                                        onChange={(e) => handlePricingChange('standard_price', e.target.value)}
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        min="0"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location Based Prices */}
                                    <div className="panel">
                                        <div className="mb-5">
                                            <h5 className="text-lg font-semibold dark:text-white-light">{t('location_based_prices')}</h5>
                                            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('set_specific_prices_for_locations')}</p>
                                        </div>

                                        {/* Add New Location Price */}
                                        <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                            <h6 className="text-md font-semibold mb-4">{t('add_new_location_price')}</h6>
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('location_name')}</label>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        placeholder={t('enter_location_name')}
                                                        value={newLocationPrice.location}
                                                        onChange={(e) => setNewLocationPrice((prev) => ({ ...prev, location: e.target.value }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Express ($)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        min="0"
                                                        value={newLocationPrice.express_price}
                                                        onChange={(e) => setNewLocationPrice((prev) => ({ ...prev, express_price: e.target.value }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Fast ($)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        min="0"
                                                        value={newLocationPrice.fast_price}
                                                        onChange={(e) => setNewLocationPrice((prev) => ({ ...prev, fast_price: e.target.value }))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Standard ($)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        min="0"
                                                        value={newLocationPrice.standard_price}
                                                        onChange={(e) => setNewLocationPrice((prev) => ({ ...prev, standard_price: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="flex items-end">
                                                    <button type="button" className="btn btn-primary w-full" onClick={addLocationPrice}>
                                                        <IconPlus className="h-4 w-4 mr-1" />
                                                        {t('add')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Existing Location Prices */}
                                        <div className="grid grid-cols-1 gap-6">
                                            {locationPrices.map((locationPrice, index) => (
                                                <div key={locationPrice.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                                        <div className="flex items-center flex-1">
                                                            <h6 className="text-lg font-semibold min-w-[120px]">
                                                                {t('location')} {index + 1}
                                                            </h6>
                                                            <input
                                                                type="text"
                                                                className="form-input flex-1 ml-4"
                                                                placeholder={t('enter_location_name')}
                                                                value={locationPrice.delivery_location}
                                                                onChange={(e) => handleLocationPriceChange(locationPrice.id, 'delivery_location', e.target.value)}
                                                            />
                                                        </div>
                                                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeLocationPrice(locationPrice.id)}>
                                                            <IconX className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Express ($)</label>
                                                            <input
                                                                type="number"
                                                                className="form-input"
                                                                placeholder="0.00"
                                                                step="0.01"
                                                                min="0"
                                                                value={locationPrice.express_price}
                                                                onChange={(e) => handleLocationPriceChange(locationPrice.id, 'express_price', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Fast ($)</label>
                                                            <input
                                                                type="number"
                                                                className="form-input"
                                                                placeholder="0.00"
                                                                step="0.01"
                                                                min="0"
                                                                value={locationPrice.fast_price}
                                                                onChange={(e) => handleLocationPriceChange(locationPrice.id, 'fast_price', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">Standard ($)</label>
                                                            <input
                                                                type="number"
                                                                className="form-input"
                                                                placeholder="0.00"
                                                                step="0.01"
                                                                min="0"
                                                                value={locationPrice.standard_price}
                                                                onChange={(e) => handleLocationPriceChange(locationPrice.id, 'standard_price', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.back()}>
                        {t('cancel')}
                    </button>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? t('submitting') : t('add_shop')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddShopPage;

'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImageUpload from '@/components/image-upload/image-upload';
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

interface WorkHours {
    day: string;
    open: boolean;
    startTime: string;
    endTime: string;
}

const AddShopPage = () => {
    const router = useRouter();
    const [form, setForm] = useState({
        shop_name: '',
        shop_desc: '',
        logo_url: '',
        cover_image_url: '',
        owner: '',
        active: true,
        address: '',
        work_hours: null as WorkHours[] | null,
        phone_numbers: [''],
        category_id: null as number | null,
        gallery: [] as string[],
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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [activeTab, setActiveTab] = useState(0);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [searchCategoryTerm, setSearchCategoryTerm] = useState('');

    // Set up default work hours
    const defaultWorkHours: WorkHours[] = [
        { day: 'Monday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Tuesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Wednesday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Thursday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Friday', open: true, startTime: '09:00', endTime: '18:00' },
        { day: 'Saturday', open: false, startTime: '10:00', endTime: '16:00' },
        { day: 'Sunday', open: false, startTime: '10:00', endTime: '16:00' },
    ];

    // Initialize work_hours with default hours
    useEffect(() => {
        if (form.work_hours === null) {
            setForm((prev) => ({
                ...prev,
                work_hours: defaultWorkHours,
            }));
        }
    }, []);

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
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    // Filter users based on search term
    useEffect(() => {
        const filtered = users.filter((user) => user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
        setFilteredUsers(filtered);
    }, [searchTerm, users]);

    // Handle click outside for user dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
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

    const handleLogoUpload = (url: string) => {
        setForm((prev) => ({
            ...prev,
            logo_url: url,
        }));
    };

    const handleCoverImageUpload = (url: string) => {
        setForm((prev) => ({
            ...prev,
            cover_image_url: url,
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

    // Gallery image handling
    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setSelectedFiles((prev) => [...prev, ...files]);

            // Reset the input so the same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const filteredCategories = categories.filter((category) => category.title.toLowerCase().includes(searchCategoryTerm.toLowerCase()));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Basic validation: shop name and owner are required.
        if (!form.shop_name) {
            setAlert({ visible: true, message: 'Shop name is required.', type: 'danger' });
            setLoading(false);
            return;
        }
        if (!form.owner) {
            setAlert({ visible: true, message: 'Shop owner is required.', type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            // Create a new insert payload
            const insertPayload = {
                shop_name: form.shop_name,
                shop_desc: form.shop_desc,
                logo_url: form.logo_url,
                cover_image_url: form.cover_image_url,
                owner: form.owner,
                active: form.active,
                address: form.address,
                work_hours: form.work_hours,
                phone_numbers: form.phone_numbers.filter((phone) => phone.trim() !== ''),
                category_id: form.category_id,
                // Gallery will be added after shop creation
            };

            // Insert shop data
            const { data: newShop, error } = await supabase.from('shops').insert([insertPayload]).select().single();

            if (error) throw error;

            // If we have files to upload
            if (selectedFiles.length > 0 && newShop) {
                const galleryUrls: string[] = [];

                for (const file of selectedFiles) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage.from('shop-gallery').upload(`${newShop.id}/${fileName}`, file);

                    if (uploadError) throw uploadError;

                    const {
                        data: { publicUrl },
                    } = supabase.storage.from('shop-gallery').getPublicUrl(`${newShop.id}/${fileName}`);

                    galleryUrls.push(publicUrl);
                }

                // Update shop with gallery URLs
                if (galleryUrls.length > 0) {
                    const { error: updateError } = await supabase.from('shops').update({ gallery: galleryUrls }).eq('id', newShop.id);

                    if (updateError) throw updateError;
                }
            }

            setAlert({ visible: true, message: 'Shop added successfully!', type: 'success' });
            // Redirect back to the shops list page after successful insertion
            router.push('/shops');
        } catch (error: any) {
            console.error(error);
            setAlert({ visible: true, message: error.message || 'Error adding shop', type: 'danger' });
            // Scroll to top to show error
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-5 mb-6">
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
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
                        <span>Add New Shop</span>
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
                            <div className="text-center flex flex-col items-center justify-center">
                                <h2 className="text-xl font-bold text-white mb-4">Shop Cover Image</h2>
                                <ImageUpload
                                    bucket="shops-logos/covers"
                                    userId="new"
                                    url={form.cover_image_url}
                                    placeholderImage="/assets/images/img-placeholder-fallback.webp"
                                    onUploadComplete={handleCoverImageUpload}
                                    onError={(error) => {
                                        setAlert({
                                            visible: true,
                                            type: 'danger',
                                            message: error,
                                        });
                                    }}
                                    buttonLabel="Select Cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <Tabs
                        tabs={[
                            { name: 'Basic Info', icon: 'store' },
                            { name: 'Shop Details', icon: 'map-pin' },
                            { name: 'Working Hours', icon: 'clock' },
                            { name: 'Gallery', icon: 'image' },
                        ]}
                        onTabClick={(tab) => setActiveTab(tab)}
                        activeTab={activeTab}
                    />
                </div>

                {activeTab === 0 && (
                    <div className="panel mb-5">
                        <div className="mb-5">
                            <h5 className="text-lg font-semibold dark:text-white-light">Basic Information</h5>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Logo Column */}
                            <div className="flex flex-col items-center">
                                <label className="block text-sm font-bold text-gray-700 dark:text-white mb-3">Shop Logo</label>
                                <ImageUpload
                                    bucket="shops-logos"
                                    userId="new"
                                    url={form.logo_url}
                                    placeholderImage="/assets/images/shop-placeholder.jpg"
                                    onUploadComplete={handleLogoUpload}
                                    onError={(error) => setAlert({ visible: true, message: error, type: 'danger' })}
                                />
                            </div>

                            {/* Shop Info Column */}
                            <div className="space-y-5">
                                <div>
                                    <label htmlFor="shop_name" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        Shop Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="shop_name"
                                        name="shop_name"
                                        value={form.shop_name}
                                        onChange={handleInputChange}
                                        className="form-input"
                                        placeholder="Enter shop name"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="shop_desc" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        Shop Description
                                    </label>
                                    <textarea
                                        id="shop_desc"
                                        name="shop_desc"
                                        value={form.shop_desc}
                                        onChange={handleInputChange}
                                        className="form-textarea"
                                        placeholder="Enter shop description"
                                        rows={4}
                                    />
                                </div>

                                <div className="relative" ref={dropdownRef}>
                                    <label htmlFor="owner" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        Shop Owner <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search users..."
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
                                </div>

                                <div ref={categoryRef} className="relative">
                                    <label htmlFor="category_id" className="block text-sm font-bold text-gray-700 dark:text-white">
                                        Category
                                    </label>
                                    <div
                                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    >
                                        <span>{form.category_id ? categories.find((c) => c.id === form.category_id)?.title || 'Select Category' : 'Select Category'}</span>
                                        <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isCategoryDropdownOpen && (
                                        <div className="absolute z-10 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    className="w-full rounded border border-[#e0e6ed] p-2 focus:border-primary focus:outline-none dark:border-[#191e3a] dark:bg-black dark:text-white-dark"
                                                    placeholder="Search categories..."
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

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-white">Status</label>
                                    <label className="inline-flex cursor-pointer items-center">
                                        <input type="checkbox" name="active" className="form-checkbox" checked={form.active} onChange={handleInputChange} />
                                        <span className="relative text-white-dark checked:bg-none ml-2">{form.active ? 'Active' : 'Inactive'}</span>
                                    </label>
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
                                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">Phone Numbers (Up to 3)</label>
                                <div className="space-y-3">
                                    {form.phone_numbers.map((phone, index) => (
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

                                    {form.phone_numbers.length < 3 && (
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
                                                    <span className="mr-2">From:</span>
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
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Upload images for your shop gallery (will be saved after shop creation)</p>
                        </div>

                        <div className="mb-5">
                            <div
                                onClick={handleFileSelect}
                                className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b]"
                            >
                                <IconUpload className="mb-2 h-6 w-6" />
                                <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-500">JPG, PNG, GIF up to 2MB</p>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                        </div>

                        <div className="space-y-5">
                            {/* Selected files that will be uploaded */}
                            {selectedFiles.length > 0 && (
                                <div>
                                    <h6 className="font-semibold mb-3">Selected Images to Upload</h6>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="group relative h-32">
                                                <img src={URL.createObjectURL(file)} alt={`Selected ${index + 1}`} className="h-full w-full rounded-lg object-cover" />
                                                <button
                                                    type="button"
                                                    className="absolute right-0 top-0 hidden rounded-full bg-red-500 p-1 text-white hover:bg-red-600 group-hover:block"
                                                    onClick={() => removeSelectedFile(index)}
                                                >
                                                    <IconX className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.back()}>
                        Cancel
                    </button>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? 'Submitting...' : 'Add Shop'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddShopPage;

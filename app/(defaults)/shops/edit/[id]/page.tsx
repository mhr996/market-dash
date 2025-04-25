'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImageUpload from '@/components/image-upload/image-upload';
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
    active: boolean;
    address?: string;
    work_hours?: WorkHours[];
    phone_numbers?: string[];
    category_id?: number | null;
    gallery?: string[];
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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [searchCategoryTerm, setSearchCategoryTerm] = useState('');
    const categoryRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const [form, setForm] = useState<Shop>({
        id: 0,
        shop_name: '',
        shop_desc: '',
        logo_url: null,
        cover_image_url: null,
        owner: '',
        active: true,
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleLogoUpload = async (url: string) => {
        try {
            const { error } = await supabase.from('shops').update({ logo_url: url }).eq('id', id).select();

            if (error) throw error;

            setForm((prev) => ({
                ...prev,
                logo_url: url,
            }));

            setAlert({ visible: true, message: 'Logo updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Error updating logo:', error);
            setAlert({ visible: true, message: 'Error updating logo', type: 'danger' });
        }
    };

    const handleCoverImageUpload = async (url: string) => {
        try {
            const { error } = await supabase.from('shops').update({ cover_image_url: url }).eq('id', id).select();

            if (error) throw error;

            setForm((prev) => ({
                ...prev,
                cover_image_url: url,
            }));

            setAlert({ visible: true, message: 'Cover image updated successfully!', type: 'success' });
        } catch (error) {
            console.error('Error updating cover image:', error);
            setAlert({ visible: true, message: 'Error updating cover image', type: 'danger' });
        }
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

    // Gallery image handling
    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    const removeGalleryImage = (index: number) => {
        setForm((prev) => {
            const updatedGallery = [...(prev.gallery || [])];
            updatedGallery.splice(index, 1);
            return { ...prev, gallery: updatedGallery };
        });
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

            // Upload any new gallery images
            const galleryUrls = [...(form.gallery || [])];

            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage.from('shop-gallery').upload(`${id}/${fileName}`, file);

                    if (uploadError) throw uploadError;

                    const {
                        data: { publicUrl },
                    } = supabase.storage.from('shop-gallery').getPublicUrl(`${id}/${fileName}`);

                    galleryUrls.push(publicUrl);
                }
            }

            // Create update payload with all fields we want to update
            const updatePayload = {
                shop_name: form.shop_name,
                shop_desc: form.shop_desc,
                active: form.active,
                address: form.address,
                work_hours: form.work_hours || defaultWorkHours,
                phone_numbers: form.phone_numbers?.filter((phone) => phone.trim() !== '') || [],
                category_id: form.category_id,
                gallery: galleryUrls,
            };

            // Update the shop data in Supabase
            const { error } = await supabase.from('shops').update(updatePayload).eq('id', id);

            if (error) throw error;

            // Fetch the updated shop data to confirm changes
            const { data: updatedShop, error: fetchError } = await supabase.from('shops').select('*, profiles(full_name, email)').eq('id', id).single();

            if (fetchError) throw fetchError;

            // Update the form with the fetched data
            setForm(updatedShop);
            setSelectedFiles([]);
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
                <div className="flex items-center gap-5">
                    <button onClick={() => router.back()} className="hover:text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>

                    <ul className="flex space-x-2 rtl:space-x-reverse items-center">
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
                            <span className="text-black dark:text-white-dark">Edit {form.shop_name}</span>
                        </li>
                    </ul>
                </div>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSubmit}>
                {/* Cover Image */}
                <div className="panel mb-5 overflow-hidden">
                    <div className="relative h-52 w-full">
                        <img src={form.cover_image_url || '/assets/images/shop-cover-placeholder.jpg'} alt="Shop Cover" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-white mb-4">Shop Cover Image</h2>
                                <ImageUpload
                                    bucket="shops-covers"
                                    userId={id.toString()}
                                    url={form.cover_image_url}
                                    placeholderImage="/assets/images/shop-cover-placeholder.jpg"
                                    onUploadComplete={handleCoverImageUpload}
                                    onError={(error) => {
                                        setAlert({
                                            visible: true,
                                            type: 'danger',
                                            message: error,
                                        });
                                    }}
                                    buttonLabel="Change Cover"
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
                        <div className="flex flex-col sm:flex-row">
                            <div className="mb-5 w-full sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                                <label className="mb-2 block text-sm font-semibold">Shop Logo</label>
                                <ImageUpload
                                    bucket="shops"
                                    userId={id.toString()}
                                    url={form.logo_url}
                                    placeholderImage="/assets/images/shop-placeholder.jpg"
                                    onUploadComplete={handleLogoUpload}
                                    onError={(error) => {
                                        setAlert({
                                            visible: true,
                                            type: 'danger',
                                            message: error,
                                        });
                                    }}
                                />
                            </div>
                            <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="shop_name" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                        Shop Name <span className="text-red-500">*</span>
                                    </label>
                                    <input type="text" id="shop_name" name="shop_name" className="form-input" value={form.shop_name} onChange={handleInputChange} required />
                                </div>
                                <div>
                                    <label htmlFor="owner" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                        Owner
                                    </label>
                                    <input type="text" id="owner" className="form-input bg-[#eee] dark:bg-[#1b2e4b]" value={form.profiles?.full_name || form.owner} disabled />
                                </div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="shop_desc" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
                                        Description
                                    </label>
                                    <textarea id="shop_desc" name="shop_desc" className="form-textarea min-h-[100px]" value={form.shop_desc} onChange={handleInputChange} required />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">Status</label>
                                    <label className="inline-flex cursor-pointer items-center">
                                        <input type="checkbox" name="active" className="form-checkbox" checked={form.active} onChange={handleInputChange} />
                                        <span className="relative text-white-dark checked:bg-none ml-2">{form.active ? 'Active' : 'Inactive'}</span>
                                    </label>
                                </div>
                                <div ref={categoryRef} className="relative">
                                    <label htmlFor="category_id" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-white">
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

                            {/* Existing gallery images */}
                            {form.gallery && form.gallery.length > 0 && (
                                <div>
                                    <h6 className="font-semibold mb-3">Current Gallery</h6>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {form.gallery.map((image, index) => (
                                            <div key={index} className="group relative h-32">
                                                <img src={image} alt={`Gallery ${index + 1}`} className="h-full w-full rounded-lg object-cover" />
                                                <button
                                                    type="button"
                                                    className="absolute right-0 top-0 hidden rounded-full bg-red-500 p-1 text-white hover:bg-red-600 group-hover:block"
                                                    onClick={() => removeGalleryImage(index)}
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

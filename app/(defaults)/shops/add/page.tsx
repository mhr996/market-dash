'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import ImageUpload from '@/components/image-upload/image-upload';
import IconX from '@/components/icon/icon-x';

interface Profile {
    id: string;
    full_name: string;
    avatar_url?: string;
}

const AddShopPage = () => {
    const router = useRouter();
    const [form, setForm] = useState({
        shop_name: '',
        shop_desc: '',
        logo_url: '',
        owner: '',
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<Profile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch current user and all users
    useEffect(() => {
        const fetchUsers = async () => {
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
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
        fetchUsers();
    }, []);

    // Filter users based on search term
    useEffect(() => {
        const filtered = users.filter((user) => user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
        setFilteredUsers(filtered);
    }, [searchTerm, users]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleLogoUpload = async (url: string) => {
        setForm((prev) => ({
            ...prev,
            logo_url: url,
        }));
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        setShowDropdown(true);
        setFilteredUsers(users);
    };

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
            const { error } = await supabase.from('shops').insert([form]);
            if (error) throw error;
            setAlert({ visible: true, message: 'Shop added successfully!', type: 'success' });
            // Redirect back to the shops list page after successful insertion.
            router.push('/shops');
        } catch (error: any) {
            console.error(error);
            setAlert({ visible: true, message: error.message || 'Error adding shop', type: 'danger' });
        } finally {
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

            {/* Form Container with 2-column layout */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">Add New Shop</h6>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Column */}
                        <div className="flex flex-col items-center">
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-3">Shop Logo</label>
                            <ImageUpload
                                bucket="shops-logos"
                                userId=""
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
                                    Shop Name *
                                </label>
                                <input type="text" id="shop_name" name="shop_name" value={form.shop_name} onChange={handleInputChange} className="form-input" placeholder="Enter shop name" required />
                            </div>
                            <div>
                                <label htmlFor="shop_desc" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    Shop Description
                                </label>
                                <textarea id="shop_desc" name="shop_desc" value={form.shop_desc} onChange={handleInputChange} className="form-input" placeholder="Enter shop description" rows={4} />
                            </div>
                            <div className="relative" ref={dropdownRef}>
                                <label htmlFor="owner" className="block text-sm font-bold text-gray-700 dark:text-white">
                                    Shop Owner
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
                                        <button className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-danger" onClick={handleClearSearch}>
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
                        </div>
                    </div>
                    {/* Submit Button */}
                    <div className="mt-6">
                        <button type="submit" disabled={loading} className="btn btn-primary w-full">
                            {loading ? 'Submitting...' : 'Add Shop'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddShopPage;

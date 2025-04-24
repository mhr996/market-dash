'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import CountrySelect from '@/components/country-select/country-select';

const AddUserPage = () => {
    const router = useRouter();
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        username: '',
        country: '',
        address: '',
        location: '',
        phone: '',
        website: '',
        avatar_url: '',
        status: 'Active',
    });
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Basic validation: full name and email are required
        if (!form.full_name || !form.email) {
            setAlert({ visible: true, message: 'Full name and email are required.', type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            // Get the user's session for authentication
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            if (!token) {
                throw new Error('Not authenticated');
            }

            // Call our secure API endpoint to invite the user
            const response = await fetch('/api/users/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    email: form.email,
                    userData: {
                        display_name: form.full_name,
                    },
                    profileData: {
                        full_name: form.full_name,
                        username: form.username,
                        country: form.country,
                        address: form.address,
                        location: form.location,
                        phone: form.phone,
                        website: form.website,
                        avatar_url: form.avatar_url,
                        status: form.status,
                    },
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to invite user');
            }

            setAlert({
                visible: true,
                message: 'User added successfully! An invitation email has been sent to the user.',
                type: 'success',
            });

            // Redirect back to the users list page after successful insertion
            setTimeout(() => {
                router.push('/users');
            }, 2000);
        } catch (error: any) {
            console.error(error);
            setAlert({ visible: true, message: error.message || 'Error adding user', type: 'danger' });
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
                        <Link href="/users" className="text-primary hover:underline">
                            Users
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>Add New User</span>
                    </li>
                </ul>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Form Container */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">Add New User</h6>
              
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="full_name" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Full Name *
                        </label>
                        <input type="text" id="full_name" name="full_name" value={form.full_name} onChange={handleInputChange} className="form-input" placeholder="Enter full name" required />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Email *
                        </label>
                        <input type="email" id="email" name="email" value={form.email} onChange={handleInputChange} className="form-input" placeholder="Enter email" required />
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Username
                        </label>
                        <input type="text" id="username" name="username" value={form.username} onChange={handleInputChange} className="form-input" placeholder="Enter username" />
                    </div>
                    <div>
                        <label htmlFor="country" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Country
                        </label>
                        <CountrySelect
                            id="country"
                            name="country"
                            defaultValue={form.country}
                            className="form-select text-white-dark"
                            onChange={(e) => {
                                setForm((prev) => ({
                                    ...prev,
                                    country: e.target.value,
                                }));
                            }}
                        />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Address
                        </label>
                        <input type="text" id="address" name="address" value={form.address} onChange={handleInputChange} className="form-input" placeholder="Enter address" />
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Location
                        </label>
                        <input type="text" id="location" name="location" value={form.location} onChange={handleInputChange} className="form-input" placeholder="Enter location" />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Phone
                        </label>
                        <input type="text" id="phone" name="phone" value={form.phone} onChange={handleInputChange} className="form-input" placeholder="Enter phone number" />
                    </div>
                    <div>
                        <label htmlFor="website" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Website
                        </label>
                        <input type="text" id="website" name="website" value={form.website} onChange={handleInputChange} className="form-input" placeholder="Enter website" />
                    </div>

                    <div className="sm:col-span-2">
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Sending Invitation...' : 'Add User & Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUserPage;

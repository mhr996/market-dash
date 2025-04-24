'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import IconLinkedin from '@/components/icon/icon-linkedin';
import IconTwitter from '@/components/icon/icon-twitter';
import IconFacebook from '@/components/icon/icon-facebook';
import IconGithub from '@/components/icon/icon-github';

interface User {
    id: number;
    full_name: string;
    email: string;
    avatar_url: string | null;
    registration_date?: string;
    status?: string;
    uid?: string;
    profession?: string;
    country?: string;
    address?: string;
    location?: string;
    phone?: string;
    website?: string;
    is_default_address?: boolean;
    linkedin_username?: string;
    twitter_username?: string;
    facebook_username?: string;
    github_username?: string;
}

const UserPreview = () => {
    // Fix: Type assertion to access id from params
    const params = useParams();
    const id = params?.id as string;

    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'danger',
    });

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
                if (error) throw error;
                setUser(data);
            } catch (error) {
                console.error(error);
                setAlert({ visible: true, message: 'Error fetching user details', type: 'danger' });
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchUser();
        }
    }, [id]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (!user) {
        return <div className="text-center p-6">User not found.</div>;
    }

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
                        <span>User Preview</span>
                    </li>
                </ul>
            </div>

            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* General Information */}
            <div className="mb-6 rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">General Information</h6>
                <div className="flex flex-col sm:flex-row">
                    <div className="mb-5 w-full  sm:w-2/12 ltr:sm:mr-4 rtl:sm:ml-4">
                        <img src={user.avatar_url || '/assets/images/user-placeholder.webp'} alt={user.full_name} className="rounded-full object-cover w-full aspect-square" />
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Full Name</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.full_name || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Profession</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.profession || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Country</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.country || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Address</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.address || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Location</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.location || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Phone</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Email</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.email || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Website</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.website || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Registration Date</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.registration_date || 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white">Status</label>
                            <p className="mt-1 text-base text-gray-800 dark:text-gray-400">{user.status || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Social Information */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">Social</h6>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="flex items-center">
                        <div className="flex items-center justify-center rounded bg-[#eee] px-4 py-3 mr-3 dark:bg-[#1b2e4b]">
                            <IconLinkedin className="h-5 w-5" />
                        </div>
                        <p className="text-base text-gray-800 dark:text-gray-200">{user.linkedin_username || 'N/A'}</p>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center justify-center rounded bg-[#eee] px-4 py-3 mr-3 dark:bg-[#1b2e4b]">
                            <IconTwitter className="h-5 w-5" />
                        </div>
                        <p className="text-base text-gray-800 dark:text-gray-200">{user.twitter_username || 'N/A'}</p>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center justify-center rounded bg-[#eee] px-4 py-3 mr-3 dark:bg-[#1b2e4b]">
                            <IconFacebook className="h-5 w-5" />
                        </div>
                        <p className="text-base text-gray-800 dark:text-gray-200">{user.facebook_username || 'N/A'}</p>
                    </div>
                    <div className="flex items-center">
                        <div className="flex items-center justify-center rounded bg-[#eee] px-4 py-3 mr-3 dark:bg-[#1b2e4b]">
                            <IconGithub className="h-5 w-5" />
                        </div>
                        <p className="text-base text-gray-800 dark:text-gray-200">{user.github_username || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPreview;

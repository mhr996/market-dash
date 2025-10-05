'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import CountrySelect from '@/components/country-select/country-select';
import { getTranslation } from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import IconArrowLeft from '@/components/icon/icon-arrow-left';

const EditUserPage = () => {
    const params = useParams();
    const router = useRouter();
    const { t } = getTranslation();
    const { user: currentUser, loading: authLoading, canAccessUsers, getAvailableRoles } = useAuth();
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
        role: 'shop_editor',
        shop_ids: [] as number[],
    });
    const [availableShops, setAvailableShops] = useState<any[]>([]);
    const [userShops, setUserShops] = useState<any[]>([]);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Fetch user data and available shops
    useEffect(() => {
        const fetchData = async () => {
            if (authLoading || !currentUser) return;

            try {
                const userId = params?.id as string;
                if (!userId) return;

                // Check if user can access users page
                if (!canAccessUsers()) {
                    router.push('/no-access');
                    return;
                }

                // Fetch user data
                const { data: userData, error: userError } = await supabase
                    .from('profiles')
                    .select(
                        `
                        *,
                        user_roles!inner (
                            id,
                            name,
                            display_name
                        ),
                        shops:user_roles_shop!user_roles_shop_user_id_fkey (
                            id,
                            shop_id,
                            role,
                            shops!inner (
                                shop_name
                            )
                        )
                    `,
                    )
                    .eq('id', userId)
                    .single();

                if (userError) throw userError;

                // Set form data
                setForm({
                    full_name: userData.full_name || '',
                    email: userData.email || '',
                    username: userData.username || '',
                    country: userData.country || '',
                    address: userData.address || '',
                    location: userData.location || '',
                    phone: userData.phone || '',
                    website: userData.website || '',
                    avatar_url: userData.avatar_url || '',
                    status: userData.status || 'Active',
                    role: userData.user_roles?.name || 'shop_editor',
                    shop_ids: userData.shops?.map((shop: any) => shop.shop_id) || [],
                });

                setUserShops(userData.shops || []);

                // Fetch available shops based on current user's permissions
                if (currentUser.role_name === 'super_admin') {
                    const { data: shops, error: shopsError } = await supabase.from('shops').select('id, shop_name');
                    if (shopsError) {
                        console.error('Error fetching shops:', shopsError);
                    } else {
                        setAvailableShops(shops || []);
                        console.log('Available shops for super admin:', shops);
                    }
                } else if (currentUser.role_name === 'shop_owner') {
                    if (currentUser.shops && currentUser.shops.length > 0) {
                        const shopIds = currentUser.shops.map((shop) => shop.shop_id);
                        const { data: shops, error: shopsError } = await supabase.from('shops').select('id, shop_name').in('id', shopIds);
                        if (shopsError) {
                            console.error('Error fetching shops:', shopsError);
                        } else {
                            setAvailableShops(shops || []);
                            console.log('Available shops for shop owner:', shops);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setAlert({ visible: true, message: 'Error loading user data', type: 'danger' });
            } finally {
                setInitialLoading(false);
            }
        };

        fetchData();
    }, [params?.id, currentUser?.id, authLoading]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleMultiSelectChange = (name: string, value: number, checked: boolean) => {
        setForm((prev) => {
            const currentArray = prev[name as keyof typeof prev] as number[];
            if (checked) {
                return {
                    ...prev,
                    [name]: [...currentArray, value],
                };
            } else {
                return {
                    ...prev,
                    [name]: currentArray.filter((id) => id !== value),
                };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userId = params?.id as string;
            if (!userId) throw new Error('User ID not found');

            // Get role ID from role name
            let roleId = 6; // Default to 'user' role
            if (form.role) {
                const { data: roleData } = await supabase.from('user_roles').select('id').eq('name', form.role).single();
                if (roleData) {
                    roleId = roleData.id;
                }
            }

            // Update user profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    full_name: form.full_name,
                    username: form.username,
                    country: form.country,
                    address: form.address,
                    location: form.location,
                    phone: form.phone,
                    website: form.website,
                    avatar_url: form.avatar_url,
                    status: form.status,
                    role: roleId,
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            // Update shop assignments if user has shop roles
            if (['shop_owner', 'shop_editor'].includes(form.role)) {
                // Delete existing shop assignments
                const { error: deleteError } = await supabase.from('user_roles_shop').delete().eq('user_id', userId);

                if (deleteError) throw deleteError;

                // Add new shop assignments
                if (form.shop_ids.length > 0) {
                    const shopAssignments = form.shop_ids.map((shopId) => ({
                        user_id: userId,
                        shop_id: shopId,
                        role: form.role,
                    }));

                    const { error: shopRoleError } = await supabase.from('user_roles_shop').insert(shopAssignments);

                    if (shopRoleError) throw shopRoleError;
                }
            }

            setAlert({ visible: true, message: 'User updated successfully', type: 'success' });

            // Redirect back to users list after a short delay
            setTimeout(() => {
                router.push('/users');
            }, 1500);
        } catch (error) {
            console.error('Error updating user:', error);
            setAlert({ visible: true, message: `Error updating user: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    // Show loading while auth is loading or fetching data
    if (authLoading || initialLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b] w-full max-w-none">
            <div className="mb-4.5 flex flex-col gap-5 px-5 md:flex-row md:items-center">
                <div className="flex items-center gap-2">
                    <div onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </div>
                    {/* Breadcrumb Navigation */}
                    <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                        <li>
                            <Link href="/" className="text-primary hover:underline">
                                {t('home')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <Link href="/users" className="text-primary hover:underline">
                                {t('users')}
                            </Link>
                        </li>
                        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                            <span>Edit User</span>
                        </li>
                    </ul>
                </div>
            </div>

            {alert.visible && (
                <div className="mb-4 px-5">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}

            {/* Form Container */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">Edit User Information</h6>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                        <label htmlFor="full_name" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('full_name')} *
                        </label>
                        <input type="text" id="full_name" name="full_name" value={form.full_name} onChange={handleInputChange} className="form-input" placeholder={t('enter_full_name')} required />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('email')} *
                        </label>
                        <input type="email" id="email" name="email" value={form.email} onChange={handleInputChange} className="form-input" placeholder={t('enter_email')} required />
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('username')}
                        </label>
                        <input type="text" id="username" name="username" value={form.username} onChange={handleInputChange} className="form-input" placeholder={t('enter_username')} />
                    </div>
                    <div>
                        <label htmlFor="country" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('country')}
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
                            {t('address')}
                        </label>
                        <input type="text" id="address" name="address" value={form.address} onChange={handleInputChange} className="form-input" placeholder={t('enter_address')} />
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('location')}
                        </label>
                        <input type="text" id="location" name="location" value={form.location} onChange={handleInputChange} className="form-input" placeholder={t('enter_location')} />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('phone')}
                        </label>
                        <input type="text" id="phone" name="phone" value={form.phone} onChange={handleInputChange} className="form-input" placeholder={t('enter_phone')} />
                    </div>
                    <div>
                        <label htmlFor="website" className="block text-sm font-bold text-gray-700 dark:text-white">
                            {t('website')}
                        </label>
                        <input type="text" id="website" name="website" value={form.website} onChange={handleInputChange} className="form-input" placeholder={t('enter_website')} />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Status
                        </label>
                        <select id="status" name="status" value={form.status} onChange={handleInputChange} className="form-select">
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="role" className="block text-sm font-bold text-gray-700 dark:text-white">
                            Role *
                        </label>
                        <select id="role" name="role" value={form.role} onChange={handleInputChange} className="form-select" required>
                            {getAvailableRoles().map((role) => (
                                <option key={role} value={role}>
                                    {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* Multiple Shop Selection (only for shop roles) */}
                    {['shop_owner', 'shop_editor'].includes(form.role) && (
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">Shops * (Select all that apply) - Available: {availableShops.length}</label>
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded p-3">
                                {availableShops.length === 0 ? (
                                    <div className="text-gray-500 text-sm">No shops available</div>
                                ) : (
                                    availableShops.map((shop) => (
                                        <label key={shop.id} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={form.shop_ids.includes(shop.id)}
                                                onChange={(e) => {
                                                    console.log('Shop selection changed:', shop.shop_name, e.target.checked);
                                                    handleMultiSelectChange('shop_ids', shop.id, e.target.checked);
                                                }}
                                                className="form-checkbox"
                                            />
                                            <span className="text-sm">{shop.shop_name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                Selected shops: {form.shop_ids.length} - {form.shop_ids.join(', ')}
                            </div>
                        </div>
                    )}
                    <div className="sm:col-span-2 flex justify-end gap-4">
                        <Link href="/users" className="btn btn-outline-secondary">
                            Cancel
                        </Link>
                        <button type="submit" disabled={loading} className="btn btn-primary">
                            {loading ? 'Updating...' : 'Update User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditUserPage;

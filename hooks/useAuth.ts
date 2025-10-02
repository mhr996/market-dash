import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

interface UserShop {
    id: number;
    shop_id: number;
    role: 'shop_owner' | 'shop_editor';
    shops?: {
        shop_name: string;
    };
}

interface UserDeliveryCompany {
    id: number;
    delivery_company_id: number;
    role: 'delivery_owner' | 'driver';
    delivery_companies?: {
        company_name: string;
    };
}

interface User {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    role: number; // Changed to reference user_roles.id
    role_name?: string; // We'll get this from the join
    shops: UserShop[];
    delivery_companies: UserDeliveryCompany[];
}

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const getUser = async () => {
            try {
                const { data: authUser } = await supabase.auth.getUser();

                if (authUser.user && isMounted) {
                    // Get user profile with role information
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select(
                            `
                            *,
                            user_roles!inner (
                                id,
                                name,
                                display_name,
                                domain,
                                level
                            )
                        `,
                        )
                        .eq('id', authUser.user.id)
                        .single();

                    if (profile && isMounted) {
                        // Get user's shops
                        const { data: userShops } = await supabase
                            .from('user_roles_shop')
                            .select(
                                `
                                id,
                                shop_id,
                                role,
                                shops!inner (
                                    shop_name
                                )
                            `,
                            )
                            .eq('user_id', authUser.user.id);

                        // Get user's delivery companies
                        const { data: userDeliveryCompanies } = await supabase
                            .from('user_roles_delivery')
                            .select(
                                `
                                id,
                                delivery_company_id,
                                role,
                                delivery_companies!inner (
                                    company_name
                                )
                            `,
                            )
                            .eq('user_id', authUser.user.id);

                        if (isMounted) {
                            setUser({
                                ...profile,
                                role_name: profile.user_roles?.name || 'user',
                                shops: userShops || [],
                                delivery_companies: userDeliveryCompanies || [],
                            });
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                if (isMounted) {
                    setUser(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        getUser();

        return () => {
            isMounted = false;
        };
    }, []);

    // Helper functions for permission checking
    const hasRole = (role: string): boolean => {
        return user?.role_name === role;
    };

    const hasShopAccess = (shopId: number): boolean => {
        if (!user) return false;
        if (user.role_name === 'super_admin') return true;
        return user.shops.some((shop) => shop.shop_id === shopId);
    };

    const hasDeliveryAccess = (deliveryCompanyId: number): boolean => {
        if (!user) return false;
        if (user.role_name === 'super_admin') return true;
        return user.delivery_companies.some((dc) => dc.delivery_company_id === deliveryCompanyId);
    };

    const canAccessUsers = (): boolean => {
        if (!user) return false;
        if (user.role_name === 'super_admin') return true;
        if (user.shops && user.shops.length > 0) return true;
        if (user.delivery_companies && user.delivery_companies.length > 0) return true;
        return false;
    };

    const canAddUsers = (): boolean => {
        return canAccessUsers();
    };

    const canDeleteUsers = (): boolean => {
        return canAccessUsers();
    };

    const getAvailableRoles = (): string[] => {
        if (!user) return [];

        if (user.role_name === 'super_admin') {
            return ['super_admin', 'shop_owner', 'shop_editor', 'delivery_owner', 'driver', 'user'];
        }

        const roles = [];
        if (user.shops && user.shops.length > 0) {
            roles.push('shop_owner', 'shop_editor');
        }
        if (user.delivery_companies && user.delivery_companies.length > 0) {
            roles.push('delivery_owner', 'driver');
        }

        return roles;
    };

    const getAccessibleUserIds = async (): Promise<string[]> => {
        if (!user) return [];

        const userIds = new Set<string>();

        // If user has shop access
        if (user.shops && user.shops.length > 0) {
            const shopIds = user.shops.map((shop) => shop.shop_id);

            const { data: shopUsers } = await supabase.from('user_roles_shop').select('user_id').in('shop_id', shopIds);

            shopUsers?.forEach((su) => userIds.add(su.user_id));
        }

        // If user has delivery access
        if (user.delivery_companies && user.delivery_companies.length > 0) {
            const deliveryCompanyIds = user.delivery_companies.map((dc) => dc.delivery_company_id);

            const { data: deliveryUsers } = await supabase.from('user_roles_delivery').select('user_id').in('delivery_company_id', deliveryCompanyIds);

            deliveryUsers?.forEach((du) => userIds.add(du.user_id));
        }

        return Array.from(userIds);
    };

    return {
        user,
        loading,
        hasRole,
        hasShopAccess,
        hasDeliveryAccess,
        canAccessUsers,
        canAddUsers,
        canDeleteUsers,
        getAvailableRoles,
        getAccessibleUserIds,
    };
};

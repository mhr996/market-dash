'use client';
import PerfectScrollbar from 'react-perfect-scrollbar';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { toggleSidebar } from '@/store/themeConfigSlice';
import AnimateHeight from 'react-animate-height';
import { IRootState } from '@/store';
import { useState, useEffect } from 'react';
import IconCaretsDown from '@/components/icon/icon-carets-down';
import IconMenuDashboard from '@/components/icon/menu/icon-menu-dashboard';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconMinus from '@/components/icon/icon-minus';
import IconMenuChat from '@/components/icon/menu/icon-menu-chat';
import IconMenuMailbox from '@/components/icon/menu/icon-menu-mailbox';
import IconMenuTodo from '@/components/icon/menu/icon-menu-todo';
import IconMenuNotes from '@/components/icon/menu/icon-menu-notes';
import IconMenuScrumboard from '@/components/icon/menu/icon-menu-scrumboard';
import IconMenuContacts from '@/components/icon/menu/icon-menu-contacts';
import IconMenuInvoice from '@/components/icon/menu/icon-menu-invoice';
import IconMenuCalendar from '@/components/icon/menu/icon-menu-calendar';
import IconMenuComponents from '@/components/icon/menu/icon-menu-components';
import IconMenuElements from '@/components/icon/menu/icon-menu-elements';
import IconMenuCharts from '@/components/icon/menu/icon-menu-charts';
import IconMenuWidgets from '@/components/icon/menu/icon-menu-widgets';
import IconMenuFontIcons from '@/components/icon/menu/icon-menu-font-icons';
import IconMenuDragAndDrop from '@/components/icon/menu/icon-menu-drag-and-drop';
import IconMenuTables from '@/components/icon/menu/icon-menu-tables';
import IconMenuDatatables from '@/components/icon/menu/icon-menu-datatables';
import IconMenuForms from '@/components/icon/menu/icon-menu-forms';
import IconMenuUsers from '@/components/icon/menu/icon-menu-users';
import IconUser from '@/components/icon/icon-user';
import IconSettings from '@/components/icon/icon-settings';
import IconTruck from '@/components/icon/icon-truck';
import IconBuilding from '@/components/icon/icon-building';
import IconCar from '@/components/icon/icon-car';
import IconUsers from '@/components/icon/icon-users';

import IconMenuPages from '@/components/icon/menu/icon-menu-pages';
import IconMenuAuthentication from '@/components/icon/menu/icon-menu-authentication';
import IconMenuDocumentation from '@/components/icon/menu/icon-menu-documentation';
import { usePathname } from 'next/navigation';
import { getTranslation } from '@/i18n';
import IconTrendingUp from '../icon/icon-trending-up';
import { useAuth } from '@/hooks/useAuth';

const Sidebar = () => {
    const dispatch = useDispatch();
    const { t } = getTranslation();
    const pathname = usePathname();
    const { user, loading: authLoading } = useAuth();
    const [currentMenu, setCurrentMenu] = useState<string>('');
    const [errorSubMenu, setErrorSubMenu] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const semidark = useSelector((state: IRootState) => state.themeConfig.semidark);
    const toggleMenu = (value: string) => {
        setCurrentMenu((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };

    // Auto-collapse other menus when navigating to a different section
    const handleMenuClick = (menuName: string) => {
        // If clicking on a different menu, close others
        if (currentMenu !== menuName) {
            setCurrentMenu(menuName);
        } else {
            // If clicking on the same menu, toggle it
            setCurrentMenu('');
        }
    };

    // Optimize rendering by waiting for auth to complete
    useEffect(() => {
        if (!authLoading) {
            setIsReady(true);
        }
    }, [authLoading]);

    useEffect(() => {
        if (!isReady) return;

        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        if (selector) {
            selector.classList.add('active');
            const ul: any = selector.closest('ul.sub-menu');
            if (ul) {
                // Find the parent li element (could be li.menu or li.nav-item)
                const parentLi = ul.closest('li.menu') || ul.closest('li.nav-item');
                if (parentLi) {
                    let ele: any = parentLi.querySelectorAll('.nav-link') || [];
                    if (ele.length) {
                        ele = ele[0];
                        setTimeout(() => {
                            ele.click();
                        });
                    }
                }
            }
        }
    }, [isReady]);

    useEffect(() => {
        setActiveRoute();

        // Auto-expand menu based on current path
        if (pathname?.startsWith('/shops')) {
            setCurrentMenu('shops');
        } else if (pathname?.startsWith('/products')) {
            setCurrentMenu('products');
        } else if (pathname?.startsWith('/delivery')) {
            setCurrentMenu('delivery');
        } else if (pathname?.startsWith('/users')) {
            setCurrentMenu('users');
        } else if (pathname?.startsWith('/accounting')) {
            setCurrentMenu('accounting');
        } else if (pathname?.startsWith('/reports')) {
            setCurrentMenu('reports');
        } else if (pathname?.startsWith('/subscriptions')) {
            setCurrentMenu('subscriptions');
        } else {
            // If not in any submenu, close all
            setCurrentMenu('');
        }

        if (window.innerWidth < 1024 && themeConfig.sidebar) {
            dispatch(toggleSidebar());
        }
    }, [pathname]);

    const setActiveRoute = () => {
        let allLinks = document.querySelectorAll('.sidebar ul a.active');
        for (let i = 0; i < allLinks.length; i++) {
            const element = allLinks[i];
            element?.classList.remove('active');
        }
        const selector = document.querySelector('.sidebar ul a[href="' + window.location.pathname + '"]');
        selector?.classList.add('active');
    };

    // Don't render until auth is ready to prevent laggy rendering
    if (!isReady) {
        return (
            <div className={semidark ? 'dark' : ''}>
                <nav
                    className={`sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
                >
                    <div className="h-full bg-white dark:bg-black">
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    </div>
                </nav>
            </div>
        );
    }

    return (
        <div className={semidark ? 'dark' : ''}>
            <nav
                className={`sidebar fixed bottom-0 top-0 z-50 h-full min-h-screen w-[260px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-all duration-300 ${semidark ? 'text-white-dark' : ''}`}
            >
                <div className="h-full bg-white dark:bg-black">
                    <div className="flex items-center justify-between px-4 py-3">
                        <Link href="/" className="main-logo flex shrink-0 items-center">
                            <img className="ml-[5px] w-8 flex-none" src="/assets/images/logo.svg" alt="logo" />
                            <span className="align-middle text-2xl font-semibold ltr:ml-1.5 rtl:mr-1.5 dark:text-white-light lg:inline">PAZAR</span>
                        </Link>

                        <button
                            type="button"
                            className="collapse-icon flex h-8 w-8 items-center rounded-full transition duration-300 hover:bg-gray-500/10 rtl:rotate-180 dark:text-white-light dark:hover:bg-dark-light/10"
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <IconCaretsDown className="m-auto rotate-90" />
                        </button>
                    </div>
                    <PerfectScrollbar className="relative h-[calc(100vh-80px)]">
                        <ul className="relative space-y-0.5 p-4 py-0 font-semibold">
                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <IconMinus className="hidden h-5 w-4 flex-none" />
                                <span>{t('main')}</span>
                            </h2>

                            <li className="nav-item">
                                <ul>
                                    {/* Home - Only for super_admin and shop_owner */}
                                    {user?.role_name === 'super_admin' || user?.role_name === 'shop_owner' ? (
                                        <li className="nav-item">
                                            <Link href="/" className={`group ${pathname === '/' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                <div className="flex items-center">
                                                    <IconMenuDashboard className="shrink-0 group-hover:!text-primary" />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('home')}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    ) : null}
                                    {/* Shop section - Different views for different roles */}
                                    {(user?.role_name === 'super_admin' || (user?.role_name === 'shop_owner' && user?.shops && user.shops.length > 0)) && (
                                        <li className="nav-item">
                                            {user?.role_name === 'super_admin' ? (
                                                // Super admin gets full dropdown with categories
                                                <>
                                                    <button
                                                        type="button"
                                                        className={`${currentMenu === 'shops' ? 'active' : ''} nav-link group w-full ${pathname?.startsWith('/shops') ? 'bg-primary/10 text-primary' : ''}`}
                                                        onClick={() => handleMenuClick('shops')}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconBuilding className="shrink-0 group-hover:!text-primary" />
                                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('shops')}</span>
                                                        </div>
                                                        <div className={`${currentMenu !== 'shops' ? 'rotate-90' : ''} ltr:ml-auto rtl:mr-auto`}>
                                                            <IconCaretDown className="w-4 h-4" />
                                                        </div>
                                                    </button>
                                                    <AnimateHeight duration={300} height={currentMenu === 'shops' ? 'auto' : 0}>
                                                        <ul className="sub-menu [&>li>a]:before:content-none [&>li>button]:before:content-none">
                                                            <li>
                                                                <Link href="/shops" className={`group nav-link ${pathname === '/shops' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                                    <div className="flex items-center">
                                                                        <IconBuilding className="shrink-0 group-hover:!text-primary" />
                                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('shops')}</span>
                                                                    </div>
                                                                </Link>
                                                            </li>
                                                            <li>
                                                                <Link
                                                                    href="/shops/categories"
                                                                    className={`group nav-link ${pathname === '/shops/categories' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                                >
                                                                    <div className="flex items-center">
                                                                        <IconMenuTables className="shrink-0 group-hover:!text-primary" />
                                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Categories</span>
                                                                    </div>
                                                                </Link>
                                                            </li>
                                                            <li>
                                                                <Link
                                                                    href="/shops/categories/subcategories"
                                                                    className={`group nav-link ${pathname === '/shops/categories/subcategories' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                                >
                                                                    <div className="flex items-center">
                                                                        <IconMenuTables className="shrink-0 group-hover:!text-primary" />
                                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Sub Categories</span>
                                                                    </div>
                                                                </Link>
                                                            </li>
                                                        </ul>
                                                    </AnimateHeight>
                                                </>
                                            ) : (
                                                // Shop owner gets direct link (no dropdown, no categories)
                                                <Link href="/shops" className={`group ${pathname === '/shops' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                    <div className="flex items-center">
                                                        <IconBuilding className="shrink-0 group-hover:!text-primary" />
                                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('shops')}</span>
                                                    </div>
                                                </Link>
                                            )}
                                        </li>
                                    )}
                                    {/* Products section - Available to all roles */}
                                    <li className="nav-item">
                                        <button
                                            type="button"
                                            className={`${currentMenu === 'products' ? 'active' : ''} nav-link group w-full ${pathname?.startsWith('/products') ? 'bg-primary/10 text-primary' : ''}`}
                                            onClick={() => handleMenuClick('products')}
                                        >
                                            <div className="flex items-center">
                                                <IconMenuComponents className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('products')}</span>
                                            </div>
                                            <div className={`${currentMenu !== 'products' ? 'rotate-90' : ''} ltr:ml-auto rtl:mr-auto`}>
                                                <IconCaretDown className="w-4 h-4" />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'products' ? 'auto' : 0}>
                                            <ul className="sub-menu [&>li>a]:before:content-none [&>li>button]:before:content-none">
                                                <li>
                                                    <Link href="/products" className={`group nav-link ${pathname === '/products' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                        <div className="flex items-center">
                                                            <IconMenuComponents className="shrink-0 group-hover:!text-primary" />
                                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('products')}</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/products/categories"
                                                        className={`group nav-link ${pathname === '/products/categories' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconMenuTables className="shrink-0 group-hover:!text-primary" />
                                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Categories</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/products/subcategories"
                                                        className={`group nav-link ${pathname === '/products/subcategories' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconMenuTables className="shrink-0 group-hover:!text-primary" />
                                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Sub Categories</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/products/brands"
                                                        className={`group nav-link ${pathname === '/products/brands' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconMenuComponents className="shrink-0 group-hover:!text-primary" />
                                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Brands</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>
                                    {/* Orders section - Available to all roles */}
                                    <li className="nav-item">
                                        <Link href="/orders" className={`group ${pathname === '/orders' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                            <div className="flex items-center">
                                                <IconMenuNotes className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('orders')}</span>
                                            </div>
                                        </Link>
                                    </li>
                                    {/* Delivery section - Available to all roles */}
                                    <li className="nav-item">
                                        <button
                                            type="button"
                                            className={`${currentMenu === 'delivery' ? 'active' : ''} nav-link group w-full ${pathname?.startsWith('/delivery') ? 'bg-primary/10 text-primary' : ''}`}
                                            onClick={() => handleMenuClick('delivery')}
                                        >
                                            <div className="flex items-center">
                                                <IconTruck className="shrink-0 group-hover:!text-primary" />
                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Delivery</span>
                                            </div>
                                            <div className={`${currentMenu !== 'delivery' ? 'rotate-90' : ''} ltr:ml-auto rtl:mr-auto`}>
                                                <IconCaretDown className="w-4 h-4" />
                                            </div>
                                        </button>
                                        <AnimateHeight duration={300} height={currentMenu === 'delivery' ? 'auto' : 0}>
                                            <ul className="sub-menu [&>li>a]:before:content-none [&>li>button]:before:content-none">
                                                <li>
                                                    <Link
                                                        href="/delivery/companies"
                                                        className={`group nav-link ${pathname === '/delivery/companies' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconBuilding className="shrink-0 group-hover:!text-primary" />
                                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Companies</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/delivery/cars"
                                                        className={`group nav-link ${pathname === '/delivery/cars' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconTruck className="shrink-0 group-hover:!text-primary" />
                                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Cars</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/delivery/drivers"
                                                        className={`group nav-link ${pathname === '/delivery/drivers' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconUsers className="shrink-0 group-hover:!text-primary" />
                                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Drivers</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/delivery/orders"
                                                        className={`group nav-link ${pathname === '/delivery/orders' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconMenuNotes className="shrink-0 group-hover:!text-primary" />
                                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Orders</span>
                                                        </div>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </AnimateHeight>
                                    </li>
                                    {/* Accounting section - Only for super_admin */}
                                    {user?.role_name === 'super_admin' && (
                                        <li className="nav-item">
                                            <button
                                                type="button"
                                                className={`${currentMenu === 'accounting' ? 'active' : ''} nav-link group w-full ${pathname?.startsWith('/accounting') ? 'bg-primary/10 text-primary' : ''}`}
                                                onClick={() => handleMenuClick('accounting')}
                                            >
                                                <div className="flex items-center">
                                                    <IconMenuTables className="shrink-0 group-hover:!text-primary" />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Accounting</span>
                                                </div>
                                                <div className={`${currentMenu !== 'accounting' ? 'rotate-90' : ''} ltr:ml-auto rtl:mr-auto`}>
                                                    <IconCaretDown className="w-4 h-4" />
                                                </div>
                                            </button>
                                            <AnimateHeight duration={300} height={currentMenu === 'accounting' ? 'auto' : 0}>
                                                <ul className="sub-menu [&>li>a]:before:content-none [&>li>button]:before:content-none">
                                                    <li>
                                                        <Link
                                                            href="/accounting/receipts"
                                                            className={`group nav-link ${pathname === '/accounting/receipts' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                        >
                                                            <div className="flex items-center">
                                                                <IconMenuTables className="shrink-0 group-hover:!text-primary" />
                                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Receipts</span>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="/accounting/invoices"
                                                            className={`group nav-link ${pathname === '/accounting/invoices' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                        >
                                                            <div className="flex items-center">
                                                                <IconMenuTables className="shrink-0 group-hover:!text-primary" />
                                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Invoices</span>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                    <li>
                                                        <Link
                                                            href="/accounting/statements"
                                                            className={`group nav-link ${pathname === '/accounting/statements' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}
                                                        >
                                                            <div className="flex items-center">
                                                                <IconMenuTables className="shrink-0 group-hover:!text-primary" />
                                                                <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Statements</span>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </AnimateHeight>
                                        </li>
                                    )}
                                    {/* Revenue section - Only for super_admin and shop_owner */}
                                    {user?.role_name === 'super_admin' || user?.role_name === 'shop_owner' ? (
                                        <li className="nav-item">
                                            <Link href="/revenue" className={`group ${pathname === '/revenue' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                <div className="flex items-center">
                                                    <IconMenuCharts className="shrink-0 group-hover:!text-primary" />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('revenue')}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    ) : null}
                                    {/* Analytics - Only for super_admin and shop_owner */}
                                    {user?.role_name === 'super_admin' || user?.role_name === 'shop_owner' ? (
                                        <li className="nav-item">
                                            <Link href="/analytics" className={`group ${pathname === '/analytics' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                <div className="flex items-center">
                                                    <IconMenuCharts className="shrink-0 group-hover:!text-primary" />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('analytics')}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    ) : null}
                                    {/* Statistics section - Only for super_admin and shop_owner */}
                                    {user?.role_name === 'super_admin' || user?.role_name === 'shop_owner' ? (
                                        <li className="nav-item">
                                            <Link href="/statistics" className={`group ${pathname === '/statistics' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                <div className="flex items-center">
                                                    <IconTrendingUp className="shrink-0 group-hover:!text-primary" />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('statistics')}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    ) : null}
                                    {/* Reports section - Only for super_admin and shop_owner */}
                                    {user?.role_name === 'super_admin' || user?.role_name === 'shop_owner' ? (
                                        <li className="nav-item">
                                            <Link href="/reports" className={`group ${pathname === '/reports' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                <div className="flex items-center">
                                                    <IconMenuCharts className="shrink-0 group-hover:!text-primary" />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('reports')}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    ) : null}
                                </ul>
                            </li>

                            {/* Users section - Only show if user can see users or customers */}
                            {(user?.role_name === 'super_admin' || user?.role_name === 'shop_owner') && (
                                <>
                                    <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                        <IconMinus className="hidden h-5 w-4 flex-none" />
                                        <span>{t('user_and_pages')}</span>
                                    </h2>

                                    {/* Users section - Only for super_admin and shop_owner */}
                                    {user?.role_name === 'super_admin' || user?.role_name === 'shop_owner' ? (
                                        <li className="nav-item">
                                            <Link href="/users" className={`group ${pathname === '/users' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                <div className="flex items-center">
                                                    <IconMenuUsers className="shrink-0 group-hover:!text-primary" />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('users_list')}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    ) : null}
                                    {/* Customers List - Only for super_admin */}
                                    {user?.role_name === 'super_admin' && (
                                        <li className="nav-item">
                                            <Link href="/customers" className={`group ${pathname === '/customers' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                                <div className="flex items-center">
                                                    <IconUsers className="shrink-0 group-hover:!text-primary" />
                                                    <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">Customers</span>
                                                </div>
                                            </Link>
                                        </li>
                                    )}
                                </>
                            )}

                            <h2 className="-mx-4 mb-1 flex items-center bg-white-light/30 px-7 py-3 font-extrabold uppercase dark:bg-dark dark:bg-opacity-[0.08]">
                                <IconMinus className="hidden h-5 w-4 flex-none" />
                                <span>{t('settings')}</span>
                            </h2>

                            {/* <li className="nav-item">
                                <Link href="/settings" className={`group ${pathname === '/settings' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                    <div className="flex items-center">
                                        <IconSettings fill className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('general_settings')}</span>
                                    </div>
                                </Link>
                            </li> */}
                            <li className="nav-item">
                                <Link href="/account-settings" className={`group ${pathname === '/account-settings' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                    <div className="flex items-center">
                                        <IconUser fill className="shrink-0 group-hover:!text-primary" />
                                        <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('account_settings')}</span>
                                    </div>
                                </Link>
                            </li>
                            {/* Licenses - Only for super_admin and shop_owner */}
                            {user?.role_name === 'super_admin' || user?.role_name === 'shop_owner' ? (
                                <li className="nav-item">
                                    <Link href="/licenses" className={`group ${pathname === '/licenses' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                        <div className="flex items-center">
                                            <IconMenuDragAndDrop className="shrink-0 group-hover:!text-primary" />
                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('licenses')}</span>
                                        </div>
                                    </Link>
                                </li>
                            ) : null}
                            {/* Subscriptions - Only for super_admin and shop_owner */}
                            {user?.role_name === 'super_admin' || user?.role_name === 'shop_owner' ? (
                                <li className="nav-item">
                                    <Link href="/subscriptions" className={`group ${pathname === '/subscriptions' ? 'bg-primary/5 text-primary border-r-2 border-primary' : ''}`}>
                                        <div className="flex items-center">
                                            <IconMenuDatatables className="shrink-0 group-hover:!text-primary" />
                                            <span className="text-black ltr:pl-3 rtl:pr-3 dark:text-[#506690] dark:group-hover:text-white-dark">{t('subscriptions')}</span>
                                        </div>
                                    </Link>
                                </li>
                            ) : null}
                        </ul>
                    </PerfectScrollbar>
                </div>
            </nav>
        </div>
    );
};

export default Sidebar;

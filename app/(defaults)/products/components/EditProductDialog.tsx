'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import supabase from '@/lib/supabase';
import IconX from '@/components/icon/icon-x';
import IconLink from '@/components/icon/icon-link';
import IconCalendar from '@/components/icon/icon-calendar';
import IconCaretDown from '@/components/icon/icon-caret-down';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';

interface Shop {
    id: string;
    shop_name: string;
}

interface Category {
    id: number;
    title: string;
    desc: string;
}

interface SubCategory {
    id: number;
    title: string;
    desc: string;
    category_id: number;
}

interface Brand {
    id: number;
    brand: string;
    description: string;
    image_url?: string;
}

interface Product {
    id: string;
    title: string;
    desc: string | null;
    price: number;
    shop: string;
    category: number | null;
    subcategory_id: number | null;
    brand_id: number | null;
    active: boolean;
    onsale: boolean;
    created_at: string;
    updated_at: string;
}

interface EditProductDialogProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    onSuccess: () => void;
}

const EditProductDialog: React.FC<EditProductDialogProps> = React.memo(({ isOpen, onClose, product, onSuccess }) => {
    const { t } = getTranslation();
    const [form, setForm] = useState({
        title: '',
        desc: '',
        price: '',
        shop: '',
        category: '',
        subcategory: '',
        brand: '',
        active: true,
        onsale: false,
    });
    const [shops, setShops] = useState<Shop[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });

    // Sale price states
    const [hasSalePrice, setHasSalePrice] = useState(false);
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [finalPrice, setFinalPrice] = useState<number | null>(null);
    const [discountStart, setDiscountStart] = useState<Date | null>(null);
    const [discountEnd, setDiscountEnd] = useState<Date | null>(null);

    // Dropdown states
    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [isSubcategoryDropdownOpen, setIsSubcategoryDropdownOpen] = useState(false);
    const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState({
        shop: '',
        category: '',
        subcategory: '',
        brand: '',
    });

    // Refs for dropdowns
    const shopRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);
    const subcategoryRef = useRef<HTMLDivElement>(null);
    const brandRef = useRef<HTMLDivElement>(null);

    // Fetch data on component mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch shops
                const { data: shopsData } = await supabase.from('shops').select('id, shop_name').order('shop_name');
                setShops(shopsData || []);

                // Fetch categories
                const { data: categoriesData } = await supabase.from('categories').select('*').order('title');
                setCategories(categoriesData || []);

                // Fetch subcategories
                const { data: subcategoriesData } = await supabase.from('categories_sub').select('*').order('title');
                setSubcategories(subcategoriesData || []);

                // Fetch brands
                const { data: brandsData } = await supabase.from('categories_brands').select('*').order('brand');
                setBrands(brandsData || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (product) {
            setForm({
                title: product.title || '',
                desc: product.desc || '',
                price: product.price?.toString() || '',
                shop: product.shop || '',
                category: product.category?.toString() || '',
                subcategory: product.subcategory_id?.toString() || '',
                brand: product.brand_id?.toString() || '',
                active: product.active ?? true,
                onsale: product.onsale ?? false,
            });
            setHasSalePrice(product.onsale ?? false);
        }
    }, [product]);

    // Sync onsale field with hasSalePrice state
    useEffect(() => {
        setForm((prev) => ({ ...prev, onsale: hasSalePrice }));
    }, [hasSalePrice]);

    // Calculate discount price whenever price or discount changes
    useEffect(() => {
        if (hasSalePrice && form.price && discountValue) {
            const basePrice = parseFloat(form.price);
            if (discountType === 'percentage') {
                const percentage = parseFloat(discountValue);
                if (percentage >= 0 && percentage <= 100) {
                    const discountAmount = basePrice * (percentage / 100);
                    setFinalPrice(parseFloat((basePrice - discountAmount).toFixed(2)));
                } else {
                    setFinalPrice(null);
                }
            } else {
                const fixedDiscount = parseFloat(discountValue);
                if (fixedDiscount >= 0 && fixedDiscount < basePrice) {
                    setFinalPrice(parseFloat((basePrice - fixedDiscount).toFixed(2)));
                } else {
                    setFinalPrice(null);
                }
            }
        } else {
            setFinalPrice(null);
        }
    }, [hasSalePrice, form.price, discountType, discountValue]);

    // Handle click outside for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shopRef.current && !shopRef.current.contains(event.target as Node)) {
                setIsShopDropdownOpen(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
            if (subcategoryRef.current && !subcategoryRef.current.contains(event.target as Node)) {
                setIsSubcategoryDropdownOpen(false);
            }
            if (brandRef.current && !brandRef.current.contains(event.target as Node)) {
                setIsBrandDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter subcategories based on selected category - memoized for performance
    const filteredSubcategories = useMemo(() => {
        return subcategories.filter(
            (subcategory) => subcategory.title.toLowerCase().includes(searchTerm.subcategory.toLowerCase()) && (!form.category || subcategory.category_id.toString() === form.category),
        );
    }, [subcategories, searchTerm.subcategory, form.category]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!product) return;

            setLoading(true);
            try {
                const updateData: any = {
                    title: form.title,
                    desc: form.desc || null,
                    price: parseFloat(form.price) || 0,
                    shop: form.shop || null,
                    category: form.category ? parseInt(form.category) : null,
                    subcategory_id: form.subcategory ? parseInt(form.subcategory) : null,
                    brand_id: form.brand ? parseInt(form.brand) : null,
                    active: form.active,
                    onsale: form.onsale,
                    sale_price: hasSalePrice && finalPrice ? finalPrice : null,
                    discount_type: hasSalePrice ? discountType : null,
                    discount_value: hasSalePrice && discountValue ? parseFloat(discountValue) : null,
                    discount_start: hasSalePrice && discountStart ? discountStart.toISOString() : null,
                    discount_end: hasSalePrice && discountEnd ? discountEnd.toISOString() : null,
                };

                const { error } = await supabase.from('products').update(updateData).eq('id', product.id);

                if (error) throw error;

                setAlert({ visible: true, message: t('product_updated_successfully'), type: 'success' });
                onSuccess();
                setTimeout(() => {
                    onClose();
                }, 1500);
            } catch (error: any) {
                setAlert({ visible: true, message: error.message || t('error_updating_product'), type: 'danger' });
            } finally {
                setLoading(false);
            }
        },
        [product, form, hasSalePrice, finalPrice, discountType, discountValue, discountStart, discountEnd, onSuccess, onClose, t],
    );

    const handleOpenFullEdit = useCallback(() => {
        if (product) {
            window.open(`/products/edit/${product.id}`, '_blank');
        }
    }, [product]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('edit_product')}</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOpenFullEdit}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            <IconLink className="h-4 w-4 mr-1" />
                            {t('open_full_edit')}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <IconX className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-hidden">
                    {alert.visible && (
                        <div className="mb-4">
                            <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
                        {/* Basic Information */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('title')} <span className="text-red-500">*</span>
                            </label>
                            <input id="title" name="title" type="text" value={form.title} onChange={handleInputChange} placeholder={t('enter_title')} required className="form-input w-full" />
                        </div>

                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('price')} <span className="text-red-500">*</span>
                            </label>
                            <input
                                id="price"
                                name="price"
                                type="number"
                                step="0.01"
                                value={form.price}
                                onChange={handleInputChange}
                                placeholder={t('enter_price')}
                                required
                                className="form-input w-full"
                            />
                        </div>

                        {/* Sale Price Section */}
                        <div className="space-y-3">
                            <div className="flex items-center">
                                <input type="checkbox" id="hasSalePrice" checked={hasSalePrice} onChange={(e) => setHasSalePrice(e.target.checked)} className="form-checkbox" />
                                <label htmlFor="hasSalePrice" className="ml-2 text-sm font-medium text-gray-700 dark:text-white">
                                    {t('enable_sale_price')}
                                </label>
                            </div>

                            {hasSalePrice && (
                                <div className="space-y-3 pl-6 border-l-2 border-gray-200 dark:border-gray-600">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('discount_type')}</label>
                                            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')} className="form-select w-full">
                                                <option value="percentage">{t('percentage')}</option>
                                                <option value="fixed">{t('fixed_amount')}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                                {t('discount_value')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={discountValue}
                                                onChange={(e) => setDiscountValue(e.target.value)}
                                                placeholder={discountType === 'percentage' ? '10' : '5.00'}
                                                className="form-input w-full"
                                            />
                                        </div>
                                    </div>

                                    {finalPrice && (
                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <p className="text-sm text-green-700 dark:text-green-300">
                                                <span className="font-medium">{t('final_price')}:</span> ${finalPrice.toFixed(2)}
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('discount_start')}</label>
                                            <Flatpickr
                                                value={discountStart || undefined}
                                                onChange={(dates) => setDiscountStart(dates[0] || null)}
                                                options={{
                                                    dateFormat: 'Y-m-d',
                                                    enableTime: false,
                                                }}
                                                className="form-input w-full"
                                                data-placeholder={t('select_start_date')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('discount_end')}</label>
                                            <Flatpickr
                                                value={discountEnd || undefined}
                                                onChange={(dates) => setDiscountEnd(dates[0] || null)}
                                                options={{
                                                    dateFormat: 'Y-m-d',
                                                    enableTime: false,
                                                }}
                                                className="form-input w-full"
                                                data-placeholder={t('select_end_date')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="desc" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                                {t('description')}
                            </label>
                            <textarea id="desc" name="desc" value={form.desc} onChange={handleInputChange} placeholder={t('enter_description')} rows={2} className="form-textarea w-full" />
                        </div>

                        {/* Shop Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('shop')}</label>
                            <div className="relative" ref={shopRef}>
                                <div className="form-input w-full cursor-pointer flex items-center justify-between" onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}>
                                    <span>{form.shop ? shops.find((s) => s.id === form.shop)?.shop_name : t('select_shop')}</span>
                                    <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isShopDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                                {isShopDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        <div className="p-2">
                                            <input
                                                type="text"
                                                placeholder={t('search_shop')}
                                                value={searchTerm.shop}
                                                onChange={(e) => setSearchTerm((prev) => ({ ...prev, shop: e.target.value }))}
                                                className="form-input w-full mb-2"
                                            />
                                        </div>
                                        <div className="py-1">
                                            <button
                                                type="button"
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={() => {
                                                    setForm((prev) => ({ ...prev, shop: '' }));
                                                    setIsShopDropdownOpen(false);
                                                }}
                                            >
                                                {t('clear_selection')}
                                            </button>
                                            {shops
                                                .filter((shop) => shop.shop_name.toLowerCase().includes(searchTerm.shop.toLowerCase()))
                                                .map((shop) => (
                                                    <button
                                                        key={shop.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        onClick={() => {
                                                            setForm((prev) => ({ ...prev, shop: shop.id }));
                                                            setIsShopDropdownOpen(false);
                                                        }}
                                                    >
                                                        {shop.shop_name}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Category Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('category')}</label>
                            <div className="relative" ref={categoryRef}>
                                <div className="form-input w-full cursor-pointer flex items-center justify-between" onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}>
                                    <span>{form.category ? categories.find((c) => c.id.toString() === form.category)?.title : t('select_category')}</span>
                                    <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                                {isCategoryDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        <div className="p-2">
                                            <input
                                                type="text"
                                                placeholder={t('search_category')}
                                                value={searchTerm.category}
                                                onChange={(e) => setSearchTerm((prev) => ({ ...prev, category: e.target.value }))}
                                                className="form-input w-full mb-2"
                                            />
                                        </div>
                                        <div className="py-1">
                                            <button
                                                type="button"
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={() => {
                                                    setForm((prev) => ({ ...prev, category: '', subcategory: '' }));
                                                    setIsCategoryDropdownOpen(false);
                                                }}
                                            >
                                                {t('clear_selection')}
                                            </button>
                                            {categories
                                                .filter((category) => category.title.toLowerCase().includes(searchTerm.category.toLowerCase()))
                                                .map((category) => (
                                                    <button
                                                        key={category.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        onClick={() => {
                                                            setForm((prev) => ({ ...prev, category: category.id.toString(), subcategory: '' }));
                                                            setIsCategoryDropdownOpen(false);
                                                        }}
                                                    >
                                                        {category.title}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Subcategory Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('subcategory')}</label>
                            <div className="relative" ref={subcategoryRef}>
                                <div className="form-input w-full cursor-pointer flex items-center justify-between" onClick={() => setIsSubcategoryDropdownOpen(!isSubcategoryDropdownOpen)}>
                                    <span>{form.subcategory ? filteredSubcategories.find((s) => s.id.toString() === form.subcategory)?.title : t('select_subcategory')}</span>
                                    <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isSubcategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                                {isSubcategoryDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        <div className="p-2">
                                            <input
                                                type="text"
                                                placeholder={t('search_subcategory')}
                                                value={searchTerm.subcategory}
                                                onChange={(e) => setSearchTerm((prev) => ({ ...prev, subcategory: e.target.value }))}
                                                className="form-input w-full mb-2"
                                            />
                                        </div>
                                        <div className="py-1">
                                            <button
                                                type="button"
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={() => {
                                                    setForm((prev) => ({ ...prev, subcategory: '' }));
                                                    setIsSubcategoryDropdownOpen(false);
                                                }}
                                            >
                                                {t('clear_selection')}
                                            </button>
                                            {filteredSubcategories.map((subcategory) => (
                                                <button
                                                    key={subcategory.id}
                                                    type="button"
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    onClick={() => {
                                                        setForm((prev) => ({ ...prev, subcategory: subcategory.id.toString() }));
                                                        setIsSubcategoryDropdownOpen(false);
                                                    }}
                                                >
                                                    {subcategory.title}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Brand Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{t('brand')}</label>
                            <div className="relative" ref={brandRef}>
                                <div className="form-input w-full cursor-pointer flex items-center justify-between" onClick={() => setIsBrandDropdownOpen(!isBrandDropdownOpen)}>
                                    <span>{form.brand ? brands.find((b) => b.id.toString() === form.brand)?.brand : t('select_brand')}</span>
                                    <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isBrandDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>
                                {isBrandDropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        <div className="p-2">
                                            <input
                                                type="text"
                                                placeholder={t('search_brand')}
                                                value={searchTerm.brand}
                                                onChange={(e) => setSearchTerm((prev) => ({ ...prev, brand: e.target.value }))}
                                                className="form-input w-full mb-2"
                                            />
                                        </div>
                                        <div className="py-1">
                                            <button
                                                type="button"
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={() => {
                                                    setForm((prev) => ({ ...prev, brand: '' }));
                                                    setIsBrandDropdownOpen(false);
                                                }}
                                            >
                                                {t('clear_selection')}
                                            </button>
                                            {brands
                                                .filter((brand) => brand.brand.toLowerCase().includes(searchTerm.brand.toLowerCase()))
                                                .map((brand) => (
                                                    <button
                                                        key={brand.id}
                                                        type="button"
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        onClick={() => {
                                                            setForm((prev) => ({ ...prev, brand: brand.id.toString() }));
                                                            setIsBrandDropdownOpen(false);
                                                        }}
                                                    >
                                                        {brand.brand}
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Checkboxes */}
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                                <input type="checkbox" name="active" checked={form.active} onChange={handleInputChange} className="form-checkbox" />
                                <span className="ml-2 text-sm text-gray-700 dark:text-white">{t('active')}</span>
                            </label>
                            <label className="flex items-center">
                                <input type="checkbox" name="onsale" checked={form.onsale} onChange={handleInputChange} className="form-checkbox" />
                                <span className="ml-2 text-sm text-gray-700 dark:text-white">{t('on_sale')}</span>
                            </label>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={onClose} disabled={loading} className="btn btn-outline-danger">
                                {t('cancel')}
                            </button>
                            <button type="submit" disabled={loading} className="btn btn-primary">
                                {loading ? t('saving') : t('save_changes')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
});

EditProductDialog.displayName = 'EditProductDialog';

export default EditProductDialog;

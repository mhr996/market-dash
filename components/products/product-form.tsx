'use client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import React, { useEffect, useState, useRef } from 'react';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import ImprovedImageUpload from '@/components/image-upload/improved-image-upload';
import StorageManager from '@/utils/storage-manager';
import IconX from '@/components/icon/icon-x';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUpload from '@/components/icon/icon-camera';
import IconCalendar from '@/components/icon/icon-calendar';
import AnimateHeight from 'react-animate-height';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';
import { getTranslation } from '@/i18n';
import Tabs from '@/components/tabs';
import ProductFeatures from '@/components/products/product-features';

interface Shop {
    id: string;
    shop_name: string;
}

interface Category {
    id: number;
    title: string;
    desc: string;
}

interface Feature {
    label: string;
    value: string;
}

interface ProductFormProps {
    productId?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({ productId }) => {
    const router = useRouter();
    const { t } = getTranslation();
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const [loading, setLoading] = useState(false);
    const [shops, setShops] = useState<Shop[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [alert, setAlert] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

    // Tab state
    const [activeTab, setActiveTab] = useState(0);

    // Features state
    const [features, setFeatures] = useState<Feature[]>([]);

    // Temporary file storage for product images when creating new products
    const [tempImageFiles, setTempImageFiles] = useState<File[]>([]);

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
    const [searchTerm, setSearchTerm] = useState({ shop: '', category: '' });
    const shopRef = useRef<HTMLDivElement>(null);
    const categoryRef = useRef<HTMLDivElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        desc: '',
        price: '',
        shop: '',
        category: '',
        active: true, // Default to active
    });

    // New category form state
    const [newCategory, setNewCategory] = useState({
        title: '',
        desc: '',
    });
    const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

    // Cleanup blob URLs on component unmount
    useEffect(() => {
        return () => {
            previewUrls.forEach((url) => {
                if (url.startsWith('blob:')) {
                    URL.revokeObjectURL(url);
                }
            });
        };
    }, [previewUrls]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shopRef.current && !shopRef.current.contains(event.target as Node)) {
                setIsShopDropdownOpen(false);
            }
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch all shops (admin can assign any shop to any product)
                const { data: allShops } = await supabase.from('shops').select('id, shop_name').order('shop_name', { ascending: true });
                if (allShops) setShops(allShops);

                // Fetch categories
                const { data: categoriesData } = await supabase.from('categories').select('*').order('title', { ascending: true });
                if (categoriesData) setCategories(categoriesData);

                // If editing, fetch product data
                if (productId) {
                    const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();

                    if (product) {
                        setFormData({
                            title: product.title,
                            desc: product.desc,
                            price: product.price,
                            shop: product.shop,
                            category: product.category?.toString() || '',
                            active: product.active !== undefined ? product.active : true,
                        });
                        setPreviewUrls(product.images || []);

                        // Load features
                        setFeatures(product.features || []);

                        // Set sale price state if available
                        if (product.sale_price) {
                            setHasSalePrice(true);
                            setFinalPrice(product.sale_price);

                            // Determine discount type and value
                            if (product.discount_type === 'percentage') {
                                setDiscountType('percentage');
                                setDiscountValue(product.discount_value?.toString() || '');
                            } else {
                                setDiscountType('fixed');
                                setDiscountValue(product.discount_value?.toString() || '');
                            }

                            // Set discount time period if available
                            if (product.discount_start) {
                                setDiscountStart(new Date(product.discount_start));
                            }

                            if (product.discount_end) {
                                setDiscountEnd(new Date(product.discount_end));
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setAlert({ type: 'danger', message: t('error_loading_data') });
            }
        };

        fetchData();
    }, [productId]);

    // Calculate discount price whenever price or discount changes
    useEffect(() => {
        if (hasSalePrice && formData.price && discountValue) {
            const basePrice = parseFloat(formData.price);
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
    }, [hasSalePrice, formData.price, discountType, discountValue]);

    // Handle image uploads for both add and edit modes
    const handleImagesUploaded = (url: string | string[]) => {
        if (Array.isArray(url)) {
            setPreviewUrls(url);
        } else {
            setPreviewUrls([url]);
        }
    };

    // Handle temporary file storage for new products
    const handleTempImageUpload = (files: FileList) => {
        const fileArray = Array.from(files);
        setTempImageFiles((prev) => [...prev, ...fileArray]);

        // Create preview URLs
        const newPreviewUrls = fileArray.map((file) => URL.createObjectURL(file));
        setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    };

    // Remove temporary image
    const removeTempImage = (index: number) => {
        // Revoke the blob URL to prevent memory leaks
        if (previewUrls[index] && previewUrls[index].startsWith('blob:')) {
            URL.revokeObjectURL(previewUrls[index]);
        }

        setTempImageFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    };

    const filteredShops = shops.filter((shop) => shop.shop_name.toLowerCase().includes(searchTerm.shop.toLowerCase()));

    const filteredCategories = categories.filter((category) => category.title.toLowerCase().includes(searchTerm.category.toLowerCase()));

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase.from('categories').insert([newCategory]).select().single();

            if (error) throw error;

            setCategories((prev) => [...prev, data]);
            setFormData((prev) => ({ ...prev, category: data.id.toString() }));
            setShowNewCategoryForm(false);
            setNewCategory({ title: '', desc: '' });
            setAlert({ type: 'success', message: 'Category created successfully' });
        } catch (error) {
            console.error('Error creating category:', error);
            setAlert({ type: 'danger', message: 'Error creating category' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.title?.trim()) {
            setAlert({ type: 'danger', message: t('title_required') });
            return;
        }

        if (!formData.price) {
            setAlert({ type: 'danger', message: t('price_required') });
            return;
        }

        if (!formData.shop) {
            setAlert({ type: 'danger', message: t('shop_selection_required') });
            return;
        }

        if (!previewUrls.length) {
            setAlert({ type: 'danger', message: t('image_required') });
            return;
        }

        // Validate sale price if enabled
        if (hasSalePrice) {
            if (!discountValue || parseFloat(discountValue) <= 0) {
                setAlert({ type: 'danger', message: 'Please enter a valid discount value' });
                return;
            }

            if (discountType === 'percentage' && parseFloat(discountValue) > 100) {
                setAlert({ type: 'danger', message: 'Percentage discount cannot exceed 100%' });
                return;
            }

            if (discountType === 'fixed' && parseFloat(discountValue) >= parseFloat(formData.price)) {
                setAlert({ type: 'danger', message: 'Fixed discount cannot be equal to or greater than the product price' });
                return;
            }
        }

        setLoading(true);
        try {
            let finalImageUrls: string[] = [];

            if (productId) {
                // Edit mode: use existing previewUrls (already uploaded via ImprovedImageUpload)
                finalImageUrls = previewUrls;
            } else {
                // Add mode: upload temporary files first
                if (tempImageFiles.length > 0 && formData.shop) {
                    // Create a temporary product to get an ID for the folder structure
                    const tempProductData = {
                        title: formData.title,
                        desc: formData.desc,
                        price: parseFloat(formData.price),
                        shop: formData.shop,
                        category: formData.category ? parseInt(formData.category) : null,
                        images: [], // Empty initially
                        features: features,
                        sale_price: hasSalePrice && finalPrice ? finalPrice : null,
                        discount_type: hasSalePrice ? discountType : null,
                        discount_value: hasSalePrice && discountValue ? parseFloat(discountValue) : null,
                        discount_start: hasSalePrice && discountStart ? discountStart.toISOString() : null,
                        discount_end: hasSalePrice && discountEnd ? discountEnd.toISOString() : null,
                        active: formData.active,
                    };

                    // Insert product first to get ID
                    const { data: newProduct, error: insertError } = await supabase.from('products').insert([tempProductData]).select().single();

                    if (insertError) throw insertError;

                    // Now upload images using the product ID
                    const uploadResults = await StorageManager.uploadProductImages(parseInt(formData.shop), newProduct.id, tempImageFiles);

                    // Collect successful upload URLs
                    for (const result of uploadResults) {
                        if (result.success && result.url) {
                            finalImageUrls.push(result.url);
                        }
                    }

                    // Update the product with image URLs
                    const { error: updateError } = await supabase.from('products').update({ images: finalImageUrls }).eq('id', newProduct.id);

                    if (updateError) throw updateError;

                    setAlert({ type: 'success', message: t('product_created_successfully') });

                    // Reset form
                    setFormData({
                        title: '',
                        desc: '',
                        price: '',
                        shop: '',
                        category: '',
                        active: true,
                    });
                    setPreviewUrls([]);
                    setTempImageFiles([]);
                    setHasSalePrice(false);
                    setDiscountValue('');
                    setFinalPrice(null);

                    // Redirect to products page after creating a new product
                    setTimeout(() => {
                        router.push('/products');
                    }, 1500);

                    return; // Exit early for add mode
                } else {
                    // No images to upload for new product, create directly
                    const productDataNoImages = {
                        title: formData.title,
                        desc: formData.desc,
                        price: parseFloat(formData.price),
                        shop: formData.shop,
                        category: formData.category ? parseInt(formData.category) : null,
                        images: [],
                        sale_price: hasSalePrice && finalPrice ? finalPrice : null,
                        discount_type: hasSalePrice ? discountType : null,
                        discount_value: hasSalePrice && discountValue ? parseFloat(discountValue) : null,
                        discount_start: hasSalePrice && discountStart ? discountStart.toISOString() : null,
                        discount_end: hasSalePrice && discountEnd ? discountEnd.toISOString() : null,
                        active: formData.active,
                    };

                    const { error } = await supabase.from('products').insert([productDataNoImages]);
                    if (error) throw error;

                    setAlert({ type: 'success', message: t('product_created_successfully') });

                    // Reset form
                    setFormData({
                        title: '',
                        desc: '',
                        price: '',
                        shop: '',
                        category: '',
                        active: true,
                    });
                    setPreviewUrls([]);
                    setTempImageFiles([]);
                    setHasSalePrice(false);
                    setDiscountValue('');
                    setFinalPrice(null);

                    // Redirect to products page after creating a new product
                    setTimeout(() => {
                        router.push('/products');
                    }, 1500);

                    return; // Exit early for add mode
                }
            }

            // This section is only for edit mode now
            if (productId) {
                const productData = {
                    title: formData.title,
                    desc: formData.desc,
                    price: parseFloat(formData.price),
                    shop: formData.shop,
                    category: formData.category ? parseInt(formData.category) : null,
                    images: finalImageUrls,
                    features: features,
                    sale_price: hasSalePrice && finalPrice ? finalPrice : null,
                    discount_type: hasSalePrice ? discountType : null,
                    discount_value: hasSalePrice && discountValue ? parseFloat(discountValue) : null,
                    discount_start: hasSalePrice && discountStart ? discountStart.toISOString() : null,
                    discount_end: hasSalePrice && discountEnd ? discountEnd.toISOString() : null,
                    active: formData.active,
                };
                try {
                    // First try with a direct update
                    const { error } = await supabase.from('products').update(productData).eq('id', productId);

                    if (error) throw error;

                    // Wait a moment to ensure the update is processed
                    await new Promise((resolve) => setTimeout(resolve, 500));

                    // Check if the update was successful by fetching the product separately
                    const { data: updatedProduct, error: fetchError } = await supabase.from('products').select('*').eq('id', productId).single();

                    if (fetchError) throw fetchError;

                    // Check if the data was actually updated
                    if (updatedProduct.title !== productData.title || updatedProduct.desc !== productData.desc || updatedProduct.price !== productData.price) {
                        console.log('Data mismatch detected, trying upsert instead');

                        // If the data doesn't match, try an upsert operation instead
                        const { error: upsertError } = await supabase.from('products').upsert({
                            id: parseInt(productId),
                            ...productData,
                        });

                        if (upsertError) throw upsertError;

                        // Verify the upsert worked
                        const { data: upsertedProduct, error: upsertFetchError } = await supabase.from('products').select('*').eq('id', productId).single();

                        if (upsertFetchError) throw upsertFetchError;

                        console.log('Upserted product data:', upsertedProduct);

                        // Update form with upserted data
                        setFormData({
                            title: upsertedProduct.title,
                            desc: upsertedProduct.desc,
                            price: upsertedProduct.price.toString(),
                            shop: upsertedProduct.shop,
                            category: upsertedProduct.category?.toString() || '',
                            active: upsertedProduct.active,
                        });
                        setPreviewUrls(upsertedProduct.images || []);
                        setFeatures(upsertedProduct.features || []);

                        // Update sale price data
                        if (upsertedProduct.sale_price) {
                            setHasSalePrice(true);
                            setFinalPrice(upsertedProduct.sale_price);
                            setDiscountType(upsertedProduct.discount_type);
                            setDiscountValue(upsertedProduct.discount_value?.toString() || '');
                        } else {
                            setHasSalePrice(false);
                            setFinalPrice(null);
                            setDiscountValue('');
                        }
                    } else {
                        setFormData({
                            title: updatedProduct.title,
                            desc: updatedProduct.desc,
                            price: updatedProduct.price.toString(),
                            shop: updatedProduct.shop,
                            category: updatedProduct.category?.toString() || '',
                            active: updatedProduct.active,
                        });
                        setPreviewUrls(updatedProduct.images || []);
                        setFeatures(updatedProduct.features || []);

                        // Update sale price data
                        if (updatedProduct.sale_price) {
                            setHasSalePrice(true);
                            setFinalPrice(updatedProduct.sale_price);
                            setDiscountType(updatedProduct.discount_type);
                            setDiscountValue(updatedProduct.discount_value?.toString() || '');
                        } else {
                            setHasSalePrice(false);
                            setFinalPrice(null);
                            setDiscountValue('');
                        }
                    }
                } catch (error) {
                    console.error('Error updating product:', error);
                    throw error;
                }

                setAlert({ type: 'success', message: t('product_updated_successfully') });
            }
        } catch (error) {
            console.error('Error saving product:', error);
            setAlert({ type: 'danger', message: error instanceof Error ? error.message : 'Error saving product' });
        } finally {
            setLoading(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const tabs = [
        { name: t('basic_information'), icon: 'info-circle' },
        { name: t('features'), icon: 'list-check' },
    ];

    return (
        <div className="panel">
            {alert && <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />}

            {/* Tabs */}
            <Tabs tabs={tabs} activeTab={activeTab} onTabClick={setActiveTab} />

            <form onSubmit={handleSubmit} className="space-y-5 mt-6">
                {/* Tab Content */}
                {activeTab === 0 && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="title">{t('title')}</label>
                                <input
                                    id="title"
                                    type="text"
                                    name="title"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="price">{t('price')}</label>
                                <input
                                    id="price"
                                    type="number"
                                    name="price"
                                    step="0.01"
                                    className="form-input"
                                    value={formData.price}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                                    required
                                />
                            </div>

                            {/* Sale Price Toggle and Options */}
                            <div className="space-y-4 border-2 border-dashed border-gray-200 p-4 rounded-lg dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <label htmlFor="hasSalePrice" className="font-medium flex items-center cursor-pointer">
                                        <input
                                            id="hasSalePrice"
                                            type="checkbox"
                                            className="form-checkbox mr-2"
                                            checked={hasSalePrice}
                                            onChange={(e) => {
                                                setHasSalePrice(e.target.checked);
                                                if (!e.target.checked) {
                                                    setDiscountValue('');
                                                    setFinalPrice(null);
                                                }
                                            }}
                                        />
                                        {t('enable_sale_price')}
                                    </label>
                                </div>

                                <AnimateHeight duration={300} height={hasSalePrice ? 'auto' : 0}>
                                    {hasSalePrice && (
                                        <div className="space-y-4 mt-2">
                                            <div>
                                                <label className="block mb-2">{t('discount_type')}</label>
                                                <div className="flex gap-4">
                                                    <label className="inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            className="form-radio"
                                                            name="discountType"
                                                            checked={discountType === 'percentage'}
                                                            onChange={() => setDiscountType('percentage')}
                                                        />
                                                        <span className="ml-2">{t('percentage')}</span>
                                                    </label>
                                                    <label className="inline-flex items-center cursor-pointer">
                                                        <input type="radio" className="form-radio" name="discountType" checked={discountType === 'fixed'} onChange={() => setDiscountType('fixed')} />
                                                        <span className="ml-2">{t('fixed')}</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div>
                                                <label htmlFor="discountValue">{discountType === 'percentage' ? t('percentage_discount') : t('fixed_discount')}</label>
                                                <input
                                                    id="discountValue"
                                                    type="number"
                                                    name="discountValue"
                                                    step="0.01"
                                                    className="form-input"
                                                    value={discountValue}
                                                    onChange={(e) => setDiscountValue(e.target.value)}
                                                    min="0"
                                                    max={discountType === 'percentage' ? '100' : formData.price || '999999'}
                                                    required={hasSalePrice}
                                                />
                                            </div>

                                            {finalPrice !== null && formData.price && (
                                                <div className="flex items-center gap-4 text-lg">
                                                    <div className="font-medium">{t('final_price')}:</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-danger line-through">{parseFloat(formData.price).toFixed(2)}</span>
                                                        <span className="font-bold text-success">{finalPrice.toFixed(2)}</span>
                                                        {discountType === 'percentage' && (
                                                            <span className="bg-success text-white px-2 py-0.5 text-xs rounded-full">
                                                                {discountValue}% {t('off')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                <div>
                                                    <label htmlFor="discountStart">{t('discount_start_date')}</label>
                                                    <div className="relative">
                                                        <Flatpickr
                                                            options={{
                                                                enableTime: true,
                                                                dateFormat: 'Y-m-d H:i',
                                                                minDate: 'today',
                                                                position: isRtl ? 'auto right' : 'auto left',
                                                                static: true,
                                                                disableMobile: true,
                                                                time_24hr: true,
                                                            }}
                                                            className="form-input text-sm pr-10"
                                                            value={discountStart || ''}
                                                            onChange={([date]) => setDiscountStart(date)}
                                                        />
                                                        <div className="absolute right-[11px] top-1/2 -translate-y-1/2">
                                                            <IconCalendar className="text-neutral-300 dark:text-neutral-600" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label htmlFor="discountEnd">{t('discount_end_date')}</label>
                                                    <div className="relative">
                                                        <Flatpickr
                                                            options={{
                                                                enableTime: true,
                                                                dateFormat: 'Y-m-d H:i',
                                                                minDate: discountStart || 'today',
                                                                position: isRtl ? 'auto right' : 'auto left',
                                                                static: true,
                                                                disableMobile: true,
                                                                time_24hr: true,
                                                            }}
                                                            className="form-input text-sm pr-10"
                                                            value={discountEnd || ''}
                                                            onChange={([date]) => setDiscountEnd(date)}
                                                        />
                                                        <div className="absolute right-[11px] top-1/2 -translate-y-1/2">
                                                            <IconCalendar className="text-neutral-300 dark:text-neutral-600" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </AnimateHeight>
                            </div>

                            <div>
                                <label htmlFor="desc">{t('description')}</label>
                                <textarea
                                    id="desc"
                                    name="desc"
                                    className="form-textarea min-h-[130px]"
                                    value={formData.desc}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, desc: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold">{t('product_status')}</label>
                                <label className="inline-flex cursor-pointer items-center">
                                    <input type="checkbox" className="form-checkbox" checked={formData.active} onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))} />
                                    <span className="relative text-white-dark checked:bg-none ml-2">{formData.active ? t('active') : t('inactive')}</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Shop Dropdown */}
                            <div ref={shopRef} className="relative">
                                <label htmlFor="shop">{t('shop')}</label>
                                <div className="relative">
                                    <div
                                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                        onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                                    >
                                        <span>{formData.shop ? shops.find((s) => s.id === formData.shop)?.shop_name : t('select_shop')}</span>
                                        <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isShopDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isShopDropdownOpen && (
                                        <div className="absolute z-50 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    className="w-full rounded border border-[#e0e6ed] p-2 focus:border-primary focus:outline-none dark:border-[#191e3a] dark:bg-black dark:text-white-dark"
                                                    placeholder={t('search')}
                                                    value={searchTerm.shop}
                                                    onChange={(e) => setSearchTerm((prev) => ({ ...prev, shop: e.target.value }))}
                                                />
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                {filteredShops.map((shop) => (
                                                    <div
                                                        key={shop.id}
                                                        className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]"
                                                        onClick={() => {
                                                            setFormData((prev) => ({ ...prev, shop: shop.id }));
                                                            setIsShopDropdownOpen(false);
                                                        }}
                                                    >
                                                        {shop.shop_name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Category Selection */}
                            <div ref={categoryRef} className="relative">
                                <label htmlFor="category">{t('category')}</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div
                                            className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                        >
                                            <span>{formData.category ? categories.find((c) => c.id.toString() === formData.category)?.title : t('select_category')}</span>
                                            <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {isCategoryDropdownOpen && (
                                            <div className="absolute z-50 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                                <div className="p-2">
                                                    <input
                                                        type="text"
                                                        className="w-full rounded border border-[#e0e6ed] p-2 focus:border-primary focus:outline-none dark:border-[#191e3a] dark:bg-black dark:text-white-dark"
                                                        placeholder="Search..."
                                                        value={searchTerm.category}
                                                        onChange={(e) => setSearchTerm((prev) => ({ ...prev, category: e.target.value }))}
                                                    />
                                                </div>
                                                <div className="max-h-64 overflow-y-auto">
                                                    {filteredCategories.map((category) => (
                                                        <div
                                                            key={category.id}
                                                            className={`cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]`}
                                                            onClick={() => {
                                                                setFormData((prev) => ({ ...prev, category: category.id.toString() }));
                                                                setIsCategoryDropdownOpen(false);
                                                            }}
                                                        >
                                                            {category.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" className="btn btn-primary" onClick={() => setShowNewCategoryForm(!showNewCategoryForm)}>
                                        New Category
                                    </button>
                                </div>
                            </div>

                            {/* Animated New Category Form */}
                            <AnimateHeight duration={300} height={showNewCategoryForm ? 'auto' : 0}>
                                {showNewCategoryForm && (
                                    <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#1b2e4b]">
                                        <div className="mb-4 flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">{t('create_new_category')}</h3>
                                            <button type="button" className="hover:text-danger" onClick={() => setShowNewCategoryForm(false)}>
                                                <IconX className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="categoryTitle">{t('category_title')}</label>
                                                <input
                                                    id="categoryTitle"
                                                    type="text"
                                                    className="form-input"
                                                    name="title"
                                                    value={newCategory.title}
                                                    onChange={(e) => setNewCategory((prev) => ({ ...prev, title: e.target.value }))}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="categoryDesc">{t('category_description')}</label>
                                                <textarea
                                                    id="categoryDesc"
                                                    className="form-textarea"
                                                    name="desc"
                                                    placeholder={t('optional')}
                                                    value={newCategory.desc}
                                                    onChange={(e) => setNewCategory((prev) => ({ ...prev, desc: e.target.value }))}
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button type="button" className="btn btn-success" onClick={handleCreateCategory}>
                                                    Create Category
                                                </button>
                                                <button type="button" className="btn btn-danger" onClick={() => setShowNewCategoryForm(false)}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </AnimateHeight>

                            {/* Image Upload */}
                            <div>
                                <label className="mb-3 block">{t('product_images')}</label>

                                {productId ? (
                                    // Edit mode: use ImprovedImageUpload with existing productId
                                    <ImprovedImageUpload
                                        type="product"
                                        shopId={parseInt(formData.shop)}
                                        productId={parseInt(productId)}
                                        currentUrls={previewUrls}
                                        onUploadComplete={handleImagesUploaded}
                                        maxFiles={5}
                                    />
                                ) : (
                                    // Add mode: use custom file upload
                                    <div>
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {/* Add New Image Button */}
                                            {previewUrls.length < 5 && (
                                                <div className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b]">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files.length > 0) {
                                                                handleTempImageUpload(e.target.files);
                                                            }
                                                        }}
                                                        className="hidden"
                                                        id="product-images-upload"
                                                    />
                                                    <label htmlFor="product-images-upload" className="flex h-full w-full cursor-pointer flex-col items-center justify-center">
                                                        <IconUpload className="mb-2 h-6 w-6" />
                                                        <p className="text-sm text-gray-600 dark:text-gray-400">{t('click_to_upload')}</p>
                                                        <p className="text-[10px] text-gray-500 dark:text-gray-500">{t('image_formats')}</p>
                                                    </label>
                                                </div>
                                            )}

                                            {/* Image Previews */}
                                            {previewUrls.map((url, index) => (
                                                <div key={index} className="group relative h-32">
                                                    <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full rounded-lg object-cover" />
                                                    <button
                                                        type="button"
                                                        className="absolute right-0 top-0 hidden rounded-full bg-red-500 p-1 text-white hover:bg-red-600 group-hover:block"
                                                        onClick={() => removeTempImage(index)}
                                                    >
                                                        <IconX className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">First image will be used as the product thumbnail.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Features Tab */}
                {activeTab === 1 && (
                    <div className="space-y-5">
                        <ProductFeatures features={features} onChange={setFeatures} disabled={loading} />
                    </div>
                )}

                <div className="mt-8 flex justify-end gap-4">
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.push('/products')} disabled={loading}>
                        {t('cancel')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? t('submitting') : productId ? t('update_product') : t('create_product')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;

'use client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import React, { useEffect, useState, useRef } from 'react';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import IconX from '@/components/icon/icon-x';
import IconCaretDown from '@/components/icon/icon-caret-down';
import IconUpload from '@/components/icon/icon-camera';
import AnimateHeight from 'react-animate-height';
import { useSelector } from 'react-redux';
import { IRootState } from '@/store';

interface Shop {
    id: string;
    shop_name: string;
}

interface Category {
    id: number;
    title: string;
    desc: string;
}

interface ProductFormProps {
    productId?: string; // If provided, we're editing an existing product
}

const ProductForm: React.FC<ProductFormProps> = ({ productId }) => {
    const router = useRouter();
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';
    const [loading, setLoading] = useState(false);
    const [shops, setShops] = useState<Shop[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [alert, setAlert] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    });

    // New category form state
    const [newCategory, setNewCategory] = useState({
        title: '',
        desc: '',
    });
    const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

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
                // Fetch user's shops
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user) {
                    const { data: userShops } = await supabase.from('shops').select('id, shop_name').eq('owner', userData.user.id);
                    if (userShops) setShops(userShops);
                }

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
                        });
                        setPreviewUrls(product.images || []);
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setAlert({ type: 'danger', message: 'Error loading data' });
            }
        };

        fetchData();
    }, [productId]);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length + previewUrls.length > 10) {
            setAlert({ type: 'danger', message: 'Maximum 10 images allowed' });
            return;
        }
        setSelectedFiles((prev) => [...prev, ...files]);

        // Generate preview URLs
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrls((prev) => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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
        setLoading(true);
        try {
            // Upload images first
            const imageUrls: string[] = [];

            // Only upload new files
            if (selectedFiles.length) {
                for (const file of selectedFiles) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file);

                    if (uploadError) throw uploadError;

                    const {
                        data: { publicUrl },
                    } = supabase.storage.from('products').getPublicUrl(fileName);

                    imageUrls.push(publicUrl);
                }
            }

            // Add any existing image URLs (from editing)
            for (const url of previewUrls) {
                // Only add if it's already a URL (not a base64 string)
                if (typeof url === 'string' && url.startsWith('http')) {
                    imageUrls.push(url);
                }
            }

            const productData = {
                ...formData,
                price: parseFloat(formData.price).toFixed(2),
                category: formData.category ? parseInt(formData.category) : null,
                images: imageUrls,
            };

            if (productId) {
                // Update existing product
                const { error } = await supabase.from('products').update(productData).eq('id', productId);
                if (error) throw error;
            } else {
                // Create new product
                const { error } = await supabase.from('products').insert([productData]);
                if (error) throw error;
            }

            setAlert({ type: 'success', message: `Product ${productId ? 'updated' : 'created'} successfully` });
            router.replace('/products');
        } catch (error) {
            console.error('Error saving product:', error);
            setAlert({ type: 'danger', message: 'Error saving product' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="panel">
            {alert && <Alert type={alert.type} title={alert.type === 'success' ? 'Success' : 'Error'} message={alert.message} onClose={() => setAlert(null)} />}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="space-y-5">
                        <div>
                            <label htmlFor="title">Title</label>
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
                            <label htmlFor="price">Price</label>
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

                        <div>
                            <label htmlFor="desc">Description</label>
                            <textarea
                                id="desc"
                                name="desc"
                                className="form-textarea min-h-[130px]"
                                value={formData.desc}
                                onChange={(e) => setFormData((prev) => ({ ...prev, desc: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* Shop Dropdown */}
                        <div ref={shopRef} className="relative">
                            <label htmlFor="shop">Shop</label>
                            <div className="relative">
                                <div
                                    className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                    onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                                >
                                    <span>{formData.shop ? shops.find((s) => s.id === formData.shop)?.shop_name : 'Select a shop'}</span>
                                    <IconCaretDown className={`h-4 w-4 transition-transform duration-300 ${isShopDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {isShopDropdownOpen && (
                                    <div className="absolute z-50 mt-1 w-full rounded-md border border-[#e0e6ed] bg-white shadow-lg dark:border-[#191e3a] dark:bg-black">
                                        <div className="p-2">
                                            <input
                                                type="text"
                                                className="w-full rounded border border-[#e0e6ed] p-2 focus:border-primary focus:outline-none dark:border-[#191e3a] dark:bg-black dark:text-white-dark"
                                                placeholder="Search..."
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
                            <label htmlFor="category">Category</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <div
                                        className="cursor-pointer rounded border border-[#e0e6ed] bg-white p-2.5 text-dark dark:border-[#191e3a] dark:bg-black dark:text-white-dark flex items-center justify-between"
                                        onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    >
                                        <span>{formData.category ? categories.find((c) => c.id.toString() === formData.category)?.title : 'Select a category'}</span>
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
                                        <h3 className="text-lg font-semibold">Create New Category</h3>
                                        <button type="button" className="hover:text-danger" onClick={() => setShowNewCategoryForm(false)}>
                                            <IconX className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="categoryTitle">Category Title</label>
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
                                            <label htmlFor="categoryDesc">Category Description</label>
                                            <textarea
                                                id="categoryDesc"
                                                className="form-textarea"
                                                name="desc"
                                                placeholder="Optional"
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
                            <label className="mb-3 block">Product Images</label>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {/* Add New Image Button */}
                                {previewUrls.length < 5 && (
                                    <div
                                        onClick={handleFileSelect}
                                        className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b]"
                                    >
                                        <IconUpload className="mb-2 h-6 w-6" />
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 2MB</p>
                                    </div>
                                )}

                                {/* Image Previews */}
                                {previewUrls.map((url, index) => (
                                    <div key={index} className="group relative h-32">
                                        <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full rounded-lg object-cover" />
                                        <button
                                            type="button"
                                            className="absolute right-0 top-0 hidden rounded-full bg-red-500 p-1 text-white hover:bg-red-600 group-hover:block"
                                            onClick={() => removeImage(index)}
                                        >
                                            <IconX className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">First image will be used as the product thumbnail.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-4">
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.push('/products')} disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Saving...' : productId ? 'Update Product' : 'Create Product'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;

'use client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import React, { useEffect, useState, useRef } from 'react';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

interface ShopCategory {
    id: number;
    title: string;
    description: string;
}

interface ShopSubCategoryFormProps {
    subCategoryId?: string;
}

const ShopSubCategoryForm: React.FC<ShopSubCategoryFormProps> = ({ subCategoryId }) => {
    const router = useRouter();
    const { t } = getTranslation();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<ShopCategory[]>([]);
    const [alert, setAlert] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

    // Dropdown states
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const categoryRef = useRef<HTMLDivElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
    });

    // Image state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
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
                // Fetch shop categories
                const { data: categoriesData } = await supabase.from('categories_shop').select('*').order('title', { ascending: true });
                if (categoriesData) setCategories(categoriesData);

                // If editing, fetch subcategory data
                if (subCategoryId) {
                    const { data: subCategory } = await supabase.from('categories_sub_shop').select('*').eq('id', subCategoryId).single();

                    if (subCategory) {
                        setFormData({
                            title: subCategory.title,
                            description: subCategory.description,
                            category: subCategory.category_id?.toString() || '',
                        });

                        // Set existing image if available
                        if (subCategory.image_url) {
                            setPreviewUrl(subCategory.image_url);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setAlert({ type: 'danger', message: t('error_loading_data') });
            }
        };

        fetchData();
    }, [subCategoryId]);

    const filteredCategories = categories.filter((category) => category.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.title?.trim()) {
            setAlert({ type: 'danger', message: t('title_required') });
            return;
        }

        if (!formData.category) {
            setAlert({ type: 'danger', message: t('category_selection_required') });
            return;
        }

        setLoading(true);
        try {
            let imageUrl = null;

            // Upload image if provided (only if bucket exists)
            if (imageFile) {
                try {
                    const fileExt = imageFile.name.split('.').pop();
                    const fileName = `${Date.now()}.${fileExt}`;
                    const filePath = `shop-subcategory-images/${fileName}`;

                    const { error: uploadError } = await supabase.storage.from('shop-subcategory-images').upload(filePath, imageFile);

                    if (uploadError) {
                        console.warn('Image upload failed, continuing without image:', uploadError);
                        imageUrl = null;
                    } else {
                        const {
                            data: { publicUrl },
                        } = supabase.storage.from('shop-subcategory-images').getPublicUrl(filePath);
                        imageUrl = publicUrl;
                    }
                } catch (error) {
                    console.warn('Image upload failed, continuing without image:', error);
                    imageUrl = null;
                }
            }

            const subCategoryData = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                category_id: parseInt(formData.category),
                image_url: imageUrl,
            };

            if (subCategoryId) {
                // Edit mode
                const { error } = await supabase.from('categories_sub_shop').update(subCategoryData).eq('id', subCategoryId);
                if (error) throw error;
                setAlert({ type: 'success', message: t('subcategory_updated_successfully') });
            } else {
                // Add mode
                const { error } = await supabase.from('categories_sub_shop').insert([subCategoryData]);
                if (error) throw error;
                setAlert({ type: 'success', message: t('subcategory_created_successfully') });

                // Reset form
                setFormData({
                    title: '',
                    description: '',
                    category: '',
                });
                setImageFile(null);
                setPreviewUrl(null);

                // Redirect to subcategories page after creating
                setTimeout(() => {
                    router.push('/shops/categories/subcategories');
                }, 1500);
            }
        } catch (error) {
            console.error('Error saving subcategory:', error);
            setAlert({ type: 'danger', message: error instanceof Error ? error.message : 'Error saving subcategory' });
        } finally {
            setLoading(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div className="panel w-full max-w-none">
            {alert && <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert(null)} />}

            <form onSubmit={handleSubmit} className="space-y-5 mt-6">
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
                            <label htmlFor="description">{t('description')}</label>
                            <textarea
                                id="description"
                                name="description"
                                className="form-textarea min-h-[130px]"
                                value={formData.description}
                                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        {/* Image Upload */}
                        <div>
                            <label className="mb-3 block">Subcategory Image</label>
                            <div className="space-y-4">
                                {/* Image Preview */}
                                {previewUrl && (
                                    <div className="relative w-32 h-32">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg border" />
                                        <button
                                            type="button"
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                                            onClick={() => {
                                                setImageFile(null);
                                                setPreviewUrl(null);
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}

                                {/* Upload Button */}
                                <div className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b]">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];
                                                setImageFile(file);
                                                setPreviewUrl(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="hidden"
                                        id="shop-subcategory-image-upload"
                                    />
                                    <label htmlFor="shop-subcategory-image-upload" className="flex h-full w-full cursor-pointer flex-col items-center justify-center">
                                        <svg className="mb-2 h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Click to upload image</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {/* Category Selection */}
                        <div ref={categoryRef} className="relative">
                            <label htmlFor="category">{t('category')}</label>
                            <div className="relative">
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
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {filteredCategories.map((category) => (
                                                <div
                                                    key={category.id}
                                                    className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:text-white-dark dark:hover:bg-[#191e3a]"
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
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-4">
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.push('/shops/categories/subcategories')} disabled={loading}>
                        {t('cancel')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? t('submitting') : subCategoryId ? t('update_subcategory') : t('create_subcategory')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ShopSubCategoryForm;

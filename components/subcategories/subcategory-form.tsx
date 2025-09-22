'use client';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import React, { useEffect, useState, useRef } from 'react';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import IconCaretDown from '@/components/icon/icon-caret-down';
import { getTranslation } from '@/i18n';

interface Category {
    id: number;
    title: string;
    desc: string;
}

interface SubCategoryFormProps {
    subCategoryId?: string;
}

const SubCategoryForm: React.FC<SubCategoryFormProps> = ({ subCategoryId }) => {
    const router = useRouter();
    const { t } = getTranslation();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [alert, setAlert] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);

    // Dropdown states
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const categoryRef = useRef<HTMLDivElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        desc: '',
        category: '',
    });

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
                // Fetch categories
                const { data: categoriesData } = await supabase.from('categories').select('*').order('title', { ascending: true });
                if (categoriesData) setCategories(categoriesData);

                // If editing, fetch subcategory data
                if (subCategoryId) {
                    const { data: subCategory } = await supabase.from('categories_sub').select('*').eq('id', subCategoryId).single();

                    if (subCategory) {
                        setFormData({
                            title: subCategory.title,
                            desc: subCategory.desc,
                            category: subCategory.category_id?.toString() || '',
                        });
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
            const subCategoryData = {
                title: formData.title.trim(),
                desc: formData.desc.trim(),
                category_id: parseInt(formData.category),
            };

            if (subCategoryId) {
                // Edit mode
                const { error } = await supabase.from('categories_sub').update(subCategoryData).eq('id', subCategoryId);
                if (error) throw error;
                setAlert({ type: 'success', message: t('subcategory_updated_successfully') });
            } else {
                // Add mode
                const { error } = await supabase.from('categories_sub').insert([subCategoryData]);
                if (error) throw error;
                setAlert({ type: 'success', message: t('subcategory_created_successfully') });

                // Reset form
                setFormData({
                    title: '',
                    desc: '',
                    category: '',
                });

                // Redirect to subcategories page after creating
                setTimeout(() => {
                    router.push('/categories/subcategories');
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
                            <label htmlFor="desc">{t('description')}</label>
                            <textarea
                                id="desc"
                                name="desc"
                                className="form-textarea min-h-[130px]"
                                value={formData.desc}
                                onChange={(e) => setFormData((prev) => ({ ...prev, desc: e.target.value }))}
                            />
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
                    <button type="button" className="btn btn-outline-danger" onClick={() => router.push('/subcategories')} disabled={loading}>
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

export default SubCategoryForm;

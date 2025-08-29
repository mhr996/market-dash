'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import CategoryImageUpload from '@/components/categories/category-image-upload';
import IconCamera from '@/components/icon/icon-camera';
import IconTrashLines from '@/components/icon/icon-trash-lines';

const AddCategoryPage = () => {
    const router = useRouter();
    const { t } = getTranslation();
    const [form, setForm] = useState({
        title: '',
        desc: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageSelect = (file: File) => {
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const uploadImageToCategory = async (categoryId: number, file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const folderPath = `${categoryId}`;
        const fileName = `${folderPath}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('categories').upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
        });

        if (uploadError) throw uploadError;

        const {
            data: { publicUrl },
        } = supabase.storage.from('categories').getPublicUrl(fileName);

        return publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!form.title) {
            setAlert({ visible: true, message: t('category_title_required'), type: 'danger' });
            setLoading(false);
            return;
        }

        try {
            // First, create the category
            const { data: categoryData, error: categoryError } = await supabase
                .from('categories')
                .insert([{ title: form.title, desc: form.desc }])
                .select()
                .single();

            if (categoryError) throw categoryError;

            // If there's an image, upload it and update the category
            if (imageFile && categoryData) {
                const imageUrl = await uploadImageToCategory(categoryData.id, imageFile);

                const { error: updateError } = await supabase.from('categories').update({ image_url: imageUrl }).eq('id', categoryData.id);

                if (updateError) throw updateError;
            }

            setAlert({ visible: true, message: t('category_added_successfully'), type: 'success' });
            router.push('/categories');
        } catch (error: any) {
            console.error(error);
            setAlert({ visible: true, message: error.message || t('error_adding_category'), type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6">
            <div className="flex items-center gap-5 mb-6">
                {' '}
                <div onClick={() => router.back()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-4 cursor-pointer text-primary rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                {/* Breadcrumb Navigation */}{' '}
                <ul className="flex space-x-2 rtl:space-x-reverse mb-4">
                    <li>
                        <Link href="/" className="text-primary hover:underline">
                            {t('home')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <Link href="/categories" className="text-primary hover:underline">
                            {t('categories')}
                        </Link>
                    </li>
                    <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                        <span>{t('add_new_category')}</span>
                    </li>
                </ul>
            </div>{' '}
            {alert.visible && (
                <div className="mb-4">
                    <Alert type={alert.type} title={alert.type === 'success' ? t('success') : t('error')} message={alert.message} onClose={() => setAlert({ ...alert, visible: false })} />
                </div>
            )}{' '}
            {/* Form Container */}
            <div className="rounded-md border border-[#ebedf2] bg-white p-4 dark:border-[#191e3a] dark:bg-black">
                <h6 className="mb-5 text-lg font-bold">{t('add_new_category')}</h6>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-bold text-gray-700 dark:text-white">
                                {t('category_title')} <span className="text-red-500">*</span>
                            </label>
                            <input type="text" id="title" name="title" value={form.title} onChange={handleInputChange} className="form-input" placeholder={t('enter_category_title')} required />
                        </div>
                        <div>
                            <label htmlFor="desc" className="block text-sm font-bold text-gray-700 dark:text-white">
                                {t('description')}
                            </label>
                            <textarea id="desc" name="desc" value={form.desc} onChange={handleInputChange} className="form-textarea" placeholder={t('enter_category_description')} rows={4} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-white mb-2">{t('category_image')}</label>
                            <div
                                className={`
                                    relative aspect-square w-full max-w-xs mx-auto
                                    border-2 border-dashed rounded-lg cursor-pointer
                                    transition-all duration-200 group
                                    hover:border-primary hover:bg-primary/5
                                    ${imagePreview ? 'border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600'}
                                `}
                                onClick={() => {
                                    const fileInput = document.createElement('input');
                                    fileInput.type = 'file';
                                    fileInput.accept = 'image/*';
                                    fileInput.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) {
                                            // Validate file size (5MB max)
                                            if (file.size > 5 * 1024 * 1024) {
                                                setAlert({ visible: true, message: 'File size must be less than 5MB', type: 'danger' });
                                                return;
                                            }
                                            // Validate file type
                                            const fileExt = file.name.split('.').pop()?.toLowerCase();
                                            const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                                            if (!fileExt || !allowedExtensions.includes(fileExt)) {
                                                setAlert({ visible: true, message: 'Invalid file type. Please upload an image file (jpg, jpeg, png, gif, webp).', type: 'danger' });
                                                return;
                                            }
                                            handleImageSelect(file);
                                        }
                                    };
                                    fileInput.click();
                                }}
                            >
                                {imagePreview ? (
                                    <>
                                        {/* Image Display */}
                                        <img src={imagePreview} alt="Category Preview" className="w-full h-full object-cover rounded-lg" />

                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                            <div className="flex flex-col items-center text-white space-y-2">
                                                <IconCamera className="w-8 h-8" />
                                                <span className="text-sm font-medium">Change Image</span>
                                            </div>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImageFile(null);
                                                setImagePreview('');
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                                        >
                                            <IconTrashLines className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    /* Upload Placeholder */
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                                        <IconCamera className="w-12 h-12 mb-3 group-hover:text-primary transition-colors" />
                                        <span className="text-sm font-medium group-hover:text-primary transition-colors">Upload Image</span>
                                        <span className="text-xs mt-1 text-gray-400 dark:text-gray-500">Max 5MB</span>
                                    </div>
                                )}
                            </div>
                        </div>{' '}
                        {/* Submit Button */}
                        <div className="mt-6">
                            <button type="submit" disabled={loading} className="btn btn-primary w-full">
                                {loading ? t('submitting') : t('add_category')}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCategoryPage;

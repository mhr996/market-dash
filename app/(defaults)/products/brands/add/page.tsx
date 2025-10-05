'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { Alert } from '@/components/elements/alerts/elements-alerts-default';
import { getTranslation } from '@/i18n';
import IconCamera from '@/components/icon/icon-camera';
import IconTrashLines from '@/components/icon/icon-trash-lines';

const AddBrandPage = () => {
    const router = useRouter();
    const { t } = getTranslation();
    const [form, setForm] = useState({
        brand: '',
        description: '',
        shop_id: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [alert, setAlert] = useState<{ visible: boolean; message: string; type: 'success' | 'danger' }>({
        visible: false,
        message: '',
        type: 'success',
    });
    const [loading, setLoading] = useState(false);
    const [shops, setShops] = useState<{ id: number; shop_name: string }[]>([]);

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const { data, error } = await supabase.from('shops').select('id, shop_name').order('shop_name', { ascending: true });
                if (error) throw error;
                setShops(data || []);
            } catch (error) {
                console.error('Error fetching shops:', error);
            }
        };
        fetchShops();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setAlert({ visible: true, message: 'Image size must be less than 5MB', type: 'danger' });
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setAlert({ visible: true, message: 'Please select a valid image file', type: 'danger' });
                return;
            }

            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadImageToBrand = async (brandId: number, file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const folderPath = `${brandId}`;
        const fileName = `${folderPath}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from('shop-brands').upload(fileName, file, {
            cacheControl: '3600',
            upsert: true,
        });

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage.from('shop-brands').getPublicUrl(fileName);
        return data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate form
            if (!form.brand.trim()) {
                setAlert({ visible: true, message: 'Brand name is required', type: 'danger' });
                setLoading(false);
                return;
            }

            if (!form.description.trim()) {
                setAlert({ visible: true, message: 'Description is required', type: 'danger' });
                setLoading(false);
                return;
            }

            if (!form.shop_id.trim()) {
                setAlert({ visible: true, message: 'Shop selection is required', type: 'danger' });
                setLoading(false);
                return;
            }

            // Create brand first
            const { data: brandData, error: brandError } = await supabase
                .from('categories_brands')
                .insert([
                    {
                        brand: form.brand.trim(),
                        description: form.description.trim(),
                        shop_id: parseInt(form.shop_id),
                    },
                ])
                .select()
                .single();

            if (brandError) throw brandError;

            let imageUrl = '';

            // Upload image if provided
            if (imageFile) {
                try {
                    imageUrl = await uploadImageToBrand(brandData.id, imageFile);

                    // Update brand with image URL
                    const { error: updateError } = await supabase.from('categories_brands').update({ image_url: imageUrl }).eq('id', brandData.id);

                    if (updateError) throw updateError;
                } catch (imageError) {
                    console.error('Image upload error:', imageError);
                    setAlert({ visible: true, message: 'Brand created but image upload failed', type: 'danger' });
                    setLoading(false);
                    return;
                }
            }

            setAlert({ visible: true, message: 'Brand created successfully!', type: 'success' });

            // Reset form
            setForm({ brand: '', description: '', shop_id: '' });
            setImageFile(null);
            setImagePreview('');

            // Redirect after a short delay
            setTimeout(() => {
                router.push('/products/brands');
            }, 1500);
        } catch (error) {
            console.error('Error creating brand:', error);
            setAlert({ visible: true, message: 'Error creating brand. Please try again.', type: 'danger' });
        } finally {
            setLoading(false);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview('');
    };

    return (
        <div className="panel">
            <div className="mb-5 flex items-center justify-between">
                <h5 className="text-lg font-semibold dark:text-white-light">Add New Brand</h5>
                <Link href="/products/brands" className="btn btn-outline-danger">
                    <IconTrashLines className="h-4 w-4" />
                    Back to Brands
                </Link>
            </div>

            {alert.visible && (
                <div className="mb-4 ml-4 max-w-96">
                    <Alert
                        type={alert.type}
                        title={alert.type === 'success' ? 'Success' : 'Error'}
                        message={alert.message}
                        onClose={() => setAlert({ visible: false, message: '', type: 'success' })}
                    />
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="brand" className="mb-2 block text-sm font-medium">
                        Brand Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" id="brand" name="brand" value={form.brand} onChange={handleInputChange} className="form-input" placeholder="Enter brand name" required />
                </div>

                <div>
                    <label htmlFor="description" className="mb-2 block text-sm font-medium">
                        Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        value={form.description}
                        onChange={handleInputChange}
                        className="form-textarea"
                        placeholder="Enter brand description"
                        rows={4}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="shop_id" className="mb-2 block text-sm font-medium">
                        Shop <span className="text-red-500">*</span>
                    </label>
                    <select id="shop_id" name="shop_id" value={form.shop_id} onChange={handleInputChange} className="form-select" required>
                        <option value="">Select a shop</option>
                        {shops.map((shop) => (
                            <option key={shop.id} value={shop.id}>
                                {shop.shop_name}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium">Brand Image</label>
                    <div className="space-y-4">
                        <div className="relative">
                            <input type="file" id="image" accept="image/*" onChange={handleImageSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                                <IconCamera className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Click to upload brand image</p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 5MB</p>
                            </div>
                        </div>

                        {imagePreview && (
                            <div className="relative inline-block">
                                <img src={imagePreview} alt="Brand preview" className="h-32 w-32 rounded-lg object-cover border border-gray-300 dark:border-gray-600" />
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                >
                                    <IconTrashLines className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-4">
                    <Link href="/products/brands" className="btn btn-outline">
                        Cancel
                    </Link>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? 'Creating...' : 'Create Brand'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddBrandPage;

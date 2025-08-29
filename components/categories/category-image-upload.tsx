import React, { useRef, useState } from 'react';
import supabase from '@/lib/supabase';
import IconUpload from '@/components/icon/icon-camera';
import IconTrashLines from '@/components/icon/icon-trash-lines';

interface CategoryImageUploadProps {
    categoryId: string | number;
    url: string | null;
    onUploadComplete: (url: string) => void;
    onError?: (error: string) => void;
    onDelete?: () => void;
    disabled?: boolean;
}

const CategoryImageUpload: React.FC<CategoryImageUploadProps> = ({ categoryId, url, onUploadComplete, onError, onDelete, disabled = false }) => {
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

            if (!fileExt || !allowedExtensions.includes(fileExt)) {
                throw new Error('Invalid file type. Please upload an image file (jpg, jpeg, png, gif, webp).');
            }

            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('File size must be less than 5MB.');
            }

            // Create folder path for this category
            const folderPath = `${categoryId}`;

            // Delete old files in the category folder if they exist
            const { data: oldFiles } = await supabase.storage.from('categories').list(folderPath);
            if (oldFiles && oldFiles.length > 0) {
                const filesToDelete = oldFiles.map((file) => `${folderPath}/${file.name}`);
                await supabase.storage.from('categories').remove(filesToDelete);
            }

            // Generate unique filename
            const fileName = `${folderPath}/${Date.now()}.${fileExt}`;

            // Upload new file
            const { error: uploadError } = await supabase.storage.from('categories').upload(fileName, file, {
                cacheControl: '3600',
                upsert: true,
            });

            if (uploadError) throw uploadError;

            // Get public URL
            const {
                data: { publicUrl },
            } = supabase.storage.from('categories').getPublicUrl(fileName);

            onUploadComplete(publicUrl);
        } catch (error) {
            console.error('Error uploading image:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error uploading image';
            onError?.(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    const deleteImage = async () => {
        try {
            setDeleting(true);

            // Delete all files in the category folder
            const folderPath = `${categoryId}`;
            const { data: files } = await supabase.storage.from('categories').list(folderPath);

            if (files && files.length > 0) {
                const filesToDelete = files.map((file) => `${folderPath}/${file.name}`);
                const { error } = await supabase.storage.from('categories').remove(filesToDelete);
                if (error) throw error;
            }

            onDelete?.();
        } catch (error) {
            console.error('Error deleting image:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error deleting image';
            onError?.(errorMessage);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="relative">
            {/* Square Upload Area */}
            <div
                className={`
                    relative aspect-square w-full max-w-xs mx-auto
                    border-2 border-dashed rounded-lg cursor-pointer
                    transition-all duration-200 group
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-primary hover:bg-primary/5'}
                    ${url ? 'border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600'}
                `}
                onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
            >
                {url ? (
                    <>
                        {/* Image Display */}
                        <img src={url} alt="Category" className="w-full h-full object-cover rounded-lg" />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            {uploading ? (
                                <div className="flex flex-col items-center text-white">
                                    <div className="w-8 h-8 animate-spin rounded-full border-3 border-white border-t-transparent mb-2"></div>
                                    <span className="text-sm">Uploading...</span>
                                </div>
                            ) : deleting ? (
                                <div className="flex flex-col items-center text-white">
                                    <div className="w-8 h-8 animate-spin rounded-full border-3 border-white border-t-transparent mb-2"></div>
                                    <span className="text-sm">Deleting...</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center text-white space-y-2">
                                    <IconUpload className="w-8 h-8" />
                                    <span className="text-sm font-medium">Change Image</span>
                                </div>
                            )}
                        </div>

                        {/* Delete Button */}
                        {!disabled && !uploading && !deleting && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteImage();
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                            >
                                <IconTrashLines className="w-4 h-4" />
                            </button>
                        )}
                    </>
                ) : (
                    /* Upload Placeholder */
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                        {uploading ? (
                            <>
                                <div className="w-12 h-12 animate-spin rounded-full border-3 border-primary border-t-transparent mb-3"></div>
                                <span className="text-sm font-medium">Uploading...</span>
                            </>
                        ) : (
                            <>
                                <IconUpload className="w-12 h-12 mb-3 group-hover:text-primary transition-colors" />
                                <span className="text-sm font-medium group-hover:text-primary transition-colors">Upload Image</span>
                                <span className="text-xs mt-1 text-gray-400 dark:text-gray-500">Max 5MB</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Hidden file input */}
            <input type="file" ref={fileInputRef} onChange={uploadImage} accept="image/*" className="hidden" disabled={uploading || disabled} />
        </div>
    );
};

export default CategoryImageUpload;

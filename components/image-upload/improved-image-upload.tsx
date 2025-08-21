import React, { useRef, useState } from 'react';
import StorageManager, { UploadResult } from '@/utils/storage-manager';
import IconUpload from '@/components/icon/icon-camera';
import IconX from '@/components/icon/icon-x';

interface ImprovedImageUploadProps {
    type: 'shop-logo' | 'shop-cover' | 'shop-gallery' | 'product';
    shopId: number;
    productId?: number;
    currentUrl?: string | null;
    currentUrls?: string[];
    placeholderImage?: string;
    onUploadComplete: (url: string | string[]) => void;
    onError?: (error: string) => void;
    buttonLabel?: string;
    maxFiles?: number;
    className?: string;
    disabled?: boolean;
}

const ImprovedImageUpload: React.FC<ImprovedImageUploadProps> = ({
    type,
    shopId,
    productId,
    currentUrl,
    currentUrls = [],
    placeholderImage = '/assets/images/img-placeholder-fallback.webp',
    onUploadComplete,
    onError,
    buttonLabel,
    maxFiles = 1,
    className = '',
    disabled = false,
}) => {
    const [uploading, setUploading] = useState(false);
    const [previewUrls, setPreviewUrls] = useState<string[]>(currentUrls);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = () => {
        if (disabled) return;
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const files = Array.from(event.target.files);

            // Validate file types
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            for (const file of files) {
                const fileExt = file.name.split('.').pop()?.toLowerCase();
                if (!fileExt || !allowedExtensions.includes(fileExt)) {
                    throw new Error(`Invalid file type: ${file.name}. Please upload an image file.`);
                }

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    throw new Error(`File too large: ${file.name}. Maximum size is 5MB.`);
                }
            }

            let results: UploadResult[] = [];

            switch (type) {
                case 'shop-logo':
                    if (files.length > 1) {
                        throw new Error('Only one logo image is allowed.');
                    }
                    const logoResult = await StorageManager.uploadShopLogo(shopId, files[0]);
                    results = [logoResult];
                    break;

                case 'shop-cover':
                    if (files.length > 1) {
                        throw new Error('Only one cover image is allowed.');
                    }
                    const coverResult = await StorageManager.uploadShopCover(shopId, files[0]);
                    results = [coverResult];
                    break;

                case 'shop-gallery':
                    if (files.length + previewUrls.length > maxFiles) {
                        throw new Error(`Maximum ${maxFiles} images allowed for gallery.`);
                    }
                    results = await StorageManager.uploadShopGallery(shopId, files);
                    break;

                case 'product':
                    if (!productId) {
                        throw new Error('Product ID is required for product image upload.');
                    }
                    if (files.length + previewUrls.length > maxFiles) {
                        throw new Error(`Maximum ${maxFiles} images allowed for product.`);
                    }
                    results = await StorageManager.uploadProductImages(shopId, productId, files);
                    break;

                default:
                    throw new Error('Invalid upload type.');
            }

            // Handle results
            const successfulUploads = results.filter((result) => result.success);
            const failedUploads = results.filter((result) => !result.success);

            if (failedUploads.length > 0) {
                const errorMessages = failedUploads.map((result) => result.error).join(', ');
                throw new Error(`Some uploads failed: ${errorMessages}`);
            }

            if (successfulUploads.length === 0) {
                throw new Error('No files were uploaded successfully.');
            }

            const uploadedUrls = successfulUploads.map((result) => result.url!);

            if (type === 'shop-logo' || type === 'shop-cover') {
                onUploadComplete(uploadedUrls[0]);
            } else {
                const newUrls = [...previewUrls, ...uploadedUrls];
                setPreviewUrls(newUrls);
                onUploadComplete(newUrls);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            const errorMessage = error instanceof Error ? error.message : 'Upload failed';
            onError?.(errorMessage);
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeImage = async (index: number) => {
        try {
            const urlToRemove = previewUrls[index];

            if (type === 'shop-gallery') {
                await StorageManager.removeShopGalleryImage(shopId, urlToRemove);
            } else if (type === 'product' && productId) {
                // For products, we need to extract the file path and remove it
                const filePath = StorageManager.getFilePathFromUrl(urlToRemove);
                // This is a simplified approach - you might want to implement a more specific method
                // for removing individual product images
            }

            const newUrls = previewUrls.filter((_, i) => i !== index);
            setPreviewUrls(newUrls);
            onUploadComplete(newUrls);
        } catch (error) {
            console.error('Error removing image:', error);
            onError?.('Failed to remove image');
        }
    };

    const renderSingleImageUpload = () => (
        <div className={`group relative ${className}`}>
            <div
                onClick={handleFileSelect}
                className="relative flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b] overflow-hidden"
            >
                {currentUrl ? (
                    <>
                        <img src={currentUrl} alt="Current" className="h-full w-full rounded-lg object-cover" />
                        {/* Hover overlay for existing image */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-center">
                                <IconUpload className="h-8 w-8 mx-auto mb-2" />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <IconUpload className="mb-2 h-6 w-6" />
                        <p className="text-xs text-gray-600 dark:text-gray-400">{buttonLabel || 'Click to upload'}</p>
                    </>
                )}
                {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                )}
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={disabled || uploading} />
        </div>
    );

    const renderMultipleImageUpload = () => (
        <div className={className}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {/* Upload button */}
                {previewUrls.length < maxFiles && (
                    <div
                        onClick={handleFileSelect}
                        className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-primary hover:bg-gray-100 dark:border-[#1b2e4b] dark:bg-black dark:hover:border-primary dark:hover:bg-[#1b2e4b]"
                    >
                        <IconUpload className="mb-2 h-6 w-6" />
                        <p className="text-xs text-center text-gray-600 dark:text-gray-400">{buttonLabel || 'Add Image'}</p>
                        {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                            </div>
                        )}
                    </div>
                )}

                {/* Image previews */}
                {previewUrls.map((url, index) => (
                    <div key={index} className="group relative h-32 overflow-hidden rounded-lg">
                        <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />

                        {/* Hover overlay for existing images */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                    type="button"
                                    className="rounded-full bg-red-500 p-2 text-white hover:bg-red-600 transition-colors duration-200"
                                    onClick={() => removeImage(index)}
                                    disabled={uploading}
                                    title="Remove image"
                                >
                                    <IconX className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple={maxFiles > 1} onChange={handleFileChange} disabled={disabled || uploading} />

            {previewUrls.length > 0 && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {previewUrls.length} of {maxFiles} images uploaded
                </p>
            )}
        </div>
    );

    if (type === 'shop-logo' || type === 'shop-cover') {
        return renderSingleImageUpload();
    } else {
        return renderMultipleImageUpload();
    }
};

export default ImprovedImageUpload;

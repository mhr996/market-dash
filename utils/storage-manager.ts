import supabase from '@/lib/supabase';

/**
 * Storage Manager Utility
 * Manages the improved folder structure for shops and products
 *
 * Folder Structure:
 * shops/
 *   {shopId}/
 *     logo.{ext}
 *     cover.{ext}
 *     gallery/
 *       {timestamp}-{random}.{ext}
 *     products/
 *       {productId}/
 *         {timestamp}-{random}.{ext}
 */

export interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
}

export interface DeleteResult {
    success: boolean;
    error?: string;
}

class StorageManager {
    private static readonly BUCKET_NAME = 'shops';

    /**
     * Ensures a shop folder exists in the storage bucket
     */
    private static async ensureShopFolder(shopId: number): Promise<void> {
        try {
            // Create a placeholder file to ensure the folder structure exists
            const placeholderPath = `${shopId}/.placeholder`;

            // Check if placeholder already exists
            const { data: existingFiles } = await supabase.storage.from(this.BUCKET_NAME).list(shopId.toString());

            if (!existingFiles || existingFiles.length === 0) {
                // Create placeholder file to establish folder structure
                const placeholderContent = new Blob([''], { type: 'text/plain' });
                await supabase.storage.from(this.BUCKET_NAME).upload(placeholderPath, placeholderContent);
            }
        } catch (error) {
            console.error('Error ensuring shop folder:', error);
        }
    }

    /**
     * Uploads shop logo
     */
    static async uploadShopLogo(shopId: number, file: File): Promise<UploadResult> {
        try {
            await this.ensureShopFolder(shopId);

            const fileExt = file.name.split('.').pop()?.toLowerCase();
            // Use timestamp to ensure unique filename and avoid caching issues
            const timestamp = Date.now();
            const fileName = `${shopId}/logo-${timestamp}.${fileExt}`;

            // Remove existing logo if it exists
            await this.removeShopLogo(shopId);

            const { error: uploadError } = await supabase.storage.from(this.BUCKET_NAME).upload(fileName, file, {
                cacheControl: '3600',
                upsert: false, // Changed to false since we're using unique filenames
            });

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);

            return { success: true, url: publicUrl };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
        }
    }

    /**
     * Uploads shop cover image
     */
    static async uploadShopCover(shopId: number, file: File): Promise<UploadResult> {
        try {
            await this.ensureShopFolder(shopId);

            const fileExt = file.name.split('.').pop()?.toLowerCase();
            // Use timestamp to ensure unique filename and avoid caching issues
            const timestamp = Date.now();
            const fileName = `${shopId}/cover-${timestamp}.${fileExt}`;

            // Remove existing cover if it exists
            await this.removeShopCover(shopId);

            const { error: uploadError } = await supabase.storage.from(this.BUCKET_NAME).upload(fileName, file, {
                cacheControl: '3600',
                upsert: false, // Changed to false since we're using unique filenames
            });

            if (uploadError) throw uploadError;

            const {
                data: { publicUrl },
            } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);

            return { success: true, url: publicUrl };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
        }
    }

    /**
     * Uploads shop gallery images
     */
    static async uploadShopGallery(shopId: number, files: File[]): Promise<UploadResult[]> {
        await this.ensureShopFolder(shopId);

        const results: UploadResult[] = [];

        for (const file of files) {
            try {
                const fileExt = file.name.split('.').pop()?.toLowerCase();
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(7);
                const fileName = `${shopId}/gallery/${timestamp}-${random}.${fileExt}`;

                const { error: uploadError } = await supabase.storage.from(this.BUCKET_NAME).upload(fileName, file);

                if (uploadError) throw uploadError;

                const {
                    data: { publicUrl },
                } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);

                results.push({ success: true, url: publicUrl });
            } catch (error) {
                results.push({
                    success: false,
                    error: error instanceof Error ? error.message : 'Upload failed',
                });
            }
        }

        return results;
    }

    /**
     * Uploads product images
     */
    static async uploadProductImages(shopId: number, productId: number, files: File[]): Promise<UploadResult[]> {
        await this.ensureShopFolder(shopId);

        const results: UploadResult[] = [];

        for (const file of files) {
            try {
                const fileExt = file.name.split('.').pop()?.toLowerCase();
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(7);
                const fileName = `${shopId}/products/${productId}/${timestamp}-${random}.${fileExt}`;

                const { error: uploadError } = await supabase.storage.from(this.BUCKET_NAME).upload(fileName, file);

                if (uploadError) throw uploadError;

                const {
                    data: { publicUrl },
                } = supabase.storage.from(this.BUCKET_NAME).getPublicUrl(fileName);

                results.push({ success: true, url: publicUrl });
            } catch (error) {
                results.push({
                    success: false,
                    error: error instanceof Error ? error.message : 'Upload failed',
                });
            }
        }

        return results;
    }

    /**
     * Removes shop logo
     */
    static async removeShopLogo(shopId: number): Promise<DeleteResult> {
        try {
            // List all files in shop folder to find logo
            const { data: files } = await supabase.storage.from(this.BUCKET_NAME).list(shopId.toString());

            if (files) {
                // Find all logo files (both old format "logo.ext" and new format "logo-timestamp.ext")
                const logoFiles = files.filter((file) => file.name.startsWith('logo.') || file.name.startsWith('logo-'));
                if (logoFiles.length > 0) {
                    const filesToRemove = logoFiles.map((file) => `${shopId}/${file.name}`);
                    const { error } = await supabase.storage.from(this.BUCKET_NAME).remove(filesToRemove);
                    if (error) {
                        console.error('Error removing logo files:', error);
                    }
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
        }
    }

    /**
     * Removes shop cover image
     */
    static async removeShopCover(shopId: number): Promise<DeleteResult> {
        try {
            // List all files in shop folder to find cover
            const { data: files } = await supabase.storage.from(this.BUCKET_NAME).list(shopId.toString());

            if (files) {
                // Find all cover files (both old format "cover.ext" and new format "cover-timestamp.ext")
                const coverFiles = files.filter((file) => file.name.startsWith('cover.') || file.name.startsWith('cover-'));
                if (coverFiles.length > 0) {
                    const filesToRemove = coverFiles.map((file) => `${shopId}/${file.name}`);
                    const { error } = await supabase.storage.from(this.BUCKET_NAME).remove(filesToRemove);
                    if (error) {
                        console.error('Error removing cover files:', error);
                    }
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
        }
    }

    /**
     * Removes a specific shop gallery image
     */
    static async removeShopGalleryImage(shopId: number, imageUrl: string): Promise<DeleteResult> {
        try {
            // Extract file path from URL
            const urlParts = imageUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `${shopId}/gallery/${fileName}`;

            await supabase.storage.from(this.BUCKET_NAME).remove([filePath]);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
        }
    }

    /**
     * Removes all product images for a specific product
     */
    static async removeProductImages(shopId: number, productId: number): Promise<DeleteResult> {
        try {
            const productFolderPath = `${shopId}/products/${productId}`;

            // List all files in the product folder
            const { data: files } = await supabase.storage.from(this.BUCKET_NAME).list(productFolderPath);

            if (files && files.length > 0) {
                const filesToRemove = files.map((file) => `${productFolderPath}/${file.name}`);
                await supabase.storage.from(this.BUCKET_NAME).remove(filesToRemove);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
        }
    }

    /**
     * Removes entire shop folder and all its contents
     */
    static async removeShopCompletely(shopId: number): Promise<DeleteResult> {
        try {
            // First, get all files in the shop folder
            const { data: shopFiles } = await supabase.storage.from(this.BUCKET_NAME).list(shopId.toString());

            if (shopFiles && shopFiles.length > 0) {
                // Remove direct files (logo, cover, placeholder)
                const directFiles = shopFiles.filter((file) => !file.name.includes('/')).map((file) => `${shopId}/${file.name}`);

                if (directFiles.length > 0) {
                    await supabase.storage.from(this.BUCKET_NAME).remove(directFiles);
                }
            }

            // Remove gallery folder
            const { data: galleryFiles } = await supabase.storage.from(this.BUCKET_NAME).list(`${shopId}/gallery`);

            if (galleryFiles && galleryFiles.length > 0) {
                const galleryFilesToRemove = galleryFiles.map((file) => `${shopId}/gallery/${file.name}`);
                await supabase.storage.from(this.BUCKET_NAME).remove(galleryFilesToRemove);
            }

            // Remove all products folders
            const { data: productsFolders } = await supabase.storage.from(this.BUCKET_NAME).list(`${shopId}/products`);

            if (productsFolders && productsFolders.length > 0) {
                for (const folder of productsFolders) {
                    const { data: productFiles } = await supabase.storage.from(this.BUCKET_NAME).list(`${shopId}/products/${folder.name}`);

                    if (productFiles && productFiles.length > 0) {
                        const productFilesToRemove = productFiles.map((file) => `${shopId}/products/${folder.name}/${file.name}`);
                        await supabase.storage.from(this.BUCKET_NAME).remove(productFilesToRemove);
                    }
                }
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
        }
    }

    /**
     * Creates shop folder structure when a shop is created
     */
    static async initializeShopStructure(shopId: number): Promise<DeleteResult> {
        try {
            await this.ensureShopFolder(shopId);

            // Create gallery folder structure
            const galleryPlaceholder = new Blob([''], { type: 'text/plain' });
            await supabase.storage.from(this.BUCKET_NAME).upload(`${shopId}/gallery/.placeholder`, galleryPlaceholder);

            // Create products folder structure
            const productsPlaceholder = new Blob([''], { type: 'text/plain' });
            await supabase.storage.from(this.BUCKET_NAME).upload(`${shopId}/products/.placeholder`, productsPlaceholder);

            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Initialization failed' };
        }
    }

    /**
     * Gets the file path from a storage URL
     */
    static getFilePathFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            // Remove '/storage/v1/object/public/shops/' from the beginning
            const relevantParts = pathParts.slice(6); // Adjust based on your URL structure
            return relevantParts.join('/');
        } catch (error) {
            console.error('Error parsing URL:', error);
            return '';
        }
    }
}

export default StorageManager;

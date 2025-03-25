import React, { useRef, useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import IconUpload from '@/components/icon/icon-camera';

interface ImageUploadProps {
    userId: string;
    url: string | null;
    onUploadComplete: (url: string) => void;
    onError?: (error: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ userId, url, onUploadComplete, onError }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop()?.toLowerCase();
            const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];

            if (!fileExt || !allowedExtensions.includes(fileExt)) {
                throw new Error('Invalid file type. Please upload an image file.');
            }

            // Generate unique filename using provided userId instead of session
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
          

            // Delete old avatar if exists
            const { data: oldFiles } = await supabase.storage.from('avatars').list(userId);

            if (oldFiles?.length) {
                await Promise.all(oldFiles.map((file) => supabase.storage.from('avatars').remove([`${userId}/${file.name}`])));
            }

            // Upload new avatar
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, {
                cacheControl: '3600',
                upsert: true,
            });

            if (uploadError) throw uploadError;

            // Get public URL
            const {
                data: { publicUrl },
            } = supabase.storage.from('avatars').getPublicUrl(fileName);

            onUploadComplete(publicUrl);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error uploading avatar';
            onError?.(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative group cursor-pointer">
            <img src={url || '/assets/images/user-placeholder.webp'} alt="Profile" className="mx-auto h-20 w-20 rounded-full object-cover md:h-32 md:w-32" />

            {/* Overlay */}
            <div
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => fileInputRef.current?.click()}
            >
                <IconUpload className="h-6 w-6 text-white" />
            </div>

            {/* Hidden file input */}
            <input type="file" ref={fileInputRef} onChange={uploadAvatar} accept="image/*" className="hidden" disabled={uploading} />

            {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black bg-opacity-50">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;

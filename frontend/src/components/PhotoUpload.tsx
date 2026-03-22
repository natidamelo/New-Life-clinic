import React, { useState, useRef } from 'react';
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

interface PhotoUploadProps {
  currentPhoto?: string | null;
  onPhotoChange: (photoUrl: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  currentPhoto,
  onPhotoChange,
  size = 'md',
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhoto || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('PhotoUpload: handleFileSelect called');
    const file = event.target.files?.[0];
    console.log('PhotoUpload: selected file:', file);
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Convert to base64 for now (in a real app, you'd upload to a cloud service)
      const base64 = await convertToBase64(file);
      onPhotoChange(base64);
      
      toast.success('Photo updated successfully');
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image');
      setPreviewUrl(currentPhoto || null);
    } finally {
      setIsUploading(false);
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    onPhotoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Photo removed');
  };

  const handleClick = () => {
    console.log('PhotoUpload: handleClick called');
    console.log('PhotoUpload: fileInputRef.current:', fileInputRef.current);
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full border-2 border-dashed border-border/40 cursor-pointer hover:border-border/50 transition-colors flex items-center justify-center bg-muted/10 hover:bg-muted/20`}
        onClick={handleClick}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile"
            className={`${sizeClasses[size]} rounded-full object-cover`}
          />
        ) : (
          <CameraIcon className={`${iconSizes[size]} text-muted-foreground/50`} />
        )}
        
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {previewUrl && (
        <button
          onClick={handleRemovePhoto}
          className="absolute -top-2 -right-2 bg-destructive text-primary-foreground rounded-full p-1 hover:bg-destructive transition-colors"
          disabled={isUploading}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      <div className="mt-2 text-center">
        <p className="text-xs text-muted-foreground">
          Click to {previewUrl ? 'change' : 'add'} photo
        </p>
        <p className="text-xs text-muted-foreground/50">
          Max 10MB, JPG/PNG
        </p>
      </div>
    </div>
  );
};

export default PhotoUpload;

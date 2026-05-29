import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import PhotoUpload from '../components/PhotoUpload';

const BasicInfoSchema = Yup.object().shape({
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
});

const PasswordChangeSchema = Yup.object().shape({
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Password confirmation is required'),
});

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [isUpdatingSignature, setIsUpdatingSignature] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'upload' | 'draw'>('draw');
  const [signaturePreview, setSignaturePreview] = useState<string | null>((user as any)?.digitalSignature || null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Keep signaturePreview in sync with user data
  useEffect(() => {
    if ((user as any)?.digitalSignature) {
      setSignaturePreview((user as any).digitalSignature);
    }
  }, [(user as any)?.digitalSignature]);

  // Canvas drawing helpers
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !lastPosRef.current) return;
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPosRef.current = pos;
    setHasDrawing(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const saveDrawnSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawing) return;
    const dataUrl = canvas.toDataURL('image/png');
    await saveSignature(dataUrl);
  };

  const handleSignatureFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setSignaturePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const saveSignature = async (signatureData: string) => {
    if (!user) return;
    setIsUpdatingSignature(true);
    try {
      await api.put('/api/auth/profile', { digitalSignature: signatureData });
      updateUser({ ...user, digitalSignature: signatureData } as any);
      setSignaturePreview(signatureData);
      toast.success('Digital signature saved successfully!');
    } catch (error) {
      console.error('Error saving digital signature:', error);
      toast.error('Failed to save digital signature');
    } finally {
      setIsUpdatingSignature(false);
    }
  };

  const removeSignature = async () => {
    if (!user) return;
    setIsUpdatingSignature(true);
    try {
      await api.put('/api/auth/profile', { digitalSignature: null });
      updateUser({ ...user, digitalSignature: null } as any);
      setSignaturePreview(null);
      clearCanvas();
      toast.success('Digital signature removed');
    } catch (error) {
      toast.error('Failed to remove digital signature');
    } finally {
      setIsUpdatingSignature(false);
    }
  };

  const basicInfoFormik = useFormik({
    initialValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
    validationSchema: BasicInfoSchema,
    onSubmit: async (values) => {
      try {
        console.log('Profile: Basic info form submitted with values:', values);
        setIsSubmitting(true);
        const response = await api.put('/api/auth/profile', values);
        console.log('Profile: API response:', response.data);
        updateUser({ 
          ...user!, 
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          name: `${values.firstName} ${values.lastName}`
        });
        toast.success('Profile updated successfully');
        setIsEditingBasicInfo(false);
      } catch (error) {
        console.error('Profile: Error updating basic info:', error);
        toast.error('Failed to update profile. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: PasswordChangeSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        setIsSubmitting(true);
        await api.put('/api/auth/profile', {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        });
        toast.success('Password updated successfully');
        resetForm();
      } catch (error) {
        toast.error('Failed to update password. Please check your current password.');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handlePhotoChange = async (photoUrl: string | null) => {
    console.log('Profile: handlePhotoChange called with:', photoUrl);
    if (!user) {
      console.log('Profile: No user found, returning');
      return;
    }
    
    console.log('Profile: Starting photo update...');
    setIsUpdatingPhoto(true);
    try {
      console.log('Profile: Sending API request...');
      await api.put('/api/auth/profile', { photo: photoUrl });
      console.log('Profile: API request successful, updating user...');
      updateUser({ ...user, photo: photoUrl });
      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Error updating photo:', error);
      toast.error('Failed to update profile photo');
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="bg-primary-foreground shadow rounded-lg">
        {/* Profile Photo Section */}
        <div className="p-6 border-b border-border/30">
          <h2 className="text-xl font-semibold text-muted-foreground mb-4">Profile Photo</h2>
          <div className="flex items-center space-x-6">
            <PhotoUpload
              currentPhoto={user?.photo}
              onPhotoChange={handlePhotoChange}
              size="lg"
            />
            <div>
              <p className="text-sm text-muted-foreground">
                Upload a profile photo to personalize your account.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Recommended size: 400x400 pixels. Max file size: 10MB.
              </p>
            </div>
          </div>
        </div>

        {/* Basic Information Section */}
        <div className="p-6 border-b border-border/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-muted-foreground">Basic Information</h2>
            {!isEditingBasicInfo && (
              <button
                type="button"
                onClick={() => setIsEditingBasicInfo(true)}
                className="text-sm text-primary hover:text-primary"
              >
                Edit
              </button>
            )}
          </div>
          
          {isEditingBasicInfo ? (
            <form onSubmit={basicInfoFormik.handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-muted-foreground">
                    First Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={basicInfoFormik.values.firstName}
                      onChange={basicInfoFormik.handleChange}
                      onBlur={basicInfoFormik.handleBlur}
                      className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm ${
                        basicInfoFormik.touched.firstName && basicInfoFormik.errors.firstName
                          ? 'border-destructive/40'
                          : 'border-border/40'
                      }`}
                    />
                    {basicInfoFormik.touched.firstName && basicInfoFormik.errors.firstName && (
                      <p className="mt-2 text-sm text-destructive">{basicInfoFormik.errors.firstName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-muted-foreground">
                    Last Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={basicInfoFormik.values.lastName}
                      onChange={basicInfoFormik.handleChange}
                      onBlur={basicInfoFormik.handleBlur}
                      className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm ${
                        basicInfoFormik.touched.lastName && basicInfoFormik.errors.lastName
                          ? 'border-destructive/40'
                          : 'border-border/40'
                      }`}
                    />
                    {basicInfoFormik.touched.lastName && basicInfoFormik.errors.lastName && (
                      <p className="mt-2 text-sm text-destructive">{basicInfoFormik.errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={basicInfoFormik.values.email}
                      onChange={basicInfoFormik.handleChange}
                      onBlur={basicInfoFormik.handleBlur}
                      className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm ${
                        basicInfoFormik.touched.email && basicInfoFormik.errors.email
                          ? 'border-destructive/40'
                          : 'border-border/40'
                      }`}
                    />
                    {basicInfoFormik.touched.email && basicInfoFormik.errors.email && (
                      <p className="mt-2 text-sm text-destructive">{basicInfoFormik.errors.email}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingBasicInfo(false);
                    basicInfoFormik.resetForm();
                  }}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-primary-foreground border border-border/40 rounded-md hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !basicInfoFormik.isValid}
                  className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary border border-transparent rounded-md hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    (isSubmitting || !basicInfoFormik.isValid) &&
                    'opacity-50 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Name</label>
                <div className="mt-1 p-3 bg-muted/10 border border-border/40 rounded-md">
                  {user?.firstName} {user?.lastName}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Email</label>
                <div className="mt-1 p-3 bg-muted/10 border border-border/40 rounded-md">
                  {user?.email}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Role</label>
                <div className="mt-1 p-3 bg-muted/10 border border-border/40 rounded-md capitalize">
                  {user?.role}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Digital Signature Section */}
        <div className="p-6 border-b border-border/30">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold text-muted-foreground">Digital Signature</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Your signature will appear automatically on printed prescriptions, medical certificates, and other documents.
              </p>
            </div>
            {signaturePreview && (
              <button
                onClick={removeSignature}
                disabled={isUpdatingSignature}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Remove Signature
              </button>
            )}
          </div>

          {/* Current saved signature preview */}
          {signaturePreview && (
            <div className="mb-5 p-3 bg-muted/10 border border-border/40 rounded-md">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Current Signature:</p>
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px', display: 'inline-block' }}>
                <img
                  src={signaturePreview}
                  alt="Digital Signature"
                  style={{ maxHeight: '80px', maxWidth: '280px', objectFit: 'contain' }}
                />
              </div>
            </div>
          )}

          {/* Mode selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSignatureMode('draw')}
              className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                signatureMode === 'draw'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border/40 hover:border-primary/50'
              }`}
            >
              ✏️ Draw Signature
            </button>
            <button
              onClick={() => setSignatureMode('upload')}
              className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                signatureMode === 'upload'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border/40 hover:border-primary/50'
              }`}
            >
              📁 Upload Image
            </button>
          </div>

          {signatureMode === 'draw' && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Draw your signature below using your mouse or touchscreen:</p>
              <div style={{ border: '2px dashed #d1d5db', borderRadius: '8px', background: 'white', display: 'inline-block', touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={160}
                  style={{ display: 'block', cursor: 'crosshair', borderRadius: '6px', maxWidth: '100%' }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={clearCanvas}
                  className="px-3 py-1.5 text-sm text-muted-foreground border border-border/40 rounded-md hover:bg-muted/10 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={saveDrawnSignature}
                  disabled={!hasDrawing || isUpdatingSignature}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md text-primary-foreground bg-primary transition-colors ${
                    (!hasDrawing || isUpdatingSignature) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                  }`}
                >
                  {isUpdatingSignature ? 'Saving...' : 'Save Drawn Signature'}
                </button>
              </div>
            </div>
          )}

          {signatureMode === 'upload' && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Upload a signature image (PNG with transparent background works best):</p>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="sig-upload"
                  className="cursor-pointer px-4 py-2 text-sm font-medium border border-border/40 rounded-md hover:bg-muted/10 transition-colors text-muted-foreground"
                >
                  Choose Image File
                  <input
                    id="sig-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSignatureFileUpload}
                  />
                </label>
                <span className="text-xs text-muted-foreground">PNG, JPG, GIF — max 5MB</span>
              </div>
              {signaturePreview && (
                <div className="mt-4 flex items-end gap-3">
                  <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px' }}>
                    <img src={signaturePreview} alt="Preview" style={{ maxHeight: '80px', maxWidth: '250px', objectFit: 'contain' }} />
                  </div>
                  <button
                    onClick={() => saveSignature(signaturePreview)}
                    disabled={isUpdatingSignature}
                    className={`px-4 py-2 text-sm font-medium rounded-md text-primary-foreground bg-primary transition-colors ${
                      isUpdatingSignature ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                    }`}
                  >
                    {isUpdatingSignature ? 'Saving...' : 'Save Signature'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>


        <form onSubmit={passwordFormik.handleSubmit} className="p-6">
          <h2 className="text-xl font-semibold text-muted-foreground mb-4">Change Password</h2>
          <div className="space-y-6">
            {/* Hidden username field for accessibility */}
            <input
              type="text"
              autoComplete="username"
              value={user?.email || ''}
              style={{ display: 'none' }}
              readOnly
            />

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-muted-foreground">
                Current Password
              </label>
              <div className="mt-1">
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={passwordFormik.values.currentPassword}
                  onChange={passwordFormik.handleChange}
                  onBlur={passwordFormik.handleBlur}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm ${
                    passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword
                      ? 'border-destructive/40'
                      : 'border-border/40'
                  }`}
                />
                {passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword && (
                  <p className="mt-2 text-sm text-destructive">{passwordFormik.errors.currentPassword}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-muted-foreground">
                New Password
              </label>
              <div className="mt-1">
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwordFormik.values.newPassword}
                  onChange={passwordFormik.handleChange}
                  onBlur={passwordFormik.handleBlur}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm ${
                    passwordFormik.touched.newPassword && passwordFormik.errors.newPassword
                      ? 'border-destructive/40'
                      : 'border-border/40'
                  }`}
                />
                {passwordFormik.touched.newPassword && passwordFormik.errors.newPassword && (
                  <p className="mt-2 text-sm text-destructive">{passwordFormik.errors.newPassword}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-muted-foreground">
                Confirm New Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwordFormik.values.confirmPassword}
                  onChange={passwordFormik.handleChange}
                  onBlur={passwordFormik.handleBlur}
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-primary sm:text-sm ${
                    passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword
                      ? 'border-destructive/40'
                      : 'border-border/40'
                  }`}
                />
                {passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword && (
                  <p className="mt-2 text-sm text-destructive">{passwordFormik.errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !passwordFormik.isValid}
                className={`inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  (isSubmitting || !passwordFormik.isValid) &&
                  'opacity-50 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile; 
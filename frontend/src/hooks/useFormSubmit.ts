import { useState } from 'react';
import { toast } from 'react-toastify';

interface UseFormSubmitOptions<T> {
  onSubmit: (data: T) => Promise<any>;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

interface UseFormSubmitResult<T> {
  handleSubmit: (data: T) => Promise<void>;
  isLoading: boolean;
  error: any;
  resetError: () => void;
}

export function useFormSubmit<T>({
  onSubmit,
  onSuccess,
  onError,
  successMessage = 'Operation completed successfully',
  errorMessage = 'An error occurred'
}: UseFormSubmitOptions<T>): UseFormSubmitResult<T> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const resetError = () => setError(null);

  const handleSubmit = async (data: T) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await onSubmit(data);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      if (successMessage) {
        toast.success(successMessage);
      }
      
      return result;
    } catch (err: any) {
      setError(err);
      
      if (onError) {
        onError(err);
      }
      
      // Only show authentication error if it's a real 401
      if (err.response?.status === 401 || (err.message && err.message.toLowerCase().includes('authentication required'))) {
        toast.error('Authentication required. Please log in again.');
      } else {
        const errorMsg = err.response?.data?.message || errorMessage;
        toast.error(errorMsg);
      }
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSubmit,
    isLoading,
    error,
    resetError
  };
} 
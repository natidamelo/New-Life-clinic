import React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface AlertProps {
  variant?: 'success' | 'warning' | 'info' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
  showIcon?: boolean;
}

const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  onClose,
  showIcon = true
}) => {
  // Variant classes and icons
  const variants = {
    success: {
      containerClass: 'bg-primary/10 border-primary/50',
      iconClass: 'text-primary/50',
      titleClass: 'text-primary',
      messageClass: 'text-primary',
      Icon: CheckCircleIcon
    },
    warning: {
      containerClass: 'bg-accent/10 border-yellow-400',
      iconClass: 'text-accent-foreground/50',
      titleClass: 'text-accent-foreground',
      messageClass: 'text-accent-foreground',
      Icon: ExclamationTriangleIcon
    },
    info: {
      containerClass: 'bg-primary/10 border-primary/50',
      iconClass: 'text-primary/50',
      titleClass: 'text-primary',
      messageClass: 'text-primary',
      Icon: InformationCircleIcon
    },
    error: {
      containerClass: 'bg-destructive/10 border-destructive/50',
      iconClass: 'text-destructive/50',
      titleClass: 'text-destructive',
      messageClass: 'text-destructive',
      Icon: XCircleIcon
    }
  };

  const { containerClass, iconClass, titleClass, messageClass, Icon } = variants[variant];

  return (
    <div className={`rounded-md border p-4 ${containerClass}`}>
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden="true" />
          </div>
        )}
        <div className={`ml-${showIcon ? '3' : '0'} flex-1 md:flex md:justify-between`}>
          <div>
            {title && (
              <h3 className={`text-sm font-medium ${titleClass}`}>
                {title}
              </h3>
            )}
            <div className={`text-sm ${messageClass} ${title ? 'mt-2' : ''}`}>
              {message}
            </div>
          </div>
        </div>
        {onClose && (
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              className={`inline-flex rounded-md ${iconClass} hover:${iconClass} focus:outline-none focus:ring-2 focus:ring-offset-2`}
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert; 
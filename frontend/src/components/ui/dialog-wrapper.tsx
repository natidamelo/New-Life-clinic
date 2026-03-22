import React from 'react';
import {
  Dialog as RadixDialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from './dialog';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children
}) => {
  return (
    <RadixDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {title && <DialogTitle>{title}</DialogTitle>}
        {description && <DialogDescription>{description}</DialogDescription>}
        {children}
      </DialogContent>
    </RadixDialog>
  );
};

export default Dialog; 
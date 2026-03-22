import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

interface DropdownMenuContextType {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  toggle: () => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextType | undefined>(undefined);

interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggle = () => setIsOpen(!isOpen);
  
  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen, toggle }}>
      <div className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
};

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ 
  children, 
  asChild = false 
}) => {
  const context = useContext(DropdownMenuContext);
  
  if (!context) {
    throw new Error('DropdownMenuTrigger must be used within a DropdownMenu');
  }
  
  const { toggle } = context;
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        toggle();
        if (children.props.onClick) {
          children.props.onClick(e);
        }
      }
    });
  }
  
  return (
    <button 
      type="button"
      onClick={toggle}
      className="inline-flex justify-center w-full rounded-md border border-border/40 shadow-sm px-4 py-2 bg-primary-foreground text-sm font-medium text-muted-foreground hover:bg-muted/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      {children}
    </button>
  );
};

interface DropdownMenuContentProps {
  align?: 'start' | 'end' | 'center';
  children: React.ReactNode;
  className?: string;
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ 
  children, 
  align = 'center',
  className = ''
}) => {
  const context = useContext(DropdownMenuContext);
  const contentRef = useRef<HTMLDivElement>(null);
  
  if (!context) {
    throw new Error('DropdownMenuContent must be used within a DropdownMenu');
  }
  
  const { isOpen, setIsOpen } = context;
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);
  
  if (!isOpen) return null;
  
  let alignmentClass = 'left-0';
  if (align === 'end') {
    alignmentClass = 'right-0';
  } else if (align === 'center') {
    alignmentClass = 'left-1/2 transform -translate-x-1/2';
  }
  
  return (
    <div
      ref={contentRef}
      className={`absolute mt-2 w-56 rounded-md shadow-lg bg-primary-foreground ring-1 ring-black ring-opacity-5 z-50 ${alignmentClass} ${className}`}
    >
      <div className="py-1" role="menu" aria-orientation="vertical">
        {children}
      </div>
    </div>
  );
};

interface DropdownMenuItemProps {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ 
  onClick, 
  children,
  disabled = false,
  className = ''
}) => {
  const context = useContext(DropdownMenuContext);
  
  if (!context) {
    throw new Error('DropdownMenuItem must be used within a DropdownMenu');
  }
  
  const { setIsOpen } = context;
  
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
    setIsOpen(false);
  };
  
  return (
    <button
      type="button"
      className={`w-full text-left block px-4 py-2 text-sm text-muted-foreground hover:bg-muted/20 hover:text-muted-foreground ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      role="menuitem"
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}; 
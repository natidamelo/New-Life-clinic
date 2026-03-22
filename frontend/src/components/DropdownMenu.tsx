import React, { useState } from 'react';

interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  width?: number;
  className?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = 'right',
  width = 200,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button 
        className="inline-flex w-full justify-center items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        {trigger}
      </button>

      {isOpen && (
        <div className={`absolute z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}>
          <div className="py-1">
            {items.map((item, index) => (
              <React.Fragment key={item.key}>
                {item.divider && index !== 0 && (
                  <div className="my-1 border-t border-border/20" />
                )}
                <button
                  onClick={() => {
                    if (item.onClick) item.onClick();
                    setIsOpen(false);
                  }}
                  disabled={item.disabled}
                  className={`${
                    item.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                  } group flex w-full items-center px-4 py-2 text-sm text-muted-foreground`}
                >
                  {item.icon && (
                    <span className="mr-3 h-4 w-4">{item.icon}</span>
                  )}
                  {item.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
import React from 'react';
import { Tab } from '@headlessui/react';

interface TabItem {
  key: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'pills' | 'underline';
}

const Tabs: React.FC<TabsProps> = ({
  items,
  className = '',
  orientation = 'horizontal',
  variant = 'default'
}) => {
  // Base classes for tab list
  const baseTabListClasses = {
    horizontal: 'flex space-x-1',
    vertical: 'flex flex-col space-y-1'
  };

  // Variant classes for tab
  const variantTabClasses = {
    default: 'rounded-lg py-2.5 px-4 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
    pills: 'rounded-md py-2 px-4 text-sm font-medium focus:outline-none',
    underline: 'border-b-2 py-2 px-4 text-sm font-medium focus:outline-none'
  };

  // Selected state classes for each variant
  const selectedClasses = {
    default: 'bg-primary-foreground shadow text-primary',
    pills: 'bg-primary text-primary-foreground',
    underline: 'border-primary text-primary'
  };

  // Not selected state classes for each variant
  const notSelectedClasses = {
    default: 'text-muted-foreground hover:bg-primary-foreground/[0.12] hover:text-muted-foreground',
    pills: 'text-muted-foreground hover:text-muted-foreground',
    underline: 'border-transparent text-muted-foreground hover:border-border/40 hover:text-muted-foreground'
  };

  // Disabled state classes
  const disabledClasses = 'opacity-50 cursor-not-allowed';

  return (
    <Tab.Group>
      <Tab.List className={`${baseTabListClasses[orientation]} ${variant === 'underline' ? 'border-b border-border/30' : ''}`}>
        {items.map((item) => (
          <Tab
            key={item.key}
            className={({ selected }) =>
              `${variantTabClasses[variant]} ${
                selected
                  ? selectedClasses[variant]
                  : notSelectedClasses[variant]
              } ${item.disabled ? disabledClasses : ''}`
            }
          >
            {item.label}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className="mt-2">
        {items.map((item) => (
          <Tab.Panel
            key={item.key}
            className="rounded-xl p-3 focus:outline-none"
          >
            {item.content}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
};

export default Tabs; 
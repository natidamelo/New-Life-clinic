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
    default: 'rounded-lg py-2.5 px-4 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-[var(--color-brand-primary)] focus:outline-none focus:ring-2',
    pills: 'rounded-md py-2 px-4 text-sm font-medium focus:outline-none',
    underline: 'border-b-2 py-2 px-4 text-sm font-medium focus:outline-none'
  };

  // Selected state classes for each variant
  const selectedClasses = {
    default: 'bg-[var(--color-surface)] shadow text-[var(--color-brand-primary)]',
    pills: 'bg-[var(--color-brand-primary)] text-[var(--color-brand-on-primary)]',
    underline: 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)]'
  };

  // Not selected state classes for each variant
  const notSelectedClasses = {
    default: 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)]/20 hover:text-[var(--color-text-primary)]',
    pills: 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
    underline: 'border-transparent text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text-primary)]'
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
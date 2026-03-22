declare module '@headlessui/react' {
  import { ReactNode } from 'react';

  export const Tab: {
    Group: React.FC<{ children: ReactNode }>;
    List: React.FC<{ children: ReactNode; className?: string }>;
    Panel: React.FC<{ children: ReactNode; className?: string }>;
    Panels: React.FC<{ children: ReactNode; className?: string }>;
  } & React.FC<{
    children: ReactNode;
    className?: string | (({ selected }: { selected: boolean }) => string);
  }>;
} 
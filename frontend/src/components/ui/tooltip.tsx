import React, { useState, ReactNode } from 'react';

interface TooltipProviderProps {
  children: ReactNode;
}

interface TooltipProps {
  children: ReactNode;
}

interface TooltipTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

interface TooltipContentProps {
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  sideOffset?: number;
}

const TooltipContext = React.createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  side: 'top' | 'right' | 'bottom' | 'left';
  setSide: React.Dispatch<React.SetStateAction<'top' | 'right' | 'bottom' | 'left'>>;
}>({
  open: false,
  setOpen: () => {},
  side: 'top',
  setSide: () => {},
});

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export const Tooltip: React.FC<TooltipProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<'top' | 'right' | 'bottom' | 'left'>('left');

  return (
    <TooltipContext.Provider value={{ open, setOpen, side, setSide }}>
      <div className="relative inline-block">{children}</div>
    </TooltipContext.Provider>
  );
};

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({ children, asChild }) => {
  const { setOpen } = React.useContext(TooltipContext);

  // If the child is meant to be used as-is (asChild prop), clone it with event handlers
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...children.props,
      onMouseEnter: (e: React.MouseEvent) => {
        setOpen(true);
        if (children.props.onMouseEnter) children.props.onMouseEnter(e);
      },
      onMouseLeave: (e: React.MouseEvent) => {
        setOpen(false);
        if (children.props.onMouseLeave) children.props.onMouseLeave(e);
      },
      onFocus: (e: React.FocusEvent) => {
        setOpen(true);
        if (children.props.onFocus) children.props.onFocus(e);
      },
      onBlur: (e: React.FocusEvent) => {
        setOpen(false);
        if (children.props.onBlur) children.props.onBlur(e);
      },
    });
  }

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      className="inline-block"
    >
      {children}
    </div>
  );
};

export const TooltipContent: React.FC<TooltipContentProps> = ({
  children,
  side = 'left',
  className = '',
  sideOffset = 5,
}) => {
  const { open, side: contextSide } = React.useContext(TooltipContext);
  const activeSide = side || contextSide;

  if (!open) return null;

  const positionStyles: Record<string, React.CSSProperties> = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: sideOffset,
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: sideOffset,
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: sideOffset,
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: sideOffset,
    },
  };

  return (
    <div
      className={`absolute z-50 px-3 py-1.5 text-sm rounded-md border border-border/30 bg-primary-foreground text-muted-foreground shadow-md ${className}`}
      style={positionStyles[activeSide]}
    >
      {children}
    </div>
  );
}; 
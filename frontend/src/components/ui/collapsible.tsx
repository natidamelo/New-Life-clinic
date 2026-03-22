"use client"

import React, { createContext, useContext, useState } from "react"
import { cn } from "../../lib/utils"

interface CollapsibleContextValue {
  isOpen: boolean
  toggle: () => void
}

const CollapsibleContext = createContext<CollapsibleContextValue | undefined>(undefined)

function useCollapsible() {
  const context = useContext(CollapsibleContext)
  if (!context) {
    throw new Error("useCollapsible must be used within a Collapsible")
  }
  return context
}

interface CollapsibleProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
}

function Collapsible({ 
  defaultOpen = false, 
  children, 
  className, 
  ...props 
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  const toggle = () => setIsOpen(!isOpen)
  
  return (
    <CollapsibleContext.Provider value={{ isOpen, toggle }}>
      <div className={cn("space-y-0", className)} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  )
}

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function CollapsibleTrigger({ 
  children, 
  className, 
  onClick,
  ...props 
}: CollapsibleTriggerProps) {
  const { toggle } = useCollapsible()
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    toggle()
    onClick?.(e)
  }
  
  return (
    <button 
      className={cn("w-full", className)} 
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
}

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function CollapsibleContent({ 
  children, 
  className, 
  ...props 
}: CollapsibleContentProps) {
  const { isOpen } = useCollapsible()
  
  if (!isOpen) return null
  
  return (
    <div 
      className={cn(
        "animate-in slide-in-from-top-1 duration-200 ease-out",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }

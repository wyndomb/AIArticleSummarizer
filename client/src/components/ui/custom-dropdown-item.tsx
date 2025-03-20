import React from "react";
import { cn } from "@/lib/utils";

interface CustomDropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  inset?: boolean;
  disabled?: boolean;
}

/**
 * A custom dropdown menu item that doesn't use interactive elements internally
 * to avoid nested anchor/button issues
 */
export function CustomDropdownItem({
  className,
  inset,
  disabled,
  children,
  ...props
}: CustomDropdownItemProps) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className
      )}
      data-disabled={disabled ? true : undefined}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      {...props}
    >
      {children}
    </div>
  );
}

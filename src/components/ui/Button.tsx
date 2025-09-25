'use client';

import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    children,
    disabled,
    ...props
  }, ref) => {
    const sizeClasses = {
      sm: 'px-3 py-1.5 ',
      md: 'px-4 py-2', // This was the original default: padding: 0.5rem 1rem (py-2 px-4), font-size: 0.875rem (text-lg)
      lg: 'px-6 py-3 text-lg',
      xl: 'px-10 py-6 text-xl',
    };

    const iconSizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-8 h-8',
    };

    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
    };

    return (
      <button
        className={cn(
          'btn',
          variantClasses[variant],
          'rounded-sm',
          className,
          sizeClasses[size] // Put size classes last to ensure they override any conflicting className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <div className={cn("border-2 border-current border-t-transparent rounded-full animate-spin", iconSizeClasses[size])} />
            กำลังประมวลผล...
          </>
        ) : (
          <>
            {Icon && iconPosition === 'left' && (
              <Icon className={iconSizeClasses[size]} />
            )}
            {children}
            {Icon && iconPosition === 'right' && (
              <Icon className={iconSizeClasses[size]} />
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
'use client';

import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => {
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      // Prevent scroll wheel from changing number inputs
      if (type === 'number') {
        e.currentTarget.blur();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent up/down arrow keys from changing number inputs
      if (type === 'number' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-lg font-light text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            'input-underline w-full',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1  text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1  text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
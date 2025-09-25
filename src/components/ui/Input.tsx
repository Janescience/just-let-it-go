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
'use client';

import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  onChange?: (value: string) => void;
  allowDecimal?: boolean;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, label, error, helperText, onChange, allowDecimal = true, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      // Allow empty string (will be treated as 0 when needed)
      if (value === '') {
        onChange?.(value);
        return;
      }

      // Only allow numbers and decimal point if allowDecimal is true
      const regex = allowDecimal ? /^\d*\.?\d*$/ : /^\d*$/;

      if (regex.test(value)) {
        onChange?.(value);
      }
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      // Prevent scroll wheel from changing the number
      e.currentTarget.blur();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent up/down arrow keys from changing the number
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
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
          type="text"
          inputMode="numeric"
          pattern={allowDecimal ? "[0-9]*\\.?[0-9]*" : "[0-9]*"}
          className={cn(
            'input-underline w-full',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          onChange={handleChange}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

NumberInput.displayName = 'NumberInput';

export { NumberInput };
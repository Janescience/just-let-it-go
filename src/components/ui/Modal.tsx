'use client';

import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils/cn';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  footer?: ReactNode;
  hasFixedFooter?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnClickOutside = true,
  closeOnEscape = true,
  className,
  footer,
  hasFixedFooter = false
}) => {
  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnClickOutside && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1 md:p-4">
      {/* Backdrop with minimal blur */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={handleBackdropClick}
      />

      {/* Modal Content */}
      <div
        className={cn(
          'relative bg-white rounded-md shadow-2xl w-full max-h-[95vh] overflow-hidden',
          hasFixedFooter ? 'flex flex-col' : '',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            {title && (
              <h2 className="text-xl font-light text-gray-900">{title}</h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                icon={X}
                className="ml-auto"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn(
          hasFixedFooter
            ? "flex-1 overflow-y-auto"
            : "overflow-y-auto max-h-[calc(95vh-100px)]"
        )}>
          {children}
        </div>

        {/* Fixed Footer */}
        {hasFixedFooter && footer && (
          <div className="border-t border-gray-200 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export { Modal };
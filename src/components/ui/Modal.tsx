'use client';

import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ModalActionButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentType<any>;
  className?: string;
}

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
  // Dynamic action buttons
  actions?: ModalActionButton[];
  showFooterBorder?: boolean;
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
  hasFixedFooter = true, // Default to true for better UX
  actions
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

  // Determine if we have any footer content
  const hasFooterContent = (footer && hasFixedFooter) || (actions && actions.length > 0);

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
          'relative bg-white shadow-2xl w-full max-h-[95vh] overflow-hidden flex flex-col',
          sizeClasses[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
            {title && (
              <h2 className="text-xl font-thin text-black tracking-wide">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Fixed Footer */}
        {hasFooterContent && (
          <div className="flex-shrink-0 border-t border-gray-100 bg-white">
            {/* Custom Footer */}
            {footer && hasFixedFooter && (
              <div>{footer}</div>
            )}

            {/* Action Buttons */}
            {actions && actions.length > 0 && (
              <div className="p-6">
                <div className="flex gap-3 justify-end">
                  {actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={cn(
                        "px-6 py-2 text-sm font-light tracking-wide transition-colors duration-200",
                        action.variant === 'primary'
                          ? "bg-black text-white hover:bg-gray-800 disabled:bg-gray-300"
                          : "border border-gray-200 text-black hover:bg-gray-50 disabled:text-gray-400",
                        action.disabled && "cursor-not-allowed",
                        action.className
                      )}
                    >
                      {action.loading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {action.label}
                        </div>
                      ) : (
                        action.label
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { Modal };
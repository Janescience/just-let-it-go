import { NextRequest } from 'next/server';
import ErrorLog, { IErrorLog } from '@/lib/models/ErrorLog';
import { connectDB } from '@/lib/db';

export interface ErrorContext {
  module: string;
  function: string;
  userId?: string;
  brandId?: string;
  boothId?: string;
  saleId?: string;
  transactionId?: string;
  additionalData?: any;
}

export interface LogErrorParams {
  level?: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  error?: Error | any;
  errorCode?: string;
  context: ErrorContext;
  request?: NextRequest;
}

/**
 * Log error to database with context
 */
export async function logError({
  level = 'error',
  message,
  error,
  errorCode,
  context,
  request
}: LogErrorParams): Promise<void> {
  try {
    await connectDB();

    const errorLog: Partial<IErrorLog> = {
      level,
      message,
      errorCode,
      context,
      resolved: false
    };

    // Extract error details
    if (error) {
      if (error instanceof Error) {
        errorLog.stack = error.stack;
        if (errorLog.message && !errorLog.message.includes(error.message)) {
          errorLog.message = `${message}: ${error.message}`;
        }
      } else if (typeof error === 'string') {
        errorLog.message = `${message}: ${error}`;
      } else {
        // Try to stringify object errors
        try {
          errorLog.message = `${message}: ${JSON.stringify(error)}`;
        } catch {
          errorLog.message = `${message}: [Object error - could not stringify]`;
        }
      }
    }

    // Extract request details if available
    if (request) {
      errorLog.userAgent = request.headers.get('user-agent') || undefined;
      errorLog.ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                         request.headers.get('x-real-ip') ||
                         undefined;
    }

    await ErrorLog.create(errorLog);

    // Also log to console for immediate visibility
    const logLevel = level === 'error' ? console.error :
                    level === 'warning' ? console.warn :
                    level === 'info' ? console.info : console.log;

    logLevel(`[${level.toUpperCase()}] [${context.module}:${context.function}]`, {
      message: errorLog.message,
      context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    });

  } catch (loggingError) {
    // Fallback to console if database logging fails
    console.error('Failed to log error to database:', loggingError);
    console.error('Original error:', { level, message, error, context });
  }
}

/**
 * Helper function for logging sales-related errors
 */
export async function logSalesError(
  message: string,
  error?: Error | any,
  context?: Partial<ErrorContext>,
  request?: NextRequest
): Promise<void> {
  return logError({
    level: 'error',
    message,
    error,
    errorCode: 'SALES_ERROR',
    context: {
      module: 'sales',
      function: 'unknown',
      ...context
    },
    request
  });
}

/**
 * Helper function for logging accounting-related errors
 */
export async function logAccountingError(
  message: string,
  error?: Error | any,
  context?: Partial<ErrorContext>,
  request?: NextRequest
): Promise<void> {
  return logError({
    level: 'error',
    message,
    error,
    errorCode: 'ACCOUNTING_ERROR',
    context: {
      module: 'accounting',
      function: 'unknown',
      ...context
    },
    request
  });
}

/**
 * Helper function for logging inventory-related errors
 */
export async function logInventoryError(
  message: string,
  error?: Error | any,
  context?: Partial<ErrorContext>,
  request?: NextRequest
): Promise<void> {
  return logError({
    level: 'error',
    message,
    error,
    errorCode: 'INVENTORY_ERROR',
    context: {
      module: 'inventory',
      function: 'unknown',
      ...context
    },
    request
  });
}

/**
 * Helper function for logging payment-related errors
 */
export async function logPaymentError(
  message: string,
  error?: Error | any,
  context?: Partial<ErrorContext>,
  request?: NextRequest
): Promise<void> {
  return logError({
    level: 'error',
    message,
    error,
    errorCode: 'PAYMENT_ERROR',
    context: {
      module: 'payment',
      function: 'unknown',
      ...context
    },
    request
  });
}

/**
 * Helper function for logging authentication-related errors
 */
export async function logAuthError(
  message: string,
  error?: Error | any,
  context?: Partial<ErrorContext>,
  request?: NextRequest
): Promise<void> {
  return logError({
    level: 'warning',
    message,
    error,
    errorCode: 'AUTH_ERROR',
    context: {
      module: 'auth',
      function: 'unknown',
      ...context
    },
    request
  });
}

/**
 * Helper function for logging system-related errors
 */
export async function logSystemError(
  message: string,
  error?: Error | any,
  context?: Partial<ErrorContext>,
  request?: NextRequest
): Promise<void> {
  return logError({
    level: 'error',
    message,
    error,
    errorCode: 'SYSTEM_ERROR',
    context: {
      module: 'system',
      function: 'unknown',
      ...context
    },
    request
  });
}

/**
 * Create a wrapped function that logs errors automatically
 */
export function withErrorLogging<T extends (...args: any[]) => any>(
  fn: T,
  context: ErrorContext
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result.catch(async (error) => {
          await logError({
            message: `Function ${context.function} failed`,
            error,
            context
          });
          throw error;
        });
      }

      return result;
    } catch (error) {
      // Handle sync functions
      logError({
        message: `Function ${context.function} failed`,
        error,
        context
      }).catch(() => {}); // Don't let logging errors break the main flow
      throw error;
    }
  }) as T;
}

/**
 * Mark an error as resolved
 */
export async function resolveError(
  errorId: string,
  resolvedBy: string,
  notes?: string
): Promise<void> {
  try {
    await connectDB();
    await ErrorLog.findByIdAndUpdate(errorId, {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      notes
    });
  } catch (error) {
    console.error('Failed to resolve error:', error);
  }
}
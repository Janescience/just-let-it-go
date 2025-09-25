import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, addSecurityHeaders, detectSuspiciousActivity, sanitizeRequestBody } from '@/utils/security';

export function withSecurity(handler: (request: NextRequest) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Apply security headers
      let response = NextResponse.next();

      // Rate limiting for API routes
      if (request.nextUrl.pathname.startsWith('/api/')) {
        const isLoginEndpoint = request.nextUrl.pathname === '/api/auth/login';
        const rateLimitType = isLoginEndpoint ? 'login' : 'api';

        const rateLimit = applyRateLimit(request, rateLimitType);
        if (!rateLimit.allowed && rateLimit.response) {
          return addSecurityHeaders(rateLimit.response);
        }
      }

      // Detect suspicious activity
      const suspiciousActivity = detectSuspiciousActivity(request);
      if (suspiciousActivity.suspicious) {
        console.warn('Suspicious activity detected:', {
          ip: request.ip,
          userAgent: request.headers.get('user-agent'),
          path: request.nextUrl.pathname,
          reasons: suspiciousActivity.reasons
        });

        // Block if too many suspicious indicators
        if (suspiciousActivity.reasons.length >= 2) {
          const response = NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          );
          return addSecurityHeaders(response);
        }
      }

      // Sanitize request body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const contentType = request.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const body = await request.json();
            const sanitizedBody = sanitizeRequestBody(body);

            // Create new request with sanitized body
            const sanitizedRequest = new NextRequest(request.url, {
              method: request.method,
              headers: request.headers,
              body: JSON.stringify(sanitizedBody)
            });

            response = await handler(sanitizedRequest);
          } else {
            response = await handler(request);
          }
        } catch (error) {
          console.error('Error processing request body:', error);
          response = await handler(request);
        }
      } else {
        response = await handler(request);
      }

      return addSecurityHeaders(response);
    } catch (error) {
      console.error('Security middleware error:', error);
      const errorResponse = NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      );
      return addSecurityHeaders(errorResponse);
    }
  };
}

// CORS helper for API routes
export function withCORS(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
  ].filter(Boolean);

  const requestOrigin = origin || '';
  const isAllowedOrigin = allowedOrigins.some(allowed =>
    allowed && requestOrigin.startsWith(allowed)
  );

  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', requestOrigin);
  } else if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response;
}

// Input validation middleware
export function validateRequiredFields(body: any, requiredFields: string[]): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// File upload security
export function validateFileUpload(file: File): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // File size limit (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)');
  }

  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push('ประเภทไฟล์ไม่ได้รับอนุญาต');
  }

  // Check file name
  const fileName = file.name;
  if (fileName.length > 255) {
    errors.push('ชื่อไฟล์ยาวเกินไป');
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.php$/i,
    /\.exe$/i,
    /\.bat$/i,
    /\.sh$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /\.js$/i,
    /\.html$/i,
    /\.htm$/i
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(fileName))) {
    errors.push('ประเภทไฟล์ไม่ปลอดภัย');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Database query sanitization
export function sanitizeMongoQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return query;
  }

  if (Array.isArray(query)) {
    return query.map(item => sanitizeMongoQuery(item));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(query)) {
    // Prevent NoSQL injection
    if (key.startsWith('$') || key.includes('.')) {
      continue; // Skip potentially dangerous operators
    }

    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMongoQuery(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
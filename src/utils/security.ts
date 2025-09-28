import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from './validation';

// Rate limiting configuration
const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  upload: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
};

// Get client IP address
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

// Apply rate limiting
export function applyRateLimit(
  request: NextRequest,
  type: keyof typeof RATE_LIMITS = 'api'
): { allowed: boolean; response?: NextResponse } {
  const ip = getClientIP(request);
  const key = `${type}:${ip}`;
  const limit = RATE_LIMITS[type];

  const result = checkRateLimit(key, limit.maxRequests, limit.windowMs);

  if (!result.allowed) {
    const response = NextResponse.json(
      {
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      },
      { status: 429 }
    );

    response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
    response.headers.set('X-RateLimit-Limit', limit.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    return { allowed: false, response };
  }

  return { allowed: true };
}

// CSRF protection
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function verifyCSRFToken(token: string, sessionToken: string): boolean {
  return token === sessionToken;
}

// Content Security Policy
export function getCSPHeader(): string {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval and unsafe-inline
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];

  return csp.join('; ');
}

// Security headers
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', getCSPHeader());

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Strict Transport Security (HTTPS only)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

// Input sanitization for API requests
export function sanitizeRequestBody(body: any): any {
  if (typeof body !== 'object' || body === null) {
    return body;
  }

  if (Array.isArray(body)) {
    return body.map(item => sanitizeRequestBody(item));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeRequestBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number; // 0-4
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('ใช้อย่างน้อย 8 ตัวอักษร');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('ใช้ตัวอักษรพิมพ์เล็ก');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('ใช้ตัวอักษรพิมพ์ใหญ่');
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push('ใช้ตัวเลข');
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++;
  } else {
    feedback.push('ใช้สัญลักษณ์พิเศษ');
  }

  return { score: Math.min(score, 4), feedback };
}

// Detect suspicious activity
export function detectSuspiciousActivity(request: NextRequest): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';

  // Check for bot user agents
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i
  ];

  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    reasons.push('Bot user agent detected');
  }

  // Check for missing user agent
  if (!userAgent) {
    reasons.push('Missing user agent');
  }

  // Check for suspicious referers
  if (referer && !referer.includes(request.headers.get('host') || '')) {
    reasons.push('External referer');
  }

  // Check request frequency (basic implementation)
  const ip = getClientIP(request);
  const recentRequests = checkRateLimit(`suspicious:${ip}`, 50, 60000);

  if (!recentRequests.allowed) {
    reasons.push('High request frequency');
  }

  return {
    suspicious: reasons.length > 0,
    reasons
  };
}
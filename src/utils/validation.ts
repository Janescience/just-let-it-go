// Input validation and sanitization utilities

// HTML sanitization
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

// Remove HTML tags
export function stripHtml(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/<[^>]*>/g, '').trim();
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate Thai phone number
export function isValidThaiPhone(phone: string): boolean {
  const phoneRegex = /^(\+66|0)[0-9]{8,9}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
}

// Validate password strength
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
  }

  if (password.length > 128) {
    errors.push('รหัสผ่านยาวเกินไป');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('รหัสผ่านต้องมีตัวอักษร');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('รหัสผ่านต้องมีตัวเลข');
  }

  // Check for common weak passwords
  const weakPasswords = ['123456', 'password', '123456789', 'qwerty', 'abc123'];
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('รหัสผ่านนี้ไม่ปลอดภัย');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate username
export function validateUsername(username: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (username.length < 3) {
    errors.push('ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร');
  }

  if (username.length > 20) {
    errors.push('ชื่อผู้ใช้ยาวเกินไป');
  }

  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    errors.push('ชื่อผู้ใช้สามารถใช้ตัวอักษร ตัวเลข _ . - เท่านั้น');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate numeric input
export function validateNumber(value: any, options: {
  min?: number;
  max?: number;
  integer?: boolean;
} = {}): {
  isValid: boolean;
  value: number | null;
  errors: string[];
} {
  const errors: string[] = [];
  let numValue: number | null = null;

  if (value === null || value === undefined || value === '') {
    errors.push('กรุณาใส่ตัวเลข');
    return { isValid: false, value: null, errors };
  }

  numValue = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(numValue)) {
    errors.push('ค่าที่ใส่ไม่ใช่ตัวเลข');
    return { isValid: false, value: null, errors };
  }

  if (options.integer && !Number.isInteger(numValue)) {
    errors.push('ต้องเป็นจำนวนเต็ม');
  }

  if (options.min !== undefined && numValue < options.min) {
    errors.push(`ค่าต้องไม่น้อยกว่า ${options.min}`);
  }

  if (options.max !== undefined && numValue > options.max) {
    errors.push(`ค่าต้องไม่มากกว่า ${options.max}`);
  }

  return {
    isValid: errors.length === 0,
    value: numValue,
    errors
  };
}

// Validate date
export function validateDate(date: any): {
  isValid: boolean;
  value: Date | null;
  errors: string[];
} {
  const errors: string[] = [];

  if (!date) {
    errors.push('กรุณาใส่วันที่');
    return { isValid: false, value: null, errors };
  }

  const dateValue = new Date(date);

  if (isNaN(dateValue.getTime())) {
    errors.push('รูปแบบวันที่ไม่ถูกต้อง');
    return { isValid: false, value: null, errors };
  }

  return {
    isValid: true,
    value: dateValue,
    errors: []
  };
}

// Validate ObjectId format
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime
    };
  }

  record.count++;
  rateLimitMap.set(key, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime
  };
}

// Clean up old rate limit records
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute
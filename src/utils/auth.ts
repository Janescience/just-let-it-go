import { AuthSession } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper functions for safe Base64 encoding/decoding
function safeBase64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function safeBase64Decode(str: string): string {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4);
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(str)));
}

// Simple JWT implementation for Edge Runtime compatibility
export function generateToken(payload: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (7 * 24 * 60 * 60); // 7 days

  const tokenPayload = {
    ...payload,
    iat: now,
    exp: exp
  };

  const encodedHeader = safeBase64Encode(JSON.stringify(header));
  const encodedPayload = safeBase64Encode(JSON.stringify(tokenPayload));
  const signature = safeBase64Encode(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): any {
  try {

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;
    const expectedSignature = safeBase64Encode(`${header}.${payload}.${JWT_SECRET}`);

    if (signature !== expectedSignature) {
      return null;
    }

    const decodedPayload = JSON.parse(safeBase64Decode(payload));
    const now = Math.floor(Date.now() / 1000);

    if (decodedPayload.exp && decodedPayload.exp < now) {
      return null;
    }

    return decodedPayload;
  } catch (error) {
    return null;
  }
}

export function createAuthCookie(session: AuthSession): string {
  const expires = new Date(session.expires);
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? 'Secure; ' : '';
  return `auth-token=${generateToken(session)}; Path=/; HttpOnly; ${secureFlag}SameSite=Strict; Expires=${expires.toUTCString()}`;
}

export function clearAuthCookie(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? 'Secure; ' : '';
  return `auth-token=; Path=/; HttpOnly; ${secureFlag}SameSite=Strict; Max-Age=0`;
}
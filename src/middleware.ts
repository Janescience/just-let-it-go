import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/utils/auth';

// Routes that don't require authentication
const publicRoutes = ['/login', '/setup'];

// Routes that only super admin can access
const superAdminOnlyRoutes = ['/super-admin'];

// Routes that only admin can access
const adminOnlyRoutes = ['/', '/booth', '/reports', '/settings', '/inventory'];

// Routes that only staff can access
const staffOnlyRoutes = ['/sales'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;


  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow API routes (handled separately)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check authentication
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Not authenticated - redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const payload = verifyToken(token);
  if (!payload || !payload.user) {
    // Invalid token - redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }


  const userRole = payload.user.role;

  // Role-based access control
  if (userRole === 'super_admin') {
    // Super admin can only access super admin routes
    if (!superAdminOnlyRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/super-admin', request.url));
    }
    return NextResponse.next();
  }

  if (userRole === 'admin') {
    // Admin cannot access super admin routes
    if (superAdminOnlyRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Admin can access all other routes except super admin
    return NextResponse.next();
  }

  if (userRole === 'staff') {
    // Staff cannot access super admin routes
    if (superAdminOnlyRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/sales', request.url));
    }
    // Staff can only access sales page
    if (!staffOnlyRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/sales', request.url));
    }
    return NextResponse.next();
  }

  // Invalid role - redirect to login
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('auth-token');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateToken } from '@/utils/auth';
import { addSecurityHeaders } from '@/utils/security';
import { AuthSession } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      const response = NextResponse.json(
        { message: 'ไม่มีสิทธิ์ในการเข้าถึง' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user || !payload.user.currentBrandId) {
      const response = NextResponse.json(
        { message: 'ไม่มีสิทธิ์ในการเข้าถึง' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Create new session without brand context
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days

    const session: AuthSession = {
      user: {
        id: payload.user.id,
        username: payload.user.username,
        name: payload.user.name,
        role: 'super_admin', // Return to super admin role
        brandId: undefined,
        boothId: undefined,
        currentBrandId: undefined, // Clear brand context
      },
      expires: expires.toISOString(),
    };

    // Create response
    const response = NextResponse.json({
      message: 'กลับสู่ Super Admin สำเร็จ',
    });

    // Update cookie with new session
    const newToken = generateToken(session);
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/'
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Return to super admin error:', error);
    const response = NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
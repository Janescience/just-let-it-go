import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { AuthSession } from '@/types';
import { generateToken } from '@/utils/auth';
import { applyRateLimit, addSecurityHeaders } from '@/utils/security';
import { sanitizeString, validateUsername } from '@/utils/validation';

export async function POST(request: NextRequest) {
  // Apply rate limiting for login attempts
  const rateLimit = applyRateLimit(request, 'login');
  if (!rateLimit.allowed && rateLimit.response) {
    return addSecurityHeaders(rateLimit.response);
  }

  try {
    await dbConnect();

    const { username, password } = await request.json();

    if (!username || !password) {
      const response = NextResponse.json(
        { message: 'กรุณาใส่ชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Sanitize and validate input
    const cleanUsername = sanitizeString(username);
    const usernameValidation = validateUsername(cleanUsername);

    if (!usernameValidation.isValid) {
      const response = NextResponse.json(
        { message: usernameValidation.errors[0] },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    if (typeof password !== 'string' || password.length > 128) {
      const response = NextResponse.json(
        { message: 'รหัสผ่านไม่ถูกต้อง' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Find user by username
    const user = await User.findOne({
      username: cleanUsername.toLowerCase(),
      isActive: true
    });

    if (!user) {
      const response = NextResponse.json(
        { message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const response = NextResponse.json(
        { message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Create session
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days

    const session: AuthSession = {
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        role: user.role,
        brandId: user.brandId.toString(),
        boothId: user.boothId?.toString(),
      },
      expires: expires.toISOString(),
    };

    // Create response with auth cookie
    const response = NextResponse.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: session.user,
    });

    // Set cookie using NextResponse.cookies() method
    const token = generateToken(session);
    const isProduction = process.env.NODE_ENV === 'production';

    console.log('Setting cookie with token:', token.substring(0, 20) + '...');
    console.log('Cookie settings:', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/'
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Login error:', error);
    const response = NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
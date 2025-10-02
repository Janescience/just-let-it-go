import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import { verifyToken, generateToken } from '@/utils/auth';
import { addSecurityHeaders } from '@/utils/security';
import { AuthSession } from '@/types';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

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
    if (!payload || !payload.user || payload.user.role !== 'super_admin') {
      const response = NextResponse.json(
        { message: 'ไม่มีสิทธิ์ในการเข้าถึง' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    const { brandId } = await request.json();

    if (!brandId) {
      const response = NextResponse.json(
        { message: 'กรุณาระบุ Brand ID' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Verify brand exists
    const brand = await Brand.findById(brandId);
    if (!brand) {
      const response = NextResponse.json(
        { message: 'ไม่พบแบรนด์ที่ระบุ' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Create new session as admin of the selected brand (not as super_admin)
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days

    const session: AuthSession = {
      user: {
        id: payload.user.id,
        username: payload.user.username,
        name: payload.user.name,
        role: 'admin', // Change role to admin for seamless experience
        brandId: brandId, // Set as if they are admin of this brand
        boothId: undefined,
        currentBrandId: brandId, // Keep track that this is from super admin switching
      },
      expires: expires.toISOString(),
    };

    // Create response
    const response = NextResponse.json({
      message: 'เปลี่ยนแบรนด์สำเร็จ',
      brand: brand.toObject(),
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
    console.error('Switch brand error:', error);
    const response = NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
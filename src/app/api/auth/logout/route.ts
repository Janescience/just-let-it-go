import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/utils/auth';

export async function POST() {
  try {
    const response = NextResponse.json({
      message: 'ออกจากระบบเรียบร้อยแล้ว',
    });

    response.headers.set('Set-Cookie', clearAuthCookie());

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
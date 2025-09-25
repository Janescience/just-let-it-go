import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Brand from '@/lib/models/Brand';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user) {
      return NextResponse.json(
        { message: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // if (payload.user.role !== 'admin') {
    //   return NextResponse.json(
    //     { message: 'ไม่มีสิทธิ์เข้าถึง' },
    //     { status: 403 }
    //   );
    // }

    await connectDB();

    const brand = await Brand.findOne({ _id: payload.user.brandId });

    if (!brand) {
      return NextResponse.json(
        { message: 'ไม่พบข้อมูลแบรนด์' },
        { status: 404 }
      );
    }

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('Error fetching brand:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user) {
      return NextResponse.json(
        { message: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if (payload.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, logo, paymentInfo } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'กรุณาระบุชื่อแบรนด์' },
        { status: 400 }
      );
    }

    await connectDB();

    const brand = await Brand.findOne({ _id: payload.user.brandId });

    if (!brand) {
      return NextResponse.json(
        { message: 'ไม่พบข้อมูลแบรนด์' },
        { status: 404 }
      );
    }

    // Update brand data
    brand.name = name.trim();
    if (logo !== undefined) {
      brand.logo = logo;
    }
    if (paymentInfo) {
      brand.paymentInfo = {
        phone: paymentInfo.phone?.trim() || null,
        idCard: paymentInfo.idCard?.trim() || null,
        eWallet: paymentInfo.eWallet?.trim() || null,
        paotang: paymentInfo.paotang?.trim() || null,
      };
    }

    await brand.save();

    return NextResponse.json({
      message: 'อัปเดตข้อมูลแบรนด์เรียบร้อยแล้ว',
      brand
    });
  } catch (error) {
    console.error('Error updating brand:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
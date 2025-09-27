import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Equipment from '@/lib/models/Equipment';

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

    await connectDB();

    const equipment = await Equipment.find({ brandId: payload.user.brandId })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      equipment
    });
  } catch (error: any) {
    console.error('Equipment fetch error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const data = await request.json();
    const {
      name,
      description,
      items,
      totalPrice,
      estimatedLifespanDays,
      dailyCost,
      purchaseDate,
      status,
      notes
    } = data;

    // Validate required fields
    if (!name || !items || items.length === 0 || !totalPrice || !estimatedLifespanDays || !purchaseDate) {
      return NextResponse.json(
        { message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
        { status: 400 }
      );
    }

    await connectDB();

    const equipment = new Equipment({
      brandId: payload.user.brandId,
      name,
      description: description || '',
      items,
      totalPrice,
      estimatedLifespanDays,
      dailyCost,
      purchaseDate: new Date(purchaseDate),
      status: status || 'available',
      notes: notes || '',
      currentValue: totalPrice,
      depreciationPercentage: 0,
      totalDaysUsed: 0,
      usageHistory: []
    });

    await equipment.save();

    return NextResponse.json({
      message: 'เพิ่มอุปกรณ์สำเร็จ',
      equipment
    });
  } catch (error: any) {
    console.error('Equipment creation error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
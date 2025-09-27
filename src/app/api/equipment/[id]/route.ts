import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Equipment from '@/lib/models/Equipment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const equipment = await Equipment.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!equipment) {
      return NextResponse.json(
        { message: 'ไม่พบอุปกรณ์' },
        { status: 404 }
      );
    }

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await connectDB();
    const { id } = await params;
    const equipment = await Equipment.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!equipment) {
      return NextResponse.json(
        { message: 'ไม่พบอุปกรณ์' },
        { status: 404 }
      );
    }

    // Update basic info
    equipment.name = name;
    equipment.description = description || '';
    equipment.items = items;
    equipment.estimatedLifespanDays = estimatedLifespanDays;
    equipment.dailyCost = dailyCost;
    equipment.purchaseDate = new Date(purchaseDate);
    equipment.status = status;
    equipment.notes = notes || '';

    // Only update price-related fields if price has changed
    if (equipment.totalPrice !== totalPrice) {
      equipment.totalPrice = totalPrice;
      // Recalculate current value based on existing depreciation
      equipment.calculateDepreciation();
    }

    await equipment.save();

    return NextResponse.json({
      message: 'อัพเดทอุปกรณ์สำเร็จ',
      equipment
    });
  } catch (error: any) {
    console.error('Equipment update error:', error);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await connectDB();
    const { id } = await params;
    const equipment = await Equipment.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!equipment) {
      return NextResponse.json(
        { message: 'ไม่พบอุปกรณ์' },
        { status: 404 }
      );
    }

    // Check if equipment is currently in use
    if (equipment.status === 'in_use') {
      return NextResponse.json(
        { message: 'ไม่สามารถลบอุปกรณ์ที่กำลังใช้งานอยู่' },
        { status: 400 }
      );
    }

    await Equipment.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'ลบอุปกรณ์สำเร็จ'
    });
  } catch (error: any) {
    console.error('Equipment deletion error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
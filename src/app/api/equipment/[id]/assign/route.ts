import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Equipment from '@/lib/models/Equipment';
import Booth from '@/lib/models/Booth';

export async function POST(
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

    const { boothId, boothName } = await request.json();

    if (!boothId || !boothName) {
      return NextResponse.json(
        { message: 'กรุณาระบุข้อมูลบูธ' },
        { status: 400 }
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

    if (equipment.status !== 'available') {
      return NextResponse.json(
        { message: 'อุปกรณ์ไม่พร้อมใช้งาน' },
        { status: 400 }
      );
    }

    // Verify booth exists
    const booth = await Booth.findOne({
      _id: boothId,
      brandId: payload.user.brandId
    });

    if (!booth) {
      return NextResponse.json(
        { message: 'ไม่พบบูธ' },
        { status: 404 }
      );
    }

    // Assign equipment to booth
    equipment.setInUse(boothId, boothName);
    await equipment.save();

    return NextResponse.json({
      message: 'มอบหมายอุปกรณ์สำเร็จ',
      equipment
    });
  } catch (error: any) {
    console.error('Equipment assignment error:', error);
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

    if (equipment.status !== 'in_use') {
      return NextResponse.json(
        { message: 'อุปกรณ์ไม่ได้อยู่ในสถานะใช้งาน' },
        { status: 400 }
      );
    }

    // Return equipment and record usage
    equipment.setAvailable(new Date());
    await equipment.save();

    return NextResponse.json({
      message: 'คืนอุปกรณ์สำเร็จ',
      equipment
    });
  } catch (error: any) {
    console.error('Equipment return error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
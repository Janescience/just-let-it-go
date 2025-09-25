import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import EquipmentTemplate from '@/lib/models/EquipmentTemplate';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.user?.brandId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const templates = await EquipmentTemplate.find({
      brandId: decoded.user.brandId
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      templates,
      success: true
    });

  } catch (error) {
    console.error('Error fetching equipment templates:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแม่แบบอุปกรณ์' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.user?.brandId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.items || !Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อและรายการอุปกรณ์' },
        { status: 400 }
      );
    }

    if (!data.estimatedLifespanDays || data.estimatedLifespanDays <= 0) {
      return NextResponse.json(
        { error: 'กรุณากรอกอายุการใช้งาน' },
        { status: 400 }
      );
    }

    await connectDB();

    // Calculate totals
    const totalPrice = data.items.reduce((sum: number, item: any) => sum + (item.price || 0), 0);
    const dailyCost = totalPrice / data.estimatedLifespanDays;

    const template = new EquipmentTemplate({
      name: data.name,
      description: data.description,
      items: data.items,
      totalPrice,
      estimatedLifespanDays: data.estimatedLifespanDays,
      dailyCost,
      brandId: decoded.user.brandId
    });

    await template.save();

    return NextResponse.json({
      template,
      success: true,
      message: 'สร้างแม่แบบอุปกรณ์สำเร็จ'
    });

  } catch (error) {
    console.error('Error creating equipment template:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างแม่แบบอุปกรณ์' },
      { status: 500 }
    );
  }
}
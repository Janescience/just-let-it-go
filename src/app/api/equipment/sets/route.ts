import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import EquipmentSet from '@/lib/models/EquipmentSet';
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    await connectDB();

    const query: any = { brandId: decoded.user.brandId };
    if (status) {
      query.status = status;
    }

    const equipmentSets = await EquipmentSet.find(query)
      .populate('templateId')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      sets: equipmentSets,
      success: true
    });

  } catch (error) {
    console.error('Error fetching equipment sets:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลชุดอุปกรณ์' },
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
    if (!data.templateId || !data.setName || !data.purchaseDate) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify template exists and belongs to user's brand
    const template = await EquipmentTemplate.findOne({
      _id: data.templateId,
      brandId: decoded.user.brandId
    });

    if (!template) {
      return NextResponse.json(
        { error: 'ไม่พบแม่แบบอุปกรณ์ที่ระบุ' },
        { status: 404 }
      );
    }

    const equipmentSet = new EquipmentSet({
      templateId: data.templateId,
      setName: data.setName,
      purchaseDate: new Date(data.purchaseDate),
      status: data.status || 'available',
      notes: data.notes,
      brandId: decoded.user.brandId
    });

    await equipmentSet.save();

    // Populate template data for response
    await equipmentSet.populate('templateId');

    return NextResponse.json({
      equipmentSet,
      success: true,
      message: 'เพิ่มชุดอุปกรณ์สำเร็จ'
    });

  } catch (error) {
    console.error('Error creating equipment set:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเพิ่มชุดอุปกรณ์' },
      { status: 500 }
    );
  }
}
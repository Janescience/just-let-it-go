import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import EquipmentTemplate from '@/lib/models/EquipmentTemplate';
import EquipmentSet from '@/lib/models/EquipmentSet';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const template = await EquipmentTemplate.findOne({
      _id: id,
      brandId: decoded.user.brandId
    });

    if (!template) {
      return NextResponse.json({ error: 'ไม่พบแม่แบบอุปกรณ์' }, { status: 404 });
    }

    return NextResponse.json({
      template,
      success: true
    });

  } catch (error) {
    console.error('Error fetching equipment template:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลแม่แบบอุปกรณ์' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    await connectDB();

    // Calculate totals
    const totalPrice = data.items.reduce((sum: number, item: any) => sum + (item.price || 0), 0);
    const dailyCost = totalPrice / data.estimatedLifespanDays;

    const template = await EquipmentTemplate.findOneAndUpdate(
      {
        _id: params.id,
        brandId: decoded.user.brandId
      },
      {
        name: data.name,
        description: data.description,
        items: data.items,
        totalPrice,
        estimatedLifespanDays: data.estimatedLifespanDays,
        dailyCost
      },
      { new: true }
    );

    if (!template) {
      return NextResponse.json({ error: 'ไม่พบแม่แบบอุปกรณ์' }, { status: 404 });
    }

    return NextResponse.json({
      template,
      success: true,
      message: 'อัพเดทแม่แบบอุปกรณ์สำเร็จ'
    });

  } catch (error) {
    console.error('Error updating equipment template:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพเดทแม่แบบอุปกรณ์' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if template is being used by any equipment sets
    const usedInSets = await EquipmentSet.countDocuments({
      templateId: params.id,
      brandId: decoded.user.brandId
    });

    if (usedInSets > 0) {
      return NextResponse.json(
        { error: `ไม่สามารถลบได้ เนื่องจากมีชุดอุปกรณ์ ${usedInSets} ชุด กำลังใช้แม่แบบนี้อยู่` },
        { status: 400 }
      );
    }

    const template = await EquipmentTemplate.findOneAndDelete({
      _id: params.id,
      brandId: decoded.user.brandId
    });

    if (!template) {
      return NextResponse.json({ error: 'ไม่พบแม่แบบอุปกรณ์' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'ลบแม่แบบอุปกรณ์สำเร็จ'
    });

  } catch (error) {
    console.error('Error deleting equipment template:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบแม่แบบอุปกรณ์' },
      { status: 500 }
    );
  }
}
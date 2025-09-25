import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import EquipmentSet from '@/lib/models/EquipmentSet';
import EquipmentTemplate from '@/lib/models/EquipmentTemplate';

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
    const equipmentSet = await EquipmentSet.findOne({
      _id: id,
      brandId: decoded.user.brandId
    }).populate('templateId');

    if (!equipmentSet) {
      return NextResponse.json({ error: 'ไม่พบชุดอุปกรณ์' }, { status: 404 });
    }

    return NextResponse.json({
      equipmentSet,
      success: true
    });

  } catch (error) {
    console.error('Error fetching equipment set:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลชุดอุปกรณ์' },
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

    const equipmentSet = await EquipmentSet.findOneAndUpdate(
      {
        _id: params.id,
        brandId: decoded.user.brandId
      },
      {
        templateId: data.templateId,
        setName: data.setName,
        purchaseDate: new Date(data.purchaseDate),
        status: data.status,
        notes: data.notes,
        currentBoothId: data.status === 'in_use' ? data.currentBoothId : undefined
      },
      { new: true }
    ).populate('templateId');

    if (!equipmentSet) {
      return NextResponse.json({ error: 'ไม่พบชุดอุปกรณ์' }, { status: 404 });
    }

    return NextResponse.json({
      equipmentSet,
      success: true,
      message: 'อัพเดทชุดอุปกรณ์สำเร็จ'
    });

  } catch (error) {
    console.error('Error updating equipment set:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพเดทชุดอุปกรณ์' },
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

    // Check if equipment set is currently in use
    const equipmentSet = await EquipmentSet.findOne({
      _id: params.id,
      brandId: decoded.user.brandId
    });

    if (!equipmentSet) {
      return NextResponse.json({ error: 'ไม่พบชุดอุปกรณ์' }, { status: 404 });
    }

    if (equipmentSet.status === 'in_use') {
      return NextResponse.json(
        { error: 'ไม่สามารถลบได้ เนื่องจากชุดอุปกรณ์กำลังใช้งานอยู่' },
        { status: 400 }
      );
    }

    await EquipmentSet.findOneAndDelete({
      _id: params.id,
      brandId: decoded.user.brandId
    });

    return NextResponse.json({
      success: true,
      message: 'ลบชุดอุปกรณ์สำเร็จ'
    });

  } catch (error) {
    console.error('Error deleting equipment set:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบชุดอุปกรณ์' },
      { status: 500 }
    );
  }
}
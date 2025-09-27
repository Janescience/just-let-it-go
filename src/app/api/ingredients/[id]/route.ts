import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Ingredient from '@/lib/models/Ingredient';

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

    const body = await request.json();
    const { name, unit, costPerUnit, minimumStock } = body;

    if (!name || !unit || costPerUnit === undefined || minimumStock === undefined) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    if (costPerUnit < 0 || minimumStock < 0) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    await connectDB();
    const { id } = await params;
    const ingredient = await Ingredient.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!ingredient) {
      return NextResponse.json(
        { message: 'ไม่พบวัตถุดิบ' },
        { status: 404 }
      );
    }

    // Check if name is being changed and if it conflicts with existing ingredient
    if (ingredient.name !== name.trim()) {
      const existingIngredient = await Ingredient.findOne({
        name: name.trim(),
        brandId: payload.user.brandId,
        _id: { $ne: id }
      });

      if (existingIngredient) {
        return NextResponse.json(
          { message: 'ชื่อวัตถุดิบนี้มีอยู่แล้ว' },
          { status: 400 }
        );
      }
    }

    ingredient.name = name.trim();
    ingredient.unit = unit.trim();
    ingredient.costPerUnit = costPerUnit;
    ingredient.minimumStock = minimumStock;

    await ingredient.save();

    return NextResponse.json({
      message: 'แก้ไขวัตถุดิบเรียบร้อยแล้ว',
      ingredient
    });
  } catch (error) {
    console.error('Error updating ingredient:', error);
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
    const ingredient = await Ingredient.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!ingredient) {
      return NextResponse.json(
        { message: 'ไม่พบวัตถุดิบ' },
        { status: 404 }
      );
    }

    // TODO: Check if ingredient is being used in any menu items
    // For now, we'll allow deletion but should add this check in the future

    await Ingredient.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'ลบวัตถุดิบเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
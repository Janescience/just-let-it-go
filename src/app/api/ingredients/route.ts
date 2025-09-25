import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Ingredient from '@/lib/models/Ingredient';

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

    if (payload.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    await connectDB();

    const ingredients = await Ingredient.find({ brandId: payload.user.brandId })
      .sort({ name: 1 });

    return NextResponse.json({
      ingredients
    });
  } catch (error) {
    console.error('Error fetching ingredients:', error);
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

    const body = await request.json();
    const { name, unit, costPerUnit, stock, minimumStock } = body;

    if (!name || !unit || costPerUnit === undefined || stock === undefined || minimumStock === undefined) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    if (costPerUnit < 0 || stock < 0 || minimumStock < 0) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if ingredient with same name already exists
    const existingIngredient = await Ingredient.findOne({
      name,
      brandId: payload.user.brandId
    });

    if (existingIngredient) {
      return NextResponse.json(
        { message: 'วัตถุดิบนี้มีอยู่แล้ว' },
        { status: 400 }
      );
    }

    const ingredient = new Ingredient({
      name: name.trim(),
      unit: unit.trim(),
      costPerUnit,
      stock,
      minimumStock,
      brandId: payload.user.brandId
    });

    await ingredient.save();

    return NextResponse.json({
      message: 'เพิ่มวัตถุดิบเรียบร้อยแล้ว',
      ingredient
    });
  } catch (error) {
    console.error('Error creating ingredient:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
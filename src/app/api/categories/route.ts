import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/lib/models/Category';
import { verifyToken } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user) {
      return NextResponse.json(
        { error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    await dbConnect();

    const categories = await Category.find({
      brandId: payload.user.brandId,
      isActive: true
    }).sort({ order: 1, name: 1 });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการดึงข้อมูลหมวดหมู่' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user) {
      return NextResponse.json(
        { error: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if (payload.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    await dbConnect();

    const { name, order } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'กรุณาระบุชื่อหมวดหมู่' }, { status: 400 });
    }

    // Check if category name already exists for this brand
    const existingCategory = await Category.findOne({
      brandId: payload.user.brandId,
      name: name.trim(),
      isActive: true
    });

    if (existingCategory) {
      return NextResponse.json({ error: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว' }, { status: 400 });
    }

    // If no order specified, put it at the end
    let categoryOrder = order;
    if (categoryOrder === undefined || categoryOrder === null) {
      const lastCategory = await Category.findOne({
        brandId: payload.user.brandId,
        isActive: true
      }).sort({ order: -1 });
      categoryOrder = lastCategory ? lastCategory.order + 1 : 0;
    }

    const category = new Category({
      name: name.trim(),
      brandId: payload.user.brandId,
      order: categoryOrder,
      isActive: true
    });

    await category.save();

    return NextResponse.json({
      message: 'สร้างหมวดหมู่สำเร็จ',
      category
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการสร้างหมวดหมู่' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/lib/models/Category';
import MenuItem from '@/lib/models/MenuItem';
import { verifyToken } from '@/utils/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    // Check if category exists and belongs to user's brand
    const category = await Category.findOne({
      _id: id,
      brandId: payload.user.brandId,
      isActive: true
    });

    if (!category) {
      return NextResponse.json({ error: 'ไม่พบหมวดหมู่' }, { status: 404 });
    }

    // Check if name conflicts with other categories (except current one)
    const existingCategory = await Category.findOne({
      _id: { $ne: id },
      brandId: payload.user.brandId,
      name: name.trim(),
      isActive: true
    });

    if (existingCategory) {
      return NextResponse.json({ error: 'ชื่อหมวดหมู่นี้มีอยู่แล้ว' }, { status: 400 });
    }

    // Update category
    category.name = name.trim();
    if (order !== undefined) category.order = order;

    await category.save();

    return NextResponse.json({
      message: 'อัพเดทหมวดหมู่สำเร็จ',
      category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการอัพเดทหมวดหมู่' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    // Check if category exists and belongs to user's brand
    const category = await Category.findOne({
      _id: id,
      brandId: payload.user.brandId,
      isActive: true
    });

    if (!category) {
      return NextResponse.json({ error: 'ไม่พบหมวดหมู่' }, { status: 404 });
    }

    // Check if there are menu items using this category
    const menuItemsCount = await MenuItem.countDocuments({
      categoryId: id,
      brandId: payload.user.brandId,
      isActive: true
    });

    if (menuItemsCount > 0) {
      return NextResponse.json({
        error: `ไม่สามารถลบหมวดหมู่ได้ เนื่องจากมีเมนู ${menuItemsCount} รายการที่ใช้หมวดหมู่นี้`
      }, { status: 400 });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    return NextResponse.json({
      message: 'ลบหมวดหมู่สำเร็จ'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการลบหมวดหมู่' }, { status: 500 });
  }
}
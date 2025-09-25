import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import MenuItem from '@/lib/models/MenuItem';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const { name, description, price, image, ingredients, isActive } = body;

    if (!name || price === undefined || !ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { message: 'ราคาต้องไม่ติดลบ' },
        { status: 400 }
      );
    }

    await connectDB();

    const menuItem = await MenuItem.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!menuItem) {
      return NextResponse.json(
        { message: 'ไม่พบเมนู' },
        { status: 404 }
      );
    }

    // Validate ingredients exist
    const { default: Ingredient } = await import('@/lib/models/Ingredient');
    for (const ing of ingredients) {
      const ingredientDoc = await Ingredient.findOne({
        _id: ing.ingredientId,
        brandId: payload.user.brandId
      });

      if (!ingredientDoc) {
        return NextResponse.json(
          { message: `ไม่พบวัตถุดิบ: ${ing.ingredientId}` },
          { status: 400 }
        );
      }

      if (ing.quantity <= 0) {
        return NextResponse.json(
          { message: 'จำนวนวัตถุดิบต้องมากกว่า 0' },
          { status: 400 }
        );
      }
    }

    // Check if name is being changed and if it conflicts with existing menu item
    if (menuItem.name !== name.trim()) {
      const existingMenuItem = await MenuItem.findOne({
        name: name.trim(),
        brandId: payload.user.brandId,
        _id: { $ne: id }
      });

      if (existingMenuItem) {
        return NextResponse.json(
          { message: 'ชื่อเมนูนี้มีอยู่แล้ว' },
          { status: 400 }
        );
      }
    }

    menuItem.name = name.trim();
    menuItem.description = description?.trim() || '';
    menuItem.price = price;
    menuItem.image = image !== undefined ? image : menuItem.image;
    menuItem.ingredients = ingredients;
    menuItem.isActive = isActive !== undefined ? isActive : true;

    await menuItem.save();

    return NextResponse.json({
      message: 'แก้ไขเมนูเรียบร้อยแล้ว',
      menuItem
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
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
    const { id } = await params;
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

    const menuItem = await MenuItem.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!menuItem) {
      return NextResponse.json(
        { message: 'ไม่พบเมนู' },
        { status: 404 }
      );
    }

    // Check if menu item is being used in any booths
    const { default: Booth } = await import('@/lib/models/Booth');
    const boothsUsingMenuItem = await Booth.find({
      brandId: payload.user.brandId,
      menuItems: id
    });

    if (boothsUsingMenuItem.length > 0) {
      return NextResponse.json(
        {
          message: 'ไม่สามารถลบเมนูนี้ได้ เนื่องจากกำลังถูกใช้งานในหน้าร้าน',
          booths: boothsUsingMenuItem.map(booth => booth.name)
        },
        { status: 400 }
      );
    }

    // Check if menu item has been sold
    const { default: Sale } = await import('@/lib/models/Sale');
    const salesWithMenuItem = await Sale.findOne({
      'items.menuItemId': id
    });

    if (salesWithMenuItem) {
      return NextResponse.json(
        { message: 'ไม่สามารถลบเมนูนี้ได้ เนื่องจากมีประวัติการขายแล้ว' },
        { status: 400 }
      );
    }

    await MenuItem.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'ลบเมนูเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
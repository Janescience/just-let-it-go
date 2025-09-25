import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import MenuItem from '@/lib/models/MenuItem';
import Booth from '@/lib/models/Booth';
import Ingredient from '@/lib/models/Ingredient';
// Ensure models are registered
import '@/lib/models/Ingredient';

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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const boothId = searchParams.get('boothId');

    // For admin users, get all menu items with cost calculation
    // For staff users, only get menu items for their booth and only active ones
    let query: any = { brandId: payload.user.brandId };

    if (payload.user.role === 'staff') {
      query.isActive = true;

      if (payload.user.boothId) {
        // Get booth's menu items
        const booth = await Booth.findById(payload.user.boothId);
        if (booth && booth.menuItems.length > 0) {
          query._id = { $in: booth.menuItems };
        } else {
          // If booth has no menu items, return empty array
          return NextResponse.json({ menuItems: [] });
        }
      }
    } else if (payload.user.role === 'admin' && boothId) {
      // Admin requesting specific booth's menu items
      query.isActive = true;

      const booth = await Booth.findById(boothId);
      if (booth && booth.menuItems.length > 0) {
        query._id = { $in: booth.menuItems };
      } else {
        // If booth has no menu items, return empty array
        return NextResponse.json({ menuItems: [] });
      }
    }

    const menuItems = await MenuItem.find(query)
      .populate('ingredients.ingredientId', 'name unit costPerUnit stock')
      .sort({ name: 1 });

    // Calculate total cost for each menu item
    const menuItemsWithCost = menuItems.map(item => {
      const totalCost = item.ingredients.reduce((cost, ing) => {
        const ingredient = ing.ingredientId as any;
        return cost + (ingredient.costPerUnit * ing.quantity);
      }, 0);

      return {
        ...item.toObject(),
        totalCost,
        profitMargin: item.price > 0 ? ((item.price - totalCost) / item.price) * 100 : 0
      };
    });

    return NextResponse.json({
      menuItems: menuItemsWithCost
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
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

    // Validate ingredients exist
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

    // Check if menu item with same name already exists
    const existingMenuItem = await MenuItem.findOne({
      name: name.trim(),
      brandId: payload.user.brandId
    });

    if (existingMenuItem) {
      return NextResponse.json(
        { message: 'เมนูนี้มีอยู่แล้ว' },
        { status: 400 }
      );
    }

    const menuItem = new MenuItem({
      name: name.trim(),
      description: description?.trim() || '',
      price,
      image: image || '',
      ingredients,
      brandId: payload.user.brandId,
      isActive: isActive !== undefined ? isActive : true
    });

    await menuItem.save();

    return NextResponse.json({
      message: 'เพิ่มเมนูเรียบร้อยแล้ว',
      menuItem
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
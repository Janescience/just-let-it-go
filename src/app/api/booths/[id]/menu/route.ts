import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Booth from '@/lib/models/Booth';
import MenuItem from '@/lib/models/MenuItem';
import { menuEmitter } from '@/utils/menuEmitter';

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
    const { menuItemIds } = body;

    if (!Array.isArray(menuItemIds)) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    await connectDB();

    const { id } = await params;

    // Check if booth exists and belongs to the brand
    const booth = await Booth.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!booth) {
      return NextResponse.json(
        { message: 'ไม่พบหน้าร้าน' },
        { status: 404 }
      );
    }

    // Validate all menu items exist and belong to the brand
    if (menuItemIds.length > 0) {
      const menuItems = await MenuItem.find({
        _id: { $in: menuItemIds },
        brandId: payload.user.brandId,
        isActive: true
      });

      if (menuItems.length !== menuItemIds.length) {
        return NextResponse.json(
          { message: 'พบเมนูที่ไม่ถูกต้อง' },
          { status: 400 }
        );
      }
    }

    // Update booth menu items
    booth.menuItems = menuItemIds;
    await booth.save();

    // Get updated menu items for the event
    const updatedMenuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      brandId: payload.user.brandId
    }).select('_id name price description isActive');

    // Broadcast menu update event
    await menuEmitter.broadcastMenuUpdate(id, 'menu-updated', {
      boothId: id,
      boothName: booth.name,
      menuItems: updatedMenuItems
    });

    return NextResponse.json({
      message: 'กำหนดเมนูสำหรับหน้าร้านเรียบร้อยแล้ว',
      booth
    });
  } catch (error) {
    console.error('Error updating booth menu:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function GET(
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

    await connectDB();

    const { id } = await params;

    // Simple and fast query - only get what we need for display
    const booth = await Booth.findOne({
      _id: id,
      brandId: payload.user.brandId
    })
    .populate({
      path: 'menuItems',
      select: 'name price description categoryId isActive ingredients',
      populate: {
        path: 'ingredients.ingredientId',
        select: 'costPerUnit'
      },
      options: { sort: { categoryId: 1, name: 1 } }
    })
    .select('_id name menuItems')
    .lean();

    if (!booth) {
      return NextResponse.json(
        { message: 'ไม่พบหน้าร้าน' },
        { status: 404 }
      );
    }

    // Get all available menu items for this brand (simple query)
    const allMenuItems = await MenuItem.find({
      brandId: payload.user.brandId,
      isActive: true
    })
    .select('name price description categoryId')
    .sort({ categoryId: 1, name: 1 })
    .lean();

    // Simplified menu items - only calculate cost for display
    const menuItemsWithCost = booth.menuItems.map((menuItem: any) => {
      // Calculate cost from ingredients
      const totalCost = menuItem.ingredients?.reduce((cost: number, ing: any) => {
        const costPerUnit = ing.ingredientId?.costPerUnit || 0;
        const quantity = ing.quantity || 0;
        return cost + (costPerUnit * quantity);
      }, 0) || 0;

      return {
        _id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        description: menuItem.description,
        categoryId: menuItem.categoryId,
        isActive: menuItem.isActive,
        totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
        profit: Math.round((menuItem.price - totalCost) * 100) / 100
      };
    });

    return NextResponse.json({
      booth: {
        _id: booth._id,
        name: booth.name,
        menuItems: menuItemsWithCost
      },
      allMenuItems
    });
  } catch (error) {
    console.error('Error fetching booth menu:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
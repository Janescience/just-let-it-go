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

    // Get booth with populated menu items and booth stock
    const booth = await Booth.findOne({
      _id: id,
      brandId: payload.user.brandId
    })
    .populate({
      path: 'menuItems',
      select: 'name price description isActive ingredients',
      populate: {
        path: 'ingredients.ingredientId',
        select: 'name unit'
      }
    })
    .populate({
      path: 'boothStock.ingredientId',
      select: 'name unit minimumStock'
    });

    if (!booth) {
      return NextResponse.json(
        { message: 'ไม่พบหน้าร้าน' },
        { status: 404 }
      );
    }

    // Get all available menu items for this brand
    const allMenuItems = await MenuItem.find({
      brandId: payload.user.brandId,
      isActive: true
    }).select('name price description');

    // Calculate stock status for each menu item
    const menuItemsWithStock = booth.menuItems.map((menuItem: any) => {
      const menuIngredients = menuItem.ingredients.map((ing: { ingredientId: any; quantity: number }) => {
        // Find corresponding booth stock
        const boothStock = booth.boothStock.find(
          (stock: { ingredientId: any; allocatedQuantity: number; usedQuantity: number; remainingQuantity: number }) => stock.ingredientId._id.toString() === ing.ingredientId._id.toString()
        );

        const allocated = boothStock?.allocatedQuantity || 0;
        const used = boothStock?.usedQuantity || 0;
        const remaining = boothStock?.remainingQuantity || 0;
        const percentage = allocated > 0 ? (remaining / allocated) * 100 : 0;

        // Calculate possible servings based on this ingredient
        const possibleServings = ing.quantity > 0 ? Math.floor(remaining / ing.quantity) : 0;

        // Determine status
        let status: 'sufficient' | 'low' | 'critical' | 'out' = 'sufficient';
        if (remaining <= 0) {
          status = 'out';
        } else if (percentage <= 10) {
          status = 'critical';
        } else if (percentage <= 25) {
          status = 'low';
        }

        return {
          ingredientId: ing.ingredientId._id,
          name: ing.ingredientId.name,
          unit: ing.ingredientId.unit,
          quantityNeeded: ing.quantity,
          allocated,
          used,
          remaining,
          percentage: Math.round(percentage),
          possibleServings,
          status
        };
      });

      // Calculate max servings for this menu item (limited by ingredient with least servings)
      const maxServings = menuIngredients.length > 0
        ? Math.min(...menuIngredients.map((ing: { possibleServings: number }) => ing.possibleServings))
        : 0;

      // Find limiting ingredient
      const limitingIngredient = menuIngredients.find((ing: { possibleServings: number }) => ing.possibleServings === maxServings);

      return {
        _id: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        description: menuItem.description,
        isActive: menuItem.isActive,
        ingredients: menuIngredients,
        maxServings,
        limitingIngredient: limitingIngredient?.name
      };
    });

    return NextResponse.json({
      booth: {
        _id: booth._id,
        name: booth.name,
        menuItems: menuItemsWithStock
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
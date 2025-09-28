import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Booth from '@/lib/models/Booth';
import MenuItem from '@/lib/models/MenuItem';
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

    await connectDB();

    // Get total booths and active booths
    const [totalBooths, activeBooths] = await Promise.all([
      Booth.countDocuments({ brandId: payload.user.brandId }),
      Booth.countDocuments({ brandId: payload.user.brandId, isActive: true })
    ]);

    // Get total menu items
    const totalMenuItems = await MenuItem.countDocuments({ brandId: payload.user.brandId });

    // Get low stock items (ingredients with currentStock <= minStockLevel)
    const lowStockItems = await Ingredient.countDocuments({
      brandId: payload.user.brandId,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    });

    return NextResponse.json({
      totalBooths,
      activeBooths,
      totalMenuItems,
      lowStockItems
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
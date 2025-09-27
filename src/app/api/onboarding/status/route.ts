import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Ingredient from '@/lib/models/Ingredient';
import MenuItem from '@/lib/models/MenuItem';
import Equipment from '@/lib/models/Equipment';
import Booth from '@/lib/models/Booth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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

    // Check completion status for each step using brandId from payload
    const [ingredientCount, menuItemCount, equipmentCount, boothCount] = await Promise.all([
      Ingredient.countDocuments({ brandId: payload.user.brandId }),
      MenuItem.countDocuments({ brandId: payload.user.brandId }),
      Equipment.countDocuments({ brandId: payload.user.brandId }),
      Booth.countDocuments({ brandId: payload.user.brandId })
    ]);

    const completionStatus = {
      hasIngredients: ingredientCount > 0,
      hasMenuItems: menuItemCount > 0,
      hasEquipment: equipmentCount > 0,
      hasBooths: boothCount > 0
    };

    const allCompleted = Object.values(completionStatus).every(Boolean);

    return NextResponse.json({
      completionStatus,
      allCompleted,
      counts: {
        ingredients: ingredientCount,
        menuItems: menuItemCount,
        equipment: equipmentCount,
        booths: boothCount
      }
    });
  } catch (error: any) {
    console.error('Onboarding status error:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
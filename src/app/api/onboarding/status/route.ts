import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Ingredient from '@/lib/models/Ingredient';
import MenuItem from '@/lib/models/MenuItem';
import Equipment from '@/lib/models/Equipment';
import Booth from '@/lib/models/Booth';
import Brand from '@/lib/models/Brand';

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

    // Use brandId from payload (now works for both regular admin and super admin switched to brand)
    if (!payload.user.brandId) {
      return NextResponse.json(
        { message: 'ไม่พบข้อมูลแบรนด์' },
        { status: 400 }
      );
    }

    // Check completion status for each step using brandId
    const [ingredientCount, menuItemCount, equipmentCount, boothCount, brand] = await Promise.all([
      Ingredient.countDocuments({ brandId: payload.user.brandId }),
      MenuItem.countDocuments({ brandId: payload.user.brandId }),
      Equipment.countDocuments({ brandId: payload.user.brandId }),
      Booth.countDocuments({ brandId: payload.user.brandId }),
      Brand.findById(payload.user.brandId)
    ]);

    // Check if payment info is configured (either has uploaded QR code or manual setup)
    const hasPaymentInfo = brand?.paymentInfo && (
      brand.paymentInfo.qrCodeImage ||
      (brand.paymentInfo.type && brand.paymentInfo.value)
    );

    const completionStatus = {
      hasIngredients: ingredientCount > 0,
      hasMenuItems: menuItemCount > 0,
      hasEquipment: equipmentCount > 0,
      hasBooths: boothCount > 0,
      hasPaymentInfo: Boolean(hasPaymentInfo)
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
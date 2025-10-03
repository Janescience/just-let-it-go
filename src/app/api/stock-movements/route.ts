import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
// Import User first to ensure it's registered before other models that might reference it
import User from '@/lib/models/User';
import StockMovement from '@/lib/models/StockMovement';
import Ingredient from '@/lib/models/Ingredient';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import Booth from '@/lib/models/Booth';

export async function GET(request: NextRequest) {
  try {
    // Ensure User model is registered (fix for Vercel serverless)
    if (!(global as any).mongoose?.models?.User) {
      require('@/lib/models/User');
    }
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

    // Get user's ingredients first to filter movements
    const ingredients = await Ingredient.find({ brandId: payload.user.brandId }).select('_id');
    const ingredientIds = ingredients.map(ing => ing._id);

    const movements = await StockMovement.find({
      ingredientId: { $in: ingredientIds }
    })
      .populate('ingredientId', 'name unit')
      .populate('boothId', 'name')
      .sort({ createdAt: -1 })
      .limit(100); // Limit to last 100 movements

    return NextResponse.json({
      movements
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure User model is registered (fix for Vercel serverless)
    if (!(global as any).mongoose?.models?.User) {
      require('@/lib/models/User');
    }
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
    const { ingredientId, type, quantity, cost, reason, boothId } = body;

    if (!ingredientId || !type || quantity === undefined) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    if (!['purchase', 'use', 'waste', 'adjustment'].includes(type)) {
      return NextResponse.json(
        { message: 'ประเภทการเคลื่อนไหวไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    await connectDB();

    // Verify ingredient belongs to user's brand
    const ingredient = await Ingredient.findOne({
      _id: ingredientId,
      brandId: payload.user.brandId
    });

    if (!ingredient) {
      return NextResponse.json(
        { message: 'ไม่พบวัตถุดิบ' },
        { status: 404 }
      );
    }

    // Calculate new stock based on movement type
    let stockChange = 0;
    switch (type) {
      case 'purchase':
      case 'adjustment':
        stockChange = Math.abs(quantity);
        break;
      case 'use':
      case 'waste':
        stockChange = -Math.abs(quantity);
        break;
    }

    const newStock = ingredient.stock + stockChange;

    if (newStock < 0) {
      return NextResponse.json(
        { message: 'สต็อกไม่เพียงพอ' },
        { status: 400 }
      );
    }

    // Create stock movement record
    const movement = new StockMovement({
      ingredientId,
      ingredientName: ingredient.name,
      unit: ingredient.unit,
      type,
      quantity: type === 'purchase' || type === 'adjustment' ? Math.abs(quantity) : -Math.abs(quantity),
      cost: cost || undefined,
      reason: reason?.trim() || undefined,
      boothId: boothId || undefined
    });

    await movement.save();

    // Update ingredient stock
    ingredient.stock = newStock;
    await ingredient.save();

    // Create accounting transactions based on movement type
    try {
      let accountingTransaction = null;

      switch (type) {
        case 'purchase':
          if (cost && cost > 0) {
            const totalCost = Math.abs(quantity) * cost;
            accountingTransaction = new AccountingTransaction({
              date: new Date(),
              type: 'expense',
              category: 'วัตถุดิบ',
              amount: totalCost,
              description: `ซื้อวัตถุดิบเข้าคลัง: ${ingredient.name} จำนวน ${Math.abs(quantity)} ${ingredient.unit} ราคา ${cost} บาท/${ingredient.unit}${reason ? ` (${reason})` : ''}`,
              boothId: boothId || null,
              relatedId: movement._id,
              relatedType: 'stock_purchase',
              brandId: payload.user.brandId
            });
          }
          break;

        case 'use':
          // Record cost of goods used based on current cost per unit
          const useCost = Math.abs(quantity) * ingredient.costPerUnit;
          accountingTransaction = new AccountingTransaction({
            date: new Date(),
            type: 'expense',
            category: 'ต้นทุนขาย',
            amount: useCost,
            description: `ใช้วัตถุดิบ: ${ingredient.name} จำนวน ${Math.abs(quantity)} ${ingredient.unit}${reason ? ` (${reason})` : ''}`,
            boothId: boothId || null,
            relatedId: movement._id,
            relatedType: 'stock_purchase',
            brandId: payload.user.brandId
          });
          break;

        case 'waste':
          // Record waste as expense (loss)
          const wasteCost = Math.abs(quantity) * ingredient.costPerUnit;
          accountingTransaction = new AccountingTransaction({
            date: new Date(),
            type: 'expense',
            category: 'สูญเสีย',
            amount: wasteCost,
            description: `สูญเสียวัตถุดิบ: ${ingredient.name} จำนวน ${Math.abs(quantity)} ${ingredient.unit}${reason ? ` (${reason})` : ''}`,
            boothId: boothId || null,
            relatedId: movement._id,
            relatedType: 'stock_purchase',
            brandId: payload.user.brandId
          });
          break;

        case 'adjustment':
          // Record adjustment cost based on cost per unit
          const adjustmentCost = Math.abs(quantity) * ingredient.costPerUnit;
          accountingTransaction = new AccountingTransaction({
            date: new Date(),
            type: stockChange > 0 ? 'expense' : 'income',
            category: stockChange > 0 ? 'ปรับเพิ่มสต็อก' : 'ปรับลดสต็อก',
            amount: adjustmentCost,
            description: `ปรับปรุงสต็อก: ${ingredient.name} ${stockChange > 0 ? 'เพิ่ม' : 'ลด'} ${Math.abs(quantity)} ${ingredient.unit}${reason ? ` (${reason})` : ''}`,
            boothId: boothId || null,
            relatedId: movement._id,
            relatedType: 'stock_purchase',
            brandId: payload.user.brandId
          });
          break;
      }

      if (accountingTransaction) {
        await accountingTransaction.save();
      }
    } catch (accountingError) {
      // Continue even if accounting fails
      console.error('Error creating accounting transaction for stock movement:', accountingError);
    }

    return NextResponse.json({
      message: 'บันทึกการเคลื่อนไหวสต็อกเรียบร้อยแล้ว',
      movement,
      newStock
    });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
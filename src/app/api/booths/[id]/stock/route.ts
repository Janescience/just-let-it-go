import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Booth from '@/lib/models/Booth';
import Ingredient from '@/lib/models/Ingredient';
import AccountingTransaction from '@/lib/models/AccountingTransaction';

export async function PATCH(
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
    const { ingredientId, adjustment, costPerUnit } = body;

    if (!ingredientId || typeof adjustment !== 'number') {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    await connectDB();

    const { id } = await params;
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

    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) {
      return NextResponse.json(
        { message: 'ไม่พบวัตถุดิบ' },
        { status: 404 }
      );
    }

    // Find or create booth stock entry
    let stockEntry = booth.boothStock.find(
      (stock: any) => stock.ingredientId.toString() === ingredientId
    );

    if (adjustment > 0) {
      // Adding stock - check if warehouse has enough
      if (ingredient.stock < adjustment) {
        // Need to purchase more to warehouse first
        if (costPerUnit && costPerUnit > 0) {
          const purchaseAmount = adjustment - ingredient.stock;

          // Add to warehouse
          ingredient.stock += purchaseAmount;
          ingredient.costPerUnit = costPerUnit; // Update cost if provided
          await ingredient.save();

          // Create accounting transaction for ingredient purchase
          try {
            const totalCost = purchaseAmount * costPerUnit;
            const accountingTransaction = new AccountingTransaction({
              date: new Date(),
              type: 'expense',
              category: 'ingredient_cost',
              amount: totalCost,
              description: `ซื้อวัตถุดิบ ${ingredient.name} จำนวน ${purchaseAmount} ${ingredient.unit} ราคา ${costPerUnit} บาท/${ingredient.unit}`,
              boothId: id,
              relatedId: id,
              relatedType: 'stock_purchase',
              brandId: payload.user.brandId
            });

            await accountingTransaction.save();
          } catch (accountingError) {
            // Continue even if accounting fails
            console.error('Error creating accounting transaction for stock purchase:', accountingError);
          }

        } else {
          return NextResponse.json(
            {
              message: 'คลังมีไม่เพียงพอ',
              availableStock: ingredient.stock,
              needed: adjustment,
              shortage: adjustment - ingredient.stock
            },
            { status: 400 }
          );
        }
      }

      // Deduct from warehouse
      ingredient.stock -= adjustment;
      await ingredient.save();

      // Create accounting transaction for stock allocation (using existing stock cost)
      try {
        const totalCost = adjustment * ingredient.costPerUnit;
        const accountingTransaction = new AccountingTransaction({
          date: new Date(),
          type: 'expense',
          category: 'ingredient_cost',
          amount: totalCost,
          description: `จัดสรรวัตถุดิบ ${ingredient.name} จำนวน ${adjustment} ${ingredient.unit} ไปยังหน้าร้าน (ราคาต้นทุน ${ingredient.costPerUnit} บาท/${ingredient.unit})`,
          boothId: id,
          relatedId: id,
          relatedType: 'stock_purchase',
          brandId: payload.user.brandId
        });

        await accountingTransaction.save();
      } catch (accountingError) {
        // Continue even if accounting fails
        console.error('Error creating accounting transaction for stock allocation:', accountingError);
      }

      // Add to booth stock
      if (stockEntry) {
        stockEntry.allocatedQuantity += adjustment;
        stockEntry.remainingQuantity = stockEntry.allocatedQuantity - stockEntry.usedQuantity;
      } else {
        booth.boothStock.push({
          ingredientId,
          allocatedQuantity: adjustment,
          usedQuantity: 0,
          remainingQuantity: adjustment
        });
      }
    } else if (adjustment < 0) {
      // Removing stock - return to warehouse
      const removeAmount = Math.abs(adjustment);

      if (!stockEntry || stockEntry.allocatedQuantity < removeAmount) {
        return NextResponse.json(
          { message: 'หน้าร้านมีสต็อกไม่เพียงพอให้ลด' },
          { status: 400 }
        );
      }

      // Return to warehouse
      ingredient.stock += removeAmount;
      await ingredient.save();

      // Remove from booth stock
      stockEntry.allocatedQuantity -= removeAmount;
      stockEntry.remainingQuantity = stockEntry.allocatedQuantity - stockEntry.usedQuantity;

      // Remove entry if no stock left
      if (stockEntry.allocatedQuantity <= 0) {
        booth.boothStock = booth.boothStock.filter(
          (stock: any) => stock.ingredientId.toString() !== ingredientId
        );
      }
    }

    await booth.save();

    return NextResponse.json({
      message: 'ปรับสต็อกเรียบร้อยแล้ว',
      ingredient: ingredient.name,
      adjustment,
      newBoothStock: stockEntry?.remainingQuantity || 0,
      newWarehouseStock: ingredient.stock
    });

  } catch (error) {
    console.error('Error adjusting booth stock:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
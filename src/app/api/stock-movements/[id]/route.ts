import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import StockMovement from '@/lib/models/StockMovement';
import Ingredient from '@/lib/models/Ingredient';
import AccountingTransaction from '@/lib/models/AccountingTransaction';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.user?.brandId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    // Find the stock movement
    const movement = await StockMovement.findById(id);

    if (!movement) {
      return NextResponse.json(
        { error: 'ไม่พบรายการเคลื่อนไหวสต็อก' },
        { status: 404 }
      );
    }

    // Get ingredient details
    const ingredient = await Ingredient.findOne({
      _id: movement.ingredientId,
      brandId: decoded.user.brandId
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: 'ไม่พบวัตถุดิบ' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      movement,
      ingredient: {
        _id: ingredient._id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentCostPerUnit: ingredient.costPerUnit
      },
      success: true
    });

  } catch (error) {
    console.error('Error fetching stock movement:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลการเคลื่อนไหวสต็อก' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.user?.brandId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (decoded.user.role !== 'admin') {
      return NextResponse.json({ error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const { id } = await params;
    const data = await request.json();

    console.log('API received data:', data);
    console.log('Movement ID:', id);

    await connectDB();

    // Find the stock movement
    const movement = await StockMovement.findById(id);

    if (!movement) {
      return NextResponse.json(
        { error: 'ไม่พบรายการเคลื่อนไหวสต็อก' },
        { status: 404 }
      );
    }

    // Get ingredient to verify ownership
    const ingredient = await Ingredient.findOne({
      _id: movement.ingredientId,
      brandId: decoded.user.brandId
    });

    if (!ingredient) {
      return NextResponse.json(
        { error: 'ไม่พบวัตถุดิบ' },
        { status: 404 }
      );
    }

    // Store original values for stock adjustment
    const originalQuantity = movement.quantity;
    const originalCreatedAt = movement.createdAt;

    console.log('Before update:');
    console.log('- quantity:', movement.quantity);
    console.log('- createdAt:', movement.createdAt);
    console.log('- cost:', movement.cost);

    // Update movement fields
    if (data.quantity !== undefined) {
      console.log('Updating quantity from', movement.quantity, 'to', data.quantity);
      movement.quantity = data.quantity;
    }
    if (data.reason !== undefined) {
      console.log('Updating reason from', movement.reason, 'to', data.reason);
      movement.reason = data.reason;
    }
    if (data.createdAt !== undefined) {
      console.log('Updating createdAt from', movement.createdAt, 'to', new Date(data.createdAt));
      movement.createdAt = new Date(data.createdAt);
    }

    // For purchase type, update cost to current ingredient cost per unit
    if (movement.type === 'purchase') {
      console.log('Updating cost from', movement.cost, 'to', ingredient.costPerUnit);
      movement.cost = ingredient.costPerUnit;
    }

    console.log('After update (before save):');
    console.log('- quantity:', movement.quantity);
    console.log('- createdAt:', movement.createdAt);
    console.log('- cost:', movement.cost);

    await movement.save();

    console.log('After save - movement saved successfully');

    // Update stock if quantity changed
    if (data.quantity !== undefined && originalQuantity !== data.quantity) {
      const stockDifference = data.quantity - originalQuantity;
      ingredient.stock += stockDifference;
      await ingredient.save();
    }

    // If this is a purchase and there's a related accounting transaction, update it too
    if (movement.type === 'purchase') {
      try {
        const relatedTransaction = await AccountingTransaction.findOne({
          relatedId: movement._id,
          relatedType: 'stock_purchase',
          brandId: decoded.user.brandId
        });

        if (relatedTransaction) {
          const newTotalCost = Math.abs(movement.quantity) * ingredient.costPerUnit;
          relatedTransaction.amount = newTotalCost;
          relatedTransaction.description = `ซื้อวัตถุดิบเข้าคลัง: ${ingredient.name} จำนวน ${Math.abs(movement.quantity)} ${ingredient.unit} ราคา ${ingredient.costPerUnit} บาท/${ingredient.unit}${movement.reason ? ` (${movement.reason})` : ''}`;
          await relatedTransaction.save();
        }
      } catch (error) {
        console.error('Error updating related accounting transaction:', error);
      }
    }

    return NextResponse.json({
      movement,
      ingredient: {
        _id: ingredient._id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentCostPerUnit: ingredient.costPerUnit
      },
      success: true,
      message: 'แก้ไขการเคลื่อนไหวสต็อกสำเร็จ'
    });

  } catch (error) {
    console.error('Error updating stock movement:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการแก้ไขการเคลื่อนไหวสต็อก' },
      { status: 500 }
    );
  }
}
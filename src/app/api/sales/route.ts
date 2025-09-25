import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import QRPayment from '@/lib/models/QRPayment';
import StockMovement from '@/lib/models/StockMovement';
import MenuItem from '@/lib/models/MenuItem';
import Ingredient from '@/lib/models/Ingredient';
import Booth from '@/lib/models/Booth';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import { RealtimeBroadcaster, createNewSaleEvent, createStockUpdateEvent, createLowStockAlert } from '@/utils/realtime';

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

    const body = await request.json();
    const { items, totalAmount, paymentMethod } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: 'ไม่มีสินค้าในรายการ' },
        { status: 400 }
      );
    }

    if (!paymentMethod || !['cash', 'transfer'].includes(paymentMethod)) {
      return NextResponse.json(
        { message: 'วิธีการชำระเงินไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    if (totalAmount <= 0) {
      return NextResponse.json(
        { message: 'ยอดเงินไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    // Determine booth ID based on user role
    let boothId = null;
    if (payload.user.role === 'staff') {
      boothId = payload.user.boothId;
      if (!boothId) {
        return NextResponse.json(
          { message: 'ไม่พบข้อมูลหน้าร้านของพนักงาน' },
          { status: 400 }
        );
      }
    } else if (payload.user.role === 'admin') {
      // For admin, get booth from request body or use first active booth
      boothId = body.boothId;
      if (!boothId) {
        // If no boothId specified, get first active booth for this brand
        const { default: Booth } = await import('@/lib/models/Booth');
        await connectDB();
        const firstBooth = await Booth.findOne({
          brandId: payload.user.brandId,
          isActive: true
        }).select('_id');

        if (firstBooth) {
          boothId = firstBooth._id;
        } else {
          return NextResponse.json(
            { message: 'ไม่พบหน้าร้านที่ใช้งานได้' },
            { status: 400 }
          );
        }
      }
    }

    await connectDB();

    // Validate menu items and calculate total
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem || !menuItem.isActive) {
        return NextResponse.json(
          { message: `ไม่พบเมนู: ${item.menuItemId}` },
          { status: 400 }
        );
      }

      const itemTotal = menuItem.price * item.quantity;
      calculatedTotal += itemTotal;

      validatedItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: menuItem.price
      });
    }

    // Verify total amount
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return NextResponse.json(
        { message: 'ยอดเงินไม่ตรงกับการคำนวณ' },
        { status: 400 }
      );
    }

    // Create sale record
    const sale = new Sale({
      boothId,
      items: validatedItems,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentStatus: paymentMethod === 'cash' ? 'completed' : 'pending',
      employeeId: payload.user.id
    });

    await sale.save();

    let qrCode = null;

    // Handle QR payment (keep this synchronous as user needs QR code immediately)
    if (paymentMethod === 'transfer') {
      // Generate QR code (simplified - in real implementation, integrate with payment gateway)
      const qrPayment = new QRPayment({
        saleId: sale._id,
        qrCode: `PAY-${sale._id}-${Date.now()}`, // Simplified QR code
        amount: calculatedTotal,
        status: 'pending',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      });

      await qrPayment.save();
      qrCode = qrPayment.qrCode;

      // Update sale with QR code reference
      sale.qrCodeId = qrPayment._id;
      await sale.save();
    }

    // Return response immediately to user
    const response = NextResponse.json({
      message: 'บันทึกการขายเรียบร้อยแล้ว',
      sale: {
        id: sale._id,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus
      },
      qrCode
    });

    // Process background tasks asynchronously (don't await)
    processBackgroundTasks(sale, validatedItems, boothId, payload.user.brandId, payload.user.id).catch(() => {});

    return response;
  } catch (error) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

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

    let query: any = {};

    // Filter by booth for staff users
    if (payload.user.role === 'staff' && payload.user.boothId) {
      query.boothId = payload.user.boothId;
    } else if (payload.user.role === 'admin') {
      // Admin can see all sales for their brand's booths
      const { default: Booth } = await import('@/lib/models/Booth');
      const booths = await Booth.find({ brandId: payload.user.brandId }).select('_id');
      const boothIds = booths.map(booth => booth._id);
      query.boothId = { $in: boothIds };
    }

    const sales = await Sale.find(query)
      .populate('boothId', 'name location')
      .populate('employeeId', 'name username')
      .populate('items.menuItemId', 'name price')
      .sort({ createdAt: -1 })
      .limit(50); // Latest 50 sales

    return NextResponse.json({
      sales
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

// Background processing function (runs asynchronously)
async function processBackgroundTasks(
  sale: any,
  validatedItems: any[],
  boothId: any,
  brandId: string,
  employeeId: string
) {
  try {

    const broadcaster = RealtimeBroadcaster.getInstance();

    // Update booth stock (deduct ingredients used from booth stock)
    if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'transfer') {
      // Get booth with stock information
      const booth = await Booth.findById(boothId).populate('boothStock.ingredientId');

      if (booth) {
        for (const saleItem of validatedItems) {
          const menuItem = await MenuItem.findById(saleItem.menuItemId)
            .populate('ingredients.ingredientId');

          if (menuItem && menuItem.ingredients.length > 0) {
            for (const ingredient of menuItem.ingredients) {
              const totalUsed = ingredient.quantity * saleItem.quantity;
              const ingredientId = ingredient.ingredientId._id || ingredient.ingredientId;

              // Find booth stock for this ingredient
              const boothStockEntry = booth.boothStock.find(
                (stock: any) => stock.ingredientId._id.toString() === ingredientId.toString()
              );

              if (boothStockEntry) {
                // Update booth stock
                const oldUsed = boothStockEntry.usedQuantity;
                boothStockEntry.usedQuantity += totalUsed;
                boothStockEntry.remainingQuantity = boothStockEntry.allocatedQuantity - boothStockEntry.usedQuantity;

                // Ensure we don't go below 0
                if (boothStockEntry.remainingQuantity < 0) {
                  boothStockEntry.remainingQuantity = 0;
                  boothStockEntry.usedQuantity = boothStockEntry.allocatedQuantity;
                }

                // Broadcast booth stock update
                const stockUpdateEvent = createStockUpdateEvent(
                  brandId,
                  ingredientId.toString(),
                  boothStockEntry.remainingQuantity,
                  boothStockEntry.remainingQuantity + totalUsed
                );
                broadcaster.broadcast(stockUpdateEvent);

                // Check for low booth stock and broadcast alert
                const lowStockThreshold = Math.max(
                  boothStockEntry.allocatedQuantity * 0.2, // 20% of allocated
                  (boothStockEntry.ingredientId.minimumStock || 0) // Or minimum stock from ingredient
                );

                if (boothStockEntry.remainingQuantity <= lowStockThreshold) {
                  const lowStockEvent = createLowStockAlert(
                    brandId,
                    boothStockEntry.ingredientId.name || 'Unknown',
                    boothStockEntry.remainingQuantity,
                    lowStockThreshold
                  );
                  broadcaster.broadcastToAll(lowStockEvent);
                }

                // Record stock movement
                const stockMovement = new StockMovement({
                  ingredientId,
                  type: 'use',
                  quantity: -totalUsed,
                  reason: `ขาย ${menuItem.name} จำนวน ${saleItem.quantity}`,
                  boothId,
                  saleId: sale._id
                });

                await stockMovement.save();
              }
            }
          }
        }

        // Save updated booth stock
        await booth.save();
      }
    }

    // Create accounting transaction for completed sales
    if (sale.paymentStatus === 'completed') {
      try {
        const accountingTransaction = new AccountingTransaction({
          date: new Date(),
          type: 'income',
          category: 'sale_revenue',
          amount: sale.totalAmount,
          description: `การขายสินค้า - รายการที่ ${sale._id}`,
          boothId: boothId,
          relatedId: sale._id,
          relatedType: 'sale',
          brandId: brandId
        });

        await accountingTransaction.save();
      } catch (accountingError) {
        // Continue even if accounting fails
        console.error('Error creating accounting transaction:', accountingError);
      }
    }

    // Broadcast new sale event
    const newSaleEvent = createNewSaleEvent(
      brandId,
      boothId.toString(),
      {
        saleId: sale._id,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        items: sale.items,
        employeeId: employeeId,
        boothId: boothId.toString()
      }
    );

    broadcaster.broadcast(newSaleEvent);
  } catch (error) {
    // Background processing error - continue silently
  }
}
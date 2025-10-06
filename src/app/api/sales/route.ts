import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
// Import User first to ensure it's registered before other models that might reference it
import User from '@/lib/models/User';
import Sale from '@/lib/models/Sale';
import QRPayment from '@/lib/models/QRPayment';
import StockMovement from '@/lib/models/StockMovement';
import MenuItem from '@/lib/models/MenuItem';
import Ingredient from '@/lib/models/Ingredient';
import Booth from '@/lib/models/Booth';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import { RealtimeBroadcaster, createNewSaleEvent, createStockUpdateEvent, createLowStockAlert } from '@/utils/realtime';
import { now } from '@/utils/timezone';
import { logSalesError, logAccountingError, logInventoryError } from '@/utils/errorLogger';

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

    const body = await request.json();
    const { items, totalAmount, paymentMethod, clientTransactionId } = body;
    const transactionId =
      typeof clientTransactionId === 'string' && clientTransactionId.trim().length > 0
        ? clientTransactionId.trim()
        : null;

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

    if (transactionId) {
      const existingSale = await Sale.findOne({ clientTransactionId: transactionId });
      if (existingSale) {
        let qrCode = null;
        if (existingSale.qrCodeId) {
          const existingQr = await QRPayment.findById(existingSale.qrCodeId);
          qrCode = existingQr?.qrCode || null;
        }

        return NextResponse.json({
          message: 'บันทึกการขายเรียบร้อยแล้ว',
          sale: {
            id: existingSale._id,
            totalAmount: existingSale.totalAmount,
            paymentMethod: existingSale.paymentMethod,
            paymentStatus: existingSale.paymentStatus
          },
          qrCode
        });
      }
    }

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

    // Create sale record with proper timezone handling
    const thailandTime = now();


    const sale = new Sale({
      boothId,
      items: validatedItems,
      totalAmount: calculatedTotal,
      paymentMethod,
      paymentStatus: 'completed',
      employeeId: payload.user.id,
      clientTransactionId: transactionId || undefined,
      createdAt: thailandTime,
      updatedAt: thailandTime
    });

    await sale.save();

    // Calculate total quantities for sale summary
    const totalSaleQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    let firstMovementInSale = true;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (menuItem && menuItem.ingredients.length > 0) {
        for (const menuIngredient of menuItem.ingredients) {
          const ingredient = await Ingredient.findById(menuIngredient.ingredientId);

          const totalUsed = menuIngredient.quantity * item.quantity;
          const ingredientId = menuIngredient.ingredientId;

          // Record stock movement
          const stockMovement = new StockMovement({
            ingredientId,
            ingredientName: ingredient?.name,
            unit: ingredient?.unit,
            type: 'use',
            quantity: -totalUsed,
            cost: ingredient?.costPerUnit, // เพิ่ม cost จาก costPerUnit
            reason: `ขาย ${menuItem.name} x ${item.quantity}`,
            boothId,
            saleId: sale._id,
            // Add sale summary only to first movement for this sale
            saleQuantity: firstMovementInSale ? totalSaleQuantity : undefined,
            saleAmount: firstMovementInSale ? calculatedTotal : undefined
          });

          firstMovementInSale = false;

          await stockMovement.save();

          ingredient.stock -= totalUsed;
          if (ingredient.stock < 0) {
            ingredient.stock = 0;
            const accountingTransaction = new AccountingTransaction({
              date: thailandTime,
              type: 'expense',
              category: 'sale_cost',
              amount: ingredient.costPerUnit * totalUsed,
              description: `การหักต้นทุนวัตถุดิบ - ${menuItem.name} x ${item.quantity} (${ingredient.name} - ${totalUsed})`,
              boothId: boothId,
              relatedId: sale._id,
              relatedType: 'sale',
              brandId: payload.user.brandId
            });
            await accountingTransaction.save();
          }
          await ingredient.save();
        }
      }
    }

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

    // Create accounting transaction in main thread (moved from background)
    let accountingTransactionId = null;
    try {
      if (sale.paymentStatus === 'completed') {
        // Create description with menu names by looking up each menuItemId
        const menuNames = await Promise.all(
          sale.items.map(async (item: any) => {
            const menuItem = await MenuItem.findById(item.menuItemId);
            const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
            return `${menuItem?.name || 'Unknown'}${quantity}`;
          })
        );

        const accountingTransaction = new AccountingTransaction({
          date: sale.createdAt,
          type: 'income',
          category: 'sale_revenue',
          amount: sale.totalAmount,
          description: `การขายสินค้า - ${menuNames.join(', ')}`,
          paymentMethod: sale.paymentMethod,
          boothId: boothId,
          relatedId: sale._id,
          relatedType: 'sale',
          brandId: payload.user.brandId
        });

        const savedTransaction = await accountingTransaction.save();
        accountingTransactionId = savedTransaction._id;
      }
    } catch (accountingError) {
      // Log accounting error but don't fail the sale
      await logAccountingError(
        'Failed to create accounting transaction for sale',
        accountingError,
        {
          function: 'createSale',
          saleId: sale._id.toString(),
          boothId: boothId.toString(),
          brandId: payload.user.brandId,
          userId: payload.user.id,
          additionalData: {
            saleAmount: sale.totalAmount,
            paymentMethod: sale.paymentMethod
          }
        },
        request
      );
      console.error('Error creating accounting transaction (sale saved successfully):', accountingError);
    }

    // Return response to user
    const response = NextResponse.json({
      message: 'บันทึกการขายเรียบร้อยแล้ว',
      sale: {
        id: sale._id,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus
      },
      qrCode,
      accountingTransactionId
    });

    // Process background tasks asynchronously (don't await) - now only for inventory and realtime updates
    processBackgroundTasks(sale, validatedItems, boothId, payload.user.brandId, payload.user.id).catch(async (backgroundError) => {
      await logInventoryError(
        'Background task processing failed',
        backgroundError,
        {
          function: 'processBackgroundTasks',
          saleId: sale._id.toString(),
          boothId: boothId.toString(),
          brandId: payload.user.brandId,
          userId: payload.user.id
        },
        request
      );
    });

    return response;
  } catch (error) {
    console.error('Error creating sale:', error);

    // Log the error
    try {
      await logSalesError(
        'Failed to create sale',
        error,
        {
          function: 'createSale',
          additionalData: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        request
      );
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const boothIdParam = searchParams.get('boothId');

    let query: any = {};

    // Filter by booth for staff users
    if (payload.user.role === 'staff' && payload.user.boothId) {
      query.boothId = payload.user.boothId;
    } else if (payload.user.role === 'admin') {
      // Admin can see all sales for their brand's booths
      const { default: Booth } = await import('@/lib/models/Booth');
      const booths = await Booth.find({ brandId: payload.user.brandId }).select('_id name isActive');
      const boothIds = booths.map(booth => booth._id);

      // If specific boothId is requested, filter by that booth (if it belongs to the brand)
      if (boothIdParam && boothIds.some((id: any) => id.toString() === boothIdParam)) {
        query.boothId = boothIdParam;
      } else {
        query.boothId = { $in: boothIds };
      }
    }

    const sales = await Sale.find(query)
      .populate('boothId', 'name location')
      .populate('employeeId', 'name username')
      .populate({
        path: 'items.menuItemId',
        select: 'name price ingredients',
        populate: {
          path: 'ingredients.ingredientId',
          select: 'costPerUnit'
        }
      })
      .sort({ createdAt: -1 });

    // Calculate cost for each sale based on menu item ingredients (no additional queries needed)
    const salesWithCost = sales.map((sale) => {
      let totalCost = 0;

      for (const item of sale.items) {
        const menuItem = item.menuItemId;

        if (menuItem && menuItem.ingredients) {
          for (const ingredient of menuItem.ingredients) {
            const costPerUnit = ingredient.ingredientId?.costPerUnit || 0;
            const usedQuantity = ingredient.quantity * item.quantity;
            totalCost += costPerUnit * usedQuantity;
          }
        }
      }

      return {
        ...sale.toObject(),
        totalCost,
        profit: sale.totalAmount - totalCost
      };
    });

    return NextResponse.json({
      sales: salesWithCost
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
          try {
            const menuItem = await MenuItem.findById(saleItem.menuItemId)
              .populate('ingredients.ingredientId');

            if (!menuItem || menuItem.ingredients.length === 0) {
              continue;
            }

            for (const ingredient of menuItem.ingredients) {
              try {
                const ingredientRef = ingredient.ingredientId;

                if (!ingredientRef) {
                  console.warn('Missing ingredient reference for sale deduction', {
                    saleId: sale?._id?.toString?.(),
                    menuItemId: menuItem?._id?.toString?.()
                  });
                  continue;
                }

                const ingredientDoc =
                  typeof ingredientRef === 'object' && ingredientRef !== null ? ingredientRef : null;
                const ingredientIdValue = (ingredientDoc as any)?._id || (ingredientDoc as any)?.id || ingredientRef;

                if (!ingredientIdValue) {
                  continue;
                }

                const ingredientId = ingredientIdValue.toString();
                const ingredientName =
                  (ingredientDoc as any)?.name || ingredient.name || 'Unknown';
                const ingredientUnit =
                  (ingredientDoc as any)?.unit || ingredient.unit;
                const ingredientCost =
                  (ingredientDoc as any)?.costPerUnit ?? ingredient.costPerUnit ?? 0;

                const totalUsed = (ingredient.quantity || 0) * saleItem.quantity;

                const boothStockEntry = booth.boothStock.find((stock: any) => {
                  const stockRef = stock.ingredientId;
                  const stockDoc =
                    typeof stockRef === 'object' && stockRef !== null ? stockRef : null;
                  const stockId = stockDoc?._id || stockDoc?.id || stockRef;
                  if (!stockId) {
                    return false;
                  }
                  return stockId.toString() === ingredientId;
                });

                if (!boothStockEntry) {
                  continue;
                }

                const previousRemaining = Number(boothStockEntry.remainingQuantity ?? 0);
                const allocatedQuantity = Number(boothStockEntry.allocatedQuantity ?? 0);
                const usedQuantity = Number(boothStockEntry.usedQuantity ?? 0) + totalUsed;

                boothStockEntry.usedQuantity = usedQuantity;
                boothStockEntry.remainingQuantity = allocatedQuantity - usedQuantity;

                if (boothStockEntry.remainingQuantity < 0) {
                  boothStockEntry.remainingQuantity = 0;
                  boothStockEntry.usedQuantity = allocatedQuantity;
                }

                const stockUpdateEvent = createStockUpdateEvent(
                  brandId,
                  ingredientId,
                  boothStockEntry.remainingQuantity,
                  previousRemaining
                );
                broadcaster.broadcast(stockUpdateEvent);

                const lowStockThreshold = Math.max(
                  allocatedQuantity * 0.2,
                  ((boothStockEntry.ingredientId as any)?.minimumStock || 0)
                );

                if (boothStockEntry.remainingQuantity <= lowStockThreshold) {
                  const lowStockEvent = createLowStockAlert(
                    brandId,
                    (boothStockEntry.ingredientId as any)?.name || ingredientName,
                    boothStockEntry.remainingQuantity,
                    lowStockThreshold
                  );
                  broadcaster.broadcastToAll(lowStockEvent);
                }

                const stockMovement = new StockMovement({
                  ingredientId,
                  ingredientName,
                  unit: ingredientUnit,
                  type: 'use',
                  quantity: -totalUsed,
                  cost: ingredientCost,
                  reason: `ขาย ${menuItem.name} จำนวน ${saleItem.quantity}`,
                  boothId,
                  saleId: sale._id
                });

                await stockMovement.save().catch((movementError: any) => {
                  console.error('Error recording booth stock movement:', movementError);
                });
              } catch (ingredientError) {
                console.error('Error processing ingredient usage', ingredientError);
              }
            }
          } catch (menuError) {
            console.error('Error processing menu item for sale', menuError);
          }
        }

        try {
          await booth.save();
        } catch (boothSaveError) {
          console.error('Error saving booth stock after sale', boothSaveError);
        }
      }
    }

    // Accounting transaction now handled in main thread - removed from background task

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
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import MenuItem from '@/lib/models/MenuItem';
import Ingredient from '@/lib/models/Ingredient';
import StockMovement from '@/lib/models/StockMovement';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import Booth from '@/lib/models/Booth';

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

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    await connectDB();

    // Await params
    const { id } = await params;

    // Find the original sale
    const originalSale = await Sale.findById(id)
      .populate('items.menuItemId', 'name price ingredients');

    if (!originalSale) {
      return NextResponse.json(
        { message: 'ไม่พบรายการขาย' },
        { status: 404 }
      );
    }

    // Check if user has permission to edit this sale
    if (payload.user.role === 'staff') {
      if (originalSale.boothId !== payload.user.boothId) {
        return NextResponse.json(
          { message: 'ไม่มีสิทธิ์แก้ไขรายการขายนี้' },
          { status: 403 }
        );
      }
    } else if (payload.user.role === 'admin') {
      // Admin can edit sales from their brand's booths
      const booth = await Booth.findById(originalSale.boothId);
      if (!booth || booth.brandId !== payload.user.brandId) {
        return NextResponse.json(
          { message: 'ไม่มีสิทธิ์แก้ไขรายการขายนี้' },
          { status: 403 }
        );
      }
    }

    // Store original items for comparison
    const originalItems = originalSale.items.map((item: any) => ({
      menuItemId: item.menuItemId._id,
      quantity: item.quantity,
      price: item.price
    }));

    // Validate new items and calculate new total
    let newTotalAmount = 0;
    const validatedNewItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem || !menuItem.isActive) {
        return NextResponse.json(
          { message: `ไม่พบเมนู: ${item.menuItemId}` },
          { status: 400 }
        );
      }

      if (item.quantity < 0) {
        return NextResponse.json(
          { message: 'จำนวนสินค้าต้องไม่น้อยกว่า 0' },
          { status: 400 }
        );
      }

      const itemTotal = menuItem.price * item.quantity;
      newTotalAmount += itemTotal;

      validatedNewItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: menuItem.price
      });
    }

    // Calculate the difference in ingredient usage
    const ingredientChanges = new Map();

    // First, reverse the original usage
    for (const originalItem of originalItems) {
      const menuItem = await MenuItem.findById(originalItem.menuItemId)
        .populate('ingredients.ingredientId');

      if (menuItem && menuItem.ingredients.length > 0) {
        for (const menuIngredient of menuItem.ingredients) {
          const ingredientId = menuIngredient.ingredientId._id.toString();
          const totalUsed = menuIngredient.quantity * originalItem.quantity;

          if (!ingredientChanges.has(ingredientId)) {
            ingredientChanges.set(ingredientId, {
              ingredient: menuIngredient.ingredientId,
              change: 0,
              menuIngredient: menuIngredient
            });
          }

          // Add back the original usage (reverse the deduction)
          ingredientChanges.get(ingredientId).change += totalUsed;
        }
      }
    }

    // Then, apply the new usage
    for (const newItem of validatedNewItems) {
      const menuItem = await MenuItem.findById(newItem.menuItemId)
        .populate('ingredients.ingredientId');

      if (menuItem && menuItem.ingredients.length > 0) {
        for (const menuIngredient of menuItem.ingredients) {
          const ingredientId = menuIngredient.ingredientId._id.toString();
          const totalUsed = menuIngredient.quantity * newItem.quantity;

          if (!ingredientChanges.has(ingredientId)) {
            ingredientChanges.set(ingredientId, {
              ingredient: menuIngredient.ingredientId,
              change: 0,
              menuIngredient: menuIngredient
            });
          }

          // Subtract the new usage
          ingredientChanges.get(ingredientId).change -= totalUsed;
        }
      }
    }

    // Apply ingredient stock changes
    for (const [ingredientId, changeData] of ingredientChanges) {
      if (changeData.change !== 0) {
        const ingredient = await Ingredient.findById(ingredientId);
        if (ingredient) {
          // Update ingredient stock
          ingredient.stock += changeData.change;
          if (ingredient.stock < 0) {
            ingredient.stock = 0;
          }
          await ingredient.save();

          // Create stock movement record
          const stockMovement = new StockMovement({
            ingredientId,
            type: 'adjustment',
            quantity: changeData.change,
            reason: `แก้ไขรายการขาย ${originalSale._id} - ${changeData.ingredient.name} (${changeData.change > 0 ? 'เพิ่ม' : 'ลด'})`,
            boothId: originalSale.boothId,
            saleId: originalSale._id
          });

          await stockMovement.save();
        }
      }
    }

    // Update booth stock
    const booth = await Booth.findById(originalSale.boothId);
    if (booth && booth.boothStock) {
      for (const [ingredientId, changeData] of ingredientChanges) {
        if (changeData.change !== 0) {
          const boothStockEntry = booth.boothStock.find(
            (stock: any) => stock.ingredientId.toString() === ingredientId
          );

          if (boothStockEntry) {
            // Update booth stock (reverse of ingredient stock)
            boothStockEntry.usedQuantity -= changeData.change;
            boothStockEntry.remainingQuantity = boothStockEntry.allocatedQuantity - boothStockEntry.usedQuantity;

            // Ensure values don't go negative
            if (boothStockEntry.usedQuantity < 0) {
              boothStockEntry.usedQuantity = 0;
              boothStockEntry.remainingQuantity = boothStockEntry.allocatedQuantity;
            }
            if (boothStockEntry.remainingQuantity < 0) {
              boothStockEntry.remainingQuantity = 0;
              boothStockEntry.usedQuantity = boothStockEntry.allocatedQuantity;
            }
          }
        }
      }

      await booth.save();
    }

    // Update accounting transaction
    const originalAccounting = await AccountingTransaction.findOne({
      relatedId: originalSale._id,
      relatedType: 'sale',
      type: 'income'
    });

    if (originalAccounting) {
      originalAccounting.amount = newTotalAmount;
      originalAccounting.description = `การขายสินค้า (แก้ไข) - รายการที่ ${originalSale._id}`;
      await originalAccounting.save();
    } else if (newTotalAmount > 0) {
      // Create new accounting transaction if none exists
      const accountingTransaction = new AccountingTransaction({
        date: originalSale.createdAt,
        type: 'income',
        category: 'sale_revenue',
        amount: newTotalAmount,
        description: `การขายสินค้า (แก้ไข) - รายการที่ ${originalSale._id}`,
        boothId: originalSale.boothId,
        relatedId: originalSale._id,
        relatedType: 'sale',
        brandId: payload.user.brandId
      });

      await accountingTransaction.save();
    }

    // Update the sale record
    originalSale.items = validatedNewItems;
    originalSale.totalAmount = newTotalAmount;
    await originalSale.save();

    return NextResponse.json({
      message: 'แก้ไขรายการขายเรียบร้อยแล้ว',
      sale: originalSale
    });

  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Await params
    const { id } = await params;

    // Find the sale to delete
    const sale = await Sale.findById(id)
      .populate('items.menuItemId', 'ingredients');

    if (!sale) {
      return NextResponse.json(
        { message: 'ไม่พบรายการขาย' },
        { status: 404 }
      );
    }

    // Check permissions
    if (payload.user.role === 'staff') {
      if (sale.boothId !== payload.user.boothId) {
        return NextResponse.json(
          { message: 'ไม่มีสิทธิ์ลบรายการขายนี้' },
          { status: 403 }
        );
      }
    } else if (payload.user.role === 'admin') {
      const booth = await Booth.findById(sale.boothId);
      if (!booth || booth.brandId !== payload.user.brandId) {
        return NextResponse.json(
          { message: 'ไม่มีสิทธิ์ลบรายการขายนี้' },
          { status: 403 }
        );
      }
    }

    // Reverse all ingredient usage
    for (const item of sale.items) {
      const menuItem = await MenuItem.findById(item.menuItemId)
        .populate('ingredients.ingredientId');

      if (menuItem && menuItem.ingredients.length > 0) {
        for (const menuIngredient of menuItem.ingredients) {
          const ingredientId = menuIngredient.ingredientId._id;
          const totalUsed = menuIngredient.quantity * item.quantity;

          // Add back the used ingredients
          const ingredient = await Ingredient.findById(ingredientId);
          if (ingredient) {
            ingredient.stock += totalUsed;
            await ingredient.save();

            // Create stock movement record
            const stockMovement = new StockMovement({
              ingredientId,
              type: 'adjustment',
              quantity: totalUsed,
              reason: `ลบรายการขาย ${sale._id} - คืนวัตถุดิบ ${ingredient.name}`,
              boothId: sale.boothId,
              saleId: sale._id
            });

            await stockMovement.save();
          }
        }
      }
    }

    // Update booth stock
    const booth = await Booth.findById(sale.boothId);
    if (booth && booth.boothStock) {
      for (const item of sale.items) {
        const menuItem = await MenuItem.findById(item.menuItemId)
          .populate('ingredients.ingredientId');

        if (menuItem && menuItem.ingredients.length > 0) {
          for (const menuIngredient of menuItem.ingredients) {
            const ingredientId = menuIngredient.ingredientId._id.toString();
            const totalUsed = menuIngredient.quantity * item.quantity;

            const boothStockEntry = booth.boothStock.find(
              (stock: any) => stock.ingredientId.toString() === ingredientId
            );

            if (boothStockEntry) {
              boothStockEntry.usedQuantity -= totalUsed;
              boothStockEntry.remainingQuantity = boothStockEntry.allocatedQuantity - boothStockEntry.usedQuantity;

              // Ensure values don't go negative
              if (boothStockEntry.usedQuantity < 0) {
                boothStockEntry.usedQuantity = 0;
                boothStockEntry.remainingQuantity = boothStockEntry.allocatedQuantity;
              }
            }
          }
        }
      }

      await booth.save();
    }

    // Delete accounting transaction
    await AccountingTransaction.deleteMany({
      relatedId: sale._id,
      relatedType: 'sale'
    });

    // Delete stock movements related to this sale
    await StockMovement.deleteMany({
      saleId: sale._id
    });

    // Delete the sale
    await Sale.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'ลบรายการขายเรียบร้อยแล้ว'
    });

  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import SaleEditHistory from '@/lib/models/SaleEditHistory';
import MenuItem from '@/lib/models/MenuItem';
import Ingredient from '@/lib/models/Ingredient';
import StockMovement from '@/lib/models/StockMovement';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import Booth from '@/lib/models/Booth';
import { now } from '@/utils/timezone';

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
    const { items, paymentMethod, reason } = body;

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

    // Store original data for edit history
    const originalData = {
      items: originalSale.items.map((item: any) => ({
        menuItemId: item.menuItemId && typeof item.menuItemId === 'object' ? item.menuItemId._id : item.menuItemId,
        quantity: item.quantity,
        price: item.price
      })),
      paymentMethod: originalSale.paymentMethod,
      totalAmount: originalSale.totalAmount
    };

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

      // Use price from client if provided, otherwise use menu item price
      const itemPrice = item.price !== undefined ? item.price : menuItem.price;
      const itemTotal = itemPrice * item.quantity;
      newTotalAmount += itemTotal;

      validatedNewItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: itemPrice
      });
    }

    // Calculate the difference in ingredient usage
    const ingredientChanges = new Map();

    // First, reverse the original usage
    for (const originalItem of originalData.items) {
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

    // Delete existing stock movements for this sale before creating new ones
    await StockMovement.deleteMany({
      saleId: originalSale._id
    });

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
        }
      }
    }

    // Create new stock movements for all ingredients in the new sale
    for (const newItem of validatedNewItems) {
      const menuItem = await MenuItem.findById(newItem.menuItemId)
        .populate('ingredients.ingredientId');

      if (menuItem && menuItem.ingredients.length > 0) {
        for (const menuIngredient of menuItem.ingredients) {
          const ingredientId = menuIngredient.ingredientId._id;
          const totalUsed = menuIngredient.quantity * newItem.quantity;

          // Create stock movement record for the new sale structure
          const stockMovement = new StockMovement({
            ingredientId,
            ingredientName: menuIngredient.ingredientId.name,
            unit: menuIngredient.ingredientId.unit,
            type: 'use',
            quantity: totalUsed, // Positive quantity for the actual usage
            cost: menuIngredient.ingredientId.costPerUnit * totalUsed, // ต้นทุนรวม = costPerUnit × totalUsed
            reason: 'แก้ไขรายการขาย',
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
      // Create description with menu names for edit by looking up each menuItemId
      const menuNames = await Promise.all(
        validatedNewItems.map(async (item: any) => {
          const menuItem = await MenuItem.findById(item.menuItemId);
          const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
          return `${menuItem?.name || 'Unknown'}${quantity}`;
        })
      );

      originalAccounting.amount = newTotalAmount;
      originalAccounting.description = `การขายสินค้า (แก้ไข) - ${menuNames.join(', ')}`;
      originalAccounting.paymentMethod = paymentMethod || originalSale.paymentMethod;
      await originalAccounting.save();
    } else if (newTotalAmount > 0) {
      // Create description with menu names for new transaction by looking up each menuItemId
      const menuNames = await Promise.all(
        validatedNewItems.map(async (item: any) => {
          const menuItem = await MenuItem.findById(item.menuItemId);
          const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
          return `${menuItem?.name || 'Unknown'}${quantity}`;
        })
      );

      // Create new accounting transaction if none exists
      const accountingTransaction = new AccountingTransaction({
        date: originalSale.createdAt,
        type: 'income',
        category: 'sale_revenue',
        amount: newTotalAmount,
        description: `การขายสินค้า (แก้ไข) - ${menuNames.join(', ')}`,
        paymentMethod: paymentMethod || originalSale.paymentMethod,
        boothId: originalSale.boothId,
        relatedId: originalSale._id,
        relatedType: 'sale',
        brandId: payload.user.brandId
      });

      await accountingTransaction.save();
    }

    // Prepare new data for comparison
    const newData = {
      items: validatedNewItems,
      paymentMethod: paymentMethod || originalSale.paymentMethod,
      totalAmount: newTotalAmount
    };

    // Check what changed and create edit history
    const changes: any = { before: {}, after: {} };
    let editType = 'complete_edit';
    let hasChanges = false;

    // Check payment method changes
    if (newData.paymentMethod !== originalData.paymentMethod) {
      changes.before.paymentMethod = originalData.paymentMethod;
      changes.after.paymentMethod = newData.paymentMethod;
      editType = 'payment_method';
      hasChanges = true;
    }

    // Check items changes
    const itemsChanged = JSON.stringify(originalData.items) !== JSON.stringify(newData.items);
    if (itemsChanged) {
      changes.before.items = originalData.items;
      changes.after.items = newData.items;
      editType = editType === 'payment_method' ? 'complete_edit' : 'items';
      hasChanges = true;
    }

    // Check amount changes
    if (newData.totalAmount !== originalData.totalAmount) {
      changes.before.totalAmount = originalData.totalAmount;
      changes.after.totalAmount = newData.totalAmount;
      editType = editType === 'payment_method' || editType === 'items' ? 'complete_edit' : 'amount';
      hasChanges = true;
    }

    // Update the sale record
    originalSale.items = validatedNewItems;
    originalSale.totalAmount = newTotalAmount;
    if (paymentMethod) {
      originalSale.paymentMethod = paymentMethod;
    }
    originalSale.updatedAt = now();
    await originalSale.save();

    // Create edit history record if there were changes
    if (hasChanges) {
      await SaleEditHistory.create({
        saleId: originalSale._id,
        boothId: originalSale.boothId,
        editedBy: payload.user.name || payload.user.username || 'Unknown User',
        editedByUserId: payload.user.id,
        editType: editType,
        changes: changes,
        reason: reason || 'แก้ไขจากประวัติการขาย'
      });
    }

    // Return updated sale with populated items
    const updatedSale = await Sale.findById(originalSale._id)
      .populate('items.menuItemId', 'name price');

    return NextResponse.json({
      message: 'แก้ไขรายการขายเรียบร้อยแล้ว',
      sale: updatedSale
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
      .populate('items.menuItemId', 'name price ingredients');

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
              ingredientName: ingredient.name,
              unit: ingredient.unit,
              type: 'use',
              quantity: totalUsed,
              cost: ingredient.costPerUnit * totalUsed, // ต้นทุนรวม = costPerUnit × totalUsed
              reason: 'ลบรายการขาย',
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

    // Create edit history record for deletion
    const editHistoryData = {
      saleId: sale._id.toString(),
      boothId: sale.boothId,
      editedBy: payload.user.name || payload.user.username || 'Unknown User',
      editedByUserId: payload.user.id,
      editType: 'deletion',
      changes: {
        before: {
          items: sale.items.map((item: any) => ({
            menuItemId: (item.menuItemId?._id || item.menuItemId)?.toString(),
            menuItemName: item.menuItemId?.name || 'Unknown Menu',
            quantity: item.quantity,
            price: item.price
          })),
          paymentMethod: sale.paymentMethod,
          totalAmount: sale.totalAmount
        },
        after: {} // Use empty object instead of null
      },
      reason: 'ลบรายการขายทั้งรายการ'
    };

    console.log('=== DELETION DEBUG ===');
    console.log('Sale to delete:', sale._id);
    console.log('Sale items:', sale.items.map((item: any) => ({
      menuItemId: item.menuItemId,
      name: item.menuItemId?.name || 'NO NAME',
      quantity: item.quantity,
      price: item.price
    })));
    console.log('Edit history data:', JSON.stringify(editHistoryData, null, 2));

    try {
      const editHistory = await SaleEditHistory.create(editHistoryData);
      console.log('✅ Edit history created successfully:', editHistory._id);
    } catch (editError) {
      console.error('❌ Failed to create edit history:', editError);
      // Continue with deletion even if edit history fails
    }

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
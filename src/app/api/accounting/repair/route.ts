import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import MenuItem from '@/lib/models/MenuItem';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import Booth from '@/lib/models/Booth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.user || (payload.user.role !== 'super_admin' && !payload.user.currentBrandId)) {
      return NextResponse.json({ error: 'Unauthorized - Super Admin only' }, { status: 403 });
    }

    await connectDB();

    // Get current brand ID from user
    const brandId = payload.user.currentBrandId || payload.user.brandId;
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID not found' }, { status: 400 });
    }

    // Find all sales that don't have corresponding accounting transactions for current brand
    const salesWithoutAccounting = await Sale.aggregate([
      {
        $addFields: {
          boothObjectId: { $toObjectId: '$boothId' }
        }
      },
      {
        $lookup: {
          from: 'booths',
          localField: 'boothObjectId',
          foreignField: '_id',
          as: 'booth'
        }
      },
      {
        $match: {
          paymentStatus: 'completed',
          'booth.0.brandId': brandId  // Filter by current brand first
        }
      },
      {
        $lookup: {
          from: 'accountingtransactions',
          let: { saleId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$relatedId', '$$saleId'] },
                    { $eq: ['$relatedType', 'sale'] },
                    { $eq: ['$type', 'income'] }
                  ]
                }
              }
            }
          ],
          as: 'accountingTransaction'
        }
      },
      {
        $match: {
          accountingTransaction: { $size: 0 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);

    // Populate menu items for each sale
    for (const sale of salesWithoutAccounting) {
      for (const item of sale.items) {
        const menuItem = await MenuItem.findById(item.menuItemId);
        item.menuItem = menuItem;
      }
    }

    // Calculate daily sums and total amount
    const dailySums: Record<string, { date: string; count: number; totalAmount: number }> = {};
    let totalAmount = 0;

    salesWithoutAccounting.forEach(sale => {
      const dateKey = new Date(sale.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD format

      if (!dailySums[dateKey]) {
        dailySums[dateKey] = {
          date: dateKey,
          count: 0,
          totalAmount: 0
        };
      }

      dailySums[dateKey].count += 1;
      dailySums[dateKey].totalAmount += sale.totalAmount;
      totalAmount += sale.totalAmount;
    });

    return NextResponse.json({
      salesWithoutAccounting,
      count: salesWithoutAccounting.length,
      totalAmount,
      dailySums: Object.values(dailySums).sort((a: any, b: any) => b.date.localeCompare(a.date))
    });

  } catch (error) {
    console.error('Error fetching sales without accounting:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูล' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.user || (payload.user.role !== 'super_admin' && !payload.user.currentBrandId)) {
      return NextResponse.json({ error: 'Unauthorized - Super Admin only' }, { status: 403 });
    }

    const { saleIds } = await request.json();

    if (!saleIds || !Array.isArray(saleIds)) {
      return NextResponse.json({ error: 'Invalid sale IDs' }, { status: 400 });
    }

    await connectDB();

    // Get current brand ID from user
    const brandId = payload.user.currentBrandId || payload.user.brandId;
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID not found' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const saleId of saleIds) {
      try {
        // Get the sale
        const sale = await Sale.findById(saleId);
        if (!sale) {
          errors.push(`Sale ${saleId} not found`);
          continue;
        }

        // Get the booth to check brand
        const booth = await Booth.findById(sale.boothId);
        if (!booth) {
          errors.push(`Booth not found for sale ${saleId}`);
          continue;
        }

        // Check if sale belongs to current brand
        if (booth.brandId !== brandId) {
          errors.push(`Sale ${saleId} does not belong to current brand`);
          continue;
        }

        // Check if accounting transaction already exists
        const existingTransaction = await AccountingTransaction.findOne({
          relatedId: sale._id,
          relatedType: 'sale',
          type: 'income'
        });

        if (existingTransaction) {
          errors.push(`Sale ${saleId} already has accounting transaction`);
          continue;
        }

        // Create description with menu names by looking up each menuItemId
        const menuNames = await Promise.all(
          sale.items.map(async (item: any) => {
            const menuItem = await MenuItem.findById(item.menuItemId);
            const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
            return `${menuItem?.name || 'Unknown'}${quantity}`;
          })
        );

        // Create accounting transaction using the same logic as sales creation
        const accountingTransaction = new AccountingTransaction({
          date: sale.createdAt, // Use original sale date
          type: 'income',
          category: 'sale_revenue',
          amount: sale.totalAmount,
          description: `การขายสินค้า (ซ่อมแซม) - ${menuNames.join(', ')}`,
          paymentMethod: sale.paymentMethod,
          boothId: booth._id, // Use booth ObjectId from the booth we found
          relatedId: sale._id,
          relatedType: 'sale',
          brandId: booth.brandId // Use brandId from booth (will be converted to ObjectId by mongoose)
        });

        await accountingTransaction.save();
        results.push({
          saleId: sale._id,
          transactionId: accountingTransaction._id,
          amount: sale.totalAmount,
          success: true
        });

      } catch (error) {
        console.error(`Error processing sale ${saleId}:`, error);
        errors.push(`Error processing sale ${saleId}: ${error}`);
      }
    }

    return NextResponse.json({
      message: 'Repair completed',
      results,
      errors,
      successCount: results.length,
      errorCount: errors.length
    });

  } catch (error) {
    console.error('Error repairing accounting records:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการซ่อมแซมข้อมูล' },
      { status: 500 }
    );
  }
}
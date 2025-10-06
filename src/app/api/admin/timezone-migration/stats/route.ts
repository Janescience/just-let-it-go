import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import StockMovement from '@/lib/models/StockMovement';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.user || payload.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    await connectDB();

    // Get Thailand timezone offset (UTC+7)
    const thailandOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds

    // Calculate stats for each collection
    const [salesStats, accountingStats, stockStats] = await Promise.all([
      // Sales stats
      Sale.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            utc: {
              $sum: {
                $cond: [
                  {
                    $lt: [
                      { $subtract: [{ $toLong: '$createdAt' }, { $mod: [{ $toLong: '$createdAt' }, 86400000] }] },
                      { $subtract: [{ $toLong: '$createdAt' }, thailandOffset] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Accounting stats
      AccountingTransaction.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            utc: {
              $sum: {
                $cond: [
                  {
                    $lt: [
                      { $subtract: [{ $toLong: '$date' }, { $mod: [{ $toLong: '$date' }, 86400000] }] },
                      { $subtract: [{ $toLong: '$date' }, thailandOffset] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Stock movement stats
      StockMovement.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            utc: {
              $sum: {
                $cond: [
                  {
                    $lt: [
                      { $subtract: [{ $toLong: '$createdAt' }, { $mod: [{ $toLong: '$createdAt' }, 86400000] }] },
                      { $subtract: [{ $toLong: '$createdAt' }, thailandOffset] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    // Get sample data that needs migration
    const sampleSales = await Sale.find({}).sort({ createdAt: -1 }).limit(3).select('_id createdAt totalAmount');
    const sampleAccounting = await AccountingTransaction.find({}).sort({ date: -1 }).limit(2).select('_id date amount description');
    const sampleStock = await StockMovement.find({}).sort({ createdAt: -1 }).limit(2).select('_id createdAt quantity reason');

    // Combine stats
    const totalRecords = (salesStats[0]?.total || 0) + (accountingStats[0]?.total || 0) + (stockStats[0]?.total || 0);
    const utcRecords = (salesStats[0]?.utc || 0) + (accountingStats[0]?.utc || 0) + (stockStats[0]?.utc || 0);
    const thailandRecords = totalRecords - utcRecords;

    // Format samples
    const samples = [
      ...sampleSales.map(sale => ({
        _id: sale._id.toString(),
        createdAt: sale.createdAt.toISOString(),
        type: 'sale' as const,
        amount: sale.totalAmount
      })),
      ...sampleAccounting.map(acc => ({
        _id: acc._id.toString(),
        createdAt: acc.date.toISOString(),
        type: 'accounting' as const,
        amount: acc.amount,
        description: acc.description
      })),
      ...sampleStock.map(stock => ({
        _id: stock._id.toString(),
        createdAt: stock.createdAt.toISOString(),
        type: 'stock_movement' as const,
        description: stock.reason
      }))
    ];

    return NextResponse.json({
      success: true,
      stats: {
        totalRecords,
        utcRecords,
        thailandRecords,
        samples: samples.slice(0, 10) // Limit to 10 samples
      }
    });

  } catch (error) {
    console.error('Error getting timezone migration stats:', error);
    return NextResponse.json(
      { error: 'Failed to get migration stats' },
      { status: 500 }
    );
  }
}
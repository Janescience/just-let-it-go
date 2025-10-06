import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import StockMovement from '@/lib/models/StockMovement';
import { logSystemError } from '@/utils/errorLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload?.user || payload.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  try {

    await connectDB();

    const errors: string[] = [];
    let salesUpdated = 0;
    let accountingUpdated = 0;
    let stockMovementsUpdated = 0;

    try {
      // Thailand timezone offset (UTC+7)
      const thailandOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds

      // Migrate Sales
      const salesResult = await Sale.updateMany(
        {
          $expr: {
            $lt: [
              { $subtract: [{ $toLong: '$createdAt' }, { $mod: [{ $toLong: '$createdAt' }, 86400000] }] },
              { $subtract: [{ $toLong: '$createdAt' }, thailandOffset] }
            ]
          }
        },
        [
          {
            $set: {
              createdAt: { $add: ['$createdAt', thailandOffset] },
              updatedAt: { $add: [{ $ifNull: ['$updatedAt', '$createdAt'] }, thailandOffset] }
            }
          }
        ]
      );
      salesUpdated = salesResult.modifiedCount;

      // Migrate Accounting Transactions
      const accountingResult = await AccountingTransaction.updateMany(
        {
          $expr: {
            $lt: [
              { $subtract: [{ $toLong: '$date' }, { $mod: [{ $toLong: '$date' }, 86400000] }] },
              { $subtract: [{ $toLong: '$date' }, thailandOffset] }
            ]
          }
        },
        [
          {
            $set: {
              date: { $add: ['$date', thailandOffset] },
              createdAt: { $add: [{ $ifNull: ['$createdAt', '$date'] }, thailandOffset] },
              updatedAt: { $add: [{ $ifNull: ['$updatedAt', '$date'] }, thailandOffset] }
            }
          }
        ]
      );
      accountingUpdated = accountingResult.modifiedCount;

      // Migrate Stock Movements
      const stockResult = await StockMovement.updateMany(
        {
          $expr: {
            $lt: [
              { $subtract: [{ $toLong: '$createdAt' }, { $mod: [{ $toLong: '$createdAt' }, 86400000] }] },
              { $subtract: [{ $toLong: '$createdAt' }, thailandOffset] }
            ]
          }
        },
        [
          {
            $set: {
              createdAt: { $add: ['$createdAt', thailandOffset] },
              updatedAt: { $add: [{ $ifNull: ['$updatedAt', '$createdAt'] }, thailandOffset] }
            }
          }
        ]
      );
      stockMovementsUpdated = stockResult.modifiedCount;

    } catch (migrationError) {
      const errorMessage = migrationError instanceof Error ? migrationError.message : 'Unknown migration error';
      errors.push(`Migration error: ${errorMessage}`);

      await logSystemError(
        'Timezone migration failed',
        migrationError,
        {
          function: 'timezoneMigration',
          userId: payload.user.id,
          additionalData: {
            salesUpdated,
            accountingUpdated,
            stockMovementsUpdated
          }
        },
        request
      );
    }

    const duration = (Date.now() - startTime) / 1000;
    const totalProcessed = salesUpdated + accountingUpdated + stockMovementsUpdated;

    // Log successful migration
    if (errors.length === 0) {
      await logSystemError(
        'Timezone migration completed successfully',
        null,
        {
          function: 'timezoneMigration',
          userId: payload.user.id,
          additionalData: {
            totalProcessed,
            salesUpdated,
            accountingUpdated,
            stockMovementsUpdated,
            duration
          }
        },
        request
      );
    }

    return NextResponse.json({
      success: errors.length === 0,
      totalProcessed,
      salesUpdated,
      accountingUpdated,
      stockMovementsUpdated,
      errors,
      duration
    });

  } catch (error) {
    console.error('Error during timezone migration:', error);

    await logSystemError(
      'Timezone migration system error',
      error,
      {
        function: 'timezoneMigration',
        userId: payload?.user?.id
      },
      request
    );

    const duration = (Date.now() - startTime) / 1000;

    return NextResponse.json({
      success: false,
      totalProcessed: 0,
      salesUpdated: 0,
      accountingUpdated: 0,
      stockMovementsUpdated: 0,
      errors: [error instanceof Error ? error.message : 'Unknown system error'],
      duration
    }, { status: 500 });
  }
}
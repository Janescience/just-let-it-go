import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import StockMovement from '@/lib/models/StockMovement';

export async function POST(request: NextRequest) {
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

    let accountingUpdated = 0;
    let stockMovementUpdated = 0;
    let errors = [];

    try {
      // Update AccountingTransaction collection
      // Add 7 hours to createdAt and updatedAt fields
      const accountingResult = await AccountingTransaction.updateMany(
        {}, // All documents
        [{
          $set: {
            createdAt: {
              $dateAdd: {
                startDate: "$createdAt",
                unit: "hour",
                amount: 7
              }
            },
            updatedAt: {
              $dateAdd: {
                startDate: "$updatedAt",
                unit: "hour",
                amount: 7
              }
            }
          }
        }]
      );
      accountingUpdated = accountingResult.modifiedCount;

    } catch (error) {
      console.error('Error updating AccountingTransaction:', error);
      errors.push(`AccountingTransaction error: ${error}`);
    }

    try {
      // Update StockMovement collection
      // Add 7 hours to createdAt and updatedAt fields
      const stockResult = await StockMovement.updateMany(
        {}, // All documents
        [{
          $set: {
            createdAt: {
              $dateAdd: {
                startDate: "$createdAt",
                unit: "hour",
                amount: 7
              }
            },
            updatedAt: {
              $dateAdd: {
                startDate: "$updatedAt",
                unit: "hour",
                amount: 7
              }
            }
          }
        }]
      );
      stockMovementUpdated = stockResult.modifiedCount;

    } catch (error) {
      console.error('Error updating StockMovement:', error);
      errors.push(`StockMovement error: ${error}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Timezone migration completed',
      results: {
        accountingTransactions: accountingUpdated,
        stockMovements: stockMovementUpdated,
        totalUpdated: accountingUpdated + stockMovementUpdated,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error during timezone migration:', error);
    return NextResponse.json(
      { error: 'Failed to perform migration' },
      { status: 500 }
    );
  }
}
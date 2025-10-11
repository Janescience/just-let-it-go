import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
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

    // Get counts for both tables
    const [accountingCount, stockMovementCount] = await Promise.all([
      AccountingTransaction.countDocuments(),
      StockMovement.countDocuments()
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        accountingTransactions: accountingCount,
        stockMovements: stockMovementCount,
        totalRecords: accountingCount + stockMovementCount
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
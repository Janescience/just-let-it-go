import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import AccountingTransaction from '@/lib/models/AccountingTransaction';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.user?.brandId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('filterType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type');
    const boothId = searchParams.get('boothId');

    await connectDB();

    // Build query
    const query: any = { brandId: decoded.user.brandId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    if (type) query.type = type;
    if (boothId) query.boothId = boothId;

    const transactions = await AccountingTransaction.find(query)
      .populate('boothId', 'name')
      .sort({ date: -1 });

    // Calculate summary
    const summary = transactions.reduce((acc, transaction) => {
      if (transaction.type === 'income') {
        acc.totalIncome += transaction.amount;
        acc.incomeByCategory[transaction.category] =
          (acc.incomeByCategory[transaction.category] || 0) + transaction.amount;
      } else {
        acc.totalExpense += transaction.amount;
        acc.expenseByCategory[transaction.category] =
          (acc.expenseByCategory[transaction.category] || 0) + transaction.amount;
      }
      return acc;
    }, {
      totalIncome: 0,
      totalExpense: 0,
      incomeByCategory: {} as { [key: string]: number },
      expenseByCategory: {} as { [key: string]: number }
    });

    const netProfit = summary.totalIncome - summary.totalExpense;

    return NextResponse.json({
      transactions,
      summary: {
        ...summary,
        netProfit
      },
      success: true
    });

  } catch (error) {
    console.error('Error fetching accounting transactions:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลบัญชี' },
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

    const decoded = verifyToken(token);
    if (!decoded?.user?.brandId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.type || !data.category || !data.amount || !data.description) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (data.amount <= 0) {
      return NextResponse.json(
        { error: 'จำนวนเงินต้องมากกว่า 0' },
        { status: 400 }
      );
    }

    await connectDB();

    const transaction = new AccountingTransaction({
      date: data.date ? new Date(data.date) : new Date(),
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      boothId: data.boothId || null,
      relatedId: data.relatedId || null,
      relatedType: data.relatedType || 'manual',
      brandId: decoded.user.brandId
    });

    await transaction.save();
    await transaction.populate('boothId', 'name');

    return NextResponse.json({
      transaction,
      success: true,
      message: 'บันทึกรายการบัญชีสำเร็จ'
    });

  } catch (error) {
    console.error('Error creating accounting transaction:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกรายการบัญชี' },
      { status: 500 }
    );
  }
}
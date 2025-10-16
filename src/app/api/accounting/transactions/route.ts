import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import { now } from '@/utils/timezone';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
// Force import to register the model
import '@/lib/models/Booth';

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
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate + 'T00:00:00+07:00');
        query.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate + 'T23:59:59+07:00');
        query.createdAt.$lte = end;
      }
    }

    if (type) query.type = type;
    if (boothId) query.boothId = boothId;

    const transactions = await AccountingTransaction.find(query)
      .sort({ createdAt: -1 });

    // Manually fetch booth names if needed
    const boothIds = [...new Set(transactions.filter(t => t.boothId).map(t => t.boothId.toString()))];
    let boothMap: { [key: string]: string } = {};

    if (boothIds.length > 0) {
      try {
        const mongoose = require('mongoose');
        const Booth = mongoose.models.Booth;
        if (Booth) {
          const booths = await Booth.find({ _id: { $in: boothIds } }, 'name');
          boothMap = booths.reduce((map: { [key: string]: string }, booth: any) => {
            map[booth._id.toString()] = booth.name;
            return map;
          }, {});
        }
      } catch (error) {
        console.log('Could not fetch booth names:', error);
      }
    }

    // Add booth names to transactions
    const transactionsWithBooths = transactions.map(transaction => ({
      ...transaction.toObject(),
      boothName: transaction.boothId ? boothMap[transaction.boothId.toString()] || 'Unknown Booth' : null
    }));

    // Calculate summary
    const summary = transactionsWithBooths.reduce((acc, transaction) => {
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
      transactions: transactionsWithBooths,
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
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      boothId: data.boothId || null,
      relatedId: data.relatedId || null,
      relatedType: data.relatedType || 'manual',
      brandId: decoded.user.brandId
    });

    // Set custom createdAt if datetime is provided
    if (data.datetime) {
      transaction.createdAt = new Date(data.datetime);
    }

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
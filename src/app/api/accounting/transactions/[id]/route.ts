import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import AccountingTransaction from '@/lib/models/AccountingTransaction';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.user?.brandId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const transaction = await AccountingTransaction.findOne({
      _id: id,
      brandId: decoded.user.brandId
    }).populate('boothId', 'name');

    if (!transaction) {
      return NextResponse.json({ error: 'ไม่พบรายการบัญชี' }, { status: 404 });
    }

    return NextResponse.json({
      transaction,
      success: true
    });

  } catch (error) {
    console.error('Error fetching accounting transaction:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการบัญชี' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    await connectDB();
    const { id } = await params;
    const transaction = await AccountingTransaction.findOneAndUpdate(
      {
        _id: id,
        brandId: decoded.user.brandId
      },
      {
        date: data.date ? new Date(data.date) : undefined,
        type: data.type,
        category: data.category,
        amount: data.amount,
        description: data.description,
        boothId: data.boothId || null
      },
      { new: true }
    ).populate('boothId', 'name');

    if (!transaction) {
      return NextResponse.json({ error: 'ไม่พบรายการบัญชี' }, { status: 404 });
    }

    return NextResponse.json({
      transaction,
      success: true,
      message: 'อัพเดทรายการบัญชีสำเร็จ'
    });

  } catch (error) {
    console.error('Error updating accounting transaction:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพเดทรายการบัญชี' },
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.user?.brandId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const transaction = await AccountingTransaction.findOneAndDelete({
      _id: id,
      brandId: decoded.user.brandId
    });

    if (!transaction) {
      return NextResponse.json({ error: 'ไม่พบรายการบัญชี' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'ลบรายการบัญชีสำเร็จ'
    });

  } catch (error) {
    console.error('Error deleting accounting transaction:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบรายการบัญชี' },
      { status: 500 }
    );
  }
}
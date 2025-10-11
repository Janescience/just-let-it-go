import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import SaleEditHistory from '@/lib/models/SaleEditHistory';
import Sale from '@/lib/models/Sale';
import MenuItem from '@/lib/models/MenuItem';
import Booth from '@/lib/models/Booth';

export async function GET(
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

    const { id } = await params;

    // One-time migration: Update old SaleEditHistory records to include boothId
    try {
      const recordsWithoutBoothId = await SaleEditHistory.find({
        boothId: { $exists: false }
      }).populate('saleId', 'boothId');

      for (const record of recordsWithoutBoothId) {
        if (record.saleId && (record.saleId as any).boothId) {
          await SaleEditHistory.updateOne(
            { _id: record._id },
            { $set: { boothId: (record.saleId as any).boothId } }
          );
        }
      }
    } catch (error) {
      console.log('Migration already completed or error:', error instanceof Error ? error.message : String(error));
    }

    // Check if user has permission to view this booth's data
    if (payload.user.role === 'staff') {
      if (id !== payload.user.boothId) {
        return NextResponse.json(
          { message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' },
          { status: 403 }
        );
      }
    } else if (payload.user.role === 'admin') {
      // Admin can view edit history from their brand's booths
      const booth = await Booth.findById(id);
      if (!booth || booth.brandId !== payload.user.brandId) {
        return NextResponse.json(
          { message: 'ไม่มีสิทธิ์เข้าถึงข้อมูลนี้' },
          { status: 403 }
        );
      }
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get edit history for all sales in this booth (after migration, all should have boothId)
    const editHistory = await SaleEditHistory.find({
      boothId: id
    })
    .populate({
      path: 'saleId',
      populate: {
        path: 'items.menuItemId',
        select: 'name price'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    // Get total count for pagination
    const totalCount = await SaleEditHistory.countDocuments({
      boothId: id
    });

    // Transform the data to include menu item names in changes
    const transformedHistory = await Promise.all(
      editHistory.map(async (history: any) => {
        let transformedChanges = { ...history.changes };

        // Transform before and after data to include menu item names
        if (transformedChanges.before?.items) {
          transformedChanges.before.items = await Promise.all(
            transformedChanges.before.items.map(async (item: any) => {
              const menuItem = await MenuItem.findById(item.menuItemId);
              return {
                ...item,
                menuItemName: menuItem?.name || 'เมนูที่ถูกลบ'
              };
            })
          );
        }

        if (transformedChanges.after?.items) {
          transformedChanges.after.items = await Promise.all(
            transformedChanges.after.items.map(async (item: any) => {
              const menuItem = await MenuItem.findById(item.menuItemId);
              return {
                ...item,
                menuItemName: menuItem?.name || 'เมนูที่ถูกลบ'
              };
            })
          );
        }

        return {
          _id: history._id,
          saleId: history.saleId?._id || history.saleId,
          editedBy: history.editedBy,
          editType: history.editType,
          changes: transformedChanges,
          reason: history.reason,
          createdAt: history.createdAt,
          sale: history.saleId || null
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return NextResponse.json({
      editHistory: transformedHistory,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext,
        hasPrev,
        limit
      }
    });

  } catch (error) {
    console.error('Error fetching edit history:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
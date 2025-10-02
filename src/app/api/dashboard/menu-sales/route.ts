import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleModel from '@/lib/models/Sale';
import BoothModel from '@/lib/models/Booth';
import MenuItemModel from '@/lib/models/MenuItem';
import { verifyToken } from '@/utils/auth';
import { addSecurityHeaders } from '@/utils/security';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Check authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      const response = NextResponse.json(
        { message: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user || !payload.user.brandId) {
      const response = NextResponse.json(
        { message: 'ไม่มีสิทธิ์ในการเข้าถึง' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const boothIdParam = searchParams.get('boothId');
    const allBooths = searchParams.get('allBooths'); // New parameter for operational data

    // Get booths based on request type - filter by brandId
    let boothFilter: any = {
      brandId: payload.user.brandId
    };
    let targetBooths;

    if (allBooths === 'true') {
      // For operational data - get ALL booths (active and inactive) for this brand
      targetBooths = await BoothModel.find(boothFilter, { _id: 1 });
    } else {
      // For pie charts - get only active booths for this brand
      boothFilter.isActive = true;
      if (boothIdParam) {
        boothFilter._id = boothIdParam;
      }
      targetBooths = await BoothModel.find(boothFilter, { _id: 1 });
    }

    const boothIds = targetBooths.map(booth => (booth._id as any).toString());

    if (boothIds.length === 0) {
      return NextResponse.json([]);
    }

    // Build date filter (skip date filter for operational data)
    let dateFilter = {};
    if (dateParam && dateParam !== 'all' && allBooths !== 'true') {
      // Use same logic as menu-profits for consistency
      const startDate = new Date(dateParam);
      const endDate = new Date(dateParam);
      endDate.setDate(endDate.getDate() + 1);

      dateFilter = {
        createdAt: {
          $gte: startDate,
          $lt: endDate
        }
      };
    }


    // Aggregate menu sales grouped by booth
    const menuSales = await SaleModel.aggregate([
      {
        $match: {
          boothId: { $in: boothIds },
          ...dateFilter
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: {
            boothId: '$boothId',
            menuItemId: '$items.menuItemId'
          },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      {
        $addFields: {
          menuItemObjectId: { $toObjectId: '$_id.menuItemId' },
          boothObjectId: { $toObjectId: '$_id.boothId' }
        }
      },
      {
        $lookup: {
          from: 'menuitems',
          localField: 'menuItemObjectId',
          foreignField: '_id',
          as: 'menuItem'
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
        $unwind: {
          path: '$menuItem',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$booth',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$_id.boothId',
          boothName: { $first: { $ifNull: ['$booth.name', 'Unknown Booth'] } },
          menuItems: {
            $push: {
              menuItemId: '$_id.menuItemId',
              name: { $ifNull: ['$menuItem.name', 'Unknown Menu'] },
              quantity: '$quantity',
              revenue: '$revenue'
            }
          },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$revenue' }
        }
      },
      {
        $sort: { boothName: 1 }
      }
    ]);

    const response = NextResponse.json(menuSales);
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching menu sales data:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch menu sales data' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleModel from '@/lib/models/Sale';
import BoothModel from '@/lib/models/Booth';
import MenuItemModel from '@/lib/models/MenuItem';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const boothIdParam = searchParams.get('boothId');
    const allBooths = searchParams.get('allBooths'); // New parameter for operational data

    // Get booths based on request type
    let boothFilter: any = {};
    let targetBooths;

    if (allBooths === 'true') {
      // For operational data - get ALL booths (active and inactive)
      targetBooths = await BoothModel.find({}, { _id: 1 });
    } else {
      // For pie charts - get only active booths
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
      if (dateParam === 'today') {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

        dateFilter = {
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        };
      } else {
        // Parse date as UTC and create full day range in UTC
        const dateParts = dateParam.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[2]);

        const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

        dateFilter = {
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        };
      }
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

    return NextResponse.json(menuSales);
  } catch (error) {
    console.error('Error fetching menu sales data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu sales data' },
      { status: 500 }
    );
  }
}
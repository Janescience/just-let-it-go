import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleModel from '@/lib/models/Sale';
import BoothModel from '@/lib/models/Booth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get all booths (both active and inactive for comprehensive analysis)
    const allBooths = await BoothModel.find({}, { _id: 1 });
    const allBoothIds = allBooths.map(booth => (booth._id as any).toString());

    if (allBoothIds.length === 0) {
      return NextResponse.json({
        peakHours: [],
        orderSizes: [],
        popularCombinations: []
      });
    }

    // Peak Hours Analysis
    const peakHours = await SaleModel.aggregate([
      { $match: { boothId: { $in: allBoothIds } } },
      {
        $group: {
          _id: { $hour: { $dateAdd: { startDate: "$createdAt", unit: "hour", amount: 7 } } },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { orderCount: -1 } },
      {
        $project: {
          hour: '$_id',
          orderCount: 1,
          totalRevenue: 1,
          hourDisplay: {
            $concat: [
              { $toString: '$_id' },
              ':00-',
              { $toString: { $add: ['$_id', 1] } },
              ':00'
            ]
          }
        }
      }
    ]);

    // Order Size Analysis
    const orderSizes = await SaleModel.aggregate([
      { $match: { boothId: { $in: allBoothIds } } },
      {
        $addFields: {
          itemCount: { $sum: '$items.quantity' }
        }
      },
      {
        $bucket: {
          groupBy: '$itemCount',
          boundaries: [1, 3, 6, 11, 21],
          default: '20+',
          output: {
            orderCount: { $sum: 1 },
            avgRevenue: { $avg: '$totalAmount' },
            totalRevenue: { $sum: '$totalAmount' }
          }
        }
      },
      {
        $project: {
          sizeCategory: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 1] }, then: '1-2 จาน' },
                { case: { $eq: ['$_id', 3] }, then: '3-5 จาน' },
                { case: { $eq: ['$_id', 6] }, then: '6-10 จาน' },
                { case: { $eq: ['$_id', 11] }, then: '11-20 จาน' }
              ],
              default: '20+ จาน'
            }
          },
          orderCount: 1,
          avgRevenue: { $round: ['$avgRevenue', 2] },
          totalRevenue: 1
        }
      },
      { $sort: { orderCount: -1 } }
    ]);

    // Popular Menu Combinations
    const popularCombinations = await SaleModel.aggregate([
      { $match: { boothId: { $in: allBoothIds } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'menuitems',
          let: { menuItemId: { $toObjectId: '$items.menuItemId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$menuItemId'] } } },
            { $project: { name: 1 } }
          ],
          as: 'menuItem'
        }
      },
      { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          menuItems: {
            $push: {
              name: { $ifNull: ['$menuItem.name', 'Unknown Menu'] },
              quantity: '$items.quantity'
            }
          }
        }
      },
      {
        $match: {
          'menuItems.1': { $exists: true } // Only orders with 2+ items
        }
      },
      {
        $project: {
          combination: {
            $reduce: {
              input: '$menuItems',
              initialValue: '',
              in: {
                $concat: [
                  '$$value',
                  { $cond: [{ $eq: ['$$value', ''] }, '', ' + '] },
                  '$$this.name'
                ]
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$combination',
          frequency: { $sum: 1 }
        }
      },
      { $sort: { frequency: -1 } },
      { $limit: 10 },
      {
        $project: {
          combination: '$_id',
          frequency: 1
        }
      }
    ]);

    return NextResponse.json({
      peakHours,
      orderSizes,
      popularCombinations
    });
  } catch (error) {
    console.error('Error fetching customer patterns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer patterns' },
      { status: 500 }
    );
  }
}
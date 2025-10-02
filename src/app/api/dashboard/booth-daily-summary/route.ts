import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SaleModel from '@/lib/models/Sale';
import BoothModel from '@/lib/models/Booth';
import MenuItemModel from '@/lib/models/MenuItem';
import IngredientModel from '@/lib/models/Ingredient';
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const boothId = searchParams.get('boothId');

    if (!boothId) {
      const response = NextResponse.json(
        { message: 'ไม่ได้ระบุ boothId' },
        { status: 400 }
      );
      return addSecurityHeaders(response);
    }

    // Verify booth belongs to user's brand
    const booth = await BoothModel.findOne({
      _id: boothId,
      brandId: payload.user.brandId
    });

    if (!booth) {
      const response = NextResponse.json(
        { message: 'ไม่พบบูธ' },
        { status: 404 }
      );
      return addSecurityHeaders(response);
    }

    // Step 1: Get booth startDate and endDate to create complete date range
    const boothInfo = await BoothModel.findById(boothId, { startDate: 1, endDate: 1 });
    if (!boothInfo) {
      const response = NextResponse.json([]);
      return addSecurityHeaders(response);
    }

    // Create array of all dates between startDate and endDate
    const allBoothDates: string[] = [];
    const startDate = new Date(boothInfo.startDate);
    const endDate = new Date(boothInfo.endDate);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      allBoothDates.push(dateString);
    }


    // Step 2: Get sales data with proper cost calculation (only for days with sales)
    const salesData = await SaleModel.aggregate([
      {
        $match: {
          boothId: boothId
        }
      },
      {
        $addFields: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              ...(process.env.NODE_ENV === 'production' && { timezone: "Asia/Bangkok" })
            }
          }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $lookup: {
          from: 'menuitems',
          let: { menuItemId: { $toObjectId: '$items.menuItemId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$menuItemId'] } } },
            { $project: { name: 1, price: 1, ingredients: 1 } }
          ],
          as: 'menuItem'
        }
      },
      {
        $unwind: '$menuItem'
      },
      {
        $unwind: {
          path: '$menuItem.ingredients',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'ingredients',
          let: { ingredientId: { $toObjectId: '$menuItem.ingredients.ingredientId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$ingredientId'] } } },
            { $project: { costPerUnit: 1 } }
          ],
          as: 'ingredient'
        }
      },
      {
        $unwind: {
          path: '$ingredient',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            date: '$date',
            saleId: '$_id'
          },
          totalRevenue: { $first: '$totalAmount' },
          totalCost: {
            $sum: {
              $multiply: [
                '$items.quantity',
                { $ifNull: ['$menuItem.ingredients.quantity', 0] },
                { $ifNull: ['$ingredient.costPerUnit', 0] }
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          totalRevenue: { $sum: '$totalRevenue' },
          totalCost: { $sum: '$totalCost' }
        }
      },
      {
        $project: {
          date: '$_id',
          revenue: '$totalRevenue',
          cost: '$totalCost',
          profit: { $subtract: ['$totalRevenue', '$totalCost'] }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);


    // Step 3: Match sales data with all booth dates
    const completeData = allBoothDates.map((dateStr: string) => {
      const salesForDate = salesData.find(s => s.date === dateStr);

      const displayDate = new Date(dateStr).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'numeric',
        ...(process.env.NODE_ENV === 'production' && { timeZone: 'Asia/Bangkok' })
      }).replace('/', '/');

      if (salesForDate) {
        // มียอดขาย - แสดงข้อมูลจริง
        return {
          date: dateStr,
          revenue: salesForDate.revenue,
          cost: salesForDate.cost,
          profit: salesForDate.profit,
          displayDate: displayDate
        };
      } else {
        // ไม่มียอดขาย - แสดงแค่วันที่บนแกน X
        return {
          date: dateStr,
          revenue: null,
          cost: null,
          profit: null,
          displayDate: displayDate
        };
      }
    });


    const response = NextResponse.json(completeData);
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching booth daily summary:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch booth daily summary' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
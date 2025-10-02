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
    const date = searchParams.get('date');

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

    // Build date filter for sales
    let dateFilter: any = {};
    if (date && date !== 'all' && date !== 'today') {
      // Specific date
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      dateFilter = {
        createdAt: {
          $gte: startDate,
          $lt: endDate
        }
      };
    } else if (date === 'today') {
      // Today's sales
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      dateFilter = {
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      };
    }
    // If date === 'all', no date filter (all time)

    // Get ingredient usage from sales
    const ingredientUsage = await SaleModel.aggregate([
      {
        $match: {
          boothId: boothId,
          ...dateFilter
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
            { $project: { ingredients: 1 } }
          ],
          as: 'menuItem'
        }
      },
      {
        $unwind: '$menuItem'
      },
      {
        $unwind: '$menuItem.ingredients'
      },
      {
        $group: {
          _id: '$menuItem.ingredients.ingredientId',
          totalUsed: {
            $sum: {
              $multiply: [
                '$items.quantity',
                '$menuItem.ingredients.quantity'
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'ingredients',
          let: { ingredientId: { $toObjectId: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$ingredientId'] } } },
            { $project: { name: 1, unit: 1, costPerUnit: 1 } }
          ],
          as: 'ingredient'
        }
      },
      {
        $unwind: '$ingredient'
      },
      {
        $project: {
          name: '$ingredient.name',
          unit: '$ingredient.unit',
          costPerUnit: '$ingredient.costPerUnit',
          totalUsed: 1,
          totalValue: { $multiply: ['$totalUsed', '$ingredient.costPerUnit'] }
        }
      },
      {
        $sort: { totalValue: -1 }
      },
      {
        $limit: 20
      }
    ]);

    const response = NextResponse.json(ingredientUsage);
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching booth ingredients usage:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch booth ingredients usage' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
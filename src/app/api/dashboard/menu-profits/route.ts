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
    const allBooths = searchParams.get('allBooths') === 'true';

    let boothIds: string[] = [];

    if (allBooths) {
      // Get all booths for this brand
      const booths = await BoothModel.find({ brandId: payload.user.brandId }, { _id: 1 });
      boothIds = booths.map(booth => (booth._id as any).toString());
    } else if (boothId) {
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
      boothIds = [boothId];
    } else {
      const response = NextResponse.json(
        { message: 'ไม่ได้ระบุ boothId หรือ allBooths' },
        { status: 400 }
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

    // Calculate profit for each menu item
    const menuProfits = await SaleModel.aggregate([
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
            menuItemId: '$items.menuItemId',
            saleId: '$_id'
          },
          menuName: { $first: '$menuItem.name' },
          menuPrice: { $first: '$menuItem.price' },
          quantity: { $first: '$items.quantity' },
          revenue: { $first: { $multiply: ['$items.quantity', '$menuItem.price'] } },
          totalIngredientCost: {
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
          _id: '$_id.menuItemId',
          menuName: { $first: '$menuName' },
          menuPrice: { $first: '$menuPrice' },
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: '$revenue' },
          totalCost: { $sum: '$totalIngredientCost' },
          totalProfit: { $sum: { $subtract: ['$revenue', '$totalIngredientCost'] } }
        }
      },
      {
        $project: {
          menuItemId: '$_id',
          name: '$menuName',
          price: '$menuPrice',
          quantity: '$totalQuantity',
          revenue: '$totalRevenue',
          cost: '$totalCost',
          profit: '$totalProfit'
        }
      },
      {
        $sort: { profit: -1 }
      }
    ]);

    // Group by booth if not allBooths
    if (!allBooths && boothId) {
      const booth = await BoothModel.findById(boothId);
      const response = NextResponse.json([{
        _id: boothId,
        boothName: booth?.name || 'Unknown Booth',
        menuItems: menuProfits,
        totalQuantity: menuProfits.reduce((sum, item) => sum + item.quantity, 0),
        totalRevenue: menuProfits.reduce((sum, item) => sum + item.revenue, 0),
        totalProfit: menuProfits.reduce((sum, item) => sum + item.profit, 0)
      }]);
      return addSecurityHeaders(response);
    }

    // Return aggregated data for all booths
    const response = NextResponse.json(menuProfits);
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching menu profits:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch menu profits' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
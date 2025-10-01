import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import Booth from '@/lib/models/Booth';
import MenuItem from '@/lib/models/MenuItem';
import  '@/lib/models/Ingredient';

export async function GET(request: NextRequest) {
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

    if (payload.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const boothId = searchParams.get('boothId');

    // Build query
    let matchQuery: any = {};

    // Date range filter
    if (startDate && endDate) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1);


      matchQuery.createdAt = {
        $gte: startDateObj,
        $lte: endDateObj
      };
    }

    // Get booths for the brand
    const booths = await Booth.find({ brandId: payload.user.brandId }).select('_id name');
    const boothIds = booths.map(booth => (booth._id as any).toString()); // Convert to strings


    if (boothId && boothId !== 'all') {
      matchQuery.boothId = boothId;
    } else {
      matchQuery.boothId = { $in: boothIds };
    }

    // Debug: Check what sales exist first

    const allSales = await Sale.find({
      boothId: { $in: boothIds }
    }).select('paymentStatus createdAt totalAmount boothId items').limit(10);


    // Debug items structure
    if (allSales.length > 0 && allSales[0].items) {
    }

    // Include all sales regardless of payment status


    // Aggregate sales data
    const salesAggregation = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);


    const salesSummary = salesAggregation[0] || {
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0
    };


    // Top selling items
    let topSellingItems = [];
    try {

      // First, test basic aggregation without lookup
      const basicItems = await Sale.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.menuItemId',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        }
      ]);


      topSellingItems = await Sale.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.menuItemId',
            quantity: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
          }
        },
        {
          $addFields: {
            menuItemObjectId: { $toObjectId: '$_id' }
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
        { $unwind: { path: '$menuItem', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ['$menuItem.name', 'Unknown Menu Item'] },
            quantity: 1,
            revenue: 1
          }
        },
        { $sort: { quantity: -1 } },
        { $limit: 10 }
      ]);

    } catch (error) {
      console.error('🔍 Error in top selling items aggregation:', error);
    }

    // Sales by booth
    let salesByBooth = [];
    try {
      salesByBooth = await Sale.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$boothId',
            sales: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        {
          $addFields: {
            boothObjectId: { $toObjectId: '$_id' }
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
        { $unwind: { path: '$booth', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            boothName: { $ifNull: ['$booth.name', 'Unknown Booth'] },
            sales: 1,
            orders: 1,
            profit: { $multiply: ['$sales', 0.3] } // Simplified profit calculation
          }
        },
        { $sort: { sales: -1 } }
      ]);

    } catch (error) {
      console.error('🔍 Error in sales by booth aggregation:', error);
    }

    // Daily sales
    const dailySales = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          sales: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          sales: 1,
          orders: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Calculate total cost and profit (simplified)
    const menuItems = await MenuItem.find({
      brandId: payload.user.brandId
    }).populate('ingredients.ingredientId', 'costPerUnit');

    let totalCost = 0;
    const sales = await Sale.find(matchQuery);

    for (const sale of sales) {
      for (const item of sale.items) {
        const menuItem = menuItems.find(m => m._id.toString() === item.menuItemId.toString());
        if (menuItem) {
          // Simplified cost calculation
          const itemCost = menuItem.ingredients.reduce((cost: number, ing: { ingredientId: { costPerUnit: number }; quantity: number }) => {
            const ingredient = ing.ingredientId;
            return cost + (ingredient.costPerUnit * ing.quantity);
          }, 0);
          totalCost += itemCost * item.quantity;
        }
      }
    }

    const totalProfit = salesSummary.totalSales - totalCost;

    return NextResponse.json({
      totalSales: salesSummary.totalSales,
      totalCost,
      totalProfit,
      totalOrders: salesSummary.totalOrders,
      averageOrderValue: salesSummary.averageOrderValue || 0,
      topSellingItems,
      salesByBooth,
      dailySales
    });
  } catch (error) {
    console.error('Error fetching sales report:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
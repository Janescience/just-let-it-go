import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import Booth from '@/lib/models/Booth';
import MenuItem from '@/lib/models/MenuItem';

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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const requestedBoothId = searchParams.get('boothId');

    let boothId = null;
    let boothDetails = null;

    // Get booth info based on user role
    if (payload.user.role === 'staff') {
      boothId = payload.user.boothId;
      if (!boothId) {
        return NextResponse.json(
          { message: 'ไม่พบข้อมูลหน้าร้านของพนักงาน' },
          { status: 400 }
        );
      }

      boothDetails = await Booth.findById(boothId)
        .populate('menuItems', 'name price')
        .select('name location startDate endDate openingHours staff employees');
    } else if (payload.user.role === 'admin' && requestedBoothId) {
      // Admin requesting specific booth's sales data
      boothId = requestedBoothId;

      boothDetails = await Booth.findById(boothId)
        .populate('menuItems', 'name price')
        .select('name location startDate endDate openingHours staff employees');

      if (!boothDetails) {
        return NextResponse.json(
          { message: 'ไม่พบข้อมูลหน้าร้าน' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { message: 'ไม่มีสิทธิ์เข้าดูข้อมูลการขาย' },
        { status: 403 }
      );
    }

    // Get URL parameters for filtering
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const date = url.searchParams.get('date'); // YYYY-MM-DD format

    const skip = (page - 1) * limit;

    // Build query for sales
    let salesQuery: any = { boothId };

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      salesQuery.createdAt = {
        $gte: startDate,
        $lt: endDate
      };
    }

    // Get sales history with pagination
    const salesHistory = await Sale.find(salesQuery)
      .populate('items.menuItemId', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip);
      // .limit(limit);

    // Get total count for pagination
    const totalSales = await Sale.countDocuments(salesQuery);

    // Get today's sales summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySalesQuery = {
      boothId,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    };

    const todaySales = await Sale.find(todaySalesQuery);

    // Calculate summary statistics
    const summary = {
      totalSales: 0,
      cashSales: 0,
      transferSales: 0,
      totalTransactions: todaySales.length,
      cashTransactions: 0,
      transferTransactions: 0,
      menuStats: {} as { [key: string]: { name: string; quantity: number; revenue: number } }
    };

    todaySales.forEach(sale => {
      summary.totalSales += sale.totalAmount;

      if (sale.paymentMethod === 'cash') {
        summary.cashSales += sale.totalAmount;
        summary.cashTransactions++;
      } else if (sale.paymentMethod === 'transfer') {
        summary.transferSales += sale.totalAmount;
        summary.transferTransactions++;
      }

      // Calculate menu statistics
      sale.items.forEach((item: { menuItemId: any; quantity: number; price: number }) => {
        const menuId = item.menuItemId.toString();
        if (!summary.menuStats[menuId]) {
          summary.menuStats[menuId] = {
            name: '',
            quantity: 0,
            revenue: 0
          };
        }
        summary.menuStats[menuId].quantity += item.quantity;
        summary.menuStats[menuId].revenue += item.price * item.quantity;
      });
    });

    // Get menu item names for statistics
    const menuIds = Object.keys(summary.menuStats);
    if (menuIds.length > 0) {
      const menuItems = await MenuItem.find({ _id: { $in: menuIds } }).select('name');
      menuItems.forEach(menu => {
        const menuId = menu._id.toString();
        if (summary.menuStats[menuId]) {
          summary.menuStats[menuId].name = menu.name;
        }
      });
    }

    // Convert menuStats object to array and sort by revenue
    const menuStatsArray = Object.values(summary.menuStats)
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      boothDetails,
      summary: {
        ...summary,
        menuStats: menuStatsArray
      },
      salesHistory,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalSales / limit),
        totalSales,
        hasNext: page * limit < totalSales,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
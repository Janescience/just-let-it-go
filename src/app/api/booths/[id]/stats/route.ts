import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import Booth from '@/lib/models/Booth';
import Ingredient from '@/lib/models/Ingredient';
import  '@/lib/models/MenuItem';

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

    if (payload.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;
    const boothId = id;

    // Get booth details with menu items and their ingredients
    const booth = await Booth.findById(boothId)
      .populate({
        path: 'menuItems',
        select: 'name price ingredients',
        populate: {
          path: 'ingredients.ingredientId',
          select: 'name costPerUnit unit'
        }
      });

    // Manually populate booth stock ingredients
    if (booth && booth.boothStock && booth.boothStock.length > 0) {
      const ingredientIds = booth.boothStock.map((stock: any) => stock.ingredientId);
      const ingredients = await Ingredient.find({ _id: { $in: ingredientIds } });

      booth.boothStock.forEach((stock: any) => {
        const ingredient = ingredients.find(ing => ing._id.toString() === stock.ingredientId.toString());
        if (ingredient) {
          stock.ingredientId = ingredient;
        }
      });
    }

    if (!booth) {
      return NextResponse.json(
        { message: 'ไม่พบหน้าร้าน' },
        { status: 404 }
      );
    }

    // Calculate total costs (Fixed costs only - rent + employee salaries based on actual working days)
    const boothStartDate = new Date(booth.startDate);
    const boothEndDate = new Date(booth.endDate);
    const totalDays = Math.ceil((boothEndDate.getTime() - boothStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Assuming salary is monthly, convert to daily
    const monthlyEmployeeSalary = booth.employees.reduce((sum: number, emp: { salary?: number }) => sum + (emp.salary || 0), 0);
    const dailyEmployeeSalary = monthlyEmployeeSalary / 30; // Convert monthly to daily
    const totalEmployeeSalary = dailyEmployeeSalary * totalDays;
    const fixedCosts = booth.rentCost + totalEmployeeSalary;

    // Get sales data with menu items and their ingredients for COGS calculation
    const sales = await Sale.find({ boothId })
      .populate({
        path: 'items.menuItemId',
        select: 'name price ingredients',
        populate: {
          path: 'ingredients.ingredientId',
          select: 'name costPerUnit unit'
        }
      });

    // Calculate total sales and COGS
    let totalSales = 0;
    let totalCOGS = 0;

    sales.forEach(sale => {
      totalSales += sale.totalAmount;

      // Calculate COGS for this sale
      sale.items.forEach((item: { menuItemId: any; quantity: number; price: number }) => {
        const menuItem = item.menuItemId;
        if (menuItem && menuItem.ingredients) {
          const itemCOGS = menuItem.ingredients.reduce((cost: number, ing: any) => {
            return cost + (ing.quantity * (ing.ingredientId?.costPerUnit || 0));
          }, 0);
          totalCOGS += itemCOGS * item.quantity;
        }
      });
    });

    // Calculate profit/loss including COGS
    const totalCosts = fixedCosts + totalCOGS;
    const profit = totalSales - totalCosts;
    const breakEvenPercentage = totalCosts > 0 ? (totalSales / totalCosts) * 100 : 0;

    // Get menu items sales statistics
    const menuStats: { [key: string]: { name: string; quantity: number; revenue: number } } = {};

    sales.forEach(sale => {
      sale.items.forEach((item: { menuItemId: { _id: any; name: string }; quantity: number; price: number }) => {
        const menuId = item.menuItemId._id.toString();
        if (!menuStats[menuId]) {
          menuStats[menuId] = {
            name: item.menuItemId.name,
            quantity: 0,
            revenue: 0
          };
        }
        menuStats[menuId].quantity += item.quantity;
        menuStats[menuId].revenue += item.price * item.quantity;
      });
    });

    const menuStatsArray = Object.values(menuStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5); // Top 5 selling items

    // Get top selling item
    const topSellingItem = menuStatsArray.length > 0 ? {
      name: menuStatsArray[0].name,
      quantity: menuStatsArray[0].quantity
    } : null;

    // Calculate daily average
    const currentDate = new Date();
    const endDateForCalculation = currentDate < boothEndDate ? currentDate : boothEndDate;
    const daysRunning = Math.max(1, Math.ceil((endDateForCalculation.getTime() - boothStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const dailyAverage = totalSales / daysRunning;

    // Calculate today's sales
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todaySales = sales
      .filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= todayStart && saleDate <= todayEnd;
      })
      .reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Calculate low stock count from booth stock
    let lowStockCount = 0;
    const lowStockItems: string[] = [];

    if (booth.boothStock && booth.boothStock.length > 0) {
      booth.boothStock.forEach((stock: any) => {
        const ingredient = stock.ingredientId;
        const remaining = stock.remainingQuantity;
        const allocated = stock.allocatedQuantity;

        // Consider low stock if remaining is less than 20% of allocated or less than minimum stock
        const lowStockThreshold = Math.max(
          allocated * 0.2, // 20% of allocated
          ingredient?.minimumStock || 0 // Or minimum stock from ingredient
        );

        if (remaining <= lowStockThreshold && remaining >= 0) {
          lowStockCount++;
          lowStockItems.push(ingredient?.name || 'Unknown');
        }
      });
    }

    // Add business plan break-even data for comparison
    const businessPlanBreakEven = booth.businessPlan?.breakEven || null;
    const plannedBreakEvenRevenue = businessPlanBreakEven?.revenueNeeded || 0;
    const plannedBreakEvenUnits = businessPlanBreakEven?.unitsNeeded || 0;

    // Calculate progress towards planned break-even
    const plannedBreakEvenProgress = plannedBreakEvenRevenue > 0 ?
      (totalSales / plannedBreakEvenRevenue) * 100 : 0;

    return NextResponse.json({
      booth: {
        ...booth.toObject(),
        fixedCosts,
        totalCOGS,
        totalCosts,
        totalSales,
        profit,
        breakEvenPercentage,
        dailyAverage,
        daysRunning,
        menuStats: menuStatsArray,
        isBreakEven: totalSales >= totalCosts,
        remainingToBreakEven: Math.max(0, totalCosts - totalSales),
        // Planned break-even remaining (prioritize this over actual costs)
        remainingToPlannedBreakEven: Math.max(0, plannedBreakEvenRevenue - totalSales),
        // Business plan comparison
        plannedBreakEven: {
          revenue: plannedBreakEvenRevenue,
          units: plannedBreakEvenUnits,
          progress: plannedBreakEvenProgress,
          isAchieved: totalSales >= plannedBreakEvenRevenue
        },
        // New fields for BoothCard
        topSellingItem,
        lowStockCount,
        lowStockItems,
        todaySales
      }
    });
  } catch (error) {
    console.error('Error fetching booth stats:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
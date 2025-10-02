import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
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

    // Get ingredients with low stock for this brand only
    const lowStockIngredients = await IngredientModel.find({
      brandId: payload.user.brandId,
      $expr: { $lte: ['$stock', '$minimumStock'] }
    }).select('name unit stock minimumStock costPerUnit');

    // Calculate alerts with different severity levels
    const alerts = lowStockIngredients.map(ingredient => {
      const stockRatio = ingredient.stock / ingredient.minimumStock;
      let severity: 'critical' | 'warning' | 'low' = 'low';

      if (ingredient.stock === 0) {
        severity = 'critical';
      } else if (stockRatio <= 0.5) {
        severity = 'critical';
      } else if (stockRatio <= 1) {
        severity = 'warning';
      }

      return {
        _id: ingredient._id.toString(),
        name: ingredient.name,
        unit: ingredient.unit,
        currentStock: ingredient.stock,
        minimumStock: ingredient.minimumStock,
        costPerUnit: ingredient.costPerUnit,
        severity,
        stockRatio
      };
    });

    // Sort by severity (critical first, then warning, then low)
    const sortedAlerts = alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.stockRatio - b.stockRatio; // Within same severity, sort by stock ratio
    });

    const response = NextResponse.json(sortedAlerts);
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch inventory alerts' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
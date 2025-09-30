import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import IngredientModel from '@/lib/models/Ingredient';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get all ingredients with low stock (stock <= minimumStock)
    const lowStockIngredients = await IngredientModel.find({
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

    return NextResponse.json(sortedAlerts);
  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory alerts' },
      { status: 500 }
    );
  }
}
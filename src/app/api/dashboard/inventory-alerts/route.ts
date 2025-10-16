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

    const sortedAlerts = await IngredientModel.aggregate([
      {
        $match: {
          brandId: payload.user.brandId,
          $expr: { $lte: ['$stock', '$minimumStock'] }
        }
      },
      {
        $project: {
          name: 1,
          unit: 1,
          stock: 1,
          minimumStock: 1,
          costPerUnit: 1,
          stockRatio: {
            $cond: [
              { $gt: ['$minimumStock', 0] },
              { $divide: ['$stock', '$minimumStock'] },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          severity: {
            $switch: {
              branches: [
                { case: { $eq: ['$stock', 0] }, then: 'critical' },
                { case: { $lte: ['$stockRatio', 0.5] }, then: 'critical' },
                { case: { $lte: ['$stockRatio', 1] }, then: 'warning' }
              ],
              default: 'low'
            }
          }
        }
      },
      {
        $addFields: {
          severityOrder: {
            $switch: {
              branches: [
                { case: { $eq: ['$severity', 'critical'] }, then: 0 },
                { case: { $eq: ['$severity', 'warning'] }, then: 1 }
              ],
              default: 2
            }
          }
        }
      },
      {
        $sort: { severityOrder: 1, stockRatio: 1 }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          unit: 1,
          currentStock: '$stock',
          minimumStock: 1,
          costPerUnit: 1,
          severity: 1,
          stockRatio: 1
        }
      }
    ]);

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
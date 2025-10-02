import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Brand from '@/lib/models/Brand';
import User from '@/lib/models/User';
import Booth from '@/lib/models/Booth';
import Sale from '@/lib/models/Sale';
import { verifyToken } from '@/utils/auth';
import { addSecurityHeaders } from '@/utils/security';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Check authentication and authorization
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      const response = NextResponse.json(
        { message: 'ไม่มีสิทธิ์ในการเข้าถึง' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user || payload.user.role !== 'super_admin') {
      const response = NextResponse.json(
        { message: 'ไม่มีสิทธิ์ในการเข้าถึง' },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Get all brands with statistics
    const brands = await Brand.find({}).sort({ createdAt: -1 });

    // Debug: Check booth and sale data
    console.log('=== DEBUGGING SUPER ADMIN BRANDS ===');
    const totalBooths = await Booth.countDocuments({});
    const totalSales = await Sale.countDocuments({});
    console.log(`Total booths in system: ${totalBooths}`);
    console.log(`Total sales in system: ${totalSales}`);

    const brandsWithStats = await Promise.all(
      brands.map(async (brand) => {
        // Get booth statistics
        const totalBooths = await Booth.countDocuments({ brandId: brand._id });
        const activeBooths = await Booth.countDocuments({
          brandId: brand._id,
          isActive: true
        });

        // Debug booth data for this brand
        const boothsForBrand = await Booth.find({ brandId: brand._id }).select('_id name brandId');
        console.log(`\nBooths for brand ${brand.name}:`, boothsForBrand.map(b => ({
          id: b._id,
          name: b.name,
          brandId: b.brandId
        })));

        // Get user count
        const totalUsers = await User.countDocuments({
          brandId: brand._id,
          isActive: true
        });

        // Get total sales amount
        const salesPipeline = [
          {
            $addFields: {
              boothObjectId: { $toObjectId: '$boothId' }
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
          {
            $unwind: '$booth'
          },
          {
            $match: {
              'booth.brandId': brand._id.toString()
            }
          },
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$totalAmount' }
            }
          }
        ];

        const salesResult = await Sale.aggregate(salesPipeline);

        // Debug: Check sales for this brand's booths
        const boothIds = boothsForBrand.map(b => (b._id as any).toString());
        const salesForBooths = await Sale.find({ boothId: { $in: boothIds } }).select('boothId totalAmount');
        console.log(`Sales for brand ${brand.name} booths:`, salesForBooths.map(s => ({
          boothId: s.boothId,
          totalAmount: s.totalAmount
        })));

        // Debug logging
        console.log(`Brand: ${brand.name} (${brand._id})`);
        console.log('Sales pipeline result:', salesResult);

        const totalSales = salesResult.length > 0 ? salesResult[0].totalSales : 0;
        console.log(`Total sales for ${brand.name}: ${totalSales}`);

        // Get last activity (most recent sale)
        const lastSalePipeline = [
          {
            $addFields: {
              boothObjectId: { $toObjectId: '$boothId' }
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
          {
            $unwind: '$booth'
          },
          {
            $match: {
              'booth.brandId': brand._id.toString()
            }
          },
          {
            $sort: { createdAt: -1 as const }
          },
          {
            $limit: 1
          }
        ];

        const lastSaleResult = await Sale.aggregate(lastSalePipeline);
        const lastActivity = lastSaleResult.length > 0
          ? lastSaleResult[0].createdAt.toISOString()
          : brand.createdAt.toISOString();

        return {
          ...brand.toObject(),
          stats: {
            totalBooths,
            activeBooths,
            totalUsers,
            totalSales,
            lastActivity
          }
        };
      })
    );

    const response = NextResponse.json({
      brands: brandsWithStats
    });

    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Super admin brands error:', error);
    const response = NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
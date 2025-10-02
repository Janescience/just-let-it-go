import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BoothModel from '@/lib/models/Booth';
import SaleModel from '@/lib/models/Sale';
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

    // Get active booths for this brand only
    const activeBooths = await BoothModel.find({
      brandId: payload.user.brandId,
      isActive: true
    }, { _id: 1, name: 1 });
    const activeBoothIds = activeBooths.map(booth => (booth._id as any).toString());


    // Use Thailand timezone for final result
    const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isProduction = process.env.NODE_ENV === 'production';

    const boothDates = await SaleModel.aggregate([
      {
        $match: {
          boothId: { $in: activeBoothIds }
        }
      },
      {
        $group: {
          _id: {
            boothId: '$boothId',
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: serverTimezone === 'Asia/Bangkok' && !isProduction
                  ? "$createdAt"  // Local: use original time
                  : { $dateAdd: { startDate: "$createdAt", unit: "hour", amount: 7 } } // Vercel: add 7 hours
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.boothId',
          dates: { $push: '$_id.date' }
        }
      },
      {
        $lookup: {
          from: 'booths',
          let: { boothId: { $toObjectId: '$_id' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$boothId'] } } },
            { $project: { name: 1 } }
          ],
          as: 'booth'
        }
      },
      {
        $unwind: '$booth'
      },
      {
        $project: {
          boothId: '$_id',
          boothName: '$booth.name',
          dates: { $sortArray: { input: '$dates', sortBy: 1 } }
        }
      },
      {
        $sort: { boothName: 1 }
      }
    ]);

    const response = NextResponse.json(boothDates);
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('Error fetching booth dates:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch booth dates' },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}
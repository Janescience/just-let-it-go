import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import BoothModel from '@/lib/models/Booth';
import SaleModel from '@/lib/models/Sale';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get active booths
    const activeBooths = await BoothModel.find({ isActive: true }, { _id: 1, name: 1 });
    const activeBoothIds = activeBooths.map(booth => (booth._id as any).toString());


    // Use Thailand timezone for final result
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
                date: { $dateAdd: { startDate: "$createdAt", unit: "hour", amount: 7 } }
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

    return NextResponse.json(boothDates);
  } catch (error) {
    console.error('Error fetching booth dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booth dates' },
      { status: 500 }
    );
  }
}
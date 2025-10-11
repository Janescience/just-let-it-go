import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import Booth from '@/lib/models/Booth';

/**
 * API to detect sales that occurred outside booth operating hours
 * These are likely UTC timestamps that need timezone correction
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.user || payload.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    await connectDB();

    // Get all sales with their booth information
    const sales = await Sale.find({})
      .populate({
        path: 'boothId',
        select: 'name openingHours startDate endDate'
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const suspiciousSales = [];

    for (const sale of sales) {
      if (!sale.boothId || typeof sale.boothId !== 'object') continue;

      const booth = sale.boothId as any;
      const saleTime = new Date(sale.createdAt);

      // Extract hour and minute from sale time
      const saleHour = saleTime.getUTCHours();
      const saleMinute = saleTime.getUTCMinutes();
      const saleTimeMinutes = saleHour * 60 + saleMinute;

      // Parse booth opening hours (format: "HH:mm")
      const [openHour, openMinute] = booth.openingHours.start.split(':').map(Number);
      const [closeHour, closeMinute] = booth.openingHours.end.split(':').map(Number);

      const openTimeMinutes = openHour * 60 + openMinute;
      const closeTimeMinutes = closeHour * 60 + closeMinute;

      // Check if sale time is outside operating hours
      let isOutsideHours = false;

      if (closeTimeMinutes > openTimeMinutes) {
        // Normal hours (e.g., 09:00 - 18:00)
        isOutsideHours = saleTimeMinutes < openTimeMinutes || saleTimeMinutes > closeTimeMinutes;
      } else {
        // Overnight hours (e.g., 18:00 - 02:00)
        isOutsideHours = saleTimeMinutes < openTimeMinutes && saleTimeMinutes > closeTimeMinutes;
      }

      if (isOutsideHours) {
        // Calculate what the time would be if we correct timezone (+7 hours)
        const correctedTime = new Date(saleTime.getTime() + (7 * 60 * 60 * 1000));
        const correctedHour = correctedTime.getUTCHours();
        const correctedMinute = correctedTime.getUTCMinutes();
        const correctedTimeMinutes = correctedHour * 60 + correctedMinute;

        // Check if corrected time would be within operating hours
        let wouldBeInsideHours = false;
        if (closeTimeMinutes > openTimeMinutes) {
          wouldBeInsideHours = correctedTimeMinutes >= openTimeMinutes && correctedTimeMinutes <= closeTimeMinutes;
        } else {
          wouldBeInsideHours = correctedTimeMinutes >= openTimeMinutes || correctedTimeMinutes <= closeTimeMinutes;
        }

        suspiciousSales.push({
          _id: sale._id,
          boothId: booth._id,
          boothName: booth.name,
          totalAmount: sale.totalAmount,
          originalTime: saleTime.toISOString(),
          originalTimeDisplay: `${String(saleHour).padStart(2, '0')}:${String(saleMinute).padStart(2, '0')}`,
          correctedTime: correctedTime.toISOString(),
          correctedTimeDisplay: `${String(correctedHour).padStart(2, '0')}:${String(correctedMinute).padStart(2, '0')}`,
          boothHours: `${booth.openingHours.start} - ${booth.openingHours.end}`,
          wouldBeInsideHours,
          recommendCorrection: wouldBeInsideHours
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalSalesChecked: sales.length,
      suspiciousCount: suspiciousSales.length,
      suspiciousSales: suspiciousSales.sort((a, b) =>
        // Sort by recommendation first, then by time
        (b.recommendCorrection ? 1 : 0) - (a.recommendCorrection ? 1 : 0) ||
        new Date(b.originalTime).getTime() - new Date(a.originalTime).getTime()
      )
    });

  } catch (error) {
    console.error('Error detecting suspicious sales:', error);
    return NextResponse.json(
      { error: 'Failed to detect suspicious sales', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Fix selected suspicious sales by applying timezone correction
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.user || payload.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const { saleIds, dryRun = true } = await request.json();

    if (!saleIds || !Array.isArray(saleIds)) {
      return NextResponse.json({
        error: 'saleIds array required'
      }, { status: 400 });
    }

    await connectDB();

    const results = {
      dryRun,
      corrected: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const saleId of saleIds) {
      try {
        const sale = await Sale.findById(saleId);
        if (!sale) {
          results.errors++;
          results.details.push({
            saleId,
            error: 'Sale not found'
          });
          continue;
        }

        const originalTime = new Date(sale.createdAt);
        const correctedTime = new Date(originalTime.getTime() + (7 * 60 * 60 * 1000));

        if (!dryRun) {
          sale.createdAt = correctedTime;
          sale.updatedAt = correctedTime;
          await sale.save();
        }

        results.corrected++;
        results.details.push({
          saleId,
          originalTime: originalTime.toISOString(),
          correctedTime: correctedTime.toISOString(),
          applied: !dryRun
        });

      } catch (error) {
        results.errors++;
        results.details.push({
          saleId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? 'Dry run completed - no data was modified'
        : 'Timezone correction applied',
      results
    });

  } catch (error) {
    console.error('Error correcting suspicious sales:', error);
    return NextResponse.json(
      { error: 'Failed to correct sales', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
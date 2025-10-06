import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import ErrorLog from '@/lib/models/ErrorLog';
import { resolveError } from '@/utils/errorLogger';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.user || (payload.user.role !== 'super_admin' && payload.user.role !== 'admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const level = searchParams.get('level');
    const module = searchParams.get('module');
    const resolved = searchParams.get('resolved');
    const brandId = searchParams.get('brandId');

    // Build query
    const query: any = {};

    // Filter by brand for non-super-admin users
    if (payload.user.role !== 'super_admin') {
      query['context.brandId'] = payload.user.brandId || payload.user.currentBrandId;
    } else if (brandId) {
      query['context.brandId'] = brandId;
    }

    if (level) {
      query.level = level;
    }

    if (module) {
      query['context.module'] = module;
    }

    if (resolved !== null && resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get error logs with pagination
    const [errorLogs, total] = await Promise.all([
      ErrorLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ErrorLog.countDocuments(query)
    ]);

    // Get summary statistics
    const summaryPipeline = [
      { $match: payload.user.role !== 'super_admin' ? { 'context.brandId': payload.user.brandId || payload.user.currentBrandId } : {} },
      {
        $group: {
          _id: null,
          totalErrors: { $sum: 1 },
          unresolvedErrors: { $sum: { $cond: [{ $eq: ['$resolved', false] }, 1, 0] } },
          errorsByLevel: {
            $push: {
              level: '$level',
              resolved: '$resolved'
            }
          },
          errorsByModule: {
            $push: {
              module: '$context.module',
              resolved: '$resolved'
            }
          }
        }
      }
    ];

    const [summary] = await ErrorLog.aggregate(summaryPipeline);

    // Process summary statistics
    const stats = {
      total: summary?.totalErrors || 0,
      unresolved: summary?.unresolvedErrors || 0,
      resolved: (summary?.totalErrors || 0) - (summary?.unresolvedErrors || 0),
      byLevel: {},
      byModule: {}
    };

    // Count by level
    if (summary?.errorsByLevel) {
      for (const item of summary.errorsByLevel) {
        if (!stats.byLevel[item.level]) {
          stats.byLevel[item.level] = { total: 0, unresolved: 0 };
        }
        stats.byLevel[item.level].total++;
        if (!item.resolved) {
          stats.byLevel[item.level].unresolved++;
        }
      }
    }

    // Count by module
    if (summary?.errorsByModule) {
      for (const item of summary.errorsByModule) {
        if (!stats.byModule[item.module]) {
          stats.byModule[item.module] = { total: 0, unresolved: 0 };
        }
        stats.byModule[item.module].total++;
        if (!item.resolved) {
          stats.byModule[item.module].unresolved++;
        }
      }
    }

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        errorLogs,
        pagination: {
          current: page,
          total: totalPages,
          limit,
          totalRecords: total,
          hasNext: hasNextPage,
          hasPrev: hasPrevPage
        },
        statistics: stats,
        filters: {
          level,
          module,
          resolved,
          brandId
        }
      }
    });

  } catch (error) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload?.user || (payload.user.role !== 'super_admin' && payload.user.role !== 'admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { errorIds, action, notes } = await request.json();

    if (!errorIds || !Array.isArray(errorIds) || errorIds.length === 0) {
      return NextResponse.json({ error: 'Error IDs required' }, { status: 400 });
    }

    if (action !== 'resolve' && action !== 'unresolve') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await connectDB();

    const results = [];
    const errors = [];

    for (const errorId of errorIds) {
      try {
        if (action === 'resolve') {
          await resolveError(
            errorId,
            `${payload.user.name || payload.user.username} (${payload.user.role})`,
            notes
          );
        } else {
          // Unresolve error
          await ErrorLog.findByIdAndUpdate(errorId, {
            resolved: false,
            resolvedAt: null,
            resolvedBy: null,
            notes: notes || null
          });
        }
        results.push({ errorId, success: true });
      } catch (error) {
        console.error(`Error ${action}ing error ${errorId}:`, error);
        errors.push({ errorId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${action === 'resolve' ? 'Resolved' : 'Unresolved'} ${results.length} error(s)`,
      results,
      errors
    });

  } catch (error) {
    console.error('Error updating error logs:', error);
    return NextResponse.json(
      { error: 'Failed to update error logs' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const olderThan = searchParams.get('olderThan'); // Number of days
    const resolved = searchParams.get('resolved'); // 'true' to delete only resolved errors

    await connectDB();

    const query: any = {};

    if (olderThan) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));
      query.createdAt = { $lt: cutoffDate };
    }

    if (resolved === 'true') {
      query.resolved = true;
    }

    const result = await ErrorLog.deleteMany(query);

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} error log(s)`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error deleting error logs:', error);
    return NextResponse.json(
      { error: 'Failed to delete error logs' },
      { status: 500 }
    );
  }
}
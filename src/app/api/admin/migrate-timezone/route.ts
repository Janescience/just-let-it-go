import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import StockMovement from '@/lib/models/StockMovement';
import { migrateUtcToThailand } from '@/utils/timezone';

/**
 * Migration API to fix timezone issues for existing data
 * This should be run once after deploying the timezone fixes
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

    const { collections, dryRun = true } = await request.json();

    if (!collections || !Array.isArray(collections)) {
      return NextResponse.json({
        error: 'collections array required. Supported: ["sales", "accounting", "stock"]'
      }, { status: 400 });
    }

    await connectDB();

    const results = {
      dryRun,
      migrations: [] as any[],
      summary: {
        totalRecords: 0,
        updatedRecords: 0,
        errors: 0
      }
    };

    // Migrate Sales
    if (collections.includes('sales')) {
      try {
        const sales = await Sale.find({
          createdAt: { $exists: true }
        }).limit(dryRun ? 100 : 10000);

        const migrationData = {
          collection: 'sales',
          totalRecords: sales.length,
          updatedRecords: 0,
          errors: 0,
          sampleChanges: [] as any[]
        };

        for (const sale of sales) {
          try {
            const originalDate = new Date(sale.createdAt);
            const migratedDate = migrateUtcToThailand(originalDate);

            // Check if date needs migration (if it's significantly different)
            const timeDiff = Math.abs(migratedDate.getTime() - originalDate.getTime());
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff >= 6) { // Likely UTC data that needs migration
              if (migrationData.sampleChanges.length < 5) {
                migrationData.sampleChanges.push({
                  id: sale._id,
                  before: originalDate.toISOString(),
                  after: migratedDate.toISOString(),
                  diff: `${hoursDiff.toFixed(1)} hours`
                });
              }

              if (!dryRun) {
                sale.createdAt = migratedDate;
                sale.updatedAt = migratedDate;
                await sale.save();
              }
              migrationData.updatedRecords++;
            }
          } catch (error) {
            migrationData.errors++;
            console.error(`Error migrating sale ${sale._id}:`, error);
          }
        }

        results.migrations.push(migrationData);
        results.summary.totalRecords += migrationData.totalRecords;
        results.summary.updatedRecords += migrationData.updatedRecords;
        results.summary.errors += migrationData.errors;
      } catch (error) {
        console.error('Error migrating sales:', error);
        results.migrations.push({
          collection: 'sales',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Migrate Accounting Transactions
    if (collections.includes('accounting')) {
      try {
        const transactions = await AccountingTransaction.find({
          date: { $exists: true }
        }).limit(dryRun ? 100 : 10000);

        const migrationData = {
          collection: 'accounting',
          totalRecords: transactions.length,
          updatedRecords: 0,
          errors: 0,
          sampleChanges: [] as any[]
        };

        for (const transaction of transactions) {
          try {
            const originalDate = new Date(transaction.date);
            const migratedDate = migrateUtcToThailand(originalDate);

            const timeDiff = Math.abs(migratedDate.getTime() - originalDate.getTime());
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff >= 6) {
              if (migrationData.sampleChanges.length < 5) {
                migrationData.sampleChanges.push({
                  id: transaction._id,
                  before: originalDate.toISOString(),
                  after: migratedDate.toISOString(),
                  diff: `${hoursDiff.toFixed(1)} hours`
                });
              }

              if (!dryRun) {
                transaction.date = migratedDate;
                await transaction.save();
              }
              migrationData.updatedRecords++;
            }
          } catch (error) {
            migrationData.errors++;
            console.error(`Error migrating transaction ${transaction._id}:`, error);
          }
        }

        results.migrations.push(migrationData);
        results.summary.totalRecords += migrationData.totalRecords;
        results.summary.updatedRecords += migrationData.updatedRecords;
        results.summary.errors += migrationData.errors;
      } catch (error) {
        console.error('Error migrating accounting:', error);
        results.migrations.push({
          collection: 'accounting',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Migrate Stock Movements
    if (collections.includes('stock')) {
      try {
        const movements = await StockMovement.find({
          createdAt: { $exists: true }
        }).limit(dryRun ? 100 : 10000);

        const migrationData = {
          collection: 'stock',
          totalRecords: movements.length,
          updatedRecords: 0,
          errors: 0,
          sampleChanges: [] as any[]
        };

        for (const movement of movements) {
          try {
            const originalDate = new Date(movement.createdAt);
            const migratedDate = migrateUtcToThailand(originalDate);

            const timeDiff = Math.abs(migratedDate.getTime() - originalDate.getTime());
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff >= 6) {
              if (migrationData.sampleChanges.length < 5) {
                migrationData.sampleChanges.push({
                  id: movement._id,
                  before: originalDate.toISOString(),
                  after: migratedDate.toISOString(),
                  diff: `${hoursDiff.toFixed(1)} hours`
                });
              }

              if (!dryRun) {
                movement.createdAt = migratedDate;
                await movement.save();
              }
              migrationData.updatedRecords++;
            }
          } catch (error) {
            migrationData.errors++;
            console.error(`Error migrating movement ${movement._id}:`, error);
          }
        }

        results.migrations.push(migrationData);
        results.summary.totalRecords += migrationData.totalRecords;
        results.summary.updatedRecords += migrationData.updatedRecords;
        results.summary.errors += migrationData.errors;
      } catch (error) {
        console.error('Error migrating stock movements:', error);
        results.migrations.push({
          collection: 'stock',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? 'Dry run completed - no data was modified'
        : 'Migration completed',
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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

    await connectDB();

    // Get sample of data to check timezone issues
    const salesSample = await Sale.find({}).limit(5).select('createdAt');
    const accountingSample = await AccountingTransaction.find({}).limit(5).select('date');
    const stockSample = await StockMovement.find({}).limit(5).select('createdAt');

    const analysis = {
      currentServerTime: new Date().toISOString(),
      samples: {
        sales: salesSample.map(s => ({
          id: s._id,
          createdAt: s.createdAt?.toISOString(),
          migratedTime: migrateUtcToThailand(new Date(s.createdAt || '')).toISOString()
        })),
        accounting: accountingSample.map(a => ({
          id: a._id,
          date: a.date?.toISOString(),
          migratedTime: migrateUtcToThailand(new Date(a.date || '')).toISOString()
        })),
        stock: stockSample.map(s => ({
          id: s._id,
          createdAt: s.createdAt?.toISOString(),
          migratedTime: migrateUtcToThailand(new Date(s.createdAt || '')).toISOString()
        }))
      }
    };

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed' },
      { status: 500 }
    );
  }
}
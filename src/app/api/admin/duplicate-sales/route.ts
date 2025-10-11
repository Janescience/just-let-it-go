import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Sale from '@/lib/models/Sale';
import Booth from '@/lib/models/Booth';
import Brand from '@/lib/models/Brand';
import MenuItem from '@/lib/models/MenuItem';
import Ingredient from '@/lib/models/Ingredient';
import StockMovement from '@/lib/models/StockMovement';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import { logSystemError } from '@/utils/errorLogger';

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

    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '10'); // seconds - default 10 for stricter duplicate detection
    const minAmount = parseFloat(searchParams.get('minAmount') || '0');
    const maxAmount = parseFloat(searchParams.get('maxAmount') || '999999');
    const brandId = searchParams.get('brandId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // Base match stage
    const matchStage: any = {
      paymentStatus: 'completed',
      totalAmount: { $gte: minAmount, $lte: maxAmount }
    };

    if (Object.keys(dateFilter).length > 0) {
      matchStage.createdAt = dateFilter;
    }

    // Find potential duplicates using aggregation
    const duplicatePipeline = [
      { $match: matchStage },

      // Lookup booth and brand information
      {
        $lookup: {
          from: 'booths',
          let: { boothId: '$boothId' },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$boothId'] } } },
            { $project: { name: 1, brandId: 1 } }
          ],
          as: 'booth'
        }
      },

      // Filter by brand if specified
      ...(brandId ? [{ $match: { 'booth.0.brandId': brandId } }] : []),

      // Group by potential duplicate criteria
      {
        $group: {
          _id: {
            boothId: '$boothId',
            totalAmount: '$totalAmount',
            paymentMethod: '$paymentMethod',
            // Group by time window (convert to minutes for grouping)
            timeGroup: {
              $floor: {
                $divide: [
                  { $toLong: '$createdAt' },
                  timeWindow * 1000 // Convert to milliseconds
                ]
              }
            }
          },
          sales: {
            $push: {
              _id: '$_id',
              createdAt: '$createdAt',
              totalAmount: '$totalAmount',
              paymentMethod: '$paymentMethod',
              paymentStatus: '$paymentStatus',
              clientTransactionId: '$clientTransactionId',
              employeeId: '$employeeId',
              items: '$items',
              booth: { $arrayElemAt: ['$booth', 0] }
            }
          },
          count: { $sum: 1 }
        }
      },

      // Only include groups with more than 1 sale (potential duplicates)
      { $match: { count: { $gt: 1 } } },

      // Filter out groups where all time differences are > 10 seconds
      {
        $addFields: {
          hasCloseTimeDiff: {
            $anyElementTrue: {
              $map: {
                input: { $range: [1, { $size: '$sales' }] },
                as: 'i',
                in: {
                  $let: {
                    vars: {
                      timeDiff: {
                        $divide: [
                          {
                            $subtract: [
                              { $toLong: { $arrayElemAt: ['$sales.createdAt', '$$i'] } },
                              { $toLong: { $arrayElemAt: ['$sales.createdAt', 0] } }
                            ]
                          },
                          1000
                        ]
                      }
                    },
                    in: { $lte: ['$$timeDiff', 10] }
                  }
                }
              }
            }
          }
        }
      },
      { $match: { hasCloseTimeDiff: true } },

      // Calculate time differences within groups
      {
        $addFields: {
          salesWithTimeDiff: {
            $map: {
              input: { $range: [0, { $size: '$sales' }] },
              as: 'i',
              in: {
                $mergeObjects: [
                  { $arrayElemAt: ['$sales', '$$i'] },
                  {
                    timeDiffSeconds: {
                      $cond: {
                        if: { $eq: ['$$i', 0] },
                        then: 0,
                        else: {
                          $divide: [
                            {
                              $subtract: [
                                { $toLong: { $arrayElemAt: ['$sales.createdAt', '$$i'] } },
                                { $toLong: { $arrayElemAt: ['$sales.createdAt', 0] } }
                              ]
                            },
                            1000
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },

      // Sort by creation time descending
      { $sort: { '_id.timeGroup': -1 as const } },

      // Pagination
      { $skip: (page - 1) * limit },
      { $limit: limit },

      // Lookup brand information
      {
        $lookup: {
          from: 'brands',
          let: { brandId: '$salesWithTimeDiff.0.booth.brandId' },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$brandId'] } } },
            { $project: { name: 1 } }
          ],
          as: 'brand'
        }
      },

      // Add employee information lookup
      {
        $lookup: {
          from: 'users',
          let: {
            salesWithTimeDiff: '$salesWithTimeDiff'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [{ $toString: '$_id' }, '$$salesWithTimeDiff.employeeId']
                }
              }
            },
            { $project: { _id: 1, name: 1, username: 1 } }
          ],
          as: 'employees'
        }
      },

      // Merge employee data with sales
      {
        $addFields: {
          salesWithEmployee: {
            $map: {
              input: '$salesWithTimeDiff',
              as: 'sale',
              in: {
                $mergeObjects: [
                  '$$sale',
                  {
                    employeeInfo: {
                      $cond: {
                        if: { $ne: ['$$sale.employeeId', null] },
                        then: {
                          $let: {
                            vars: {
                              employee: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: '$employees',
                                      cond: { $eq: [{ $toString: '$$this._id' }, '$$sale.employeeId'] }
                                    }
                                  },
                                  0
                                ]
                              }
                            },
                            in: {
                              $cond: {
                                if: { $ne: ['$$employee', null] },
                                then: '$$employee.name',
                                else: '$$sale.employeeId'
                              }
                            }
                          }
                        },
                        else: 'ไม่ระบุ'
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    ];

    const [duplicateGroups, totalPipeline] = await Promise.all([
      Sale.aggregate(duplicatePipeline as any),
      Sale.aggregate([
        ...duplicatePipeline.slice(0, -3), // Remove pagination and lookups
        { $count: 'total' }
      ] as any)
    ]);

    const total = totalPipeline[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Get summary statistics
    const summaryPipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'booths',
          let: { boothId: '$boothId' },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$boothId'] } } },
            { $project: { brandId: 1 } }
          ],
          as: 'booth'
        }
      },
      ...(brandId ? [{ $match: { 'booth.0.brandId': brandId } }] : []),
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          avgAmount: { $avg: '$totalAmount' },
          brands: { $addToSet: '$booth.0.brandId' }
        }
      }
    ];

    const [summary] = await Sale.aggregate(summaryPipeline);

    return NextResponse.json({
      success: true,
      data: {
        duplicateGroups,
        pagination: {
          current: page,
          total: totalPages,
          limit,
          totalRecords: total,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        summary: {
          totalSales: summary?.totalSales || 0,
          totalAmount: summary?.totalAmount || 0,
          avgAmount: summary?.avgAmount || 0,
          affectedBrands: summary?.brands?.length || 0
        },
        filters: {
          timeWindow,
          minAmount,
          maxAmount,
          brandId,
          startDate,
          endDate
        }
      }
    });

  } catch (error) {
    console.error('Error finding duplicate sales:', error);

    // Log the error
    await logSystemError(
      'Failed to find duplicate sales',
      error,
      {
        function: 'findDuplicateSales',
        additionalData: {
          query: request.url
        }
      },
      request
    );

    return NextResponse.json(
      { error: 'Failed to find duplicate sales' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload?.user || payload.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
  }

  try {

    const { saleIds, reason } = await request.json();

    if (!saleIds || !Array.isArray(saleIds) || saleIds.length === 0) {
      return NextResponse.json({ error: 'Sale IDs required' }, { status: 400 });
    }

    await connectDB();

    const results = [];
    const errors = [];

    for (const saleId of saleIds) {
      try {
        // Get sale details before deletion for logging
        const sale = await Sale.findById(saleId)
          .populate('items.menuItemId', 'ingredients')
          .populate('boothId', 'name brandId');

        if (!sale) {
          errors.push({ saleId, error: 'Sale not found' });
          continue;
        }

        // Reverse all ingredient usage
        for (const item of sale.items) {
          const menuItem = await MenuItem.findById(item.menuItemId)
            .populate('ingredients.ingredientId');

          if (menuItem && menuItem.ingredients.length > 0) {
            for (const menuIngredient of menuItem.ingredients) {
              const ingredientId = menuIngredient.ingredientId._id;
              const totalUsed = menuIngredient.quantity * item.quantity;

              // Add back the used ingredients
              const ingredient = await Ingredient.findById(ingredientId);
              if (ingredient) {
                ingredient.stock += totalUsed;
                await ingredient.save();

                // Create stock movement record
                const stockMovement = new StockMovement({
                  ingredientId,
                  ingredientName: ingredient.name,
                  unit: ingredient.unit,
                  type: 'adjustment',
                  quantity: totalUsed,
                  cost: ingredient.costPerUnit,
                  reason: `ลบรายการขายซ้ำ ${sale._id} (Super Admin)`,
                  boothId: sale.boothId,
                  saleId: sale._id
                });

                await stockMovement.save();
              }
            }
          }
        }

        // Update booth stock
        const booth = await Booth.findById(sale.boothId);
        if (booth && booth.boothStock) {
          for (const item of sale.items) {
            const menuItem = await MenuItem.findById(item.menuItemId)
              .populate('ingredients.ingredientId');

            if (menuItem && menuItem.ingredients.length > 0) {
              for (const menuIngredient of menuItem.ingredients) {
                const ingredientId = menuIngredient.ingredientId._id.toString();
                const totalUsed = menuIngredient.quantity * item.quantity;

                const boothStockEntry = booth.boothStock.find(
                  (stock: any) => stock.ingredientId.toString() === ingredientId
                );

                if (boothStockEntry) {
                  boothStockEntry.usedQuantity -= totalUsed;
                  boothStockEntry.remainingQuantity = boothStockEntry.allocatedQuantity - boothStockEntry.usedQuantity;

                  // Ensure values don't go negative
                  if (boothStockEntry.usedQuantity < 0) {
                    boothStockEntry.usedQuantity = 0;
                    boothStockEntry.remainingQuantity = boothStockEntry.allocatedQuantity;
                  }
                }
              }
            }
          }

          await booth.save();
        }

        // Delete accounting transaction
        await AccountingTransaction.deleteMany({
          relatedId: sale._id,
          relatedType: 'sale'
        });

        // Delete stock movements related to this sale
        await StockMovement.deleteMany({
          saleId: sale._id
        });

        // Delete the sale
        await Sale.findByIdAndDelete(saleId);

        // Log the deletion
        await logSystemError(
          'Duplicate sale deleted by super admin',
          null,
          {
            function: 'deleteDuplicateSale',
            saleId: saleId,
            userId: payload.user.id,
            additionalData: {
              reason: reason || 'Duplicate sale removal',
              saleAmount: sale.totalAmount,
              saleDate: sale.createdAt,
              booth: sale.boothId?.name,
              brandId: sale.boothId?.brandId
            }
          },
          request
        );

        results.push({
          saleId,
          success: true,
          amount: sale.totalAmount,
          date: sale.createdAt
        });

      } catch (error) {
        console.error(`Error deleting sale ${saleId}:`, error);
        errors.push({
          saleId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${results.length} duplicate sale(s)`,
      results,
      errors,
      summary: {
        deleted: results.length,
        failed: errors.length,
        totalAmount: results.reduce((sum, r) => sum + r.amount, 0)
      }
    });

  } catch (error) {
    console.error('Error deleting duplicate sales:', error);

    await logSystemError(
      'Failed to delete duplicate sales',
      error,
      {
        function: 'deleteDuplicateSales',
        userId: payload?.user?.id
      },
      request
    );

    return NextResponse.json(
      { error: 'Failed to delete duplicate sales' },
      { status: 500 }
    );
  }
}
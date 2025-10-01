import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Booth from '@/lib/models/Booth';
import User from '@/lib/models/User';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
import Equipment from '@/lib/models/Equipment';

// Ensure models are registered
import '@/lib/models/MenuItem';
import '@/lib/models/Ingredient';
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user) {
      return NextResponse.json(
        { message: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if (payload.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    await connectDB();

    // Import models dynamically to ensure proper registration
    const [BoothModel, MenuItemModel, IngredientModel, UserModel] = await Promise.all([
      import('@/lib/models/Booth').then(m => m.default),
      import('@/lib/models/MenuItem').then(m => m.default),
      import('@/lib/models/Ingredient').then(m => m.default),
      import('@/lib/models/User').then(m => m.default),
    ]);

    let booths = await BoothModel.find({ brandId: payload.user.brandId })
      .populate('staff.userId', 'username name')
      .populate({
        path: 'menuItems',
        select: 'name price ingredients',
        populate: {
          path: 'ingredients.ingredientId',
          select: 'name costPerUnit unit'
        }
      })
      .select('+businessPlan') // Include businessPlan field
      .sort({ createdAt: -1 });

    // Manually populate equipmentId for each booth
    for (const booth of booths) {
      if (booth.businessPlan?.equipmentId) {
        try {
          const Equipment = (await import('@/lib/models/Equipment')).default;
          const equipment = await Equipment.findById(booth.businessPlan.equipmentId);
          if (equipment) {
            (booth.businessPlan as any).equipmentId = equipment;
          }
        } catch (error) {
          // Equipment not found or model not available
        }
      }
    }

    return NextResponse.json({
      booths
    });
  } catch (error) {
    console.error('Error fetching booths:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'ไม่ได้เข้าสู่ระบบ' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.user) {
      return NextResponse.json(
        { message: 'Token ไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if (payload.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      location,
      startDate,
      endDate,
      rentCost,
      openingHours,
      staff,
      employees,
      menuItems,
      businessPlan
    } = body;

    if (!name || !location || !startDate || !endDate || rentCost === undefined ||
        !openingHours?.start || !openingHours?.end || !staff?.username || !staff?.password) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    if (rentCost < 0) {
      return NextResponse.json(
        { message: 'ข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { message: 'วันเริ่มต้องมาก่อนวันสิ้นสุด' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if staff username already exists
    const existingUser = await User.findOne({
      username: staff.username,
      brandId: payload.user.brandId
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' },
        { status: 400 }
      );
    }

    const staffUser = new User({
      username: staff.username.trim().toLowerCase(), // Convert to lowercase for consistency
      password: staff.password, // Let User model handle password hashing
      name: name.trim() + ' Staff', // Use booth name as staff name
      role: 'staff',
      brandId: payload.user.brandId,
      isActive: true
    });

    try {
      await staffUser.save();
    } catch (userSaveError) {
      throw userSaveError;
    }

    // Create booth
    const booth = new Booth({
      name: name.trim(),
      location: location.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      rentCost,
      openingHours: {
        start: openingHours.start,
        end: openingHours.end
      },
      staff: {
        username: staff.username.trim(),
        password: staff.password, // Store plain password for display only
        userId: staffUser._id
      },
      employees: (employees || []).map((emp: any) => ({
        name: emp.name?.trim() || '',
        salary: emp.salary || 0,
        position: emp.position?.trim() || ''
      })),
      menuItems: menuItems || [],
      businessPlan: businessPlan || null,
      brandId: payload.user.brandId,
      isActive: true
    });

    // Update staff user with booth ID
    staffUser.boothId = booth._id;
    await staffUser.save();

    await booth.save();

    // Create accounting transactions for booth setup costs
    try {
      const accountingTransactions = [];

      // Use current date for accounting transaction (when booth is actually created)
      const transactionDate = new Date();

      // 1. Booth rent cost
      if (rentCost > 0) {
        const rentTransaction = new AccountingTransaction({
          date: transactionDate,
          type: 'expense',
          category: 'booth_rent',
          amount: rentCost,
          description: `ค่าเช่าหน้าร้าน ${name} - ${location} (ระยะเวลา: ${new Date(startDate).toLocaleDateString('th-TH')} - ${new Date(endDate).toLocaleDateString('th-TH')})`,
          boothId: booth._id,
          relatedId: booth._id,
          relatedType: 'booth_setup',
          brandId: payload.user.brandId
        });
        accountingTransactions.push(rentTransaction);
      }

      // 2. Staff salary costs
      if (employees && employees.length > 0) {
        // Calculate number of days for the booth
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const numberOfDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        for (const employee of employees) {
          if (employee.salary > 0) {
            // Calculate total salary (daily rate × number of days)
            const totalSalary = employee.salary * numberOfDays;

            const salaryTransaction = new AccountingTransaction({
              date: transactionDate,
              type: 'expense',
              category: 'staff_salary',
              amount: totalSalary,
              description: `เงินเดือนพนักงาน ${employee.name} - ${employee.position || 'พนักงาน'} (฿${employee.salary}/วัน × ${numberOfDays} วัน) หน้าร้าน ${name}`,
              boothId: booth._id,
              relatedId: booth._id,
              relatedType: 'booth_setup',
              brandId: payload.user.brandId
            });
            accountingTransactions.push(salaryTransaction);
          }
        }
      }

      // 3. Additional expenses (if business plan includes them)
      if (businessPlan?.additionalExpenses && businessPlan.additionalExpenses.length > 0) {
        for (const expense of businessPlan.additionalExpenses) {
          if (expense.amount > 0) {
            const expenseTransaction = new AccountingTransaction({
              date: transactionDate,
              type: 'expense',
              category: 'additional_expense',
              amount: expense.amount,
              description: `${expense.description} - หน้าร้าน ${name}`,
              boothId: booth._id,
              relatedId: booth._id,
              relatedType: 'booth_setup',
              brandId: payload.user.brandId
            });
            accountingTransactions.push(expenseTransaction);
          }
        }
      }

      // 4. Equipment cost and usage tracking (if business plan includes equipment)
      if (businessPlan?.equipmentId && businessPlan?.fixedCosts?.equipment > 0) {
        // Create accounting transaction
        const equipmentTransaction = new AccountingTransaction({
          date: transactionDate,
          type: 'expense',
          category: 'equipment_cost',
          amount: businessPlan.fixedCosts.equipment,
          description: `ค่าอุปกรณ์หน้าร้าน ${name} - รวม ${businessPlan.fixedCosts.equipment} บาท`,
          boothId: booth._id,
          relatedId: booth._id,
          relatedType: 'booth_setup',
          brandId: payload.user.brandId
        });
        accountingTransactions.push(equipmentTransaction);

        // Track equipment usage (no status change, just usage history)
        try {
          const equipment = await Equipment.findById(businessPlan.equipmentId);
          if (equipment) {
            // Add usage record only
            equipment.addUsage(
              (booth._id as any).toString(),
              booth.name,
              new Date(startDate),
              new Date(endDate)
            );

            await equipment.save();
          }
        } catch (equipmentError) {
          console.error('Error recording equipment usage:', equipmentError);
          // Continue without failing the booth creation
        }
      }

      // Save all accounting transactions
      if (accountingTransactions.length > 0) {
        await Promise.all(accountingTransactions.map(t => t.save()));
      }

    } catch (accountingError) {
      // Continue even if accounting fails, but log the error
      console.error('Error creating accounting transactions for booth setup:', accountingError);
    }

    return NextResponse.json({
      message: 'สร้างหน้าร้านเรียบร้อยแล้ว',
      booth,
      staffCredentials: {
        username: staff.username,
        password: staff.password
      }
    });
  } catch (error) {
    console.error('Error creating booth:', error);
    console.error('Full error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
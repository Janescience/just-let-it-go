import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Booth from '@/lib/models/Booth';
import User from '@/lib/models/User';
import MenuItem from '@/lib/models/MenuItem';
import AccountingTransaction from '@/lib/models/AccountingTransaction';
// Import Ingredient to register the model
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

    const booths = await Booth.find({ brandId: payload.user.brandId })
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

    console.log('📋 API received businessPlan:', businessPlan);
    console.log('📊 BusinessPlan keys:', businessPlan ? Object.keys(businessPlan) : 'null');

    // Debug validation data
    console.log('🔍 Validation check:', {
      name: !!name,
      location: !!location,
      startDate: !!startDate,
      endDate: !!endDate,
      rentCost: rentCost !== undefined,
      'openingHours.start': !!openingHours?.start,
      'openingHours.end': !!openingHours?.end,
      'staff.username': !!staff?.username,
      'staff.password': !!staff?.password
    });

    if (!name || !location || !startDate || !endDate || rentCost === undefined ||
        !openingHours?.start || !openingHours?.end || !staff?.username || !staff?.password) {
      console.log('❌ Validation failed - missing required fields');
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

    // Create staff user first
    console.log('Creating staff user with data:', {
      username: staff.username.trim().toLowerCase(),
      password: staff.password,
      name: name.trim() + ' Staff',
      role: 'staff',
      brandId: payload.user.brandId,
      isActive: true
    });

    const staffUser = new User({
      username: staff.username.trim().toLowerCase(), // Convert to lowercase for consistency
      password: staff.password, // Let User model handle password hashing
      name: name.trim() + ' Staff', // Use booth name as staff name
      role: 'staff',
      brandId: payload.user.brandId,
      isActive: true
    });

    console.log('Staff user object created, now saving...');
    try {
      await staffUser.save();
      console.log('Staff user saved successfully with ID:', staffUser._id);
    } catch (userSaveError) {
      console.error('Error saving staff user:', userSaveError);
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

    console.log('🏪 Booth object before save:', {
      businessPlan: booth.businessPlan,
      hasBusinessPlan: !!booth.businessPlan
    });

    // Update staff user with booth ID
    staffUser.boothId = booth._id;
    await staffUser.save();

    await booth.save();

    console.log('✅ Booth saved. BusinessPlan in saved booth:', booth.businessPlan ? 'exists' : 'null');

    // Create accounting transactions for booth setup costs
    try {
      const accountingTransactions = [];

      // 1. Booth rent cost
      if (rentCost > 0) {
        const rentTransaction = new AccountingTransaction({
          date: new Date(startDate),
          type: 'expense',
          category: 'booth_rent',
          amount: rentCost,
          description: `ค่าเช่าหน้าร้าน ${name} - ${location}`,
          boothId: booth._id,
          relatedId: booth._id,
          relatedType: 'booth_setup',
          brandId: payload.user.brandId
        });
        accountingTransactions.push(rentTransaction);
      }

      // 2. Staff salary costs
      if (employees && employees.length > 0) {
        for (const employee of employees) {
          if (employee.salary > 0) {
            const salaryTransaction = new AccountingTransaction({
              date: new Date(startDate),
              type: 'expense',
              category: 'staff_salary',
              amount: employee.salary,
              description: `เงินเดือนพนักงาน ${employee.name} - ${employee.position || 'พนักงาน'}`,
              boothId: booth._id,
              relatedId: booth._id,
              relatedType: 'booth_setup',
              brandId: payload.user.brandId
            });
            accountingTransactions.push(salaryTransaction);
          }
        }
      }

      // 3. Equipment cost (if business plan includes equipment)
      if (businessPlan?.equipmentSetId && businessPlan?.fixedCosts?.equipment > 0) {
        const equipmentTransaction = new AccountingTransaction({
          date: new Date(startDate),
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
      }

      // Save all accounting transactions
      if (accountingTransactions.length > 0) {
        await Promise.all(accountingTransactions.map(t => t.save()));
        console.log(`✅ Created ${accountingTransactions.length} accounting transactions for booth setup`);
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
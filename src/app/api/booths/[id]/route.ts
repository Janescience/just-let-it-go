import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/utils/auth';
import Booth from '@/lib/models/Booth';
import User from '@/lib/models/User';
import Equipment from '@/lib/models/Equipment';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { name, location, startDate, endDate, rentCost, openingHours, staff, employees, isActive, menuItems, businessPlan } = body;

    await connectDB();

    const { id } = await params;
    const booth = await Booth.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!booth) {
      return NextResponse.json(
        { message: 'ไม่พบหน้าร้าน' },
        { status: 404 }
      );
    }

    // Update basic booth information
    if (name !== undefined) booth.name = name.trim();
    if (location !== undefined) booth.location = location.trim();
    if (startDate !== undefined) booth.startDate = new Date(startDate);
    if (endDate !== undefined) booth.endDate = new Date(endDate);
    if (rentCost !== undefined) booth.rentCost = rentCost;
    if (isActive !== undefined) booth.isActive = isActive;

    // Update opening hours
    if (openingHours) {
      booth.openingHours = {
        start: openingHours.start,
        end: openingHours.end
      };
    }

    // Update staff credentials
    if (staff && staff.username && staff.password) {
      // Validate username length
      if (staff.username.trim().length < 3) {
        return NextResponse.json(
          { message: 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร' },
          { status: 400 }
        );
      }

      // Validate password length
      if (staff.password.length < 6) {
        return NextResponse.json(
          { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
          { status: 400 }
        );
      }

      // Check if username changed and if it conflicts with other users
      if (booth.staff.username !== staff.username) {
        const existingUser = await User.findOne({
          username: staff.username,
          brandId: payload.user.brandId,
          _id: { $ne: booth.staff.userId }
        });

        if (existingUser) {
          return NextResponse.json(
            { message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' },
            { status: 400 }
          );
        }
      }

      // Update staff user
      console.log('Finding staff user with ID:', booth.staff.userId);
      const staffUser = await User.findById(booth.staff.userId);
      if (staffUser) {
        console.log('Found staff user:', staffUser.username);
        staffUser.username = staff.username.trim().toLowerCase(); // Convert to lowercase for consistency

        // Only update password if it's different from stored plain text
        if (booth.staff.password !== staff.password) {
          console.log('Updating password from', booth.staff.password, 'to', staff.password);
          staffUser.password = staff.password; // Let User model handle password hashing
        }

        console.log('Saving updated staff user...');
        try {
          await staffUser.save();
          console.log('Staff user updated successfully');
        } catch (updateError) {
          console.error('Error updating staff user:', updateError);
          throw updateError;
        }
      } else {
        console.error('Staff user not found with ID:', booth.staff.userId);
      }

      // Update booth staff info
      booth.staff.username = staff.username.trim().toLowerCase(); // Convert to lowercase for consistency
      booth.staff.password = staff.password; // Store plain text for display
    }

    // Validate dates if both are provided
    if (booth.startDate >= booth.endDate) {
      return NextResponse.json(
        { message: 'วันเริ่มต้องมาก่อนวันสิ้นสุด' },
        { status: 400 }
      );
    }

    // Handle employee updates if provided
    if (employees !== undefined) {
      // Get current employee user IDs
      const currentEmployeeIds = (booth.employees as any[])
        .filter((emp: any) => emp.userId)
        .map((emp: any) => emp.userId.toString());

      // Delete users for employees that are no longer in the list
      const newEmployeeNames = employees.map((emp: { name?: string }) => emp.name?.trim()).filter(Boolean);
      const usersToDelete = await User.find({
        boothId: booth._id,
        name: { $nin: newEmployeeNames }
      });

      for (const user of usersToDelete) {
        await User.findByIdAndDelete(user._id);
      }

      // Process new/updated employees
      const employeeData = [];
      for (const emp of employees) {
        if (emp.name && emp.salary) {
          // Check if employee already exists
          let existingUser = await User.findOne({
            boothId: booth._id,
            name: emp.name.trim()
          });

          if (existingUser) {
            // Update existing employee
            employeeData.push({
              userId: existingUser._id,
              name: emp.name.trim(),
              salary: emp.salary
            });
          } else {
            // Create new staff user
            const username = emp.name
              .toLowerCase()
              .replace(/\s+/g, '')
              .replace(/[^a-z0-9]/g, '') +
              Math.random().toString(36).substring(2, 5);

            const tempPassword = Math.random().toString(36).substring(2, 10);
            const hashedPassword = await bcrypt.hash(tempPassword, 12);

            const staffUser = new User({
              username,
              password: hashedPassword,
              name: emp.name.trim(),
              role: 'staff',
              brandId: payload.user.brandId,
              boothId: booth._id,
              isActive: true
            });

            await staffUser.save();

            employeeData.push({
              userId: staffUser._id,
              name: emp.name.trim(),
              salary: emp.salary
            });
          }
        }
      }

      booth.employees = employeeData;
    }

    // Update menu items if provided
    if (menuItems !== undefined) {
      booth.menuItems = menuItems;
    }

    // Update business plan if provided
    if (businessPlan !== undefined) {
      booth.businessPlan = businessPlan;
    }

    await booth.save();

    return NextResponse.json({
      message: 'แก้ไขหน้าร้านเรียบร้อยแล้ว',
      booth
    });
  } catch (error) {
    console.error('Error updating booth:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const booth = await Booth.findOne({
      _id: id,
      brandId: payload.user.brandId
    });

    if (!booth) {
      return NextResponse.json(
        { message: 'ไม่พบหน้าร้าน' },
        { status: 404 }
      );
    }

    // Check if booth has any sales records
    const { default: Sale } = await import('@/lib/models/Sale');
    const salesCount = await Sale.countDocuments({ boothId: booth._id });

    if (salesCount > 0) {
      return NextResponse.json(
        {
          message: `ไม่สามารถลบหน้าร้านนี้ได้ เนื่องจากมีประวัติการขาย ${salesCount} รายการ`,
          salesCount
        },
        { status: 400 }
      );
    }

    // Equipment usage history remains (no status management needed)

    // Delete all staff users associated with this booth
    await User.deleteMany({ boothId: booth._id });

    // Delete the booth
    await Booth.findByIdAndDelete(id);

    return NextResponse.json({
      message: 'ลบหน้าร้านเรียบร้อยแล้ว'
    });
  } catch (error) {
    console.error('Error deleting booth:', error);
    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
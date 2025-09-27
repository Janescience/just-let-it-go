import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Brand from '@/lib/models/Brand';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { brandName, brandLogo, username, email, name, password } = await request.json();

    // Validate input
    if (!brandName || !username || !name || !password) {
      return NextResponse.json(
        { message: 'กรุณาใส่ข้อมูลที่จำเป็นให้ครบถ้วน' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { message: 'ชื่อผู้ใช้ต้องมีความยาว 3-20 ตัวอักษร' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUsername = await User.findOne({
      username: username.toLowerCase().trim()
    });
    if (existingUsername) {
      return NextResponse.json(
        { message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' },
        { status: 400 }
      );
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase().trim()
      });
      if (existingEmail) {
        return NextResponse.json(
          { message: 'อีเมลนี้ถูกใช้งานแล้ว' },
          { status: 400 }
        );
      }
    }

    // Create a temporary ObjectId for brand creation
    const tempOwnerId = new mongoose.Types.ObjectId();

    // Create brand first
    const brand = new Brand({
      name: brandName.trim(),
      logo: brandLogo || undefined,
      ownerId: tempOwnerId,
    });

    const savedBrand = await brand.save();

    // Create admin user
    const user = new User({
      username: username.toLowerCase().trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      name: name.trim(),
      password,
      role: 'admin',
      brandId: savedBrand._id,
      isActive: true,
    });

    const savedUser = await user.save();

    // Update brand with real owner ID
    savedBrand.ownerId = savedUser._id;
    await savedBrand.save();

    return NextResponse.json({
      message: 'ตั้งค่าระบบเรียบร้อยแล้ว',
      brand: {
        id: savedBrand._id,
        name: savedBrand.name,
      },
      user: {
        id: savedUser._id,
        username: savedUser.username,
        name: savedUser.name,
        role: savedUser.role,
      },
    });
  } catch (error: any) {
    console.error('Setup error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { message: messages.join(', ') },
        { status: 400 }
      );
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'username' ? 'ชื่อผู้ใช้' : 'อีเมล';
      return NextResponse.json(
        { message: `${fieldName}นี้ถูกใช้งานแล้ว` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' },
      { status: 500 }
    );
  }
}
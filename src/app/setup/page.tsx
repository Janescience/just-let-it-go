'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Settings, Building2, User, Mail, Lock } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Brand info
    brandName: '',
    brandLogo: '',
    // Admin user info
    username: '',
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (!formData.brandName.trim()) {
        setError('กรุณาใส่ชื่อแบรนด์');
        return;
      }
      setStep(2);
      setError('');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandName: formData.brandName,
          username: formData.username,
          email: formData.email,
          name: formData.name,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/login?setup=success');
      } else {
        setError(data.message || 'เกิดข้อผิดพลาดในการตั้งค่าระบบ');
      }
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-light text-black">ตั้งค่าระบบครั้งแรก</h1>
          <p className="text-gray-600 mt-2">สร้างแบรนด์และบัญชีผู้ดูแลระบบ</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {step === 1 ? (
                  <>
                    <Building2 className="w-5 h-5" />
                    ข้อมูลแบรนด์
                  </>
                ) : (
                  <>
                    <User className="w-5 h-5" />
                    ข้อมูลผู้ดูแลระบบ
                  </>
                )}
              </CardTitle>
              <span className="text-lg text-gray-500">
                {step}/2
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-lg">
                  {error}
                </div>
              )}

              {step === 1 ? (
                <div className="space-y-4">
                  <Input
                    name="brandName"
                    type="text"
                    label="ชื่อแบรนด์"
                    value={formData.brandName}
                    onChange={handleChange}
                    required
                    helperText="ชื่อร้านอาหารหรือแบรนด์ของคุณ"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <Input
                    name="name"
                    type="text"
                    label="ชื่อ-นามสกุล"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />

                  <Input
                    name="username"
                    type="text"
                    label="ชื่อผู้ใช้"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    helperText="ชื่อสำหรับเข้าสู่ระบบ (3-20 ตัวอักษร)"
                  />

                  <Input
                    name="email"
                    type="email"
                    label="อีเมล (ไม่บังคับ)"
                    value={formData.email}
                    onChange={handleChange}
                  />

                  <Input
                    name="password"
                    type="password"
                    label="รหัสผ่าน"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    helperText="อย่างน้อย 6 ตัวอักษร"
                  />

                  <Input
                    name="confirmPassword"
                    type="password"
                    label="ยืนยันรหัสผ่าน"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              )}

              <div className="flex gap-3">
                {step === 2 && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    ย้อนกลับ
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={loading}
                  disabled={loading}
                >
                  {step === 1 ? 'ถัดไป' : 'เริ่มใช้งาน'}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-lg text-gray-500">
                มีบัญชีแล้ว?
                <button
                  onClick={() => router.push('/login')}
                  className="ml-1 text-black hover:underline font-light"
                >
                  เข้าสู่ระบบ
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
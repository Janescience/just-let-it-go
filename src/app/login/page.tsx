'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { LogIn, User, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      console.log('Login response:', { status: response.status, data });

      if (response.ok) {
        console.log('Login successful, redirecting user:', data.user);
        // Redirect based on user role
        if (data.user.role === 'admin') {
          console.log('Redirecting admin to /');
          window.location.href = '/';
        } else {
          console.log('Redirecting staff to /sales');
          window.location.href = '/sales';
        }
      } else {
        console.log('Login failed:', data.message);
        setError(data.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
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
          {/* <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-light">S</span>
          </div> */}
          {/* <h1 className="text-2xl font-light text-black">Shoots B-Hop</h1>
          <p className="text-gray-600 mt-2">ระบบการออกบูทและตั้งร้านอาหาร</p> */}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              เข้าสู่ระบบ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-lg">
                  {error}
                </div>
              )}

              <div>
                <Input
                  name="username"
                  type="text"
                  label="ชื่อผู้ใช้"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <Input
                  name="password"
                  type="password"
                  label="รหัสผ่าน"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
                disabled={loading || !formData.username || !formData.password}
              >
                เข้าสู่ระบบ
              </Button>
            </form>

            <div className="mt-6 text-center space-y-3">


              <p className="text-lg text-gray-500">
                ไม่มีบัญชีผู้ใช้?
                <button
                  onClick={() => router.push('/setup')}
                  className="ml-1 text-black hover:underline font-light"
                >
                  ตั้งค่าระบบครั้งแรก
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
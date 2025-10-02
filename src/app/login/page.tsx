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
        if (data.user.role === 'super_admin') {
          console.log('Redirecting super admin to /super-admin');
          window.location.href = '/super-admin';
        } else if (data.user.role === 'admin') {
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <img
            src="https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100"
            alt="System Logo"
            className="w-16 h-16 mx-auto mb-6"
          />
          <h1 className="text-2xl font-thin text-black tracking-wider mb-2">ขายไปเหอะ</h1>
          <p className="text-sm font-light text-gray-400">ระบบจัดการการขายและหน้าร้าน</p>
        </div>

        <div className="bg-white border border-gray-100 p-8">
          <div className="text-center mb-8">
            <h2 className="text-lg font-thin text-black tracking-wider">เข้าสู่ระบบ</h2>
          </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="border border-gray-200 text-gray-600 px-4 py-3 text-sm font-light bg-gray-50">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                  ชื่อผู้ใช้
                </label>
                <input
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                  รหัสผ่าน
                </label>
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none py-2"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !formData.username || !formData.password}
                className="w-full py-3 bg-black text-white text-sm font-light tracking-wide hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm font-light text-gray-400">
                ไม่มีบัญชีผู้ใช้?
                <button
                  onClick={() => router.push('/setup')}
                  className="ml-1 text-black hover:text-gray-600 font-light transition-colors duration-200"
                >
                  ตั้งค่าระบบครั้งแรก
                </button>
              </p>
            </div>
        </div>
      </div>
    </div>
  );
}
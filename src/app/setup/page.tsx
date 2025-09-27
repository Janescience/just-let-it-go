'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Settings, Building2, User, Mail, Lock, Upload, X } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setLogoPreview(result);
        setFormData(prev => ({ ...prev, brandLogo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, brandLogo: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.brandName.trim()) {
      setError('กรุณาใส่ชื่อแบรนด์');
      return;
    }

    if (!formData.username.trim()) {
      setError('กรุณาใส่ชื่อผู้ใช้');
      return;
    }

    if (!formData.name.trim()) {
      setError('กรุณาใส่ชื่อ-นามสกุล');
      return;
    }

    if (!formData.password.trim()) {
      setError('กรุณาใส่รหัสผ่าน');
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
          brandLogo: formData.brandLogo,
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-12">
          <img
            src="https://api.dicebear.com/9.x/notionists/svg?seed=justletitgo&flip=true&scale=100"
            alt="System Logo"
            className="w-16 h-16 mx-auto mb-6"
          />
          <h1 className="text-2xl font-thin text-black tracking-wider mb-2">ตั้งค่าระบบครั้งแรก</h1>
          <p className="text-sm font-light text-gray-400">สร้างแบรนด์และบัญชีผู้ดูแลระบบ</p>
        </div>

        <div className="bg-white border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="border border-gray-200 text-gray-600 px-4 py-3 text-sm font-light bg-gray-50">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Brand Section */}
              <div className="pb-4 border-b border-gray-100">
                <h3 className="text-sm font-light text-gray-400 mb-4 tracking-wider uppercase">ข้อมูลแบรนด์</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                      ชื่อแบรนด์
                    </label>
                    <input
                      name="brandName"
                      type="text"
                      value={formData.brandName}
                      onChange={handleChange}
                      required
                      className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none py-2"
                      placeholder="ชื่อร้านอาหารหรือแบรนด์ของคุณ"
                    />
                  </div>

                  {/* Logo Upload */}
                  <div>
                    <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                      โลโก้แบรนด์ (ไม่บังคับ)
                    </label>

                    {logoPreview ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={logoPreview}
                          alt="Logo Preview"
                          className="w-12 h-12 rounded-full object-cover border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 text-sm font-light text-gray-600 hover:text-black transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>อัปโหลดโลโก้</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin User Section */}
              <div>
                <h3 className="text-sm font-light text-gray-400 mb-4 tracking-wider uppercase">ข้อมูลผู้ดูแลระบบ</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                      ชื่อ-นามสกุล
                    </label>
                    <input
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none py-2"
                    />
                  </div>

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
                      className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none py-2"
                      placeholder="ชื่อสำหรับเข้าสู่ระบบ"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                      อีเมล (ไม่บังคับ)
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
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
                      className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none py-2"
                      placeholder="อย่างน้อย 6 ตัวอักษร"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                      ยืนยันรหัสผ่าน
                    </label>
                    <input
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none py-2"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white text-sm font-light tracking-wide hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'กำลังสร้างระบบ...' : 'เริ่มใช้งาน'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm font-light text-gray-400">
              มีบัญชีแล้ว?
              <button
                onClick={() => router.push('/login')}
                className="ml-1 text-black hover:text-gray-600 font-light transition-colors duration-200"
              >
                เข้าสู่ระบบ
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Building2, CreditCard, Phone, IdCard, Smartphone, QrCode, X, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
// Removed unused Button and Input imports
import { Brand } from '@/types';

export default function BrandPage() {
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    paymentInfo: {
      phone: '',
      idCard: '',
      eWallet: '',
      paotang: '',
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchBrand();
    }
  }, [user]);

  const fetchBrand = async () => {
    try {
      const response = await fetch('/api/brands');
      if (response.ok) {
        const data = await response.json();
        setBrand(data.brand);
        setFormData({
          name: data.brand.name || '',
          logo: data.brand.logo || '',
          paymentInfo: {
            phone: data.brand.paymentInfo?.phone || '',
            idCard: data.brand.paymentInfo?.idCard || '',
            eWallet: data.brand.paymentInfo?.eWallet || '',
            paotang: data.brand.paymentInfo?.paotang || '',
          }
        });
      }
    } catch (error) {
      console.error('Error fetching brand:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setFormData(prev => ({
        ...prev,
        logo: result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      logo: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('กรุณาระบุชื่อแบรนด์');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/brands', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setBrand(data.brand);
        alert('อัปเดตข้อมูลเรียบร้อยแล้ว');
      } else {
        const error = await response.json();
        alert(error.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      console.error('Error saving brand:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-thin text-black tracking-wider">จัดการแบรนด์</h1>
              <p className="text-sm font-light text-gray-500 mt-1">ตั้งค่าข้อมูลแบรนด์และการชำระเงิน</p>
            </div>
          </div>
        </div>
      </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">กำลังโหลด...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-thin text-black tracking-wider">แบรนด์</h1>
              <p className="text-sm font-light text-gray-500 mt-1">ตั้งค่าข้อมูลแบรนด์และการชำระเงิน</p>
            </div>
          </div>
        </div>
      </div>

     

      <div className="max-w-7xl mx-auto px-6 py-8">
         {/* Submit Button */}
          <div className="flex justify-end mb-8">
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.name.trim()}
              className="px-6 py-2 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5" />
              <h3 className="text-lg font-light text-black tracking-wide">ข้อมูลพื้นฐาน</h3>
            </div>
            <div className="text-center space-y-8">
              {/* Logo Upload */}
              <div>
                <label className="block text-xs font-light text-gray-400 mb-4 tracking-wider uppercase">
                  โลโก้แบรนด์
                </label>
                <div className="space-y-6">
                  {formData.logo ? (
                    <div className="relative w-40 h-40 mx-auto">
                      <img
                        src={formData.logo}
                        alt="Brand Logo"
                        className="w-full h-full object-cover border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-40 h-40 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors mx-auto"
                    >
                      <ImageIcon className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-sm font-light text-gray-600 mb-1">คลิกเพื่ออัพโหลด</p>
                      <p className="text-xs font-light text-gray-400">สูงสุด 5MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3 border border-gray-200 text-sm font-light text-black hover:bg-gray-50 transition-colors duration-200 tracking-wide mx-auto"
                  >
                    <Upload className="w-4 h-4" />
                    {formData.logo ? 'เปลี่ยนรูป' : 'อัพโหลดโลโก้'}
                  </button>
                </div>
              </div>
              {/* Brand Name */}
              <div className="max-w-sm mx-auto">
                <label className="block text-xs font-light text-gray-400 mb-3 tracking-wider uppercase">
                  ชื่อแบรนด์
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ระบุชื่อแบรนด์"
                  className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-lg font-light focus:border-black focus:outline-none text-center pb-2"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="col-span-2 border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <QrCode className="w-5 h-5" />
              <h3 className="text-lg font-light text-black tracking-wide">ข้อมูลการชำระเงิน (สำหรับสร้าง QR Code)</h3>
            </div>
            <div className="space-y-6">
    

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={formData.paymentInfo.phone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      paymentInfo: { ...prev.paymentInfo, phone: e.target.value }
                    }))}
                    placeholder="เช่น 0812345678"
                    className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                    หมายเลขบัตรประชาชน
                  </label>
                  <input
                    type="text"
                    value={formData.paymentInfo.idCard}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      paymentInfo: { ...prev.paymentInfo, idCard: e.target.value }
                    }))}
                    placeholder="เช่น 1234567890123"
                    maxLength={13}
                    className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                    E-Wallet (เช่น TrueMoney, ShopeePay)
                  </label>
                  <input
                    type="text"
                    value={formData.paymentInfo.eWallet}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      paymentInfo: { ...prev.paymentInfo, eWallet: e.target.value }
                    }))}
                    placeholder="เช่น 0812345678"
                    className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                    เป๋าตัง
                  </label>
                  <input
                    type="text"
                    value={formData.paymentInfo.paotang}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      paymentInfo: { ...prev.paymentInfo, paotang: e.target.value }
                    }))}
                    placeholder="เช่น 0812345678"
                    className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="border border-gray-200 p-4">
                <div className="flex items-start gap-2">
                  <QrCode className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="font-light text-gray-700 mb-1">หมายเหตุ:</p>
                    <ul className="text-gray-600 space-y-1 text-sm font-light">
                      <li>• ข้อมูลที่กรอกต้องถูกต้องและใช้งานได้จริง</li>
                      <li>• QR Code จะแสดงในหน้าชำระเงินของลูกค้า</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
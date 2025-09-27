'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Building2, CreditCard, Phone, IdCard, Smartphone, QrCode, X, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
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

     

      <div className="p-6  mx-auto space-y-6">
         {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={saving}
              disabled={!formData.name.trim()}
              size="lg"
            >
              บันทึกข้อมูล
            </Button>
          </div>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Basic Information */}
          <Card >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                ข้อมูลพื้นฐาน
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 text-center">
              

              {/* Logo Upload */}
              <div>
                <label className="block text-lg font-light text-gray-700 mb-2">
                  โลโก้แบรนด์
                </label>
                <div className="space-y-4">
                  {formData.logo ? (
                    <div className="text-center">
                      <img
                        src={formData.logo}
                        alt="Brand Logo"
                        className="w-32 h-32 object-cover mx-auto rounded-lg border border-gray-200"
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
                      className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                    >
                      <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-gray-600 font-light mb-1">คลิกเพื่ออัพโหลด</p>
                      <p className=" text-gray-400">สูงสุด 5MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    icon={Upload}
                  >
                    {formData.logo ? 'เปลี่ยนรูป' : 'อัพโหลดโลโก้'}
                  </Button>
                </div>
              </div>
              {/* Brand Name */}
              <Input
                label="ชื่อแบรนด์"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ระบุชื่อแบรนด์"
                required
              />
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card className='col-span-2'>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                ข้อมูลการชำระเงิน (สำหรับสร้าง QR Code)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
    

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="เบอร์โทรศัพท์"
                  value={formData.paymentInfo.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentInfo: { ...prev.paymentInfo, phone: e.target.value }
                  }))}
                  placeholder="เช่น 0812345678"
                  type="tel"
                />

                <Input
                  label="หมายเลขบัตรประชาชน"
                  value={formData.paymentInfo.idCard}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentInfo: { ...prev.paymentInfo, idCard: e.target.value }
                  }))}
                  placeholder="เช่น 1234567890123"
                  maxLength={13}
                />

                <Input
                  label="E-Wallet (เช่น TrueMoney, ShopeePay)"
                  value={formData.paymentInfo.eWallet}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentInfo: { ...prev.paymentInfo, eWallet: e.target.value }
                  }))}
                  placeholder="เช่น 0812345678"
                />

                <Input
                  label="เป๋าตัง"
                  value={formData.paymentInfo.paotang}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentInfo: { ...prev.paymentInfo, paotang: e.target.value }
                  }))}
                  placeholder="เช่น 0812345678"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <QrCode className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-lg">
                    <p className="font-light text-yellow-800 mb-1">หมายเหตุ:</p>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• ข้อมูลที่กรอกต้องถูกต้องและใช้งานได้จริง</li>
                      <li>• QR Code จะแสดงในหน้าชำระเงินของลูกค้า</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          
        </form>
      </div>
    </div>
  );
}
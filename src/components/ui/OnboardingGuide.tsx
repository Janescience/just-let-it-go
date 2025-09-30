'use client';

import React from 'react';
import { CheckCircle, Circle, Package, MenuIcon, Wrench, Store, QrCode, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  completed: boolean;
}

interface OnboardingGuideProps {
  completionStatus: {
    hasIngredients: boolean;
    hasMenuItems: boolean;
    hasEquipment: boolean;
    hasBooths: boolean;
    hasPaymentInfo: boolean;
  };
}

function OnboardingGuide({ completionStatus }: OnboardingGuideProps) {
  const steps: OnboardingStep[] = [
    {
      id: 'ingredients',
      title: 'สร้างวัตถุดิบ',
      description: 'เพิ่มวัตถุดิบที่ใช้ในการทำอาหารและเครื่องดื่ม',
      icon: Package,
      href: '/inventory',
      completed: completionStatus.hasIngredients
    },
    {
      id: 'menu',
      title: 'สร้างเมนูจากวัตถุดิบ',
      description: 'สร้างเมนูอาหารและเครื่องดื่มจากวัตถุดิบที่มี',
      icon: MenuIcon,
      href: '/menu',
      completed: completionStatus.hasMenuItems
    },
    {
      id: 'equipment',
      title: 'สร้างอุปกรณ์',
      description: 'เพิ่มอุปกรณ์ที่ใช้ในการประกอบอาหารและทำเครื่องดื่ม',
      icon: Wrench,
      href: '/equipment',
      completed: completionStatus.hasEquipment
    },
    {
      id: 'booths',
      title: 'สร้างหน้าร้าน',
      description: 'ตั้งค่าหน้าร้านและจุดขายสำหรับการขาย',
      icon: Store,
      href: '/booth',
      completed: completionStatus.hasBooths
    },
    {
      id: 'payment',
      title: 'ตั้งค่าการชำระเงิน',
      description: 'กรอกเลขพร้อมเพย์เพื่อสร้าง QR Code สำหรับรับชำระเงิน',
      icon: QrCode,
      href: '/brand',
      completed: completionStatus.hasPaymentInfo
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-thin text-black tracking-wider mb-3">
              ยินดีต้อนรับสู่ระบบ ขายไปเหอะ
            </h1>
            <p className="text-lg font-light text-gray-500">
              มาเริ่มต้นการตั้งค่าระบบให้เสร็จสมบูรณ์กันเถอะ
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 pb-24">
        {/* Progress Bar */}
        <div className="border border-gray-100 p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-thin text-black">ความคืบหน้าการตั้งค่า</h2>
            <span className="text-lg font-light text-black">
              {completedSteps}/{totalSteps} ขั้นตอน
            </span>
          </div>

          <div className="w-full bg-gray-100 h-1 mb-3">
            <div
              className="bg-black h-1 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <p className="text-sm font-light text-gray-500">
            {completedSteps === totalSteps
              ? 'ยินดีด้วย! คุณได้ตั้งค่าระบบเสร็จสมบูรณ์แล้ว'
              : `เหลืออีก ${totalSteps - completedSteps} ขั้นตอนที่ต้องทำให้เสร็จ`
            }
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-6">
          <h3 className="text-xl font-thin text-black mb-8">
            รายการสิ่งที่ต้องทำให้เสร็จ
          </h3>

          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.completed;

            return (
              <div
                key={step.id}
                className={`border transition-all duration-200 ${
                  isCompleted
                    ? 'border-black bg-gray-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="p-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className={`
                        w-12 h-12 border flex items-center justify-center
                        ${isCompleted
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 text-gray-400'
                        }
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <h4 className="text-lg font-light text-black">
                            {step.title}
                          </h4>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-black" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                        <p className="text-gray-500 font-light mt-2">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <div className="ml-6">
                      {isCompleted ? (
                        <div className="flex items-center text-black font-light">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          เสร็จแล้ว
                        </div>
                      ) : (
                        <Link href={step.href}>
                          <Button
                            variant="primary"
                            icon={ArrowRight}
                            className="whitespace-nowrap bg-black hover:bg-gray-800 border-black"
                          >
                            เริ่มทำ
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion Message */}
        {completedSteps === totalSteps && (
          <div className="border border-black p-12 text-center mt-12">
            <div className="w-16 h-16 border border-black flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-2xl font-thin text-black mb-3">
              ยินดีด้วย! การตั้งค่าเสร็จสมบูรณ์
            </h3>
            <p className="text-gray-500 font-light mb-8">
              คุณได้ตั้งค่าระบบครบถ้วนแล้ว ตอนนี้คุณสามารถเริ่มใช้งานระบบได้เต็มรูปแบบ
            </p>
            <Link href="/">
              <Button variant="primary" size="lg" className="bg-black hover:bg-gray-800 border-black px-8 py-3">
                ไปที่แดชบอร์ด
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingGuide;
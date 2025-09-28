'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Banknote, Clock } from 'lucide-react';
import { Modal, ModalActionButton } from '@/components/ui';
import { MenuItem, Brand } from '@/types';
import { getAvailablePaymentMethods, getPaymentMethodLabel, generatePaymentQRString } from '@/utils/qrcode';
import QRCode from 'react-qr-code';

interface CartItem extends MenuItem {
  quantity: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  cart: CartItem[];
  totalAmount: number;
  brand: Brand | null;
  selectedBoothId: string | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => void;
}

export function PaymentModal({
  isOpen,
  cart,
  totalAmount,
  brand,
  selectedBoothId,
  onClose,
  onSuccess,
  showToast
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [selectedQRMethod, setSelectedQRMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [showCashInput, setShowCashInput] = useState(false);

  const availablePaymentMethods = brand ? getAvailablePaymentMethods(brand) : [];


  const quickAmounts = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('cash');
      setSelectedQRMethod('');
      setQrCode(null);
      setReceivedAmount(totalAmount.toString());
      setShowCashInput(true);
      setLoading(false);
    }
  }, [isOpen, totalAmount]);

  // ตั้งค่าเริ่มต้นเมื่อเปิด modal
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setShowCashInput(true);
      setQrCode(null); // Clear QR code when switching to cash
      // Only set default amount if receivedAmount is empty or when modal first opens
      if (!receivedAmount) {
        setReceivedAmount(totalAmount.toString());
      }
    } else if (paymentMethod === 'transfer' && availablePaymentMethods.length > 0 && brand) {
      // Auto-select first available payment method for transfer
      setSelectedQRMethod(availablePaymentMethods[0]);
      // Generate QR code immediately when transfer is selected
      const methodToUse = selectedQRMethod || availablePaymentMethods[0];
      const qrString = generatePaymentQRString({
        amount: totalAmount,
        brand,
        paymentMethod: methodToUse as any
      });
      if (qrString) {
        setQrCode(qrString);
      }
    }
  }, [paymentMethod, availablePaymentMethods, brand, totalAmount]);

  const isValidCashPayment = () => {
    const received = parseFloat(receivedAmount) || 0;
    return received >= totalAmount;
  };

  const handlePayment = async () => {
    // ตรวจสอบเงินสดก่อนดำเนินการ
    if (paymentMethod === 'cash' && !isValidCashPayment()) {
      alert('จำนวนเงินที่รับมาไม่เพียงพอ');
      return;
    }

    // ตรวจสอบว่ามี payment methods พร้อมใช้งานสำหรับ transfer
    if (paymentMethod === 'transfer' && availablePaymentMethods.length === 0) {
      alert('ไม่พบข้อมูลการชำระเงิน กรุณาติดต่อผู้ดูแลระบบ');
      return;
    }

    // For transfer payments, QR code is already generated, proceed with confirmation
    if (paymentMethod === 'transfer') {
      // Process transfer payment immediately
      showToast('success', 'ยืนยันการชำระสำเร็จ!', `ยอดชำระ ฿${totalAmount.toLocaleString()}`);
      onSuccess();
      processTransferPaymentAsync();
      return;
    }

    // For cash payments: Show success immediately, then process API call
    if (paymentMethod === 'cash') {
      // 1. Show success toast immediately
      showToast('success', 'ชำระเงินสำเร็จ!', `ยอดชำระ ฿${totalAmount.toLocaleString()}`);

      // 2. Show success UI immediately
      onSuccess();

      // 3. Process API call in background (don't await)
      processPaymentAsync();
    }
  };

  const processPaymentAsync = async () => {
    try {
      const currentPaymentMethod = paymentMethod;
      const currentBoothId = selectedBoothId;
      const currentCart = [...cart];
      const currentTotalAmount = totalAmount;

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: currentCart.map(item => ({
            menuItemId: item._id,
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount: currentTotalAmount,
          paymentMethod: currentPaymentMethod,
          ...(selectedBoothId && { boothId: selectedBoothId })
        })
      });


      if (response.ok) {
        const result = await response.json();
        localStorage.setItem('booth-stats-update', Date.now().toString());
        window.dispatchEvent(new CustomEvent('booth-stats-update'));
      } else {
        const error = await response.json();
        console.error('❌ Background payment processing failed:', error);
      }
    } catch (error) {
      console.error('❌ Error in background payment processing:', error);
    }
  };

  const processTransferPaymentAsync = async () => {
    try {
      const currentBoothId = selectedBoothId;
      const currentCart = [...cart];
      const currentTotalAmount = totalAmount;

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: currentCart.map(item => ({
            menuItemId: item._id,
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount: currentTotalAmount,
          paymentMethod: 'transfer',
          ...(selectedBoothId && { boothId: selectedBoothId })
        })
      });

      if (response.ok) {

        localStorage.setItem('booth-stats-update', Date.now().toString());
        window.dispatchEvent(new CustomEvent('booth-stats-update'));
      } else {
        const error = await response.json();
        console.error('❌ Background transfer payment processing failed:', error);
      }
    } catch (error) {
      console.error('❌ Error in background transfer payment processing:', error);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setReceivedAmount(amount.toString());
  };

  const getChangeAmount = () => {
    const received = parseFloat(receivedAmount) || 0;
    return received - totalAmount;
  };

  const handlePaymentMethodChange = (method: 'cash' | 'transfer') => {
    setPaymentMethod(method);
    if (method === 'cash') {
      setShowCashInput(true);
      if (!receivedAmount || receivedAmount === '') {
        setReceivedAmount(totalAmount.toString());
      }
      setSelectedQRMethod('');
    } else {
      setShowCashInput(false);
      setReceivedAmount('');
      if (availablePaymentMethods.length > 0) {
        setSelectedQRMethod(availablePaymentMethods[0]);
      }
    }
  };

  const handleTransferPaymentComplete = () => {
    showToast('success', 'ยืนยันการชำระสำเร็จ!', `ยอดชำระ ฿${totalAmount.toLocaleString()}`);
    onSuccess();
    processTransferPaymentAsync();
  };

  if (!isOpen) return null;

  const actions: ModalActionButton[] = [
    {
      label: 'ยกเลิก',
      onClick: onClose,
      variant: 'secondary'
    },
    {
      label: 'ดำเนินการ',
      onClick: handlePayment,
      variant: 'primary',
      disabled: loading || (paymentMethod === 'cash' && !isValidCashPayment()),
      loading: loading
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={!qrCode ? "ชำระเงิน" : "สแกน QR Code"}
      size="xl"
      actions={actions}
    >
      <div className="p-6">
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Payment Methods - Col 1 */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <div
                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'cash'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePaymentMethodChange('cash')}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        paymentMethod === 'cash' ? 'bg-black' : 'bg-gray-100'
                      }`}>
                        <Banknote className={`w-6 h-6 ${
                          paymentMethod === 'cash' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-light text-gray-900">เงินสด</div>
                        <div className="text-lg text-gray-500">ชำระด้วยเงินสด</div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handlePaymentMethodChange('transfer')}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        paymentMethod === 'transfer' ? 'bg-black' : 'bg-gray-100'
                      }`}>
                        <CreditCard className={`w-6 h-6 ${
                          paymentMethod === 'transfer' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <div className="font-light text-gray-900">โอนเงิน</div>
                        <div className="text-lg text-gray-500">สแกน QR Code</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Summary - Always in Same Column */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-light text-gray-900 mb-4">สรุปรายการ</h3>
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                        <div className="flex-1">
                          <div className="font-light text-gray-900">{item.name}</div>
                          <div className="text-lg text-gray-500">฿{item.price.toLocaleString()} x {item.quantity}</div>
                        </div>
                        <div className="font-light text-gray-900 ml-4">
                          ฿{(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <hr className="my-4 border-gray-300" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-light text-gray-700">รวมทั้งสิ้น</span>
                    <span className="text-2xl font-light text-black">฿{totalAmount.toLocaleString()}</span>
                  </div>
         
                </div>

              </div>

              {/* Cash Input Section or QR Code Section - Col 2 */}
              {((showCashInput && paymentMethod === 'cash') || (paymentMethod === 'transfer')) && (
                <div className="lg:col-span-2 bg-blue-50 p-8 rounded-lg">
                  {/* Cash Input for Cash Payment */}
                  {paymentMethod === 'cash' && (
                    <>
                      <div className="mb-6 md:mb-8">
                        <label className="block text-base md:text-lg text-gray-700 mb-3 md:mb-4">จำนวนเงินที่รับมา</label>
                        <input
                          type="number"
                          value={receivedAmount}
                          onChange={(e) => setReceivedAmount(e.target.value)}
                          placeholder="0"
                          min={totalAmount}
                          className="w-full text-2xl md:text-4xl text-center font-light border-2 border-gray-300 rounded-lg py-4 md:py-6 px-4 focus:border-black focus:outline-none transition-colors"
                        />
                      </div>

                      {/* Quick Amount Buttons */}
                      <div className="mb-8">
                        <div className="text-lg text-gray-700 mb-4">ปุ่มทางลัด:</div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                          {quickAmounts.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                console.log('Button clicked for amount:', amount);
                                handleQuickAmount(amount);
                              }}
                              className={`py-3 px-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
                                receivedAmount === amount.toString()
                                  ? 'bg-black text-white shadow-md'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400 hover:shadow-sm'
                              }`}
                            >
                              ฿{amount.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Change Calculation */}
                      {receivedAmount && parseFloat(receivedAmount) >= totalAmount && (
                        <div className="bg-gray-50 p-4 md:p-6 rounded-lg border border-gray-200">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <span className="text-gray-700 font-light text-lg md:text-xl">
                              {getChangeAmount() === 0 ? 'ชำระเงินพอดี' : 'เงินทอน:'}
                            </span>
                            <span className="text-2xl md:text-3xl font-light text-black">
                              {getChangeAmount() === 0 ? '✓' : `฿${getChangeAmount().toLocaleString()}`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Warning for insufficient amount */}
                      {receivedAmount && parseFloat(receivedAmount) < totalAmount && (
                        <div className="bg-red-50 p-4 md:p-6 rounded-lg border-2 border-red-200">
                          <div className="text-red-600 text-base md:text-lg">
                            ⚠️ จำนวนเงินไม่เพียงพอ (ขาด ฿{(totalAmount - parseFloat(receivedAmount)).toLocaleString()})
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* QR Code for Transfer Payment */}
                  {paymentMethod === 'transfer' && (
                    <div className="text-center">
                      {qrCode ? (
                        <>
                          <div className="bg-gray-100 p-3 md:p-4 rounded-lg mb-4 md:mb-6">
                            <div className="w-full bg-white rounded-lg flex items-center justify-center p-4 md:p-6">
                              <QRCode
                                value={qrCode}
                                size={window.innerWidth < 768 ? 250 : 300}
                                bgColor="#ffffff"
                                fgColor="#000000"
                              />
                            </div>
                          </div>

                          {/* Amount below QR code */}
                          <div className="mb-4 md:mb-6">
                            <div className="text-xl md:text-2xl font-light text-gray-700">
                              จำนวนเงิน: ฿{totalAmount.toLocaleString()}
                            </div>
                          </div>

                          <div className="flex items-center justify-center gap-2 text-orange-600 mt-4">
                            <Clock className="w-4 h-4" />
                            <span className="text-base md:text-lg">รอการชำระเงิน...</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center py-20">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                            <p className="text-gray-600">กำลังสร้าง QR Code...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
        </>
      </div>
    </Modal>
  );
}
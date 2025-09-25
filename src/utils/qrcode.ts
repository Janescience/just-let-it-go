import { Brand } from '@/types';

// Try different import approaches
let PromptPay: any;
try {
  PromptPay = require('promptpay-qr');
} catch {
  try {
    PromptPay = require('promptpay-qr').default;
  } catch {
    console.error('Failed to import promptpay-qr');
  }
}

export interface PaymentQRData {
  amount: number;
  brand: Brand;
  paymentMethod: 'phone' | 'idCard' | 'eWallet' | 'paotang';
}

function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
    crc &= 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTLV(tag: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return tag + length + value;
}

// PromptPay format generator ตามมาตรฐานจริง
function generatePromptPayQR(identifier: string, amount: number): string {
  // Clean identifier
  let cleanId = identifier.replace(/\D/g, '');

  if (cleanId.length === 13) {
    // National ID - use as is
  } else {
    // Phone number - แปลงเป็น format +66
    if (cleanId.startsWith('0')) {
      cleanId = '66' + cleanId.substring(1);
    } else if (!cleanId.startsWith('66')) {
      cleanId = '66' + cleanId;
    }
  }

  console.log('Clean ID:', cleanId, 'Length:', cleanId.length); // Debug

  // Build PromptPay QR ตามมาตรฐาน
  let qr = '';

  // 1. Payload Format Indicator (Tag 00)
  qr += '000201';

  // 2. Point of Initiation Method (Tag 01)
  qr += '010211';

  // 3. Merchant Account Information (Tag 29)
  // Sub-tags: 00=App ID, 01=Identifier
  const appId = 'A000000677010111';
  const idTag = '01' + cleanId.length.toString().padStart(2, '0') + cleanId;
  const appTag = '00' + appId.length.toString().padStart(2, '0') + appId;
  const merchantData = appTag + idTag;

  console.log('App Tag:', appTag); // Debug
  console.log('ID Tag:', idTag); // Debug
  console.log('Merchant Data:', merchantData, 'Length:', merchantData.length); // Debug

  qr += '29' + merchantData.length.toString().padStart(2, '0') + merchantData;

  // 4. Country Code (Tag 58)
  qr += '5802TH';

  // 5. Transaction Currency (Tag 53)
  qr += '5303764';

  // 6. Transaction Amount (Tag 54) - ใส่เฉพาะเมื่อมี amount
  if (amount > 0) {
    const amountStr = amount.toFixed(2);
    qr += '54' + amountStr.length.toString().padStart(2, '0') + amountStr;
  }

  // 7. CRC (Tag 63)
  qr += '6304';
  const crc = crc16(qr);
  qr = qr.substring(0, qr.length - 4) + '6304' + crc;

  console.log('Final QR:', qr); // Debug

  return qr;
}

export function generatePaymentQRString(data: PaymentQRData): string | null {
  const { amount, brand, paymentMethod } = data;

  console.log('Generate QR - Input:', { amount, paymentMethod, paymentInfo: brand.paymentInfo });

  if (!brand.paymentInfo) {
    console.log('No payment info found');
    return null;
  }

  const paymentInfo = brand.paymentInfo;

  try {
    let identifier = '';

    switch (paymentMethod) {
      case 'phone':
        if (!paymentInfo.phone) {
          console.log('No phone found');
          return null;
        }
        identifier = paymentInfo.phone;
        break;

      case 'idCard':
        if (!paymentInfo.idCard) {
          console.log('No idCard found');
          return null;
        }
        identifier = paymentInfo.idCard;
        break;

      case 'paotang':
        if (!paymentInfo.paotang) {
          console.log('No paotang found');
          return null;
        }
        identifier = paymentInfo.paotang;
        break;

      case 'eWallet':
        if (!paymentInfo.eWallet) {
          console.log('No eWallet found');
          return null;
        }
        // ลอง PromptPay format ถ้าเป็นตัวเลข
        if (paymentInfo.eWallet.match(/^[0-9-]+$/)) {
          identifier = paymentInfo.eWallet;
        } else {
          // Fallback สำหรับ e-wallet อื่นๆ
          console.log('Using simple format for eWallet');
          return `${paymentInfo.eWallet}:${amount}`;
        }
        break;

      default:
        console.log('Invalid payment method:', paymentMethod);
        return null;
    }

    console.log('Generating QR for:', identifier, 'amount:', amount);

    // ใช้ library ที่ proven แล้ว
    console.log('PromptPay object:', PromptPay);
    console.log('Available methods:', Object.keys(PromptPay || {}));

    let qrPayload;
    if (PromptPay && typeof PromptPay.generatePayload === 'function') {
      qrPayload = PromptPay.generatePayload(identifier, { amount });
    } else if (PromptPay && typeof PromptPay === 'function') {
      // Maybe it's the function directly
      qrPayload = PromptPay(identifier, { amount });
    } else {
      throw new Error('PromptPay library not properly loaded');
    }

    console.log('Generated QR payload:', qrPayload);
    return qrPayload;

  } catch (error) {
    console.error('Error generating PromptPay QR:', error, error.message);
    return null;
  }
}

export function getAvailablePaymentMethods(brand: Brand): string[] {
  if (!brand.paymentInfo) return [];

  const methods: string[] = [];
  const paymentInfo = brand.paymentInfo;

  if (paymentInfo.phone) methods.push('phone');
  if (paymentInfo.idCard) methods.push('idCard');
  if (paymentInfo.eWallet) methods.push('eWallet');
  if (paymentInfo.paotang) methods.push('paotang');

  return methods;
}

export function getPaymentMethodLabel(method: string): string {
  const labels: { [key: string]: string } = {
    phone: 'PromptPay (เบอร์โทร)',
    idCard: 'PromptPay (บัตรประชาชน)',
    eWallet: 'E-Wallet',
    paotang: 'เป๋าตัง'
  };

  return labels[method] || method;
}

export function getPaymentMethodInfo(brand: Brand, method: string): string | null {
  if (!brand.paymentInfo) return null;

  const paymentInfo = brand.paymentInfo;

  switch (method) {
    case 'phone':
      return paymentInfo.phone || null;
    case 'idCard':
      return paymentInfo.idCard || null;
    case 'eWallet':
      return paymentInfo.eWallet || null;
    case 'paotang':
      return paymentInfo.paotang || null;
    default:
      return null;
  }
}
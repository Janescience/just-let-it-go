/**
 * Simple Thailand timezone utility
 *
 * ทุกอย่างใช้ Thailand timezone หมด ไม่ต้องแปลงไปมา
 * - ตอนบันทึก: ใช้ now()
 * - ตอนแสดง: ใช้ formatDate() หรือ formatDateTime()
 */

/**
 * ใช้แทน new Date() เพื่อให้ได้เวลาไทยเสมอ
 * ใช้วิธีเดียวกับที่ production ใช้ และได้ผลจริง
 */
export function now(): Date {
  const currentTime = new Date();
  // ถ้า server อยู่ในไทยแล้ว ใช้เวลาปัจจุบัน
  // ถ้า server อยู่ UTC (เช่น Vercel) ให้บวก 7 ชั่วโมง
  // if (serverTimezone === 'Asia/Bangkok') {
  //   return currentTime;
  // } else {
    // สมมติว่า server เป็น UTC, บวก 7 ชั่วโมงสำหรับไทย
    const thailandOffset = 7 * 60 * 60 * 1000;
    return new Date(currentTime.getTime() + thailandOffset);
  // }
}

/**
 * Format date เป็น DD-MM-YYYY
 * @param date - Date object หรือ string
 * @returns วันที่ในรูปแบบ DD-MM-YYYY
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Format time เป็น HH:mm:ss
 * @param date - Date object หรือ string
 * @returns เวลาในรูปแบบ HH:mm:ss (24hr)
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format date และ time เป็น DD-MM-YYYY HH:mm:ss
 * @param date - Date object หรือ string
 * @returns วันที่และเวลาในรูปแบบ DD-MM-YYYY HH:mm:ss
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * Format date เป็น DD-MM-YYYY HH:mm (ไม่มีวินาที)
 * @param date - Date object หรือ string
 * @returns วันที่และเวลาในรูปแบบ DD-MM-YYYY HH:mm
 */
export function formatDateTimeShort(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

/**
 * Format date to YYYY-MM-DD (for input fields and date comparisons)
 * @param date - Date object หรือ string
 * @returns วันที่ในรูปแบบ YYYY-MM-DD
 */
export function formatDateISO(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * แสดงวันเวลาจาก DB โดยตรง (DB เก็บเวลาไทยแล้ว ไม่ต้องแปลง)
 * ใช้สำหรับแสดง createdAt, updatedAt จาก DB
 * @param date - Date object หรือ string
 * @returns วันที่และเวลาในรูปแบบ DD/MM/YYYY HH:mm
 */
export function displayDateTime(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * แสดงวันที่จาก DB โดยตรง (DB เก็บเวลาไทยแล้ว ไม่ต้องแปลง)
 * ใช้สำหรับแสดง createdAt, updatedAt จาก DB
 * @param date - Date object หรือ string
 * @returns วันที่ในรูปแบบ DD/MM/YYYY
 */
export function displayDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Migration utility: แปลง UTC เป็น Thailand time สำหรับข้อมูลเก่า
 */
export function migrateUtcToThailand(utcDate: Date): Date {
  return new Date(utcDate.getTime() + (7 * 3600000));
}
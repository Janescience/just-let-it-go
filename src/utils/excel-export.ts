import { AccountingTransaction, AccountingFilterCriteria } from '@/types/accounting';
import * as XLSX from 'xlsx';

export interface DailyTransaction {
  date: string;
  transactions: AccountingTransaction[];
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

export function groupTransactionsByDate(transactions: AccountingTransaction[]): DailyTransaction[] {
  const grouped = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.date).toISOString().split('T')[0];

    if (!acc[date]) {
      acc[date] = {
        date,
        transactions: [],
        totalIncome: 0,
        totalExpense: 0,
        netAmount: 0
      };
    }

    acc[date].transactions.push(transaction);

    if (transaction.type === 'income') {
      acc[date].totalIncome += transaction.amount;
    } else {
      acc[date].totalExpense += transaction.amount;
    }

    acc[date].netAmount = acc[date].totalIncome - acc[date].totalExpense;

    return acc;
  }, {} as Record<string, DailyTransaction>);

  return Object.values(grouped).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function formatThaiDate(date: string): string {
  return new Date(date).toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function exportToExcel(
  dailyTransactions: DailyTransaction[],
  incomeCategories: Record<string, string>,
  expenseCategories: Record<string, string>,
  filterInfo: string,
  filterCriteria: AccountingFilterCriteria,
  booths?: any[]
) {
  // Group data for multiple sheets based on filter type
  const sheets = createSheetsData(dailyTransactions, filterCriteria, booths);

  // Create summary sheet data
  const summarySheet = createSummarySheet(dailyTransactions, incomeCategories, expenseCategories);

  // Create workbook with multiple sheets
  const workbook = createWorkbook([summarySheet, ...sheets], incomeCategories, expenseCategories, filterInfo);

  // Download as CSV (or convert to Excel format if library available)
  downloadWorkbook(workbook, filterInfo);
}

function createSheetsData(
  dailyTransactions: DailyTransaction[],
  filterCriteria: AccountingFilterCriteria,
  booths?: any[]
): Array<{ name: string; data: DailyTransaction[] }> {
  const allTransactions = dailyTransactions.flatMap(day => day.transactions);

  switch (filterCriteria.type) {
    case 'by_booth':
      // Group by booth
      if (!booths) return [{ name: 'ทั้งหมด', data: dailyTransactions }];

      const boothGroups = booths.map(booth => {
        const boothTransactions = allTransactions.filter(tx =>
          tx.boothId && typeof tx.boothId === 'object' && 'name' in tx.boothId &&
          (tx.boothId as { _id: string })._id === booth._id
        );
        return {
          name: booth.name,
          data: groupTransactionsByDate(boothTransactions)
        };
      });
      return boothGroups.filter(group => group.data.length > 0);

    case 'by_month':
    case 'by_quarter':
    case 'by_half_year':
    case 'by_year':
      // Group by month for all these types
      return groupByMonths(allTransactions);

    case 'all_time':
      // Group by year
      return groupByYears(allTransactions);

    default:
      return [{ name: 'ทั้งหมด', data: dailyTransactions }];
  }
}

function groupByMonths(transactions: AccountingTransaction[]): Array<{ name: string; data: DailyTransaction[] }> {
  const monthGroups: Record<string, AccountingTransaction[]> = {};

  transactions.forEach(tx => {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = `${getThaiMonthName(date.getMonth())} ${date.getFullYear() + 543}`;

    if (!monthGroups[monthName]) {
      monthGroups[monthName] = [];
    }
    monthGroups[monthName].push(tx);
  });

  return Object.entries(monthGroups)
    .map(([name, txs]) => ({
      name,
      data: groupTransactionsByDate(txs)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function groupByYears(transactions: AccountingTransaction[]): Array<{ name: string; data: DailyTransaction[] }> {
  const yearGroups: Record<string, AccountingTransaction[]> = {};

  transactions.forEach(tx => {
    const year = new Date(tx.date).getFullYear();
    const yearName = `ปี ${year + 543}`;

    if (!yearGroups[yearName]) {
      yearGroups[yearName] = [];
    }
    yearGroups[yearName].push(tx);
  });

  return Object.entries(yearGroups)
    .map(([name, txs]) => ({
      name,
      data: groupTransactionsByDate(txs)
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getThaiMonthName(month: number): string {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  return thaiMonths[month];
}

function createSummarySheet(
  dailyTransactions: DailyTransaction[],
  incomeCategories: Record<string, string>,
  expenseCategories: Record<string, string>
): { name: string; data: DailyTransaction[]; isSummary: true } {
  // Calculate summary by categories
  const allTransactions = dailyTransactions.flatMap(day => day.transactions);

  return {
    name: 'สรุป',
    data: dailyTransactions,
    isSummary: true
  };
}

function createWorkbook(
  sheets: Array<{ name: string; data: DailyTransaction[]; isSummary?: boolean }>,
  incomeCategories: Record<string, string>,
  expenseCategories: Record<string, string>,
  filterInfo: string
): Array<{ name: string; csv: string }> {
  return sheets.map(sheet => ({
    name: sheet.name,
    csv: sheet.isSummary
      ? createSummaryCSV(sheet.data, incomeCategories, expenseCategories, filterInfo)
      : createSheetCSV(sheet.data, incomeCategories, expenseCategories, sheet.name)
  }));
}

function createSummaryCSV(
  dailyTransactions: DailyTransaction[],
  incomeCategories: Record<string, string>,
  expenseCategories: Record<string, string>,
  filterInfo: string
): string {
  const csvRows: string[] = [];
  const allTransactions = dailyTransactions.flatMap(day => day.transactions);

  // Header
  csvRows.push('สรุปรายงานบัญชี');
  csvRows.push(`ข้อมูล: ${filterInfo}`);
  csvRows.push(`วันที่สร้างรายงาน: ${new Date().toLocaleDateString('th-TH')}`);
  csvRows.push('');

  // Income summary
  csvRows.push('รายรับตามหมวดหมู่');
  csvRows.push(['หมวดหมู่', 'จำนวนเงิน'].map(escapeCSV).join(','));

  const incomeByCategory: Record<string, number> = {};
  allTransactions
    .filter(tx => tx.type === 'income')
    .forEach(tx => {
      incomeByCategory[tx.category] = (incomeByCategory[tx.category] || 0) + tx.amount;
    });

  Object.entries(incomeByCategory).forEach(([category, amount]) => {
    csvRows.push([
      escapeCSV(incomeCategories[category] || category),
      amount
    ].join(','));
  });

  const totalIncome = Object.values(incomeByCategory).reduce((sum, amount) => sum + amount, 0);
  csvRows.push([escapeCSV('รวมรายรับ'), totalIncome].join(','));
  csvRows.push('');

  // Expense summary
  csvRows.push('รายจ่ายตามหมวดหมู่');
  csvRows.push(['หมวดหมู่', 'จำนวนเงิน'].map(escapeCSV).join(','));

  const expenseByCategory: Record<string, number> = {};
  allTransactions
    .filter(tx => tx.type === 'expense')
    .forEach(tx => {
      expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
    });

  Object.entries(expenseByCategory).forEach(([category, amount]) => {
    csvRows.push([
      escapeCSV(expenseCategories[category] || category),
      amount
    ].join(','));
  });

  const totalExpense = Object.values(expenseByCategory).reduce((sum, amount) => sum + amount, 0);
  csvRows.push([escapeCSV('รวมรายจ่าย'), totalExpense].join(','));
  csvRows.push('');

  // Net summary
  csvRows.push('สรุปยอดรวม');
  csvRows.push(['รายการ', 'จำนวนเงิน'].map(escapeCSV).join(','));
  const netAmount = totalIncome - totalExpense;
  csvRows.push([escapeCSV('รายรับทั้งหมด'), totalIncome].join(','));
  csvRows.push([escapeCSV('รายจ่ายทั้งหมด'), totalExpense].join(','));
  csvRows.push([escapeCSV('ยอดสุทธิ'), netAmount].join(','));
  csvRows.push([escapeCSV('สถานะ'), escapeCSV(netAmount >= 0 ? 'กำไร' : 'ขาดทุน')].join(','));

  return csvRows.join('\\n');
}

function createSheetCSV(
  dailyTransactions: DailyTransaction[],
  incomeCategories: Record<string, string>,
  expenseCategories: Record<string, string>,
  sheetName: string
): string {
  const csvRows: string[] = [];

  // Header
  csvRows.push(`รายงานบัญชี - ${sheetName}`);
  csvRows.push(`วันที่สร้างรายงาน: ${new Date().toLocaleDateString('th-TH')}`);
  csvRows.push('');

  // Column headers
  csvRows.push([
    'วันที่',
    'รายการ',
    'หมวดหมู่',
    'วิธีจ่าย',
    'หน้าร้าน',
    'เดบิต (รายจ่าย)',
    'เครดิต (รายรับ)',
    'หมายเหตุ'
  ].map(escapeCSV).join(','));

  // Data rows (same as original implementation)
  dailyTransactions.forEach(dailyTx => {
    const dateStr = formatThaiDate(dailyTx.date);

    if (dailyTx.transactions.length === 0) return;

    csvRows.push([
      escapeCSV(dateStr),
      escapeCSV('สรุปรายวัน'),
      '',
      '',
      '',
      dailyTx.totalExpense,
      dailyTx.totalIncome,
      dailyTx.netAmount
    ].join(','));

    dailyTx.transactions.forEach(tx => {
      const categoryName = tx.type === 'income'
        ? incomeCategories[tx.category] || tx.category
        : expenseCategories[tx.category] || tx.category;

      const boothName = tx.boothId && typeof tx.boothId === 'object' && 'name' in tx.boothId
        ? (tx.boothId as { name: string }).name
        : '';

      const paymentMethodThai = tx.paymentMethod === 'cash' ? 'เงินสด' :
                               tx.paymentMethod === 'transfer' ? 'เงินโอน' :
                               tx.paymentMethod || '';

      csvRows.push([
        '',
        escapeCSV(tx.description),
        escapeCSV(categoryName),
        escapeCSV(paymentMethodThai),
        escapeCSV(boothName),
        tx.type === 'expense' ? tx.amount : '',
        tx.type === 'income' ? tx.amount : '',
        escapeCSV(tx.type === 'income' ? 'รายรับ' : 'รายจ่าย')
      ].join(','));
    });

    csvRows.push('');
  });

  // Grand totals
  const grandTotalIncome = dailyTransactions.reduce((sum, day) => sum + day.totalIncome, 0);
  const grandTotalExpense = dailyTransactions.reduce((sum, day) => sum + day.totalExpense, 0);
  const grandNetAmount = grandTotalIncome - grandTotalExpense;

  csvRows.push('');
  csvRows.push([
    escapeCSV('รวมทั้งหมด'),
    '',
    '',
    '',
    '',
    grandTotalExpense,
    grandTotalIncome,
    grandNetAmount
  ].join(','));

  return csvRows.join('\\n');
}

function downloadWorkbook(
  workbook: Array<{ name: string; csv: string }>,
  filterInfo: string
) {
  // Always download as single Excel file with multiple sheets
  const excelData = createExcelWorkbook(workbook);
  const blob = new Blob([excelData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  downloadFile(blob, `รายงานบัญชี_${filterInfo}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

function createExcelWorkbook(workbook: Array<{ name: string; csv: string }>): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  workbook.forEach(sheet => {
    // Parse CSV data to create worksheet
    const csvLines = sheet.csv.split('\\n');
    const data: any[][] = [];

    csvLines.forEach(line => {
      if (line.trim()) {
        // Simple CSV parsing - split by comma and remove quotes
        const row = line.split(',').map((cell, index) => {
          let value = cell.trim();
          // Remove surrounding quotes if present
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
            // Unescape doubled quotes
            value = value.replace(/""/g, '"');
          }

          // Convert numeric strings to numbers for amount columns
          // Check if it's a pure number (including negative numbers)
          if (/^-?\d+(\.\d+)?$/.test(value)) {
            return parseFloat(value);
          }

          return value;
        });
        data.push(row);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const colWidths = [];
    for (let i = 0; i < 8; i++) {
      colWidths.push({ wch: 20 });
    }
    ws['!cols'] = colWidths;

    // Format number columns to show currency format in Excel
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        const cell = ws[cell_address];
        if (cell && typeof cell.v === 'number') {
          // Apply number format for currency columns
          cell.z = '#,##0.00';
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

function downloadFile(blob: Blob, filename: string) {
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

function escapeCSV(value: string): string {
  if (typeof value !== 'string') return '';

  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}
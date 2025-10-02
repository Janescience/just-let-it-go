import { AccountingFilterCriteria } from '@/types/accounting';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function getDateRangeFromCriteria(criteria: AccountingFilterCriteria): DateRange | null {
  const now = new Date();
  const currentYear = now.getFullYear();

  switch (criteria.type) {
    case 'by_booth':
      // ไม่มี date range สำหรับ by_booth - แสดงข้อมูลทั้งหมดของบูธ
      return null;

    case 'by_month':
      if (criteria.month && criteria.year) {
        const startDate = new Date(criteria.year, criteria.month - 1, 1);
        const endDate = new Date(criteria.year, criteria.month, 0, 23, 59, 59, 999);
        return { startDate, endDate };
      }
      return null;

    case 'by_quarter':
      if (criteria.quarter && criteria.quarterYear) {
        const quarterStartMonth = (criteria.quarter - 1) * 3;
        const startDate = new Date(criteria.quarterYear, quarterStartMonth, 1);
        const endDate = new Date(criteria.quarterYear, quarterStartMonth + 3, 0, 23, 59, 59, 999);
        return { startDate, endDate };
      }
      return null;

    case 'by_half_year':
      if (criteria.halfYear && criteria.halfYearYear) {
        if (criteria.halfYear === 'first') {
          // ม.ค. - มิ.ย.
          const startDate = new Date(criteria.halfYearYear, 0, 1);
          const endDate = new Date(criteria.halfYearYear, 6, 0, 23, 59, 59, 999);
          return { startDate, endDate };
        } else {
          // ก.ค. - ธ.ค.
          const startDate = new Date(criteria.halfYearYear, 6, 1);
          const endDate = new Date(criteria.halfYearYear, 12, 0, 23, 59, 59, 999);
          return { startDate, endDate };
        }
      }
      return null;

    case 'by_year':
      if (criteria.selectedYear) {
        const startDate = new Date(criteria.selectedYear, 0, 1);
        const endDate = new Date(criteria.selectedYear, 12, 0, 23, 59, 59, 999);
        return { startDate, endDate };
      }
      return null;

    case 'all_time':
      // Return null to indicate no date filtering
      return null;

    default:
      return null;
  }
}

export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  const startYear = 2020; // หรือปีที่เริ่มธุรกิจ
  const years = [];

  for (let year = currentYear; year >= startYear; year--) {
    years.push(year);
  }

  return years;
}

export function getCurrentQuarter(): number {
  const month = new Date().getMonth() + 1;
  return Math.ceil(month / 3);
}

export function getCurrentHalfYear(): 'first' | 'second' {
  const month = new Date().getMonth() + 1;
  return month <= 6 ? 'first' : 'second';
}

export function getDefaultCriteriaForType(type: AccountingFilterCriteria['type']): AccountingFilterCriteria {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const base: AccountingFilterCriteria = {
    type
  };

  switch (type) {
    case 'by_booth':
      return {
        ...base,
        boothId: 'all'
      };

    case 'by_month':
      return {
        ...base,
        month: currentMonth,
        year: currentYear
      };

    case 'by_quarter':
      return {
        ...base,
        quarter: getCurrentQuarter(),
        quarterYear: currentYear
      };

    case 'by_half_year':
      return {
        ...base,
        halfYear: getCurrentHalfYear(),
        halfYearYear: currentYear
      };

    case 'by_year':
      return {
        ...base,
        selectedYear: currentYear
      };

    case 'all_time':
      return base;

    default:
      return base;
  }
}

export function buildQueryParamsFromCriteria(criteria: AccountingFilterCriteria): URLSearchParams {
  const params = new URLSearchParams();

  // Add filter type
  params.append('filterType', criteria.type);


  // Add booth filter for by_booth type
  if (criteria.type === 'by_booth' && criteria.boothId && criteria.boothId !== 'all') {
    params.append('boothId', criteria.boothId);
  }

  // Add date range based on criteria type
  const dateRange = getDateRangeFromCriteria(criteria);
  if (dateRange) {
    params.append('startDate', dateRange.startDate.toISOString().split('T')[0]);
    params.append('endDate', dateRange.endDate.toISOString().split('T')[0]);
  }

  return params;
}
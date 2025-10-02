import React, { useState, useEffect } from 'react';
import {
  AccountingFilterCriteria,
  FilterCriteriaType,
  FILTER_CRITERIA_LABELS,
  QUARTER_LABELS,
  HALF_YEAR_LABELS,
  THAI_MONTHS
} from '@/types';

interface Booth {
  _id: string;
  name: string;
}
import {
  getAvailableYears,
  getDefaultCriteriaForType
} from '@/utils/accounting-filters';

interface AccountingFilterPanelProps {
  criteria: AccountingFilterCriteria;
  onCriteriaChange: (criteria: AccountingFilterCriteria) => void;
  booths: Booth[];
}

export function AccountingFilterPanel({
  criteria,
  onCriteriaChange,
  booths
}: AccountingFilterPanelProps) {
  const availableYears = getAvailableYears();

  const handleTypeChange = (type: FilterCriteriaType) => {
    const defaultCriteria = getDefaultCriteriaForType(type);
    onCriteriaChange(defaultCriteria);
  };

  const updateCriteria = (updates: Partial<AccountingFilterCriteria>) => {
    onCriteriaChange({ ...criteria, ...updates });
  };

  const renderTypeSpecificFilters = () => {
    switch (criteria.type) {
      case 'by_booth':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                หน้าร้าน
              </label>
              <select
                value={criteria.boothId || 'all'}
                onChange={(e) => updateCriteria({ boothId: e.target.value })}
                className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
              >
                <option value="all">ทุกหน้าร้าน</option>
                {booths.map(booth => (
                  <option key={booth._id} value={booth._id}>{booth.name}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'by_month':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                เดือน
              </label>
              <select
                value={criteria.month || new Date().getMonth() + 1}
                onChange={(e) => updateCriteria({ month: parseInt(e.target.value) })}
                className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
              >
                {THAI_MONTHS.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                ปี
              </label>
              <select
                value={criteria.year || new Date().getFullYear()}
                onChange={(e) => updateCriteria({ year: parseInt(e.target.value) })}
                className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year + 543}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'by_quarter':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                ไตรมาส
              </label>
              <select
                value={criteria.quarter || Math.ceil((new Date().getMonth() + 1) / 3)}
                onChange={(e) => updateCriteria({ quarter: parseInt(e.target.value) })}
                className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
              >
                {Object.entries(QUARTER_LABELS).map(([quarter, label]) => (
                  <option key={quarter} value={quarter}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                ปี
              </label>
              <select
                value={criteria.quarterYear || new Date().getFullYear()}
                onChange={(e) => updateCriteria({ quarterYear: parseInt(e.target.value) })}
                className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year + 543}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'by_half_year':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                ครึ่งปี
              </label>
              <select
                value={criteria.halfYear || (new Date().getMonth() + 1 <= 6 ? 'first' : 'second')}
                onChange={(e) => updateCriteria({ halfYear: e.target.value as 'first' | 'second' })}
                className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
              >
                {Object.entries(HALF_YEAR_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                ปี
              </label>
              <select
                value={criteria.halfYearYear || new Date().getFullYear()}
                onChange={(e) => updateCriteria({ halfYearYear: parseInt(e.target.value) })}
                className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year + 543}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'by_year':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-light text-gray-400 mb-2 tracking-wider uppercase">
                ปี
              </label>
              <select
                value={criteria.selectedYear || new Date().getFullYear()}
                onChange={(e) => updateCriteria({ selectedYear: parseInt(e.target.value) })}
                className="w-full border-0 border-b border-gray-200 rounded-none bg-transparent text-sm font-light text-gray-600 focus:border-black focus:outline-none"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year + 543}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'all_time':
        return (
          <div className="text-sm font-light text-gray-500 py-4">
            แสดงข้อมูลทั้งหมดตั้งแต่เริ่มธุรกิจ
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-6 border-b border-gray-100">
      {/* Filter Type Selection */}
      <div>
        <label className="block text-xs font-light text-gray-400 mb-3 tracking-wider uppercase">
          ประเภทการดูข้อมูล
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {(Object.entries(FILTER_CRITERIA_LABELS) as [FilterCriteriaType, string][]).map(([type, label]) => (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`px-3 py-2 text-xs font-light border transition-colors duration-200 ${
                criteria.type === type
                  ? 'border-black bg-black text-white'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Type-specific filters */}
      {renderTypeSpecificFilters()}

    </div>
  );
}
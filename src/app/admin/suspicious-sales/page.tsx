'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Check, X, RefreshCw, Download, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SuspiciousSale {
  _id: string;
  boothId: string;
  boothName: string;
  totalAmount: number;
  originalTime: string;
  originalTimeDisplay: string;
  correctedTime: string;
  correctedTimeDisplay: string;
  boothHours: string;
  wouldBeInsideHours: boolean;
  recommendCorrection: boolean;
}

export default function SuspiciousSalesPage() {
  const { user } = useAuth();
  const [suspiciousSales, setSuspiciousSales] = useState<SuspiciousSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [correcting, setCorrecting] = useState(false);
  const [stats, setStats] = useState({
    totalSalesChecked: 0,
    suspiciousCount: 0
  });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchSuspiciousSales();
    }
  }, [user]);

  const fetchSuspiciousSales = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/suspicious-sales', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSuspiciousSales(data.suspiciousSales || []);
        setStats({
          totalSalesChecked: data.totalSalesChecked || 0,
          suspiciousCount: data.suspiciousCount || 0
        });
      } else {
        alert('Failed to fetch suspicious sales');
      }
    } catch (error) {
      console.error('Error fetching suspicious sales:', error);
      alert('Error fetching suspicious sales');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedSales.size === suspiciousSales.length) {
      setSelectedSales(new Set());
    } else {
      setSelectedSales(new Set(suspiciousSales.map(sale => sale._id)));
    }
  };

  const handleSelectRecommended = () => {
    const recommendedIds = suspiciousSales
      .filter(sale => sale.recommendCorrection)
      .map(sale => sale._id);
    setSelectedSales(new Set(recommendedIds));
  };

  const handleSelectSale = (saleId: string) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const handleCorrectSales = async (dryRun: boolean = true) => {
    if (selectedSales.size === 0) {
      alert('Please select sales to correct');
      return;
    }

    const action = dryRun ? 'preview' : 'apply';
    const confirmMessage = dryRun
      ? `Preview timezone correction for ${selectedSales.size} sales?`
      : `Are you sure you want to apply timezone correction to ${selectedSales.size} sales? This cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    setCorrecting(true);
    try {
      const response = await fetch('/api/admin/suspicious-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          saleIds: Array.from(selectedSales),
          dryRun
        })
      });

      if (response.ok) {
        const data = await response.json();

        if (dryRun) {
          // Show preview results
          const message = `Preview Results:\n\n` +
            `✓ ${data.results.corrected} sales would be corrected\n` +
            `✗ ${data.results.errors} errors\n\n` +
            `Click "Apply Changes" to execute the correction.`;
          alert(message);
        } else {
          // Show actual results and refresh
          const message = `Correction Applied:\n\n` +
            `✓ ${data.results.corrected} sales corrected\n` +
            `✗ ${data.results.errors} errors`;
          alert(message);

          // Refresh the list
          setSelectedSales(new Set());
          await fetchSuspiciousSales();
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error correcting sales:', error);
      alert('Error correcting sales');
    } finally {
      setCorrecting(false);
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-light text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Super Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-light text-gray-900 mb-2">Suspicious Sales Detection</h1>
          <p className="text-gray-600">
            Sales that occurred outside booth operating hours (likely UTC timestamps)
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500">Total Sales Checked</div>
            <div className="text-2xl font-light text-gray-900">{stats.totalSalesChecked.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500">Suspicious Sales</div>
            <div className="text-2xl font-light text-red-600">{stats.suspiciousCount.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500">Recommended for Correction</div>
            <div className="text-2xl font-light text-orange-600">
              {suspiciousSales.filter(s => s.recommendCorrection).length.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={fetchSuspiciousSales}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <div className="border-l border-gray-200 pl-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800 mr-4"
              >
                {selectedSales.size === suspiciousSales.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleSelectRecommended}
                className="text-sm text-orange-600 hover:text-orange-800"
              >
                Select Recommended ({suspiciousSales.filter(s => s.recommendCorrection).length})
              </button>
            </div>

            {selectedSales.size > 0 && (
              <div className="border-l border-gray-200 pl-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedSales.size} selected
                </span>
                <button
                  onClick={() => handleCorrectSales(true)}
                  disabled={correcting}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 disabled:opacity-50"
                >
                  <Download className="w-3 h-3" />
                  Preview
                </button>
                <button
                  onClick={() => handleCorrectSales(false)}
                  disabled={correcting}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 disabled:opacity-50"
                >
                  <Upload className="w-3 h-3" />
                  Apply Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sales List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading suspicious sales...</p>
            </div>
          ) : suspiciousSales.length === 0 ? (
            <div className="p-8 text-center">
              <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500">No suspicious sales found!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedSales.size === suspiciousSales.length && suspiciousSales.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booth</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Before Migration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">After Migration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booth Hours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {suspiciousSales.map((sale) => (
                    <tr
                      key={sale._id}
                      className={`hover:bg-gray-50 ${sale.recommendCorrection ? 'bg-orange-25' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedSales.has(sale._id)}
                          onChange={() => handleSelectSale(sale._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{sale.boothName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">฿{sale.totalAmount.toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="text-sm text-red-600 font-mono">{sale.originalTimeDisplay}</div>
                            <div className="text-xs text-gray-500">{new Date(sale.originalTime).toLocaleDateString('th-TH')}</div>
                          </div>
                          <div className="text-red-500" title="Outside booth hours">
                            <X className="w-4 h-4" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className={`text-sm font-mono ${sale.wouldBeInsideHours ? 'text-green-600' : 'text-orange-600'}`}>
                              {sale.correctedTimeDisplay}
                            </div>
                            <div className="text-xs text-gray-500">{new Date(sale.correctedTime).toLocaleDateString('th-TH')}</div>
                          </div>
                          {sale.wouldBeInsideHours ? (
                            <div className="text-green-500" title="Within booth hours">
                              <Check className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="text-orange-500" title="Still outside hours">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600 font-mono">{sale.boothHours}</div>
                      </td>
                      <td className="px-4 py-3">
                        {sale.recommendCorrection ? (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <span className="text-xs text-orange-600">Recommended</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">Review</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help */}
        <div className="mt-6 bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Suspicious Sales:</strong> Sales that occurred outside booth operating hours</li>
            <li>• <strong>Recommended:</strong> Sales that would be within hours if corrected (+7 hours)</li>
            <li>• <strong>Preview:</strong> Shows what would happen without making changes</li>
            <li>• <strong>Apply Changes:</strong> Permanently corrects the selected sales timestamps</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
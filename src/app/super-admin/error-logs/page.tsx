'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, XCircle, Eye, Filter, RefreshCw, Trash2, Search, Calendar, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ErrorLog {
  _id: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  errorCode?: string;
  stack?: string;
  context: {
    module: string;
    function: string;
    userId?: string;
    brandId?: string;
    boothId?: string;
    saleId?: string;
    transactionId?: string;
    additionalData?: any;
  };
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ErrorLogsResponse {
  success: boolean;
  data: {
    errorLogs: ErrorLog[];
    pagination: {
      current: number;
      total: number;
      limit: number;
      totalRecords: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    statistics: {
      total: number;
      unresolved: number;
      resolved: number;
      byLevel: Record<string, { total: number; unresolved: number }>;
      byModule: Record<string, { total: number; unresolved: number }>;
    };
  };
}

export default function ErrorLogsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());

  // Filters
  const [filters, setFilters] = useState({
    level: '',
    module: '',
    resolved: '',
    search: '',
    startDate: '',
    endDate: '',
    page: 1
  });

  const [showFilters, setShowFilters] = useState(false);
  const [resolveModal, setResolveModal] = useState<{
    show: boolean;
    errorIds: string[];
    action: 'resolve' | 'unresolve';
  }>({ show: false, errorIds: [], action: 'resolve' });
  const [resolveNotes, setResolveNotes] = useState('');

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchErrorLogs();
    }
  }, [user, filters]);

  const fetchErrorLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await fetch(`/api/admin/error-logs?${params}`);
      if (response.ok) {
        const data: ErrorLogsResponse = await response.json();
        setErrorLogs(data.data.errorLogs);
        setStatistics(data.data.statistics);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectError = (errorId: string) => {
    const newSelected = new Set(selectedErrors);
    if (newSelected.has(errorId)) {
      newSelected.delete(errorId);
    } else {
      newSelected.add(errorId);
    }
    setSelectedErrors(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedErrors.size === errorLogs.length) {
      setSelectedErrors(new Set());
    } else {
      setSelectedErrors(new Set(errorLogs.map(log => log._id)));
    }
  };

  const handleResolveErrors = async () => {
    try {
      const response = await fetch('/api/admin/error-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorIds: resolveModal.errorIds,
          action: resolveModal.action,
          notes: resolveNotes
        })
      });

      if (response.ok) {
        await fetchErrorLogs();
        setSelectedErrors(new Set());
        setResolveModal({ show: false, errorIds: [], action: 'resolve' });
        setResolveNotes('');
      }
    } catch (error) {
      console.error('Error updating error logs:', error);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH');
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Super Admin access required</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/super-admin')}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>กลับไปหน้าหลัก</span>
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Error Logs Management</h1>
          <p className="text-gray-600">Monitor and manage system errors across all brands</p>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total Errors</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Unresolved</p>
                  <p className="text-2xl font-bold text-red-600">{statistics.unresolved}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.resolved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {statistics.total > 0 ? Math.round((statistics.resolved / statistics.total) * 100) : 0}%
                  </p>
                </div>
                <RefreshCw className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>

              <button
                onClick={fetchErrorLogs}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {selectedErrors.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedErrors.size} selected
                </span>
                <button
                  onClick={() => setResolveModal({
                    show: true,
                    errorIds: Array.from(selectedErrors),
                    action: 'resolve'
                  })}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Resolve
                </button>
                <button
                  onClick={() => setResolveModal({
                    show: true,
                    errorIds: Array.from(selectedErrors),
                    action: 'unresolve'
                  })}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                >
                  Unresolve
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value, page: 1 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                  <option value="debug">Debug</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                <select
                  value={filters.module}
                  onChange={(e) => setFilters({ ...filters, module: e.target.value, page: 1 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  <option value="sales">Sales</option>
                  <option value="accounting">Accounting</option>
                  <option value="inventory">Inventory</option>
                  <option value="payment">Payment</option>
                  <option value="auth">Auth</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.resolved}
                  onChange={(e) => setFilters({ ...filters, resolved: e.target.value, page: 1 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  <option value="false">Unresolved</option>
                  <option value="true">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search message..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedErrors.size === errorLogs.length && errorLogs.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module / Function
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-500">Loading...</span>
                      </div>
                    </td>
                  </tr>
                ) : errorLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No error logs found
                    </td>
                  </tr>
                ) : (
                  errorLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedErrors.has(log._id)}
                          onChange={() => handleSelectError(log._id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getLevelIcon(log.level)}
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(log.level)}`}>
                            {log.level.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{log.context.module}</div>
                          <div className="text-gray-500">{log.context.function}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate" title={log.message}>
                          {log.message}
                        </div>
                        {log.errorCode && (
                          <div className="text-xs text-gray-500 mt-1">{log.errorCode}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {log.resolved ? (
                          <div className="flex items-center text-sm text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Resolved
                            {log.resolvedBy && (
                              <div className="text-xs text-gray-500 mt-1">
                                by {log.resolvedBy}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-red-600">
                            <XCircle className="w-4 h-4 mr-1" />
                            Unresolved
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total > 1 && (
            <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current - 1) * pagination.limit) + 1} to {Math.min(pagination.current * pagination.limit, pagination.totalRecords)} of {pagination.totalRecords} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 bg-white border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.current} of {pagination.total}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 bg-white border border-gray-300 rounded text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resolve Modal */}
        {resolveModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {resolveModal.action === 'resolve' ? 'Resolve' : 'Unresolve'} Error Logs
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {resolveModal.action === 'resolve'
                  ? `Mark ${resolveModal.errorIds.length} error log(s) as resolved?`
                  : `Mark ${resolveModal.errorIds.length} error log(s) as unresolved?`
                }
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Add notes about the resolution..."
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setResolveModal({ show: false, errorIds: [], action: 'resolve' })}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveErrors}
                  className={`px-4 py-2 text-white rounded-md ${
                    resolveModal.action === 'resolve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {resolveModal.action === 'resolve' ? 'Resolve' : 'Unresolve'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
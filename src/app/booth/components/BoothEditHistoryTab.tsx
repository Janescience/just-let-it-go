import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit, AlertCircle } from 'lucide-react';
import { Booth } from '@/types';
import { displayDate, displayTime } from '@/utils/timezone';

interface EditHistoryItem {
  _id: string;
  saleId: string;
  editedBy: string;
  editType: 'payment_method' | 'items' | 'amount' | 'complete_edit' | 'deletion';
  changes: {
    before: any;
    after: any;
  };
  reason: string;
  createdAt: string;
  sale: any;
}

interface BoothEditHistoryTabProps {
  booth: Booth;
}

export function BoothEditHistoryTab({ booth }: BoothEditHistoryTabProps) {
  const [groupedHistory, setGroupedHistory] = useState<{[saleId: string]: EditHistoryItem[]}>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchEditHistory = async (page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/booths/${booth._id}/edit-history?page=${page}&limit=20`);
      if (response.ok) {
        const data = await response.json();

        // Group edits by sale ID
        const grouped = data.editHistory.reduce((acc: {[saleId: string]: EditHistoryItem[]}, item: EditHistoryItem) => {
          const saleId = item.saleId || `deleted-${item._id}`; // Use unique ID for deleted sales
          if (!acc[saleId]) {
            acc[saleId] = [];
          }
          acc[saleId].push(item);
          return acc;
        }, {});

        // Sort edits within each group by date (newest first)
        Object.keys(grouped).forEach(saleId => {
          grouped[saleId].sort((a: EditHistoryItem, b: EditHistoryItem) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        setGroupedHistory(grouped);
        setCurrentPage(data.pagination.currentPage);
        setTotalPages(data.pagination.totalPages);
        setHasNext(data.pagination.hasNext);
        setHasPrev(data.pagination.hasPrev);
      } else {
        console.error('Failed to fetch edit history');
      }
    } catch (error) {
      console.error('Error fetching edit history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEditHistory();
  }, [booth._id]);

  const handlePreviousPage = () => {
    if (hasPrev) {
      fetchEditHistory(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNext) {
      fetchEditHistory(currentPage + 1);
    }
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };


  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded"></div>
            </div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Edit className="w-5 h-5 text-black" />
        <h3 className="text-lg font-light text-black tracking-wider">ประวัติการแก้ไขการขาย</h3>
      </div>

      {Object.keys(groupedHistory).length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 border border-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-sm font-light text-gray-500 mb-2">ไม่มีประวัติการแก้ไข</div>
          <div className="text-xs font-light text-gray-400">ยังไม่มีการแก้ไขรายการขายในบูธนี้</div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedHistory).map(([saleId, edits]) => {
            const latestEdit = edits[0]; // Most recent edit for this sale
            return (
            <div key={saleId} className="border border-gray-200 p-4">
              {/* Sale Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center">
                    <Edit className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-light text-black tracking-wider">
                        รายการขาย #{saleId.startsWith('deleted-') ? 'ถูกลบ' : saleId.slice(-8)}
                      </span>
                      <span className="px-2 py-1 text-xs font-light rounded bg-gray-100 text-gray-600">
                        แก้ไข {edits.length} ครั้ง
                      </span>
                    </div>
                    <div className="text-xs font-light text-gray-500 mt-1 tracking-wider">
                      แก้ไขล่าสุด: {displayDate(latestEdit.createdAt)} {displayTime(latestEdit.createdAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleExpanded(saleId)}
                  className="px-3 py-1 text-xs font-light border border-gray-300 rounded hover:bg-gray-50 tracking-wider"
                >
                  {expandedItems.has(saleId) ? 'ซ่อน' : 'ดูรายละเอียด'}
                </button>
              </div>

              {/* Current Sale Data - Compact */}
              <div className="bg-gray-50 border border-gray-200 p-2 mb-2 rounded">
                {latestEdit.editType === 'deletion' || !latestEdit.changes.after || Object.keys(latestEdit.changes.after).length === 0 ? (
                  // Show deletion status
                  <div className="text-center py-2">
                    <div className="text-sm font-light text-red-600 tracking-wider mb-1">รายการถูกลบแล้ว</div>
                    <div className="text-xs font-light text-gray-500 tracking-wider">
                      ลบเมื่อ: {displayDate(latestEdit.createdAt)} {displayTime(latestEdit.createdAt)}
                    </div>
                  </div>
                ) : (
                  // Show current sale data
                  <>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-light text-gray-600 tracking-wider">ขายครั้งแรก: {displayDate(edits[edits.length - 1].createdAt)} {displayTime(edits[edits.length - 1].createdAt)}</span>
                      <span className="font-light text-gray-600 tracking-wider">
                        {latestEdit.changes.after?.paymentMethod === 'cash' ? 'เงินสด' : 'เงินโอน'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {latestEdit.changes.after?.items?.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="font-light text-gray-700 tracking-wider">{item.menuItemName}</span>
                          <span className="font-light text-gray-600 tracking-wider">{item.quantity} x ฿{item.price}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-300 pt-1 flex justify-between text-sm font-thin">
                        <span className="font-light text-gray-700 tracking-wider">รวม ฿{latestEdit.changes.after?.totalAmount?.toLocaleString() || '0'}</span>
                        <span className="text-xs font-light text-gray-500 tracking-wider">แก้ไข {edits.length} ครั้ง</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Expanded details - Show all edits for this sale */}
              {expandedItems.has(saleId) && (
                <div className="border-t border-gray-100 pt-2">
                  {/* Edit History */}
                  <div>
                    <h4 className="font-light text-sm text-gray-700 mb-2 tracking-wider">ประวัติการแก้ไข:</h4>
                    <div className="space-y-2">
                      {edits.map((edit, index) => (
                        <div key={edit._id} className="border border-gray-100 p-2 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-light tracking-wider">#{index + 1}</span>
                              <span className="text-xs font-light tracking-wider">{edit.editedBy}</span>
                              {edit.reason && (
                                <span className="text-xs font-light text-gray-500 tracking-wider">- {edit.reason}</span>
                              )}
                            </div>
                            <span className="text-xs font-light text-gray-500 tracking-wider">
                              {displayDate(edit.createdAt)} {displayTime(edit.createdAt)}
                            </span>
                          </div>

                          {/* Before/After for this specific edit - More compact */}
                          {edit.editType === 'deletion' || !edit.changes.after || Object.keys(edit.changes.after).length === 0 ? (
                            // Show deletion details
                            <div className="border border-red-200 p-1.5 rounded bg-red-50">
                              <div className="text-xs font-light text-red-600 mb-0.5 tracking-wider">รายการที่ถูกลบ:</div>
                              <div className="space-y-0.5 text-xs">
                                {edit.changes.before?.items?.map((item: any, idx: number) => (
                                  <div key={idx} className="flex justify-between">
                                    <span>{item.menuItemName}</span>
                                    <span>{item.quantity}x฿{item.price}</span>
                                  </div>
                                ))}
                                <div className="border-t border-red-300 pt-0.5 text-xs font-light text-right tracking-wider">
                                  ฿{edit.changes.before?.totalAmount?.toLocaleString() || '0'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Show before/after for edits
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div className="border border-gray-200 p-1.5 rounded">
                                <div className="text-xs font-light text-gray-600 mb-0.5 tracking-wider">ก่อน:</div>
                                <div className="space-y-0.5 text-xs">
                                  {edit.changes.before?.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>{item.menuItemName}</span>
                                      <span>{item.quantity}x฿{item.price}</span>
                                    </div>
                                  ))}
                                  <div className="border-t pt-0.5 text-xs font-light text-right tracking-wider">
                                    ฿{edit.changes.before?.totalAmount?.toLocaleString() || '0'}
                                  </div>
                                </div>
                              </div>

                              <div className="border border-green-200 p-1.5 rounded bg-green-50">
                                <div className="text-xs font-light text-green-600 mb-0.5 tracking-wider">หลัง:</div>
                                <div className="space-y-0.5 text-xs">
                                  {edit.changes.after?.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>{item.menuItemName}</span>
                                      <span>{item.quantity}x฿{item.price}</span>
                                    </div>
                                  ))}
                                  <div className="border-t border-green-300 pt-0.5 text-xs font-light text-right tracking-wider">
                                    ฿{edit.changes.after?.totalAmount?.toLocaleString() || '0'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm font-light text-gray-500 tracking-wider">
            หน้า {currentPage} จาก {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={!hasPrev}
              className="p-2 text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextPage}
              disabled={!hasNext}
              className="p-2 text-gray-600 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
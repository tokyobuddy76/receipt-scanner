import React from 'react';
import { X, Calendar, Store, Trash2, Download, ArrowUpRight, Receipt, FileSpreadsheet } from 'lucide-react';
import { SavedReceipt } from '../types';

interface SavedReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedReceipts: SavedReceipt[];
  onSelectReceipt: (receipt: SavedReceipt) => void;
  onDeleteReceipt: (id: string) => void;
}

export const SavedReceiptsModal: React.FC<SavedReceiptsModalProps> = ({
  isOpen,
  onClose,
  savedReceipts,
  onSelectReceipt,
  onDeleteReceipt,
}) => {
  if (!isOpen) return null;

  const exportAllJson = () => {
    const blob = new Blob([JSON.stringify(savedReceipts, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllCsv = () => {
    // Generate CSV of all receipts and line items
    const rows = [
      ['Receipt ID', 'Date', 'Time', 'Merchant', 'Currency', 'Item Name', 'Qty', 'Unit Price', 'Line Total', 'Receipt Total', 'Payment Method', 'Receipt #'],
    ];

    savedReceipts.forEach((r) => {
      const d = r.data;
      if (d.items && d.items.length > 0) {
        d.items.forEach((item) => {
          rows.push([
            r.id,
            d.date || '',
            d.time || '',
            `"${(d.merchant || '').replace(/"/g, '""')}"`,
            d.currency || '$',
            `"${(item.name || '').replace(/"/g, '""')}"`,
            String(item.quantity || 1),
            item.unitPrice !== null ? String(item.unitPrice) : '',
            item.totalPrice !== null ? String(item.totalPrice) : '',
            d.total !== null ? String(d.total) : '',
            `"${(d.paymentMethod || '').replace(/"/g, '""')}"`,
            `"${(d.receiptNumber || '').replace(/"/g, '""')}"`,
          ]);
        });
      } else {
        rows.push([
          r.id,
          d.date || '',
          d.time || '',
          `"${(d.merchant || '').replace(/"/g, '""')}"`,
          d.currency || '$',
          '',
          '',
          '',
          '',
          d.total !== null ? String(d.total) : '',
          `"${(d.paymentMethod || '').replace(/"/g, '""')}"`,
          `"${(d.receiptNumber || '').replace(/"/g, '""')}"`,
        ]);
      }
    });

    const csvContent = rows.map((e) => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Saved Receipts</h2>
              <p className="text-xs text-slate-500">{savedReceipts.length} stored locally</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {savedReceipts.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={exportAllCsv}
                  title="Export to CSV"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  type="button"
                  onClick={exportAllJson}
                  title="Export to JSON"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">JSON</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of Receipts */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {savedReceipts.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <Receipt className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No saved receipts yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Scan or upload a receipt and click "Save Receipt" to review or export it here anytime.
              </p>
            </div>
          ) : (
            savedReceipts.map((r) => {
              const cur = r.data.currency || '$';
              return (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/20 transition flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {r.data.merchant || 'Untitled Merchant'}
                      </span>
                      {r.data.total !== null && (
                        <span className="font-extrabold text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50">
                          {cur}
                          {r.data.total.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {r.data.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {r.data.date}
                        </span>
                      )}
                      <span>{r.data.items?.length || 0} items</span>
                      {r.data.receiptNumber && <span>#{r.data.receiptNumber}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectReceipt(r);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteReceipt(r.id)}
                      title="Delete saved receipt"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

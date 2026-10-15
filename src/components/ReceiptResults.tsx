import React from 'react';
import {
  Store,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Save,
  ScanLine,
  CreditCard,
  Hash,
  Calculator,
  Check,
} from 'lucide-react';
import { ReceiptData, ReceiptItem } from '../types';

interface ReceiptResultsProps {
  receipt: ReceiptData;
  onChange: (updated: ReceiptData) => void;
  onSave: () => void;
  onScanAnother: () => void;
  isSaved?: boolean;
}

export const ReceiptResults: React.FC<ReceiptResultsProps> = ({
  receipt,
  onChange,
  onSave,
  onScanAnother,
  isSaved = false,
}) => {
  const currency = receipt.currency || '$';

  // Field updater helpers
  const updateField = <K extends keyof ReceiptData>(field: K, value: ReceiptData[K]) => {
    onChange({
      ...receipt,
      [field]: value,
    });
  };

  const handleNumericFieldChange = (field: keyof ReceiptData, rawValue: string) => {
    if (rawValue.trim() === '') {
      updateField(field, null as any);
      return;
    }
    const val = parseFloat(rawValue);
    updateField(field, isNaN(val) ? null : val as any);
  };

  // Item updaters
  const updateItem = (index: number, patch: Partial<ReceiptItem>) => {
    const nextItems = [...receipt.items];
    const current = nextItems[index];
    const updated = { ...current, ...patch };

    // Auto-update total price if quantity and unit price are set and user modified one of them
    if (patch.quantity !== undefined || patch.unitPrice !== undefined) {
      if (typeof updated.quantity === 'number' && typeof updated.unitPrice === 'number') {
        updated.totalPrice = Number((updated.quantity * updated.unitPrice).toFixed(2));
      }
    }

    nextItems[index] = updated;
    onChange({ ...receipt, items: nextItems });
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: 'New Item',
      quantity: 1,
      unitPrice: null,
      totalPrice: null,
    };
    onChange({
      ...receipt,
      items: [...receipt.items, newItem],
    });
  };

  const deleteItem = (index: number) => {
    const nextItems = receipt.items.filter((_, i) => i !== index);
    onChange({
      ...receipt,
      items: nextItems,
    });
  };

  // Helper to recalculate subtotal and total from item lines
  const recalculateFromItems = () => {
    let itemsSum = 0;
    receipt.items.forEach((item) => {
      if (typeof item.totalPrice === 'number') {
        itemsSum += item.totalPrice;
      } else if (typeof item.unitPrice === 'number' && typeof item.quantity === 'number') {
        itemsSum += item.unitPrice * item.quantity;
      }
    });

    const taxAmount = receipt.tax || 0;
    const serviceAmount = receipt.serviceCharge || 0;
    const discountAmount = receipt.discount || 0;
    const calculatedTotal = Number(
      (itemsSum + taxAmount + serviceAmount - discountAmount).toFixed(2)
    );

    onChange({
      ...receipt,
      subtotal: Number(itemsSum.toFixed(2)),
      total: Math.max(0, calculatedTotal),
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Cards: Merchant, Date, Time, Total */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Merchant Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
            <Store className="w-3.5 h-3.5 text-blue-600" />
            <span>Merchant</span>
          </div>
          <input
            type="text"
            value={receipt.merchant}
            onChange={(e) => updateField('merchant', e.target.value)}
            placeholder="Merchant Name"
            className="w-full text-base font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none transition py-0.5 truncate"
          />
        </div>

        {/* Date Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Date</span>
          </div>
          <input
            type="text"
            value={receipt.date}
            onChange={(e) => updateField('date', e.target.value)}
            placeholder="YYYY-MM-DD"
            className="w-full text-base font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none transition py-0.5"
          />
        </div>

        {/* Time Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Time</span>
          </div>
          <input
            type="text"
            value={receipt.time}
            onChange={(e) => updateField('time', e.target.value)}
            placeholder="HH:MM"
            className="w-full text-base font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none transition py-0.5"
          />
        </div>

        {/* Total Card (Highlight) */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-sm shadow-blue-500/20">
          <div className="flex items-center justify-between text-xs font-medium text-blue-100 mb-1">
            <span>Total</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-blue-200">Currency</span>
              <input
                type="text"
                value={receipt.currency}
                onChange={(e) => updateField('currency', e.target.value)}
                className="w-8 text-center text-xs font-bold bg-white/20 rounded px-1 text-white border-none focus:outline-none focus:bg-white/30"
                title="Change currency symbol or code"
              />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold">{currency}</span>
            <input
              type="number"
              step="0.01"
              value={receipt.total !== null ? receipt.total : ''}
              onChange={(e) => handleNumericFieldChange('total', e.target.value)}
              placeholder="0.00"
              className="w-full text-2xl font-extrabold text-white bg-transparent border-none focus:outline-none tracking-tight placeholder-blue-300"
            />
          </div>
        </div>
      </div>

      {/* Items Section Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Items</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {receipt.items.length}
            </span>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer border border-blue-200/60"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-600 font-semibold text-xs">
                <th className="py-3 px-4 w-5/12">Item</th>
                <th className="py-3 px-3 w-2/12 text-center">Qty</th>
                <th className="py-3 px-3 w-2/12 text-right">Unit Price</th>
                <th className="py-3 px-3 w-2/12 text-right">Total</th>
                <th className="py-3 px-3 w-1/12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-sm">
                    No items extracted. Click "Add Item" to add purchased items manually.
                  </td>
                </tr>
              ) : (
                receipt.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 group transition">
                    {/* Item Name */}
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(idx, { name: e.target.value })}
                        placeholder="Item name"
                        className="w-full bg-transparent font-medium text-slate-900 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 border border-transparent hover:border-slate-200"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) =>
                          updateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })
                        }
                        className="w-16 mx-auto text-center bg-transparent font-medium text-slate-800 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 py-1 border border-transparent hover:border-slate-200"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end">
                        <span className="text-slate-400 text-xs mr-0.5">{currency}</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="—"
                          value={item.unitPrice !== null ? item.unitPrice : ''}
                          onChange={(e) =>
                            updateItem(idx, {
                              unitPrice:
                                e.target.value.trim() === '' ? null : parseFloat(e.target.value),
                            })
                          }
                          className="w-20 text-right bg-transparent font-medium text-slate-800 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1 border border-transparent hover:border-slate-200"
                        />
                      </div>
                    </td>

                    {/* Total Item Price */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center justify-end font-semibold text-slate-900">
                        <span className="text-slate-500 text-xs mr-0.5">{currency}</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.totalPrice !== null ? item.totalPrice : ''}
                          onChange={(e) =>
                            updateItem(idx, {
                              totalPrice:
                                e.target.value.trim() === '' ? null : parseFloat(e.target.value),
                            })
                          }
                          className="w-20 text-right bg-transparent font-bold text-slate-900 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1 border border-transparent hover:border-slate-200"
                        />
                      </div>
                    </td>

                    {/* Delete Item Action */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => deleteItem(idx)}
                        title="Delete item"
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown Section Below Items: Subtotal, Tax/GST, Service Charge, Discount, Total */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Additional Details (Payment, Transaction #) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Receipt Details
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                Payment Method
              </label>
              <input
                type="text"
                value={receipt.paymentMethod}
                onChange={(e) => updateField('paymentMethod', e.target.value)}
                placeholder="e.g. Visa, Mastercard, Cash, Apple Pay"
                className="w-full text-sm font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Receipt / Transaction Number
              </label>
              <input
                type="text"
                value={receipt.receiptNumber}
                onChange={(e) => updateField('receiptNumber', e.target.value)}
                placeholder="e.g. INV-90218, REC-4820"
                className="w-full text-sm font-medium text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={recalculateFromItems}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-blue-50 transition cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              Recalculate subtotal & total from items
            </button>
          </div>
        </div>

        {/* Financial Totals Breakdown Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Payment Summary
          </h3>

          {/* Subtotal */}
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-slate-600 font-medium">Subtotal</span>
            <div className="flex items-center gap-1 font-semibold text-slate-800">
              <span className="text-slate-400 text-xs">{currency}</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={receipt.subtotal !== null ? receipt.subtotal : ''}
                onChange={(e) => handleNumericFieldChange('subtotal', e.target.value)}
                className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none font-semibold text-slate-800 py-0.5"
              />
            </div>
          </div>

          {/* Tax / GST */}
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-slate-600 font-medium">Tax / GST</span>
            <div className="flex items-center gap-1 font-semibold text-slate-800">
              <span className="text-slate-400 text-xs">{currency}</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={receipt.tax !== null ? receipt.tax : ''}
                onChange={(e) => handleNumericFieldChange('tax', e.target.value)}
                className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none font-semibold text-slate-800 py-0.5"
              />
            </div>
          </div>

          {/* Service Charge */}
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-slate-600 font-medium">Service Charge</span>
            <div className="flex items-center gap-1 font-semibold text-slate-800">
              <span className="text-slate-400 text-xs">{currency}</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={receipt.serviceCharge !== null ? receipt.serviceCharge : ''}
                onChange={(e) => handleNumericFieldChange('serviceCharge', e.target.value)}
                className="w-24 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none font-semibold text-slate-800 py-0.5"
              />
            </div>
          </div>

          {/* Discount */}
          <div className="flex items-center justify-between py-1 text-sm">
            <span className="text-slate-600 font-medium">Discount</span>
            <div className="flex items-center gap-1 font-semibold text-emerald-600">
              <span className="text-emerald-500 text-xs">- {currency}</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={receipt.discount !== null ? receipt.discount : ''}
                onChange={(e) => handleNumericFieldChange('discount', e.target.value)}
                className="w-24 text-right bg-transparent border-b border-transparent hover:border-emerald-300 focus:border-emerald-600 focus:outline-none font-semibold text-emerald-600 py-0.5"
              />
            </div>
          </div>

          {/* Total (Visually Prominent) */}
          <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between">
            <span className="text-base font-extrabold text-slate-900">Total</span>
            <div className="flex items-center gap-1 font-extrabold text-xl text-blue-600">
              <span>{currency}</span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={receipt.total !== null ? receipt.total : ''}
                onChange={(e) => handleNumericFieldChange('total', e.target.value)}
                className="w-28 text-right bg-transparent border-b-2 border-transparent hover:border-blue-300 focus:border-blue-600 focus:outline-none font-extrabold text-2xl text-blue-600 py-0.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: "Save Receipt" and "Scan Another Receipt" */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200">
        <button
          type="button"
          onClick={onScanAnother}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <ScanLine className="w-4 h-4 text-slate-500" />
          <span>Scan Another Receipt</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
            isSaved
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-[0.99]'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-4 h-4" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Receipt</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

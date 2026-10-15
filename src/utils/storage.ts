import { ReceiptData, SavedReceipt } from '../types';

const STORAGE_KEY = 'receipt_scanner_saved_receipts';

export function getSavedReceipts(): SavedReceipt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse saved receipts from localStorage:', e);
    return [];
  }
}

export function saveReceiptToStorage(
  data: ReceiptData,
  imageDataUrl?: string,
  imageFileName?: string
): SavedReceipt {
  const existing = getSavedReceipts();
  const newReceipt: SavedReceipt = {
    id: `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    imageDataUrl,
    imageFileName: imageFileName || 'receipt.jpg',
    data,
  };

  const updated = [newReceipt, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // If localStorage quota exceeded due to large image, store without image data URL
    console.warn('Storage quota exceeded, storing receipt data without full image:', e);
    const lightReceipt = { ...newReceipt, imageDataUrl: undefined };
    const lightUpdated = [lightReceipt, ...existing.map((r) => ({ ...r, imageDataUrl: undefined }))];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightUpdated));
  }
  return newReceipt;
}

export function deleteSavedReceipt(id: string): void {
  const existing = getSavedReceipts();
  const updated = existing.filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

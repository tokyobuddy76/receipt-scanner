export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
}

export interface ReceiptData {
  merchant: string;
  date: string;
  time: string;
  currency: string;
  subtotal: number | null;
  tax: number | null;
  serviceCharge: number | null;
  discount: number | null;
  total: number | null;
  paymentMethod: string;
  receiptNumber: string;
  items: ReceiptItem[];
}

export interface SavedReceipt {
  id: string;
  createdAt: string;
  imageDataUrl?: string;
  imageFileName?: string;
  data: ReceiptData;
}

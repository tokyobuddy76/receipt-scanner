// Helper to generate realistic visual sample receipts as SVG Data URLs for quick testing
export interface SampleReceipt {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  dataUrl: string;
}

function createReceiptSvgDataUrl(params: {
  merchant: string;
  storeLocation: string;
  date: string;
  time: string;
  receiptNo: string;
  currency: string;
  items: Array<{ name: string; qty: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  serviceCharge?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
}): string {
  const {
    merchant,
    storeLocation,
    date,
    time,
    receiptNo,
    currency,
    items,
    subtotal,
    tax,
    serviceCharge,
    discount,
    total,
    paymentMethod,
  } = params;

  const itemRows = items
    .map((item, idx) => {
      const y = 230 + idx * 28;
      return `
      <text x="32" y="${y}" font-size="13" font-family="Courier, monospace" font-weight="600" fill="#1e293b">${item.name}</text>
      <text x="32" y="${y + 13}" font-size="11" font-family="Courier, monospace" fill="#64748b">${item.qty} x ${currency}${item.unitPrice.toFixed(2)}</text>
      <text x="368" y="${y + 8}" text-anchor="end" font-size="13" font-family="Courier, monospace" font-weight="700" fill="#1e293b">${currency}${item.total.toFixed(2)}</text>
    `;
    })
    .join('\n');

  let curY = 240 + items.length * 28 + 10;
  const divider1Y = curY;
  curY += 22;

  const subtotalY = curY;
  curY += 20;

  let serviceChargeBlock = '';
  if (serviceCharge) {
    serviceChargeBlock = `
      <text x="32" y="${curY}" font-size="12" font-family="Courier, monospace" fill="#475569">Service Charge (10%)</text>
      <text x="368" y="${curY}" text-anchor="end" font-size="12" font-family="Courier, monospace" fill="#475569">${currency}${serviceCharge.toFixed(2)}</text>
    `;
    curY += 20;
  }

  const taxY = curY;
  curY += 20;

  let discountBlock = '';
  if (discount) {
    discountBlock = `
      <text x="32" y="${curY}" font-size="12" font-family="Courier, monospace" fill="#15803d">Promo Discount</text>
      <text x="368" y="${curY}" text-anchor="end" font-size="12" font-family="Courier, monospace" fill="#15803d">-${currency}${discount.toFixed(2)}</text>
    `;
    curY += 20;
  }

  const divider2Y = curY + 4;
  curY += 28;
  const totalY = curY;
  curY += 30;

  const paymentY = curY;
  curY += 20;
  const footerY = curY + 15;
  const totalHeight = Math.max(560, footerY + 70);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="${totalHeight}" viewBox="0 0 400 ${totalHeight}">
    <defs>
      <filter id="shadow" x="-5%" y="-2%" width="110%" height="106%" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.12" />
      </filter>
    </defs>
    <!-- Receipt Paper Background -->
    <rect x="12" y="12" width="376" height="${totalHeight - 24}" rx="8" fill="#fafafa" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadow)"/>
    
    <!-- Top Jagged Edge or Accent -->
    <rect x="12" y="12" width="376" height="8" rx="4" fill="#0284c7" />

    <!-- Header -->
    <text x="200" y="52" text-anchor="middle" font-size="18" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" letter-spacing="1" fill="#0f172a">${merchant.toUpperCase()}</text>
    <text x="200" y="72" text-anchor="middle" font-size="11" font-family="'Plus Jakarta Sans', sans-serif" fill="#64748b">${storeLocation}</text>

    <!-- Metadata Grid -->
    <line x1="32" y1="92" x2="368" y2="92" stroke="#cbd5e1" stroke-dasharray="4 4" stroke-width="1.5"/>
    <text x="32" y="112" font-size="11" font-family="Courier, monospace" fill="#64748b">DATE: <tspan font-weight="bold" fill="#1e293b">${date}</tspan></text>
    <text x="368" y="112" text-anchor="end" font-size="11" font-family="Courier, monospace" fill="#64748b">TIME: <tspan font-weight="bold" fill="#1e293b">${time}</tspan></text>
    <text x="32" y="132" font-size="11" font-family="Courier, monospace" fill="#64748b">RECEIPT #: <tspan font-weight="bold" fill="#1e293b">${receiptNo}</tspan></text>
    <text x="368" y="132" text-anchor="end" font-size="11" font-family="Courier, monospace" fill="#64748b">CASHIER: <tspan font-weight="bold" fill="#1e293b">STATION 04</tspan></text>
    
    <!-- Table Header -->
    <line x1="32" y1="152" x2="368" y2="152" stroke="#94a3b8" stroke-width="1.5"/>
    <text x="32" y="172" font-size="12" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" fill="#334155">ITEMS</text>
    <text x="368" y="172" text-anchor="end" font-size="12" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" fill="#334155">AMOUNT</text>
    <line x1="32" y1="184" x2="368" y2="184" stroke="#cbd5e1" stroke-width="1"/>

    <!-- Items -->
    ${itemRows}

    <!-- Totals Breakdown -->
    <line x1="32" y1="${divider1Y}" x2="368" y2="${divider1Y}" stroke="#cbd5e1" stroke-dasharray="4 4" stroke-width="1.5"/>
    
    <text x="32" y="${subtotalY}" font-size="12" font-family="Courier, monospace" fill="#475569">Subtotal</text>
    <text x="368" y="${subtotalY}" text-anchor="end" font-size="12" font-family="Courier, monospace" font-weight="600" fill="#1e293b">${currency}${subtotal.toFixed(2)}</text>
    
    ${serviceChargeBlock}

    <text x="32" y="${taxY}" font-size="12" font-family="Courier, monospace" fill="#475569">Tax / GST (9%)</text>
    <text x="368" y="${taxY}" text-anchor="end" font-size="12" font-family="Courier, monospace" fill="#475569">${currency}${tax.toFixed(2)}</text>

    ${discountBlock}

    <line x1="32" y1="${divider2Y}" x2="368" y2="${divider2Y}" stroke="#0f172a" stroke-width="2"/>
    
    <text x="32" y="${totalY}" font-size="17" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" fill="#0f172a">TOTAL</text>
    <text x="368" y="${totalY}" text-anchor="end" font-size="18" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" fill="#0284c7">${currency}${total.toFixed(2)}</text>

    <text x="32" y="${paymentY}" font-size="11" font-family="Courier, monospace" fill="#64748b">PAYMENT: <tspan font-weight="bold" fill="#1e293b">${paymentMethod}</tspan></text>
    <text x="368" y="${paymentY}" text-anchor="end" font-size="11" font-family="Courier, monospace" fill="#15803d">APPROVED</text>

    <!-- Barcode simulation -->
    <g transform="translate(110, ${footerY - 8})">
      <rect x="0" y="0" width="3" height="24" fill="#334155"/>
      <rect x="6" y="0" width="2" height="24" fill="#334155"/>
      <rect x="11" y="0" width="4" height="24" fill="#334155"/>
      <rect x="18" y="0" width="1" height="24" fill="#334155"/>
      <rect x="22" y="0" width="5" height="24" fill="#334155"/>
      <rect x="30" y="0" width="2" height="24" fill="#334155"/>
      <rect x="35" y="0" width="3" height="24" fill="#334155"/>
      <rect x="42" y="0" width="6" height="24" fill="#334155"/>
      <rect x="52" y="0" width="2" height="24" fill="#334155"/>
      <rect x="58" y="0" width="4" height="24" fill="#334155"/>
      <rect x="65" y="0" width="2" height="24" fill="#334155"/>
      <rect x="70" y="0" width="5" height="24" fill="#334155"/>
      <rect x="78" y="0" width="2" height="24" fill="#334155"/>
      <rect x="83" y="0" width="4" height="24" fill="#334155"/>
      <rect x="91" y="0" width="1" height="24" fill="#334155"/>
      <rect x="95" y="0" width="4" height="24" fill="#334155"/>
      <rect x="103" y="0" width="2" height="24" fill="#334155"/>
      <rect x="108" y="0" width="5" height="24" fill="#334155"/>
      <rect x="117" y="0" width="3" height="24" fill="#334155"/>
      <rect x="124" y="0" width="2" height="24" fill="#334155"/>
      <rect x="130" y="0" width="4" height="24" fill="#334155"/>
      <rect x="138" y="0" width="2" height="24" fill="#334155"/>
      <rect x="144" y="0" width="6" height="24" fill="#334155"/>
      <rect x="154" y="0" width="2" height="24" fill="#334155"/>
      <rect x="160" y="0" width="4" height="24" fill="#334155"/>
      <rect x="168" y="0" width="2" height="24" fill="#334155"/>
      <rect x="174" y="0" width="3" height="24" fill="#334155"/>
    </g>
    <text x="200" y="${footerY + 28}" text-anchor="middle" font-size="10" font-family="'Plus Jakarta Sans', sans-serif" fill="#94a3b8">THANK YOU FOR SHOPPING WITH US!</text>
  </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'cafe-bistro',
    title: 'Blue Bottle Cafe',
    subtitle: 'Breakfast & Specialty Coffee',
    badge: 'Cafe & Dining',
    dataUrl: createReceiptSvgDataUrl({
      merchant: 'Blue Bottle Cafe',
      storeLocation: '315 S Broadway, Downtown',
      date: '2026-10-12',
      time: '08:45',
      receiptNo: 'REC-89241',
      currency: '$',
      items: [
        { name: 'Oat Milk Flat White', qty: 2, unitPrice: 5.75, total: 11.5 },
        { name: 'Avocado Sourdough Toast', qty: 1, unitPrice: 12.0, total: 12.0 },
        { name: 'Almond Croissant', qty: 2, unitPrice: 4.5, total: 9.0 },
      ],
      subtotal: 32.5,
      tax: 2.93,
      serviceCharge: 3.25,
      discount: 2.0,
      total: 36.68,
      paymentMethod: 'Apple Pay (Visa *4921)',
    }),
  },
  {
    id: 'groceries-mart',
    title: 'Fresh Market Groceries',
    subtitle: 'Produce & Weekly Provisions',
    badge: 'Supermarket',
    dataUrl: createReceiptSvgDataUrl({
      merchant: 'Fresh Market Supermarket',
      storeLocation: '742 Evergreen Terrace',
      date: '2026-10-14',
      time: '17:20',
      receiptNo: 'TRX-55109',
      currency: '$',
      items: [
        { name: 'Organic Honeycrisp Apples', qty: 1, unitPrice: 4.99, total: 4.99 },
        { name: 'Greek Yogurt 32oz', qty: 2, unitPrice: 5.49, total: 10.98 },
        { name: 'Whole Wheat Artisan Bread', qty: 1, unitPrice: 3.89, total: 3.89 },
        { name: 'Free Range Large Brown Eggs', qty: 1, unitPrice: 4.79, total: 4.79 },
        { name: 'Sparkling Mineral Water 6pk', qty: 2, unitPrice: 6.25, total: 12.5 },
      ],
      subtotal: 37.15,
      tax: 2.6,
      discount: 3.5,
      total: 36.25,
      paymentMethod: 'Contactless Mastercard *8804',
    }),
  },
  {
    id: 'restaurant-dinner',
    title: 'Bella Italia Trattoria',
    subtitle: 'Dinner & Wine for Two',
    badge: 'Restaurant',
    dataUrl: createReceiptSvgDataUrl({
      merchant: 'Bella Italia Trattoria',
      storeLocation: '18 Piazza Venezia Suite 2',
      date: '2026-10-10',
      time: '20:15',
      receiptNo: 'INV-2026-904',
      currency: '$',
      items: [
        { name: 'Tagliatelle al Tartufo', qty: 1, unitPrice: 24.5, total: 24.5 },
        { name: 'Margherita Woodfired Pizza', qty: 1, unitPrice: 18.0, total: 18.0 },
        { name: 'Chianti Classico Glass', qty: 2, unitPrice: 11.0, total: 22.0 },
        { name: 'Classic Tiramisu', qty: 1, unitPrice: 9.5, total: 9.5 },
      ],
      subtotal: 74.0,
      tax: 6.66,
      serviceCharge: 7.4,
      total: 88.06,
      paymentMethod: 'Visa Signature *3190',
    }),
  },
];

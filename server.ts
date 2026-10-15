import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support high-resolution camera photo uploads
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ limit: '35mb', extended: true }));

// Gemini initialization
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Helper with exponential backoff and model failover for transient 503/429 spikes
async function generateContentWithRetry(params: any, maxRetries = 2): Promise<any> {
  let lastError: any;
  // Primary model is gemini-3.8-flash; failover to gemini-3.1-flash-lite if service is experiencing spikes
  const modelsToTry = [params.model, 'gemini-3.1-flash-lite'];

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await ai!.models.generateContent({
          ...params,
          model,
        });
      } catch (err: any) {
        lastError = err;
        const isTransient =
          err?.message?.includes('503') ||
          err?.message?.includes('UNAVAILABLE') ||
          err?.message?.includes('429') ||
          err?.status === 503 ||
          err?.status === 429;

        if (isTransient && attempt < maxRetries) {
          console.warn(`Gemini (${model}) transient spike (attempt ${attempt}/${maxRetries}), retrying in 1200ms...`);
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        break; // proceed to next candidate model
      }
    }
  }
  throw lastError;
}

// API endpoint for receipt analysis
app.post('/api/analyze-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'No receipt image provided.',
      });
    }

    if (!ai) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    // Strip data URI prefix if present
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
    // Standardize MIME type
    let cleanMime = mimeType || 'image/jpeg';
    if (cleanMime.includes('svg')) {
      cleanMime = 'image/png';
    }

    const promptText = `You are an expert receipt OCR and information extraction system. Analyze the provided receipt image carefully.

RECEIPT ANALYSIS RULES:
- Only extract information that can reasonably be determined from the receipt.
- Do not invent or hallucinate missing information.
- If a text field cannot be determined, return an empty string "".
- If a numeric field cannot be determined, return null.
- Preserve the exact currency symbol or code shown on the receipt (e.g. "$", "SGD", "USD", "EUR", "£", "¥").
- Prices must be returned as plain numbers without currency symbols (e.g. 12.50).
- For dates, convert to YYYY-MM-DD when the date can be confidently interpreted.
- For time, convert to HH:MM in 24-hour format when possible (e.g. 14:35).
- Do not confuse subtotal with the final total.
- The final total should represent the amount actually charged after taxes, discounts, and service charges.
- For each purchased line item:
  * Extract item name
  * Extract quantity (if not explicitly shown but item appears once, use 1)
  * Extract unit price if available (or null if only total line price is given)
  * Extract total line price for that item
- Ignore non-purchased content such as promotional slogans, barcodes, store policy, return policy, Wi-Fi passwords, survey links, and loyalty program ads.
- If the image is not a receipt, is blank, or is completely unreadable, return empty strings for merchant/date/time, null for all amounts, and an empty list of items.`;

    const response = await generateContentWithRetry({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: {
              type: Type.STRING,
              description: 'Store or merchant name, or empty string',
            },
            date: {
              type: Type.STRING,
              description: 'Date in YYYY-MM-DD format if interpretable, otherwise empty string',
            },
            time: {
              type: Type.STRING,
              description: 'Time in HH:MM 24-hour format if interpretable, otherwise empty string',
            },
            currency: {
              type: Type.STRING,
              description: 'Currency symbol or code (e.g. $, USD, SGD, EUR) as shown on receipt, or empty string',
            },
            subtotal: {
              type: Type.NUMBER,
              description: 'Subtotal before tax, service charge and discounts, or null if not found',
            },
            tax: {
              type: Type.NUMBER,
              description: 'Tax or GST amount, or null if not found',
            },
            serviceCharge: {
              type: Type.NUMBER,
              description: 'Service charge amount, or null if not found',
            },
            discount: {
              type: Type.NUMBER,
              description: 'Discount amount as positive number if applicable, or null if not found',
            },
            total: {
              type: Type.NUMBER,
              description: 'Final total amount charged, or null if not found',
            },
            paymentMethod: {
              type: Type.STRING,
              description: 'Payment method (e.g. Visa, Mastercard, Cash, Amex, Apple Pay), or empty string',
            },
            receiptNumber: {
              type: Type.STRING,
              description: 'Receipt, invoice, or transaction reference number, or empty string',
            },
            items: {
              type: Type.ARRAY,
              description: 'List of all purchased items',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: 'Item name / description',
                  },
                  quantity: {
                    type: Type.NUMBER,
                    description: 'Quantity purchased',
                  },
                  unitPrice: {
                    type: Type.NUMBER,
                    description: 'Unit price per item, or null if not available',
                  },
                  totalPrice: {
                    type: Type.NUMBER,
                    description: 'Total price for this line item, or null if not available',
                  },
                },
                required: ['name', 'quantity'],
              },
            },
          },
          required: ['merchant', 'date', 'time', 'currency', 'items'],
        },
      },
    });

    const rawText = response.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini output:', rawText);
      return res.status(422).json({
        success: false,
        error: "We couldn't read this receipt. Try taking a clearer photo or uploading another image.",
      });
    }

    // Sanitize and ensure format conforms strictly to required schema
    const sanitizeNumber = (val: any): number | null => {
      if (typeof val === 'number' && !isNaN(val)) return Number(val.toFixed(2));
      if (typeof val === 'string') {
        const cleaned = parseFloat(val.replace(/[^0-9.-]/g, ''));
        return !isNaN(cleaned) ? Number(cleaned.toFixed(2)) : null;
      }
      return null;
    };

    const sanitizedItems = Array.isArray(parsed.items)
      ? parsed.items.map((item: any, idx: number) => ({
          id: `item-${Date.now()}-${idx + 1}`,
          name: typeof item.name === 'string' ? item.name.trim() : `Item ${idx + 1}`,
          quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          unitPrice: sanitizeNumber(item.unitPrice),
          totalPrice: sanitizeNumber(item.totalPrice),
        }))
      : [];

    const structuredData = {
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant.trim() : '',
      date: typeof parsed.date === 'string' ? parsed.date.trim() : '',
      time: typeof parsed.time === 'string' ? parsed.time.trim() : '',
      currency: typeof parsed.currency === 'string' && parsed.currency ? parsed.currency.trim() : '$',
      subtotal: sanitizeNumber(parsed.subtotal),
      tax: sanitizeNumber(parsed.tax),
      serviceCharge: sanitizeNumber(parsed.serviceCharge),
      discount: sanitizeNumber(parsed.discount),
      total: sanitizeNumber(parsed.total),
      paymentMethod: typeof parsed.paymentMethod === 'string' ? parsed.paymentMethod.trim() : '',
      receiptNumber: typeof parsed.receiptNumber === 'string' ? parsed.receiptNumber.trim() : '',
      items: sanitizedItems,
    };

    // Check if the receipt was completely unreadable
    const hasAnyContent =
      Boolean(structuredData.merchant) ||
      Boolean(structuredData.total !== null) ||
      Boolean(structuredData.subtotal !== null) ||
      structuredData.items.length > 0;

    if (!hasAnyContent) {
      return res.status(422).json({
        success: false,
        error: "We couldn't read this receipt. Try taking a clearer photo or uploading another image.",
      });
    }

    return res.json({
      success: true,
      data: structuredData,
    });
  } catch (error: any) {
    console.error('Error analyzing receipt:', error);
    return res.status(500).json({
      success: false,
      error: "We couldn't read this receipt. Try taking a clearer photo or uploading another image.",
      details: error?.message || 'Server error',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Receipt Scanner server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

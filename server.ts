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

// Support high-resolution camera and scanned receipt uploads up to 35MB
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ limit: '35mb', extended: true }));

// Server-side Gemini initialization protecting the API key
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

// Helper with automatic retry and model failover for transient capacity spikes
async function generateContentWithRetry(params: any, maxRetries = 2): Promise<any> {
  let lastError: any;
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
          console.warn(
            `Gemini (${model}) transient spike (attempt ${attempt}/${maxRetries}), retrying in 1200ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        break; // try the next candidate model
      }
    }
  }
  throw lastError;
}

// Exact prompt instructions required
const RECEIPT_ANALYSIS_INSTRUCTION = `You are a receipt analysis system.

Carefully analyze the attached receipt image.

Extract all information that is clearly visible on the receipt.

Return:
- merchant/store name
- date
- time
- currency
- subtotal
- tax/GST
- service charge
- discount
- final total
- payment method
- receipt/transaction number
- every purchased item
- quantity of each item
- unit price of each item
- total price of each item

Do not guess information that is not visible.

If a text value cannot be determined, return an empty string.
If a numeric value cannot be determined, return null.

Return ONLY structured JSON.`;

// API endpoint for multimodal receipt analysis
app.post('/api/analyze-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Unable to analyze this receipt. Please try again.',
      });
    }

    if (!ai) {
      console.error('Server error: GEMINI_API_KEY is not configured in environment.');
      return res.status(500).json({
        success: false,
        error: 'Unable to analyze this receipt. Please try again.',
      });
    }

    // Strip any data URI prefix to isolate raw base64 payload
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    // Normalize MIME type
    let cleanMime = mimeType || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(cleanMime)) {
      if (cleanMime.includes('png')) cleanMime = 'image/png';
      else if (cleanMime.includes('webp')) cleanMime = 'image/webp';
      else cleanMime = 'image/jpeg';
    }

    // Call Gemini with multimodal image input and strict JSON Schema
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
              text: RECEIPT_ANALYSIS_INSTRUCTION,
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
              description: 'merchant/store name or empty string if not visible',
            },
            date: {
              type: Type.STRING,
              description: 'date in YYYY-MM-DD format if interpretable, otherwise empty string',
            },
            time: {
              type: Type.STRING,
              description: 'time in HH:MM 24-hour format if interpretable, otherwise empty string',
            },
            currency: {
              type: Type.STRING,
              description: 'currency symbol or code shown on receipt (e.g. $, USD, EUR) or empty string',
            },
            subtotal: {
              type: Type.NUMBER,
              description: 'subtotal amount or null if not visible',
            },
            tax: {
              type: Type.NUMBER,
              description: 'tax or GST amount or null if not visible',
            },
            serviceCharge: {
              type: Type.NUMBER,
              description: 'service charge amount or null if not visible',
            },
            discount: {
              type: Type.NUMBER,
              description: 'discount amount or null if not visible',
            },
            total: {
              type: Type.NUMBER,
              description: 'final total charged amount or null if not visible',
            },
            paymentMethod: {
              type: Type.STRING,
              description: 'payment method or empty string if not visible',
            },
            receiptNumber: {
              type: Type.STRING,
              description: 'receipt or transaction number or empty string if not visible',
            },
            items: {
              type: Type.ARRAY,
              description: 'every purchased item visible on the receipt',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: 'item name or empty string if unclear',
                  },
                  quantity: {
                    type: Type.NUMBER,
                    description: 'quantity of item (defaults to 1 if appearing once)',
                  },
                  unitPrice: {
                    type: Type.NUMBER,
                    description: 'unit price of item or null if not visible',
                  },
                  totalPrice: {
                    type: Type.NUMBER,
                    description: 'total price of item line or null if not visible',
                  },
                },
                required: ['name', 'quantity'],
              },
            },
          },
          required: [
            'merchant',
            'date',
            'time',
            'currency',
            'paymentMethod',
            'receiptNumber',
            'items',
          ],
        },
      },
    });

    const rawText = response.text?.trim() || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini JSON output:', rawText);
      return res.status(422).json({
        success: false,
        error: 'Unable to analyze this receipt. Please try again.',
      });
    }

    const sanitizeNumber = (val: any): number | null => {
      if (typeof val === 'number' && !isNaN(val)) return Number(val.toFixed(2));
      if (typeof val === 'string' && val.trim() !== '') {
        const cleaned = parseFloat(val.replace(/[^0-9.-]/g, ''));
        return !isNaN(cleaned) ? Number(cleaned.toFixed(2)) : null;
      }
      return null;
    };

    const sanitizedItems = Array.isArray(parsed.items)
      ? parsed.items.map((item: any, idx: number) => ({
          id: `item-${Date.now()}-${idx + 1}`,
          name: typeof item.name === 'string' ? item.name.trim() : '',
          quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          unitPrice: sanitizeNumber(item.unitPrice),
          totalPrice: sanitizeNumber(item.totalPrice),
        }))
      : [];

    const structuredData = {
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant.trim() : '',
      date: typeof parsed.date === 'string' ? parsed.date.trim() : '',
      time: typeof parsed.time === 'string' ? parsed.time.trim() : '',
      currency: typeof parsed.currency === 'string' ? parsed.currency.trim() : '',
      subtotal: sanitizeNumber(parsed.subtotal),
      tax: sanitizeNumber(parsed.tax),
      serviceCharge: sanitizeNumber(parsed.serviceCharge),
      discount: sanitizeNumber(parsed.discount),
      total: sanitizeNumber(parsed.total),
      paymentMethod: typeof parsed.paymentMethod === 'string' ? parsed.paymentMethod.trim() : '',
      receiptNumber: typeof parsed.receiptNumber === 'string' ? parsed.receiptNumber.trim() : '',
      items: sanitizedItems,
    };

    return res.json({
      success: true,
      data: structuredData,
    });
  } catch (error: any) {
    // Log useful error without exposing secret keys
    console.error('API Error during Gemini receipt analysis:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Unable to analyze this receipt. Please try again.',
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

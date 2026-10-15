import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Mistral } from '@mistralai/mistralai';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support high-resolution camera and scanned receipt uploads up to 35MB
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ limit: '35mb', extended: true }));

// Mistral AI Client (Pixtral multimodal vision)
const mistralApiKey = process.env.MISTRAL_API_KEY;
const mistral = mistralApiKey ? new Mistral({ apiKey: mistralApiKey }) : null;

// Fallback Gemini client if Mistral API key is not configured in environment
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Structured analysis instructions
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

Return ONLY structured JSON matching this exact schema:
{
  "merchant": "",
  "date": "",
  "time": "",
  "currency": "",
  "subtotal": null,
  "tax": null,
  "serviceCharge": null,
  "discount": null,
  "total": null,
  "paymentMethod": "",
  "receiptNumber": "",
  "items": [
    {
      "name": "",
      "quantity": 1,
      "unitPrice": null,
      "totalPrice": null
    }
  ]
}`;

// Helper with automatic retry for transient spikes
async function analyzeWithMistral(dataUrl: string): Promise<any> {
  const models = ['pixtral-12b-2409', 'pixtral-large-latest'];
  let lastErr: any;

  for (const model of models) {
    try {
      const response = await mistral!.chat.complete({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: RECEIPT_ANALYSIS_INSTRUCTION,
              },
              {
                type: 'image_url',
                imageUrl: dataUrl,
              },
            ],
          },
        ],
        responseFormat: { type: 'json_object' },
      });

      const messageContent = response.choices?.[0]?.message?.content;
      let rawText = '';
      if (typeof messageContent === 'string') {
        rawText = messageContent;
      } else if (Array.isArray(messageContent)) {
        rawText = messageContent
          .map((chunk: any) => (typeof chunk === 'string' ? chunk : chunk.text || ''))
          .join('');
      }

      // Strip markdown code fences if present
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(rawText);
    } catch (err: any) {
      console.warn(`Mistral (${model}) attempt failed:`, err?.message || err);
      lastErr = err;
    }
  }
  throw lastErr;
}

// Fallback Gemini analyzer if MISTRAL_API_KEY is not configured
async function analyzeWithGeminiFallback(cleanMime: string, cleanBase64: string): Promise<any> {
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastErr: any;

  for (const model of models) {
    try {
      const response = await ai!.models.generateContent({
        model,
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
              merchant: { type: Type.STRING },
              date: { type: Type.STRING },
              time: { type: Type.STRING },
              currency: { type: Type.STRING },
              subtotal: { type: Type.NUMBER },
              tax: { type: Type.NUMBER },
              serviceCharge: { type: Type.NUMBER },
              discount: { type: Type.NUMBER },
              total: { type: Type.NUMBER },
              paymentMethod: { type: Type.STRING },
              receiptNumber: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unitPrice: { type: Type.NUMBER },
                    totalPrice: { type: Type.NUMBER },
                  },
                  required: ['name', 'quantity'],
                },
              },
            },
            required: ['merchant', 'date', 'time', 'currency', 'items'],
          },
        },
      });

      const rawText = (response.text || '{}').replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(rawText);
    } catch (err: any) {
      console.warn(`Gemini fallback (${model}) attempt failed:`, err?.message || err);
      lastErr = err;
    }
  }
  throw lastErr;
}

// API endpoint for receipt analysis using Mistral (Pixtral)
app.post('/api/analyze-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Unable to analyze this receipt. Please try again.',
      });
    }

    if (!mistral && !ai) {
      console.error('Server error: Neither MISTRAL_API_KEY nor GEMINI_API_KEY is configured.');
      return res.status(500).json({
        success: false,
        error: 'MISTRAL_API_KEY is not configured on the server. Please set MISTRAL_API_KEY in your environment or Secrets.',
      });
    }

    // Strip data URI prefix for base64 isolation
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    // Normalize MIME type
    let cleanMime = mimeType || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(cleanMime)) {
      if (cleanMime.includes('png')) cleanMime = 'image/png';
      else if (cleanMime.includes('webp')) cleanMime = 'image/webp';
      else cleanMime = 'image/jpeg';
    }

    const fullDataUrl = `data:${cleanMime};base64,${cleanBase64}`;

    let parsed: any;
    if (mistral) {
      console.log('Analyzing receipt using Mistral Pixtral multimodal vision...');
      parsed = await analyzeWithMistral(fullDataUrl);
    } else {
      console.warn(
        'MISTRAL_API_KEY not found in environment; using fallback vision analyzer. Set MISTRAL_API_KEY in Secrets to use Mistral Pixtral directly.'
      );
      parsed = await analyzeWithGeminiFallback(cleanMime, cleanBase64);
    }

    const sanitizeNumber = (val: any): number | null => {
      if (typeof val === 'number' && !isNaN(val)) return Number(val.toFixed(2));
      if (typeof val === 'string' && val.trim() !== '') {
        const cleaned = parseFloat(val.replace(/[^0-9.-]/g, ''));
        return !isNaN(cleaned) ? Number(cleaned.toFixed(2)) : null;
      }
      return null;
    };

    const sanitizedItems = Array.isArray(parsed?.items)
      ? parsed.items.map((item: any, idx: number) => ({
          id: `item-${Date.now()}-${idx + 1}`,
          name: typeof item.name === 'string' ? item.name.trim() : '',
          quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          unitPrice: sanitizeNumber(item.unitPrice),
          totalPrice: sanitizeNumber(item.totalPrice),
        }))
      : [];

    const structuredData = {
      merchant: typeof parsed?.merchant === 'string' ? parsed.merchant.trim() : '',
      date: typeof parsed?.date === 'string' ? parsed.date.trim() : '',
      time: typeof parsed?.time === 'string' ? parsed.time.trim() : '',
      currency: typeof parsed?.currency === 'string' ? parsed.currency.trim() : '$',
      subtotal: sanitizeNumber(parsed?.subtotal),
      tax: sanitizeNumber(parsed?.tax),
      serviceCharge: sanitizeNumber(parsed?.serviceCharge),
      discount: sanitizeNumber(parsed?.discount),
      total: sanitizeNumber(parsed?.total),
      paymentMethod: typeof parsed?.paymentMethod === 'string' ? parsed.paymentMethod.trim() : '',
      receiptNumber: typeof parsed?.receiptNumber === 'string' ? parsed.receiptNumber.trim() : '',
      items: sanitizedItems,
    };

    return res.json({
      success: true,
      data: structuredData,
      engine: mistral ? 'mistral-pixtral' : 'gemini-fallback',
    });
  } catch (error: any) {
    console.error('API Error during receipt analysis:', error?.message || error);
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

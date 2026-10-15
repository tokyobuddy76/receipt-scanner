// Serverless Receipt Scanner Handler
// Location: /api/receiptscanner.ts (Project Root Level)
// Calls Mistral API (POST https://api.mistral.ai/v1/chat/completions)

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

Return ONLY valid structured JSON matching this exact schema:
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

// Helper to sanitize numeric values
function sanitizeNumber(val: any): number | null {
  if (typeof val === 'number' && !isNaN(val)) return Number(val.toFixed(2));
  if (typeof val === 'string' && val.trim() !== '') {
    const cleaned = parseFloat(val.replace(/[^0-9.-]/g, ''));
    return !isNaN(cleaned) ? Number(cleaned.toFixed(2)) : null;
  }
  return null;
}

// Call Mistral Chat Completions API with image input
async function callMistralApi(apiKey: string, dataUrl: string, model: string) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
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
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Mistral API error (${response.status}): ${errorBody}`);
  }

  const result = await response.json();
  const rawContent = result.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Empty response received from Mistral API.');
  }

  // Handle both string and array content chunk returns
  let jsonString = '';
  if (typeof rawContent === 'string') {
    jsonString = rawContent;
  } else if (Array.isArray(rawContent)) {
    jsonString = rawContent.map((c: any) => (typeof c === 'string' ? c : c.text || '')).join('');
  }

  // Clean code fences if present
  jsonString = jsonString.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(jsonString);
}

export default async function handler(req: any, res?: any) {
  // Extract body depending on environment (Node req.body or Web Request.json())
  let body: any = {};
  try {
    if (req.body && typeof req.body === 'object') {
      body = req.body;
    } else if (typeof req.json === 'function') {
      body = await req.json();
    } else if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    }
  } catch (e) {
    const errResp = { success: false, error: 'Invalid JSON request payload.' };
    if (res && typeof res.status === 'function') return res.status(400).json(errResp);
    return new Response(JSON.stringify(errResp), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { imageBase64, mimeType } = body;

  if (!imageBase64) {
    const errResp = { success: false, error: 'Unable to analyze this receipt. Please provide an image.' };
    if (res && typeof res.status === 'function') return res.status(400).json(errResp);
    return new Response(JSON.stringify(errResp), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Access key without hardcoding
  const mistralApiKey = process.env.MISTRAL_API_KEY;

  if (!mistralApiKey) {
    // Check if Gemini key is available as fallback for preview testing
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      console.warn('MISTRAL_API_KEY not found in environment; falling back to Gemini for preview.');
      try {
        const { GoogleGenAI, Type } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        const cleanMime = mimeType || 'image/jpeg';

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: cleanMime, data: cleanBase64 } },
                { text: RECEIPT_ANALYSIS_INSTRUCTION },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
          },
        });

        const raw = (geminiRes.text || '{}').replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(raw);
        const structuredData = formatStructuredData(parsed);

        const okResp = { success: true, data: structuredData, engine: 'gemini-fallback' };
        if (res && typeof res.status === 'function') return res.status(200).json(okResp);
        return new Response(JSON.stringify(okResp), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        console.error('Fallback error:', err);
      }
    }

    const errResp = {
      success: false,
      error: 'MISTRAL_API_KEY is not configured on the server. Please set MISTRAL_API_KEY in your environment or Secrets.',
    };
    if (res && typeof res.status === 'function') return res.status(500).json(errResp);
    return new Response(JSON.stringify(errResp), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // Prepare full data URL for Mistral vision
  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
  let cleanMime = mimeType || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(cleanMime)) {
    cleanMime = cleanMime.includes('png') ? 'image/png' : 'image/jpeg';
  }
  const fullDataUrl = `data:${cleanMime};base64,${cleanBase64}`;

  // Call Mistral Pixtral models with fallback
  const models = ['pixtral-12b-2409', 'pixtral-large-latest'];
  let parsedResult: any = null;
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Analyzing receipt with Mistral model: ${model}`);
      parsedResult = await callMistralApi(mistralApiKey, fullDataUrl, model);
      if (parsedResult) break;
    } catch (err: any) {
      console.warn(`Mistral model ${model} attempt failed:`, err?.message || err);
      lastError = err;
    }
  }

  if (!parsedResult) {
    console.error('All Mistral vision attempts failed:', lastError);
    const errResp = { success: false, error: 'Unable to analyze this receipt. Please try again.' };
    if (res && typeof res.status === 'function') return res.status(500).json(errResp);
    return new Response(JSON.stringify(errResp), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const structuredData = formatStructuredData(parsedResult);
  const successResp = { success: true, data: structuredData, engine: 'mistral-pixtral' };

  if (res && typeof res.status === 'function') {
    return res.status(200).json(successResp);
  }
  return new Response(JSON.stringify(successResp), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function formatStructuredData(parsed: any) {
  const sanitizedItems = Array.isArray(parsed?.items)
    ? parsed.items.map((item: any, idx: number) => ({
        id: `item-${Date.now()}-${idx + 1}`,
        name: typeof item.name === 'string' ? item.name.trim() : '',
        quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
        unitPrice: sanitizeNumber(item.unitPrice),
        totalPrice: sanitizeNumber(item.totalPrice),
      }))
    : [];

  return {
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
}

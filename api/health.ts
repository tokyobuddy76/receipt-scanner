// Serverless Health Check Handler
// Stores in /api/health.ts at project root
export default async function handler(req: any, res?: any) {
  const data = {
    status: 'ok',
    service: 'Receipt Scanner Serverless API',
    timestamp: new Date().toISOString(),
    mistralConfigured: Boolean(process.env.MISTRAL_API_KEY),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  };

  // Node / Express / Vercel Serverless format (req, res)
  if (res && typeof res.status === 'function') {
    return res.status(200).json(data);
  }

  // Web Standard / Edge Request handler format
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

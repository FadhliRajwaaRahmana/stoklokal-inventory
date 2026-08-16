// index.js — Entry point Express API (lokalan + entry utama untuk deploy)
import { createApp } from './app.js';

const PORT = process.env.PORT || 5000;

// Mode serverless (Netlify/Vercel function) tidak perlu listen
if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  console.log('[server] running in serverless mode');
} else {
  createApp().then((app) => {
    app.listen(PORT, () => {
      console.log(`[server] Inventory API ready at http://localhost:${PORT}`);
    });
  });
}

export default async function handler(req, res) {
  const app = await createApp();
  return app(req, res);
}

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

async function proxy(req: express.Request, res: express.Response, base: string, rewritePrefix?: { from: string; to: string }) {
  const originalUrl = req.originalUrl || req.url || '';
  const nextPath = rewritePrefix ? originalUrl.replace(rewritePrefix.from, rewritePrefix.to) : originalUrl;
  const targetUrl = `${base}${nextPath}`;

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!v) continue;
    if (k.toLowerCase() === 'host') continue;
    headers[k] = Array.isArray(v) ? v.join(',') : String(v);
  }

  const init: any = {
    method: req.method,
    headers,
    redirect: 'manual'
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req;
    init.duplex = 'half';
  }

  const upstream = await fetch(targetUrl, init);
  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === 'transfer-encoding' || k === 'content-encoding') return;
    res.setHeader(key, value);
  });
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.send(buf);
}

app.use('/py', async (req, res) => {
  try {
    await proxy(req, res, 'http://localhost:8000', { from: '/py', to: '' });
  } catch (e) {
    res.status(502).json({ ok: false, error: e instanceof Error ? e.message : 'bad gateway' });
  }
});

app.use('/api', async (req, res) => {
  try {
    await proxy(req, res, 'http://localhost:3001');
  } catch (e) {
    res.status(502).json({ ok: false, error: e instanceof Error ? e.message : 'bad gateway' });
  }
});

const distDir = path.resolve(__dirname, '..', 'dist');
const indexHtml = path.join(distDir, 'index.html');

app.get('/', (_req, res) => res.redirect(302, '/gaasd/'));
app.use('/gaasd', express.static(distDir));
app.get('/gaasd/*', (_req, res) => res.sendFile(indexHtml));

const port = Number(process.env.PORT || 5174);
app.listen(port, '0.0.0.0', () => {
  console.log(`preview: http://localhost:${port}/gaasd/`);
});

// ============================================================
//  MG7 Photobooth — Local Server with Gemini API Proxy
//  Usage: node server.js
//  Then open: http://localhost:8080
// ============================================================

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

const ROOT = __dirname;

// Load .env file natively if present
function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    } catch(e) {
      console.warn('Could not load .env file:', e.message);
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 8080;

// Load config: prioritize process.env (.env), with fallback to config.js parsing
let CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  IMAGE_MODEL:    process.env.IMAGE_MODEL || 'imagen-4.0-fast-generate-001',
  AR_URL:         process.env.AR_URL || '',
};

try {
  const cfgRaw = fs.readFileSync(path.join(ROOT, 'config.js'), 'utf8');
  if (!CONFIG.GEMINI_API_KEY) {
    const match = cfgRaw.match(/GEMINI_API_KEY\s*:\s*["']([^"']+)["']/);
    if (match) CONFIG.GEMINI_API_KEY = match[1];
  }
  if (!CONFIG.AR_URL) {
    const arMatch = cfgRaw.match(/AR_URL\s*:\s*["']([^"']+)["']/);
    if (arMatch) CONFIG.AR_URL = arMatch[1];
  }
  if (!CONFIG.IMAGE_MODEL) {
    const imageMatch = cfgRaw.match(/IMAGE_MODEL\s*:\s*["']([^"']+)["']/);
    if (imageMatch) CONFIG.IMAGE_MODEL = imageMatch[1];
  }
} catch(e) {
  console.warn('Could not parse config.js fallback:', e.message);
}

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.glb':  'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};


/// ── Gemini Native Image Generation (image-in → image-out) ────
// Uses gemini-3-pro-image-preview to send the user's photo directly
// and receive a fully generated AI portrait of the same person.
async function generateWithGeminiImage(API_KEY, imageBase64) {
  const pureB64 = imageBase64 && imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  const GEMINI_IMAGE_MODEL = 'gemini-3-pro-image-preview';

  const prompt = `You are given a photo of a real person. Generate a hyper-realistic AI portrait of EXACTLY the same person — preserve their precise facial features, skin tone, hair color and style, face shape, and clothing with perfect 100% accuracy.

POSE & PRODUCT:
- The person is holding a sleek, modern, ultra-thin flagship smartphone in a natural selfie holding position, angled slightly towards the camera as if taking a photo.

BACKGROUND: A futuristic flagship mobile tech showroom:
- Ultra-glossy dark reflective floor tiles showing mirror reflections
- Background walls with glowing cyan-blue and violet holographic screens displaying mobile UI schematics, microchip circuit diagrams, and futuristic tech wireframes
- Industrial ceiling with cool-white LED strip lights and soft ambient neon glow
- Wide-angle depth perspective, dramatic cinematic feel

STYLE: Hyper-realistic photographic quality, 8K, cinematic color grade with cool blue-teal shadows and warm ambient highlights, professional studio lighting, vertical portrait format (9:16).

CRITICAL: The person's face and identity must match the input photo EXACTLY. Do NOT change their appearance.`;

  const payload = JSON.stringify({
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: 'image/jpeg',
            data: pureB64
          }
        },
        { text: prompt }
      ]
    }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      temperature: 1.0,
    }
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${API_KEY}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };

  const json = await makeApiRequest(options, payload);
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inlineData && p.inlineData.data);
  if (!imgPart) throw new Error('No image returned from Gemini image model');
  const mimeType = imgPart.inlineData.mimeType || 'image/png';
  return `data:${mimeType};base64,${imgPart.inlineData.data}`;
}

/// ── Gemini API Proxy ─────────────────────────────
async function geminiProxy(body, res) {
  const API_KEY = CONFIG.GEMINI_API_KEY || '';

  try {
    console.log('🎨 Generating AI portrait via gemini-3-pro-image-preview (image-in → image-out)...');
    const resultImage = await generateWithGeminiImage(API_KEY, body.imageBase64);
    console.log('✅ Portrait generated successfully!');

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, dataUrl: resultImage, model: 'gemini-3-pro-image-preview' }));
  } catch(e) {
    console.warn(`⚠️ Pipeline failed: ${e.message}`);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: e.message }));
  }
}


function buildHeaders(API_KEY) {
  const headers = { 'Content-Type': 'application/json' };
  if (!API_KEY.startsWith('AIza')) headers['Authorization'] = `Bearer ${API_KEY}`;
  return headers;
}

function makeApiRequest(options, payload) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, apiRes => {
      const chunks = [];
      apiRes.on('data', chunk => chunks.push(chunk));
      apiRes.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
          const json = JSON.parse(raw);
          if (apiRes.statusCode !== 200) {
            reject(new Error(json?.error?.message || `HTTP ${apiRes.statusCode}`));
          } else {
            resolve(json);
          }
        } catch(e) {
          reject(new Error('JSON parse error'));
        }
      });
    });
    req.on('error', e => reject(e));
    req.write(payload);
    req.end();
  });
}

// (describePerson removed as part of client-side compositing update)

// Generate image using Imagen referenceImages (SUBJECT) so the person's
// face, hair, and clothing are preserved exactly from the webcam photo.
async function generateImagenWithSubject(API_KEY, imageBase64, prompt) {
  const pureB64 = imageBase64 && imageBase64.includes(',') 
    ? imageBase64.split(',')[1] 
    : imageBase64;

  const instance = { prompt };

  const payload = JSON.stringify({
    instances: [instance],
    parameters: {
      sampleCount: 1,
      aspectRatio: '9:16',
      personGeneration: 'allow_adult',
      safetyFilterLevel: 'block_few',
    }
  });

  const keyParam = API_KEY.startsWith('AIza') ? `?key=${API_KEY}` : '';
  const modelName = CONFIG.IMAGE_MODEL || 'imagen-4.0-fast-generate-001';
  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/${modelName}:predict${keyParam}`,
    method: 'POST',
    headers: { ...buildHeaders(API_KEY), 'Content-Length': Buffer.byteLength(payload) }
  };

  const json = await makeApiRequest(options, payload);
  const b64 = json?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('No image in Imagen response');
  return 'data:image/png;base64,' + b64;
}

// ── Main HTTP server ──────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API proxy route ──
  if (req.method === 'POST' && req.url === '/api/generate-image') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        geminiProxy(parsed, res);
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // ── Static file server ──
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/photobooth/index.html';
  if (urlPath === '/ar' || urlPath === '/ar/') urlPath = '/ar/index.html';
  if (urlPath === '/photobooth' || urlPath === '/photobooth/') urlPath = '/photobooth/index.html';

  let filePath = path.join(ROOT, urlPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`404 — Not found: ${urlPath}`);
      return;
    }

    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.stat(filePath, (err2, stat2) => {
      if (err2 || !stat2.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 — Not found: ${urlPath}`);
        return;
      }

      const ext      = path.extname(filePath).toLowerCase();
      const mime     = MIME[ext] || 'application/octet-stream';
      const cacheControl = ext === '.glb' ? 'public, max-age=3600' : 'no-cache';
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat2.size - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat2.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mime,
          'Cache-Control': cacheControl,
        });
        file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': stat2.size,
          'Content-Type': mime,
          'Accept-Ranges': 'bytes',
          'Cache-Control': cacheControl,
        });
        fs.createReadStream(filePath).pipe(res);
      }
    });
  });
});

// ── HTTP server ──────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  startupLog();
  // Start localtunnel for HTTPS access from mobile (camera needs secure context)
  startTunnel();
});

async function startTunnel() {
  try {
    const localtunnel = require('localtunnel');
    const tunnel = await localtunnel({ port: PORT, subdomain: 'mg7-ar' });
    console.log('\n🌐 HTTPS Tunnel (for mobile AR):');
    console.log(`   ${tunnel.url}/ar/`);
    console.log('   ↑ Open this URL on your phone (works in Safari + Chrome)\n');
    tunnel.on('error', () => {});
    tunnel.on('close', () => console.log('Tunnel closed.'));
  } catch(e) {
    // Try without custom subdomain
    try {
      const localtunnel = require('localtunnel');
      const tunnel = await localtunnel({ port: PORT });
      console.log('\n🌐 HTTPS Tunnel (for mobile AR):');
      console.log(`   ${tunnel.url}/ar/`);
      console.log('   ↑ Open this URL on your phone (works in Safari + Chrome)\n');
      tunnel.on('error', () => {});
    } catch(e2) {
      console.log('\n⚠️  Could not create HTTPS tunnel (no internet?)');
      console.log('   For local testing, use USB + chrome://flags/#unsafely-treat-insecure-origin-as-secure\n');
    }
  }
}

function startupLog() {
  const nets = os.networkInterfaces();
  let wifiIP = '', lan192IP = '', anyIP = '';

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family !== 'IPv4' || net.internal) continue;
      if (net.address.startsWith('169.254')) continue;
      if (net.address.startsWith('10.')       && !wifiIP)   wifiIP   = net.address;
      else if (net.address.startsWith('192.168.') && !lan192IP) lan192IP = net.address;
      if (!anyIP) anyIP = net.address;
    }
  }
  const localIP = wifiIP || lan192IP || anyIP || 'localhost';
  const hasKey  = CONFIG.GEMINI_API_KEY ? '✅ Loaded' : '❌ Not found';

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║      MG7 Photobooth + AR — Server Ready               ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  💻 PC  (Photobooth): http://localhost:${PORT}/photobooth/  ║`);
  console.log(`║  📱 HTTP (local net): http://${localIP}:${PORT}/ar/        ║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  🔑 Gemini API Key : ${hasKey.padEnd(34)}║`);
  console.log(`║  📡 WiFi IP        : ${localIP.padEnd(34)}║`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('⏳ Starting HTTPS tunnel for mobile camera access...\n');
}

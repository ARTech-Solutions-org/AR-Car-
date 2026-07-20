const https = require('https');

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

async function generateWithGeminiImage(API_KEY, imageBase64) {
  const pureB64 = imageBase64 && imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64;

  const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview';

  const prompt = `You are given a photo of a real person. Generate a hyper-realistic AI portrait of EXACTLY the same person — preserve their precise facial features, skin tone, hair color and style, face shape, and clothing with perfect accuracy.

Place this person standing confidently in the center of the frame, full body from head to toe, facing the camera in a relaxed natural pose.

BACKGROUND: A futuristic luxury MG automotive showroom:
- A sleek silver MG7 sedan positioned behind the person, MG logo clearly visible, realistic metallic paint
- Ultra-glossy dark reflective floor tiles showing mirror reflections
- Industrial ceiling with parallel LED strip lights and security cameras
- Walls with glowing cyan-blue holographic screens showing car schematics and aerodynamic data
- Amber/gold neon accent lines on pillars
- Wide-angle depth perspective, dramatic cinematic feel

STYLE: Hyper-realistic photographic quality, 8K, cinematic color grade with cool blue-teal shadows and warm amber highlights, professional studio three-point lighting, vertical portrait format (9:16).

CRITICAL: The person's face must match the input photo EXACTLY. Do NOT change their appearance.`;

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

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    const imageBase64 = body?.imageBase64;
    const API_KEY = process.env.GEMINI_API_KEY || '';

    if (!API_KEY) {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY environment variable is not configured on Vercel.' });
    }

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Missing imageBase64 in request body.' });
    }

    const resultImage = await generateWithGeminiImage(API_KEY, imageBase64);
    return res.status(200).json({
      success: true,
      dataUrl: resultImage,
      model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview'
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

const https = require('https');
const fs = require('fs');

let API_KEY = process.env.GEMINI_API_KEY || '';
if (!API_KEY && fs.existsSync('.env')) {
  const envRaw = fs.readFileSync('.env', 'utf8');
  const envMatch = envRaw.match(/GEMINI_API_KEY\s*=\s*(.+)/);
  if (envMatch) API_KEY = envMatch[1].trim().replace(/^["']|["']$/g, '');
}
if (!API_KEY && fs.existsSync('config.js')) {
  const cfgRaw = fs.readFileSync('config.js', 'utf8');
  const match = cfgRaw.match(/GEMINI_API_KEY\s*:\s*["']([^"']+)["']/);
  if (match) API_KEY = match[1];
}

const realImageBase64 = fs.readFileSync('mg(7).png', 'base64');
const payload = JSON.stringify({
  instances: [{
    prompt: 'A person standing next to a car',
    referenceImages: [{
      referenceType: 'REFERENCE_TYPE_SUBJECT',
      referenceId: 1,
      referenceImage: { content: realImageBase64 },
      subjectImageConfig: { subjectDescription: 'a person', subjectType: 'SUBJECT_TYPE_PERSON' }
    }]
  }],
  parameters: { sampleCount: 1 }
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: '/v1beta/models/imagen-4.0-fast-generate-001:predict?key=' + API_KEY,
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data.substring(0, 500)));
});
req.on('error', e => console.error(e));
req.write(payload);
req.end();

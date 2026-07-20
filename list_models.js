const https = require('https');
const fs = require('fs');
let key = process.env.GEMINI_API_KEY || '';
if (!key && fs.existsSync('.env')) {
  const envRaw = fs.readFileSync('.env', 'utf8');
  const envMatch = envRaw.match(/GEMINI_API_KEY\s*=\s*(.+)/);
  if (envMatch) key = envMatch[1].trim().replace(/^["']|["']$/g, '');
}
if (!key && fs.existsSync('config.js')) {
  const cfgRaw = fs.readFileSync('config.js', 'utf8');
  const match = cfgRaw.match(/GEMINI_API_KEY\s*:\s*["']([^"']+)["']/);
  if (match) key = match[1];
}

const req = https.request({
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: '/v1beta/models?key=' + key,
  method: 'GET'
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    j.models.filter(m => m.name.includes('gemini')).forEach(m =>
      console.log(m.name, JSON.stringify(m.supportedGenerationMethods))
    );
  });
});
req.end();

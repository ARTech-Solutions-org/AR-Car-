const https = require('https');
const fs = require('fs');
const cfg = fs.readFileSync('config.js', 'utf8');
const key = cfg.match(/GEMINI_API_KEY\s*:\s*["']([^"']+)["']/)[1];

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

/**
 * Draco Compression Script for GLB 3D Models
 * Automatically compresses .glb files in the project root directory using Draco compression.
 * 
 * Usage:
 *   node scripts/compress-glb-models.js
 *   npm run compress-models
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = fs.readdirSync(root).filter(f => f.toLowerCase().endsWith('.glb') && !f.endsWith('.bak'));

if (!files.length) {
  console.log('⚡ No .glb files found in project root directory.');
  process.exit(0);
}

console.log(`📦 Found ${files.length} GLB model(s) in root directory: ${files.join(', ')}`);

// Only target key active models: mobile.glb and mg7.glb
const targetFiles = files.filter(f => f === 'mobile.glb' || f === 'mg7.glb');

for (const file of targetFiles) {
  const inputPath = path.join(root, file);
  const tmpPath   = path.join(root, `${file}.draco.tmp`);
  const bakPath   = path.join(root, `${file}.bak`);

  const originalSizeMb = (fs.statSync(inputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n🚀 Compressing ${file} (${originalSizeMb} MB)...`);

  try {
    const cmd = `npx @gltf-transform/cli draco "${inputPath}" "${tmpPath}" --decode-speed 10`;
    execSync(cmd, { stdio: 'inherit', cwd: root });

    if (fs.existsSync(tmpPath)) {
      const compressedSizeMb = (fs.statSync(tmpPath).size / (1024 * 1024)).toFixed(2);
      fs.copyFileSync(inputPath, bakPath);
      fs.renameSync(tmpPath, inputPath);
      console.log(`✅ Compressed ${file}: ${originalSizeMb} MB → ${compressedSizeMb} MB (Original saved as ${file}.bak)`);
    }
  } catch (err) {
    console.error(`❌ Failed to compress ${file}: ${err.message}`);
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
}

console.log('\n🎉 Compression process complete!');

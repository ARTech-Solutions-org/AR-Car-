/**
 * Draco Compression Script for GLB 3D Models
 * Automatically compresses .glb files in the project root directory using Draco compression.
 * 
 * Usage:
 *   node scripts/compress-glb-models.js
 *   npm run compress-models
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = fs.readdirSync(root).filter(f => f.toLowerCase().endsWith('.glb') && !f.endsWith('.bak'));

if (!files.length) {
  console.log('⚡ No .glb files found in project root directory.');
  process.exit(0);
}

// Check if @gltf-transform/cli is available locally or via npx
const localCli = path.join(root, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const hasLocalCli = fs.existsSync(localCli);

console.log(`📦 Found ${files.length} GLB model(s) in root directory: ${files.join(', ')}`);

for (const file of files) {
  // Skip already backed up files or large basic backups
  if (file.includes('uncompressed') || file.includes('basic')) continue;

  const inputPath = path.join(root, file);
  const tmpPath   = path.join(root, `${file}.draco.tmp`);
  const bakPath   = path.join(root, `${file}.bak`);

  const originalSizeMb = (fs.statSync(inputPath).size / (1024 * 1024)).toFixed(2);
  console.log(`\n🚀 Compressing ${file} (${originalSizeMb} MB)...`);

  try {
    if (hasLocalCli) {
      execFileSync(process.execPath, [localCli, 'draco', inputPath, tmpPath, '--decode-speed', '10'], { stdio: 'inherit' });
    } else {
      console.log('⚡ Running npx @gltf-transform/cli draco...');
      execFileSync('npx.cmd', ['@gltf-transform/cli', 'draco', inputPath, tmpPath, '--decode-speed', '10'], { stdio: 'inherit' });
    }

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

/**
 * Prepare standalone Next.js build for Electron packaging.
 * This script copies the standalone server and static files to the right location.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const staticDir = path.join(rootDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');

// Destination for static files inside standalone
const destStaticDir = path.join(standaloneDir, '.next', 'static');
const destPublicDir = path.join(standaloneDir, 'public');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  Skipping (not found): ${src}`);
    return;
  }

  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('Preparing standalone build for Electron...\n');

// Check standalone exists
if (!fs.existsSync(standaloneDir)) {
  console.error('ERROR: Standalone build not found at:', standaloneDir);
  console.error('Make sure you ran "next build" with output: "standalone" in next.config.js');
  process.exit(1);
}

console.log('1. Copying static files...');
copyRecursive(staticDir, destStaticDir);

console.log('2. Copying public folder...');
copyRecursive(publicDir, destPublicDir);

// Copy .env.local if it exists (for embedded credentials)
const envFile = path.join(rootDir, '.env.local');
if (fs.existsSync(envFile)) {
  console.log('3. Copying .env.local...');
  fs.copyFileSync(envFile, path.join(standaloneDir, '.env.local'));
} else {
  console.log('3. No .env.local found (credentials will need to be added manually)');
}

console.log('\nStandalone build prepared successfully!');
console.log(`Location: ${standaloneDir}`);

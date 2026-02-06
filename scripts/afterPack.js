/**
 * electron-builder afterPack hook
 * Copies node_modules to the standalone folder since electron-builder excludes it by default
 */

const fs = require('fs');
const path = require('path');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

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

exports.default = async function(context) {
  const appOutDir = context.appOutDir;
  const resourcesDir = path.join(appOutDir, 'resources');
  const standaloneNodeModules = path.join(process.cwd(), '.next', 'standalone', 'node_modules');
  const destNodeModules = path.join(resourcesDir, 'standalone', 'node_modules');

  console.log('\n[afterPack] Copying node_modules to standalone...');
  console.log(`  From: ${standaloneNodeModules}`);
  console.log(`  To: ${destNodeModules}`);

  if (fs.existsSync(standaloneNodeModules)) {
    copyRecursive(standaloneNodeModules, destNodeModules);
    console.log('[afterPack] node_modules copied successfully!\n');
  } else {
    console.error('[afterPack] ERROR: node_modules not found in standalone folder!');
  }
};

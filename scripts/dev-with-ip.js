const { spawn } = require('child_process');
const os = require('os');

// Get local network IP address
function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const networkIP = getNetworkIP();
const port = process.env.PORT || 3000;

console.log('\n');
console.log('  ╔════════════════════════════════════════════════════════╗');
console.log('  ║           Progress Tracker - Development Server        ║');
console.log('  ╠════════════════════════════════════════════════════════╣');
console.log(`  ║  Local:    http://localhost:${port}                      ║`);
console.log(`  ║  Network:  http://${networkIP}:${port}`.padEnd(60) + '║');
console.log('  ╠════════════════════════════════════════════════════════╣');
console.log(`  ║  Mobile:   http://${networkIP}:${port}/mobile`.padEnd(60) + '║');
console.log('  ╚════════════════════════════════════════════════════════╝');
console.log('\n  Open the Mobile URL on your phone to test the PWA!\n');

// Start Next.js dev server
const nextDev = spawn('node', ['node_modules/next/dist/bin/next', 'dev', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

nextDev.on('error', (err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});

nextDev.on('close', (code) => {
  process.exit(code);
});

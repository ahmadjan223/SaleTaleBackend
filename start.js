const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Sales App Backend...');

// Start the server
const server = spawn('node', ['api/index.js'], {
  stdio: 'inherit',
  shell: true
});

// Handle server process events
server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.kill();
  process.exit(0);
}); 
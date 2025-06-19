const { spawn } = require('child_process');
const path = require('path');
const express = require('express');
const statisticsRoutes = require('./routes/statistics.routes');

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

const app = express();

// Mount statistics routes
app.use('/sales', statisticsRoutes);

// Start the express server
const expressServer = app.listen(3000, () => {
  console.log('Express server started on port 3000');
});

// Handle express server process events
expressServer.on('error', (err) => {
  console.error('Failed to start express server:', err);
  process.exit(1);
});

expressServer.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Express server exited with code ${code}`);
    process.exit(code);
  }
}); 
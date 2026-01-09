#!/usr/bin/env node

const net = require('net');

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.close();
      resolve(false); // Port is in use
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is in use
      } else {
        resolve(false); // Port is available
      }
    });
  });
}

async function main() {
  const port = parseInt(process.argv[2] || '5050');
  const isAvailable = !(await checkPort(port));
  
  if (isAvailable) {
    console.log('AVAILABLE');
  } else {
    console.log('IN_USE');
  }
}

main();
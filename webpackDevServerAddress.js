/* eslint-env node */

const fs = require('node:fs');
const process = require('node:process');
const { execSync } = require('node:child_process');

// The advertised address cannot be derived from the bind address: a published port is allocated,
// and a wildcard bind host is not browser-fetchable. Advertise an unreachable one and the page
// returns 200 with no JavaScript. Mirrored in settings.py; dependency-free so its test needs no
// node_modules.
const DEFAULT_WEBPACK_DEV_HOST = '127.0.0.1';
const DEFAULT_WEBPACK_DEV_PORT = 4000;
const WILDCARD_HOSTS = ['0.0.0.0', '::', '[::]'];

function isWSL() {
  try {
    const version = fs.readFileSync('/proc/version', 'utf8');
    return version.toLowerCase().includes('microsoft');
  } catch (err) {
    return false;
  }
}

function getWebpackDevHost() {
  if (process.env.WEBPACK_DEV_HOST) {
    return process.env.WEBPACK_DEV_HOST;
  }

  if (!isWSL()) {
    return DEFAULT_WEBPACK_DEV_HOST;
  }

  try {
    return execSync('hostname -I').toString().trim().split(' ')[0];
  } catch (err) {
    console.warn('Failed to get WSL IP address:', err);
    return DEFAULT_WEBPACK_DEV_HOST;
  }
}

function getWebpackDevPort() {
  const port = parseInt(process.env.WEBPACK_DEV_PORT, 10);
  return Number.isNaN(port) ? DEFAULT_WEBPACK_DEV_PORT : port;
}

function getWebpackDevPublicPort() {
  const port = parseInt(process.env.WEBPACK_DEV_PUBLIC_PORT, 10);
  return Number.isNaN(port) ? getWebpackDevPort() : port;
}

function getWebpackDevPublicHost() {
  if (process.env.WEBPACK_DEV_PUBLIC_HOST) {
    return process.env.WEBPACK_DEV_PUBLIC_HOST;
  }
  const devHost = getWebpackDevHost();
  // Loopback is the best a build-time value can do with a wildcard.
  return WILDCARD_HOSTS.includes(devHost) ? DEFAULT_WEBPACK_DEV_HOST : devHost;
}

module.exports = {
  getWebpackDevHost,
  getWebpackDevPort,
  getWebpackDevPublicHost,
  getWebpackDevPublicPort,
};

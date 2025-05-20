const { getDefaultConfig } = require('expo/metro-config');

// custom config for web platform
const config = getDefaultConfig(__dirname);

// allow .web.js extensions in Metro bundler
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json', 'web.js', 'web.jsx', 'web.ts', 'web.tsx'];

module.exports = config;

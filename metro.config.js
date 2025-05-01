const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add support for importing from aliases
config.resolver.extraNodeModules = {
  '@': path.resolve(__dirname, 'app'),
  '@components': path.resolve(__dirname, 'app/components'),
  '@screens': path.resolve(__dirname, 'app/screens'),
  '@constants': path.resolve(__dirname, 'app/constants'),
  '@config': path.resolve(__dirname, 'app/config'),
  '@services': path.resolve(__dirname, 'app/services'),
  '@utils': path.resolve(__dirname, 'app/_utils'),
  '@assets': path.resolve(__dirname, 'assets'),
};

module.exports = config;

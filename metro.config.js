const { getDefaultConfig } = require('expo/metro-config');

// 自定义配置，以支持 Web 平台
const config = getDefaultConfig(__dirname);

// 允许在 Metro bundler 中解析 .web.js 扩展名文件
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json', 'web.js', 'web.jsx', 'web.ts', 'web.tsx'];

module.exports = config;

// 根据环境选择合适的 API URL
let apiUrlBase = 'https://slugger-app-group6-qrpk.onrender.com/api';

// 检测是否在 Web 环境中运行
const isWeb = typeof document !== 'undefined';

// 在 Web 环境中且是开发模式下，考虑使用相对路径方便本地开发
if (isWeb && process.env.NODE_ENV === 'development') {
  // 在同源策略下，可以使用相对路径调用 API
  // 如果后端服务在相同域名但不同端口，则使用完整 URL
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalHost) {
    // console.log('Web 开发环境中使用本地 API URL');
    // apiUrlBase = 'http://localhost:5001/api'; // 本地开发时可能要取消注释
  }
}

export const API_URL = apiUrlBase;

// 导出其他配置...
export const APP_CONFIG = {
  APP_NAME: 'Slugger',
  VERSION: '1.0.0',
  // 可以添加更多配置项
}; 
export default {
  dev: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      // 避免后端/数据库较慢时出现 504 Gateway Timeout
      timeout: 60000,
      proxyTimeout: 60000,
    },
  },
};

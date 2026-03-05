const react = require('@vitejs/plugin-react')
const { defineConfig } = require('vite')
const path = require('path')

module.exports = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'antd/dist/reset.css': path.resolve(__dirname, 'node_modules/antd/dist/reset.css')
    }
  },
  build: {
    minify: false
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/py': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/py/, '')
      }
    }
  }
})

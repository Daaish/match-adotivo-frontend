import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/usuarios': 'http://localhost:3000',
      '/animais': 'http://localhost:3000',
      '/matches': 'http://localhost:3000',
      '/instituicoes': 'http://localhost:3000',
      '/adotantes': 'http://localhost:3000',
    },
  },
})

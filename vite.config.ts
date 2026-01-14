import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/CalMaker/',
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith('md-')
      }
    }
  })],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split vendor chunks by package
          if (id.includes('node_modules')) {
            if (id.includes('@material')) {
              return 'vendor-material';
            }
            if (id.includes('jszip') || id.includes('pako')) {
              return 'vendor-jszip';
            }
            if (id.includes('vue') || id.includes('@vue')) {
              return 'vendor-vue';
            }
          }
        },
      },
    },
  },
})

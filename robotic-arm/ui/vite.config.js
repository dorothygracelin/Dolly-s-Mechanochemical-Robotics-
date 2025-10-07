import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@robotic-arm': '..'
    }
  },
  build: {
    outDir: '../dist-ui',
    emptyOutDir: true,
    // increase warning threshold slightly and split large dependencies into manual chunks
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return null;
          // Put the main Three.js package in its own chunk
          if (id.includes('node_modules/three') && !id.includes('node_modules/three/examples')) {
            return 'three-vendor';
          }
          // Put three example utilities (loaders/controls) into a separate chunk
          if (id.includes('node_modules/three/examples')) {
            return 'three-examples';
          }
          // leave default behaviour for other modules
        }
      }
    }
  }
})

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@config': resolve(__dirname, './src/config'),
      '@scenes': resolve(__dirname, './src/scenes'),
      '@entities': resolve(__dirname, './src/entities'),
      '@components': resolve(__dirname, './src/components'),
      '@systems': resolve(__dirname, './src/systems'),
      '@weapons': resolve(__dirname, './src/weapons'),
      '@characters': resolve(__dirname, './src/characters'),
      '@arena': resolve(__dirname, './src/arena'),
      '@items': resolve(__dirname, './src/items'),
      '@ui': resolve(__dirname, './src/ui'),
      '@managers': resolve(__dirname, './src/managers'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@ai': resolve(__dirname, './src/ai'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});

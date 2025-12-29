import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', '*.config.*'],
    },
  },
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
    },
  },
});

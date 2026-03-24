import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'dev'),
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@indicators': resolve(__dirname, 'src/indicators'),
      '@drawings': resolve(__dirname, 'src/drawings'),
    },
  },
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        react: resolve(__dirname, 'src/react/index.ts'),
        locales: resolve(__dirname, 'src/locales/index.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
  test: {
    root: resolve(__dirname),
    include: ['tests/**/*.test.ts'],
  },
});

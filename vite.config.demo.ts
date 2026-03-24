import { defineConfig } from 'vite';
import { resolve } from 'path';

// Build the /dev/ demo app as a static site for GitHub Pages
export default defineConfig({
  root: resolve(__dirname, 'dev'),
  base: '/mg-exchange-chart/',
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@indicators': resolve(__dirname, 'src/indicators'),
      '@drawings': resolve(__dirname, 'src/drawings'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist-demo'),
    emptyDir: true,
  },
});

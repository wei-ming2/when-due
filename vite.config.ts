/// <reference types="node" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()] as any[],
  resolve: {
    alias: {
      $lib: path.resolve('./src/lib'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});

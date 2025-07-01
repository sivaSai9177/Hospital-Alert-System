import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/ui/routes',
      generatedRouteTree: './src/ui/routeTree.gen.ts',
    }),
    react(),
    // Bundle everything into a single file for Figma
    viteSingleFile({
      removeViteModuleLoader: true,
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src/ui'),
      '@shared': resolve(__dirname, './shared'),
      '@lib': resolve(__dirname, './lib'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist', // Output to the dist directory
    emptyOutDir: false, // Don't clear dist, we have code.js there
    rollupOptions: {
      input: resolve(__dirname, 'src/ui/index.html'),
      output: {
        // Don't specify custom names - let viteSingleFile handle it
      },
    },
    // Inline all assets for Figma plugin
    assetsInlineLimit: 100000,
  },
  server: {
    host: '0.0.0.0', // Bind to all interfaces for Docker
    port: 3457,
    strictPort: true,
    cors: true,
  },
  root: 'src/ui', // Set the root directory for the dev server
  // Figma plugins run in a secure context
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  let outDir = 'dist';
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'copy-printform-assets',
        apply: 'build',
        configResolved(config) {
          outDir = config.build.outDir || 'dist';
        },
        async closeBundle() {
          const sources = [
            { from: path.resolve('public/printform.js'), to: path.resolve(outDir, 'printform.js') },
            { from: path.resolve('public/favicon.svg'), to: path.resolve(outDir, 'favicon.svg') },
          ];

          await mkdir(outDir, { recursive: true });
          await Promise.all(
            sources.map(async ({ from, to }) => {
              if (!existsSync(from)) return;
              await copyFile(from, to);
            }),
          );
        },
      },
    ],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
    },
    build: {
      copyPublicDir: false,
    },
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
  };
});


import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Fixed vite config to avoid __dirname errors in ESM and correctly define process.env.API_KEY
 */
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY),
      },
      resolve: {
        alias: {
          // Fix: use path.resolve('.') instead of process.cwd() to avoid TS type issues
          '@': path.resolve('.'),
        }
      }
    };
});

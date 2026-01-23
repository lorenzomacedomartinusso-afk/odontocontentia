import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// Custom plugin to load PDF files as text
const pdfLoader = () => {
  return {
    name: 'pdf-loader',
    transform: async (code, id) => {
      if (id.endsWith('.pdf')) {
        const buffer = Buffer.from(code, 'binary'); // Vite passes binary files as string in transform for some assumed types, but best to handle carefully if possible, or use load hook.
        // Actually, for binary files, it's safer to use the 'load' hook or handle raw content.
        // Let's use 'load' hook for safer binary handling.
        return null;
      }
    },
    load: async (id) => {
      if (id.endsWith('.pdf')) {
        const fs = await import('fs');
        const buffer = fs.readFileSync(id);
        const data = await pdf(buffer);
        // Clean up text content
        const text = JSON.stringify(data.text);
        return `export default ${text};`;
      }
    }
  };
};

export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), pdfLoader()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // Ensure .pdf is treated as an asset or handled by our plugin, preventing default file loader issues if any
    assetsInclude: ['**/*.pdf']
  };
});

// Builds a single-file `<hanzo-waitlist>` custom-element bundle that can
// be dropped into any page with one <script> tag (no module bundler).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, 'src/element.tsx'),
      name: 'HanzoWaitlist',
      formats: ['iife'],
      fileName: () => 'waitlist.iife.js',
    },
    minify: 'terser',
    sourcemap: false,
  },
})

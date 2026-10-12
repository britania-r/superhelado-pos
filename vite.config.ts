// vite.config.ts
// Usa @vitejs/plugin-react (Babel, JavaScript puro) en lugar de plugin-react-swc:
// no depende de un binario nativo, así OneDrive ni Windows pueden romperlo.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
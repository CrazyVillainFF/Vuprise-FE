import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import seoPlugin from './scripts/vite-seo-plugin.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), seoPlugin({ siteUrl: env.VITE_SITE_URL })],
  }
})

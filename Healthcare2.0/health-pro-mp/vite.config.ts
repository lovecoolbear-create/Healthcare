import { UnifiedViteWeappTailwindcssPlugin as uvwt } from 'weapp-tailwindcss/vite';
import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [
    uni(),
    uvwt()
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/cloud-api': {
        target: 'https://env-00jy5xpjho0v.api-hz.cloudbasefunction.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cloud-api/, '')
      }
    }
  },
});
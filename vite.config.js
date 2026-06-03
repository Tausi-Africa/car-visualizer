import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// The existing `assets/` folder (car.glb, jetour.png, and any panorama you drop
// in) is served as static files at the site root, e.g. `/car.glb`.
// This avoids duplicating large binaries into a separate `public/` folder.
export default defineConfig(({ mode }) => {
  const base = {
    plugins: [vue()],
    publicDir: 'assets',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      open: true,
    },
  }

  // `npm run build:lib` produces an embeddable library bundle that exposes the
  // viewer components for integration into an existing host application.
  if (mode === 'lib') {
    return {
      ...base,
      build: {
        lib: {
          entry: fileURLToPath(new URL('./src/lib.js', import.meta.url)),
          name: 'CarVisualization',
          fileName: (format) => `car-visualization.${format}.js`,
        },
        rollupOptions: {
          // Host app provides Vue; Three is bundled so the viewers are self-contained.
          external: ['vue'],
          output: { globals: { vue: 'Vue' } },
        },
      },
    }
  }

  return base
})

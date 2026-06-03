<script setup>
import { ref, computed } from 'vue'
import { Aperture, Car, Globe } from 'lucide-vue-next'
import TabBar from './components/TabBar.vue'
import CarViewer from './components/CarViewer.vue'
import PanoramaViewer from './components/PanoramaViewer.vue'

// Asset URLs are served from the project's `assets/` folder (see vite.config.js).
const CAR_MODEL_URL = '/car.glb'
// assets/panorama.jpg is a web-optimized (8192×4096) version of the real
// Insta360 X4 equirectangular capture (assets/jetour.jpg, 11904×5952).
// Set to '' to show the upload / drag-and-drop empty state instead.
const PANORAMA_URL = '/panorama.jpg'

const tabs = [
  { id: 'car', label: '3D Car', icon: Car },
  { id: 'panorama', label: '360° View', icon: Globe },
]
const active = ref('car')

const activeComponent = computed(() => (active.value === 'car' ? CarViewer : PanoramaViewer))
const activeProps = computed(() =>
  active.value === 'car'
    ? { src: CAR_MODEL_URL, autoRotate: true }
    : { src: PANORAMA_URL, autoRotate: false },
)
</script>

<template>
  <div class="app">
    <header class="app__header">
      <div class="app__brand">
        <Aperture class="app__logo" :size="30" :stroke-width="2" />
        <div>
          <h1>Car Visualization</h1>
          <p>3D model &amp; 360° panorama — reusable viewer components</p>
        </div>
      </div>
      <TabBar :tabs="tabs" v-model="active" />
    </header>

    <main class="app__stage">
      <!-- keep-alive preserves each viewer (loaded model / uploaded panorama)
           across tab switches; hidden viewers pause rendering. -->
      <keep-alive>
        <component :is="activeComponent" v-bind="activeProps" :key="active" />
      </keep-alive>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh; /* avoids the mobile browser-chrome viewport jump */
  background: #0d0f14;
}
.app__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 22px;
  background: linear-gradient(180deg, #171a22, #12141a);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;
}
@media (max-width: 640px) {
  .app__header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 10px 14px;
  }
  .app__brand h1 {
    font-size: 1.05rem;
  }
  .app__brand p {
    display: none; /* keep the mobile header compact */
  }
  /* full-width, evenly-split tabs on small screens */
  .app__header :deep(.tabbar) {
    display: flex;
    width: 100%;
  }
  .app__header :deep(.tabbar__tab) {
    flex: 1;
    justify-content: center;
  }
}
.app__brand {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #f2f4f8;
}
.app__logo {
  color: #2f6df0;
  flex-shrink: 0;
}
.app__brand h1 {
  margin: 0;
  font-size: 1.15rem;
  letter-spacing: 0.2px;
}
.app__brand p {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: #9aa0ac;
}
.app__stage {
  position: relative;
  flex: 1;
  min-height: 0;
}
</style>

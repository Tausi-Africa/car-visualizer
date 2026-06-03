<script setup>
/**
 * CarViewer — drop-in Vue component that renders an interactive 3D car model.
 *
 * Reusable in any host app:
 *   <CarViewer src="/models/ev-suv.glb" :auto-rotate="true" />
 *
 * All Three.js work lives in CarViewerEngine; this component is a thin,
 * prop-driven wrapper that wires reactive state into ViewerStage.
 */
import { ref } from 'vue'
import { Pause, Play } from 'lucide-vue-next'
import ViewerStage from './ViewerStage.vue'
import { CarViewerEngine } from '@/viewer-core'
import { useViewerEngine } from '@/composables/useViewerEngine'

const props = defineProps({
  src: { type: String, required: true },
  autoRotate: { type: Boolean, default: true },
  dracoDecoderPath: { type: String, default: '' },
})

const autoRotateOn = ref(props.autoRotate)
const { engine, isLoading, progress, error, mount } = useViewerEngine(
  (container) =>
    new CarViewerEngine(container, {
      src: props.src,
      autoRotate: props.autoRotate,
      dracoDecoderPath: props.dracoDecoderPath || undefined,
      onProgress: (p) => (progress.value = p),
    }),
)

function toggleAutoRotate() {
  autoRotateOn.value = !autoRotateOn.value
  engine.value?.setAutoRotate(autoRotateOn.value)
}
</script>

<template>
  <ViewerStage
    :is-loading="isLoading"
    :progress="progress"
    :error="error"
    loading-label="Loading 3D model…"
    @ready="mount"
  >
    <div class="controls">
      <button type="button" class="pill" @click="toggleAutoRotate">
        <component :is="autoRotateOn ? Pause : Play" :size="16" :stroke-width="2.5" />
        <span>{{ autoRotateOn ? 'Pause rotation' : 'Auto-rotate' }}</span>
      </button>
      <span class="hint">Drag to orbit · Scroll to zoom</span>
    </div>
  </ViewerStage>
</template>

<style scoped>
.controls {
  position: absolute;
  left: 16px;
  bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: none;
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #11141b;
  background: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.18);
  transition: transform 0.12s ease, background 0.12s ease;
}
.pill:hover {
  transform: translateY(-1px);
  background: #fff;
}
.hint {
  font-size: 0.8rem;
  color: rgba(20, 22, 30, 0.55);
  background: rgba(255, 255, 255, 0.7);
  padding: 5px 10px;
  border-radius: 8px;
}
@media (max-width: 640px) {
  .controls {
    left: 12px;
    bottom: 12px;
  }
  .hint {
    display: none; /* touch gestures are self-explanatory; keep the screen clear */
  }
}
</style>

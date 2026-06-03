<script setup>
/**
 * PanoramaViewer — drop-in Vue component for viewing a 360° equirectangular
 * image (e.g. an Insta360 X4 export).
 *
 *   <PanoramaViewer src="/panorama.jpg" :auto-rotate="false" />
 *
 * If no `src` is supplied (or none exists yet), it shows an empty state with
 * file-pick + drag-and-drop so a user can load their own equirectangular image
 * at runtime — the same path a client would use to preview their own captures.
 */
import { ref, onBeforeUnmount } from 'vue'
import { Globe, ImagePlus, Pause, Play } from 'lucide-vue-next'
import ViewerStage from './ViewerStage.vue'
import { PanoramaViewerEngine } from '@/viewer-core'
import { useViewerEngine } from '@/composables/useViewerEngine'

const props = defineProps({
  src: { type: String, default: '' },
  autoRotate: { type: Boolean, default: false },
})

const hasImage = ref(Boolean(props.src))
const autoRotateOn = ref(props.autoRotate)
const isDragging = ref(false)
let objectUrl = null

const { engine, isLoading, progress, error, mount } = useViewerEngine(
  (container) =>
    new PanoramaViewerEngine(container, {
      src: props.src || undefined,
      autoRotate: props.autoRotate,
      onProgress: (p) => (progress.value = p),
    }),
)

async function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) return
  revokeObjectUrl()
  objectUrl = URL.createObjectURL(file)
  await engine.value?.loadPanorama(objectUrl)
  hasImage.value = true
}

function onFileInput(e) {
  loadFile(e.target.files?.[0])
}
function onDrop(e) {
  isDragging.value = false
  loadFile(e.dataTransfer?.files?.[0])
}
function toggleAutoRotate() {
  autoRotateOn.value = !autoRotateOn.value
  engine.value?.setAutoRotate(autoRotateOn.value)
}
function revokeObjectUrl() {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
}
onBeforeUnmount(revokeObjectUrl)
</script>

<template>
  <ViewerStage
    :is-loading="isLoading"
    :progress="progress"
    :error="error"
    loading-label="Loading 360° panorama…"
    @ready="mount"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="onDrop"
  >
    <!-- Empty state: prompt to load an equirectangular image. -->
    <div v-if="!hasImage" class="empty" :class="{ 'empty--drag': isDragging }">
      <div class="empty__card">
        <Globe class="empty__icon" :size="52" :stroke-width="1.5" />
        <h3>Load a 360° panorama</h3>
        <p>
          Drag &amp; drop an <strong>equirectangular (2:1)</strong> image here —
          such as an Insta360 X4 export — or choose a file.
        </p>
        <label class="pill pill--accent">
          <ImagePlus :size="16" :stroke-width="2.5" />
          <span>Choose image…</span>
          <input type="file" accept="image/*" hidden @change="onFileInput" />
        </label>
      </div>
    </div>

    <!-- Loaded state: controls + replace button. -->
    <div v-else class="controls">
      <button type="button" class="pill" @click="toggleAutoRotate">
        <component :is="autoRotateOn ? Pause : Play" :size="16" :stroke-width="2.5" />
        <span>{{ autoRotateOn ? 'Pause' : 'Auto-pan' }}</span>
      </button>
      <label class="pill">
        <ImagePlus :size="16" :stroke-width="2.5" />
        <span>Replace image</span>
        <input type="file" accept="image/*" hidden @change="onFileInput" />
      </label>
      <span class="hint">Drag to look · Scroll to zoom</span>
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
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 40%, #2a2f3a, #14161c);
  transition: background 0.15s ease;
}
.empty--drag {
  background: radial-gradient(circle at 50% 40%, #34507a, #14161c);
}
.empty__card {
  max-width: 420px;
  text-align: center;
  color: #e7e9ee;
  padding: 28px;
}
.empty__icon {
  color: #6ea0ff;
  margin-bottom: 14px;
}
.empty__card h3 {
  margin: 0 0 8px;
  font-size: 1.25rem;
}
.empty__card p {
  margin: 0 0 18px;
  color: #aab0bd;
  line-height: 1.5;
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
.pill--accent {
  color: #fff;
  background: #2f6df0;
}
.pill--accent:hover {
  background: #356ff7;
}
.hint {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.35);
  padding: 5px 10px;
  border-radius: 8px;
}
@media (max-width: 640px) {
  .controls {
    left: 12px;
    right: 12px;
    bottom: 12px;
    flex-wrap: wrap;
  }
  .hint {
    display: none;
  }
  .empty__card {
    padding: 22px;
  }
  .empty__card h3 {
    font-size: 1.1rem;
  }
}
</style>

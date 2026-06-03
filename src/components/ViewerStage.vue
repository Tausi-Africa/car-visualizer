<script setup>
import { ref, onMounted } from 'vue'

/**
 * ViewerStage — presentational shell shared by every viewer: a full-size canvas
 * host plus loading / progress / error overlays and a slot for floating UI
 * (toggles, hints). It owns no Three.js logic; it just emits its container
 * element once mounted so a parent can attach an engine to it.
 */
defineProps({
  isLoading: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
  error: { type: Object, default: null },
  loadingLabel: { type: String, default: 'Loading…' },
})

const emit = defineEmits(['ready'])
const container = ref(null)

onMounted(() => emit('ready', container.value))
</script>

<template>
  <div class="viewer-stage">
    <div ref="container" class="viewer-stage__canvas" />

    <transition name="fade">
      <div v-if="isLoading" class="viewer-stage__overlay">
        <div class="spinner" />
        <p>{{ loadingLabel }}</p>
        <div v-if="progress > 0 && progress < 1" class="progress">
          <span :style="{ width: Math.round(progress * 100) + '%' }" />
        </div>
      </div>
    </transition>

    <div v-if="error" class="viewer-stage__overlay viewer-stage__overlay--error">
      <p><strong>Could not load the viewer.</strong></p>
      <p class="muted">{{ error.message || String(error) }}</p>
    </div>

    <!-- Floating controls / hints supplied by the parent viewer. -->
    <slot v-if="!isLoading && !error" />
  </div>
</template>

<style scoped>
.viewer-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.viewer-stage__canvas {
  position: absolute;
  inset: 0;
}
.viewer-stage__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #e7e9ee;
  background: rgba(14, 16, 22, 0.55);
  backdrop-filter: blur(2px);
  text-align: center;
  padding: 24px;
}
.viewer-stage__overlay--error {
  background: rgba(40, 14, 16, 0.7);
}
.muted {
  color: #9aa0ac;
  font-size: 0.9rem;
  max-width: 32ch;
}
.spinner {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.18);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}
.progress {
  width: 180px;
  height: 4px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.18);
  overflow: hidden;
}
.progress span {
  display: block;
  height: 100%;
  background: #fff;
  transition: width 0.2s ease;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

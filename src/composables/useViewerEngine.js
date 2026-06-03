import { ref, shallowRef, onBeforeUnmount, onActivated, onDeactivated } from 'vue'

/**
 * useViewerEngine — bridges a framework-agnostic ViewerEngine subclass into a
 * Vue component. Keeps loading / progress / error reactive state, and
 * guarantees the engine is disposed when the component unmounts.
 *
 * `shallowRef` is used for the engine so Vue does not deeply observe the Three.js
 * object graph (which would be wasteful and can break internal references).
 *
 * @param {(container:HTMLElement)=>ViewerEngine} factory
 * @returns reactive handles + `mount(container)` / `destroy()`.
 */
export function useViewerEngine(factory) {
  const engine = shallowRef(null)
  const isLoading = ref(true)
  const progress = ref(0)
  const error = ref(null)

  async function mount(container) {
    try {
      isLoading.value = true
      error.value = null
      const instance = factory(container)
      engine.value = instance
      await instance.init()
    } catch (err) {
      console.error('[useViewerEngine] failed to initialise viewer:', err)
      error.value = err
    } finally {
      isLoading.value = false
    }
  }

  function destroy() {
    engine.value?.dispose()
    engine.value = null
  }

  onBeforeUnmount(destroy)

  // Under <keep-alive>, pause the render loop while the viewer's tab is hidden
  // so only the visible viewer consumes GPU. No-ops outside keep-alive.
  onDeactivated(() => engine.value?.stop())
  onActivated(() => engine.value?.start())

  return { engine, isLoading, progress, error, mount, destroy }
}

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * ViewerEngine — framework-agnostic Three.js foundation.
 *
 * Owns the renderer, scene, camera, controls, render loop and resize handling,
 * and applies a high-quality default render pipeline (correct color management,
 * ACES filmic tone mapping, antialiasing, capped device-pixel-ratio, soft
 * shadows). Subclasses add domain content (a car model, a 360° panorama, ...).
 *
 * It is deliberately Vue-free so the same code can be embedded in React,
 * Angular, web components or a plain `<script>` tag on a client's car website.
 *
 * Lifecycle:
 *   const engine = new SomeEngine(container, options)
 *   await engine.init()      // build the scene, load assets
 *   ...
 *   engine.dispose()         // release every GPU/DOM resource
 */
export class ViewerEngine {
  /**
   * @param {HTMLElement} container - element the canvas is appended to.
   * @param {object} [options]
   * @param {number} [options.maxPixelRatio=2] - cap DPR to balance crispness vs. cost.
   * @param {number} [options.cameraFov=50]
   */
  constructor(container, options = {}) {
    if (!container) throw new Error('ViewerEngine: a container element is required')
    this.container = container
    this.options = options

    this._frameId = null
    this._disposed = false
    this._onTickCallbacks = new Set()

    this._initRenderer()
    this._initScene()
    this._initCamera()
    this._initControls()
    this._initResizeObserver()
  }

  // --- Setup -------------------------------------------------------------

  _initRenderer() {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    const maxDpr = this.options.maxPixelRatio ?? 2
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr))
    renderer.setSize(this._width, this._height)

    // High-quality output pipeline.
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'

    this.container.appendChild(renderer.domElement)
    this.renderer = renderer
  }

  _initScene() {
    this.scene = new THREE.Scene()
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      this.options.cameraFov ?? 50,
      this._aspect,
      0.1,
      1000,
    )
    this.camera.position.set(0, 1.5, 5)
  }

  _initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    this.controls = controls
  }

  _initResizeObserver() {
    // ResizeObserver tracks the container itself, so the viewer reacts to
    // layout changes (tab switches, sidebars) — not just window resizes.
    this._resizeObserver = new ResizeObserver(() => this.resize())
    this._resizeObserver.observe(this.container)
  }

  // --- Public API --------------------------------------------------------

  /**
   * Build scene content. Subclasses override and call `super.init()`.
   * @returns {Promise<this>}
   */
  async init() {
    this.start()
    return this
  }

  /** Register a per-frame callback. Returns an unsubscribe function. */
  onTick(fn) {
    this._onTickCallbacks.add(fn)
    return () => this._onTickCallbacks.delete(fn)
  }

  /** Start the render loop (idempotent). */
  start() {
    if (this._frameId != null || this._disposed) return
    const loop = () => {
      this._frameId = requestAnimationFrame(loop)
      this._tick()
    }
    this._frameId = requestAnimationFrame(loop)
  }

  /** Pause the render loop (e.g. when the viewer's tab is hidden). */
  stop() {
    if (this._frameId != null) {
      cancelAnimationFrame(this._frameId)
      this._frameId = null
    }
  }

  resize() {
    if (this._disposed) return
    const w = this._width
    const h = this._height
    if (w === 0 || h === 0) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.render()
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  /** Release every GPU resource, DOM node and observer. Safe to call once. */
  dispose() {
    if (this._disposed) return
    this._disposed = true
    this.stop()
    this._resizeObserver?.disconnect()
    this._onTickCallbacks.clear()
    this.controls?.dispose()
    this._disposeSceneGraph()
    this.renderer?.dispose()
    if (this.renderer?.domElement?.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement)
    }
  }

  // --- Internal ----------------------------------------------------------

  _tick() {
    this.controls.update()
    for (const fn of this._onTickCallbacks) fn()
    this.render()
  }

  _disposeSceneGraph() {
    this.scene?.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      const material = obj.material
      if (!material) return
      const materials = Array.isArray(material) ? material : [material]
      for (const mat of materials) {
        for (const value of Object.values(mat)) {
          if (value && value.isTexture) value.dispose()
        }
        mat.dispose()
      }
    })
  }

  get _width() {
    return this.container.clientWidth
  }

  get _height() {
    return this.container.clientHeight
  }

  get _aspect() {
    return this._height > 0 ? this._width / this._height : 1
  }
}

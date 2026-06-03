import * as THREE from 'three'
import { ViewerEngine } from './ViewerEngine.js'
import { PanoramaControls } from './PanoramaControls.js'

/**
 * PanoramaViewerEngine — displays a 360° equirectangular image (2:1) such as
 * the output of an Insta360 X4 ("...EQ.jpg" / exported equirectangular frame).
 *
 * The image is set as the scene background with equirectangular mapping, so
 * Three.js projects it correctly onto the full sphere — there is no visible
 * geometry, just the camera looking outward from the centre. Texture quality is
 * maximised (sRGB color space, max anisotropy) so fine detail stays crisp.
 *
 * @example
 *   const engine = new PanoramaViewerEngine(el, { src: '/panorama.jpg' })
 *   await engine.init()
 *   engine.loadPanorama(objectUrlFromUserUpload)   // swap at runtime
 */
export class PanoramaViewerEngine extends ViewerEngine {
  constructor(container, options = {}) {
    super(container, { cameraFov: 75, ...options })
    // Camera sits at the centre of the sphere looking outward.
    this.camera.position.set(0, 0, 0)
    this.currentTexture = null
  }

  // Override the base OrbitControls with inside-the-sphere look controls.
  _initControls() {
    this.controls = new PanoramaControls(this.camera, this.renderer.domElement, {
      autoRotate: this.options.autoRotate ?? false,
      autoRotateSpeed: this.options.autoRotateSpeed ?? 0.05,
    })
  }

  async init() {
    if (this.options.src) await this.loadPanorama(this.options.src)
    this.start()
    return this
  }

  /**
   * Load (or swap) the equirectangular image.
   * @param {string} src - URL or object URL of a 2:1 equirectangular image.
   * @returns {Promise<THREE.Texture>}
   */
  async loadPanorama(src) {
    if (!src) throw new Error('PanoramaViewerEngine: `src` image URL is required')
    const loader = new THREE.TextureLoader()
    const texture = await loader.loadAsync(src, (event) => {
      if (this.options.onProgress && event.lengthComputable) {
        this.options.onProgress(event.loaded / event.total)
      }
    })

    // Many mobile GPUs cap textures at 4096px; an 8192px panorama would fail to
    // upload (black screen). Downscale to fit the device limit before use.
    this._fitToMaxTextureSize(texture)

    texture.colorSpace = THREE.SRGBColorSpace
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy()
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.generateMipmaps = true

    if (this.currentTexture) this.currentTexture.dispose()
    this.currentTexture = texture
    this.scene.background = texture
    this.render()
    return texture
  }

  /**
   * If the decoded image is wider/taller than the GPU's max texture size,
   * redraw it onto a fitted canvas (preserving the 2:1 ratio). Mostly a no-op
   * on desktop; essential for mobile.
   */
  _fitToMaxTextureSize(texture) {
    const maxSize = this.renderer.capabilities.maxTextureSize
    const image = texture.image
    if (!image || (image.width <= maxSize && image.height <= maxSize)) return

    const scale = maxSize / Math.max(image.width, image.height)
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(image.width * scale)
    canvas.height = Math.floor(image.height * scale)
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    texture.image = canvas
    texture.needsUpdate = true
  }

  setAutoRotate(enabled) {
    this.controls.autoRotate = enabled
  }

  dispose() {
    this.currentTexture?.dispose()
    super.dispose()
  }
}

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ViewerEngine } from './ViewerEngine.js'

/**
 * CarViewerEngine — loads and presents a 3D car model (glTF / GLB).
 *
 * Quality choices, so the model "looks production" out of the box:
 *  - Image-based lighting from a generated RoomEnvironment (soft, neutral
 *    studio reflections on paint/chrome/glass) — no external HDR needed.
 *  - A key directional light that casts a soft contact shadow onto a ground
 *    plane, grounding the car instead of floating it.
 *  - Automatic framing: the camera and orbit target are fit to the model's
 *    bounding box regardless of how the asset was authored or scaled.
 *
 * @example
 *   const engine = new CarViewerEngine(el, { src: '/car.glb', autoRotate: true })
 *   await engine.init()
 */
export class CarViewerEngine extends ViewerEngine {
  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {string} options.src - URL of the .glb/.gltf model.
   * @param {boolean} [options.autoRotate=true]
   * @param {number} [options.autoRotateSpeed=0.6]
   * @param {string} [options.dracoDecoderPath] - path to Draco decoders for compressed models.
   * @param {(progress:number)=>void} [options.onProgress] - 0..1 load progress.
   */
  constructor(container, options = {}) {
    super(container, options)
    this.model = null
    this._pmrem = null
    this._setupEnvironment()
    this._setupLighting()
    this._setupGround()
    this._applyAutoRotate()
  }

  _setupEnvironment() {
    // PMREM-prefiltered RoomEnvironment gives physically plausible reflections
    // for metallic/clearcoat car paint without shipping an HDR file.
    this._pmrem = new THREE.PMREMGenerator(this.renderer)
    const envScene = new RoomEnvironment()
    this.scene.environment = this._pmrem.fromScene(envScene, 0.04).texture
    this.scene.background = null // transparent → host page background shows through
  }

  _setupLighting() {
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(4, 8, 6)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.bias = -0.0001
    const d = 6
    Object.assign(key.shadow.camera, { left: -d, right: d, top: d, bottom: -d, near: 0.5, far: 40 })
    this.scene.add(key)
    this._keyLight = key

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25))
  }

  _setupGround() {
    // Receives only shadow, so it works on any page background.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.28 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)
    this._ground = ground
  }

  _applyAutoRotate() {
    this.controls.autoRotate = this.options.autoRotate ?? true
    this.controls.autoRotateSpeed = this.options.autoRotateSpeed ?? 0.6
  }

  async init() {
    await this.loadModel(this.options.src)
    this.start()
    return this
  }

  /** Load (or swap) the model URL and reframe the camera. */
  async loadModel(src) {
    if (!src) throw new Error('CarViewerEngine: `src` model URL is required')

    const loader = new GLTFLoader()
    if (this.options.dracoDecoderPath) {
      const draco = new DRACOLoader()
      draco.setDecoderPath(this.options.dracoDecoderPath)
      loader.setDRACOLoader(draco)
      this._draco = draco
    }

    const gltf = await loader.loadAsync(src, (event) => {
      if (this.options.onProgress && event.lengthComputable) {
        this.options.onProgress(event.loaded / event.total)
      }
    })

    if (this.model) {
      this.scene.remove(this.model)
    }
    this.model = gltf.scene
    this.model.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
        if (obj.material) obj.material.envMapIntensity = 1.0
      }
    })
    this.scene.add(this.model)
    this._frameModel(this.model)
    this.render()
    return this.model
  }

  /** Fit camera distance, clip planes, orbit target and ground to the model. */
  _frameModel(object) {
    const box = new THREE.Box3().setFromObject(object)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    // Drop the model so its base sits on the ground plane (y = 0).
    object.position.y -= box.min.y
    center.y -= box.min.y

    const maxDim = Math.max(size.x, size.y, size.z)
    const fovRad = (this.camera.fov * Math.PI) / 180
    const distance = (maxDim / 2 / Math.tan(fovRad / 2)) * 1.6

    this.camera.near = maxDim / 100
    this.camera.far = maxDim * 100
    this.camera.updateProjectionMatrix()

    // A 3/4 hero angle reads better than a flat side-on shot.
    this.camera.position.set(
      center.x + distance * 0.8,
      center.y + maxDim * 0.45,
      center.z + distance * 0.9,
    )
    this.controls.target.copy(center)
    this.controls.minDistance = distance * 0.4
    this.controls.maxDistance = distance * 3
    this.controls.maxPolarAngle = Math.PI / 2 // don't orbit under the floor
    this.controls.update()
  }

  setAutoRotate(enabled) {
    this.controls.autoRotate = enabled
  }

  dispose() {
    this._draco?.dispose()
    this._pmrem?.dispose()
    super.dispose()
  }
}

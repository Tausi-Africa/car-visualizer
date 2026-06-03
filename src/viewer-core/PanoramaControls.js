import * as THREE from 'three'

/**
 * PanoramaControls — drag-to-look + wheel-to-zoom controller for a camera
 * sitting at the centre of an equirectangular panorama.
 *
 * This is the canonical lon/lat approach (as in Three.js's
 * `webgl_panorama_equirectangular` example) rather than OrbitControls, because
 * orbiting *around* a target feels wrong when the viewer is *inside* the sphere.
 *
 * Exposes the OrbitControls-compatible surface the render loop expects:
 *   `.update()`, `.dispose()`, `.autoRotate`, `.autoRotateSpeed`.
 */
export class PanoramaControls {
  constructor(camera, domElement, options = {}) {
    this.camera = camera
    this.domElement = domElement
    this.autoRotate = options.autoRotate ?? false
    this.autoRotateSpeed = options.autoRotateSpeed ?? 0.05 // degrees/frame

    this.lon = options.initialLon ?? 0
    this.lat = options.initialLat ?? 0
    this.minFov = options.minFov ?? 30
    this.maxFov = options.maxFov ?? 90

    // Active pointers by id — lets us tell a one-finger drag (look) from a
    // two-finger gesture (pinch-zoom) on touch devices.
    this._pointers = new Map()
    this._pointerX = 0
    this._pointerY = 0
    this._lonStart = 0
    this._latStart = 0
    this._pinchStartDist = 0
    this._pinchStartFov = 0
    this._target = new THREE.Vector3()

    this._bind()
  }

  _bind() {
    this._onPointerDown = (e) => {
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      this.domElement.setPointerCapture?.(e.pointerId)
      if (this._pointers.size === 1) {
        this._startDrag(e.clientX, e.clientY)
      } else if (this._pointers.size === 2) {
        this._startPinch()
      }
    }
    this._onPointerMove = (e) => {
      if (!this._pointers.has(e.pointerId)) return
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (this._pointers.size >= 2) {
        // Two fingers → pinch to zoom (adjust FOV by the distance ratio).
        const dist = this._pinchDistance()
        if (this._pinchStartDist > 0) {
          const fov = this._pinchStartFov * (this._pinchStartDist / dist)
          this.camera.fov = THREE.MathUtils.clamp(fov, this.minFov, this.maxFov)
          this.camera.updateProjectionMatrix()
        }
        return
      }
      // One finger / mouse drag → look around.
      const speed = (this.camera.fov / 90) * 0.1 // °/px, scaled by zoom level
      this.lon = this._lonStart - (e.clientX - this._pointerX) * speed
      this.lat = this._latStart + (e.clientY - this._pointerY) * speed
    }
    this._onPointerUp = (e) => {
      this._pointers.delete(e.pointerId)
      this.domElement.releasePointerCapture?.(e.pointerId)
      // Re-anchor a remaining finger so the look doesn't jump after a pinch.
      const remaining = this._pointers.values().next().value
      if (remaining) this._startDrag(remaining.x, remaining.y)
      if (this._pointers.size === 0) this.domElement.style.cursor = 'grab'
    }
    this._onWheel = (e) => {
      e.preventDefault()
      const fov = this.camera.fov + e.deltaY * 0.05
      this.camera.fov = THREE.MathUtils.clamp(fov, this.minFov, this.maxFov)
      this.camera.updateProjectionMatrix()
    }

    const el = this.domElement
    el.style.cursor = 'grab'
    el.style.touchAction = 'none' // we own all gestures; suppress native scroll/zoom
    el.addEventListener('pointerdown', this._onPointerDown)
    el.addEventListener('pointermove', this._onPointerMove)
    window.addEventListener('pointerup', this._onPointerUp)
    window.addEventListener('pointercancel', this._onPointerUp)
    el.addEventListener('wheel', this._onWheel, { passive: false })
  }

  _startDrag(x, y) {
    this._pointerX = x
    this._pointerY = y
    this._lonStart = this.lon
    this._latStart = this.lat
    this.domElement.style.cursor = 'grabbing'
  }

  _startPinch() {
    this._pinchStartDist = this._pinchDistance()
    this._pinchStartFov = this.camera.fov
  }

  _pinchDistance() {
    const [a, b] = [...this._pointers.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  update() {
    const interacting = this._pointers.size > 0
    if (this.autoRotate && !interacting) this.lon += this.autoRotateSpeed
    // Clamp vertical look so you can't flip past the poles.
    this.lat = THREE.MathUtils.clamp(this.lat, -85, 85)
    const phi = THREE.MathUtils.degToRad(90 - this.lat)
    const theta = THREE.MathUtils.degToRad(this.lon)
    this._target.setFromSphericalCoords(500, phi, theta)
    this.camera.lookAt(this._target)
  }

  dispose() {
    const el = this.domElement
    el.removeEventListener('pointerdown', this._onPointerDown)
    el.removeEventListener('pointermove', this._onPointerMove)
    window.removeEventListener('pointerup', this._onPointerUp)
    window.removeEventListener('pointercancel', this._onPointerUp)
    el.removeEventListener('wheel', this._onWheel)
  }
}

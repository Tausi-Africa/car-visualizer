# Car Visualization — 3D & 360° Viewers

A small Vue 3 + Three.js app with two tabs:

1. **3D Car** — an interactive 3D car model (glTF/GLB) with studio lighting, soft shadows and auto-rotate.
2. **360° View** — a 360° **equirectangular** panorama viewer (e.g. an Insta360 X4 export) with drag-to-look and zoom.

It is built as a **proof-of-concept that is meant to graduate into production**: the viewers are packaged as reusable, prop-driven components (and framework-agnostic engines underneath) so they can be dropped into existing car-dealer / OEM websites with minimal glue.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production SPA → dist/
npm run preview    # preview the production build
npm run build:lib  # embeddable library bundle → dist/car-visualization.*.js
```

> Requires Node 18+ (developed on Node 22).

---

## Assets

The existing `assets/` folder is served at the site root (configured via `publicDir` in `vite.config.js`), so large binaries are **not** duplicated.

| File                  | Used by    | Notes                                                                                          |
| --------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| `assets/car.glb`      | 3D Car tab | Served as `/car.glb`. Swap for any `.glb`/`.gltf`.                                              |
| `assets/jetour.jpg`   | (source)   | The **original Insta360 X4 equirectangular capture** (11904×5952, ~52 MB). Left untouched.     |
| `assets/panorama.jpg` | 360° tab   | **Web-optimized 8192×4096** version of `jetour.jpg` (~12 MB), used as the default. Served as `/panorama.jpg`. |

### About the 360° image

The 360° viewer expects an **equirectangular (2:1) image** — the standard export from an Insta360 X4 (the `..._EQ.jpg` / "flat" stitched export, *not* the raw dual-fisheye `.insv`). `assets/jetour.jpg` is exactly that: a real X4 capture of a car interior.

Because the original is ~52 MB / 11904 px wide (which exceeds the max GPU texture size on many devices), the app uses a **down-scaled 8192×4096 copy** (`panorama.jpg`) as the default for fast, broadly-compatible loading. To regenerate it from a different capture:

```bash
# macOS (sips): resize to 8192 wide, JPEG quality ~82
cp my_capture.jpg assets/jetour.jpg
sips -Z 8192 --setProperty format jpeg --setProperty formatOptions 82 assets/jetour.jpg --out assets/panorama.jpg
```

Other ways to supply a 360° image:

- **Upload at runtime** — open the 360° tab and use *Replace image* / drag-and-drop an equirectangular image. No code changes needed.
- **Show the upload empty state** — set `PANORAMA_URL = ''` in `src/App.vue`.

> For production, generate responsive sizes (e.g. 4096 / 8192) and pick per device, or stream tiles for very large panoramas.

> Insta360 X4 raw captures (`.insv` dual-fisheye) must first be stitched to equirectangular via Insta360 Studio (or the mobile app) before use. For true raw stitching in-browser you'd integrate a WebGL stitcher — out of scope for this POC.

---

## Architecture

The guiding principle is **separation of the rendering engine from the UI framework**, so the hard part (Three.js) is reusable even outside Vue.

```
src/
├── viewer-core/                 # ① Framework-agnostic Three.js engines (no Vue)
│   ├── ViewerEngine.js          #    Base: renderer, scene, camera, controls,
│   │                            #    render loop, resize observer, dispose.
│   │                            #    High-quality pipeline (sRGB, ACES tone
│   │                            #    mapping, AA, capped DPR, soft shadows).
│   ├── CarViewerEngine.js       #    GLTF load + IBL env + ground shadow + auto-framing.
│   ├── PanoramaViewerEngine.js  #    Equirectangular background + texture quality.
│   ├── PanoramaControls.js      #    Inside-the-sphere drag/zoom look controls.
│   └── index.js
│
├── composables/
│   └── useViewerEngine.js       # ② Vue bridge: mount/dispose, loading/progress/
│                                #    error state, pause hidden tabs (keep-alive).
│
├── components/                  # ③ Thin, prop-driven Vue wrappers
│   ├── ViewerStage.vue          #    Shared shell: canvas host + overlays.
│   ├── CarViewer.vue            #    <CarViewer src="..." :auto-rotate />
│   ├── PanoramaViewer.vue       #    <PanoramaViewer src="..." /> + upload/drag-drop.
│   └── TabBar.vue               #    Reusable, accessible tab strip.
│
├── App.vue                      # ④ Demo composition (tabs + keep-alive)
├── lib.js                       #    Library entry (exports components + engines)
└── main.js
```

**Why these layers?**

- **① Engines** hold all Three.js logic as plain ES classes with a clear lifecycle (`new → init() → dispose()`). They have zero framework imports, so the same code runs under React, Angular, a web component, or a plain `<script>` on a client's site. Subclassing (`CarViewerEngine`, `PanoramaViewerEngine`) keeps shared concerns (renderer setup, resize, disposal) in one place.
- **② Composable** is the single, reusable bridge between any engine and Vue's reactivity + lifecycle. It guarantees cleanup (`dispose` on unmount) and pauses rendering for hidden tabs.
- **③ Components** are deliberately thin and **prop-driven** — no business logic — so a host app configures them by passing props, and they can be restyled per client without touching rendering code.
- **④** `App.vue` is just a demo of how to compose them; a client integration would import the components directly.

### Rendering-quality choices ("render first, best quality")

- **Color & tone**: `SRGBColorSpace` output + `ACESFilmicToneMapping` for realistic highlights on paint/chrome.
- **Crispness**: antialiasing on; `devicePixelRatio` capped at 2 (retina-sharp without melting low-end GPUs); max anisotropic filtering on the panorama texture.
- **Lighting**: image-based lighting from a generated `RoomEnvironment` (soft studio reflections) — no external HDR file to ship — plus a shadow-casting key light.
- **Grounding**: a shadow-only ground plane and automatic bounding-box framing so any model is centred and sits on the floor regardless of how it was authored.
- **Loading**: assets load before the scene is revealed; a progress overlay covers the load.

### Mobile / touch

The app is responsive and touch-first:

- **Layout** — below 640px the header stacks and the tabs become full-width; the canvas uses `100dvh` to avoid the mobile browser-chrome viewport jump. Floating control hints are hidden on small screens to keep the view clear.
- **Gestures** — the 3D car uses Three.js OrbitControls (one-finger orbit, two-finger pinch-zoom, drag-pan). The 360° viewer's `PanoramaControls` implements one-finger look + **two-finger pinch-to-zoom** via Pointer Events, with `touch-action: none` so the page never scrolls while you interact.
- **Aspect-adaptive field of view** — Three.js's `camera.fov` is *vertical*, so a fixed value makes a tall portrait screen look heavily zoomed-in (you'd see only a narrow horizontal slice of the panorama). `PanoramaControls` instead tracks a target **horizontal** FOV and derives the vertical FOV from the live aspect ratio each frame (capped to limit distortion), so the amount of scene you see stays consistent between portrait, landscape and desktop.
- **GPU limits** — the panorama auto-downscales to the device's `maxTextureSize` (many phones cap at 4096px) so a large equirectangular image never fails to upload (which otherwise shows as a black sphere).
- Pull-to-refresh / rubber-banding and tap-highlight flashes are suppressed over the viewers.

### Lifecycle & performance

- Every engine fully **disposes** geometries, materials, textures, the renderer and DOM node — no GPU leaks when components unmount or models are swapped.
- A **`ResizeObserver`** on the container (not just `window`) keeps the canvas crisp through layout/tab changes.
- Under `<keep-alive>`, hidden viewers **pause their render loop** so only the visible tab uses the GPU; switching back restores the loaded model / uploaded panorama instantly.

---

## Integrating into an existing site

**Option A — import the components** (recommended in a Vue host):

```vue
<script setup>
import { CarViewer, PanoramaViewer } from 'car-visualization'
</script>

<template>
  <CarViewer src="/models/ev-suv.glb" :auto-rotate="true" />
  <PanoramaViewer src="/captures/showroom_EQ.jpg" />
</template>
```

**Option B — drive the engine directly** (no Vue / any framework):

```js
import { CarViewerEngine } from 'car-visualization'

const engine = new CarViewerEngine(document.querySelector('#stage'), {
  src: '/models/ev-suv.glb',
  autoRotate: true,
})
await engine.init()
// later: engine.loadModel('/models/other.glb');  engine.dispose()
```

Build the bundle with `npm run build:lib`. Vue is kept external (the host provides it); Three.js is bundled so the viewers are self-contained.

### Component props

**`<CarViewer>`**

| Prop               | Type      | Default | Description                                 |
| ------------------ | --------- | ------- | ------------------------------------------- |
| `src`              | `string`  | —       | URL of the `.glb`/`.gltf` model (required). |
| `autoRotate`       | `boolean` | `true`  | Spin the model automatically.               |
| `dracoDecoderPath` | `string`  | `''`    | Path to Draco decoders for compressed GLBs. |

**`<PanoramaViewer>`**

| Prop         | Type      | Default | Description                                                   |
| ------------ | --------- | ------- | ------------------------------------------------------------- |
| `src`        | `string`  | `''`    | URL of a 2:1 equirectangular image. Omit to show the upload UI. |
| `autoRotate` | `boolean` | `false` | Slowly pan the view automatically.                            |

---

## Tech stack

- **Vue 3** (Composition API, `<script setup>`)
- **Three.js** (`WebGLRenderer`, `GLTFLoader`, `PMREMGenerator` + `RoomEnvironment`)
- **Vite 6** (dev server + SPA build + library build)

## Possible next steps for production

- Per-client theming via CSS variables / props.
- Hotspot annotations on the 3D model and inside the 360° scene.
- Paint/trim configurator (swap materials at runtime).
- Lazy-load Three.js as a separate chunk to shrink the initial bundle.
- In-browser stitching of raw Insta360 dual-fisheye `.insv` if clients supply unstitched captures.

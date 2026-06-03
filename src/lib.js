/**
 * Library entry point (`npm run build:lib`).
 *
 * Exposes the viewer components and the framework-agnostic engines so they can
 * be imported into an existing host application:
 *
 *   import { CarViewer, PanoramaViewer } from 'car-visualization'
 *   // or, without Vue, drive the engines directly:
 *   import { CarViewerEngine } from 'car-visualization'
 *
 * Optional global registration:
 *   import { install } from 'car-visualization'
 *   app.use(install)
 */
import CarViewer from './components/CarViewer.vue'
import PanoramaViewer from './components/PanoramaViewer.vue'
import TabBar from './components/TabBar.vue'

export { CarViewer, PanoramaViewer, TabBar }
export * from './viewer-core'

export function install(app) {
  app.component('CarViewer', CarViewer)
  app.component('PanoramaViewer', PanoramaViewer)
  app.component('TabBar', TabBar)
}

export default { install }

import ParticleField from './particle-field.js';
import HeroScene from './hero-scene.js';
import TravelGlobe from './travel-globe.js';
import PhotoViewer from './photo-viewer.js';

export function initThreeJS() {
  const particleEl = document.getElementById('particle-field');
  if (particleEl) new ParticleField(particleEl);

  const heroEl = document.getElementById('hero-scene');
  if (heroEl) new HeroScene(heroEl);

  const globeEl = document.getElementById('travel-globe');
  if (globeEl) {
    const globe = new TravelGlobe(globeEl);
    window.__globe = globe;
  }

  const photoViewerEl = document.getElementById('photo-viewer');
  if (photoViewerEl) {
    const viewer = new PhotoViewer(photoViewerEl);
    window.__photoViewer = viewer;
  }
}

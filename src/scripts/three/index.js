export async function initThreeJS() {
  const particleEl = document.getElementById('particle-field');
  if (particleEl) {
    const { default: ParticleField } = await import('./particle-field.js');
    new ParticleField(particleEl);
  }

  const heroEl = document.getElementById('hero-scene');
  if (heroEl) {
    const { default: HeroScene } = await import('./hero-scene.js');
    new HeroScene(heroEl);
  }

  const globeEl = document.getElementById('travel-globe');
  if (globeEl) {
    const { default: TravelGlobe } = await import('./travel-globe.js');
    const globe = new TravelGlobe(globeEl);
    window.__globe = globe;
  }
}

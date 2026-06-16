import Alpine from 'alpinejs';
import travelAtlas from './components/travel-atlas.js';

window.Alpine = Alpine;

document.addEventListener('alpine:init', () => {
  Alpine.data('travelAtlas', travelAtlas);
});

Alpine.start();

document.addEventListener('DOMContentLoaded', () => {
  const hasThree = document.getElementById('particle-field') ||
                   document.getElementById('hero-scene') ||
                   document.getElementById('travel-globe');
  if (hasThree) {
    import('./three/index.js').then(m => m.initThreeJS());
  }
});

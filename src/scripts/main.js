import Alpine from 'alpinejs';
import travelAtlas from './components/travel-atlas.js';

window.Alpine = Alpine;

document.addEventListener('alpine:init', () => {
  Alpine.data('travelAtlas', travelAtlas);
});

Alpine.start();

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const TRIP_COORDS = {
  '2023-06-hanoi-vietnam': { lat: 21.0285, lng: 105.8542, label: 'Hanoi' },
  '2024-04-cambodia': { lat: 13.4125, lng: 103.867, label: 'Cambodia' },
  '2024-09-saigon-vietnam': { lat: 10.8231, lng: 106.6297, label: 'Saigon' },
  '2025-03-thailand': { lat: 13.7563, lng: 100.5018, label: 'Thailand' },
  '2025-08-danang-vietnam': { lat: 16.0544, lng: 108.2022, label: 'Danang' },
};

function latLngToPos(lat, lng, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export default class TravelGlobe {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.markers = [];
    this.arcs = [];
    this.hoveredMarker = null;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(-1.04, 2.32, -3.89);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 6;
    this.controls.autoRotate = false;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.enabled = false;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerDownPos = null;
    this.isDragging = false;

    this.addLighting();
    this.createGlobe();
    this.createAtmosphere();
    this.bindEvents();
    this.fetchManifest();
    this.animate();
  }

  addLighting() {
    const ambient = new THREE.AmbientLight(0x334466, 2.5);
    this.scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3);
    sunLight.position.set(5, 3, 5);
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x6366f1, 0.6);
    fillLight.position.set(-5, -1, -3);
    this.scene.add(fillLight);
  }

  createGlobe() {
    const radius = 1.6;
    this.globeRadius = radius;

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('/textures/earth-blue-marble.jpg');
    const bumpTexture = textureLoader.load('/textures/earth-topology.png');

    const sphereGeo = new THREE.SphereGeometry(radius, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.05,
      specular: new THREE.Color(0x333333),
      shininess: 15,
    });
    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.scene.add(this.sphere);
  }

  createAtmosphere() {
    const glowGeo = new THREE.SphereGeometry(this.globeRadius * 1.04, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.scene.add(this.glow);

    const outerGlowGeo = new THREE.SphereGeometry(this.globeRadius * 1.12, 64, 64);
    const outerGlowMat = new THREE.MeshBasicMaterial({
      color: 0x2255aa,
      transparent: true,
      opacity: 0.025,
      side: THREE.BackSide,
    });
    this.outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
    this.scene.add(this.outerGlow);
  }

  async fetchManifest() {
    try {
      const res = await fetch('/data/travel-manifest.json');
      const data = await res.json();
      const trips = data.trips.filter(t => TRIP_COORDS[t.id]);
      trips.forEach(trip => {
        const coords = TRIP_COORDS[trip.id];
        this.addMarker(trip.id, coords.lat, coords.lng, coords.label);
      });
      this.createArcs(trips);
    } catch (e) {
      console.warn('Globe: could not load manifest', e);
    }
  }

  addMarker(id, lat, lng, label) {
    const pos = latLngToPos(lat, lng, this.globeRadius);

    const dotGeo = new THREE.SphereGeometry(0.015, 10, 10);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(pos);
    this.scene.add(dot);

    const glowGeo = new THREE.SphereGeometry(0.028, 10, 10);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.2,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(pos);
    this.scene.add(glow);

    const ringGeo = new THREE.RingGeometry(0.015, 0.028, 20);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(0, 0, 0);
    this.scene.add(ring);

    const pulseGeo = new THREE.RingGeometry(0.006, 0.01, 12);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xc4b5fd,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    pulse.position.copy(pos);
    pulse.lookAt(0, 0, 0);
    this.scene.add(pulse);

    this.markers.push({ id, dot, glow, ring, pulse, pos, label, lat, lng, scale: 1 });
  }

  createArcs(trips) {
    const homeCoords = TRIP_COORDS['2025-08-danang-vietnam'] || (trips[0] && TRIP_COORDS[trips[0].id]);

    trips.forEach((trip, i) => {
      const destCoords = TRIP_COORDS[trip.id];
      if (!destCoords) return;

      const from = latLngToPos(homeCoords.lat, homeCoords.lng, this.globeRadius);
      const to = latLngToPos(destCoords.lat, destCoords.lng, this.globeRadius);
      if (from.distanceTo(to) < 0.01) return;

      const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(this.globeRadius * 1.5);

      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const pts = curve.getPoints(32);
      const positions = [];
      pts.forEach(p => positions.push(p.x, p.y, p.z));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: 0xa78bfa,
        transparent: true,
        opacity: 0.3,
      });
      const arc = new THREE.Line(geo, mat);
      this.scene.add(arc);
      this.arcs.push(arc);
    });
  }

  bindEvents() {
    const onPointerDown = (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.isDragging = false;
    };
    const onPointerMove = (e) => {
      if (this.pointerDownPos) {
        const dx = e.clientX - this.pointerDownPos.x;
        const dy = e.clientY - this.pointerDownPos.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          this.isDragging = true;
        }
      }
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const globeHits = this.raycaster.intersectObject(this.sphere);
      this.controls.enabled = globeHits.length > 0;

      this.checkHover();
    };
    const onClick = () => {
      if (this.isDragging) return;
      if (this.hoveredMarker) {
        const event = new CustomEvent('globe:trip-select', { detail: { id: this.hoveredMarker.id } });
        window.dispatchEvent(event);
      }
    };

    this.renderer.domElement.addEventListener('pointerdown', onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', onPointerMove);
    this.renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    this._cleanup = () => {
      this.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      this.renderer.domElement.removeEventListener('pointermove', onPointerMove);
      this.renderer.domElement.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
    };
  }

  checkHover() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.markers.map(m => m.dot));
    this.markers.forEach(m => {
      if (m.dot === hits[0]?.object) {
        this.hoveredMarker = m;
        m.dot.material.color.setHex(0xffffff);
        m.glow.material.color.setHex(0xffffff);
      } else {
        m.dot.material.color.setHex(0x6366f1);
        m.glow.material.color.setHex(0x6366f1);
      }
    });
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = this.clock.getElapsedTime();

    this.markers.forEach((m, i) => {
      m.ring.rotation.z = time * 0.4 + i;
      const s = 1 + Math.sin(time * 1.2 + i * 2) * 0.3;
      m.ring.scale.set(s, s, s);
      m.ring.material.opacity = 0.25 + Math.sin(time * 1.2 + i * 2) * 0.25;

      m.pulse.rotation.z = time * 0.6 + i * 1.5;
      const ps = 1 + Math.sin(time * 2 + i * 3) * 0.5;
      m.pulse.scale.set(ps, ps, ps);
      m.pulse.material.opacity = 0.3 + Math.sin(time * 2 + i * 3) * 0.3;
    });

    this.glow.material.opacity = 0.05 + Math.sin(time * 0.4) * 0.02;
    this.outerGlow.material.opacity = 0.02 + Math.sin(time * 0.3 + 1) * 0.01;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  highlightTrip(tripId) {
    this.markers.forEach(m => {
      const isActive = m.id === tripId;
      const scale = isActive ? 2.5 : 1;
      m.dot.scale.set(scale, scale, scale);
      m.glow.scale.set(scale, scale, scale);
      m.dot.material.color.setHex(isActive ? 0xffffff : 0x6366f1);
      m.glow.material.color.setHex(isActive ? 0xffffff : 0x6366f1);
    });
  }

  resetHighlight() {
    this.markers.forEach(m => {
      m.dot.scale.set(1, 1, 1);
      m.glow.scale.set(1, 1, 1);
      m.dot.material.color.setHex(0x6366f1);
      m.glow.material.color.setHex(0x6366f1);
    });
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    if (this._cleanup) this._cleanup();
  }
}

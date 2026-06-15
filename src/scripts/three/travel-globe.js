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

function createGlobeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(512, 256, 0, 512, 256, 512);
  gradient.addColorStop(0, '#0f0f23');
  gradient.addColorStop(0.5, '#0a0a1a');
  gradient.addColorStop(1, '#050510');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)';
  ctx.lineWidth = 1;
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = (90 - lat) / 180 * 512;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
  }
  for (let lng = 0; lng < 360; lng += 20) {
    const x = lng / 360 * 1024;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 256); ctx.lineTo(1024, 256); ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export default class TravelGlobe {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.markers = [];
    this.arcs = [];
    this.hoveredMarker = null;
    this.autoRotate = true;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 1.5, 4.5);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 8;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.0;
    this.controls.enablePan = false;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.createGlobe();
    this.createAtmosphere();
    this.createLatLongRings();
    this.createSurfaceDots();
    this.bindEvents();
    this.fetchManifest();
    this.animate();
  }

  createGlobe() {
    const radius = 1.6;
    this.globeRadius = radius;

    const sphereGeo = new THREE.SphereGeometry(radius, 64, 64);
    const sphereMat = new THREE.MeshBasicMaterial({
      map: createGlobeTexture(),
    });
    this.sphere = new THREE.Mesh(sphereGeo, sphereMat);
    this.scene.add(this.sphere);

    const wireGeo = new THREE.IcosahedronGeometry(radius * 1.005, 4);
    const wireEdges = new THREE.EdgesGeometry(wireGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.15,
    });
    this.wireframe = new THREE.LineSegments(wireEdges, wireMat);
    this.scene.add(this.wireframe);

    const equatorGeo = new THREE.TorusGeometry(radius * 1.008, 0.008, 8, 64);
    const equatorMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.3 });
    this.equator = new THREE.Mesh(equatorGeo, equatorMat);
    this.equator.rotation.x = Math.PI / 2;
    this.scene.add(this.equator);
  }

  createAtmosphere() {
    const glowGeo = new THREE.SphereGeometry(this.globeRadius * 1.06, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.scene.add(this.glow);

    const outerGlowGeo = new THREE.SphereGeometry(this.globeRadius * 1.15, 32, 32);
    const outerGlowMat = new THREE.MeshBasicMaterial({
      color: 0x4f46e5,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
    });
    this.outerGlow = new THREE.Mesh(outerGlowGeo, outerGlowMat);
    this.scene.add(this.outerGlow);
  }

  createLatLongRings() {
    const r = this.globeRadius * 1.004;

    for (let lat = -60; lat <= 60; lat += 30) {
      if (lat === 0) continue;
      const phi = (90 - lat) * Math.PI / 180;
      const ringR = r * Math.sin(phi);
      const y = r * Math.cos(phi);
      if (ringR < 0.1) continue;

      const curve = new THREE.EllipseCurve(0, 0, ringR, ringR, 0, Math.PI * 2, false, 0);
      const pts = curve.getPoints(48);
      const positions = [];
      pts.forEach(p => { positions.push(p.x, y, p.y); });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.1 });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
    }

    for (let lng = 0; lng < 360; lng += 30) {
      const theta = lng * Math.PI / 180;
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const phi = (i / 48) * Math.PI;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        pts.push(x, y, z);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.08 });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
    }
  }

  createSurfaceDots() {
    const count = 300;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const r = this.globeRadius * 1.002;

    const palette = [0x6366f1, 0x818cf8, 0xa78bfa, 0xc4b5fd];
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const c = new THREE.Color(palette[Math.floor(Math.random() * palette.length)]);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.015,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.surfaceDots = new THREE.Points(geo, mat);
    this.scene.add(this.surfaceDots);
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

    const dotGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x818cf8 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(pos);
    this.scene.add(dot);

    const glowGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.25,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.copy(pos);
    this.scene.add(glow);

    const ringGeo = new THREE.RingGeometry(0.06, 0.12, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.lookAt(0, 0, 0);
    this.scene.add(ring);

    const pulseGeo = new THREE.RingGeometry(0.02, 0.04, 16);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xc4b5fd,
      transparent: true,
      opacity: 0.8,
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
    const onPointerMove = (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkHover();
    };
    const onClick = () => {
      if (this.hoveredMarker) {
        const event = new CustomEvent('globe:trip-select', { detail: { id: this.hoveredMarker.id } });
        window.dispatchEvent(event);
      }
    };
    const onDragStart = () => { this.autoRotate = false; this.controls.autoRotate = false; };
    const onDragEnd = () => { this.autoRotate = true; this.controls.autoRotate = true; };

    this.renderer.domElement.addEventListener('pointermove', onPointerMove);
    this.renderer.domElement.addEventListener('click', onClick);
    this.controls.addEventListener('start', onDragStart);
    this.controls.addEventListener('end', onDragEnd);

    const onResize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    this._cleanup = () => {
      this.renderer.domElement.removeEventListener('pointermove', onPointerMove);
      this.renderer.domElement.removeEventListener('click', onClick);
      this.controls.removeEventListener('start', onDragStart);
      this.controls.removeEventListener('end', onDragEnd);
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
      const s = 1 + Math.sin(time * 1.2 + i * 2) * 0.4;
      m.ring.scale.set(s, s, s);
      m.ring.material.opacity = 0.3 + Math.sin(time * 1.2 + i * 2) * 0.3;

      m.pulse.rotation.z = time * 0.6 + i * 1.5;
      const ps = 1 + Math.sin(time * 2 + i * 3) * 0.6;
      m.pulse.scale.set(ps, ps, ps);
      m.pulse.material.opacity = 0.4 + Math.sin(time * 2 + i * 3) * 0.4;
    });

    this.glow.material.opacity = 0.06 + Math.sin(time * 0.4) * 0.03;
    this.outerGlow.material.opacity = 0.025 + Math.sin(time * 0.3 + 1) * 0.015;

    this.surfaceDots.material.opacity = 0.5 + Math.sin(time * 0.2) * 0.15;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  highlightTrip(tripId) {
    this.markers.forEach(m => {
      const isActive = m.id === tripId;
      const scale = isActive ? 3 : 1;
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

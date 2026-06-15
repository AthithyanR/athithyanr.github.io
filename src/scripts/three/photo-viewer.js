import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default class PhotoViewer {
  constructor(container) {
    this.container = container;
    this.photoMeshes = [];
    this.isOpen = false;
    this.initialized = false;
  }

  initRenderer() {
    if (this.initialized) return;
    this.initialized = true;

    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100);
    this.camera.position.set(0, 1, 0.1);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.8;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.5;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 8;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, -3);

    this.createStarfield();

    const onKeydown = (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    };
    document.addEventListener('keydown', onKeydown);
    this._cleanupKeys = () => document.removeEventListener('keydown', onKeydown);

    const onResize = () => {
      if (!this.container) return;
      const cw = this.container.clientWidth || window.innerWidth;
      const ch = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = cw / ch;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(cw, ch);
    };
    window.addEventListener('resize', onResize);
    this._cleanupResize = () => window.removeEventListener('resize', onResize);
  }

  createStarfield() {
    const count = 800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 15 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
  }

  async show(photos) {
    if (this.isOpen) return;
    this.isOpen = true;

    this.container.classList.remove('hidden');
    this.container.style.removeProperty('display');

    this.initRenderer();

    if (this.photoMeshes.length > 0) {
      this.photoMeshes.forEach(m => {
        this.scene.remove(m);
        m.geometry.dispose();
        if (m.material.map) m.material.map.dispose();
        m.material.dispose();
      });
      this.photoMeshes = [];
    }

    this.controls.target.set(0, 0, -3);
    this.camera.position.set(0, 1, 0.1);
    this.controls.update();

    this.animate();

    const maxPhotos = Math.min(photos.length, 24);
    const radius = 3.5;
    const rows = 3;
    const photosPerRow = Math.ceil(maxPhotos / rows);

    for (let i = 0; i < maxPhotos; i++) {
      const photo = photos[i];
      if (!photo || !photo.url) continue;

      const row = Math.floor(i / photosPerRow);
      const col = i % photosPerRow;
      const rowOffset = (row - (rows - 1) / 2) * 1.0;

      const angle = (col / photosPerRow) * Math.PI * 2;
      const x = radius * Math.sin(angle);
      const z = -radius * Math.cos(angle);

      const loader = new THREE.TextureLoader();
      loader.load(
        photo.url,
        (texture) => {
          const aspect = texture.image.naturalWidth / texture.image.naturalHeight || 1.5;
          const width = 0.8;
          const height = width / aspect;

          const planeGeo = new THREE.PlaneGeometry(width, height);
          const planeMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
          });
          const mesh = new THREE.Mesh(planeGeo, planeMat);
          mesh.position.set(x, rowOffset, z);
          mesh.lookAt(0, rowOffset, 0);

          mesh.userData = { photo, index: i, baseOpacity: 0 };
          this.scene.add(mesh);
          this.photoMeshes.push(mesh);

          setTimeout(() => {
            planeMat.opacity = 1;
            mesh.userData.baseOpacity = 1;
          }, i * 80);
        },
        undefined,
        () => {},
      );
    }
  }

  close() {
    this.isOpen = false;
    this.container.classList.add('hidden');
    this.container.style.display = 'none';
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    if (!this.isOpen) return;
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = this.clock.getElapsedTime();
    if (this.stars) {
      this.stars.rotation.y = time * 0.01;
    }

    this.photoMeshes.forEach((mesh, i) => {
      mesh.position.y += Math.sin(time * 0.5 + i) * 0.0002;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.close();
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
    if (this._cleanupKeys) this._cleanupKeys();
    if (this._cleanupResize) this._cleanupResize();
  }
}

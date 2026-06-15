import * as THREE from 'three';

export default class HeroScene {
  constructor(container) {
    this.container = container;
    this.mouse = { x: 0, y: 0 };
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    this.createScene();
    this.bindEvents();
    this.animate();
  }

  createScene() {
    const geo = new THREE.IcosahedronGeometry(1.8, 0);
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.4,
    });
    this.outer = new THREE.LineSegments(edges, lineMat);
    this.scene.add(this.outer);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.06,
      wireframe: true,
    });
    this.inner = new THREE.Mesh(geo.clone(), glowMat);
    this.scene.add(this.inner);

    const ringGeo = new THREE.TorusGeometry(2.2, 0.02, 16, 60);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.15,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = Math.PI / 3;
    this.scene.add(this.ring);
  }

  bindEvents() {
    const onMove = (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    this.container.addEventListener('mousemove', onMove);
    this._cleanupEvents = () => this.container.removeEventListener('mousemove', onMove);

    const onResize = () => {
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    this._cleanupResize = () => window.removeEventListener('resize', onResize);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = this.clock.getElapsedTime();

    this.outer.rotation.x = time * 0.15 + this.mouse.y * 0.3;
    this.outer.rotation.y = time * 0.2 + this.mouse.x * 0.3;
    this.inner.rotation.copy(this.outer.rotation);

    this.ring.rotation.z = time * 0.1;
    this.ring.rotation.x = Math.PI / 3 + Math.sin(time * 0.2) * 0.1;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    if (this._cleanupEvents) this._cleanupEvents();
    if (this._cleanupResize) this._cleanupResize();
  }
}

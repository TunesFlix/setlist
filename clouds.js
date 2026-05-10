// ------------------------------------------------------------
// CLOUDS MODULE (global)
// ------------------------------------------------------------
window.Clouds = {
  name: "clouds",

  glowTexture: null,

  init(app) {
    this.glowTexture = this.makeGlowTexture();

    this.createStarfield(app);
    this.createDust(app);
    this.createHaze(app);
    this.createGalaxy(app);   // restored galaxy cloud, hollow core
  },

  // ------------------------------------------------------------
  // GLOW TEXTURE (soft round light, no rectangles)
  // ------------------------------------------------------------
  makeGlowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d");

    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0.0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.45)");
    g.addColorStop(1.0, "rgba(255,255,255,0)");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(c);
  },

  // Material helper
  mat(color, size, opacity) {
    return new THREE.PointsMaterial({
      map: this.glowTexture,
      color,
      size,
      opacity,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: true
    });
  },

  // ------------------------------------------------------------
  // STARFIELD (outer shell)
  // ------------------------------------------------------------
  createStarfield(app) {
    const count = 6000;
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 900 + Math.random() * 300;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);

      pos[i * 3]     = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(p);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    app.starField = new THREE.Points(geo, this.mat(0xffffff, 1.2, 0.9));
    app.scene.add(app.starField);
  },

  // ------------------------------------------------------------
  // DUST LAYER (mid shell)
  // ------------------------------------------------------------
  createDust(app) {
    const count = 2000;
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 200 + Math.random() * 350;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);

      pos[i * 3]     = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(p);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    app.dustLayer = new THREE.Points(geo, this.mat(0x88aaff, 3, 0.12));
    app.scene.add(app.dustLayer);
  },

  // ------------------------------------------------------------
  // HAZE LAYER (soft, transparent, no blocking)
  // ------------------------------------------------------------
  createHaze(app) {
    const count = 1500;
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = 250 + Math.random() * 450;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);

      pos[i * 3]     = r * Math.sin(p) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(p);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    app.hazeLayer = new THREE.Points(geo, this.mat(0x223355, 8, 0.03));
    app.scene.add(app.hazeLayer);
  },

  // ------------------------------------------------------------
  // GALAXY CLOUD (inner nebula, hollow core)
  // ------------------------------------------------------------
  createGalaxy(app) {
    const count = 2500;
    const pos = new Float32Array(count * 3);

    const innerRadius = 180;   // hollow center for camera
    const outerRadius = 650;

    let written = 0;

    for (let i = 0; i < count * 5; i++) {
      const r = innerRadius + Math.random() * (outerRadius - innerRadius);
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(p) * Math.cos(t);
      const y = r * Math.sin(p) * Math.sin(t);
      const z = r * Math.cos(p);

      pos[written * 3]     = x;
      pos[written * 3 + 1] = y;
      pos[written * 3 + 2] = z;

      written++;
      if (written >= count) break;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    app.galaxyCloud = new THREE.Points(
      geo,
      this.mat(0x4466aa, 4, 0.10)
    );

    app.scene.add(app.galaxyCloud);
  },

  // ------------------------------------------------------------
  // UPDATE (slow rotation)
  // ------------------------------------------------------------
  update(app, dt) {
    app.starField.rotation.y  += 0.00005;
    app.dustLayer.rotation.y  += 0.00010;
    app.hazeLayer.rotation.y  += 0.00005;
    app.galaxyCloud.rotation.y += 0.00003;
  }
};

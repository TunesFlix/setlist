// ------------------------------------------------------------
// COVER MODULE — Holographic Band Cover (SAFE VERSION)
// ------------------------------------------------------------
window.CoverMod = {
  name: "cover",

  createCover(app, data, x, y, z) {
    // data may be band, album, track, or generic
    const coverUrl = data.cover || data.hoverCover || "";
    const title    = data.name || data.title || data.hoverTitle || "Unknown";

    // --- Band cover circle (always faces camera) ---
    const tex = new THREE.TextureLoader().load(coverUrl);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.CircleGeometry(12, 64);
    const cover = new THREE.Mesh(geo, mat);
    cover.position.set(x, y, z);

    // Billboard
    cover.onBeforeRender = (renderer, scene, camera) => {
      cover.quaternion.copy(camera.quaternion);
    };

    // ⭐ SAFE userData (never breaks)
    cover.userData = {
      type: "bandCover",
      band: data.band || data,     // if data is band, use it; else fallback
      hoverTitle: title,
      hoverCover: coverUrl
    };

    app.scene.add(cover);

    // --- Holographic ring ---
    const ringGeo = new THREE.TorusGeometry(13, 0.4, 32, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    ring.onBeforeRender = (renderer, scene, camera) => {
      ring.quaternion.copy(camera.quaternion);
    };

    cover.add(ring);

    // Animation
    cover.tick = () => {
      ring.rotation.z += 0.01;
      ring.material.opacity = 0.5 + Math.sin(Date.now() * 0.002) * 0.2;
    };

    return cover;
  },

  update(app, dt) {
    app.scene.traverse(obj => {
      if (obj.tick) obj.tick();
    });
  }
};

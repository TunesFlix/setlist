// ------------------------------------------------------------
// COVER MODULE — Instagram-style holographic avatar
// ------------------------------------------------------------
window.CoverMod = {
  name: "cover",

  createCover(app, band, x, y, z) {
    // --- Band cover circle (always faces camera) ---
    const tex = new THREE.TextureLoader().load(band.cover);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.CircleGeometry(12, 64); // circular avatar
    const cover = new THREE.Mesh(geo, mat);
    cover.position.set(x, y, z);

    // Billboard: lock orientation to camera
    cover.onBeforeRender = (renderer, scene, camera) => {
      cover.quaternion.copy(camera.quaternion);
    };

    cover.userData = {
      type: "bandCover",
      band,
      hoverTitle: band.name || "Unknown Band",
      hoverCover: band.cover || ""
    };

    app.scene.add(cover);

    // --- Futuristic holographic outline ---
    const ringGeo = new THREE.TorusGeometry(13, 0.4, 32, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);

    // Billboard ring too
    ring.onBeforeRender = (renderer, scene, camera) => {
      ring.quaternion.copy(camera.quaternion);
    };

    cover.add(ring);

    // --- Subtle holographic swing animation ---
    cover.tick = () => {
      ring.rotation.z += 0.01; // slow spin
      ring.material.opacity = 0.5 + Math.sin(Date.now() * 0.002) * 0.2; // pulsing glow
    };

    return cover;
  },

  update(app, dt) {
    // Animate all covers
    app.scene.traverse(obj => {
      if (obj.tick) obj.tick();
    });
  }
};

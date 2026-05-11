// ------------------------------------------------------------
// RAYCAST MODULE — Exact Band/Album/Track Hover (Visible Only)
// ------------------------------------------------------------
window.RaycastMod = {
  name: "raycast",

  hovered: null,

  // Find nearest ancestor that has a typed userData (band/album/track)
  resolveTarget(obj) {
    let cur = obj;
    while (cur) {
      const ud = cur.userData;
      if (ud && ud.type) return cur;   // band / album / track
      cur = cur.parent;
    }
    return null;
  },

  // ------------------------------------------------------------
  // CLICK
  // ------------------------------------------------------------
  onClick(app, e) {
    app.scene.updateMatrixWorld();

    // Only raycast visible objects
    const visibleNodes = ClusterMod.nodes.filter(n => n.visible === true);

    const hits = app.raycaster.intersectObjects(visibleNodes, true);
    if (!hits.length) return;

    const obj = this.resolveTarget(hits[0].object);
    if (obj && obj.callback) obj.callback();
  },

  // ------------------------------------------------------------
  // HOVER
  // ------------------------------------------------------------
  onMouseMove(app, e) {
    app.scene.updateMatrixWorld();

    // Only raycast visible objects
    const visibleNodes = ClusterMod.nodes.filter(n => n.visible === true);

    const hits = app.raycaster.intersectObjects(visibleNodes, true);
    const obj = hits.length ? this.resolveTarget(hits[0].object) : null;

    if (obj !== this.hovered) {
      // clear previous
      if (this.hovered) {
        AudioMod.hideHover();
        if (this.hovered.material?.emissive)
          this.hovered.material.emissive.setHex(0x000000);
      }

      this.hovered = obj;

      if (obj) {
        const ud = obj.userData || {};
        const text =
          ud.hoverTitle ||
          ud.band?.name ||
          ud.album?.title ||
          ud.track?.title ||
          "";

        if (text) AudioMod.showHover(text);

        if (obj.material?.emissive)
          obj.material.emissive.setHex(0x44ff44);
      }
    }
  }
};

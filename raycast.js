// ------------------------------------------------------------
// RAYCAST MODULE (global) — FloatTunes Galaxy
// ------------------------------------------------------------
window.RaycastMod = {
  name: "raycast",

  hovered: null,

  // ------------------------------------------------------------
  // ON CLICK
  // ------------------------------------------------------------
  onClick(app, e) {
    app.raycaster.setFromCamera(app.mouse, app.camera);
    const hits = app.raycaster.intersectObjects(app.scene.children, true);

    if (hits.length > 0) {
      const obj = hits[0].object;
      if (obj.callback) {
        obj.callback();
        return;
      }
    }
  },

  // ------------------------------------------------------------
  // ON MOUSE MOVE (hover detection)
  // ------------------------------------------------------------
  onMouseMove(app, e) {
    app.raycaster.setFromCamera(app.mouse, app.camera);
    const hits = app.raycaster.intersectObjects(app.scene.children, true);

    if (hits.length > 0) {
      const obj = hits[0].object;

      if (this.hovered !== obj) {
        // clear previous hover
        if (this.hovered) {
          AudioMod.hideHover();
          this.hovered.material.emissive && this.hovered.material.emissive.setHex(0x000000);
        }

        this.hovered = obj;

        // show hover info if available
        const ud = obj.userData || {};
        let text = "";
        if (ud.hoverTitle) text = ud.hoverTitle;
        else if (ud.type === "track" && ud.track) text = ud.track.title;
        else if (ud.type === "album" && ud.album) text = ud.album.title;
        else if (ud.type === "band" && ud.band) text = ud.band.name;

        if (text) AudioMod.showHover(text);

        // highlight hovered node
        if (obj.material && obj.material.emissive) {
          obj.material.emissive.setHex(0x44ff44);
        }
      }
    } else {
      if (this.hovered) {
        AudioMod.hideHover();
        if (this.hovered.material && this.hovered.material.emissive) {
          this.hovered.material.emissive.setHex(0x000000);
        }
        this.hovered = null;
      }
    }
  }
};

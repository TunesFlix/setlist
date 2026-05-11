// ------------------------------------------------------------
// MOVEMENT MODULE — Lock-on Band Dragging (Perfect Precision)
// ------------------------------------------------------------
window.MovementMod = {
  name: "movement",

  dragging: false,
  dragTarget: null,
  dragPlane: null,
  dragStartPoint: null,
  lastMousePoint: null,

  speedBase: 0.8,
  speedBoost: 1.6,
  speedSlow: 0.4,
  verticalSpeed: 0.8,

  init(app) {
  this.app = app;  
    const dom = app.renderer.domElement;

    // ------------------------------------------------------------
    // Helper: find band node even if clicking its cover/ring
    // ------------------------------------------------------------
    const resolveBand = (obj) => {
      let cur = obj;
      while (cur) {
        if (cur.userData?.type === "band") return cur;
        cur = cur.parent;
      }
      return null;
    };

    // ------------------------------------------------------------
    // POINTER DOWN → Start lock-on drag
    // ------------------------------------------------------------
    dom.addEventListener("pointerdown", (e) => {
      if (e.button !== 2) return; // right-click only
      e.preventDefault();
      dom.setPointerCapture(e.pointerId);

      // Convert mouse to NDC
      const rect = dom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      app.mouse.set(x, y);
      app.raycaster.setFromCamera(app.mouse, app.camera);

      const hits = app.raycaster.intersectObjects(app.scene.children, true);
      if (!hits.length) return;

      const band = resolveBand(hits[0].object);
      if (!band) return;

      // ⭐ LOCK-ON START
      this.dragging = true;
      this.dragTarget = band;

      // Create a drag plane perpendicular to camera
      const planeNormal = app.camera.getWorldDirection(new THREE.Vector3());
      this.dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        planeNormal,
        band.position.clone()
      );

      // Compute initial intersection point
      this.dragStartPoint = new THREE.Vector3();
      app.raycaster.ray.intersectPlane(this.dragPlane, this.dragStartPoint);

      this.lastMousePoint = this.dragStartPoint.clone();
    });

    // ------------------------------------------------------------
    // POINTER MOVE → Move band EXACTLY with mouse
    // ------------------------------------------------------------
    dom.addEventListener("pointermove", (e) => {
      if (!this.dragging || !this.dragTarget) return;

      // Convert mouse to NDC
      const rect = dom.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      app.mouse.set(x, y);
      app.raycaster.setFromCamera(app.mouse, app.camera);

      // Project mouse onto drag plane
      const hitPoint = new THREE.Vector3();
      app.raycaster.ray.intersectPlane(this.dragPlane, hitPoint);

      if (!hitPoint) return;

      // Compute movement delta
      const delta = hitPoint.clone().sub(this.lastMousePoint);
      this.lastMousePoint.copy(hitPoint);

      // Move entire cluster
      this.moveCluster(this.dragTarget, delta);

      // Update lines
      ClusterMod.update(app, 0);
    });

    // ------------------------------------------------------------
    // POINTER UP → Stop dragging
    // ------------------------------------------------------------
    dom.addEventListener("pointerup", (e) => {
      if (e.button !== 2) return;

      this.dragging = false;
      this.dragTarget = null;
      this.dragPlane = null;
      this.dragStartPoint = null;
      this.lastMousePoint = null;

      try { dom.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    dom.addEventListener("contextmenu", (e) => e.preventDefault());
  },

// ------------------------------------------------------------
// MOVE CLUSTER (BAND + ALBUMS + TRACKS) AND RESYNC PROGRESS
// ------------------------------------------------------------
moveCluster(bandNode, delta) {
  const app = this.app;   // ⭐ get stored app
  if (!app) return;

  // 1) Move the band
  bandNode.position.add(delta);

  // 2) Move albums + tracks
  if (bandNode.userData && bandNode.userData.children) {
    bandNode.userData.children.forEach(albumNode => {
      albumNode.position.add(delta);

      if (albumNode.userData && albumNode.userData.children) {
        albumNode.userData.children.forEach(trackNode => {
          trackNode.position.add(delta);
        });
      }
    });
  }

  // 3) If this band contains the currently playing track,
  //    rebuild the progress line so progressStart/progressEnd
  //    match the NEW positions.
  if (window.AudioMod && AudioMod.currentTrackNode) {
    const albumNode = AudioMod.currentTrackNode.userData.parent;
    const bandOfCurrent =
      albumNode && albumNode.userData && albumNode.userData.parent;

    if (bandOfCurrent === bandNode) {
      AudioMod.createProgressLine(app, AudioMod.currentTrackNode);
    }
  }
},


  // ------------------------------------------------------------
  // WASD/QE camera movement
  // ------------------------------------------------------------
  update(app, dt) {
    let speed = this.speedBase;
    if (app.keys["shift"]) speed = this.speedBoost;
    if (app.keys["control"]) speed = this.speedSlow;

    const forward = new THREE.Vector3();
    app.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, app.camera.up).normalize();

    const move = new THREE.Vector3();
    if (app.keys["w"]) move.add(forward);
    if (app.keys["s"]) move.sub(forward);
    if (app.keys["d"]) move.add(right);
    if (app.keys["a"]) move.sub(right);
    if (app.keys["q"]) move.y -= this.verticalSpeed;
    if (app.keys["e"]) move.y += this.verticalSpeed;

    if (move.lengthSq() > 0) {
      move.normalize();
      app.camera.position.addScaledVector(move, speed);
      app.controls.target.addScaledVector(move, speed);
    }
  }
};

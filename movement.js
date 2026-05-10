// ------------------------------------------------------------
// MOVEMENT MODULE (global) — FloatTunes Galaxy
// ------------------------------------------------------------
window.MovementMod = {
  name: "movement",

  // Faster speeds for WASD/QE
  speedBase: 0.8,
  speedBoost: 1.6,
  speedSlow: 0.4,
  verticalSpeed: 0.8,

  dragging: false,
  dragTarget: null,
  lastX: 0,
  lastY: 0,

  init(app) {
    // Right-click down: pick band node
    app.renderer.domElement.addEventListener("mousedown", e => {
      if (e.button === 2) { // right mouse
        app.raycaster.setFromCamera(app.mouse, app.camera);
        const hits = app.raycaster.intersectObjects(app.scene.children, true);
        if (hits.length > 0) {
          const obj = hits[0].object;
          if (obj.userData && obj.userData.type === "band") {
            this.dragging = true;
            this.dragTarget = obj;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
          }
        }
      }
    });

    // Release
    app.renderer.domElement.addEventListener("mouseup", e => {
      if (e.button === 2) {
        this.dragging = false;
        this.dragTarget = null;
      }
    });

    // Drag move
    app.renderer.domElement.addEventListener("mousemove", e => {
      if (this.dragging && this.dragTarget) {
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;

        const scale = 0.1; // drag sensitivity
        const move = new THREE.Vector3(dx * scale, -dy * scale, 0);

        // Move the entire cluster rigidly
        this.moveCluster(this.dragTarget, move);

        // Update line endpoints so they stay connected
        ClusterMod.update(app, 0);
      }
    });

    // Prevent context menu
    app.renderer.domElement.addEventListener("contextmenu", e => e.preventDefault());
  },

  // Move band + albums + tracks together
  moveCluster(bandNode, move) {
    bandNode.position.add(move);
    if (bandNode.userData && bandNode.userData.children) {
      bandNode.userData.children.forEach(albumNode => {
        albumNode.position.add(move);
        if (albumNode.userData && albumNode.userData.children) {
          albumNode.userData.children.forEach(trackNode => {
            trackNode.position.add(move);
          });
        }
      });
    }
  },

  update(app, dt) {
    // Faster WASD/QE camera movement
    let moveSpeed = this.speedBase;
    if (app.keys["shift"]) moveSpeed = this.speedBoost;
    if (app.keys["control"]) moveSpeed = this.speedSlow;

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
      app.camera.position.addScaledVector(move, moveSpeed);
      app.controls.target.addScaledVector(move, moveSpeed);
    }
  }
};

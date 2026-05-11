// ------------------------------------------------------------
// FloatTunes.mobile.js — Mobile Input Layer (Touch + Gestures)
// ------------------------------------------------------------
window.FloatTunesMobile = {
  enabled: false,
  app: null,

  // touch state
  touchLastX: 0,
  touchLastY: 0,
  draggingCamera: false,
  draggingCluster: false,
  dragTarget: null,
  longPressTimer: null,
  movedSinceStart: false,

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  init(app) {
    this.app = app;
    this.enabled = this.isMobile();
    if (!this.enabled) return;

    console.log("FloatTunes Mobile Mode Enabled");

    // Desktop OrbitControls already handle rotation + wheel zoom.
    // On mobile we just call controls.rotateLeft/rotateUp from our touch layer.
    // Do NOT override rotateLeft/rotateUp here.

    // If you want to disable wheel zoom on mobile only, you can do it via CSS
    // or a UA check around wheel, but we leave desktop logic untouched.

    this.enableTouchCamera(app);
    this.enableTouchTap(app);
    this.enablePinchZoom(app);

    // Prevent ghost desktop click ONLY on the canvas
    app.renderer.domElement.addEventListener(
      "click",
      e => {
        if (this.enabled) e.stopImmediatePropagation();
      },
      true
    );
  },

  // ------------------------------------------------------------
  // MOBILE DETECTION
  // ------------------------------------------------------------
  isMobile() {
    return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
  },

  // ------------------------------------------------------------
  // COVER → NODE RESOLVER
  // ------------------------------------------------------------
  resolveNode(obj) {
    if (
      obj.userData?.type === "bandCover" ||
      obj.userData?.type === "albumCover" ||
      obj.userData?.type === "trackCover"
    ) {
      if (obj.parent?.userData?.type) return obj.parent;
    }
    return obj;
  },

  // ------------------------------------------------------------
  // TOUCH CAMERA LOOK + LONG PRESS DRAG
  // ------------------------------------------------------------
  enableTouchCamera(app) {
    const canvas = app.renderer.domElement;

    canvas.addEventListener("touchstart", e => {
      if (e.touches.length !== 1) return;

      const t = e.touches[0];
      this.touchLastX = t.clientX;
      this.touchLastY = t.clientY;

      this.draggingCamera = true;
      this.draggingCluster = false;
      this.dragTarget = null;
      this.movedSinceStart = false;

      // arm long press → cluster drag
      this.longPressTimer = setTimeout(() => {
        if (!this.movedSinceStart) {
          this.tryStartClusterDrag(app, t.clientX, t.clientY);
        }
      }, 450);
    });

    canvas.addEventListener("touchmove", e => {
      console.log("TOUCHMOVE", e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();

      if (!this.draggingCamera || e.touches.length !== 1) return;

      const t = e.touches[0];
      const dx = t.clientX - this.touchLastX;
      const dy = t.clientY - this.touchLastY;

      this.touchLastX = t.clientX;
      this.touchLastY = t.clientY;

      // any movement cancels long‑press
      this.movedSinceStart = true;
      clearTimeout(this.longPressTimer);

      // dragging a cluster?
      if (this.draggingCluster && this.dragTarget) {
        this.moveCluster(app, dx, dy);
        return;
      }

      // ⭐ Rotate camera using OrbitControls' public API
      const rotSpeed = 0.005;
      app.controls.rotateLeft(dx * rotSpeed);
      app.controls.rotateUp(dy * rotSpeed);
    });

    canvas.addEventListener("touchend", () => {
      this.draggingCamera = false;
      this.draggingCluster = false;
      this.dragTarget = null;
      clearTimeout(this.longPressTimer);
    });
  },

  // ------------------------------------------------------------
  // LONG PRESS → DRAG BAND CLUSTER (VISIBLE ONLY)
  // ------------------------------------------------------------
  tryStartClusterDrag(app, x, y) {
    app.mouse.x = (x / innerWidth) * 2 - 1;
    app.mouse.y = -(y / innerHeight) * 2 + 1;

    app.raycaster.setFromCamera(app.mouse, app.camera);

    const visibleNodes = ClusterMod.nodes.filter(n => n.visible === true);
    const hits = app.raycaster.intersectObjects(visibleNodes, true);
    if (hits.length === 0) {
      this.draggingCluster = false;
      this.dragTarget = null;
      return;
    }

    let obj = this.resolveNode(hits[0].object);

    if (obj.userData?.type === "band") {
      this.draggingCluster = true;
      this.dragTarget = obj;
    } else {
      this.draggingCluster = false;
      this.dragTarget = null;
    }
  },

  moveCluster(app, dx, dy) {
    if (!this.dragTarget) return;

    const moveScale = 0.15;
    const move = new THREE.Vector3(dx * moveScale, -dy * moveScale, 0);

    this.dragTarget.position.add(move);

    this.dragTarget.userData.children.forEach(albumNode => {
      albumNode.position.add(move);
      albumNode.userData.children.forEach(trackNode => {
        trackNode.position.add(move);
      });
    });

    ClusterMod.update(app, 0);
  },

  // ------------------------------------------------------------
  // TAP → EXPAND BAND / ALBUM / PLAY TRACK (VISIBLE ONLY)
  // ------------------------------------------------------------
  enableTouchTap(app) {
    const canvas = app.renderer.domElement;

    canvas.addEventListener("touchend", e => {
      if (this.draggingCluster) return;

      const t = e.changedTouches[0];
      const x = t.clientX;
      const y = t.clientY;

      app.mouse.x = (x / innerWidth) * 2 - 1;
      app.mouse.y = -(y / innerHeight) * 2 + 1;

      app.raycaster.setFromCamera(app.mouse, app.camera);

      const visibleNodes = ClusterMod.nodes.filter(n => n.visible === true);
      const hits = app.raycaster.intersectObjects(visibleNodes, true);
      if (hits.length === 0) return;

      let obj = this.resolveNode(hits[0].object);

      if (obj.isTrack) {
        obj.callback && obj.callback();
        return;
      }

      if (obj.callback) {
        obj.callback();
        return;
      }
    });
  },

  // ------------------------------------------------------------
  // PINCH TO ZOOM
  // ------------------------------------------------------------
  enablePinchZoom(app) {
    const canvas = app.renderer.domElement;
    let lastDist = 0;

    canvas.addEventListener("touchmove", e => {
      if (e.touches.length !== 2) return;

      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (lastDist === 0) {
        lastDist = dist;
        return;
      }

      const delta = dist - lastDist;
      lastDist = dist;

      const zoomSpeed = 0.5;
      app.camera.position.addScaledVector(
        app.camera.getWorldDirection(new THREE.Vector3()),
        -delta * zoomSpeed
      );
    });

    canvas.addEventListener("touchend", () => {
      lastDist = 0;
    });
  }
};

// ------------------------------------------------------------
// MOBILE FOOTER HELPER — run only on mobile
// ------------------------------------------------------------
this.applyMobileFooterLayout = function () {
  const bar = document.getElementById("bottom-bar");
  if (!bar) return;

  const rowControls = document.createElement("div");
  rowControls.id = "mobile-row-controls";

  const rowLyrics = document.createElement("div");
  rowLyrics.id = "mobile-row-lyrics";

  const rowPage = document.createElement("div");
  rowPage.id = "mobile-row-page";

  const controls = document.getElementById("player-controls");
  const btnLyrics = document.getElementById("btn-lyrics");
  const btnRelated = document.getElementById("btn-related");
  const pageSwitch = document.getElementById("page-switch");

  if (controls) rowControls.appendChild(controls);
  if (btnLyrics && btnRelated) {
    rowLyrics.appendChild(btnLyrics);
    rowLyrics.appendChild(btnRelated);
  }
  if (pageSwitch) rowPage.appendChild(pageSwitch);

  bar.innerHTML = "";
  bar.appendChild(rowControls);
  bar.appendChild(rowLyrics);
  bar.appendChild(rowPage);

  bar.classList.add("mobile-footer");
};

const isMobile =
  window.matchMedia("(max-width: 900px)").matches ||
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0;

if (isMobile) {
  this.applyMobileFooterLayout();
}

// ------------------------------------------------------------
// APP CORE ENGINE (FloatTunes Galaxy)
// ------------------------------------------------------------
const App = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,

  audio: null,
  video: null,

  modules: [],
  keys: {},
  data: null,

  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),

  register(module) {
    this.modules.push(module);
  },

  // ------------------------------------------------------------
  // LOAD JSON FIRST
  // ------------------------------------------------------------
  async loadJSON(path) {
    try {
      const res = await fetch(path);
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      return null;
    }
  },

  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  async init() {
    this.data = await this.loadJSON("Setlist/Setlist.json");

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 8000);
    this.camera.position.set(0, 0, 450);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: document.getElementById("galaxy")
    });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(devicePixelRatio);

    // Light
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.3));

    // ------------------------------------------------------------
    // CUSTOM ORBIT CONTROLS (FloatTunes)
    // ------------------------------------------------------------
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 0.8;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 4000;

    // Audio + Video
    this.audio = document.getElementById("audio");
    this.video = document.getElementById("video");

    // Events
    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("mousemove", e => this.onMouseMove(e));
    window.addEventListener("click", e => this.onClick(e));
    window.addEventListener("keydown", e => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", e => this.keys[e.key.toLowerCase()] = false);

    // Init modules
    this.modules.forEach(m => m.init && m.init(this));

    // ------------------------------------------------------------
    // FULL GALAXY BUILD
    // ------------------------------------------------------------
   

    if (ClusterMod.buildFromJSON) {
      ClusterMod.buildFromJSON(this, this.data);
    }

    if (ClusterPageMod.init) {
      ClusterPageMod.init(this);
    }

    // Start loop
this.scene.updateMatrixWorld(true);   // ⭐ FIX: sync billboard meshes
this.animate();

  },

  // ------------------------------------------------------------
  // RESIZE
  // ------------------------------------------------------------
  onResize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  },

  // ------------------------------------------------------------
  // MOUSE MOVE
  // ------------------------------------------------------------
onMouseMove(e) {
  this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
  this.mouse.y = -(e.clientY / innerHeight) * 2 + 1;
},


  // ------------------------------------------------------------
  // CLICK HANDLER (raycast)
  // ------------------------------------------------------------
  onClick(e) {

    // CLICK‑TO‑SEEK
    if (AudioMod.progressBaseLine) {
      this.raycaster.setFromCamera(this.mouse, this.camera);

      if (AudioMod.progressClickMesh) {
        const hit = this.raycaster.intersectObject(AudioMod.progressClickMesh, true);
        if (hit.length > 0) {
          const point = hit[0].point;
          const total = AudioMod.progressStart.distanceTo(AudioMod.progressEnd);
          const dist  = AudioMod.progressStart.distanceTo(point);
          const ratio = Math.min(Math.max(dist / total, 0), 1);
          if (this.audio.duration) this.audio.currentTime = this.audio.duration * ratio;
          return;
        }
      }

      const hit2 = this.raycaster.intersectObject(AudioMod.progressBaseLine, true);
      if (hit2.length > 0) {
        const point = hit2[0].point;
        const total = AudioMod.progressStart.distanceTo(AudioMod.progressEnd);
        const dist  = AudioMod.progressStart.distanceTo(point);
        const ratio = Math.min(Math.max(dist / total, 0), 1);
        if (this.audio.duration) this.audio.currentTime = this.audio.duration * ratio;
        return;
      }
    }

    // NORMAL NODE CLICK
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);

    if (hits.length > 0) {
      const obj = hits[0].object;

      if (obj.isTrack) {
        obj.callback && obj.callback();
        return;
      }

      if (obj.callback) {
        obj.callback();
        return;
      }
    }

    this.modules.forEach(m => m.onClick && m.onClick(this, e));
  },

animate() {
  requestAnimationFrame(() => this.animate());

  // 1) Update camera
  this.controls.update();

  // 2) Update world matrices (billboards, covers, lines)
  this.scene.updateMatrixWorld(true);

  // 3) REAL-TIME RAYCAST (this is the missing piece)
  this.raycaster.setFromCamera(this.mouse, this.camera);
  this.modules.forEach(m => m.onMouseMove && m.onMouseMove(this));

  // 4) Update modules
  this.modules.forEach(m => m.update && m.update(this, 0.016));

  if (ClusterMod.update) ClusterMod.update(this, 0.016);
  if (CoverMod.update) CoverMod.update(this, 0.016);
  if (AudioMod.updateProgress) AudioMod.updateProgress(this);

  // 5) Render
  this.renderer.render(this.scene, this.camera);
},

};   


// ------------------------------------------------------------
// REGISTER MODULES
// ------------------------------------------------------------
App.register(Clouds);
App.register(CoverMod);
App.register(ClusterMod);
App.register(AudioMod);
App.register(UIMod);
App.register(ProgressMod);
App.register(RaycastMod);
App.register(MovementMod);
App.register(ClusterPageMod);
App.register(FloatTunesMobile);
App.register(VideoMod);

// ------------------------------------------------------------
// START
// ------------------------------------------------------------
App.init();

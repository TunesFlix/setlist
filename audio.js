const app = window.app;

// ------------------------------------------------------------
// AUDIO MODULE — PROGRESS BALL • RELATED • LYRICS
// ------------------------------------------------------------
window.AudioMod = {
  suspendTimeLabel: false,
  name: "audio",

  // ------------------------------------------------------------
  // PLAYBACK MODES (needed for Repeat + Shuffle to work)
  // ------------------------------------------------------------
  repeat: false,     // stays on the same track
  shuffle: false,    // jumps to a random track

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------
  currentTrackNode: null,
  relatedNodes: [],
  relatedIndex: 0,
  relatedMode: false,

  baseLine: null,          // dim full line (related path)
  progressBall: null,      // moving ball along current segment
  progressStart: null,     // THREE.Vector3
  progressEnd: null,       // THREE.Vector3

  progressColor: new THREE.Color(0xff44aa),

  hoverTitle: null,
  timeLabelCurrent: null,  // near moving light
  timeLabelTotal: null,    // bottom-right total time
  
  
  // ------------------------------------------------------------
  // INIT
  // ------------------------------------------------------------
  init(app) {
    // Auto-play next
    app.audio.addEventListener("ended", () => this.playNext(app));
    app.video.addEventListener("ended", () => this.playNext(app));

    // Progress update (audio only)
    app.audio.addEventListener("timeupdate", () => this.updateProgress(app));

    // Hover tooltip movement
    document.addEventListener("mousemove", e => {
      if (this.hoverTitle) {
        this.hoverTitle.style.left = e.clientX + 15 + "px";
        this.hoverTitle.style.top = e.clientY + 15 + "px";
      }
    });

    this.createHoverTitle();
    this.createTimeLabels();

    // Related button toggle
    const btnRelated = document.getElementById("btn-related");
    if (btnRelated) {
      btnRelated.addEventListener("click", () => this.toggleRelated(app));
    }
  },

  // ------------------------------------------------------------
  // HOVER TITLE
  // ------------------------------------------------------------
  createHoverTitle() {
    this.hoverTitle = document.createElement("div");
    Object.assign(this.hoverTitle.style, {
      position: "fixed",
      padding: "6px 10px",
      background: "rgba(0,0,0,0.7)",
      color: "#fff",
      fontSize: "12px",
      borderRadius: "4px",
      pointerEvents: "none",
      display: "none",
      zIndex: "9999"
    });
    document.body.appendChild(this.hoverTitle);
  },

  showHover(text) {
    this.hoverTitle.textContent = text;
    this.hoverTitle.style.display = "block";
  },

  hideHover() {
    this.hoverTitle.style.display = "none";
  },

  // ------------------------------------------------------------
  // TIME LABELS (CURRENT + TOTAL)
  // ------------------------------------------------------------
  createTimeLabels() {
    this.timeLabelCurrent = document.createElement("div");
    Object.assign(this.timeLabelCurrent.style, {
      position: "fixed",
      color: "#fff",
      fontSize: "11px",
      pointerEvents: "none",
      zIndex: "9999",
      transform: "translate(-50%, -120%)"
    });
    document.body.appendChild(this.timeLabelCurrent);

    this.timeLabelTotal = document.createElement("div");
    Object.assign(this.timeLabelTotal.style, {
      position: "fixed",
      color: "#fff",
      fontSize: "11px",
      pointerEvents: "none",
      zIndex: "9999",
      bottom: "24px",
      right: "24px"
    });
    document.body.appendChild(this.timeLabelTotal);
  },

  // ------------------------------------------------------------
  // PLAY TRACK
  // ------------------------------------------------------------
playTrack(app, track, node) {
  if (!app) app = window.app;
  if (!track || !node) return;

  this.currentTrackNode = node;

  // Stop both players
  app.audio.pause();
  app.video.pause();

  // ------------------------------------------------------------
  // FIX: Encode URL so MP4 loads correctly
  // ------------------------------------------------------------
  let fileURL = encodeURI(track.file);
  const isVideo = fileURL.toLowerCase().endsWith(".mp4");

  // ------------------------------------------------------------
  // ⭐ STORE STATE FOR FOOTER BUTTONS
  // ------------------------------------------------------------
  app.currentTrack = track;          // footer needs this
  app.currentFileURL = fileURL;      // footer reloads this
  app.isVideo = isVideo;             // footer detects video mode

  // ------------------------------------------------------------
  // VIDEO MODE
  // ------------------------------------------------------------
  if (isVideo) {

    // Hide audio player
    app.audio.src = "";
    app.audio.pause();

    // Load video through VideoMod
    VideoMod.load(fileURL);

  } else {

    // ------------------------------------------------------------
    // AUDIO MODE
    // ------------------------------------------------------------
    VideoMod.hide(); // hide video panel

    app.video.src = "";
    app.video.pause();

    app.audio.src = fileURL;
    app.audio.play();
  }

  // ------------------------------------------------------------
  // UPDATE UI TITLE + LYRICS
  // ------------------------------------------------------------
  this.updateTitle(app, track);
  // ⭐ Do NOT force PAUSE if video is closed or closing
if (!(app.isVideo && VideoMod.panel.style.display === "none")) {
    UIMod.showPauseState();
}

  // AUTO‑GENERATE LYRICS PATH
  let lyricsPath = track.file.replace(/\.(mp3|flac|mp4)$/i, ".txt");
  app.currentLyricsPath = track.lyrics || lyricsPath;

  // AUTO‑REFRESH LYRICS IF PANEL IS OPEN
  if (UIMod.lyricsPanel && UIMod.lyricsPanel.style.display === "block") {
    UIMod.toggleLyrics();   // close
    UIMod.toggleLyrics();   // reopen with new lyrics
  }

  // Highlight active track
  this.highlightActiveTrack(track);

  // Progress line
  this.createProgressLine(app, node);

  // Update control bar
  this.updateControlBar(track);

  // Restore time labels
  this.suspendTimeLabel = false;
  if (this.timeLabelCurrent) this.timeLabelCurrent.style.display = "block";
  if (this.timeLabelTotal) this.timeLabelTotal.style.display = "block";
},


  // ------------------------------------------------------------
  // CREATE / UPDATE PROGRESS LINE
// ------------------------------------------------------------
createProgressLine(app, node) {
  // remove old lines
  if (this.progressBaseLine) {
    app.scene.remove(this.progressBaseLine);
    this.progressBaseLine = null;
  }
  if (this.progressFillLine) {
    app.scene.remove(this.progressFillLine);
    this.progressFillLine = null;
  }

  // context: related chain or album siblings
  let contextNodes = [];
  if (this.relatedMode && this.relatedNodes.length > 1) {
    contextNodes = this.relatedNodes;
  } else {
    const albumNode = node.userData.parent;
    contextNodes = albumNode
      ? (albumNode.userData.children || []).filter(n => n.userData.type === "track")
      : [];
  }

  if (!contextNodes.length) return;

  const idx = contextNodes.indexOf(node);
  if (idx === -1) return;

  const nextNode = contextNodes[(idx + 1) % contextNodes.length];

 // direction from node → nextNode
const dir = nextNode.position.clone().sub(node.position).normalize();

// get radius of the track circle
let radius = 10;
if (node.geometry && node.geometry.parameters && node.geometry.parameters.radius) {
  radius = node.geometry.parameters.radius;
}

// start at edge of circle, not center
this.progressStart = node.position.clone().add(dir.clone().multiplyScalar(radius));

// end also offset inward so it ends at the edge of next circle
this.progressEnd = nextNode.position.clone().sub(dir.clone().multiplyScalar(radius));


  // base line (dim)
  const baseGeo = new THREE.BufferGeometry().setFromPoints([
    this.progressStart,
    this.progressEnd
  ]);
  const baseMat = new THREE.LineBasicMaterial({
    color: 0x445066,
    transparent: true,
    opacity: 0.5
  });
  this.progressBaseLine = new THREE.Line(baseGeo, baseMat);
  app.scene.add(this.progressBaseLine);

  // fill line (starts at 0)
  const fillGeo = new THREE.BufferGeometry().setFromPoints([
    this.progressStart.clone(),
    this.progressStart.clone()
  ]);
  const fillMat = new THREE.LineBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.95
  });
  this.progressFillLine = new THREE.Line(fillGeo, fillMat);
  app.scene.add(this.progressFillLine);
},

// ------------------------------------------------------------
// UPDATE PROGRESS LINE + TIME
// ------------------------------------------------------------
updateProgress(app) {
  if (!this.progressStart || !this.progressEnd) return;
  if (!app.audio.duration || isNaN(app.audio.duration)) return;

  const ratio   = app.audio.currentTime / app.audio.duration;
  const clamped = Math.max(0, Math.min(1, ratio));

  // current position along the line
  const pos = this.progressStart.clone().lerp(this.progressEnd, clamped);

  // PROGRESS FILL: from start → current pos
  if (this.progressFillLine) {
    const p = this.progressFillLine.geometry.attributes.position;

    p.setXYZ(0,
      this.progressStart.x,
      this.progressStart.y,
      this.progressStart.z
    );

    p.setXYZ(1,
      pos.x,
      pos.y,
      pos.z
    );

    p.needsUpdate = true;

    // holographic shimmer
    const pulse = (Math.sin(app.audio.currentTime * 4) + 1) * 0.5;
    this.progressFillLine.material.opacity = 0.6 + pulse * 0.3;
  }

  // TIME
  const t = Math.floor(app.audio.currentTime);
  const d = Math.floor(app.audio.duration);

  if (this.timeLabelCurrent) {
    this.timeLabelCurrent.textContent = this.formatTime(t);
    const projected = pos.clone().project(app.camera);
    const sx = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-projected.y * 0.5 + 0.5) * window.innerHeight;
    this.timeLabelCurrent.style.left = `${sx}px`;
    this.timeLabelCurrent.style.top  = `${sy}px`;
  }

  if (this.timeLabelTotal) {
    this.timeLabelTotal.textContent = this.formatTime(d);
  }

  const cur = document.getElementById("time-current");
  const tot = document.getElementById("time-total");
  if (cur) cur.textContent = this.formatTime(t);
  if (tot) tot.textContent = this.formatTime(d);
},


// ------------------------------------------------------------
// FORMAT TIME  ← THIS WAS MISSING (caused your error)
// ------------------------------------------------------------
formatTime(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
},

  // ------------------------------------------------------------
  // HIGHLIGHT ACTIVE TRACK (compatible with CoverMod)
// ------------------------------------------------------------
  highlightActiveTrack(track) {
    ClusterMod.nodes.forEach(n => {
      if (n.userData.type === "track") {
        if (n.material && n.material.color) {
          n.material.color.set(0x66aaff);
        }
        n.userData.glow = false;
        if (n.userData.glowRing) {
          n.remove(n.userData.glowRing);
          n.userData.glowRing = null;
        }
      }
    });

    ClusterMod.nodes.forEach(n => {
      if (n.userData.type === "track" && n.userData.track === track) {
        if (n.material && n.material.color) {
          n.material.color.set(0xffddaa);
        }
        n.userData.glow = true;
        this.addGlowRing(n, 0xffff88, 1.6);
      }
    });
  },

  // ------------------------------------------------------------
  // GLOW RING HELPER (works for circular covers)
// ------------------------------------------------------------
  addGlowRing(node, color = 0x88ff88, scale = 1.4) {
    if (node.userData.glowRing) return;

    const radius =
      node.geometry && node.geometry.parameters && node.geometry.parameters.radius
        ? node.geometry.parameters.radius
        : 10;

    const geo = new THREE.RingGeometry(radius * scale * 0.9, radius * scale, 64);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    node.add(ring);
    node.userData.glowRing = ring;
  },

// ------------------------------------------------------------
// NEXT / PREV TRACK
// ------------------------------------------------------------
playNext(app) {
  if (!this.currentTrackNode) return;

  // Determine context: RELATED or ALBUM
  let contextNodes = [];
  if (this.relatedMode && this.relatedNodes.length > 0) {
    contextNodes = this.relatedNodes;
  } else {
    const albumNode = this.currentTrackNode.userData.parent;
    contextNodes = albumNode
      ? (albumNode.userData.children || []).filter(n => n.userData.type === "track")
      : [];
  }

  if (!contextNodes.length) return;

  let idx = contextNodes.indexOf(this.currentTrackNode);

  // SHUFFLE MODE (inside related or album)
  if (this.shuffle) {
    let newIndex = idx;
    while (newIndex === idx && contextNodes.length > 1) {
      newIndex = Math.floor(Math.random() * contextNodes.length);
    }
    idx = newIndex;
  }
  // REPEAT MODE (stay on same track)
  else if (this.repeat) {
    idx = idx;
  }
  // NORMAL MODE
  else {
    idx = (idx + 1) % contextNodes.length;
  }

  const nextNode = contextNodes[idx];
  this.playTrack(app, nextNode.userData.track, nextNode);
},

playPrev(app) {
  if (!this.currentTrackNode) return;

  // Determine context: RELATED or ALBUM
  let contextNodes = [];
  if (this.relatedMode && this.relatedNodes.length > 0) {
    contextNodes = this.relatedNodes;
  } else {
    const albumNode = this.currentTrackNode.userData.parent;
    contextNodes = albumNode
      ? (albumNode.userData.children || []).filter(n => n.userData.type === "track")
      : [];
  }

  if (!contextNodes.length) return;

  let idx = contextNodes.indexOf(this.currentTrackNode);

  // SHUFFLE MODE
  if (this.shuffle) {
    let newIndex = idx;
    while (newIndex === idx && contextNodes.length > 1) {
      newIndex = Math.floor(Math.random() * contextNodes.length);
    }
    idx = newIndex;
  }
  // REPEAT MODE
  else if (this.repeat) {
    idx = idx;
  }
  // NORMAL MODE
  else {
    idx = (idx - 1 + contextNodes.length) % contextNodes.length;
  }

  const prevNode = contextNodes[idx];
  this.playTrack(app, prevNode.userData.track, prevNode);
},

// ------------------------------------------------------------
// RELATED MODE TOGGLE
// ------------------------------------------------------------
toggleRelated(app) {
  if (!this.currentTrackNode) return;

  if (this.relatedMode && this.relatedNodes?.length > 0) {
    if (this.relatedNodes.includes(this.currentTrackNode)) return;
  }

  this.buildRelated(app);
},

// ------------------------------------------------------------
// CLEAR RELATED MODE
// ------------------------------------------------------------
clearRelated(app) {
  this.relatedMode  = false;
  this.relatedNodes = [];
  this.relatedIndex = 0;

  if (this.baseLine) {
    app.scene.remove(this.baseLine);
    this.baseLine = null;
  }

  ClusterMod.nodes.forEach(n => {
    if (n.userData.numberSprite) {
      n.remove(n.userData.numberSprite);
      n.userData.numberSprite = null;
    }
    if (n.userData.glowRing) {
      n.remove(n.userData.glowRing);
      n.userData.glowRing = null;
    }
  });

  if (this.currentTrackNode) {
    this.createProgressBall(app, this.currentTrackNode);
  }
},

// ------------------------------------------------------------
// CREATE CONTINUOUS BASE LINE FOR RELATED PLAYLIST
// ------------------------------------------------------------
createRelatedBaseLine(app) {
  if (this.baseLine) {
    app.scene.remove(this.baseLine);
    this.baseLine = null;
  }

  if (!this.relatedNodes || this.relatedNodes.length < 2) return;

  const points = this.relatedNodes.map(n => n.position.clone());
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0x334466 });

  this.baseLine = new THREE.Line(geo, mat);
  app.scene.add(this.baseLine);
},

// ------------------------------------------------------------
// BUILD RELATED — SAME GENRE, CROSS BAND/ALBUM
// ------------------------------------------------------------
async buildRelated(app) {
  if (!this.currentTrackNode) return;

  const currentNode      = this.currentTrackNode;
  const currentTrack     = currentNode.userData.track;
  const currentAlbumNode = currentNode.userData.parent;
  const currentBandNode  = currentAlbumNode?.userData.parent;

  const currentAlbum = currentAlbumNode?.userData.album;
  const currentBand  = currentBandNode?.userData.band;

  // Detect genre
 function normalizeGenre(g) {
  if (!g) return [];
  if (Array.isArray(g)) return g.map(s => s.toLowerCase());
  return g.toLowerCase().split(/[,/]/).map(s => s.trim());
}

const genres = [
  ...normalizeGenre(currentTrack?.genre),
  ...normalizeGenre(currentAlbum?.genre),
  ...normalizeGenre(currentBand?.genre)
];

if (!genres.length) return;


  // ------------------------------------------------------------
  // 1. FIND SAME-GENRE BANDS (LIMIT TO 3)
  // ------------------------------------------------------------
  const allBandNodes = ClusterMod.nodes.filter(n => n.userData.band);
  const sameGenreBands = allBandNodes.filter(b => {
  const bandGenres = normalizeGenre(b.userData.band.genre);
  return bandGenres.some(bg =>
    genres.some(g => bg.includes(g) || g.includes(bg))
  );
}).slice(0, 3);

  // ------------------------------------------------------------
  // 2. FORCE EXPAND 3 ALBUMS + ALL TRACKS FOR EACH BAND
  // ------------------------------------------------------------
  for (let bandNode of sameGenreBands) {

    // expand 3 albums
    ClusterMod.forceExpandAlbums(app, bandNode);

    // expand tracks inside those 3 albums
    const albums = bandNode.userData.children.slice(0, 3);
    for (let albumNode of albums) {
      await ClusterMod.forceExpandTracks(app, albumNode);
    }
  }

  // ------------------------------------------------------------
  // 3. COLLECT ALL EXPANDED TRACKS
  // ------------------------------------------------------------
  const expandedTracks = [];

  sameGenreBands.forEach(bandNode => {
    bandNode.userData.children.slice(0, 3).forEach(albumNode => {
      albumNode.userData.children.forEach(trackNode => {
        expandedTracks.push(trackNode);
      });
    });
  });

  // ------------------------------------------------------------
  // 4. RANDOMIZE AND PICK 20
  // ------------------------------------------------------------
  let selected = [...expandedTracks].sort(() => Math.random() - 0.5);

  if (!selected.includes(currentNode)) {
    selected.unshift(currentNode);
  }

  this.relatedNodes = selected.slice(0, 20);
  this.relatedMode  = true;

  this.relatedIndex = this.relatedNodes.indexOf(currentNode);
  if (this.relatedIndex < 0) this.relatedIndex = 0;

// ------------------------------------------------------------
// DEBUG LOG — SHOW 20 TRACKS SELECTED FOR RELATED MODE
// ------------------------------------------------------------
console.log("RELATED:");

this.relatedNodes.forEach((node, i) => {
  const track  = node.userData.track;
  const album  = node.userData.parent?.userData.album;
  const band   = node.userData.parent?.userData.parent?.userData.band;

  console.log(
    `${i + 1}. ${band?.name || "Band"} — ${album?.title || "Album"} — ${track?.title || "Track"}`
  );
});

  // ------------------------------------------------------------
  // 5. CLEAR OLD VISUALS
  // ------------------------------------------------------------
  expandedTracks.forEach(n => {
    if (n.userData.numberSprite) {
      n.remove(n.userData.numberSprite);
      n.userData.numberSprite = null;
    }
    if (n.userData.glowRing) {
      n.remove(n.userData.glowRing);
      n.userData.glowRing = null;
    }
  });

  // ------------------------------------------------------------
  // 6. ADD GLOW + NUMBERS
  // ------------------------------------------------------------
  const colors = [0x88ff88, 0x88ffff, 0xffdd88, 0xff88ff, 0x88aaff];

  this.relatedNodes.forEach((node, i) => {
    ClusterMod.addGlowRing(node, colors[i % colors.length], 1.5);
    ClusterMod.addNumberSprite(app, node, i + 1);
  });

  // ------------------------------------------------------------
  // 7. DRAW LINE
  // ------------------------------------------------------------
  this.createRelatedBaseLine(app);

  // ------------------------------------------------------------
  // 8. PLAY ACTIVE TRACK
  // ------------------------------------------------------------
  const activeNode = this.relatedNodes[this.relatedIndex];
  this.playTrack(app, activeNode.userData.track, activeNode);
},

  // ------------------------------------------------------------
  // LYRICS
  // ------------------------------------------------------------
  showLyrics(app) {
    const path = app.currentLyricsPath;
    if (!path) return;

    fetch(path)
      .then(r => r.text())
      .then(text => {
        if (window.CosmicText) CosmicText.show(text);
      });
  },

  // ------------------------------------------------------------
  // UI TITLE (ARTIST • ALBUM • TRACK)
// ------------------------------------------------------------
  updateTitle(app, track) {
    const titleEl = document.getElementById("track-title");
    if (!titleEl) return;

    const albumNode = this.currentTrackNode?.userData.parent;
    const bandNode = albumNode?.userData.parent;

    const artist = bandNode?.userData.band?.name || "Unknown Artist";
    const album  = albumNode?.userData.album?.title || "Unknown Album";
    const title  = track.title || "Untitled";

    titleEl.textContent = `${artist} • ${album} • ${title}`;
  },

  // ------------------------------------------------------------
  // UPDATE CONTROL BAR (if bottom bar exists)
// ------------------------------------------------------------
  updateControlBar(track) {
    const el = document.getElementById("control-track-title");
    if (el) el.textContent = track.title;
  }
};

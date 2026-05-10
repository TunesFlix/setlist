// ------------------------------------------------------------
// CLUSTER MODULE — CONSTELLATION GALAXY (SEQUENTIAL BRANCH + FUTURISTIC LINES)
// ------------------------------------------------------------
window.ClusterMod = {
  name: "cluster",

  bands: [],
  nodes: [],
  lines: [],

  init(app) {
    this.app = app;
  },

  // ------------------------------------------------------------
  // PRELOAD ALL BANDS → ALBUMS → TRACKS (INVISIBLE, FROM JSON)
  // ------------------------------------------------------------
  LoadBandAlbumTrack(app, data) {
    if (!data || !data.bands) return;

    const bandRadius  = 300;
    const albumRadius = 80;
    const trackRadius = 20;

    const bandCount = data.bands.length;

    data.bands.forEach((band, bi) => {
      // POSITION BAND IN A CIRCLE
      const angle = bi * (Math.PI * 2 / bandCount);
      const bx = Math.cos(angle) * bandRadius;
      const bz = Math.sin(angle) * bandRadius;

      const bandNode = this.createBandNode(app, band, bx, 0, bz);
      bandNode.visible = false;

      const albums = band.albums || [];
      const albumCount = albums.length || 1;

      // POSITION ALBUMS AROUND BAND
      albums.forEach((album, ai) => {
        const aAngle = ai * (Math.PI * 2 / albumCount);
        const ax = bx + Math.cos(aAngle) * albumRadius;
        const az = bz + Math.sin(aAngle) * albumRadius;

        const albumNode = this.createAlbumNode(app, album, ax, 0, az, bandNode);
        albumNode.visible = false;

        const tracks = album.tracks || [];
        const trackCount = tracks.length || 1;

        // POSITION TRACKS AROUND ALBUM
        tracks.forEach((track, ti) => {
          const tAngle = ti * (Math.PI * 2 / trackCount);
          const tx = ax + Math.cos(tAngle) * trackRadius;
          const tz = az + Math.sin(tAngle) * trackRadius;

          const trackNode = this.createTrackNode(app, track, albumNode, tx, 0, tz);
          trackNode.visible = false;
        });
      });
    });
  },

  // ------------------------------------------------------------
  // BUILD GALAXY FROM JSON (LEGACY PATH)
// ------------------------------------------------------------
  buildFromJSON(app, data) {
    this.bands = data.bands || [];
    this.nodes = [];
    this.lines = [];

    const bandSpacing = 80;
    const mid = (this.bands.length - 1) / 2;

    this.bands.forEach((band, i) => {
      const x = (i - mid) * bandSpacing;
      const y = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 120;
      this.createBandNode(app, band, x, y, z);
    });
  },

  // ------------------------------------------------------------
  // CREATE BAND NODE (HOLOGRAPHIC COVER)
// ------------------------------------------------------------
  createBandNode(app, band, x, y, z) {
    const node = CoverMod.createCover(app, band, x, y, z);

    node.userData = {
      type: "band",
      band,
      children: [],
      parent: null,
      hoverTitle: band.name,
      hoverCover: band.cover,
      lines: []
    };

    this.nodes.push(node);
    node.callback = () => this.expandAlbums(app, node);
    return node;
  },

  // ------------------------------------------------------------
  // EXPAND ALBUMS (SEQUENTIAL BRANCH)
// ------------------------------------------------------------
// ------------------------------------------------------------
// EXPAND ALBUMS (FORCE‑EXPAND PRELOADED ALBUMS)
// ------------------------------------------------------------
expandAlbums(app, bandNode, force = false) {
  if (!force && bandNode.userData.children.length > 0) return;

  const albums = bandNode.userData.band.albums || [];
  const baseLength = 70;

  albums.forEach(album => {
    const dir = new THREE.Vector3(
      (Math.random() - 0.5),
      (Math.random() - 0.2),
      (Math.random() - 0.5)
    ).normalize();

    const length = baseLength + Math.random() * 30;
    const offset = dir.clone().multiplyScalar(length);
    const pos = bandNode.position.clone().add(offset);

    const node = this.createAlbumNode(app, album, pos.x, pos.y, pos.z, bandNode);
    node.userData.branchDir = dir;
    this.connectNodes(app, bandNode, node);
  });
},

forceExpandAlbums(app, bandNode) {
  const albums = bandNode.userData.band.albums || [];
  const baseLength = 70;

  albums.slice(0, 3).forEach(album => {
    const dir = new THREE.Vector3(
      (Math.random() - 0.5),
      (Math.random() - 0.2),
      (Math.random() - 0.5)
    ).normalize();

    const length = baseLength + Math.random() * 30;
    const offset = dir.clone().multiplyScalar(length);
    const pos = bandNode.position.clone().add(offset);

    // reuse or create
    let albumNode = bandNode.userData.children.find(
      c => c.userData.album?.title === album.title
    );

    if (!albumNode) {
      albumNode = this.createAlbumNode(app, album, pos.x, pos.y, pos.z, bandNode);
    } else {
      albumNode.position.copy(pos);
    }

    albumNode.visible = true;
    albumNode.userData.branchDir = dir;

    this.connectNodes(app, bandNode, albumNode);
  });
},




  // ------------------------------------------------------------
  // CREATE ALBUM NODE (HOLOGRAPHIC COVER)
// ------------------------------------------------------------
  createAlbumNode(app, album, x, y, z, parent) {
    const node = CoverMod.createCover(app, album, x, y, z);

    node.userData = {
      type: "album",
      album,
      parent,
      children: [],
      branchDir: null,
      hoverTitle: `${parent.userData.band.name} • ${album.title}`,
      hoverCover: album.cover,
      lines: []
    };

    parent.userData.children.push(node);
    this.nodes.push(node);

    node.callback = () => this.expandTracks(app, node);
    return node;
  },

  // ------------------------------------------------------------
  // EXPAND TRACKS (SEQUENTIAL CHAIN, FOLDER SCAN)
// ------------------------------------------------------------
async expandTracks(app, albumNode) {
  if (albumNode.userData.children.length > 0) return;

  const album = albumNode.userData.album;
  const tracks = await this.scanAlbum(album.path);
  if (!tracks.length) return;

  const trackSpacing = 14;
  const dir = albumNode.userData.branchDir || new THREE.Vector3(
    (Math.random() - 0.5),
    (Math.random() - 0.2),
    (Math.random() - 0.5)
  ).normalize();

  albumNode.userData.branchDir = dir;

  let previousTrackNode = null;

  tracks.forEach((track, i) => {
    const distance = trackSpacing * (i + 1) * 1.8;
    const angle = i % 2 === 0 ? Math.PI / 6 : -Math.PI / 6;
    const rotationAxis = new THREE.Vector3(0, 1, 0);
    const zigDir = dir.clone().applyAxisAngle(rotationAxis, angle);
    const verticalShift = (Math.sin(i * 0.7) * 6) + (Math.random() - 0.5) * 2;
    const offset = zigDir.multiplyScalar(distance);
    const pos = albumNode.position.clone().add(offset);
    pos.y += verticalShift;

    const node = this.createTrackNode(app, track, albumNode, pos.x, pos.y, pos.z);

    if (i === 0) this.connectNodes(app, albumNode, node);
    else this.connectNodes(app, previousTrackNode, node);

    previousTrackNode = node;
  });
},

async forceExpandTracks(app, albumNode) {
  const album = albumNode.userData.album;
  const tracks = await this.scanAlbum(album.path);
  if (!tracks.length) return;

  const trackSpacing = 14;
  const dir = albumNode.userData.branchDir || new THREE.Vector3(
    (Math.random() - 0.5),
    (Math.random() - 0.2),
    (Math.random() - 0.5)
  ).normalize();

  albumNode.userData.branchDir = dir;

  let previousTrackNode = null;

  tracks.forEach((track, i) => {
    const distance = trackSpacing * (i + 1) * 1.8;
    const angle = i % 2 === 0 ? Math.PI / 6 : -Math.PI / 6;
    const rotationAxis = new THREE.Vector3(0, 1, 0);
    const zigDir = dir.clone().applyAxisAngle(rotationAxis, angle);
    const verticalShift = (Math.sin(i * 0.7) * 6) + (Math.random() - 0.5) * 2;

    const offset = zigDir.multiplyScalar(distance);
    const pos = albumNode.position.clone().add(offset);
    pos.y += verticalShift;

    // reuse or create
    let node = albumNode.userData.children.find(
      c => c.userData.track?.title === track.title
    );

    if (!node) {
      node = this.createTrackNode(app, track, albumNode, pos.x, pos.y, pos.z);
    } else {
      node.position.copy(pos);
    }

    node.visible = true;

    if (i === 0) this.connectNodes(app, albumNode, node);
    else this.connectNodes(app, previousTrackNode, node);

    previousTrackNode = node;
  });
},


  // ------------------------------------------------------------
  // CREATE TRACK NODE (HOLOGRAPHIC COVER)
// ------------------------------------------------------------
  createTrackNode(app, track, parent, x, y, z) {
    const node = CoverMod.createCover(app, {
      cover: parent.userData.album.cover,
      name: track.title
    }, x, y, z);

    const bandName  = parent.userData.parent?.userData.band?.name || "Unknown Band";
    const albumName = parent.userData.album?.title || "Unknown Album";

    node.userData = {
      type: "track",
      track,
      parent,
      children: [],
      hoverTitle: `${bandName} • ${albumName} • ${track.title}`,
      hoverCover: parent.userData.album.cover,
      lines: [],
      numberSprite: null,
      glowRing: null
    };

    node.isTrack = true;

    parent.userData.children.push(node);
    this.nodes.push(node);

    node.callback = () => {
      console.log("=== TRACK CLICKED ===");
      console.log("Track object:", track);
      console.log("Track file:", track.file);

      let lyricsPath = "";
      const lower = track.file.toLowerCase();

      if (lower.endsWith(".mp3") ||
          lower.endsWith(".flac") ||
          lower.endsWith(".mp4")) {
        lyricsPath = track.file.replace(/\.(mp3|flac|mp4)$/i, ".txt");
      }

      app.currentLyricsPath = track.lyrics || lyricsPath;
      console.log("Final app.currentLyricsPath:", app.currentLyricsPath);

      AudioMod.playTrack(app, track, node);
      this.highlightRelated(node);
    };

    return node;
  },

  // ------------------------------------------------------------
  // CONNECT TWO NODES (FUTURISTIC HOLOGRAPHIC LINES)
// ------------------------------------------------------------
  connectNodes(app, a, b) {
    const geo = new THREE.BufferGeometry().setFromPoints([a.position, b.position]);

    let color;
    const typeA = a.userData.type;
    const typeB = b.userData.type;

    if ((typeA === "band" && typeB === "album") || (typeA === "album" && typeB === "band")) {
      color = 0x00eaff;
    } else if ((typeA === "album" && typeB === "track") || (typeA === "track" && typeB === "album")) {
      color = 0xff00ff;
    } else {
      color = 0x00ff99;
    }

    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8
    });

    const line = new THREE.Line(geo, mat);

    line.userData = {
      a,
      b,
      holoPhase: Math.random() * Math.PI * 2
    };

    app.scene.add(line);
    this.lines.push(line);

    a.userData.lines.push(line);
    b.userData.lines.push(line);
  },

  // ------------------------------------------------------------
  // UPDATE ALL LINES (KEEP CONSTELLATION RIGID + HOLO SHIMMER)
// ------------------------------------------------------------
  update(app, dt) {
    this.lines.forEach(line => {
      const { a, b } = line.userData;

      const pos = line.geometry.attributes.position;
      pos.setXYZ(0, a.position.x, a.position.y, a.position.z);
      pos.setXYZ(1, b.position.x, b.position.y, b.position.z);
      pos.needsUpdate = true;

      line.userData.holoPhase += dt * 1.5;
      const pulse = (Math.sin(line.userData.holoPhase) + 1) * 0.5;
      line.material.opacity = 0.45 + pulse * 0.4;
    });
  },

  // ------------------------------------------------------------
  // SCAN ALBUM FOLDER
  // ------------------------------------------------------------
  async scanAlbum(path) {
    const res = await fetch(path + "setlist.txt");
    const text = await res.text();

    return text
      .split(/\r?\n/)
      .filter(l => l.trim() !== "")
      .map(name => {
        const file = path + name;
        const title = name.replace(/\.[^/.]+$/, "");
        const lyrics = path + title + ".txt";
        return { title, file, lyrics };
      });
  },

  // ------------------------------------------------------------
  // ADD GLOW RING TO A TRACK NODE
  // ------------------------------------------------------------
  addGlowRing(node, color = 0x88ffff, scale = 1.5) {
    const geo = new THREE.RingGeometry(1.2 * scale, 1.6 * scale, 32);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;

    node.add(ring);
    node.userData.glowRing = ring;
  },

  // ------------------------------------------------------------
  // ADD NUMBER SPRITE (1–20) ABOVE TRACK NODE
  // ------------------------------------------------------------
  addNumberSprite(app, node, number) {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(number, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);

    sprite.scale.set(8, 8, 1);
    sprite.position.set(0, 10, 0);

    node.add(sprite);
    node.userData.numberSprite = sprite;
  },

  // ------------------------------------------------------------
  // RELATED HIGHLIGHTING (LOCAL ALBUM ONLY)
// ------------------------------------------------------------
  highlightRelated(node) {
    this.nodes.forEach(n => {
      n.userData.isHighlighted = false;
      n.userData.isDimmed = false;
    });

    if (node.userData.type === "track") {
      const albumNode = node.userData.parent;

      albumNode.userData.children.forEach(t => {
        if (t !== node) t.userData.isHighlighted = true;
      });

      this.nodes.forEach(n => {
        if (!n.userData.isHighlighted && n !== node) {
          n.userData.isDimmed = true;
        }
      });
    }
  }
};

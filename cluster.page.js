// ------------------------------------------------------------
// cluster.page.js — VISIBILITY PAGING USING PRELOADED NODES
// ------------------------------------------------------------
const ClusterPageMod = {
  page: 1,
  perPage: 10,
  totalPages: 1,
  bandNodes: [],
  app: null,

  init(app) {
    this.app = app;

    // ⭐ GET ALL BAND NODES FROM PRELOADED GALAXY
    this.bandNodes = ClusterMod.nodes.filter(n => n.userData.type === "band");

    // ⭐ COMPUTE TOTAL PAGES
    this.totalPages = Math.max(1, Math.ceil(this.bandNodes.length / this.perPage));

    // ⭐ SHOW FIRST PAGE
    this.showPage(1);
  },

// ------------------------------------------------------------
// SHOW ONLY BANDS FOR CURRENT PAGE
// ------------------------------------------------------------
showPage(page) {

  // ------------------------------------------------------------
  // PAGE NUMBER
  // ------------------------------------------------------------
  if (!this.app) return;

  this.page = Math.min(Math.max(page, 1), this.totalPages);

  const start = (this.page - 1) * this.perPage;
  const end   = start + this.perPage;


  // ------------------------------------------------------------
  // HIDE ALL BANDS
  // ------------------------------------------------------------
  this.bandNodes.forEach(bandNode => {
    this.setBranchVisible(bandNode, false);
  });


  // ------------------------------------------------------------
  // SHOW ONLY BANDS FOR THIS PAGE
  // ------------------------------------------------------------
  this.bandNodes.slice(start, end).forEach(bandNode => {
    this.setBranchVisible(bandNode, true);
  });


  // ------------------------------------------------------------
  // PAGE‑AWARE PROGRESS UI VISIBILITY
  // ------------------------------------------------------------
  const currentNode = AudioMod.currentTrackNode;

  if (!currentNode) {
    // No track playing → hide everything
    if (AudioMod.timeLabelCurrent) AudioMod.timeLabelCurrent.style.display = "none";
    if (AudioMod.timeLabelTotal)   AudioMod.timeLabelTotal.style.display = "none";
    if (AudioMod.progressBaseLine) AudioMod.progressBaseLine.visible = false;
    if (AudioMod.progressFillLine) AudioMod.progressFillLine.visible = false;

  } else {

    // Find the band node of the currently playing track
    const currentBandNode =
      currentNode.userData.parent?.userData.parent;

    // Is that band visible on this page?
    const bandIsVisible = currentBandNode?.visible === true;

    if (!bandIsVisible) {
      // Hide UI if the band is NOT on this page
      if (AudioMod.timeLabelCurrent) AudioMod.timeLabelCurrent.style.display = "none";
      if (AudioMod.timeLabelTotal)   AudioMod.timeLabelTotal.style.display = "none";
      if (AudioMod.progressBaseLine) AudioMod.progressBaseLine.visible = false;
      if (AudioMod.progressFillLine) AudioMod.progressFillLine.visible = false;

    } else {
      // Show UI if the band IS on this page
      if (AudioMod.timeLabelCurrent) AudioMod.timeLabelCurrent.style.display = "block";
      if (AudioMod.timeLabelTotal)   AudioMod.timeLabelTotal.style.display = "block";
      if (AudioMod.progressBaseLine) AudioMod.progressBaseLine.visible = true;
      if (AudioMod.progressFillLine) AudioMod.progressFillLine.visible = true;
    }
  }


  // ------------------------------------------------------------
  // HIDE RELATED BASE LINE IF CURRENT BAND IS NOT VISIBLE
  // ------------------------------------------------------------
  if (AudioMod.baseLine) {
    const currentNode = AudioMod.currentTrackNode;
    const currentBandNode = currentNode?.userData?.parent?.userData?.parent;
    const bandIsVisible = currentBandNode?.visible === true;

    AudioMod.baseLine.visible = bandIsVisible;
  }


  // ------------------------------------------------------------
  // UPDATE UI BUTTONS
  // ------------------------------------------------------------
  this.updateButtons();
  const num = document.getElementById("page-number");
  if (num) num.textContent = this.page;
},



  // ------------------------------------------------------------
  // RECURSIVE VISIBILITY FOR BAND → ALBUMS → TRACKS
  // ------------------------------------------------------------
setBranchVisible(node, visible) {
  if (!node) return;

  // hide/show the node itself
  node.visible = visible;

  // hide/show all lines attached to this node
  if (node.userData?.lines) {
    node.userData.lines.forEach(line => {
      line.visible = visible;
    });
  }

  // hide/show any lines that reference this node as parent or child
  ClusterMod.nodes.forEach(n => {
    if (n.userData?.lines) {
      n.userData.lines.forEach(line => {
        const p = line.userData?.parent;
        const c = line.userData?.child;
        if (p === node || c === node) {
          line.visible = visible;
        }
      });
    }
  });

  // recursively hide/show children
  if (node.userData?.children) {
    node.userData.children.forEach(child => {
      this.setBranchVisible(child, visible);
    });
  }
},

  // ------------------------------------------------------------
  // NAVIGATION
  // ------------------------------------------------------------
  next() {
    this.showPage(this.page + 1);
  },

  prev() {
    this.showPage(this.page - 1);
  },

  updateButtons() {
    const prev = document.getElementById("page-prev");
    const next = document.getElementById("page-next");
    const num  = document.getElementById("page-number");

    if (prev) prev.style.opacity = this.page === 1 ? "0.3" : "1";
    if (next) next.style.opacity = this.page === this.totalPages ? "0.3" : "1";
    if (num)  num.textContent = this.page;
  }
};

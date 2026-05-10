// ------------------------------------------------------------
// VIDEO MODULE
// ------------------------------------------------------------
const VideoMod = {
  name: "VideoMod",

  init(app) {
    this.app   = app;
    this.panel = document.getElementById("video-panel");
    this.video = document.getElementById("video");

    // Close button
    this.closeBtn = document.getElementById("video-close");
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => {
        VideoMod.hide();
         UIMod.showPlayState();
      });
    }

    // Start hidden
    if (this.panel) this.panel.style.display = "none";
  },

  // ------------------------------------------------------------
  // LOAD + PLAY VIDEO
  // ------------------------------------------------------------
  load(url) {
    if (!url || !this.video) return;

    // Show panel BEFORE loading video
    this.panel.style.display = "block";
    this.panel.classList.add("show");

    // Load video
    this.video.src = url;
    this.video.load();

    // Play video
    this.video.play().catch(() => {});

    // ⭐ Footer → PAUSE (video is playing)
    if (window.UIMod && UIMod.showPauseState) {
      UIMod.showPauseState();
    }
  },

  // ------------------------------------------------------------
  // HIDE VIDEO PANEL
  // ------------------------------------------------------------
  hide() {
    if (!this.panel || !this.video) return;

    // Hide panel
    this.panel.classList.remove("show");
    this.panel.style.display = "none";

    // Stop video
    this.video.pause();
    this.video.src = "";
  }
};

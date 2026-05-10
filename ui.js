// ------------------------------------------------------------
// UI MODULE (buttons, panels, lyrics, playback controls)
// ------------------------------------------------------------
const UIMod = {
  name: "UIMod",

  init(app) {
    this.app = app;

    // DOM elements
    this.trackTitle  = document.getElementById("track-title");
    this.lyricsPanel = document.getElementById("lyrics-panel");

    // Buttons
    this.btnLyrics  = document.getElementById("btn-lyrics");
    this.btnRelated = document.getElementById("btn-related");

    this.btnPlay    = document.getElementById("btn-play");
    this.btnPause   = document.getElementById("btn-pause");
    this.btnPrev    = document.getElementById("btn-prev");
    this.btnNext    = document.getElementById("btn-next");
    this.btnRepeat  = document.getElementById("btn-repeat");
    this.btnShuffle = document.getElementById("btn-shuffle");

    // ------------------------------------------------------------
    // PLAY
    // ------------------------------------------------------------
    this.btnPlay.onclick = () => {

      // If current track is a video → reopen video panel
      if (app.isVideo && app.currentFileURL) {
        VideoMod.load(app.currentFileURL);
        this.showPauseState();
        return;
      }

      // Normal audio play
      app.audio.play();
      this.showPauseState();
    };

    // ------------------------------------------------------------
    // PAUSE
    // ------------------------------------------------------------
    this.btnPause.onclick = () => {

      // If current track is a video
      if (app.isVideo) {

        // If video panel is open → pause video
        if (VideoMod.video && VideoMod.panel.style.display !== "none") {
          VideoMod.video.pause();
          this.showPlayState();
          return;
        }

        // If video panel is already closed → force PLAY state
        this.showPlayState();

        // Hard reset footer buttons
        if (this.btnPlay && this.btnPause) {
          this.btnPlay.style.display  = "inline-block";
          this.btnPause.style.display = "none";
        }

        return;
      }

      // Normal audio pause
      app.audio.pause();
      this.showPlayState();
    };

    // ------------------------------------------------------------
    // NEXT / PREV
    // ------------------------------------------------------------
    this.btnNext.onclick = () => {
      AudioMod.playNext(app);
      this.showPauseState();
    };

    this.btnPrev.onclick = () => {
      AudioMod.playPrev(app);
      this.showPauseState();
    };

    // ------------------------------------------------------------
    // REPEAT
    // ------------------------------------------------------------
    this.btnRepeat.onclick = () => {
      AudioMod.repeat = !AudioMod.repeat;

      if (AudioMod.repeat) {
        AudioMod.shuffle = false;
        this.btnShuffle.classList.remove("active");
        this.btnRepeat.classList.add("active");
      } else {
        this.btnRepeat.classList.remove("active");
      }
    };

    // ------------------------------------------------------------
    // SHUFFLE
    // ------------------------------------------------------------
    this.btnShuffle.onclick = () => {
      AudioMod.shuffle = !AudioMod.shuffle;

      if (AudioMod.shuffle) {
        AudioMod.repeat = false;
        this.btnRepeat.classList.remove("active");
        this.btnShuffle.classList.add("active");
      } else {
        this.btnShuffle.classList.remove("active");
      }
    };

    // ------------------------------------------------------------
    // RELATED
    // ------------------------------------------------------------
    this.btnRelated.onclick = () => {
      AudioMod.toggleRelated(app);
      this.btnRelated.classList.toggle("active", AudioMod.relatedMode);
    };

    // ------------------------------------------------------------
    // LYRICS
    // ------------------------------------------------------------
    this.btnLyrics.onclick = () => this.toggleLyrics();

    // ------------------------------------------------------------
    // PAGE SWITCH BUTTONS (< 1 >)
    // ------------------------------------------------------------
    const prev = document.getElementById("page-prev");
    const next = document.getElementById("page-next");

    if (prev) prev.onclick = () => ClusterPageMod.prev(app);
    if (next) next.onclick = () => ClusterPageMod.next(app);
  },

  // ------------------------------------------------------------
  // UI STATE HELPERS
  // ------------------------------------------------------------
  showPauseState() {

    // Do NOT force PAUSE if video is closed
    if (this.app.isVideo && VideoMod.panel.style.display === "none") {
      return;
    }

    this.btnPlay.style.display = "none";
    this.btnPause.style.display = "inline-flex";
  },

  showPlayState() {
    this.btnPause.style.display = "none";
    this.btnPlay.style.display = "inline-flex";
  },

  // ------------------------------------------------------------
  // TOGGLE LYRICS PANEL
  // ------------------------------------------------------------
  toggleLyrics() {
    const path = this.app.currentLyricsPath;
    if (!path) return;

    if (this.lyricsPanel.style.display === "block") {
      this.lyricsPanel.style.display = "none";
      return;
    }

    fetch(path)
      .then(r => r.text())
      .then(text => {
        this.lyricsPanel.textContent = text;
        this.lyricsPanel.style.display = "block";
      })
      .catch(() => {});
  }
};

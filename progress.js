// ------------------------------------------------------------
// PROGRESS MODULE — FloatTunes Galaxy (Bottom Bar + 3D Sync)
// ------------------------------------------------------------
window.ProgressMod = {
  name: "progress",

  bar: null,
  fill: null,
  timeCurrent: null,
  timeTotal: null,

  init(app) {
    this.bar  = document.getElementById("progress-bar");
    this.fill = document.getElementById("progress-fill");
    this.timeCurrent = document.getElementById("time-current");
    this.timeTotal   = document.getElementById("time-total");

    if (!this.bar || !this.fill) return;

    // ------------------------------------------------------------
    // SEEK ON CLICK
    // ------------------------------------------------------------
    this.bar.addEventListener("click", e => {
      const audio = app.video.style.display === "block" ? app.video : app.audio;
      if (!audio.duration) return;

      const rect = this.bar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      audio.currentTime = ratio * audio.duration;
    });
  },

  // ------------------------------------------------------------
  // UPDATE BOTTOM BAR + 3D PROGRESS FILL + FLOATING LABELS
  // ------------------------------------------------------------
  update(app, dt) {
    const audio = app.video.style.display === "block" ? app.video : app.audio;
    if (!this.fill) return;

    // bottom bar fill
    if (!audio.duration || isNaN(audio.duration)) {
      this.fill.style.width = "0%";
      if (this.timeCurrent) this.timeCurrent.textContent = "0:00";
      if (this.timeTotal)   this.timeTotal.textContent   = "0:00";
      return;
    }

    const ratio = audio.currentTime / audio.duration;
    this.fill.style.width = (ratio * 100) + "%";

    // update bottom time labels
    if (this.timeCurrent) this.timeCurrent.textContent = this.formatTime(audio.currentTime);
    if (this.timeTotal)   this.timeTotal.textContent   = this.formatTime(audio.duration);

    // ------------------------------------------------------------
    // 3D PROGRESS FILL LINE + FLOATING TIME LABELS
    // ------------------------------------------------------------
    if (AudioMod.progressLine && AudioMod.progressStart && AudioMod.progressEnd) {

      // 1) Compute current 3D point
      const clamped = Math.max(0, Math.min(1, ratio));
      AudioMod.progressCurrent = AudioMod.progressStart.clone().lerp(AudioMod.progressEnd, clamped);

      // 2) Update 3D line geometry
      const geo = AudioMod.progressLine.geometry;
      const posAttr = geo.getAttribute("position");
      posAttr.setXYZ(0, AudioMod.progressStart.x, AudioMod.progressStart.y, AudioMod.progressStart.z);
      posAttr.setXYZ(1, AudioMod.progressCurrent.x, AudioMod.progressCurrent.y, AudioMod.progressCurrent.z);
      posAttr.needsUpdate = true;

      // 3) Project CURRENT point (not start!)
      const p = AudioMod.progressCurrent.clone().project(app.camera);
      const sx = (p.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-p.y * 0.5 + 0.5) * window.innerHeight + 20;

      // 4) Update floating CURRENT TIME label
      if (AudioMod.timeLabelCurrent) {
        AudioMod.timeLabelCurrent.textContent = this.formatTime(audio.currentTime);
        AudioMod.timeLabelCurrent.style.left = `${sx}px`;
        AudioMod.timeLabelCurrent.style.top  = `${sy}px`;
      }

      // 5) Project END point for TOTAL TIME label
      const pEnd = AudioMod.progressEnd.clone().project(app.camera);
      const sxEnd = (pEnd.x * 0.5 + 0.5) * window.innerWidth;
      const syEnd = (-pEnd.y * 0.5 + 0.5) * window.innerHeight + 20;

      if (AudioMod.timeLabelTotal) {
        AudioMod.timeLabelTotal.textContent = this.formatTime(audio.duration);
        AudioMod.timeLabelTotal.style.left = `${sxEnd}px`;
        AudioMod.timeLabelTotal.style.top  = `${syEnd}px`;
      }
    }
  },

  // ------------------------------------------------------------
  // FORMAT TIME
  // ------------------------------------------------------------
  formatTime(sec) {
    if (!isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
};

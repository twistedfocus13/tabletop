/* Voice of the Forest — additive GM scene browser.
 * Chapter/scene metadata is intentionally separate from tabletop game state.
 * This module never moves players, overwrites boards, or unlocks chapters.
 */
(() => {
  "use strict";
  const manifestURL = new URL("./campaigns/voice-of-the-forest/scenes.json", document.baseURI);
  let manifest = null;
  let selectedChapter = 1;
  let query = "";
  let checkpointEntries = [];
  let renderCheckpointList = () => {};
  let lastProgress = null;
  const showProgress = () => {
    const root = document.getElementById("votfProgress");
    if (!root || !lastProgress) return;
    const { task, percent, message, status } = lastProgress;
    root.hidden = false;
    root.dataset.status = status;
    root.querySelector(".votf-progress-label").textContent = message;
    const bar = root.querySelector("progress");
    bar.max = 100;
    bar.value = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
    root.querySelector(".votf-progress-percent").textContent = bar.value + "%";
    root.setAttribute("aria-label", task + ": " + message);
  };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const normalize = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  function openExisting(scene, notice) {
    notice.textContent = "Looking for an existing saved scene…";
    document.dispatchEvent(new CustomEvent("votf:open-scene", { detail: { sceneId: scene.id, name: scene.name } }));
  }
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const savedChapter = Number(store("votfChapter"));
  let lastStatus = "";
  function render() {
    const root = document.getElementById("votfLibrary");
    if (!root || !manifest) return;
    root.replaceChildren();
    if (!manifest.chapters.some(c => c.id === selectedChapter) && manifest.chapters.length) selectedChapter = manifest.chapters[0].id;
    const heading = el("div", "votf-heading");
    const toggle = el("button", "votf-toggle");
    toggle.type = "button";
    const setOpen = open => {
      root.classList.toggle("votf-closed", !open);
      toggle.textContent = open ? "▾ Hide" : "▸ Show";
      toggle.setAttribute("aria-expanded", String(open));
      store("votfLibOpen", open ? "1" : "0");
    };
    toggle.addEventListener("click", () => setOpen(root.classList.contains("votf-closed")));
    heading.append(el("strong", "", "🌳 Voice of the Forest scenes"), toggle);
    root.append(heading,
      el("div", "votf-help", "Pick a chapter, then press ▶ Open on a scene. Only you see it: the players stay where they are."));
    const body = el("div", "votf-body");
    root.append(body);
    setOpen(store("votfLibOpen") !== "0");
    const progress = el("div", "votf-progress");
    progress.id = "votfProgress";
    progress.hidden = !lastProgress;
    progress.setAttribute("role", "status");
    progress.setAttribute("aria-live", "polite");
    const progressLabel = el("div", "votf-progress-label", "Ready");
    const progressRow = el("div", "votf-progress-row");
    const progressBar = el("progress");
    progressBar.max = 100;
    progressBar.value = 0;
    progressBar.setAttribute("aria-label", "Operation progress");
    progressRow.append(progressBar, el("span", "votf-progress-percent", "0%"));
    progress.append(progressLabel, progressRow);
    body.append(progress);
    showProgress();

    // ---- 1. chapter picker (a dropdown instead of a long scrolling row) ----
    const pick = el("div", "votf-pick");
    const chapterLabel = el("label", "", "Chapter");
    const chapterSelect = el("select");
    chapterSelect.id = "votfChapterPick";
    chapterLabel.htmlFor = chapterSelect.id;
    for (const chapter of manifest.chapters) {
      const n = (chapter.sceneIds || []).length;
      const opt = el("option", "", chapter.id + ": " + chapter.title + (n ? "  (" + n + " scene" + (n === 1 ? "" : "s") + ")" : "  (no scenes yet)"));
      opt.value = String(chapter.id);
      opt.selected = chapter.id === selectedChapter;
      chapterSelect.append(opt);
    }
    const goTo = id => { selectedChapter = id; query = ""; store("votfChapter", String(id)); render(); };
    chapterSelect.addEventListener("change", () => goTo(Number(chapterSelect.value)));
    const idx = manifest.chapters.findIndex(c => c.id === selectedChapter);
    const prev = el("button", "", "◀");
    prev.type = "button"; prev.title = "Previous chapter"; prev.disabled = idx <= 0;
    prev.addEventListener("click", () => goTo(manifest.chapters[idx - 1].id));
    const next = el("button", "", "▶");
    next.type = "button"; next.title = "Next chapter"; next.disabled = idx >= manifest.chapters.length - 1;
    next.addEventListener("click", () => goTo(manifest.chapters[idx + 1].id));
    pick.append(chapterLabel, prev, chapterSelect, next);
    body.append(pick);

    // ---- 2. scenes ----
    const chapterNow = manifest.chapters.find(c => c.id === selectedChapter);
    const search = el("input", "votf-search");
    search.type = "search";
    search.value = query;
    search.placeholder = "🔍 Find a scene in this chapter";
    search.setAttribute("aria-label", "Find a scene");
    search.addEventListener("input", () => { query = search.value; drawScenes(); });
    if ((chapterNow?.sceneIds || []).length > 6 || query) body.append(search);
    const list = el("div", "votf-scene-list");
    const notice = el("div", "votf-notice", lastStatus);
    notice.setAttribute("role", "status");
    body.append(list, notice);

    // ---- 3. checkpoints and backups (folded away until needed) ----
    const checkpointBox = el("details", "votf-checkpoints");
    checkpointBox.open = store("votfCpOpen") === "1";
    checkpointBox.addEventListener("toggle", () => store("votfCpOpen", checkpointBox.open ? "1" : "0"));
    const cpTitle = el("summary", "", "💾 Checkpoints & backups");
    checkpointBox.append(cpTitle, el("div", "votf-help",
      "A checkpoint saves the whole campaign so you can go back to it later. A backup is a file you keep on your computer."));
    const controls = el("div", "votf-checkpoint-actions");
    const checkpointName = el("input");
    checkpointName.type = "text";
    checkpointName.maxLength = 90;
    checkpointName.placeholder = "Name it, like: After the earthquake";
    checkpointName.setAttribute("aria-label", "New checkpoint name");
    const create = el("button", "", "💾 Save checkpoint");
    create.type = "button";
    const doCreate = () => {
      document.dispatchEvent(new CustomEvent("votf:checkpoint-create",
        { detail: { name: checkpointName.value.trim() || "Checkpoint " + new Date().toLocaleDateString() } }));
      checkpointName.value = "";
    };
    create.addEventListener("click", doCreate);
    checkpointName.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); doCreate(); } });
    const exportButton = el("button", "", "⬇️ Download backup");
    exportButton.type = "button";
    exportButton.title = "Saves a backup file to your computer";
    exportButton.addEventListener("click", () => document.dispatchEvent(new Event("votf:checkpoint-export")));
    const importButton = el("button", "", "⬆️ Load backup");
    importButton.title = "Opens a backup file you saved before";
    importButton.type = "button";
    importButton.addEventListener("click", () => {
      const picker = el("input");
      picker.type = "file";
      picker.accept = ".json,application/json";
      picker.style.display = "none";
      picker.addEventListener("change", () => {
        const file = picker.files?.[0];
        picker.remove();
        if (file) document.dispatchEvent(new CustomEvent("votf:checkpoint-import", { detail: { file } }));
      }, { once:true });
      document.body.append(picker);
      picker.click();
    });
    controls.append(checkpointName, create, exportButton, importButton);
    const savedList = el("div", "votf-checkpoint-list");
    renderCheckpointList = () => {
      savedList.replaceChildren();
      cpTitle.textContent = "💾 Checkpoints & backups" + (checkpointEntries.length ? " (" + checkpointEntries.length + ")" : "");
      if (!checkpointEntries.length) savedList.append(el("small", "", "No checkpoints yet. Save one before a big moment!"));
      for (const cp of checkpointEntries) {
        const line = el("div", "votf-checkpoint-row");
        line.append(el("span", "", cp.name + " · " + new Date(cp.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })));
        const restore = el("button", "", "↩️ Go back to this");
        restore.type = "button";
        restore.title = "Puts the campaign back the way it was (a safety copy is saved first)";
        restore.addEventListener("click", () => document.dispatchEvent(
          new CustomEvent("votf:checkpoint-restore", { detail: { id:cp.id } })));
        const del = el("button", "", "🗑️");
        del.title = "Delete this checkpoint";
        del.setAttribute("aria-label", "Delete checkpoint " + cp.name);
        del.type = "button";
        del.addEventListener("click", () => document.dispatchEvent(
          new CustomEvent("votf:checkpoint-delete", { detail: { id:cp.id } })));
        line.append(restore, del);
        savedList.append(line);
      }
    };
    checkpointBox.append(savedList, controls);
    body.append(checkpointBox, el("div", "votf-footnote",
      "Scenes and checkpoints are saved in this browser. Download a backup now and then to keep them safe."));
    document.dispatchEvent(new Event("votf:checkpoint-list"));
    function drawScenes() {
      list.replaceChildren();
      const chapter = manifest.chapters.find(c => c.id === selectedChapter);
      if (!chapter) return;
      const ids = chapter.sceneIds || [];
      const matches = ids.map(id => manifest.scenes.find(s => s.id === id)).filter(Boolean)
        .filter(scene => normalize(scene.name + " " + (scene.originalFilename || "")).includes(normalize(query)));
      for (const scene of matches) {
        const card = el("div", "votf-scene");
        const name = el("strong", "", scene.name);
        const description = el("span", "votf-tag", (scene.kind || "scene") + (scene.grid ? " · " + scene.grid.cols + "×" + scene.grid.rows : ""));
        const btn = el("button", "votf-open", "▶ Open");
        btn.type = "button";
        btn.title = "Open this scene for you (the GM). Players don't move.";
        btn.addEventListener("click", () => openExisting(scene, notice));
        card.append(name, description, btn);
        if (scene.id) {
          const close = el("button", "", "💾 Save & close");
          close.title = "Saves this scene and takes it off the table (you can open it again anytime)";
          close.type = "button";
          close.addEventListener("click", () => document.dispatchEvent(
            new CustomEvent("votf:close-scene", { detail: { sceneId: scene.id } })));
          card.append(close);
        }
        if (scene.originalFilename && scene.grid) {
          const importer = el("button", "votf-link", "🖼️ Add map picture");
          importer.type = "button";
          importer.title = "First time only: pick " + scene.originalFilename + " from your computer to make this scene";
          importer.addEventListener("click", () => {
            const input = el("input");
            input.type = "file";
            input.accept = "image/png,image/jpeg,image/webp";
            input.style.display = "none";
            input.addEventListener("change", () => {
              const file = input.files && input.files[0];
              input.remove();
              if (!file) return;
              if (file.name !== scene.originalFilename &&
                !confirm("Selected " + file.name + " instead of " + scene.originalFilename + ". Import this image for " + scene.name + "?")) return;
              notice.textContent = "Importing original image into a new private scene…";
              document.dispatchEvent(new CustomEvent("votf:import-scene", {
                detail: { sceneId: scene.id, name: scene.name, chapterId: selectedChapter,
                  originalFilename: scene.originalFilename, cols: scene.grid.cols, rows: scene.grid.rows, file }
              }));
            }, { once: true });
            document.body.append(input);
            input.click();
          });
          card.append(importer);
        }
        list.append(card);
      }
      if (!matches.length) list.append(el("p", "votf-help", ids.length ? "No scenes match that search." : "No scenes in this chapter yet."));
    }
    drawScenes();
  }
  document.addEventListener("votf:progress", e => {
    const detail = e.detail || {};
    if (typeof detail.message !== "string") return;
    lastProgress = {
      task: String(detail.task || "operation"),
      percent: Number(detail.percent) || 0,
      message: detail.message,
      status: ["running", "success", "error"].includes(detail.status) ? detail.status : "running"
    };
    showProgress();
  });
  document.addEventListener("votf:checkpoints", e => {
    checkpointEntries = Array.isArray(e.detail?.entries) ? e.detail.entries : [];
    renderCheckpointList();
  });
  document.addEventListener("votf:scene-status", e => {
    if (typeof e.detail?.message !== "string") return;
    lastStatus = e.detail.message;                    // kept, so it survives switching chapters
    const notice = document.querySelector("#votfLibrary .votf-notice");
    if (notice) notice.textContent = lastStatus;
  });
  async function init() {
    const body = document.getElementById("placesBody");
    if (!body) return;
    const root = el("section", "votf-library");
    root.id = "votfLibrary";
    root.setAttribute("aria-label", "Voice of the Forest scene library");
    body.insertBefore(root, document.getElementById("placesFolders"));
    try {
      const response = await fetch(manifestURL.href, { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      manifest = await response.json();
      if (!Array.isArray(manifest.chapters) || !Array.isArray(manifest.scenes)) throw new Error("Invalid scene registry");
      if (manifest.chapters.some(c => c.id === savedChapter)) selectedChapter = savedChapter;   // the chapter she used last
      render();
    } catch (err) {
      root.append(el("p", "", "Scene library unavailable: " + err.message));
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

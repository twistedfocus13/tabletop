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
  function render() {
    const root = document.getElementById("votfLibrary");
    if (!root || !manifest) return;
    root.replaceChildren();
    const heading = el("div", "votf-heading");
    heading.append(el("strong", "", "🌳 Voice of the Forest"), el("span", "", "GM scene library · preparation only"));
    root.append(heading);
    const checkpointBox = el("div", "votf-checkpoints");
    checkpointBox.append(el("strong", "", "Campaign checkpoints"));
    const controls = el("div", "votf-checkpoint-actions");
    const checkpointName = el("input");
    checkpointName.type = "text";
    checkpointName.maxLength = 90;
    checkpointName.placeholder = "Checkpoint name";
    checkpointName.setAttribute("aria-label", "New checkpoint name");
    const create = el("button", "", "Save checkpoint");
    create.type = "button";
    create.addEventListener("click", () => document.dispatchEvent(
      new CustomEvent("votf:checkpoint-create", { detail: { name: checkpointName.value.trim() || "Campaign checkpoint" } })));
    const exportButton = el("button", "", "Export backup");
    exportButton.type = "button";
    exportButton.addEventListener("click", () => document.dispatchEvent(new Event("votf:checkpoint-export")));
    controls.append(checkpointName, create, exportButton);
    const savedList = el("div", "votf-checkpoint-list");
    renderCheckpointList = () => {
      savedList.replaceChildren();
      if (!checkpointEntries.length) savedList.append(el("small", "", "No checkpoints saved yet."));
      for (const cp of checkpointEntries) {
        const line = el("div", "votf-checkpoint-row");
        line.append(el("span", "", cp.name + " · " + new Date(cp.at).toLocaleString()));
        const restore = el("button", "", "Restore");
        restore.type = "button";
        restore.addEventListener("click", () => document.dispatchEvent(
          new CustomEvent("votf:checkpoint-restore", { detail: { id:cp.id } })));
        const del = el("button", "", "Delete");
        del.type = "button";
        del.addEventListener("click", () => document.dispatchEvent(
          new CustomEvent("votf:checkpoint-delete", { detail: { id:cp.id } })));
        line.append(restore, del);
        savedList.append(line);
      }
    };
    checkpointBox.append(controls, savedList);
    root.append(checkpointBox);
    document.dispatchEvent(new Event("votf:checkpoint-list"));
    const chapters = el("div", "votf-chapters");
    for (const chapter of manifest.chapters) {
      const button = el("button", selectedChapter === chapter.id ? "votf-active" : "", String(chapter.id) + ": " + chapter.title);
      button.type = "button";
      button.setAttribute("aria-pressed", String(selectedChapter === chapter.id));
      button.addEventListener("click", () => { selectedChapter = chapter.id; render(); });
      chapters.append(button);
    }
    root.append(chapters);
    const search = el("input", "votf-search");
    search.type = "search";
    search.value = query;
    search.placeholder = "Filter scenes in this chapter";
    search.setAttribute("aria-label", "Filter scenes");
    search.addEventListener("input", () => { query = search.value; drawScenes(); });
    root.append(search);
    const list = el("div", "votf-scene-list");
    const notice = el("div", "votf-notice");
    notice.setAttribute("role", "status");
    root.append(list, notice);
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
        const description = el("small", "", scene.kind + (scene.grid ? " · " + scene.grid.cols + "×" + scene.grid.rows : ""));
        const btn = el("button", "", "Open saved scene");
        btn.type = "button";
        btn.addEventListener("click", () => openExisting(scene, notice));
        card.append(name, description, btn);
        if (scene.id) {
          const close = el("button", "", "Save & close scene");
          close.type = "button";
          close.addEventListener("click", () => document.dispatchEvent(
            new CustomEvent("votf:close-scene", { detail: { sceneId: scene.id } })));
          card.append(close);
        }
        if (scene.originalFilename && scene.grid) {
          const importer = el("button", "", "Import original PNG");
          importer.type = "button";
          importer.title = "Import a local copy of " + scene.originalFilename + " into a new GM-only board";
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
      if (!matches.length) list.append(el("p", "", ids.length ? "No matching scenes." : "Scenes not yet assigned."));
      notice.textContent = "GM library: imported scenes are saved in your browser. Back up before clearing site data.";
    }
    drawScenes();
  }
  document.addEventListener("votf:checkpoints", e => {
    checkpointEntries = Array.isArray(e.detail?.entries) ? e.detail.entries : [];
    renderCheckpointList();
  });
  document.addEventListener("votf:scene-status", e => {
    const notice = document.querySelector("#votfLibrary .votf-notice");
    if (notice && typeof e.detail?.message === "string") notice.textContent = e.detail.message;
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
      render();
    } catch (err) {
      root.append(el("p", "", "Scene library unavailable: " + err.message));
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();

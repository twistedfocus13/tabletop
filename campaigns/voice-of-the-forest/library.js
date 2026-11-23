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
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const normalize = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const savedPlaceCards = () => [...document.querySelectorAll("#placesCards .placeCard")];
  function matchSavedPlace(scene) {
    const targets = [scene.name, scene.originalFilename?.replace(/\.png$/i, "").replace(/_/g, " ")].filter(Boolean).map(normalize);
    return savedPlaceCards().find(card => targets.includes(normalize(card.querySelector(".pcName")?.textContent)));
  }
  function openExisting(scene, notice) {
    const found = matchSavedPlace(scene);
    if (found) { found.click(); return; }
    // Saved boards may be in another folder. Search existing folder buttons
    // without modifying the saved-board library or loading a missing map.
    const folders = [...document.querySelectorAll("#placesFolders button:not(.pfSave)")];
    for (const button of folders) {
      button.click();
      const card = matchSavedPlace(scene);
      if (card) { card.click(); return; }
    }
    notice.textContent = "Not in Saved Places yet. Add its original image to a board, save that board with the scene name, and try again.";
  }
  function render() {
    const root = document.getElementById("votfLibrary");
    if (!root || !manifest) return;
    root.replaceChildren();
    const heading = el("div", "votf-heading");
    heading.append(el("strong", "", "🌳 Voice of the Forest"), el("span", "", "GM scene library · preparation only"));
    root.append(heading);
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
        const btn = el("button", "", "Find saved place");
        btn.type = "button";
        btn.addEventListener("click", () => openExisting(scene, notice));
        card.append(name, description, btn);
        list.append(card);
      }
      if (!matches.length) list.append(el("p", "", ids.length ? "No matching scenes." : "Scenes not yet assigned."));
      notice.textContent = "Map images and persistent game state are not imported by this browser. Existing saved boards are never changed.";
    }
    drawScenes();
  }
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

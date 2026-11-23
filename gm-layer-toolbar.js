/* GM editing layer toolbar: a compact workflow switcher for existing tabletop tools.
 * Buttons use the established game controls so multiplayer permissions and saves
 * stay governed by tabletop.js. This does not invent a second game state.
 */
(() => {
  "use strict";
  const modes = [
    { id:"tokens", label:"Tokens", icon:"♟", help:"Select, move, or edit Pokémon minis. WASD and arrows move the selected mini." },
    { id:"gm", label:"GM", icon:"♛", help:"Prepare secret NPCs and hidden areas. Use Hide / Reveal on the selected mini." },
    { id:"map", label:"Map", icon:"▧", help:"Import a map picture, edit terrain, or move board geometry." },
    { id:"layers", label:"Layers", icon:"▱", help:"Switch GM scene layers. Moving players requires your confirmation." },
    { id:"fog", label:"Fog", icon:"◌", help:"Paint dark fog directly onto the map. Left-drag hides or reveals grid squares only on the selected GM layer." },
    { id:"light", label:"Light", icon:"☼", help:"Click on the map to place glowing light sources, or remove existing ones. Choose range and color below." }
  ];
  const byId = id => document.getElementById(id);
  let mode = "tokens";
  let boardMoveActive = false;
  const editing = { brush:"hide", size:1, radius:5, color:"#ffcc82" };
  function syncSettings() {
    document.dispatchEvent(new CustomEvent("gmtools:settings", {detail:{...editing}}));
  }
  const make = (tag, className, label) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (label != null) el.textContent = label;
    return el;
  };
  function useTab(tab) {
    const button = document.querySelector('#gmTabs button[data-tab="' + tab + '"]');
    button?.click();
    // The native tabs remain the single source of tool configuration.
  }
  function nativeClick(id) {
    const button = byId(id);
    if (!button || button.disabled) return;
    button.click();
  }
  function tool(label, onclick, title) {
    const btn = make("button", "gm-layer-action", label);
    btn.type = "button";
    if (title) btn.title = title;
    btn.addEventListener("click", onclick);
    return btn;
  }
  function renderPanel() {
    const panel = byId("gmLayerPanel");
    if (!panel) return;
    panel.replaceChildren();
    const spec = modes.find(x => x.id === mode);
    const heading = make("div", "gm-layer-panel-head", spec.label + " editing");
    const desc = make("p", "gm-layer-panel-help", spec.help);
    panel.append(heading, desc);
    const actions = make("div", "gm-layer-actions");
    if (mode === "tokens") {
      actions.append(
        tool("Minis panel", () => useTab("minis")),
        tool("Selected mini", () => useTab("minis"), "Edit name, sprite, HP, and ownership")
      );
    } else if (mode === "gm") {
      actions.append(
        tool("Hide / reveal selected", () => { useTab("minis"); nativeClick("selHide"); }, "Only GM can edit mini visibility"),
        tool("Add hidden area", () => { useTab("boards"); nativeClick("addHiddenBoard"); }),
        tool("Minis panel", () => useTab("minis"))
      );
    } else if (mode === "map") {
      actions.append(
        tool("Map image…", () => { useTab("boards"); nativeClick("mapFile"); }),
        tool("Terrain paint", () => useTab("terrain")),
        tool("Move boards", () => { useTab("boards"); nativeClick("moveBoards"); boardMoveActive = !boardMoveActive; }, "Use the native board movement tool")
      );
    } else if (mode === "layers") {
      const select = make("select", "gm-layer-select");
      select.setAttribute("aria-label", "GM viewing layer");
      const source = byId("layerPick");
      if (source) {
        select.replaceChildren(...[...source.options].map(opt => {
          const copy = make("option", "", opt.textContent);
          copy.value = opt.value;
          return copy;
        }));
        select.value = source.value;
      }
      select.addEventListener("change", () => {
        const original = byId("layerPick");
        if (!original) return;
        original.value = select.value;
        original.dispatchEvent(new Event("change", { bubbles:true }));
      });
      panel.append(select);
      actions.append(
        tool("Refresh layers", () => renderPanel()),
        tool("+ New layer", () => { useTab("boards"); nativeClick("layerNew"); renderPanel(); }),
        tool("Move players here…", () => { useTab("boards"); nativeClick("layerLive"); renderPanel(); }, "Native GM confirmation is required")
      );
    } else if (mode === "fog") {
      const picker = make("select","gm-layer-select");
      picker.setAttribute("aria-label","Fog brush mode");
      for (const [value,label] of [["hide","Paint fog (hide)"],["reveal","Erase fog (reveal)"]]) {
        const opt = make("option","",label); opt.value=value; picker.append(opt);
      }
      if (!["hide","reveal"].includes(editing.brush)) editing.brush="hide";
      picker.value=editing.brush;
      picker.addEventListener("change",()=>{ editing.brush=picker.value; syncSettings(); });
      const sizeLabel=make("label","gm-layer-field","Brush size (1–5)");
      const size=make("input","gm-layer-select");
      size.type="range"; size.min="1"; size.max="5"; size.step="1"; size.value=editing.size;
      size.addEventListener("input",()=>{editing.size=+size.value;sizeLabel.textContent="Brush size: "+editing.size;syncSettings();});
      sizeLabel.textContent="Brush size: "+editing.size;
      panel.append(picker,sizeLabel,size);
      actions.append(
        tool("Dungeon fog settings",()=>useTab("floors")),
        tool("Reveal whole dungeon floor…",()=>{useTab("floors");nativeClick("floorShow");})
      );
    } else if (mode === "light") {
      const brush=make("select","gm-layer-select");
      brush.setAttribute("aria-label","Light tool");
      for (const [value,label] of [["hide","Place light"],["remove","Remove nearest light"]]) {
        const opt=make("option","",label); opt.value=value; brush.append(opt);
      }
      if (!["hide","remove"].includes(editing.brush)) editing.brush="hide";
      brush.value=editing.brush;
      brush.addEventListener("change",()=>{editing.brush=brush.value;syncSettings();});
      const radiusLabel=make("label","gm-layer-field","Light radius: "+editing.radius);
      const radius=make("input","gm-layer-select");
      radius.type="range"; radius.min="2"; radius.max="12"; radius.step="1"; radius.value=editing.radius;
      radius.addEventListener("input",()=>{editing.radius=+radius.value;radiusLabel.textContent="Light radius: "+editing.radius;syncSettings();});
      const colorLabel=make("label","gm-layer-field","Light color");
      const color=make("input","gm-layer-select");
      color.type="color";color.value=editing.color;
      color.addEventListener("input",()=>{editing.color=color.value;syncSettings();});
      panel.append(brush,radiusLabel,radius,colorLabel,color);
      const caption = make("label", "gm-layer-field", "Scene ambience");
      const source = byId("bgPick"), select = make("select", "gm-layer-select");
      select.setAttribute("aria-label", "Tabletop ambience");
      if (source) {
        select.replaceChildren(...[...source.options].map(opt => {
          const copy = make("option", "", opt.textContent);
          copy.value = opt.value;
          return copy;
        }));
        select.value = source.value;
      }
      select.addEventListener("change", () => {
        if (!source) return;
        source.value = select.value;
        source.dispatchEvent(new Event("change", { bubbles:true }));
      });
      panel.append(caption, select);
      actions.append(tool("Backdrop settings", () => useTab("floors")));
    }
    panel.append(actions);
  }
  function chooseMode(id) {
    if (!modes.some(x => x.id === id)) return;
    mode = id;
    // All canvas clicks are now governed by the active editing mode.
    if (id === "fog" || id === "light") editing.brush = "hide";
    document.dispatchEvent(new CustomEvent("gmtools:mode",{detail:{mode:id}}));
    syncSettings();
    for (const btn of document.querySelectorAll("#gmLayerToolbar [data-layer-mode]")) {
      btn.classList.toggle("active", btn.dataset.layerMode === id);
      btn.setAttribute("aria-pressed", String(btn.dataset.layerMode === id));
    }
    renderPanel();
    const tab = {tokens:"minis",gm:"minis",map:"boards",layers:"boards",fog:"floors",light:"floors"}[id];
    useTab(tab);
    try { sessionStorage.setItem("tabletop.gmEditMode", id); } catch {}
  }
  // 11-22: keep the tool rail below the Places bar so it never covers the scene cards.
  function fitBelowPlaces() {
    const bar = byId("gmLayerToolbar"), places = byId("placesBar");
    if (!bar) return;
    let top = 72;
    const holder = (bar.offsetParent || document.body).getBoundingClientRect();
    if (places && places.offsetParent) {
      top = Math.max(72, Math.round(places.getBoundingClientRect().bottom - holder.top + 10));
    }
    bar.style.top = top + "px";
    const room = (holder.height || window.innerHeight) - top - 12;
    bar.style.setProperty("--railMax", Math.max(160, Math.round(room)) + "px");
  }
  function watchPlaces() {
    const places = byId("placesBar");
    if (places && "ResizeObserver" in window) new ResizeObserver(fitBelowPlaces).observe(places);
    window.addEventListener("resize", fitBelowPlaces);
    new MutationObserver(fitBelowPlaces).observe(document.body, { attributes:true, attributeFilter:["class"] });
    fitBelowPlaces();
  }
  function init() {
    const bar = byId("gmLayerToolbar"), toggle = byId("gmLayerPanelToggle");
    if (!bar || !toggle) return;
    watchPlaces();
    const items = byId("gmLayerButtons");
    for (const spec of modes) {
      const btn = make("button", "gm-layer-button", "");
      btn.type = "button";
      btn.dataset.layerMode = spec.id;
      btn.title = spec.label + " editing";
      btn.setAttribute("aria-label", spec.label + " editing layer");
      btn.append(make("span", "gm-layer-symbol", spec.icon), make("span", "gm-layer-name", spec.label));
      btn.addEventListener("click", () => chooseMode(spec.id));
      items.append(btn);
    }
    toggle.addEventListener("click", () => {
      const open = bar.classList.toggle("panel-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "◂" : "▸";
    });
    try {
      const saved = sessionStorage.getItem("tabletop.gmEditMode");
      if (modes.some(x => x.id === saved)) mode = saved;
    } catch {}
    // The game is initially at its lobby; only switch the native tabs once
    // it is entered and the user explicitly selects a mode.
    for (const btn of bar.querySelectorAll("[data-layer-mode]")) {
      btn.classList.toggle("active", btn.dataset.layerMode === mode);
      btn.setAttribute("aria-pressed", String(btn.dataset.layerMode === mode));
    }
    renderPanel();
    syncSettings();
    // Initial Tokens mode is applied on GM room entry, not while the lobby is open.
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();

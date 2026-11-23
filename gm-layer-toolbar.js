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
    { id:"fog", label:"Fog", icon:"◌", help:"Manage the existing dungeon fog and room reveal rules." },
    { id:"light", label:"Light", icon:"☼", help:"Choose the tabletop ambience and background. Dynamic light sources are not yet supported." }
  ];
  const byId = id => document.getElementById(id);
  let mode = "tokens";
  let boardMoveActive = false;
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
      actions.append(
        tool("Dungeon settings", () => useTab("floors")),
        tool("Reveal whole floor…", () => { useTab("floors"); nativeClick("floorShow"); }, "Existing reveal action will ask for confirmation"),
        tool("Fog / terrain tools", () => useTab("terrain"))
      );
    } else if (mode === "light") {
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
    for (const btn of document.querySelectorAll("#gmLayerToolbar [data-layer-mode]")) {
      btn.classList.toggle("active", btn.dataset.layerMode === id);
      btn.setAttribute("aria-pressed", String(btn.dataset.layerMode === id));
    }
    renderPanel();
    const tab = {tokens:"minis",gm:"minis",map:"boards",layers:"boards",fog:"floors",light:"floors"}[id];
    useTab(tab);
    try { sessionStorage.setItem("tabletop.gmEditMode", id); } catch {}
  }
  function init() {
    const bar = byId("gmLayerToolbar"), toggle = byId("gmLayerPanelToggle");
    if (!bar || !toggle) return;
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
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();
})();

/* Roll20-style tabletop shell: presentation only, preserving existing game state.
 * Existing #logSec, #dice section and #players section are reparented—not
 * cloned—so their original chat/dice/network listeners keep working.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const tabs = [
    {id:"chat",icon:"☷",label:"Chat",tip:"Messages and rolls"},
    {id:"dice",icon:"◈",label:"Dice",tip:"Roll tabletop dice"},
    {id:"players",icon:"♙",label:"Players",tip:"Players and invitations"},
    {id:"scenes",icon:"▧",label:"Scenes",tip:"Saved places and scenes"},
    {id:"settings",icon:"⚙",label:"Settings",tip:"All tabletop settings"}
  ];
  const make = (tag,cls,txt) => {
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(txt!==undefined)n.textContent=txt;
    return n;
  };
  let active="chat";
  let dock=null;
  const remember = () => {try{localStorage.setItem("tabletop.roll20Tab",active);}catch{}};
  function show(tab, save=true) {
    if (!tabs.some(t=>t.id===tab)) return;
    active=tab;
    document.body.classList.toggle("r20DockActive",tab!=="settings");
    document.body.classList.toggle("r20DockSettings",tab==="settings");
    for(const b of dock.querySelectorAll(".r20-tab")){
      const selected=b.dataset.r20Tab===tab;
      b.classList.toggle("active",selected);
      b.setAttribute("aria-selected",String(selected));
      b.tabIndex=selected?0:-1;
    }
    for(const pane of dock.querySelectorAll(".r20-pane")) {
      const shown=pane.dataset.pane===tab;
      pane.classList.toggle("active",shown);
      pane.hidden=!shown;
    }
    if(tab==="chat"){
      const log=$("log"); if(log)log.scrollTop=log.scrollHeight;
    } else if(tab==="scenes"){
      const source=$("placesTab");
      const status=$("r20SceneStatus");
      if(status)status.textContent=source?.textContent?.trim() || "Scene controls";
    }
    if(save)remember();
    if(typeof window.dispatchEvent==="function")window.dispatchEvent(new Event("resize"));
  }
  function init(){
    const side=$("side"), logSec=$("logSec");
    if(!side||!logSec||$("r20Dock"))return;
    dock=make("div","r20-dock");dock.id="r20Dock";
    dock.setAttribute("aria-label","Tabletop tools and chat");
    const top=make("nav","r20-tabs");top.setAttribute("role","tablist");
    top.setAttribute("aria-label","Tabletop sidebar");
    for(const spec of tabs){
      const b=make("button","r20-tab",spec.icon);
      b.type="button";
      b.dataset.r20Tab=spec.id;
      b.title=spec.label+" · "+spec.tip;
      b.setAttribute("aria-label",spec.label);
      b.setAttribute("role","tab");
      b.addEventListener("click",()=>show(spec.id));
      b.addEventListener("keydown",e=>{
        if(!["ArrowLeft","ArrowRight"].includes(e.key))return;
        e.preventDefault();
        const i=tabs.findIndex(t=>t.id===active);
        const j=(i+(e.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
        show(tabs[j].id);
        top.querySelector('[data-r20-tab="'+tabs[j].id+'"]')?.focus();
      });
      top.append(b);
    }
    dock.append(top);
    const panes=make("div","r20-panes");
    for(const spec of tabs){
      const pane=make("div","r20-pane");pane.id="r20"+spec.id[0].toUpperCase()+spec.id.slice(1);
      pane.dataset.pane=spec.id;
      pane.setAttribute("role","tabpanel");
      pane.setAttribute("aria-label",spec.label);
      panes.append(pane);
    }
    dock.append(panes);
    side.insertBefore(dock,side.firstChild);
    // Reference-style GM tool rail. Every item triggers an existing native tool.
    // No fake drawing/text/FX controls: labels only promise supported behavior.
    const layerBar=$("gmLayerToolbar"),layerButtons=$("gmLayerButtons");
    if(layerBar&&layerButtons&&!$("r20QuickTools")){
      const quick=make("div","r20-quick-tools");quick.id="r20QuickTools";
      const options=[
        {icon:"➤",name:"Select tokens",run:()=>layerButtons.querySelector('[data-layer-mode="tokens"]')?.click()},
        {icon:"✋",name:"Pan the map",run:()=>{layerButtons.querySelector('[data-layer-mode="tokens"]')?.click();}},
        {icon:"✎",name:"Paint terrain",run:()=>{
          layerButtons.querySelector('[data-layer-mode="map"]')?.click();
          $("gmTabs")?.querySelector('[data-tab="terrain"]')?.click();
          if(!$("paintBtn")?.classList.contains("on"))$("paintBtn")?.click();
        }},
        {icon:"◫",name:"Measure area",run:()=>{$("gmTabs")?.querySelector('[data-tab="combat"]')?.click();$("areaPlace")?.click();}},
        {icon:"⌖",name:"Ping location",run:()=>{$("pingBtn")?.click();}},
        {icon:"⚄",name:"Dice",run:()=>show("dice")},
        {icon:"⚙",name:"Settings",run:()=>show("settings")}
      ];
      for(const item of options){
        const button=make("button","r20-quick-btn",item.icon);
        button.type="button";button.title=item.name;
        button.setAttribute("aria-label",item.name);
        button.addEventListener("click",item.run);
        quick.append(button);
      }
      layerBar.append(quick);
    }
    // Move the real components; never duplicate their IDs or handlers.
    $("r20Chat").append(logSec);
    // The old GM log was draggable. Disable dragging inside the new dock;
    // this log now scrolls as an ordinary sidebar conversation.
    logSec.querySelector("h3")?.addEventListener("pointerdown",e=>e.stopImmediatePropagation(),true);
    const chatTips=make("details","r20-chat-tips");
    const summary=make("summary","","Chat tips");chatTips.append(summary);
    chatTips.open=true;
    const text=make("div","r20-tips-body");
    text.append(make("p","","Enter any message to chat with the party. You can also use:"));
    const commands=make("ul","");
    for(const [command,description] of [
      ["/roll 1d20 or /r 2d6","Roll dice into the shared chat"],
      ["/gmroll 1d20 or /gr 1d20","Roll privately to the GM"],
      ["/w gm message","Whisper privately to the GM"],
      ["/w \"Player Name\" message","Whisper to a player by name"]
    ]) {
      const li=make("li","");
      const code=make("code","",command);
      li.append(code,make("span","",description));commands.append(li);
    }
    text.append(commands);chatTips.append(text);
    // Insert after the scrollable log but before chat composition.
    const input=logSec.querySelector("#chatIn")?.closest(".row");
    if(input)logSec.insertBefore(chatTips,input);else logSec.append(chatTips);
    const dice=$("dice")?.closest("section");
    if(dice) {
      dice.classList.add("r20-docked-section");
      $("r20Dice").append(dice);
    }
    const players=$("players")?.closest("section");
    if(players){
      players.classList.add("r20-docked-section");
      $("r20Players").append(players);
    }
    // Invite link uses the existing validated handler to avoid diverging links.
    const invite=make("section","r20-invite");
    invite.append(make("h3","","Invite players"));
    const msg=make("p","","Share your campaign's player link.");
    invite.append(msg);
    const link=make("input","r20-invite-link");
    link.type="text";link.readOnly=true;link.setAttribute("aria-label","Player invitation URL");
    const actions=make("div","r20-invite-actions");
    const copy=make("button","","Copy player link");copy.type="button";
    copy.addEventListener("click",()=>{
      const source=$("copyLink");
      if(source)source.click();
      copy.textContent="Copy requested";
      setTimeout(()=>{copy.textContent="Copy player link";},1600);
    });
    actions.append(copy);invite.append(link,actions);
    $("r20Players").append(invite);
    // Scene list and tools reuse the existing Places and GM layers selectors.
    const scenes=$("r20Scenes");
    scenes.append(make("h3","","Scenes & pages"));
    scenes.append(make("p","r20-description","Switch GM viewing pages without moving the party. Players travel only when the GM confirms."));
    const sceneActions=make("div","r20-actions");
    const openPlaces=make("button","","Open places");
    openPlaces.addEventListener("click",()=>{
      if(!document.body.classList.contains("gm")||document.body.classList.contains("previewing"))return;
      if(!document.body.classList.contains("placesOpen"))$("placesTab")?.click();
    });
    const boards=make("button","","Boards & layers");
    boards.addEventListener("click",()=>{
      $("gmTabs")?.querySelector('[data-tab="boards"]')?.click();
      show("settings");
    });
    sceneActions.append(openPlaces,boards);
    scenes.append(sceneActions,make("p","r20-description","Scene library and map preparation are available to GMs only."));
    const stat=make("div","r20-description","");stat.id="r20SceneStatus";scenes.append(stat);
    const settings=$("r20Settings");
    settings.append(make("h3","","Tabletop settings"));
    settings.append(make("p","r20-description","Your existing GM tabs, scene editing tools, rules, and game controls are shown below."));
    const settingButtons=make("div","r20-actions");
    for(const [label,tab] of [["Minis","minis"],["Combat","combat"],["Terrain","terrain"],["Floors","floors"],["Boards","boards"]]){
      const b=make("button","",label);b.type="button";
      b.addEventListener("click",()=> $("gmTabs")?.querySelector('[data-tab="'+tab+'"]')?.click());
      settingButtons.append(b);
    }
    settings.append(settingButtons);
    function updateLink(){
      const room=$("roomCode")?.textContent?.trim();
      link.value=room&&room!=="------"?location.origin+location.pathname+"?room="+encodeURIComponent(room):"Room link appears after joining";
    }
    updateLink();
    const observer=new MutationObserver(updateLink);
    if($("roomCode"))observer.observe($("roomCode"),{childList:true,characterData:true,subtree:true});
    // Keep the familiar right sidebar in sync with its existing hide button.
    let selected="chat";
    try{const stored=localStorage.getItem("tabletop.roll20Tab");if(tabs.some(t=>t.id===stored))selected=stored;}catch{}
    show(selected,false);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

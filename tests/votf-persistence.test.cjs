// Regression checks for Voice of the Forest tabletop integrations.
// Run: node --test tests/votf-persistence.test.cjs
// No third-party dependencies, network, browser, or production storage needed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'tabletop.js'), 'utf8');

function extract(start, end) {
  const a = source.indexOf(start);
  assert.notEqual(a, -1, 'Expected source marker: ' + start);
  const b = source.indexOf(end, a + start.length);
  assert.notEqual(b, -1, 'Expected ending marker: ' + end);
  return source.slice(a, b);
}
const persistence = extract('function votfCaptureScene(board)', '// ---------- Voice of the Forest: GM-only named checkpoints');
const visibility = extract('function viewFor() {', '// layers: each board sits on one');
const layerVisibility = extract('const LAYER_GAP = 200;', '// a random floor\'s rooms and corridors stay dark to players');
const backupSerialization = extract('function votfBackupReplacer(key, value)', 'function votfDownloadBackup(record)');

function world() {
  const board = { id: 'scene-board', lib: 'library-1', x: 200, z: 0, cols: 20, rows: 20, grid: true, layer: 2 };
  const state = {
    boards: [{ id:'party-board', x:0, z:0, cols:20, rows:20, layer:1 }, board],
    boardLib: { 'library-1': { sceneId:'fissure-small-1', campaignId:'voice-of-the-forest', cols:20, rows:20, tiles:{}, figs:[] } },
    tiles: { '201,2':'wall', '205,8':'hiddenTrap', '3,4':'wall' },
    figures: {
      npc1: { id:'npc1', x:203, z:4, name:'Beedrill', st:{hp:4,hpMax:12}, owner:null, side:'enemy' },
      player1: { id:'player1', x:205, z:6, name:'Gemini', owner:'player-1', side:'player', st:{hp:8} },
      outside: { id:'outside', x:3, z:4, owner:null, name:'Other board figure' }
    },
    live:1, party:{}, players:{}, log:[], models:{}, maps:{}, combat:null, rules:{}, explored:0, dungeon:null, bag:{}
  };
  return {state,board};
}
function makeContext(state) {
  const context = {
    state,
    console,
    layerOf:b=>b.layer||1,
    votfSceneStatus:()=>{},
    handle:()=>{},
    boardAt:(x,z)=>state.boards.find(b=>x>=b.x && x<b.x+b.cols && z>=b.z && z<b.z+b.rows),
    sendAll:()=>{},
    document:{dispatchEvent:()=>{}},
    CustomEvent:class { constructor(type,opt){this.type=type;this.detail=opt.detail;} },
  };
  vm.createContext(context);
  vm.runInContext(persistence, context);
  return context;
}
test('captures edited terrain, hidden traps, and NPC HP, not player-owned minis', () => {
  const {state,board}=world();
  const c=makeContext(state);
  c.votfCaptureScene(board);
  const saved=state.boardLib['library-1'];
  assert.equal(saved.tiles['1,2'],'wall');
  assert.equal(saved.tiles['5,8'],'hiddenTrap');
  assert.equal(saved.tiles['3,4'],undefined);
  assert.equal(saved.figs.length,1);
  assert.equal(saved.figs[0].st.hp,4);
  assert.equal(saved.figs[0].dx,3);
  assert.equal(saved.figs[0].dz,4);
  // This is a snapshot, not a pointer to a live NPC's HP object.
  state.figures.npc1.st.hp=1;
  assert.equal(saved.figs[0].st.hp,4);
});
test('revisiting a scene after saving does not clone player-owned mini', () => {
  const {state,board}=world();
  const c=makeContext(state);
  c.votfCaptureScene(board);
  const snap=state.boardLib['library-1'];
  assert.equal(snap.figs.some(f=>f.owner), false);
  assert.equal(snap.figs.length,1);
  assert.equal(state.figures.player1.id,'player1');
});
test('cannot close a layer holding the party', () => {
  const {state,board}=world();
  const c=makeContext(state);
  state.live=2;
  assert.equal(c.votfCloseScene(board,false),false);
});
test('cannot close a scene containing a player-owned Pokemon', () => {
  const {state,board}=world();
  const c=makeContext(state);
  assert.equal(c.votfCloseScene(board,false),false);
});
test('can unload an inactive scene after the player leaves', () => {
  const {state,board}=world();
  state.figures.player1.x=5;
  const c=makeContext(state);
  let called=0;
  c.handle=msg=>{assert.equal(msg.t,'boardDel');assert.equal(msg.id,board.id);called++};
  assert.equal(c.votfCloseScene(board,false),true);
  assert.equal(called,1);
  assert.equal(state.boardLib['library-1'].figs.length,1);
});
test('players only receive the currently live layer, not GM saved board templates', () => {
  const {state}=world();
  state.figures.player1.x=5;
  const c=makeContext(state);
  const funcs=layerVisibility + visibility;
  const fakeWorld={...c,
    shown:null,
    figVisible:null,
    playerTile:(k,t)=>!k.startsWith('20')?t:null,
    combatView:()=>null,
    areasView:()=>({}),
    boardAt:c.boardAt,
    fogged:()=>false,
  };
  vm.createContext(fakeWorld);
  vm.runInContext(funcs.replace('function viewFor() {','function viewFor() {'),fakeWorld);
  fakeWorld.figVisible = f => !!fakeWorld.boardAt(f.x,f.z) && fakeWorld.boardAt(f.x,f.z).layer === state.live;
  const v=fakeWorld.viewFor();
  assert.equal(v.boards.length,1);
  assert.equal(v.boards[0].id,'party-board');
  assert.equal(Object.keys(v.boardLib).length,0);
  assert.equal(Object.keys(v.library).length,0);
  assert.equal(v.figures.npc1,undefined);
});
test('portable JSON backup preserves arbitrary model binary bytes', () => {
  const c={btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};
  vm.createContext(c);
  vm.runInContext(backupSerialization,c);
  const bytes=Uint8Array.from([0,255,1,2,128,64,127]);
  c.bytesForTest = [...bytes];
  const checkpoint=vm.runInContext("({format:'votf-tabletop-checkpoint',assets:[['model:shiny',new Uint8Array(bytesForTest).buffer]]})",c);
  const saved=JSON.stringify(checkpoint,c.votfBackupReplacer);
  const loaded=JSON.parse(saved,c.votfBackupReviver);
  assert.deepEqual([...new Uint8Array(loaded.assets[0][1])],[...bytes]);
});

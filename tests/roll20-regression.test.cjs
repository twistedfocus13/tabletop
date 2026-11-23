// Run: node --test tests/roll20-regression.test.cjs
// Isolated regression checks for Roll20-style chat commands and privacy.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','tabletop.js'),'utf8');
const shell=fs.readFileSync(path.join(__dirname,'..','roll20-shell.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function section(start,end) {
 const a=src.indexOf(start);assert.notEqual(a,-1,'missing '+start);
 const b=src.indexOf(end,a+start.length);assert.notEqual(b,-1,'missing '+end);
 return src.slice(a,b);
}
function chatHarness(){
 const events=[], input={value:''};
 const ctx={
  $:id=>id==='chatIn'?input:null,
  act:e=>events.push(e),status:()=>{},setTimeout:()=>0
 };
 vm.createContext(ctx);
 vm.runInContext(section('  const sendChat = () => {',"  $('chatSend').onclick = sendChat;")+'\nthis.sendChat=sendChat;',ctx);
 return {send:raw=>{input.value=raw;ctx.sendChat();return events.at(-1);},events,input};
}
test('all UI scripts are valid JavaScript',()=>{
 assert.doesNotThrow(()=>new Function(shell));
 assert.doesNotThrow(()=>new Function(src.replace(/^import .*?;$/gm,'')));
});
test('public chat and dice commands use existing actions',()=>{
 const h=chatHarness();
 assert.equal(h.send('Hello team').t,'chat');
 assert.deepEqual({...h.send('/roll 2d6')},{t:'roll',n:2,sides:6,hidden:false});
 assert.deepEqual({...h.send('/gmroll 1d20')},{t:'roll',n:1,sides:20,hidden:true});
 assert.deepEqual({...h.send('/gr 3d8')},{t:'roll',n:3,sides:8,hidden:true});
});
test('whispers are addressed, never broadcast chat',()=>{
 const h=chatHarness();
 assert.deepEqual({...h.send('/w gm secret')},{t:'chat',to:'gm',text:'secret'});
 assert.deepEqual({...h.send('/w "Pikachu Trainer" hello')},{t:'chat',to:'Pikachu Trainer',text:'hello'});
});
test('invalid commands do not trigger a send',()=>{
 const h=chatHarness();
 h.send('/unsupported');assert.equal(h.events.length,0);
});
test('private conversation history is returned only to its participants',()=>{
 const state={log:[
  {text:'public'},
  {text:'A to B',from:'a',to:'b'},
  {text:'C to GM',from:'c',to:'gm'},
  {text:'GM to A',from:'gm',to:'a'}
 ]};
 const ctx={state};
 vm.createContext(ctx);
 vm.runInContext(section('function logForViewer(cid) {','function viewFor(cid) {'),ctx);
 assert.deepEqual(ctx.logForViewer('a').map(x=>x.text),['public','A to B','GM to A']);
 assert.deepEqual(ctx.logForViewer('c').map(x=>x.text),['public','C to GM']);
 assert.deepEqual(ctx.logForViewer('b').map(x=>x.text),['public','A to B']);
 assert.match(src,/conn\.send\(\{ t: 'welcome', state: viewFor\(cid\) \}\)/);
});
test('right sidebar reuses the same live DOM elements, with no duplicate chat/dice list',()=>{
 assert.match(shell,/\$\("r20Chat"\)\.append\(logSec\)/);
 assert.match(shell,/\$\("r20Dice"\)\.append\(dice\)/);
 assert.match(shell,/\$\("r20Players"\)\.append\(players\)/);
 assert.match(html,/roll20-shell\.js\?v=1/);
 assert.match(html,/\.r20-roll-result/);
});

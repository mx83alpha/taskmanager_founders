import {JSDOM} from 'jsdom';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {SITE_ORIGIN} from '../src/config.js';
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'ui-test',modules:true,scriptPath:'dist/server/index.js',compatibilityDate:'2026-10-01',d1Databases:['DB']}]}));
let dom,fail=false,notes=0,dropResponse=false,dropCreateResponse=false,temporaryFailures=0;
const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,20))}throw Error('UI update timed out')};
class AudioContextMock{
  state='running';currentTime=0;destination={};
  resume(){this.state='running';return Promise.resolve()}
  suspend(){this.state='suspended';return Promise.resolve()}
  createOscillator(){return{frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},start(){notes++},stop(){}}}
  createGain(){return{gain:{setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}}
}
try{
  const db=await mf.getD1Database('DB');await db.exec((await readFile('drizzle/0000_funny_karnak.sql','utf8')).replace(/\n/g,' '));
  dom=new JSDOM(await readFile('public/index.html','utf8'),{url:SITE_ORIGIN,runScripts:'dangerously',beforeParse(window){window.AudioContext=AudioContextMock;window.matchMedia=()=>({matches:false});window.fetch=async(path,options={})=>{
    if(temporaryFailures&&options.method==='POST'&&String(path).endsWith('/status')){temporaryFailures--;return new Response('Gateway unavailable',{status:502})}
    if((dropResponse&&String(path).endsWith('/status'))||(dropCreateResponse&&path==='/api/quests'&&options.method==='POST')){dropResponse=false;dropCreateResponse=false;await mf.dispatchFetch('http://worker.internal'+path,{...options,headers:{...options.headers,Origin:SITE_ORIGIN}});return new Response('Lost response',{status:502})}
    if(fail&&options.method==='POST'&&String(path).endsWith('/status'))return new Response(JSON.stringify({error:'Storage unavailable'}),{status:503});
    return mf.dispatchFetch('http://worker.internal'+path,{...options,headers:{...options.headers,...(options.method?{Origin:SITE_ORIGIN,'Sec-Fetch-Site':'same-origin'}:{})}})
  }}});
  const w=dom.window,d=w.document;await wait(()=>d.querySelectorAll('.quest').length===6);
  assert.equal(d.querySelectorAll('.quest-icon').length,6);
  assert.equal(d.querySelector('[data-id="starter-0"] img').getAttribute('src'),'/assets/quest-idea.png');
  assert.equal(d.querySelector('[data-id="starter-2"] img').getAttribute('src'),'/assets/quest-research.png');
  fail=true;d.querySelector('[data-id="starter-0"] .check').click();await wait(()=>!d.getElementById('error').hidden);
  assert.equal(d.querySelectorAll('.quest').length,6);assert.equal(d.getElementById('reward').hidden,true);assert.equal(notes,0);assert.equal(d.getElementById('particles').childElementCount,0);
  fail=false;d.querySelector('[data-id="starter-0"] .check').click();await wait(()=>!d.getElementById('reward').hidden);
  assert.equal(d.getElementById('rewardxp').textContent,'+50 XP');assert.equal(d.getElementById('error').hidden,true);assert.equal(notes,4);assert.equal(d.getElementById('particles').childElementCount,28);
  assert.equal((await db.prepare('SELECT done_at FROM quests WHERE id=?').bind('starter-0').first()).done_at!==null,true);
  d.querySelector('[data-filter="done"]').click();const before=notes;await w.toggle('starter-0');assert.equal(notes,before);assert.equal((await db.prepare('SELECT done_at FROM quests WHERE id=?').bind('starter-0').first()).done_at,null);
  d.getElementById('soundtoggle').click();assert.equal(d.getElementById('soundtoggle').getAttribute('aria-pressed'),'false');
  await w.toggle('starter-0');assert.equal(notes,before);assert.equal(d.getElementById('rewardxp').textContent,'+50 XP');
  w.matchMedia=()=>({matches:true});d.getElementById('particles').replaceChildren();await w.toggle('starter-1');assert.equal(d.getElementById('particles').childElementCount,0);
  dropCreateResponse=true;const q=await w.createQuest({title:'Feedback zu meinem Produkt einholen',category:'Kunden gewinnen',xp:150,minutes:30});assert.ok(q.id);await w.toggle(q.id);assert.equal(d.getElementById('rewardlabel').textContent,'LEVEL UP!');assert.equal(d.getElementById('reward').classList.contains('level-reward'),true);
  await w.toggle('starter-2');await w.toggle('starter-2');dropResponse=true;await w.toggle('starter-2');assert.equal(d.getElementById('error').hidden,true);assert.equal((await db.prepare('SELECT done_at FROM quests WHERE id=?').bind('starter-2').first()).done_at!==null,true);temporaryFailures=1;await w.toggle('starter-3');assert.equal(d.getElementById('error').hidden,true);assert.equal(temporaryFailures,0);const rows=await db.prepare('SELECT * FROM quests WHERE title=?').bind('Feedback zu meinem Produkt einholen').all();assert.equal(rows.results.length,1);
  console.log('PASS: UI saving through public origin, no reward on failed save, persisted success, ching scheduling, particles, reopening, sound off, reduced motion, new quest, level-up, lost write response read-back, transient retry, no duplicate creation');
}finally{dom?.window.close();await mf.dispose()}

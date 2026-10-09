import html from '../public/index.html';
import city from '../public/assets/neon-city.webp';
import pixelFont from '../public/assets/pixel.woff2';
import ideaIcon from '../public/assets/quest-idea.png';
import chatIcon from '../public/assets/quest-chat.png';
import researchIcon from '../public/assets/quest-research.png';
import offerIcon from '../public/assets/quest-offer.png';
import buildIcon from '../public/assets/quest-build.png';
import feedbackIcon from '../public/assets/quest-feedback.png';
import { SITE_ORIGIN } from './config.js';
const icons={'/assets/quest-idea.png':ideaIcon,'/assets/quest-chat.png':chatIcon,'/assets/quest-research.png':researchIcon,'/assets/quest-offer.png':offerIcon,'/assets/quest-build.png':buildIcon,'/assets/quest-feedback.png':feedbackIcon};
const initial=[['Problem und Zielgruppe in einem Satz beschreiben','Idee prüfen',50,5],['Mit einer potenziellen Kundin oder einem Kunden sprechen','Idee prüfen',100,15],['Drei bestehende Lösungen und ihre Schwächen recherchieren','Idee prüfen',100,30],['Dein erstes Angebot in fünf Sätzen skizzieren','Angebot bauen',100,15],['Einen einfachen Prototyp oder ein Produktmuster bauen','Angebot bauen',150,60],['Eine Person um Feedback zu deinem Angebot bitten','Kunden gewinnen',100,15]];
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const asset=(bytes,type)=>new Response(bytes,{headers:{'Content-Type':type,'Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'}});
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(icons[url.pathname])return asset(icons[url.pathname],'image/png');
    if(url.pathname==='/assets/neon-city-v2.webp')return asset(city,'image/webp');
    if(url.pathname==='/assets/pixel.woff2')return asset(pixelFont,'font/woff2');
    if(!url.pathname.startsWith('/api/'))return new Response(html,{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
    try{
      if(!env.DB)throw Error('DB unavailable');
      if(request.method!=='GET'){
        // Sites forwards requests to an internal Worker URL. Browser Origin stays public.
        const origin=request.headers.get('Origin');
        if((origin&&![url.origin,SITE_ORIGIN].includes(origin))||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'Origin mismatch'},403);
        if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return json({error:'JSON required'},415);
      }
      if(url.pathname==='/api/quests'&&request.method==='GET'){
        await env.DB.batch(initial.map((q,i)=>env.DB.prepare('INSERT OR IGNORE INTO quests (id,title,category,xp,minutes) VALUES (?,?,?,?,?)').bind('starter-'+i,...q)));
        const r=await env.DB.prepare('SELECT * FROM quests ORDER BY rowid').all();return json(r.results);
      }
      let q;
      if(['POST','PATCH'].includes(request.method)){
        try{q=await request.json()}catch{return json({error:'Invalid JSON'},400)}
        if(!q||typeof q!=='object'||Array.isArray(q))return json({error:'Invalid request'},400);
      }
      if(url.pathname==='/api/quests'&&request.method==='POST'){
        if(typeof q.title!=='string'||!q.title.trim()||q.title.trim().length>180||!['Idee prüfen','Angebot bauen','Kunden gewinnen'].includes(q.category)||![50,100,150].includes(Number(q.xp))||![5,15,30,60].includes(Number(q.minutes)))return json({error:'Invalid quest'},400);
        if(q.id!==undefined&&(typeof q.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(q.id)))return json({error:'Invalid request id'},400);
        const v={id:q.id||crypto.randomUUID(),title:q.title.trim(),category:q.category,xp:Number(q.xp),minutes:Number(q.minutes),done_at:null};
        const inserted=await env.DB.prepare('INSERT OR IGNORE INTO quests (id,title,category,xp,minutes) VALUES (?,?,?,?,?)').bind(v.id,v.title,v.category,v.xp,v.minutes).run();
        const saved=await env.DB.prepare('SELECT * FROM quests WHERE id=?').bind(v.id).first();
        if(!saved||['title','category','xp','minutes'].some(key=>saved[key]!==v[key]))return json({error:'Request id conflict'},409);
        return json(saved,inserted.meta.changes?201:200);
      }
      const statusRoute=/^\/api\/quests\/([a-zA-Z0-9-]+)\/status$/.exec(url.pathname);
      const legacyRoute=/^\/api\/quests\/([a-zA-Z0-9-]+)$/.exec(url.pathname);
      if((statusRoute&&request.method==='POST')||(legacyRoute&&request.method==='PATCH')){
        const id=(statusRoute||legacyRoute)[1];if(typeof q.done!=='boolean')return json({error:'Invalid status'},400);
        const saved=await env.DB.prepare(q.done?'UPDATE quests SET done_at=COALESCE(done_at,?) WHERE id=? RETURNING *':'UPDATE quests SET done_at=NULL WHERE id=? RETURNING *').bind(...(q.done?[new Date().toISOString(),id]:[id])).first();
        return saved?json(saved):json({error:'Not found'},404);
      }
      return json({error:'Not found'},404);
    }catch(e){console.error('Quest API failed',e.message);return json({error:'Storage unavailable'},503)}
  }
};

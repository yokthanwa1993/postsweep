import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../launcher.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const calendar=readFileSync(new URL('../calendar.js',import.meta.url),'utf8');
const target=id=>'https://www.facebook.com/'+id+'/allactivity?activity_history=false&category_key=MANAGEPOSTSPHOTOSANDVIDEOS&manage_mode=false&should_load_landing_page=false';
const all={kind:'all'};
function harness({url='https://www.facebook.com/',actorId='456',status='complete',saved={},extraFacebook=false}={}){
 const tabs=new Map([[42,{id:42,url,status,windowId:1}]]);if(extraFacebook)tabs.set(88,{id:88,url:'https://www.facebook.com/',status:'complete',windowId:1});
 const identity={id:actorId,name:'เพจ '+actorId};
 const storage={...saved},prefs={},calls={updates:[],scripts:[],badges:[]},handlers={};
 const sandbox={URL,Number,Date,Set,isFacebookURL:value=>{try{return ['www.facebook.com','web.facebook.com','facebook.com'].includes(new URL(value).hostname)}catch{return false}},facebookRequest:function facebookRequest(){},startCleaner:function startCleaner(){}};
 sandbox.chrome={runtime:{id:'test',getURL:file=>'chrome-extension://test/'+file,onMessage:{addListener:f=>{handlers.message=f}}},
  storage:{session:{get:async k=>({[k]:storage[k]}),set:async obj=>Object.assign(storage,obj),remove:async k=>{delete storage[k]}},local:{set:async obj=>Object.assign(prefs,obj)}},
  action:{onClicked:{addListener:f=>{handlers.click=f}},setBadgeText:async v=>calls.badges.push(v),setBadgeBackgroundColor:async()=>{},setTitle:async()=>{}},
  tabs:{query:async q=>q.active?[{...tabs.get(42)}]:[...tabs.values()].filter(tab=>tab.url.startsWith('https://www.facebook.com/')),get:async id=>({...tabs.get(id)}),update:async(id,props)=>{calls.updates.push({id,...props});Object.assign(tabs.get(id),props,{status:'loading'});return {...tabs.get(id)}},onUpdated:{addListener:f=>{handlers.updated=f}},onRemoved:{addListener:f=>{handlers.removed=f}}},
  scripting:{executeScript:async options=>{calls.scripts.push(options);return options.args?.[0]?.kind==='identify'?[{frameId:0,result:{ok:true,actor:{...identity}}}]:[]}}
 };
 const context=vm.createContext(sandbox);vm.runInContext(calendar,context);vm.runInContext(code,context);
 const message=(kind,period=all,expectedActorId=actorId,sender={id:'test',url:'chrome-extension://test/popup.html'})=>new Promise(resolve=>handlers.message({channel:'postsweep-ui-v1',kind,period,expectedActorId},sender,resolve));
 return {calls,storage,prefs,tabs,identity,handlers,message,jobs:()=>calls.scripts.filter(x=>x.func?.name==='startCleaner'),complete:async(url=target(actorId))=>{Object.assign(tabs.get(42),{url,status:'complete'});await handlers.updated(42,{status:'complete'})},remove:()=>handlers.removed(42)};
}
test('toolbar opens a picker; preview only identifies the current profile',async()=>{
 const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));assert.equal(manifest.action.default_popup,'popup.html');
 const h=harness();assert.equal(h.handlers.click,undefined);assert.equal((await h.message('preview')).actor.id,'456');assert.equal(h.calls.updates.length,0);assert.equal(h.jobs().length,0);
});
test('Start navigates to the selected active Page and starts only once after loading',async()=>{
 const h=harness();assert.equal((await h.message('start')).ok,true);assert.equal(h.calls.updates[0].url,target('456'));assert.equal(h.jobs().length,0);
 await h.complete();assert.equal(h.jobs().length,1);assert.equal(h.jobs()[0].args[0].actorId,'456');assert.equal(h.jobs()[0].args[0].period.kind,'all');
 await h.complete();assert.equal(h.jobs().length,1);assert.equal(Object.keys(h.storage).length,0);
});
test('every current profile gets its own target rather than the original fixed account',async()=>{
 for(const actorId of ['123','78901234','100099999999999']){const h=harness({actorId,url:target('456')});await h.message('start');assert.equal(h.calls.updates[0].url,target(actorId));}
});
test('existing current-profile activity page starts without refreshing',async()=>{const h=harness({url:target('456')});await h.message('start');assert.equal(h.calls.updates.length,0);assert.equal(h.jobs().length,1)});
test('start from another site reads an existing Facebook tab before navigating the active tab',async()=>{
 const h=harness({url:'https://example.org/',extraFacebook:true});await h.message('start');assert.equal(h.calls.scripts[0].target.tabId,88);assert.equal(h.calls.updates[0].id,42);assert.equal(h.calls.updates[0].url,target('456'));
 const unavailable=harness({url:'https://example.org/'});assert.equal((await unavailable.message('start')).ok,false);assert.equal(unavailable.calls.updates.length,0);
});
test('profile switch between preview and Start is blocked before navigation',async()=>{
 const h=harness();await h.message('preview');h.identity.id='999';const r=await h.message('start');assert.equal(r.ok,false);assert.equal(h.calls.updates.length,0);assert.equal(h.jobs().length,0);
});
test('untrusted sender and invalid scope cannot start a job',async()=>{
 const h=harness();assert.equal((await h.message('start',all,'456',{id:'test',url:'https://www.facebook.com/'})).ok,false);assert.equal(h.calls.scripts.length,0);
 assert.equal((await h.message('start',{kind:'range',start:'2026-09-12',end:'2026-09-01'})).ok,false);assert.equal(h.calls.updates.length,0);
});
test('rapid repeated Start creates one pending navigation and one job',async()=>{
 const h=harness();await Promise.all([h.message('start'),h.message('start')]);await h.message('start');assert.equal(h.calls.updates.length,1);await h.complete();assert.equal(h.jobs().length,1);
});
test('ordinary page loads never start work, and login redirect cancels the intent',async()=>{
 const h=harness();await h.complete();assert.equal(h.jobs().length,0);h.tabs.get(42).url='https://www.facebook.com/';await h.message('start');await h.complete('https://www.facebook.com/login/');assert.equal(h.jobs().length,0);assert.equal(Object.keys(h.storage).length,0);
});
test('pending scope and identity survive worker restart; expired, legacy and closed intents do not run',async()=>{
 const period={kind:'range',start:'2026-08-31',end:'2026-09-12'};
 const valid=harness({saved:{'cleanerPendingStart:42':{createdAt:Date.now(),period,actorId:'456'}}});await valid.complete();assert.equal(valid.jobs().length,1);assert.equal(valid.jobs()[0].args[0].period.end,period.end);
 for(const intent of [{createdAt:Date.now()-61000,period,actorId:'456'},{createdAt:Date.now()}]){const h=harness({saved:{'cleanerPendingStart:42':intent}});await h.complete();assert.equal(h.jobs().length,0);assert.equal(Object.keys(h.storage).length,0);}
 const closed=harness();await closed.message('start');await closed.remove();assert.equal(Object.keys(closed.storage).length,0);
});

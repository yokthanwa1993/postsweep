import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../launcher.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
const target='https://www.facebook.com/100050886815386/allactivity?activity_history=false&category_key=MANAGEPOSTSPHOTOSANDVIDEOS&manage_mode=false&should_load_landing_page=false';
function harness({url='https://example.org/',status='complete',saved={}}={}){
 const tabs=new Map([[42,{id:42,url,status}]]);const storage={...saved};const calls={updates:[],injections:[],badges:[]};const handlers={};
 const sandbox={URL,Number,Date,Set,isFacebookURL:()=>true,facebookRequest:function facebookRequest(){},startCleaner:function startCleaner(){}};
 sandbox.chrome={runtime:{id:'test',onMessage:{addListener:f=>{handlers.message=f}}},
  storage:{session:{get:async k=>({[k]:storage[k]}),set:async obj=>Object.assign(storage,obj),remove:async k=>{delete storage[k]}}},
  action:{onClicked:{addListener:f=>{handlers.click=f}},setBadgeText:async v=>calls.badges.push(v),setBadgeBackgroundColor:async()=>{},setTitle:async()=>{}},
  tabs:{get:async id=>({...tabs.get(id)}),update:async(id,props)=>{calls.updates.push({id,...props});Object.assign(tabs.get(id),props,{status:'loading'});return {...tabs.get(id)}},onUpdated:{addListener:f=>{handlers.updated=f}},onRemoved:{addListener:f=>{handlers.removed=f}}},
  scripting:{executeScript:async options=>{calls.injections.push(options);return []}}
 };
 vm.runInNewContext(code,sandbox);
 return {calls,storage,tabs,click:()=>handlers.click({...tabs.get(42)}),complete:async(url=target)=>{Object.assign(tabs.get(42),{url,status:'complete'});await handlers.updated(42,{status:'complete'})},remove:()=>handlers.removed(42)};
}
test('toolbar click from another site navigates to exact requested account, then starts once',async()=>{
 const h=harness();await h.click();assert.equal(h.calls.updates[0].url,target);assert.equal(h.calls.injections.length,0);
 await h.complete();assert.equal(h.calls.injections.length,1);assert.equal(h.calls.injections[0].func.name,'startCleaner');assert.equal(h.calls.injections[0].target.tabId,42);
 await h.complete();assert.equal(h.calls.injections.length,1);assert.equal(Object.keys(h.storage).length,0);
});
test('already-open target starts without refreshing or losing a running job',async()=>{const h=harness({url:target});await h.click();assert.equal(h.calls.updates.length,0);assert.equal(h.calls.injections.length,1)});
test('rapid double click during navigation has one navigation and one start',async()=>{const h=harness();await Promise.all([h.click(),h.click()]);await h.click();assert.equal(h.calls.updates.length,1);await h.complete();assert.equal(h.calls.injections.length,1)});
test('ordinary page load without toolbar click never starts deletion',async()=>{const h=harness();await h.complete();assert.equal(h.calls.injections.length,0)});
test('another Facebook account log is replaced by the exact requested target',async()=>{const h=harness({url:target.replace('100050886815386','999')});await h.click();assert.equal(h.calls.updates[0].url,target);assert.equal(h.calls.injections.length,0)});
test('pending click survives worker restart but expires after a minute',async()=>{
 const valid=harness({saved:{'cleanerPendingStart:42':{createdAt:Date.now()}}});await valid.complete();assert.equal(valid.calls.injections.length,1);
 const expired=harness({saved:{'cleanerPendingStart:42':{createdAt:Date.now()-61000}}});await expired.complete();assert.equal(expired.calls.injections.length,0);assert.equal(Object.keys(expired.storage).length,0);
});
test('login redirect and closed tabs cancel auto-start intent',async()=>{
 const h=harness();await h.click();await h.complete('https://www.facebook.com/login/');assert.equal(h.calls.injections.length,0);assert.equal(Object.keys(h.storage).length,0);assert(h.calls.badges.some(b=>b.text==='!'));
 const closed=harness();await closed.click();await closed.remove();assert.equal(Object.keys(closed.storage).length,0);
});

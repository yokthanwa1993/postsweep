import { isFacebookURL } from './model.js';
import { facebookRequest } from './facebook.js';
import { startCleaner } from './controller.js';
import './calendar.js';

const PENDING_PREFIX = 'cleanerPendingStart:';
const MAX_PENDING_MS = 60_000;
// A cached worker must not accept Start from a different popup protocol.
const UI_PROTOCOL = 2;
const starting = new Set(), clicking = new Set();
const pendingKey = tabId => PENDING_PREFIX + tabId;
const activityURL = actorId => {
  if (!/^\d+$/.test(actorId)) throw new Error('INVALID_ACTOR');
  return 'https://www.facebook.com/' + actorId + '/allactivity?activity_history=false&category_key=MANAGEPOSTSPHOTOSANDVIDEOS&manage_mode=false&should_load_landing_page=false';
};
const isTargetPage = (value, actorId) => {
  try {
    const url = new URL(value), target = new URL(activityURL(actorId));
    return url.origin === target.origin && url.pathname.replace(/\/$/, '') === target.pathname &&
      [...target.searchParams].every(([key, value]) => url.searchParams.get(key) === value);
  } catch { return false; }
};
const showProblem = async tabId => {
  try {
    await chrome.action.setBadgeText({ tabId, text: '!' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#e53645' });
    await chrome.action.setTitle({ tabId, title: 'ตรวจโปรไฟล์ Facebook แล้วเปิดส่วนขยายเพื่อเริ่มใหม่' });
  } catch { /* The tab may have been closed. */ }
};
const identify = async tabId => {
  const results = await chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:facebookRequest,args:[{kind:'identify'}]});
  const result = results.find(result => result.frameId === 0)?.result;
  if (!result?.ok || !/^\d+$/.test(result.actor?.id || '')) throw new Error(result?.message || 'อ่านโปรไฟล์ไม่ได้ ลองรีเฟรช Facebook ก่อน');
  return result.actor;
};
const resolveActor = async () => {
  const [activeTab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (!activeTab) throw new Error('ไม่พบแท็บที่เปิดอยู่');
  let source = activeTab;
  if (!isFacebookURL(source.url)) {
    const facebookTabs = await chrome.tabs.query({url:'https://www.facebook.com/*'});
    source = facebookTabs.sort((a,b) => (Number(b.windowId === activeTab.windowId)-Number(a.windowId === activeTab.windowId)) || (b.lastAccessed || 0)-(a.lastAccessed || 0))[0];
  }
  if (!source) throw new Error('เปิด Facebook แล้วสลับเป็นเพจหรือโปรไฟล์ที่ต้องการก่อน');
  return {actor:await identify(source.id),activeTab};
};
const inject = async (tabId, period, actorId) => {
  await chrome.scripting.executeScript({target:{tabId},files:['calendar.js']});
  await chrome.scripting.executeScript({target:{tabId},func:startCleaner,args:[{period,actorId}]});
  await chrome.action.setBadgeText({tabId,text:''});
  await chrome.action.setTitle({tabId,title:'เลือกช่วงเวลาแล้วเริ่มลบโพสต์'});
};
// Only an explicit Start from the popup creates this short-lived intent.
const startAfterNavigation = async tabId => {
  if (starting.has(tabId)) return;
  starting.add(tabId);
  const key = pendingKey(tabId);
  try {
    const saved = await chrome.storage.session.get(key), intent = saved[key];
    if (!intent) return;
    if (!Number.isFinite(intent.createdAt) || Date.now()-intent.createdAt > MAX_PENDING_MS) {
      await chrome.storage.session.remove(key); return;
    }
    const tab = await chrome.tabs.get(tabId);
    if (tab.status !== 'complete') return;
    await chrome.storage.session.remove(key);
    if (!intent.period || !isTargetPage(tab.url,intent.actorId)) { await showProblem(tabId); return; }
    await inject(tabId,globalThis.mountPostSweepCalendar.normalize(intent.period),intent.actorId);
  } catch {
    await chrome.storage.session.remove(key).catch(()=>{});
    await showProblem(tabId);
  } finally { starting.delete(tabId); }
};
const startInTab = async (tab, period, actorId) => {
  if (!Number.isInteger(tab?.id) || clicking.has(tab.id)) return {ok:false,message:'กำลังเตรียมงานในแท็บนี้ กรุณารอสักครู่'};
  clicking.add(tab.id);
  const key = pendingKey(tab.id);
  try {
    if (isTargetPage(tab.url,actorId) && tab.status === 'complete') {
      await chrome.storage.session.remove(key);
      await inject(tab.id,period,actorId);
      return {ok:true};
    }
    const saved = await chrome.storage.session.get(key);
    if (!saved[key] || Date.now()-saved[key].createdAt > MAX_PENDING_MS) {
      await chrome.storage.session.set({[key]:{createdAt:Date.now(),period,actorId}});
      await chrome.tabs.update(tab.id,{url:activityURL(actorId),active:true});
    }
    await startAfterNavigation(tab.id);
    return {ok:true};
  } catch {
    await chrome.storage.session.remove(key).catch(()=>{});
    await showProblem(tab.id);
    return {ok:false,message:'เปิดบันทึกกิจกรรมไม่สำเร็จ ตรวจแท็บ Facebook แล้วลองอีกครั้ง'};
  } finally { clicking.delete(tab.id); }
};
chrome.tabs.onUpdated.addListener((tabId,changeInfo)=>{
  if (changeInfo.status === 'complete') return startAfterNavigation(tabId);
});
chrome.tabs.onRemoved.addListener(tabId=>chrome.storage.session.remove(pendingKey(tabId)).catch(()=>{}));

chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if (message?.channel === 'postsweep-ui-v1') {
    if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html') || !['preview','start'].includes(message.kind)) {
      reply({ok:false,code:'INVALID_UI_SOURCE',message:'เริ่มงานจากปุ่มในส่วนขยายเท่านั้น'}); return;
    }
    if (message.protocol !== UI_PROTOCOL) {
      reply({ok:false,code:'UPDATE_REQUIRED',message:'โหลดส่วนขยายใหม่เพื่อใช้รุ่นล่าสุด'}); return;
    }
    void (async()=>{
      try {
        const {actor,activeTab} = await resolveActor();
        if (message.kind === 'preview') {reply({ok:true,protocol:UI_PROTOCOL,actor});return;}
        if (message.expectedActorId !== actor.id) throw new Error('เพจหรือโปรไฟล์เปลี่ยนไปแล้ว ปิดแล้วเปิดส่วนขยายใหม่เพื่อตรวจชื่อก่อนเริ่ม');
        if (!message.period) throw new Error('เลือกช่วงเวลาก่อนเริ่มลบ');
        const period = globalThis.mountPostSweepCalendar.normalize(message.period);
        await chrome.storage.local.set({cleanerPeriod:period});
        reply(await startInTab(activeTab,period,actor.id));
      } catch (error) {reply({ok:false,message:error.message || 'ยังไม่ได้เริ่มลบ ตรวจโปรไฟล์และช่วงเวลาอีกครั้ง'});}
    })();
    return true;
  }
  if (message?.channel !== 'facebook-cleaner-v1') return;
  if (sender.id !== chrome.runtime.id || !Number.isInteger(sender.tab?.id) || sender.frameId !== 0 || !isFacebookURL(sender.url)) {
    reply({ok:false,code:'INVALID_SOURCE',message:'ต้องเปิดส่วนขยายจากแท็บ Facebook เท่านั้น'}); return;
  }
  chrome.scripting.executeScript({
    target:{tabId:sender.tab.id},world:'MAIN',func:facebookRequest,args:[message.request]
  }).then(results=>{
    const result=results.find(result=>result.frameId===0)?.result;
    reply(result || {ok:false,message:'แท็บ Facebook เปลี่ยนไป กรุณาตรวจสถานะบน Facebook',uncertain:message.request?.kind==='trash'});
  }).catch(()=>reply({ok:false,code:'TAB_CHANGED',message:'การเชื่อมต่อกับแท็บ Facebook ขาดหาย กรุณาตรวจถังขยะก่อนเริ่มใหม่',uncertain:message.request?.kind==='trash'}));
  return true;
});

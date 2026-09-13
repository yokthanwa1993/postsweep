import { isFacebookURL } from './model.js';
import { facebookRequest } from './facebook.js';
import { startCleaner } from './controller.js';

const TARGET_URL = 'https://www.facebook.com/100050886815386/allactivity?activity_history=false&category_key=MANAGEPOSTSPHOTOSANDVIDEOS&manage_mode=false&should_load_landing_page=false';
const PENDING_PREFIX = 'cleanerPendingStart:';
const MAX_PENDING_MS = 60_000;
const starting = new Set();
const clicking = new Set();
const target = new URL(TARGET_URL);
const isTargetPage = value => {
  try {
    const url = new URL(value);
    return url.origin === target.origin && url.pathname.replace(/\/$/, '') === target.pathname &&
      [...target.searchParams].every(([key, value]) => url.searchParams.get(key) === value);
  } catch { return false; }
};
const pendingKey = tabId => PENDING_PREFIX + tabId;
const showProblem = async tabId => {
  try {
    await chrome.action.setBadgeText({ tabId, text: '!' });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#e53645' });
    await chrome.action.setTitle({ tabId, title: 'เปิดหน้าไม่สำเร็จ ตรวจการเข้าสู่ระบบ Facebook แล้วกดไอคอนอีกครั้ง' });
  } catch { /* The user may have closed the tab. */ }
};
const inject = async tabId => {
  await chrome.scripting.executeScript({ target: { tabId }, func: startCleaner });
  await chrome.action.setBadgeText({ tabId, text: '' });
  await chrome.action.setTitle({ tabId, title: 'เปิดบันทึกกิจกรรมและเริ่มลบโพสต์ทั้งหมดทันที' });
};
// A short-lived start intent survives a service-worker sleep during navigation.
// Merely visiting or refreshing Facebook never creates a start intent.
const startAfterNavigation = async tabId => {
  if (starting.has(tabId)) return;
  starting.add(tabId);
  const key = pendingKey(tabId);
  try {
    const saved = await chrome.storage.session.get(key);
    const intent = saved[key];
    if (!intent) return;
    if (!Number.isFinite(intent.createdAt) || Date.now() - intent.createdAt > MAX_PENDING_MS) {
      await chrome.storage.session.remove(key);
      return;
    }
    const tab = await chrome.tabs.get(tabId);
    if (tab.status !== 'complete') return;
    // Claim the intent once, and never follow a login or unrelated redirect into deletion.
    await chrome.storage.session.remove(key);
    if (!isTargetPage(tab.url)) { await showProblem(tabId); return; }
    await inject(tabId);
  } catch {
    await chrome.storage.session.remove(key).catch(() => {});
    await showProblem(tabId);
  } finally { starting.delete(tabId); }
};

chrome.action.onClicked.addListener(async tab => {
  if (!Number.isInteger(tab.id) || clicking.has(tab.id)) return;
  clicking.add(tab.id);
  const key = pendingKey(tab.id);
  try {
    if (isTargetPage(tab.url) && tab.status === 'complete') {
      await chrome.storage.session.remove(key);
      await inject(tab.id);
      return;
    }
    const saved = await chrome.storage.session.get(key);
    if (!saved[key] || Date.now() - saved[key].createdAt > MAX_PENDING_MS) {
      await chrome.storage.session.set({ [key]: { createdAt: Date.now() } });
      await chrome.tabs.update(tab.id, { url: TARGET_URL, active: true });
    }
    await startAfterNavigation(tab.id);
  } catch {
    await chrome.storage.session.remove(key).catch(() => {});
    await showProblem(tab.id);
  } finally { clicking.delete(tab.id); }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') return startAfterNavigation(tabId);
});
chrome.tabs.onRemoved.addListener(tabId => {
  return chrome.storage.session.remove(pendingKey(tabId)).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.channel !== 'facebook-cleaner-v1') return;
  if (sender.id !== chrome.runtime.id || !Number.isInteger(sender.tab?.id) || sender.frameId !== 0 || !isFacebookURL(sender.url)) {
    reply({ ok: false, code: 'INVALID_SOURCE', message: 'ต้องเปิดส่วนขยายจากแท็บ Facebook เท่านั้น' });
    return;
  }
  chrome.scripting.executeScript({
    target: { tabId: sender.tab.id }, world: 'MAIN', func: facebookRequest, args: [message.request]
  }).then(results => {
    const result = results.find(result => result.frameId === 0)?.result;
    reply(result || { ok: false, message: 'แท็บ Facebook เปลี่ยนไป กรุณาตรวจสถานะบน Facebook', uncertain: message.request?.kind === 'trash' });
  }).catch(() => reply({ ok: false, code: 'TAB_CHANGED', message: 'การเชื่อมต่อกับแท็บ Facebook ขาดหาย กรุณาตรวจถังขยะก่อนเริ่มใหม่', uncertain: message.request?.kind === 'trash' }));
  return true;
});

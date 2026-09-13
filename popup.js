const $ = id => document.getElementById(id);
const tools = globalThis.mountPostSweepCalendar;
const settings = document.body.dataset.page === 'settings';
let selected = null, busy = false, actor = null, needsSelection = false;
const update = value => {
  selected = value;
  $('start').disabled = busy || !value || needsSelection || (!settings && !actor);
  $('start').textContent = settings ? 'บันทึกช่วงเวลา' : value?.kind === 'all' ? 'เริ่มลบทั้งหมด' : value?.kind === 'month' ? 'เริ่มลบเดือนนี้' : value?.kind === 'day' ? 'เริ่มลบวันที่เลือก' : 'เริ่มลบช่วงนี้';
  $('selection').textContent = !value ? 'เลือกวันเริ่มต้น แล้วเลือกวันสิ้นสุด' : value.kind === 'range' ? `ช่วงวันที่เลือก · ${(tools.range(value).end-tools.range(value).start)/86400} วัน` : tools.label(value);
  $('feedback').dataset.error = 'false';
  $('feedback').textContent = settings ? 'ใช้เป็นค่าเริ่มต้นในกล่องก่อนเริ่มงานครั้งถัดไป' : value?.kind === 'range' ? 'รวมโพสต์ทั้งวันเริ่มต้นและวันสิ้นสุด' : 'เปิดบันทึกกิจกรรมแล้วเริ่มย้ายโพสต์ไปถังขยะ';
};
const profile = document.createElement('p'); profile.id = 'profile'; profile.className = 'profile';
profile.textContent = settings ? 'ตั้งค่าช่วงเวลาสำหรับครั้งถัดไป' : 'กำลังตรวจเพจหรือโปรไฟล์ที่ใช้อยู่…';
$('picker').before(profile);
const calendar = tools($('calendar'), {value:{kind:'all'},onChange:value=>{needsSelection=false;update(value)}});
const fit = () => {
  const surface = $('surface');
  const naturalHeight = surface.offsetHeight;
  const available = settings ? window.innerHeight - 24 : Math.max(260, Math.min(580, window.screen.availHeight - 100));
  const scale = Math.min(1, available / naturalHeight);
  surface.style.zoom = String(scale);
  if (!settings) {
    document.body.style.height = `${Math.ceil(naturalHeight*scale)}px`;
    document.body.style.width = `${Math.ceil(380*scale)}px`;
    surface.style.width = '380px';
  }
};
new ResizeObserver(fit).observe($('surface'));
window.addEventListener('resize',fit);
$('start').onclick = async () => {
  if (busy || !selected || needsSelection || (!settings && !actor)) return;
  const period = tools.normalize(selected);
  busy = true; $('picker').disabled = true; $('start').disabled = true;
  try {
    if (settings) {
      await chrome.storage.local.set({cleanerPeriod:period});
      $('feedback').textContent = 'บันทึกแล้ว · กดไอคอนเพื่อตรวจช่วงเวลาและเริ่มลบ';
    } else {
      $('feedback').textContent = 'กำลังเปิดบันทึกกิจกรรม…';
      const response = await chrome.runtime.sendMessage({channel:'postsweep-ui-v1',kind:'start',period,expectedActorId:actor.id});
      if (!response?.ok) throw new Error(response?.message || 'เริ่มงานไม่สำเร็จ ลองอีกครั้ง');
      window.close();
    }
  } catch (error) {
    $('feedback').textContent = error.message || 'บันทึกไม่ได้ ลองอีกครั้ง'; $('feedback').dataset.error = 'true';
  } finally { busy = false; $('picker').disabled = false; $('start').disabled = !selected || needsSelection || (!settings && !actor); }
};
void (async () => {
  try {
    const saved = await chrome.storage.local.get('cleanerPeriod');
    calendar.setValue(tools.normalize(saved.cleanerPeriod)); update(calendar.getValue());
  } catch {
    calendar.setValue({kind:'month',...tools.today()}); update(calendar.getValue());
    needsSelection = true;
    $('feedback').textContent = 'อ่านค่าเดิมไม่ได้ เลือกช่วงเวลาใหม่ก่อนเริ่มลบ'; $('feedback').dataset.error = 'true'; $('start').disabled = true;
  }
  if (!settings) {
    try {
      const response = await chrome.runtime.sendMessage({channel:'postsweep-ui-v1',kind:'preview'});
      if (!response?.ok) throw new Error(response?.message || 'อ่านโปรไฟล์ไม่ได้ เปิด Facebook ก่อน');
      actor = response.actor;
      profile.textContent = 'โปรไฟล์ที่ใช้ · ' + actor.name;
      profile.title = actor.name;
      $('start').disabled = !selected || needsSelection;
    } catch (error) {
      profile.textContent = 'ยังไม่พร้อมเริ่มงาน';
      $('feedback').textContent = error.message; $('feedback').dataset.error = 'true';
    }
  }
  $('picker').disabled = false; fit();
})();

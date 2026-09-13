// Injected into the extension's isolated world after Start in the toolbar popup.
export function startCleaner(options = {}) {
  const KEY = '__facebookCleanerRunV1';
  const existing = globalThis[KEY];
  if (existing?.running || existing?.editing) { existing.show(); return; }
  existing?.remove();
  const previousFocus = document.activeElement;
  const state = { running: true, stop: false, removed: 0, failed: false, uncertain: 0, active: 0, startedAt: Date.now(), phase: 'connecting', speedLevel: 5, speedChanged: false, period: { kind: 'all' }, editing: false, lastRemovedAt: null, oldestRemovedAt: null, scannedAt: null };
  // Keep the popup's selected profile even when the first connection fails.
  // The period editor must not retry without that identity check.
  state.actorId = options.actorId;
  globalThis[KEY] = state;
  const host = document.createElement('div');
  host.id = 'facebook-cleaner-panel';
  host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;pointer-events:none!important;';
  document.documentElement.append(host);
  const root = host.attachShadow({ mode: 'open' });
  const icon = (path, className = '') => `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const closeIcon = icon('<path d="m6 6 12 12M6 18 18 6"/>');
  const minimizeIcon = icon('<path d="M5 12h14"/>');
  const stopIcon = icon('<rect x="6" y="6" width="12" height="12" rx="2.5"/>');
  const trashIcon = icon('<path d="M3 6h18M9 6V3h6v3M5 6l1 14h12l1-14M10 10v6m4-6v6"/>');
  const gaugeIcon = icon('<path d="M4.9 19a9 9 0 1 1 14.2 0M12 4v2M5.6 7.6 7 9m11.4-1.4L17 9M3 13h2m14 0h2M12 14l4-4"/><circle cx="12" cy="14" r="2"/>');
  const calendarIcon = icon('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>');
  root.innerHTML = `
    <style>
      :host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}button,input,a{-webkit-tap-highlight-color:transparent}button,input{font:inherit}button{cursor:pointer}button:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #0866ff;outline-offset:3px}svg{width:20px;height:20px;flex-shrink:0}
      .overlay{--ink:#1c1e21;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:16px;background:#1c1e2159;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Thonburi,Tahoma,sans-serif;color:var(--ink);overflow:hidden}
      .panel{width:min(720px,100%);flex-shrink:0;background:#fff;border:1px solid #fff;border-radius:20px;box-shadow:0 18px 64px #0003;outline:none;overflow:hidden;transform:scale(var(--panel-scale,1));transform-origin:center}.top{display:flex;align-items:center;gap:10px;padding:14px 22px;border-bottom:1px solid #edf0f5}.brand-mark{width:36px;height:36px;display:grid;place-items:center;flex-shrink:0;background:#e53645;color:#fff;border-radius:11px}.brand-mark svg{width:21px;height:21px}.brand{font-size:15px;font-weight:700;line-height:1.3}.brand-caption{display:block;font-size:10px;color:#8a8d91;font-weight:400;margin-top:2px}.top-actions{margin-left:auto;display:flex;gap:7px}.icon-button{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:50%;color:#65676b;background:#f0f2f5;padding:8px}.icon-button svg{width:16px;height:16px}.body{padding:17px 22px 15px}
      .context-row{display:flex;justify-content:space-between;align-items:center;gap:12px}.mode{display:flex;align-items:center;gap:6px;padding:4px 9px;border-radius:6px;background:#eaf2ff;color:#0866ff;font-size:10px;font-weight:600}.dot{width:6px;height:6px;background:currentColor;border-radius:50%}.account{display:flex;align-items:center;gap:5px;color:#65676b;font-size:11px;min-width:0}.account svg{width:14px;height:14px}.account span{max-width:200px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
      .summary-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:22px;margin:14px 0}.hero{display:flex;align-items:center;gap:14px}.hero-copy{flex:1;min-width:0}.headline{font-size:23px;line-height:1.3;letter-spacing:-.5px;margin:0 0 4px}.subhead{font-size:11px;color:#8a8d91;margin:0;line-height:1.5}.counter{display:flex;align-items:baseline;gap:8px;margin-top:9px}.count{font-size:56px;color:#0866ff;line-height:1;font-weight:700;letter-spacing:-2px;font-variant-numeric:tabular-nums}.unit{font-size:12px;color:#65676b}.count-label{font-size:10px;color:#8a8d91;margin:5px 0 0}.visual{width:51px;height:51px;flex-shrink:0;display:grid;place-items:center;border:2px solid #dceaff;border-radius:50%;background:#f0f6ff;color:#0866ff}.hero-icon,.state-icon{width:24px;height:24px}.state-icon{display:none}.overlay[data-phase="working"] .visual{animation:pulse 2s ease-in-out infinite}.overlay[data-phase="complete"] .hero-icon,.overlay[data-phase="error"] .hero-icon,.overlay[data-phase="stopped"] .hero-icon,.overlay[data-phase="stopping"] .hero-icon{display:none}.overlay[data-phase="complete"] .check-icon,.overlay[data-phase="error"] .error-icon,.overlay[data-phase="stopped"] .pause-icon,.overlay[data-phase="stopping"] .pause-icon{display:block}.overlay[data-phase="error"] .mode{background:#fff0f2;color:#d83245}.overlay[data-phase="stopped"] .mode,.overlay[data-phase="stopping"] .mode{background:#f0f2f5;color:#65676b}
      .speed-card{padding:13px 14px;background:#f7f9fc;border:1px solid #edf0f5;border-radius:12px;align-self:center}.speed-top{display:flex;align-items:center;gap:7px}.speed-top svg{width:16px;height:16px;color:#65676b}.speed-top label{font-size:11px;font-weight:650}.speed-value{display:flex;align-items:center;gap:5px;margin-left:auto;color:#0866ff;font-size:10px;font-weight:600}.speed-level{background:#eaf2ff;padding:2px 5px;border-radius:4px;font-size:9px}.speed-slider{display:block;width:100%;height:26px;margin:8px 0 0;padding:0;appearance:none;-webkit-appearance:none;cursor:pointer;background:transparent;accent-color:#0866ff;--fill:100%}.speed-slider::-webkit-slider-runnable-track{height:5px;border-radius:8px;background:linear-gradient(to right,#0866ff 0%,#0866ff var(--fill),#e0e5ed var(--fill),#e0e5ed 100%)}.speed-slider::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:18px;height:18px;background:#fff;border:4px solid #0866ff;border-radius:50%;margin-top:-6.5px;box-shadow:0 1px 4px #0866ff33}.speed-labels{display:flex;justify-content:space-between;color:#8a8d91;font-size:9px}.speed-note{font-size:10px;line-height:1.5;color:#65676b;margin:8px 0 0}.speed-note span:last-child{color:#8a8d91}
      .period-card{border:1px solid #e4e6eb;border-radius:12px;padding:12px 15px}.period-top{display:flex;align-items:center;gap:8px}.period-top>svg{color:#0866ff;width:17px;height:17px}.period-summary{flex:1;min-width:0;font-size:10px;color:#8a8d91}.period-summary strong{display:block;color:#1c1e21;font-size:12px;line-height:1.5}.text-button{background:#ebf3ff;color:#0866ff;border:0;border-radius:7px;padding:7px 10px;font-size:10px;font-weight:600;white-space:nowrap}.date-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px;padding-top:10px;border-top:1px solid #edf0f5}.date-label{font-size:10px;color:#8a8d91;display:block}.date-grid strong{display:block;font-size:13px;font-weight:600;margin-top:3px;line-height:1.45}.date-grid>div:first-child strong{color:#0866ff}.period-note{font-size:9px;line-height:1.5;color:#8a8d91;margin:6px 0 0}
      .activity{margin:12px 0 0}.status{font-size:11px;line-height:1.6;margin:0;color:#65676b;overflow-wrap:anywhere}.status.error{color:#c52c3e}.track{height:3px;overflow:hidden;border-radius:3px;background:#edf3fc;margin-top:8px;contain:paint}.track>div{width:100%;height:100%;background:linear-gradient(90deg,transparent,#0866ff,transparent);background-size:200% 100%;animation:flow 1.7s linear infinite}.track.idle{display:none}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:12px 0;padding:9px 0;border-radius:9px;background:#f5f7fa}.stat{display:flex;align-items:center;justify-content:center;gap:8px;border-right:1px solid #e0e5ec}.stat:last-child{border:0}.stat-label{font-size:10px;color:#8a8d91}.stat strong{font-size:15px;font-weight:650;color:#4b4f56;font-variant-numeric:tabular-nums}
      .actions{display:flex;gap:10px}.action{min-height:39px;display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 13px;border:0;border-radius:8px;font-size:12px;font-weight:600}.action svg{width:14px;height:14px}.stop{flex:1;background:#fff0f2;color:#d83245}.minimize,.dismiss{flex:1;background:#0866ff;color:#fff}.secondary{background:#f0f2f5;color:#65676b}.hint{font-size:9px;line-height:1.5;color:#8a8d91;margin:10px 0 0;text-align:center}.hint svg{width:10px;height:10px;vertical-align:-2px;margin-right:3px}.help{display:block;font-size:11px;color:#0866ff;margin:7px 0;text-underline-offset:3px}
      .editor-heading{font-size:21px;line-height:1.4;margin:0}.editor-note{font-size:11px;color:#65676b;line-height:1.6;margin:5px 0 15px}.editor-layout{display:grid;grid-template-columns:minmax(0,344px) 1fr;gap:22px;align-items:center}.editor-side{min-width:0}.editor-side .action{width:100%;margin-top:10px}.selection-card{background:#f5f8fe;border:1px solid #e6eefc;border-radius:12px;padding:16px}.selection-card span{display:block;color:#8a8d91;font-size:11px}.selection-card strong{display:block;color:#0866ff;font-size:17px;line-height:1.65;margin-top:6px}.selection-card p{font-size:11px;color:#65676b;line-height:1.7;margin:10px 0 0}
      .compact{display:none;pointer-events:auto;background:#fff;border:1px solid #e4e6eb;border-radius:12px;box-shadow:0 8px 36px #0002;padding:13px;gap:10px;align-items:center;width:360px;max-width:100%;text-align:left}.compact-info{flex:1;min-width:0}.compact-info strong{display:block;font-size:12px;font-weight:600}.compact-info span{font-size:10px;color:#65676b}.compact-stop{color:#d83245;background:#fff0f2}.overlay[data-minimized="true"]{justify-content:flex-end;align-items:flex-end;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;pointer-events:none}.overlay[data-minimized="true"] .panel{display:none}.overlay[data-minimized="true"] .compact{display:flex}
      @keyframes pulse{50%{box-shadow:0 0 0 6px #0866ff0a}}@keyframes flow{to{background-position:-200% 0}}
      @media(max-height:760px){.top{padding-top:10px;padding-bottom:10px}.body{padding-top:13px;padding-bottom:12px}.summary-grid{margin:11px 0}.hero .visual{display:none}.count{font-size:50px}.period-card{padding-top:10px;padding-bottom:10px}.activity{margin-top:10px}.stats{margin:10px 0;padding:8px 0}.hint{margin-top:8px}}
      @media(max-width:620px){.panel{width:100%;border-radius:16px}.body{padding:15px 17px}.top{padding-left:17px;padding-right:17px}.summary-grid{grid-template-columns:1fr;gap:12px}.hero{justify-content:space-between}.hero-copy{display:grid;grid-template-columns:1fr auto;column-gap:12px}.headline{font-size:22px}.counter{grid-column:2;grid-row:1/4;align-self:center;margin:0}.count{font-size:47px}.count-label{margin-top:3px}.visual{display:none}.speed-card{padding:10px 12px}.speed-note br{display:none}.speed-note span:last-child{display:none}.speed-slider{margin-top:4px}.speed-note{margin-top:4px}.editor-layout{grid-template-columns:1fr;gap:12px}.editor-heading{font-size:19px}.editor-note{margin-bottom:10px}.editor-side .selection-card{padding:9px 12px}.selection-card span,.selection-card p{display:none}.selection-card strong{font-size:13px;margin:0}.editor-side{display:grid;grid-template-columns:1fr 1fr;gap:8px}.editor-side .selection-card,.editor-side .hint{grid-column:1/-1}.editor-side .action{margin:0}.editor-side .hint{margin-top:0}.stat{gap:4px}.stat strong{font-size:14px}.stat-label{font-size:9px}.account span{max-width:130px}}
      @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important}}
    </style>
    <div class="overlay" id="overlay" data-phase="connecting" data-minimized="false">
      <section class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="headline" tabindex="-1">
        <header class="top"><span class="brand-mark">${trashIcon}</span><div class="brand">PostSweep<span class="brand-caption">ล้างโพสต์ Facebook</span></div><div class="top-actions"><button id="top-minimize" class="icon-button" aria-label="ย่อหน้าต่าง">${minimizeIcon}</button><button id="close" class="icon-button" aria-label="ปิดหน้าต่าง" hidden>${closeIcon}</button></div></header>
        <div class="body">
          <div id="run-view">
            <div class="context-row"><div class="mode"><span class="dot"></span><span id="phase-label">กำลังเชื่อมต่อ</span></div><div class="account">${icon('<circle cx="12" cy="8" r="3"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>')}<span id="account">กำลังตรวจสอบบัญชี…</span></div></div>
            <div class="summary-grid">
              <div class="hero"><div class="hero-copy"><h1 id="headline" class="headline">กำลังเตรียมพร้อม</h1><p class="subhead" id="subhead">ตรวจสอบบัญชีก่อนเริ่มจัดการโพสต์</p><div class="counter"><strong id="count" class="count">0</strong><span class="unit">โพสต์</span></div><p class="count-label">ย้ายไปถังขยะเรียบร้อยแล้ว</p></div><div class="visual" aria-hidden="true">${icon('<path d="M3 6h18M9 6V3h6v3M5 6l1 14h12l1-14M10 10v6m4-6v6"/>','hero-icon')}${icon('<path d="m5 12 4 4L19 6"/>','state-icon check-icon')}${icon('<path d="M8 5v14M16 5v14"/>','state-icon pause-icon')}${icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3h.01"/>','state-icon error-icon')}</div></div>
              <section class="speed-card" aria-label="ตั้งค่าความเร็ว"><div class="speed-top">${gaugeIcon}<label for="speed">ความเร็วในการลบ</label><div class="speed-value"><output id="speed-name" for="speed">เร็วสุด</output><span id="speed-level" class="speed-level">5 / 5</span></div></div><input id="speed" class="speed-slider" type="range" min="1" max="5" step="1" value="5" aria-describedby="speed-note"><div class="speed-labels" aria-hidden="true"><span>ช้ามาก</span><span>ปกติ</span><span>เร็วสุด</span></div><p id="speed-note" class="speed-note"><span id="speed-detail">ทำงานต่อเนื่อง · สูงสุด 3 โพสต์พร้อมกัน</span><br><span id="speed-save">ปรับได้ระหว่างลบ · จำค่าที่เลือกไว้ครั้งถัดไป</span></p></section>
            </div>
            <section class="period-card" aria-label="ช่วงเวลาและวันที่ของโพสต์"><div class="period-top">${calendarIcon}<div class="period-summary">ช่วงที่ลบ<strong id="period-name">ทุกเดือน · ทุกปี</strong></div><button id="edit-period" class="text-button">เปลี่ยนช่วงเวลา</button></div><div class="date-grid"><div><span id="current-date-label" class="date-label">กำลังตรวจวันที่</span><strong id="current-date">รอข้อมูลโพสต์…</strong></div><div><span class="date-label">ลบสำเร็จล่าสุด</span><strong id="last-removed-date">ยังไม่มีรายการ</strong></div></div><p id="oldest-date" class="period-note" hidden></p><p id="period-note" class="period-note" hidden></p></section>
            <div class="activity"><p id="status" class="status" role="status" aria-live="polite">กำลังเชื่อมต่อกับบันทึกกิจกรรม</p><div id="track" class="track" role="progressbar" aria-label="กำลังประมวลผลโพสต์"><div></div></div></div>
            <div class="stats"><div class="stat"><span class="stat-label">ตรวจพบ</span><strong id="checked">0</strong></div><div class="stat"><span class="stat-label">ย้ายไม่ได้</span><strong id="skipped">0</strong></div><div class="stat"><span class="stat-label">เวลาที่ใช้</span><strong id="elapsed">00:00</strong></div></div>
            <a id="help" class="help" hidden>เปิดบันทึกกิจกรรมที่ตั้งไว้ →</a>
            <div class="actions"><button id="stop" class="action stop">${stopIcon}<span id="stop-label">หยุดลบโพสต์</span></button><button id="minimize" class="action minimize">${minimizeIcon}ย่อหน้าต่าง</button><button id="dismiss" class="action dismiss" hidden>ปิดหน้าต่าง</button></div>
            <p class="hint">กู้คืนจากถังขยะได้ภายใน 30 วัน</p>
          </div>
          <div id="edit-view" hidden><h2 id="editor-heading" class="editor-heading">เลือกช่วงเวลาที่ต้องการลบ</h2><p id="period-editor-note" class="editor-note" role="status">รอรายการที่ส่งไปแล้วเสร็จก่อนเปลี่ยนช่วง</p><div class="editor-layout"><div id="period-calendar"></div><div class="editor-side"><div class="selection-card"><span>ช่วงเวลาที่เลือก</span><strong id="period-selection-label"></strong><p>ย้ายเฉพาะโพสต์ในช่วงนี้ไปถังขยะ นับวันตามเวลาไทย</p></div><button id="apply-period" class="action dismiss" disabled>เริ่มลบตามช่วงนี้</button><button id="cancel-period" class="action secondary">กลับไปหน้าสถานะ</button><p class="hint">เลือกช่วงใหม่ได้ทุกครั้งก่อนเริ่มงาน</p></div></div></div>
        </div>
      </section>
      <div class="compact" id="compact"><span class="brand-mark">${trashIcon}</span><div class="compact-info"><strong id="compact-title">กำลังเตรียมพร้อม</strong><span id="compact-count">ย้ายแล้ว 0 โพสต์</span><br><span id="compact-date">รอข้อมูลวันที่…</span></div><button id="expand" class="icon-button" aria-label="เปิดหน้าต่างสถานะ">${icon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>')}</button><button id="compact-stop" class="icon-button compact-stop" aria-label="หยุดลบโพสต์">${stopIcon}</button><button id="compact-close" class="icon-button" aria-label="ปิดสถานะ" hidden>${closeIcon}</button></div>
    </div>`;
  const $ = id => root.getElementById(id);
  // Use one explicit calendar/time zone for filtering and display, independent of the Mac's settings.
  const dateFormat = new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });
  const periodTools = globalThis.mountPostSweepCalendar;
  const normalizePeriod = value => periodTools.normalize(value);
  const validDate = value => Number.isFinite(value) && value > 0 && !Number.isNaN(new Date(value * 1000).getTime());
  const dateLabel = value => validDate(value) ? dateFormat.format(value * 1000) : 'ไม่ระบุวันที่';
  const periodLabel = value => periodTools.label(value);
  const matchesPeriod = post => {
    const bounds = periodTools.range(state.period);
    return !bounds || (validDate(post.createdAt) && post.createdAt >= bounds.start && post.createdAt < bounds.end);
  };
  const activePosts = new Map(), outsidePeriod = new Set(), unknownDates = new Set();
  let calendar;
  const fitPanel = () => {
    const panel = $('panel');
    if (!panel.offsetHeight) return;
    panel.style.setProperty('--panel-scale', Math.min(1, (window.innerHeight - 24) / panel.offsetHeight));
  };
  const resizeObserver = new ResizeObserver(fitPanel);
  resizeObserver.observe($('panel'));
  window.addEventListener('resize', fitPanel);
  const speeds = [
    { name: 'ช้ามาก', gap: 1500, parallel: 1 },
    { name: 'ช้า', gap: 700, parallel: 1 },
    { name: 'ปกติ', gap: 350, parallel: 2 },
    { name: 'เร็ว', gap: 150, parallel: 3 },
    { name: 'เร็วสุด', gap: 0, parallel: 3 }
  ];
  let saveChain = Promise.resolve();
  const setSpeed = (value, persist = false) => {
    const level = Number(value);
    state.speedLevel = Number.isInteger(level) && level >= 1 && level <= 5 ? level : 5;
    const speed = speeds[state.speedLevel - 1];
    $('speed').value = state.speedLevel;
    $('speed').style.setProperty('--fill', `${(state.speedLevel - 1) * 25}%`);
    $('speed').setAttribute('aria-valuetext', `${speed.name} ระดับ ${state.speedLevel} จาก 5`);
    $('speed-name').textContent = speed.name;
    $('speed-level').textContent = `${state.speedLevel} / 5`;
    $('speed-detail').textContent = `${speed.gap ? `เว้น ${speed.gap / 1000} วินาที` : 'ทำงานต่อเนื่อง'} · สูงสุด ${speed.parallel} โพสต์พร้อมกัน`;
    state.wakeQueue?.();
    if (persist) {
      state.speedChanged = true;
      const selected = state.speedLevel;
      // Keep writes in order when the slider is moved repeatedly.
      saveChain = saveChain.then(async () => {
        try {
          if (!chrome.storage?.local) throw new Error('storage unavailable');
          await chrome.storage.local.set({ cleanerSpeedLevel: selected });
          $('speed-save').textContent = 'ปรับได้ระหว่างลบ · จำค่าที่เลือกไว้ครั้งถัดไป';
        } catch {
          $('speed-save').textContent = 'ใช้ความเร็วนี้ในรอบนี้ · ยังบันทึกค่าไม่ได้';
        }
      });
    }
  };
  $('speed').addEventListener('input', () => setSpeed($('speed').value, true));
  setSpeed(5);
  const waitForQueue = ms => new Promise(resolve => {
    const wake = () => { clearTimeout(timeout); if (state.wakeQueue === wake) state.wakeQueue = null; resolve(); };
    const timeout = setTimeout(wake, ms);
    state.wakeQueue = wake;
  });
  const seen = new Set();
  const done = new Set();
  const skipped = new Set();
  const format = n => n.toLocaleString('th-TH');
  const phases = {
    connecting: ['กำลังเตรียมพร้อม', 'กำลังเชื่อมต่อ', 'ตรวจสอบบัญชีก่อนเริ่มจัดการโพสต์'],
    scanning: ['กำลังค้นหาโพสต์', 'กำลังทำงาน', 'โหลดรายการต่อไปให้อัตโนมัติ'],
    working: ['กำลังลบโพสต์', 'กำลังทำงาน', 'ย้ายโพสต์ทั้งหมดไปถังขยะให้อัตโนมัติ'],
    stopping: ['กำลังหยุดการลบ', 'กำลังหยุด', 'รอรายการที่ส่งไปแล้วทำงานให้เสร็จ'],
    stopped: ['หยุดลบโพสต์แล้ว', 'หยุดแล้ว', 'รายการที่ทำสำเร็จแสดงอยู่ด้านล่าง'],
    complete: ['จัดการโพสต์เสร็จแล้ว', 'เสร็จเรียบร้อย', 'เรียบร้อยแล้ว พื้นที่ของคุณพร้อมเริ่มใหม่'],
    error: ['หยุดการทำงานแล้ว', 'ต้องตรวจสอบ', 'ดูรายละเอียดด้านล่างก่อนเริ่มอีกครั้ง']
  };
  const setPhase = phase => {
    state.phase = phase;
    $('overlay').dataset.phase = phase;
    const [title, label, subtitle] = phases[phase];
    $('headline').textContent = title;
    $('compact-title').textContent = title;
    $('phase-label').textContent = label;
    $('subhead').textContent = phase === 'working' && state.period.kind !== 'all' ? `เฉพาะช่วง ${periodLabel(state.period)}` : subtitle;
  };
  const update = () => {
    $('count').textContent = format(state.removed);
    $('compact-count').textContent = `ย้ายแล้ว ${format(state.removed)} โพสต์`;
    $('checked').textContent = format(seen.size);
    $('skipped').textContent = format(skipped.size);
    $('period-name').textContent = periodLabel(state.period);
    const dates = [...activePosts.values()].map(post => post.createdAt).filter(validDate);
    let current = state.scannedAt == null ? 'รอข้อมูลโพสต์…' : dateLabel(state.scannedAt);
    if (activePosts.size) {
      const labels = [...new Set(dates.sort((a, b) => a - b).map(dateLabel))];
      current = labels.length > 1 ? `${labels[0]} – ${labels.at(-1)}` : labels[0] || 'ไม่ระบุวันที่';
      if (dates.length && dates.length < activePosts.size) current += ' · บางรายการไม่ระบุวันที่';
    }
    $('current-date-label').textContent = activePosts.size ? 'กำลังลบวันที่' : state.running ? 'กำลังตรวจวันที่' : 'วันที่ที่ตรวจล่าสุด';
    $('current-date').textContent = current;
    $('last-removed-date').textContent = state.lastRemovedAt == null ? 'ยังไม่มีรายการ' : dateLabel(state.lastRemovedAt);
    $('oldest-date').hidden = state.oldestRemovedAt == null;
    $('oldest-date').textContent = `วันที่เก่าสุดที่ลบสำเร็จในรอบนี้: ${dateLabel(state.oldestRemovedAt)}`;
    $('compact-date').textContent = activePosts.size ? `กำลังลบ ${current}` : state.lastRemovedAt != null ? `ล่าสุด ${dateLabel(state.lastRemovedAt)}` : current;
    $('period-note').hidden = state.period.kind === 'all';
    $('period-note').textContent = `เวลาไทย · ข้ามนอกช่วง ${format(outsidePeriod.size)} รายการ${unknownDates.size ? ` · ไม่ระบุวันที่ ${format(unknownDates.size)} รายการ (ไม่ลบ)` : ''}`;
    const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
    $('elapsed').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };
  const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
  const timer = setInterval(update, 1000);
  const minimize = () => {
    $('overlay').dataset.minimized = 'true';
    $('panel').setAttribute('aria-modal', 'false');
    $('expand').focus({ preventScroll: true });
  };
  state.show = () => {
    $('overlay').dataset.minimized = 'false';
    $('panel').setAttribute('aria-modal', 'true');
    fitPanel();
    $('panel').focus({ preventScroll: true });
  };
  state.remove = () => {
    state.editing = false;
    clearInterval(timer);
    resizeObserver.disconnect();
    window.removeEventListener('resize', fitPanel);
    host.remove();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };
  $('minimize').onclick = minimize;
  $('top-minimize').onclick = minimize;
  $('expand').onclick = state.show;
  for (const id of ['close', 'dismiss', 'compact-close']) $(id).onclick = () => { if (!state.running) state.remove(); };
  const stop = () => {
    if (state.stop) return;
    state.stop = true;
    state.wakeQueue?.();
    setPhase('stopping');
    $('stop').disabled = true;
    $('compact-stop').disabled = true;
    $('stop-label').textContent = 'กำลังหยุด…';
    status(`หยุดส่งคำสั่งเพิ่มแล้ว กำลังรอ ${state.active} รายการที่ส่งไปก่อนหน้า`);
  };
  $('stop').onclick = stop;
  $('compact-stop').onclick = stop;
  const updateEditor = () => {
    const selected = calendar?.getValue();
    $('period-selection-label').textContent = selected ? periodLabel(selected) : 'เลือกวันเริ่มต้นและวันสิ้นสุด';
    $('apply-period').disabled = state.running || state.savingPeriod || !selected;
    $('apply-period').textContent = selected?.kind === 'all' ? 'เริ่มลบทั้งหมด' : 'เริ่มลบตามช่วงนี้';
  };
  calendar = periodTools?.($('period-calendar'), {onChange: updateEditor});
  $('edit-period').onclick = () => {
    if (!calendar) return;
    state.editing = true;
    if (state.running) stop();
    $('run-view').hidden = true;
    $('edit-view').hidden = false;
    $('panel').setAttribute('aria-labelledby', 'editor-heading');
    calendar.setValue(state.period);
    $('period-editor-note').textContent = state.running ? 'กำลังหยุดรอบเดิม รอรายการที่ส่งไปแล้วเสร็จก่อนเริ่มช่วงใหม่' : 'เลือกรูปแบบและวันที่ แล้วกดเริ่มลบ';
    updateEditor();
    state.show(); calendar.focus();
  };
  $('cancel-period').onclick = () => {
    if (state.savingPeriod) return;
    state.editing = false;
    $('run-view').hidden = false;
    $('edit-view').hidden = true;
    $('panel').setAttribute('aria-labelledby', 'headline');
    fitPanel(); $('edit-period').focus();
  };
  $('apply-period').onclick = async () => {
    if (state.running || $('apply-period').disabled) return;
    const selected = calendar.getValue();
    if (!selected) return;
    state.savingPeriod = true; updateEditor();
    $('cancel-period').disabled = true;
    try {
      await chrome.storage.local.set({ cleanerPeriod: selected });
      if (!host.isConnected || !state.editing) return;
      state.editing = false;
      startCleaner({ period: selected, actorId: state.actorId });
    } catch {
      $('period-editor-note').textContent = 'บันทึกช่วงเวลาไม่ได้ ยังไม่ได้เริ่มลบ ลองอีกครั้ง';
      state.savingPeriod = false; updateEditor();
      $('cancel-period').disabled = false;
    }
  };
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      if (state.editing) $('cancel-period').click(); else if (state.running) minimize(); else state.remove();
    } else if (event.key === 'Tab' && $('overlay').dataset.minimized !== 'true') {
      const focusable = [...$('panel').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(el => el.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1), active = root.activeElement;
      if (event.shiftKey && (active === first || active === $('panel'))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (active === last || active === $('panel'))) { event.preventDefault(); first?.focus(); }
      event.stopPropagation();
    }
  });
  state.show();
  const rpc = async request => {
    try {
      const response = await chrome.runtime.sendMessage({ channel: 'facebook-cleaner-v1', request });
      return response || { ok: false, message: 'ไม่ได้รับผลตอบกลับจากส่วนขยาย', uncertain: request.kind === 'trash' };
    } catch {
      return { ok: false, message: 'การเชื่อมต่อขาดหาย กรุณารีเฟรชและตรวจถังขยะก่อนเริ่มใหม่', uncertain: request.kind === 'trash' };
    }
  };
  const abort = result => {
    state.failed = true;
    state.stop = true;
    state.wakeQueue?.();
    setPhase('stopping');
    if (result.uncertain) state.uncertain++;
    status(result.message || 'ไม่สามารถทำรายการต่อได้', true);
  };
  const finish = () => {
    state.running = false;
    clearInterval(timer);
    update();
    $('stop').hidden = true;
    $('close').hidden = false;
    $('top-minimize').hidden = true;
    $('dismiss').hidden = false;
    $('minimize').hidden = true;
    $('compact-stop').hidden = true;
    $('compact-close').hidden = false;
    $('track').classList.add('idle');
    if (state.failed) {
      setPhase('error');
      $('track').classList.add('error');
      if (state.uncertain) $('status').append(document.createTextNode(` มี ${state.uncertain} รายการที่ยังยืนยันผลไม่ได้ ตรวจ Facebook ก่อนเริ่มใหม่`));
    } else if (state.stop) {
      setPhase('stopped');
      status(`หยุดแล้ว ย้ายสำเร็จ ${format(state.removed)} โพสต์ กดไอคอนส่วนขยายเพื่อเริ่มตรวจรายการที่เหลือใหม่`);
    } else {
      setPhase('complete');
      status(`เสร็จแล้ว Facebook ยืนยันการย้าย ${format(state.removed)} โพสต์${state.period.kind !== 'all' ? ` ในช่วง ${periodLabel(state.period)}` : ''}${skipped.size ? ` และมี ${format(skipped.size)} รายการที่ย้ายไม่ได้` : ''} รีเฟรชหน้าเพื่อดูผลล่าสุด`);
    }
    if (state.editing) {
      updateEditor();
      $('period-editor-note').textContent = state.failed ? $('status').textContent : 'รอบเดิมหยุดแล้ว · เลือกช่วงเวลาแล้วกดเริ่มลบ';
    }
  };
  const run = async context => {
    let lastDispatch = -Infinity;
    let cursor = null;
    const cursors = new Set();
    while (!state.stop) {
      setPhase('scanning');
      status(state.period.kind !== 'all' ? `กำลังค้นหาโพสต์ช่วง ${periodLabel(state.period)}…` : state.removed ? 'กำลังตรวจโพสต์ที่เหลือ…' : 'กำลังโหลดโพสต์ชุดแรก…');
      const page = await rpc({ kind: 'scan', context, cursor, period: state.period });
      if (!page.ok) { abort(page); break; }
      if (state.stop) break;
      for (const post of page.posts) {
        seen.add(post.storyId);
        state.scannedAt = post.createdAt || 0;
        if (state.period.kind !== 'all' && !matchesPeriod(post)) {
          (validDate(post.createdAt) ? outsidePeriod : unknownDates).add(post.storyId);
        } else if (!post.canTrash) skipped.add(post.storyId);
      }
      update();
      if (page.hasNext && !page.cursor) { abort({ message: 'Facebook ไม่ส่งตำแหน่งรายการถัดไปมา งานหยุดเพื่อไม่ให้ข้ามโพสต์' }); break; }
      // Reload from the first page after every successful batch. Deleted rows cannot shift a cursor past unseen posts.
      const batch = page.posts.filter((post, index, rows) => post.canTrash && matchesPeriod(post) && !done.has(post.storyId) && rows.findIndex(row => row.storyId === post.storyId) === index);
      if (batch.length) {
        let next = 0;
        setPhase('working');
        status(`กำลังย้ายโพสต์ไปถังขยะ ${batch.length} รายการ…`);
        const pending = new Set();
        // A single dispatcher makes slider changes apply to the next request.
        // Requests already sent are allowed to finish, including after Stop.
        while ((!state.stop && next < batch.length) || pending.size) {
          const speed = speeds[state.speedLevel - 1];
          const remaining = speed.gap - (performance.now() - lastDispatch);
          if (!state.stop && next < batch.length && pending.size < speed.parallel && remaining <= 0) {
            const post = batch[next++];
            lastDispatch = performance.now();
            state.active++;
            activePosts.set(post.storyId, post);
            update();
            const task = rpc({ kind: 'trash', context, post, period: state.period }).then(result => {
              if (!result.ok) { abort(result); return; }
              if (!done.has(post.storyId)) {
                done.add(post.storyId); state.removed++;
                state.lastRemovedAt = post.createdAt || 0;
                if (validDate(post.createdAt)) state.oldestRemovedAt = Math.min(state.oldestRemovedAt ?? Infinity, post.createdAt);
              }
              update();
            }).catch(() => abort({ message: 'ยืนยันผลรายการไม่ได้ กรุณาตรวจถังขยะก่อนเริ่มใหม่', uncertain: true })).finally(() => {
              state.active--;
              activePosts.delete(post.storyId);
              update();
              pending.delete(task);
              state.wakeQueue?.();
            });
            pending.add(task);
            continue;
          }
          await waitForQueue(!state.stop && next < batch.length && pending.size < speed.parallel ? Math.max(1, remaining) : 1000);
        }
        cursor = null;
        cursors.clear();
        if (!state.stop) await waitForQueue(300);
        continue;
      }
      if (!page.hasNext) break;
      if (cursors.has(page.cursor)) { abort({ message: 'Facebook ส่งรายการหน้าเดิมซ้ำ งานหยุดแล้ว กดไอคอนใหม่เพื่อตรวจรายการที่เหลือ' }); break; }
      cursors.add(page.cursor);
      cursor = page.cursor;
      await waitForQueue(150);
    }
  };
  void (async () => {
    try {
      try {
        if (!chrome.storage?.local || !calendar) throw new Error('settings unavailable');
        const saved = await chrome.storage.local.get(['cleanerSpeedLevel', 'cleanerPeriod']);
        if (!state.speedChanged) setSpeed(saved?.cleanerSpeedLevel);
        state.period = normalizePeriod(options.period === undefined ? saved?.cleanerPeriod : options.period);
        update();
      } catch {
        abort({ message: 'อ่านช่วงเวลาที่ตั้งไว้ไม่ได้ จึงยังไม่เริ่มลบ กดเปลี่ยนช่วงเวลาเพื่อตั้งค่าใหม่' });
        return;
      }
      if (state.stop) return;
      let connected = await rpc({ kind: 'connect', expectedActorId: options.actorId });
      // Facebook may finish navigation before its account modules are ready.
      // Only this read-only connection check is retried; mutations never are.
      for (let attempt = 0; !state.stop && connected.code === 'NOT_READY' && attempt < 25; attempt++) {
        status('กำลังรอ Facebook โหลดข้อมูลบัญชี…');
        await waitForQueue(400);
        if (!state.stop) connected = await rpc({ kind: 'connect', expectedActorId: options.actorId });
      }
      if (state.stop) return;
      if (!connected.ok) {
        abort(connected);
        $('account').textContent = 'ยังไม่ได้เริ่มลบโพสต์';
        if (connected.code === 'WRONG_PAGE') {
          $('help').href = 'https://www.facebook.com/' + (/^\d+$/.test(options.actorId || '') ? options.actorId : 'me') + '/allactivity?activity_history=false&category_key=MANAGEPOSTSPHOTOSANDVIDEOS&manage_mode=false&should_load_landing_page=false';
          $('help').hidden = false;
        }
        return;
      }
      $('account').textContent = connected.context.name;
      state.actorId = connected.context.actorId;
      $('account').title = `บัญชี ${connected.context.actorId}`;
      if (state.stop) return;
      // Web Locks also prevent two Facebook tabs from running the same cleaner concurrently.
      if (!navigator.locks?.request) { abort({ message: 'เบราว์เซอร์ไม่รองรับการล็อกงาน ให้ใช้ Google Chrome รุ่นปัจจุบัน' }); return; }
      await navigator.locks.request('facebook-cleaner-all-posts-v1', { ifAvailable: true }, async lock => {
        if (!lock) { abort({ message: 'ส่วนขยายกำลังทำงานในแท็บ Facebook อีกแท็บหนึ่ง ให้รอหรือหยุดแท็บนั้นก่อน' }); return; }
        await run(connected.context);
      });
    } catch {
      abort({ message: 'เกิดข้อผิดพลาด งานหยุดแล้ว กรุณาตรวจบันทึกกิจกรรมก่อนเริ่มใหม่' });
    } finally { finish(); }
  })();
}

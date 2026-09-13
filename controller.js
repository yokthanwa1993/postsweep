// Injected into the extension's isolated world. Clicking the toolbar icon starts the job.
export function startCleaner() {
  const KEY = '__facebookCleanerRunV1';
  const existing = globalThis[KEY];
  if (existing?.running) { existing.show(); return; }
  existing?.remove();
  const previousFocus = document.activeElement;
  const state = { running: true, stop: false, removed: 0, failed: false, uncertain: 0, active: 0, startedAt: Date.now(), phase: 'connecting', speedLevel: 5, speedChanged: false };
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
  root.innerHTML = `
    <style>
      :host{all:initial}*{box-sizing:border-box}[hidden]{display:none!important}button,input,a{-webkit-tap-highlight-color:transparent}button,input{font:inherit}button{cursor:pointer}button:disabled{opacity:.55;cursor:default}button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #0866ff;outline-offset:3px}svg{width:20px;height:20px;flex-shrink:0}
      .overlay{--ink:#1c1e21;--muted:#65676b;--blue:#0866ff;--pale:#ebf3ff;position:absolute;inset:0;display:grid;place-items:center;padding:20px;background:rgba(28,30,33,.34);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);pointer-events:auto;font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,Thonburi,Tahoma,sans-serif;color:var(--ink);animation:veil-in .2s ease both}
      .panel{width:min(580px,100%);max-height:calc(100dvh - 40px);overflow:auto;background:#fff;border:1px solid #ffffffb3;border-radius:18px;box-shadow:0 20px 64px #0003,0 2px 8px #0000000d;outline:none;animation:enter .3s cubic-bezier(.16,1,.3,1) both;scrollbar-width:thin;scrollbar-color:#ccd0d5 transparent}
      .top{display:flex;align-items:center;gap:11px;padding:17px 24px;border-bottom:1px solid #e4e6eb}.brand-mark{width:38px;height:38px;border-radius:11px;background:#e53645;color:#fff;display:grid;place-items:center;border:1px solid #e53645;flex-shrink:0}.brand-mark svg{width:22px;height:22px}.brand{font-size:16px;font-weight:700;line-height:1.3}.brand-caption{display:block;font-size:11px;font-weight:400;color:#8a8d91;margin-top:2px}.top-actions{margin-left:auto;display:flex;gap:8px}.icon-button{width:34px;height:34px;display:grid;place-items:center;background:#f0f2f5;color:#65676b;border:0;border-radius:50%;padding:8px}.icon-button svg{width:18px;height:18px}.icon-button:hover{background:#e4e6eb;color:#1c1e21}
      .body{padding:23px 26px 0}.context-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.mode{display:inline-flex;align-items:center;gap:7px;background:#eaf2ff;padding:4px 10px;border-radius:6px;color:#0866ff;font-size:11px;font-weight:600;white-space:nowrap}.dot{height:6px;width:6px;border-radius:50%;background:currentColor}.account{display:flex;align-items:center;justify-content:flex-end;gap:6px;color:#65676b;font-size:12px;min-width:0}.account svg{width:15px;height:15px}.account span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hero{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:15px 0 20px}.hero-copy{min-width:0}.headline{font-size:25px;line-height:1.4;font-weight:700;letter-spacing:-.6px;margin:0 0 4px}.subhead{font-size:12px;color:#8a8d91;margin:0;line-height:1.7}.counter{display:flex;align-items:baseline;gap:10px;margin:12px 0 0}.count{font-size:68px;line-height:1.05;font-weight:700;letter-spacing:-2.5px;font-variant-numeric:tabular-nums;color:#0866ff}.unit{font-size:15px;color:#65676b}.count-label{font-size:12px;color:#65676b;margin:6px 0 0}
      .visual{width:112px;height:112px;flex-shrink:0;position:relative;display:grid;place-items:center;margin-right:6px}.visual:before{content:"";position:absolute;inset:10px;border-radius:50%;background:linear-gradient(145deg,#f2f7ff,#dfecff)}.orbit{position:absolute;inset:0;border-radius:50%;border:3px solid #eaf1ff}.orbit:after{content:"";position:absolute;inset:-3px;border:3px solid transparent;border-top-color:#0866ff;border-right-color:#73a7ff;border-radius:50%;transform:rotate(-35deg)}.overlay[data-phase="connecting"] .orbit,.overlay[data-phase="scanning"] .orbit,.overlay[data-phase="working"] .orbit{animation:orbit 2.3s linear infinite}.hero-icon{position:relative;width:48px;height:48px;color:#0866ff}.hero-icon .bin-lid{transform-origin:22px 16px;animation:lid 2s ease-in-out infinite}.hero-icon .paper{animation:paper 2s ease-in-out infinite}.state-icon{position:relative;width:40px;height:40px;color:#0866ff;display:none}.overlay[data-phase="working"] .dot{animation:pulse 1.8s infinite}
      .overlay[data-phase="stopped"] .hero-icon,.overlay[data-phase="stopping"] .hero-icon,.overlay[data-phase="error"] .hero-icon,.overlay[data-phase="complete"] .hero-icon{display:none}.overlay[data-phase="complete"] .check-icon{display:block}.overlay[data-phase="stopped"] .pause-icon,.overlay[data-phase="stopping"] .pause-icon{display:block}.overlay[data-phase="error"] .error-icon{display:block;color:#d83245}.overlay[data-phase="error"] .visual:before{background:#fff0f2}.overlay[data-phase="error"] .mode{background:#fff0f2;color:#d83245}.overlay[data-phase="error"] .orbit:after{border-top-color:#f7bdc4;border-right-color:#f7bdc4}.overlay[data-phase="stopped"] .mode,.overlay[data-phase="stopping"] .mode{background:#f0f2f5;color:#65676b}.overlay[data-phase="stopped"] .orbit:after,.overlay[data-phase="complete"] .orbit:after{border-color:#b7d3ff}
      .activity{margin-top:0}.status{font-size:12px;line-height:1.7;margin:0;color:#65676b;overflow-wrap:anywhere}.status.error{color:#c52c3e}.track{height:4px;border-radius:4px;overflow:hidden;background:#e8effb;margin-top:11px}.track>div{width:34%;height:100%;border-radius:4px;background:#0866ff;animation:slide 1.6s ease-in-out infinite}.track.idle{display:none}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:17px 0;background:#f5f7fa;border-radius:10px;padding:12px 0}.stat{display:flex;align-items:center;justify-content:center;gap:8px;border-right:1px solid #e0e5ec}.stat:last-child{border:0}.stat-label{font-size:11px;color:#8a8d91}.stat strong{font-size:17px;font-weight:600;color:#4b4f56;font-variant-numeric:tabular-nums}
      .speed-card{border:1px solid #e4e6eb;border-radius:12px;padding:15px 17px 13px;margin-bottom:19px}.speed-top{display:flex;align-items:center;gap:8px;margin-bottom:6px}.speed-top svg{width:18px;height:18px;color:#65676b}.speed-top label{font-size:13px;font-weight:650}.speed-value{display:flex;align-items:center;gap:7px;margin-left:auto;color:#0866ff;font-size:12px;font-weight:600}.speed-level{background:#eaf2ff;padding:2px 7px;border-radius:5px;font-size:10px;font-variant-numeric:tabular-nums}.speed-slider{display:block;width:100%;height:30px;margin:5px 0 0;padding:0;appearance:none;-webkit-appearance:none;cursor:pointer;background:transparent;accent-color:#0866ff;border-radius:6px;--fill:100%}.speed-slider::-webkit-slider-runnable-track{height:6px;border-radius:9px;background:linear-gradient(to right,#0866ff 0%,#0866ff var(--fill),#e4e6eb var(--fill),#e4e6eb 100%)}.speed-slider::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;height:20px;width:20px;background:#fff;border:5px solid #0866ff;border-radius:50%;margin-top:-7px;box-shadow:0 1px 4px #0866ff33;transition:box-shadow .15s}.speed-slider:hover::-webkit-slider-thumb{box-shadow:0 0 0 5px #0866ff12}.speed-labels{display:flex;justify-content:space-between;color:#8a8d91;font-size:10px;margin-top:0;padding:0 1px}.speed-note{font-size:11px;color:#65676b;margin:9px 0 0;line-height:1.5}.speed-note span{color:#8a8d91}
      .actions{display:flex;gap:10px}.action{min-height:42px;border-radius:8px;display:flex;justify-content:center;align-items:center;gap:7px;font-size:13px;font-weight:600;border:1px solid transparent;padding:10px 16px}.action svg{width:16px;height:16px}.stop{flex:1;background:#fff0f2;color:#d83245}.stop:hover:not(:disabled){background:#ffe1e6}.minimize{flex:1;background:#0866ff;color:white}.minimize:hover{background:#075ce4}.dismiss{flex:1;background:#0866ff;color:#fff}.dismiss:hover{background:#075ce4}.hint{font-size:10px;line-height:1.7;color:#8a8d91;margin:13px 0 18px;text-align:center}.hint svg{width:11px;height:11px;vertical-align:-2px;margin-right:4px}.help{display:block;color:#0866ff;font-size:12px;margin:12px 0;text-underline-offset:3px}
      .compact{display:none;pointer-events:auto;background:#fff;border:1px solid #e4e6eb;border-radius:12px;box-shadow:0 8px 36px #0002;padding:14px;gap:11px;align-items:center;width:360px;max-width:100%;text-align:left}.compact-info{flex:1;min-width:0}.compact-info strong{display:block;font-size:13px;font-weight:600}.compact-info span{font-size:11px;color:#65676b}.compact .icon-button{width:32px;height:32px}.compact-stop{color:#d83245;background:#fff0f2}.overlay[data-minimized="true"]{display:flex;justify-content:flex-end;align-items:flex-end;padding:20px;background:transparent;backdrop-filter:none;-webkit-backdrop-filter:none;pointer-events:none}.overlay[data-minimized="true"] .panel{display:none}.overlay[data-minimized="true"] .compact{display:flex}
      @keyframes veil-in{from{opacity:0}to{opacity:1}}@keyframes enter{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes orbit{to{transform:rotate(360deg)}}@keyframes pulse{50%{opacity:.3}}@keyframes slide{0%{transform:translateX(-110%)}100%{transform:translateX(400%)}}@keyframes lid{0%,65%,100%{transform:rotate(0deg)}25%,50%{transform:translateY(-2px) rotate(-9deg)}}@keyframes paper{0%{opacity:0;transform:translateY(-10px)}18%{opacity:1}55%,100%{opacity:0;transform:translateY(17px)}}
      @media(max-height:820px){.top{padding-top:12px;padding-bottom:12px}.body{padding-top:17px}.hero{margin:10px 0 15px}.counter{margin-top:8px}.count{font-size:60px}.visual{width:96px;height:96px}.stats{margin:13px 0;padding:9px 0}.speed-card{padding-top:12px;padding-bottom:11px;margin-bottom:14px}.hint{margin:11px 0 14px}}@media(max-width:520px){.overlay{padding:12px}.panel{max-height:calc(100dvh - 24px);border-radius:16px}.body{padding-left:20px;padding-right:20px}.top{padding-left:20px;padding-right:20px}.headline{font-size:22px}.visual{width:82px;height:82px;margin-right:0}.hero-icon{width:39px;height:39px}.hero{gap:10px}.count{font-size:56px}.subhead{font-size:11px}.stat{flex-direction:column;gap:0}.speed-card{padding-left:13px;padding-right:13px}.account{max-width:50%}}
      @media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}.track>div{width:100%;opacity:.5}.hero-icon .paper{display:none}}
    </style>
    <div class="overlay" id="overlay" data-phase="connecting" data-minimized="false">
      <section class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="headline" tabindex="-1">
        <header class="top"><span class="brand-mark">${trashIcon}</span><div class="brand">PostSweep<span class="brand-caption">ล้างโพสต์ Facebook</span></div><div class="top-actions"><button id="top-minimize" class="icon-button" aria-label="ย่อหน้าต่าง">${minimizeIcon}</button><button id="close" class="icon-button" aria-label="ปิดหน้าต่าง" hidden>${closeIcon}</button></div></header>
        <div class="body" id="body">
          <div class="context-row"><div class="mode"><span class="dot"></span><span id="phase-label">กำลังเชื่อมต่อ</span></div><div class="account">${icon('<circle cx="12" cy="8" r="3"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>')}<span id="account">กำลังตรวจสอบบัญชี…</span></div></div>
          <div class="hero"><div class="hero-copy"><h1 id="headline" class="headline">กำลังเตรียมพร้อม</h1><p class="subhead" id="subhead">ตรวจสอบบัญชีก่อนเริ่มจัดการโพสต์</p><div class="counter"><strong id="count" class="count">0</strong><span class="unit">โพสต์</span></div><p class="count-label">ย้ายไปถังขยะเรียบร้อยแล้ว</p></div>
            <div class="visual" aria-hidden="true"><div class="orbit"></div><svg class="hero-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g class="paper"><rect x="20" y="4" width="9" height="12" rx="2" fill="#fff"/><path d="M23 8h3m-3 3h3" stroke-width="1"/></g><path d="m14 19 2 21a3 3 0 0 0 3 2h10a3 3 0 0 0 3-2l2-21" fill="#c6ddff"/><path d="M21 24v10m6-10v10"/><g class="bin-lid"><path d="M12 17h24"/><path d="M19 17v-4h10v4"/></g></svg>${icon('<path d="m5 12 4 4L19 6"/>','state-icon check-icon')}${icon('<path d="M8 5v14M16 5v14"/>','state-icon pause-icon')}${icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3h.01"/>','state-icon error-icon')}</div>
          </div>
          <div class="activity"><p id="status" class="status" role="status" aria-live="polite">กำลังเชื่อมต่อกับบันทึกกิจกรรม</p><div id="track" class="track" role="progressbar" aria-label="กำลังประมวลผลโพสต์"><div></div></div></div>
          <div class="stats"><div class="stat"><span class="stat-label">ตรวจพบ</span><strong id="checked">0</strong></div><div class="stat"><span class="stat-label">ย้ายไม่ได้</span><strong id="skipped">0</strong></div><div class="stat"><span class="stat-label">เวลาที่ใช้</span><strong id="elapsed">00:00</strong></div></div>
          <section class="speed-card" aria-label="ตั้งค่าความเร็ว"><div class="speed-top">${gaugeIcon}<label for="speed">ความเร็วในการลบ</label><div class="speed-value"><output id="speed-name" for="speed">เร็วสุด</output><span id="speed-level" class="speed-level">5 / 5</span></div></div><input id="speed" class="speed-slider" type="range" min="1" max="5" step="1" value="5" aria-describedby="speed-note"><div class="speed-labels" aria-hidden="true"><span>ช้ามาก</span><span>ปกติ</span><span>เร็วสุด</span></div><p id="speed-note" class="speed-note"><span id="speed-detail">ทำงานต่อเนื่อง · สูงสุด 3 โพสต์พร้อมกัน</span><br><span id="speed-save">ปรับได้ระหว่างลบ · จำค่าที่เลือกไว้ครั้งถัดไป</span></p></section>
          <a id="help" class="help" hidden>เปิดบันทึกกิจกรรมที่ตั้งไว้ →</a>
          <div class="actions"><button id="stop" class="action stop">${stopIcon}<span id="stop-label">หยุดลบโพสต์</span></button><button id="minimize" class="action minimize">${minimizeIcon}ย่อหน้าต่าง</button><button id="dismiss" class="action dismiss" hidden>ปิดหน้าต่าง</button></div>
          <p class="hint">${icon('<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2"/>')}กู้คืนจากถังขยะได้ภายใน 30 วัน</p>
        </div>
      </section>
      <div class="compact" id="compact"><span class="brand-mark">${trashIcon}</span><div class="compact-info"><strong id="compact-title">กำลังเตรียมพร้อม</strong><span id="compact-count">ย้ายแล้ว 0 โพสต์</span></div><button id="expand" class="icon-button" aria-label="เปิดหน้าต่างสถานะ">${icon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>')}</button><button id="compact-stop" class="icon-button compact-stop" aria-label="หยุดลบโพสต์">${stopIcon}</button><button id="compact-close" class="icon-button" aria-label="ปิดสถานะ" hidden>${closeIcon}</button></div>
    </div>`;
  const $ = id => root.getElementById(id);
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
    $('subhead').textContent = subtitle;
  };
  const update = () => {
    $('count').textContent = format(state.removed);
    $('compact-count').textContent = `ย้ายแล้ว ${format(state.removed)} โพสต์`;
    $('checked').textContent = format(seen.size);
    $('skipped').textContent = format(skipped.size);
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
    $('panel').focus({ preventScroll: true });
  };
  state.remove = () => {
    clearInterval(timer);
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
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation();
      if (state.running) minimize(); else state.remove();
    } else if (event.key === 'Tab' && $('overlay').dataset.minimized !== 'true') {
      const focusable = [...$('panel').querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')].filter(el => el.getClientRects().length);
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
      status(`เสร็จแล้ว Facebook ยืนยันการย้าย ${format(state.removed)} โพสต์${skipped.size ? ` และมี ${format(skipped.size)} รายการที่ย้ายไม่ได้` : ''} รีเฟรชหน้าเพื่อดูผลล่าสุด`);
    }
  };
  const run = async context => {
    let lastDispatch = -Infinity;
    let cursor = null;
    const cursors = new Set();
    while (!state.stop) {
      setPhase('scanning');
      status(state.removed ? 'กำลังตรวจโพสต์ที่เหลือ…' : 'กำลังโหลดโพสต์ชุดแรก…');
      const page = await rpc({ kind: 'scan', context, cursor });
      if (!page.ok) { abort(page); break; }
      if (state.stop) break;
      for (const post of page.posts) {
        seen.add(post.storyId);
        if (!post.canTrash) skipped.add(post.storyId);
      }
      update();
      if (page.hasNext && !page.cursor) { abort({ message: 'Facebook ไม่ส่งตำแหน่งรายการถัดไปมา งานหยุดเพื่อไม่ให้ข้ามโพสต์' }); break; }
      // Reload from the first page after every successful batch. Deleted rows cannot shift a cursor past unseen posts.
      const batch = page.posts.filter((post, index, rows) => post.canTrash && !done.has(post.storyId) && rows.findIndex(row => row.storyId === post.storyId) === index);
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
            const task = rpc({ kind: 'trash', context, post }).then(result => {
              if (!result.ok) { abort(result); return; }
              if (!done.has(post.storyId)) { done.add(post.storyId); state.removed++; }
              update();
            }).catch(() => abort({ message: 'ยืนยันผลรายการไม่ได้ กรุณาตรวจถังขยะก่อนเริ่มใหม่', uncertain: true })).finally(() => {
              state.active--;
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
        const saved = await chrome.storage?.local?.get('cleanerSpeedLevel');
        if (!state.speedChanged) setSpeed(saved?.cleanerSpeedLevel);
      } catch { /* The current run still works if a preference cannot be read. */ }
      if (state.stop) return;
      let connected = await rpc({ kind: 'connect' });
      // Facebook may finish navigation before its account modules are ready.
      // Only this read-only connection check is retried; mutations never are.
      for (let attempt = 0; !state.stop && connected.code === 'NOT_READY' && attempt < 25; attempt++) {
        status('กำลังรอ Facebook โหลดข้อมูลบัญชี…');
        await waitForQueue(400);
        if (!state.stop) connected = await rpc({ kind: 'connect' });
      }
      if (state.stop) return;
      if (!connected.ok) {
        abort(connected);
        $('account').textContent = 'ยังไม่ได้เริ่มลบโพสต์';
        if (connected.code === 'WRONG_PAGE') {
          $('help').href = 'https://www.facebook.com/100050886815386/allactivity?activity_history=false&category_key=MANAGEPOSTSPHOTOSANDVIDEOS&manage_mode=false&should_load_landing_page=false';
          $('help').hidden = false;
        }
        return;
      }
      $('account').textContent = connected.context.name;
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

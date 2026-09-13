// Shared by the options page and the isolated Facebook controller. No network access.
(() => {
  const MIN_YEAR = 2004, MAX_YEAR = 2200;
  const zone = { timeZone: 'Asia/Bangkok' };
  const monthFormat = new Intl.DateTimeFormat('th-TH-u-ca-gregory', { ...zone, month: 'long', year: 'numeric' });
  const dayFormat = new Intl.DateTimeFormat('th-TH-u-ca-gregory', { ...zone, day: 'numeric', month: 'long', year: 'numeric' });
  const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();
  const iso = date => [date.year, String(date.month).padStart(2, '0'), String(date.day).padStart(2, '0')].join('-');
  const parseDay = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_DATE');
    const [year, month, day] = value.split('-').map(Number);
    if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) throw new Error('INVALID_DATE');
    return {year, month, day};
  };
  const normalize = value => {
    if (value === undefined || value?.kind === 'all') return { kind: 'all' };
    if (value?.kind === 'range') {
      parseDay(value.start); parseDay(value.end);
      if (value.start > value.end) throw new Error('REVERSED_RANGE');
      return {kind:'range', start:value.start, end:value.end};
    }
    if (!['month', 'day'].includes(value?.kind) || !Number.isInteger(value.year) || value.year < MIN_YEAR || value.year > MAX_YEAR || !Number.isInteger(value.month) || value.month < 1 || value.month > 12) throw new Error('INVALID_PERIOD');
    const period = { kind: value.kind, year: value.year, month: value.month };
    if (period.kind === 'day') {
      if (!Number.isInteger(value.day) || value.day < 1 || value.day > daysInMonth(value.year, value.month)) throw new Error('INVALID_DAY');
      period.day = value.day;
    }
    return period;
  };
  const range = value => {
    const period = normalize(value);
    if (period.kind === 'all') return null;
    if (period.kind === 'range') {
      const start = parseDay(period.start), end = parseDay(period.end);
      return {start:Date.UTC(start.year,start.month-1,start.day)/1000-25200, end:Date.UTC(end.year,end.month-1,end.day+1)/1000-25200};
    }
    const first = period.kind === 'day' ? period.day : 1;
    return {
      start: Date.UTC(period.year, period.month - 1, first) / 1000 - 25200,
      end: (period.kind === 'day' ? Date.UTC(period.year, period.month - 1, first + 1) : Date.UTC(period.year, period.month, 1)) / 1000 - 25200
    };
  };
  const label = value => {
    const period = normalize(value);
    if (period.kind === 'all') return 'ทุกเดือน · ทุกปี';
    if (period.kind === 'range') {
      const start = parseDay(period.start), end = parseDay(period.end);
      return dayFormat.format(Date.UTC(start.year,start.month-1,start.day)) + ' – ' + dayFormat.format(Date.UTC(end.year,end.month-1,end.day));
    }
    return (period.kind === 'day' ? dayFormat : monthFormat).format(Date.UTC(period.year, period.month - 1, period.day || 1));
  };
  const today = () => {
    const parts = new Intl.DateTimeFormat('en-CA', { ...zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    return Object.fromEntries(['year', 'month', 'day'].map(key => [key, Number(parts.find(part => part.type === key).value)]));
  };
  const mount = (host, { value = { kind: 'month', ...today() }, onChange = () => {} } = {}) => {
    let period, shown, rangeStart, rangeEnd;
    const assign = value => {
      period = normalize(value);
      shown = period.kind === 'range' ? parseDay(period.start) : {year:period.year || today().year, month:period.month || today().month, day:period.day || today().day};
      rangeStart = period.kind === 'range' ? period.start : null;
      rangeEnd = period.kind === 'range' ? period.end : null;
    };
    assign(value);
    const scope = () => period.kind === 'range' && (!rangeStart || !rangeEnd) ? null : normalize(
      period.kind === 'range' ? {kind:'range',start:rangeStart,end:rangeEnd} : period.kind === 'all' ? {kind:'all'} : {...shown,kind:period.kind}
    );
    const arrow = direction => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="${direction < 0 ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6'}"/></svg>`;
    host.innerHTML = `<style>
      .ps-calendar,.ps-calendar *{box-sizing:border-box}.ps-calendar{font:13px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Thonburi,Tahoma,sans-serif;color:#1c1e21;width:100%;max-width:344px;margin:auto}.ps-calendar button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}.ps-calendar button:focus-visible{outline:3px solid #0866ff;outline-offset:2px}.ps-calendar button:disabled{opacity:.3;cursor:default}.ps-calendar [hidden]{display:none!important}
      .ps-scopes{display:flex;padding:3px;gap:3px;background:#f0f2f5;border-radius:10px;margin-bottom:10px}.ps-scopes button{flex:1;min-width:0;border:0;background:transparent;color:#65676b;font-size:12px;padding:5px 4px;border-radius:7px;white-space:nowrap}.ps-scopes button[aria-pressed="true"]{background:#fff;color:#0866ff;font-weight:650;box-shadow:0 1px 4px #0000000c}
      .ps-month{border:1px solid #e6e9ef;border-radius:16px;background:#fff;box-shadow:0 3px 12px #1c1e2105;overflow:hidden}.ps-calendar-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 7px;gap:6px}.ps-month-title{font-size:16px;font-weight:700;white-space:nowrap}.ps-nav{border:0;background:transparent;color:#65676b;width:30px;height:30px;border-radius:9px;display:grid;place-items:center;padding:7px}.ps-nav:hover{background:#ebf3ff;color:#0866ff}.ps-nav svg{width:18px;height:18px}
      .ps-week,.ps-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;padding:0 12px}.ps-week{margin:2px 0 4px;color:#8a8d91;font-size:11px;text-align:center}.ps-week span{padding:2px 0}.ps-days button{border:0;background:transparent;border-radius:10px;height:31px;min-height:31px;padding:0;font-size:13px;color:#4b4f56}.ps-days button:hover{background:#eaf2ff;color:#0866ff}.ps-days .ps-other{color:#b7bbc2}.ps-days .ps-in-month{background:#f0f6ff;color:#0866ff}.ps-days button[aria-selected="true"]{background:#0866ff;color:#fff;font-weight:650;box-shadow:0 3px 7px #0866ff24}.ps-days [aria-current="date"]:not([aria-selected="true"]){box-shadow:inset 0 0 0 1.5px #0866ff;color:#0866ff}
      .ps-calendar-foot{display:flex;justify-content:space-between;border-top:1px solid #edf0f5;margin-top:8px;padding:3px}.ps-calendar-foot button{border:0;background:transparent;border-radius:7px;padding:4px 7px;color:#65676b;font-size:11px}.ps-calendar-foot button:hover{background:#ebf3ff;color:#0866ff}.ps-all{border:1px solid #e6e9ef;border-radius:16px;padding:44px 20px;text-align:center;background:#f8faff;color:#65676b}.ps-all strong{display:block;font-size:20px;color:#0866ff;margin-bottom:9px}.ps-all p{font-size:12px;margin:0}.ps-range-summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.ps-range-summary>div{background:#f5f7fa;border-radius:8px;padding:6px 9px;min-width:0}.ps-range-summary span{display:block;font-size:10px;color:#8a8d91}.ps-range-summary strong{display:block;font-size:11px;font-weight:600;color:#0866ff;margin-top:2px}
      @media(max-height:700px){.ps-scopes{margin-bottom:9px}.ps-calendar-head{padding-top:9px;padding-bottom:6px}.ps-days button{height:30px;min-height:30px}.ps-calendar-foot{margin-top:8px;padding:6px}}
    </style><div class="ps-calendar"><div class="ps-scopes" role="group" aria-label="เลือกรูปแบบช่วงเวลา"><button type="button" data-scope="all">ทั้งหมด</button><button type="button" data-scope="day">วันที่</button><button type="button" data-scope="month">เดือน</button><button type="button" data-scope="range">ช่วงวันที่</button></div><section class="ps-month" aria-label="ปฏิทินเลือกช่วงเวลาที่ลบ"><div class="ps-calendar-head"><button type="button" class="ps-nav" data-move="-1" aria-label="เดือนก่อน">${arrow(-1)}</button><strong class="ps-month-title" aria-live="polite"></strong><button type="button" class="ps-nav" data-move="1" aria-label="เดือนถัดไป">${arrow(1)}</button></div><div class="ps-week" aria-hidden="true"><span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span></div><div class="ps-days" role="grid" aria-label="เลือกวันที่"></div><div class="ps-calendar-foot"><button type="button" data-year="-1">ปีก่อน</button><button type="button" data-today>วันนี้</button><button type="button" data-year="1">ปีถัดไป</button></div></section><div class="ps-all" hidden><strong>ทุกเดือน · ทุกปี</strong><p>จัดการโพสต์ทั้งหมดที่ย้ายไปถังขยะได้</p></div><div class="ps-range-summary" hidden><div><span>วันเริ่มต้น</span><strong class="ps-range-start">เลือกวันแรก</strong></div><div><span>วันสิ้นสุด</span><strong class="ps-range-end">เลือกวันสุดท้าย</strong></div></div></div>`;
    const $ = selector => host.querySelector(selector);
    const render = () => {
      shown.day = Math.min(shown.day || 1, daysInMonth(shown.year, shown.month));
      $('.ps-range-summary').hidden = period.kind !== 'range';
      const short = value => {
        if (!value) return null;
        const p = parseDay(value);
        return new Intl.DateTimeFormat('th-TH-u-ca-gregory',{...zone,day:'numeric',month:'short',year:'numeric'}).format(Date.UTC(p.year,p.month-1,p.day));
      };
      $('.ps-range-start').textContent = short(rangeStart) || 'เลือกวันแรก';
      $('.ps-range-end').textContent = short(rangeEnd) || 'เลือกวันสุดท้าย';
      for (const button of host.querySelectorAll('[data-scope]')) button.setAttribute('aria-pressed', String(button.dataset.scope === period.kind));
      $('.ps-month').hidden = period.kind === 'all'; $('.ps-all').hidden = period.kind !== 'all';
      $('.ps-month-title').textContent = monthFormat.format(Date.UTC(shown.year, shown.month - 1, 1));
      $('[data-move="-1"]').disabled = shown.year === MIN_YEAR && shown.month === 1;
      $('[data-move="1"]').disabled = shown.year === MAX_YEAR && shown.month === 12;
      $('[data-year="-1"]').disabled = shown.year <= MIN_YEAR;
      $('[data-year="1"]').disabled = shown.year >= MAX_YEAR;
      const offset = new Date(Date.UTC(shown.year, shown.month - 1, 1)).getUTCDay();
      const current = today();
      $('.ps-days').replaceChildren();
      for (let cell = 0; cell < 42; cell++) {
        const date = new Date(Date.UTC(shown.year, shown.month - 1, cell - offset + 1));
        const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1, day = date.getUTCDate();
        const inMonth = year === shown.year && month === shown.month;
        const dateKey = iso({year,month,day});
        const inRange = period.kind === 'range' && rangeStart && rangeEnd && dateKey >= rangeStart && dateKey <= rangeEnd;
        const selected = period.kind === 'range' ? dateKey === rangeStart || dateKey === rangeEnd : inMonth && period.kind === 'day' && day === shown.day;
        const button = document.createElement('button'); button.type = 'button'; button.textContent = day;
        button.dataset.date = [year, month, day].join('-'); button.dataset.day = day;
        button.className = inRange || (inMonth && period.kind === 'month') ? 'ps-in-month' : inMonth ? '' : 'ps-other';
        button.setAttribute('role', 'gridcell'); button.setAttribute('aria-selected', String(selected));
        button.setAttribute('aria-label', `${period.kind === 'range' ? 'เลือกวันที่' : 'ลบเฉพาะวันที่'} ${dayFormat.format(date)}`);
        if (year === current.year && month === current.month && day === current.day) button.setAttribute('aria-current', 'date');
        button.tabIndex = inMonth && day === shown.day ? 0 : -1;
        button.disabled = year < MIN_YEAR || year > MAX_YEAR;
        $('.ps-days').append(button);
      }
    };
    const changed = focus => { render(); onChange(scope()); if (focus) $(focus)?.focus({ preventScroll: true }); };
    const move = months => {
      const date = new Date(Date.UTC(shown.year, shown.month - 1 + months, 1));
      if (date.getUTCFullYear() < MIN_YEAR || date.getUTCFullYear() > MAX_YEAR) return;
      shown.year = date.getUTCFullYear(); shown.month = date.getUTCMonth() + 1;
    };
    const chooseDay = date => {
      shown = date;
      if (period.kind === 'range') {
        const key = iso(date);
        if (!rangeStart || rangeEnd) { rangeStart = key; rangeEnd = null; }
        else [rangeStart, rangeEnd] = [rangeStart, key].sort();
      } else period.kind = 'day';
    };
    host.addEventListener('click', event => {
      const button = event.target.closest('button'); if (!button || !host.contains(button) || button.disabled) return;
      if (button.dataset.scope) {
        if (button.dataset.scope === 'range' && period.kind !== 'range') { rangeStart = null; rangeEnd = null; }
        period.kind = button.dataset.scope; changed(`[data-scope="${period.kind}"]`);
      }
      else if (button.dataset.move) { move(Number(button.dataset.move)); changed(`[data-move="${button.dataset.move}"]`); }
      else if (button.dataset.year) { move(Number(button.dataset.year) * 12); changed(`[data-year="${button.dataset.year}"]`); }
      else if (button.hasAttribute('data-today')) { chooseDay(today()); changed('[data-today]'); }
      else if (button.dataset.date) {
        const [year, month, day] = button.dataset.date.split('-').map(Number); chooseDay({year,month,day}); changed(`[data-date="${button.dataset.date}"]`);
      }
    });
    host.addEventListener('keydown', event => {
      const button = event.target.closest('[data-date]');
      const delta = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
      if (!button || !delta) return;
      event.preventDefault(); event.stopPropagation();
      const [year, month, day] = button.dataset.date.split('-').map(Number);
      const next = new Date(Date.UTC(year, month - 1, day + delta));
      if (next.getUTCFullYear() < MIN_YEAR || next.getUTCFullYear() > MAX_YEAR) return;
      shown = {year:next.getUTCFullYear(),month:next.getUTCMonth()+1,day:next.getUTCDate()};
      if (period.kind !== 'range') period.kind = 'day';
      changed(`[data-date="${shown.year}-${shown.month}-${shown.day}"]`);
    });
    render();
    return {
      getValue: () => scope(),
      setValue: value => { assign(value); render(); },
      focus: () => $(`[data-scope="${period.kind}"]`).focus({preventScroll:true})
    };
  };
  Object.assign(mount, { normalize, range, label, today, parseDay });
  globalThis.mountPostSweepCalendar = mount;
})();

// Runs only inside the Facebook tab via chrome.scripting (MAIN world).
// No token, cookie, or raw request is returned to the extension or written to disk.
export async function facebookRequest(request) {
  const CATEGORY = 'MANAGEPOSTSPHOTOSANDVIDEOS';
  const FALLBACK_IDS = {
    CometActivityLogMainContentRootQuery: '28290295330568241',
    CometActivityLogItemCurationMutation: '24411931498505270'
  }; // Public operation identifiers observed in the supplied HAR, 2026-09-13.
  let sentMutation = false;
  const fail = (code, message, uncertain = false) => ({ ok: false, code, message, uncertain });
  const read = name => { try { return window.require(name); } catch { return undefined; } };
  const string = value => typeof value === 'string' ? value : '';
  try {
    const url = new URL(location.href);
    if (url.protocol !== 'https:' || !['www.facebook.com', 'web.facebook.com', 'facebook.com'].includes(url.hostname)) {
      return fail('WRONG_SITE', 'เปิดส่วนขยายจากแท็บ Facebook เท่านั้น');
    }
    if (!request || !['identify', 'connect', 'scan', 'trash'].includes(request.kind)) return fail('INVALID_REQUEST', 'คำสั่งไม่ถูกต้อง');
    const user = read('CurrentUserInitialData');
    const getParams = read('getAsyncParams');
    if (!user?.USER_ID || user.USER_ID === '0' || typeof getParams !== 'function') {
      return fail('NOT_READY', 'ข้อมูลบัญชียังไม่พร้อม ลองรีเฟรชแท็บ Facebook แล้วเปิดส่วนขยายอีกครั้ง');
    }
    const params = getParams('POST');
    const accountId = String(user.ACCOUNT_ID || params.__user || user.USER_ID);
    const pathActor = url.pathname.split('/').filter(Boolean).slice(-2)[0];
    const sessionActorId = String(user.USER_ID);
    if (request.kind === 'identify') return { ok: true, actor: { id: sessionActorId, name: string(user.NAME) || sessionActorId } };
    if (request.expectedActorId && request.expectedActorId !== sessionActorId) return fail('ACTOR_CHANGED', 'เพจหรือโปรไฟล์เปลี่ยนไปแล้ว เลือกโปรไฟล์และเริ่มงานใหม่');
    if (!/\/allactivity\/?$/.test(url.pathname) || url.searchParams.get('category_key') !== CATEGORY) {
      return fail('WRONG_PAGE', 'เปิดบันทึกกิจกรรมของโปรไฟล์ที่กำลังใช้ แล้วเริ่มงานจากส่วนขยายอีกครั้ง');
    }
    const numericTarget = pathActor && /^\d+$/.test(pathActor) ? pathActor : null;
    const ownIdentities = new Set([sessionActorId, accountId]);
    if (numericTarget && !ownIdentities.has(numericTarget)) {
      return fail('ACTOR_MISMATCH', 'บัญชีที่ล็อกอินไม่ตรงกับเจ้าของลิงก์บันทึกกิจกรรม ให้สลับเป็นบัญชีเจ้าของโพสต์ก่อน');
    }
    // Facebook can show an account's activity log while the top-right profile is a Page.
    // The captured requests address that account explicitly through `av`, not the Page's ID.
    const actorId = numericTarget || String(params.av || sessionActorId);
    if (request.expectedActorId && actorId !== request.expectedActorId) return fail('ACTOR_MISMATCH', 'หน้าบันทึกกิจกรรมไม่ตรงกับโปรไฟล์ที่เลือก ยังไม่ได้เริ่มลบ');
    if (!ownIdentities.has(actorId)) return fail('ACTOR_MISMATCH', 'บริบทบัญชีไม่ตรงกัน ให้รีเฟรชหน้า Facebook ก่อน');
    const context = { actorId, accountId, sessionActorId, origin: url.origin, path: url.pathname, name: actorId === sessionActorId ? string(user.NAME) || actorId : 'บัญชีเจ้าของบันทึกกิจกรรม' };
    if (request.context && ['actorId', 'accountId', 'sessionActorId', 'origin', 'path'].some(key => request.context[key] !== context[key])) {
      return fail('CONTEXT_CHANGED', 'บัญชีหรือหน้า Facebook เปลี่ยนไปแล้ว หยุดงานและโหลดรายการใหม่ก่อน');
    }
    if (request.kind === 'connect') return { ok: true, context };
    if (!request.context) return fail('NO_CONTEXT', 'ต้องเชื่อมต่อบัญชีก่อน');
    if (!params.fb_dtsg) return fail('SESSION_EXPIRED', 'เซสชัน Facebook ไม่พร้อม ให้รีเฟรชหน้าแล้วเชื่อมต่อใหม่');

    // Validate the immutable run scope again at the network boundary.
    const period = request.period === undefined ? { kind: 'all' } : request.period;
    let bounds = null;
    try {
      const parts = value => {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_DATE');
        const [year, month, day] = value.split('-').map(Number);
        if (year < 2004 || year > 2200 || month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) throw new Error('INVALID_DATE');
        return {year,month,day};
      };
      const midnight = date => Date.UTC(date.year, date.month - 1, date.day) / 1000 - 25200;
      if (!period || !['all', 'month', 'day', 'range'].includes(period.kind)) throw new Error('INVALID_PERIOD');
      if (period.kind === 'range') {
        const start = parts(period.start), end = parts(period.end);
        if (period.start > period.end) throw new Error('REVERSED_RANGE');
        bounds = {start:midnight(start),end:midnight(end)+86400};
      } else if (period.kind !== 'all') {
        if (!Number.isInteger(period.year) || period.year < 2004 || period.year > 2200 || !Number.isInteger(period.month) || period.month < 1 || period.month > 12) throw new Error('INVALID_PERIOD');
        if (period.kind === 'day' && (!Number.isInteger(period.day) || period.day < 1 || period.day > new Date(Date.UTC(period.year, period.month, 0)).getUTCDate())) throw new Error('INVALID_DAY');
        const start = midnight({...period,day:period.day && period.kind === 'day' ? period.day : 1});
        bounds = {start,end:period.kind === 'day' ? start+86400 : Date.UTC(period.year,period.month,1)/1000-25200};
      }
    } catch { return fail('INVALID_PERIOD', 'ช่วงเวลาที่เลือกไม่ถูกต้อง ยังไม่ได้เริ่มลบ'); }

    const mutation = request.kind === 'trash';
    const operation = mutation ? 'CometActivityLogItemCurationMutation' : 'CometActivityLogMainContentRootQuery';
    const module = read(`${operation}.graphql`);
    const documentId = module?.params?.id || FALLBACK_IDS[operation];
    let variables;
    if (mutation) {
      const post = request.post;
      if (!post?.canTrash || typeof post.storyId !== 'string' || !post.storyId || !/^\d+$/.test(String(post.postId))) {
        return fail('INVALID_POST', 'โพสต์นี้ไม่มีคำสั่งย้ายไปถังขยะที่รองรับ');
      }
      if (bounds) {
        if (!Number.isFinite(post.createdAt) || post.createdAt < bounds.start || post.createdAt >= bounds.end) {
          return fail('OUTSIDE_PERIOD', 'วันที่ของโพสต์ไม่อยู่ในช่วงที่เลือก จึงไม่ได้ส่งคำสั่งลบ');
        }
      }
      variables = { input: {
        action: 'MOVE_TO_TRASH', category_key: CATEGORY, deletion_request_id: null,
        post_id_str: String(post.postId), story_id: post.storyId, story_location: 'ACTIVITY_LOG',
        structured_error_handling: true, actor_id: actorId, client_mutation_id: crypto.randomUUID()
      } };
    } else {
      // Scan the supported unfiltered connection and filter creation_time locally.
      // Never assume pages are date-sorted, or stop at an out-of-month item.
      variables = {
        activity_history: false, audience: null, ayi_taxonomy: true,
        category: CATEGORY, category_key: CATEGORY, count: 25,
        cursor: request.cursor || null, entry_point: null, media_content_filters: [], month: null,
        person_id: null, privacy: 'NONE', scale: Math.min(devicePixelRatio || 1, 2), timeline_visibility: 'ALL', year: null
      };
    }
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value != null) body.set(key, String(value));
    body.set('av', actorId);
    body.set('fb_api_caller_class', 'RelayModern');
    body.set('fb_api_req_friendly_name', operation);
    body.set('server_timestamps', 'true');
    body.set('variables', JSON.stringify(variables));
    body.set('doc_id', String(documentId));
    const aborter = new AbortController();
    const timeout = setTimeout(() => aborter.abort(), 25000);
    let response, raw;
    try {
      sentMutation = mutation;
      response = await fetch('/api/graphql/', {
        method: 'POST', credentials: 'same-origin', redirect: 'error',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-FB-Friendly-Name': operation },
        body: body.toString(), signal: aborter.signal
      });
      raw = await response.text();
    } finally { clearTimeout(timeout); }
    if (!response.ok) {
      return fail(response.status === 429 ? 'RATE_LIMIT' : 'HTTP_ERROR',
        response.status === 429 ? 'Facebook จำกัดความเร็วชั่วคราว งานหยุดแล้ว ให้พักก่อนเริ่มใหม่' : `Facebook ตอบกลับ HTTP ${response.status} กรุณาตรวจสถานะในบันทึกกิจกรรม`, mutation);
    }
    const clean = raw.replace(/^\s*for\s*\(\s*;\s*;\s*\)\s*;\s*/, '').trim();
    let packets;
    try { packets = [JSON.parse(clean)]; }
    catch { try { packets = clean.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line)); }
      catch { return fail('INVALID_RESPONSE', 'อ่านผลตอบกลับจาก Facebook ไม่ได้ กรุณาตรวจรายการบน Facebook ก่อนลองอีกครั้ง', mutation); } }
    const errors = packets.flatMap(packet => packet.errors || []);
    const envelopeError = packets.find(packet => packet.error);
    if (errors.length || envelopeError) {
      const code = errors[0]?.code || envelopeError?.error || '';
      return fail('FACEBOOK_ERROR', `Facebook ไม่รับคำสั่ง${code ? ` (รหัส ${code})` : ''} งานหยุดแล้ว กรุณากลับไปตรวจหน้า Facebook`, mutation);
    }
    if (mutation) {
      const result = packets.map(packet => packet.data?.activity_log_story_curation).find(Boolean);
      if (result?.success === false || result?.error) return fail('REJECTED', 'Facebook ไม่อนุญาตให้ย้ายโพสต์นี้ งานหยุดแล้ว');
      if (result?.success !== true || result.story?.id !== request.post.storyId) {
        return fail('UNCONFIRMED', 'ยังยืนยันผลของโพสต์นี้ไม่ได้ กรุณาตรวจถังขยะก่อนลองอีกครั้ง', true);
      }
      return { ok: true, storyId: request.post.storyId };
    }
    const viewer = packets.map(packet => packet.data?.viewer).find(viewer => viewer?.activity_log_actor?.activity_log_stories);
    const actor = viewer?.activity_log_actor;
    if (!actor || String(actor.id) !== actorId || (viewer.actor?.id && String(viewer.actor.id) !== actorId)) {
      return fail('RESPONSE_ACTOR', 'ข้อมูลที่ Facebook ส่งกลับไม่ตรงบัญชี หรือโครงสร้างหน้าเปลี่ยนไป งานหยุดแล้ว');
    }
    const connection = actor.activity_log_stories;
    if (!Array.isArray(connection.edges) || typeof connection.page_info?.has_next_page !== 'boolean') {
      return fail('SCHEMA_CHANGED', 'โครงสร้างรายการ Facebook เปลี่ยนไป ต้องปรับส่วนขยายก่อนใช้งาน');
    }
    const posts = connection.edges.map(edge => {
      const node = edge.node || {};
      return {
        storyId: string(node.id), postId: node.post_id == null ? '' : String(node.post_id),
        createdAt: Number(node.creation_time) || 0,
        canTrash: Array.isArray(edge.options) && edge.options.some(option => option.key === 'MOVE_TO_TRASH')
          && Boolean(node.id) && /^\d+$/.test(String(node.post_id))
      };
    }).filter(post => post.storyId);
    return { ok: true, context, posts, cursor: connection.page_info.end_cursor || null, hasNext: connection.page_info.has_next_page };
  } catch (error) {
    return fail('CONNECTION_ERROR', error?.name === 'AbortError'
      ? 'Facebook ตอบกลับช้าเกินไป งานหยุดแล้ว กรุณาตรวจสถานะก่อนลองอีกครั้ง'
      : 'เชื่อมต่อ Facebook ไม่สำเร็จ ลองกลับไปตรวจแท็บ Facebook และโหลดรายการใหม่', sentMutation);
  }
}

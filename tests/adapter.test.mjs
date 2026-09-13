import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../facebook.js', import.meta.url), 'utf8').replace('export async function', 'async function');
const sample = JSON.parse(readFileSync(new URL('fixtures/activity-log.json', import.meta.url), 'utf8'));
const actor = sample.data.viewer.activity_log_actor.id;
const pageURL = `https://www.facebook.com/${actor}/allactivity?category_key=MANAGEPOSTSPHOTOSANDVIDEOS`;
const context = {actorId:actor,accountId:'test-account',sessionActorId:actor,origin:'https://www.facebook.com',path:`/${actor}/allactivity`,name:'ทดสอบ'};
const first = sample.data.viewer.activity_log_actor.activity_log_stories.edges[0].node;
const post = {storyId:first.id,postId:first.post_id,canTrash:true};
const secret = 'TEST_TOKEN_MUST_STAY_IN_PAGE';

function harness({ url = pageURL, response = sample, userId = actor, accountId = 'test-account', status = 200, throwFetch = false, documentId } = {}) {
  const calls = [];
  const modules = {
    CurrentUserInitialData:{ USER_ID:userId, ACCOUNT_ID:accountId, NAME:'ทดสอบ' },
    getAsyncParams:() => ({__user:accountId,fb_dtsg:secret,lsd:'TEST_LSD',__req:'x'})
  };
  if(documentId)modules['CometActivityLogMainContentRootQuery.graphql']={params:{id:documentId}};
  const sandbox = vm.createContext({URL,URLSearchParams,AbortController,setTimeout,clearTimeout,crypto:webcrypto,devicePixelRatio:2,location:{href:url},window:{require:name=>modules[name]},fetch:async (url,options)=>{
    calls.push({url,options,body:new URLSearchParams(options.body)});
    if(throwFetch)throw new Error('offline');
    return {ok:status<400,status,text:async()=>typeof response==='string'?response:JSON.stringify(response)};
  }});
  vm.runInContext(source,sandbox);
  return {calls,run:request=>sandbox.facebookRequest(request)};
}
test('representative activity response parses and returns only post metadata', async()=>{
  const h=harness();const r=await h.run({kind:'scan',context});
  assert.equal(r.ok,true);assert.equal(r.posts.length,25);assert.equal(r.context.actorId,actor);assert.equal(r.posts[0].canTrash,true);
  assert(!JSON.stringify(r).includes(secret));assert(!JSON.stringify(r).includes('www_uri'));
  const body=h.calls[0].body;assert.equal(body.get('av'),actor);assert.equal(body.get('fb_dtsg'),secret);assert.equal(body.get('doc_id'),'28290295330568241');
  assert.equal(JSON.parse(body.get('variables')).category_key,'MANAGEPOSTSPHOTOSANDVIDEOS');
});
test('connect never makes a network request',async()=>{const h=harness();assert.equal((await h.run({kind:'connect'})).ok,true);assert.equal(h.calls.length,0)});
test('account-owned log works while the current profile is a Page',async()=>{const h=harness({userId:'99999',accountId:actor});const c=await h.run({kind:'connect'});assert.equal(c.ok,true);assert.equal(c.context.actorId,actor);assert.equal(c.context.sessionActorId,'99999');assert.equal((await h.run({kind:'scan',context:c.context})).ok,true);assert.equal(h.calls[0].body.get('av'),actor)});
test('wrong logged-in account is blocked before any request',async()=>{const h=harness({userId:'999'});const r=await h.run({kind:'trash',context,post});assert.equal(r.code,'ACTOR_MISMATCH');assert.equal(h.calls.length,0)});
test('account switch during job is blocked',async()=>{const h=harness({accountId:'another-account'});assert.equal((await h.run({kind:'trash',context,post})).code,'CONTEXT_CHANGED');assert.equal(h.calls.length,0)});
test('origin and category must match exactly',async()=>{for(const url of ['https://facebook.com.attacker.example/me/allactivity','http://www.facebook.com/me/allactivity','https://www.facebook.com/me/allactivity?category_key=TRASH','https://www.facebook.com/']){const h=harness({url});assert.equal((await h.run({kind:'trash',context,post})).ok,false);assert.equal(h.calls.length,0)}});
test('unknown command cannot be used for a mutation',async()=>{const h=harness();assert.equal((await h.run({kind:'DELETE',context,post})).ok,false);assert.equal(h.calls.length,0)});
test('a server-disabled post cannot be trashed',async()=>{const h=harness();assert.equal((await h.run({kind:'trash',context,post:{...post,canTrash:false}})).code,'INVALID_POST');assert.equal(h.calls.length,0)});
test('live module identifier takes precedence over HAR fallback',async()=>{const h=harness({documentId:'9000123'});assert.equal((await h.run({kind:'scan',context})).ok,true);assert.equal(h.calls[0].body.get('doc_id'),'9000123')});
test('mutation must acknowledge the exact story ID',async()=>{
  const h=harness({response:{data:{activity_log_story_curation:{success:true,error:null,story:{id:post.storyId}}}}});
  const r=await h.run({kind:'trash',context,post});assert.equal(r.ok,true);
  const input=JSON.parse(h.calls[0].body.get('variables')).input;
  assert.equal(input.action,'MOVE_TO_TRASH');assert.equal(input.actor_id,actor);assert.equal(input.story_id,post.storyId);assert.equal(input.post_id_str,String(post.postId));assert.equal(input.structured_error_handling,true);
  const wrong=harness({response:{data:{activity_log_story_curation:{success:true,story:{id:'wrong'}}}}});assert.equal((await wrong.run({kind:'trash',context,post})).uncertain,true);
});
test('representative mutation acknowledgement matches parser',async()=>{const response=JSON.parse(readFileSync(new URL('fixtures/mutation.json',import.meta.url),'utf8'));const target={...post,storyId:response.data.activity_log_story_curation.story.id};assert.equal((await harness({response}).run({kind:'trash',context,post:target})).ok,true)});
test('rate limit, lost connection and malformed success are uncertain, not retried',async()=>{
  for(const option of [{status:429},{throwFetch:true},{response:'<html>login</html>'},{response:{data:{activity_log_story_curation:{success:true}}}}]){const h=harness(option);const r=await h.run({kind:'trash',context,post});assert.equal(r.ok,false);assert.equal(r.uncertain,true);assert.equal(h.calls.length,1)}
});
test('structured rejection is a failure without success or retry',async()=>{const h=harness({response:{data:{activity_log_story_curation:{success:false,error:{code:1}}}}});const r=await h.run({kind:'trash',context,post});assert.equal(r.code,'REJECTED');assert.equal(r.uncertain,false);assert.equal(h.calls.length,1)});
test('GraphQL errors prevent accepting partial success',async()=>{const h=harness({response:{errors:[{code:190,message:secret}],data:sample.data}});const r=await h.run({kind:'scan',context});assert.equal(r.ok,false);assert(!JSON.stringify(r).includes(secret))});
test('newline streaming and anti-JSON prefix parse correctly',async()=>{const h=harness({response:'for (;;);'+JSON.stringify(sample)+'\n'+JSON.stringify({extensions:{is_final:true}})});assert.equal((await h.run({kind:'scan',context})).posts.length,25)});
test('returned actor must match the connected identity',async()=>{const response=structuredClone(sample);response.data.viewer.activity_log_actor.id='wrong';const h=harness({response});assert.equal((await h.run({kind:'scan',context})).code,'RESPONSE_ACTOR')});
test('scan returns only identifiers, dates and eligibility, excluding post content and links',async()=>{
 const response=structuredClone(sample);const edge=response.data.viewer.activity_log_actor.activity_log_stories.edges[0];
 edge.options=[];edge.node.title={text:'PRIVATE_TEST_TITLE'};edge.node.message={text:'PRIVATE_TEST_MESSAGE'};
 edge.node.attached_story={message:{text:'PRIVATE_TEST_ATTACHMENT'}};edge.node.url='https://www.facebook.com/123/posts/1000?test=PRIVATE_TEST_LINK';
 const r=await harness({response}).run({kind:'scan',context});assert.equal(r.posts[0].canTrash,false);
 assert.deepEqual(Object.keys(r.posts[0]).sort(),['canTrash','createdAt','postId','storyId']);
 assert(!JSON.stringify(r).includes('PRIVATE_TEST_'));
});
test('changed schema fails closed',async()=>{const response=structuredClone(sample);delete response.data.viewer.activity_log_actor.activity_log_stories.page_info;assert.equal((await harness({response}).run({kind:'scan',context})).code,'SCHEMA_CHANGED')});

const september = { kind: 'month', year: 2026, month: 9 };
const successfulMutation = { data: { activity_log_story_curation: { success: true, story: { id: post.storyId } } } };
test('month boundaries include Bangkok midnight and exclude the next month', async () => {
  for (const [iso, allowed] of [
    ['2026-08-31T16:59:59Z', false], ['2026-08-31T17:00:00Z', true],
    ['2026-09-30T16:59:59Z', true], ['2026-09-30T17:00:00Z', false],
    ['2025-09-15T12:00:00Z', false]
  ]) {
    const h = harness({ response: successfulMutation });
    const result = await h.run({ kind: 'trash', context, period: september, post: { ...post, createdAt: Date.parse(iso) / 1000 } });
    assert.equal(result.ok, allowed, iso); assert.equal(h.calls.length, allowed ? 1 : 0, iso);
    if (!allowed) { assert.equal(result.code, 'OUTSIDE_PERIOD'); assert.equal(result.uncertain, false); }
  }
});
test('leap day and December rollover use exclusive month end', async () => {
  for (const [period, iso, allowed] of [
    [{kind:'month',year:2024,month:2}, '2024-02-29T16:59:59Z', true],
    [{kind:'month',year:2024,month:2}, '2024-02-29T17:00:00Z', false],
    [{kind:'month',year:2025,month:12}, '2025-12-31T16:59:59Z', true],
    [{kind:'month',year:2025,month:12}, '2025-12-31T17:00:00Z', false]
  ]) {
    const h = harness({response:successfulMutation});
    assert.equal((await h.run({kind:'trash',context,period,post:{...post,createdAt:Date.parse(iso)/1000}})).ok,allowed,iso);
    assert.equal(h.calls.length,allowed?1:0);
  }
});
test('unknown or malformed post dates cannot pass a monthly mutation guard', async () => {
  for (const createdAt of [undefined, null, 0, -1, NaN, Infinity, '1789223599']) {
    const h = harness({response:successfulMutation});
    assert.equal((await h.run({kind:'trash',context,period:september,post:{...post,createdAt}})).code,'OUTSIDE_PERIOD');
    assert.equal(h.calls.length,0);
  }
});
test('malformed scopes fail before any request rather than widening to all dates', async () => {
  for (const period of [null, {}, {kind:'year'}, {kind:'month',year:2026,month:0}, {kind:'month',year:2026,month:13}, {kind:'month',year:'2026',month:9}, {kind:'month',year:2003,month:9}]) {
    for (const kind of ['scan','trash']) {
      const h = harness(); assert.equal((await h.run({kind,context,period,post})).code,'INVALID_PERIOD'); assert.equal(h.calls.length,0);
    }
  }
});
test('monthly scanning retains every date for controller filtering and pagination', async () => {
  const h = harness(); const r = await h.run({kind:'scan',context,period:september,cursor:'test-cursor'});
  assert.equal(r.ok,true); assert.equal(r.posts.length,25); assert.equal(r.posts[0].createdAt,1700000000);
  const variables = JSON.parse(h.calls[0].body.get('variables'));
  assert.equal(variables.year,null); assert.equal(variables.month,null); assert.equal(variables.cursor,'test-cursor');
});
test('all-dates mode still accepts an eligible post without a timestamp', async () => {
  const h = harness({response:successfulMutation});
  assert.equal((await h.run({kind:'trash',context,period:{kind:'all'},post})).ok,true);
});
test('day and inclusive cross-month ranges are enforced before mutations', async () => {
  for (const period of [{kind:'day',year:2026,month:9,day:12},{kind:'range',start:'2026-09-12',end:'2026-10-02'}]) {
    const end=period.kind==='day'?'2026-09-12T17:00:00Z':'2026-10-02T17:00:00Z';
    for(const [stamp,allowed] of [[Date.parse('2026-09-11T17:00:00Z')/1000,true],[Date.parse('2026-09-11T16:59:59Z')/1000,false],[Date.parse(end)/1000-1,true],[Date.parse(end)/1000,false]]) {
      const h=harness({response:successfulMutation});assert.equal((await h.run({kind:'trash',context,period,post:{...post,createdAt:stamp}})).ok,allowed);assert.equal(h.calls.length,allowed?1:0);
    }
  }
});
test('impossible dates and incomplete or reversed ranges are rejected',async()=>{
  for(const period of [{kind:'day',year:2026,month:2,day:29},{kind:'range',start:'2026-09-12'},{kind:'range',start:'2026-9-01',end:'2026-09-02'},{kind:'range',start:'2026-02-30',end:'2026-03-02'},{kind:'range',start:'2026-09-12',end:'2026-09-01'}]) {
    const h=harness();assert.equal((await h.run({kind:'trash',context,period,post})).code,'INVALID_PERIOD');assert.equal(h.calls.length,0);
  }
});
test('profile preview reads the active Page from any Facebook page without a request',async()=>{
  const h=harness({url:'https://www.facebook.com/',userId:'99999',accountId:actor});const r=await h.run({kind:'identify'});assert.equal(r.ok,true);assert.equal(r.actor.id,'99999');assert.equal(h.calls.length,0);assert(!JSON.stringify(r).includes(secret));
});
test('a profile change after popup selection blocks connection and all mutation',async()=>{
  const h=harness();assert.equal((await h.run({kind:'connect',expectedActorId:'99999'})).code,'ACTOR_CHANGED');assert.equal(h.calls.length,0);
  const page=harness({userId:'99999',accountId:actor});assert.equal((await page.run({kind:'connect',expectedActorId:'99999'})).code,'ACTOR_MISMATCH');assert.equal(page.calls.length,0);
});

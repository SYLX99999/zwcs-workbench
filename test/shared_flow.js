/* 跨客户端共享集成测试：财务 / 管理员 / 会员 三个独立"设备"，
 * 各自 localStorage 独立，但连同一个后端(8090)，验证数据真正共享。 */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const ROOT = path.resolve('.');
const ORIGIN = 'http://127.0.0.1:8080';
const SCRIPTS = ['js/icons.js', 'js/seed-members.js', 'js/seed-courses.js', 'js/seed-leads.js', 'js/seed-salary.js',
  'js/store.js', 'js/ui.js', 'js/app.js', 'js/pages.learn.js', 'js/pages.crm.js', 'js/pages.member.js', 'js/pages.admin.js'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

let pass = 0, fail = 0; const fails = [];
function ok(name, cond) { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; fails.push(name); console.log('  ✗ ' + name); } }

function boot(portal) {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), {
    url: ORIGIN + '/index.html?portal=' + portal, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.scrollTo = () => {};
      w.fetch = (...a) => globalThis.fetch(...a);   // Node 22 全局 fetch 直连后端
      const s = {}; Object.defineProperty(w, 'localStorage', {
        value: { getItem: k => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: k => { delete s[k]; }, clear: () => { Object.keys(s).forEach(k => delete s[k]); } },
        configurable: true
      });
    }
  });
  const w = dom.window;
  SCRIPTS.forEach(f => { const el = w.document.createElement('script'); el.textContent = fs.readFileSync(f, 'utf8'); w.document.body.appendChild(el); });
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return w;
}
async function srvLogin(uid, pwd) {
  const r = await globalThis.fetch(ORIGIN + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid, pwd }) });
  return (await r.json()).token;
}
async function srvGet(names, token) {
  const r = await globalThis.fetch(ORIGIN + '/api/tables?names=' + encodeURIComponent(names.join(',')), { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  return (await r.json());
}

(async function () {
  console.log('═══ 跨客户端共享集成测试 ═══');
  const stamp = Date.now();
  const SAL_NAME = '共享测试_' + stamp;
  const MEM_NAME = '会员李四_' + stamp;

  /* ---- 1. 财务(PC) 登录并提交工资 ---- */
  console.log('\n[1] 财务端：登录 + 提交工资');
  const wf = boot('pc');
  await wf.DB.kickSync();
  ok('财务端探测到后端(在线)', wf.DB.online() === true);
  const inp = wf.document.querySelectorAll('.pc-card input');
  inp[0].value = 'HQ0002'; inp[1].value = '888888';
  const btn = [].find.call(wf.document.querySelectorAll('.pc-card .btn'), b => /登\s*录/.test(b.textContent));
  btn.dispatchEvent(new wf.MouseEvent('click', { bubbles: true }));
  await sleep(600);
  ok('财务登录成功(角色 finance)', !!(wf.App.user && wf.App.user.role === 'finance'));
  wf.DB.addSalaryBatch(2026, 8, [{ name: SAL_NAME, position: '会计', base: 5000, perf: 1000, att: 300, social: 500, meal: 200, dedAbs: 0, dedOth: 0 }], '李文静');
  ok('财务本地已写入工资', wf.DB.S.salary.some(x => x.name === SAL_NAME));
  await sleep(700); // 等待 debounce 推回后端

  /* ---- 2. 服务端确实收到了 ---- */
  console.log('\n[2] 服务端已收到财务提交');
  const atok = await srvLogin('HQ0001', '888888');
  const sv = await srvGet(['salary'], atok);
  ok('服务端工资表含该条(待审核)', sv.tables.salary.some(x => x.name === SAL_NAME && x.status === 'pending'));

  /* ---- 3. 管理员(PC) 另一"设备" 登录后能看到 ---- */
  console.log('\n[3] 管理员端：登录并看到财务提交(共享)');
  const wa = boot('pc');
  await wa.DB.kickSync();
  ok('管理员端探测到后端(在线)', wa.DB.online() === true);
  const r2 = await wa.DB.apiLogin('HQ0001', '888888');
  ok('管理员后端登录成功', r2.ok === true);
  await wa.DB.syncAuth(r2.token);
  ok('管理员端看到财务提交的工资(共享)', wa.DB.S.salary.some(x => x.name === SAL_NAME));

  /* ---- 4. 会员(手机) 报名 ---- */
  console.log('\n[4] 会员端：手机报名');
  const wm = boot('mobile');
  await wm.DB.kickSync();
  ok('会员端探测到后端(在线)', wm.DB.online() === true);
  wm.DB.signUp('act_100day', 'm_' + stamp, { name: MEM_NAME, plan: 'plan3', fee: 2000 });
  ok('会员本地已记录报名', wm.DB.S.registrations.some(x => x.data && x.data.name === MEM_NAME));
  await sleep(500); // 等待 addReg 推回

  /* ---- 5. 服务端 + 管理员端都能看到该报名 ---- */
  console.log('\n[5] 报名跨端共享');
  const svr = await srvGet(['registrations'], null);
  ok('服务端报名表含该会员', svr.tables.registrations.some(x => x.data && x.data.name === MEM_NAME));
  await wa.DB.kickSync(); // 管理员重新拉取
  ok('管理员端看到会员报名(共享)', wa.DB.S.registrations.some(x => x.data && x.data.name === MEM_NAME));

  console.log('\n══════════════════════════════');
  console.log('通过 ' + pass + ' / 失败 ' + fail);
  if (fail) { console.log('失败项：', fails.join(' | ')); process.exit(1); }
})().catch(e => { console.error('测试异常：', e); process.exit(1); });

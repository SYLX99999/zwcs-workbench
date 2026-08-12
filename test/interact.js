/* 深度交互测试：遍历点击每页按钮 / 打开弹层 / 提交表单，捕获运行时异常 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; fails.push(name + (extra ? ' → ' + extra : '')); console.log('  ✗ ' + name + (extra ? ' → ' + extra : '')); }
}
function section(t) { console.log('\n▌ ' + t); }

let ERR = [];
function boot(query) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/index.html' + (query || ''),
    runScripts: 'dangerously', pretendToBeVisual: true,
    virtualConsole: new (require('jsdom').VirtualConsole)().on('jsdomError', e => {
      if (!/navigation to another Document/.test(e.message)) ERR.push('jsdomError: ' + e.message);
    }),
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      w.scrollTo = () => {};
      w.alert = () => {};
      w.confirm = () => true;
      w.prompt = () => '1';
      w.URL.createObjectURL = () => 'blob:mock';
      w.URL.revokeObjectURL = () => {};
      const store = {};
      Object.defineProperty(w, 'localStorage', {
        value: {
          getItem: k => (k in store ? store[k] : null),
          setItem: (k, v) => { store[k] = String(v); },
          removeItem: k => { delete store[k]; }, clear: () => {}
        }, configurable: true
      });
    }
  });
  const w = dom.window;
  ['js/icons.js', 'js/seed-members.js', 'js/seed-courses.js', 'js/seed-leads.js',
    'js/seed-salary.js',
    'js/store.js', 'js/ui.js', 'js/app.js',
    'js/pages.learn.js', 'js/pages.crm.js', 'js/pages.member.js', 'js/pages.admin.js'].forEach(f => {
      const s = w.document.createElement('script');
      s.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
      w.document.body.appendChild(s);
    });
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  w.addEventListener('error', e => ERR.push('error: ' + (e.error && e.error.stack || e.message)));
  const oe = w.console.error;
  w.console.error = (...a) => { ERR.push('console.error: ' + a.join(' ')); };
  return w;
}
function click(el) {
  if (!el) return;
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}
function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 18); }
function byText(w, sel, t) {
  return [...w.document.querySelectorAll(sel)].find(e => (e.textContent || '').includes(t));
}
const MASK = '.mask';
function killMasks(w) { [...w.document.querySelectorAll(MASK)].forEach(x => x.remove()); }

/* 填充弹层内所有输入，避免空值分支 */
function fillSheet(w, m) {
  m.querySelectorAll('input').forEach((i, idx) => {
    if (i.type === 'checkbox' || i.type === 'radio') { i.checked = idx % 2 === 0; }
    else if (i.type === 'number') { i.value = '5'; }
    else if (i.type === 'file') { /* skip */ }
    else if (/手机|电话/.test(i.placeholder || '')) { i.value = '13800001234'; }
    else if (/金额|数量|条|个|人|分/.test(i.placeholder || '')) { i.value = '5'; }
    else if (!i.value) { i.value = '自动化测试'; }
    i.dispatchEvent(new w.Event('input', { bubbles: true }));
    i.dispatchEvent(new w.Event('change', { bubbles: true }));
  });
  m.querySelectorAll('textarea').forEach(t => {
    if (!t.value) t.value = '自动化测试内容';
    t.dispatchEvent(new w.Event('input', { bubbles: true }));
  });
  m.querySelectorAll('select').forEach(s => {
    if (s.options.length) { s.value = s.options[Math.min(1, s.options.length - 1)].value; }
    s.dispatchEvent(new w.Event('change', { bubbles: true }));
  });
}

const CLICKABLE = 'button, .li.click, .app-cell, .chip, .subtab, .kv-i, .more, .card-hd .more';

/* 遍历一个路由：每次重新进入路由再点第 i 个可点元素，避免元素被重渲染后失效 */
function sweep(w, route, label, limit) {
  ERR = [];
  let crash = null;
  try { w.App.go(route); } catch (e) { crash = e.message; }
  if (crash) { ok(label + ' 渲染', false, crash); return; }
  let view = w.document.getElementById('view');
  ok(label + ' 渲染非空', view && view.children.length > 0, '空白');

  const total = Math.min(view.querySelectorAll(CLICKABLE).length, limit || 30);
  let clicked = 0, sheets = 0, submits = 0;
  const seen = new Set();

  for (let i = 0; i < total; i++) {
    killMasks(w);
    ERR = [];
    try { w.App.go(route); } catch (e) { ok(label + ' 重入路由', false, e.message); break; }
    view = w.document.getElementById('view');
    const list = [...view.querySelectorAll(CLICKABLE)].filter(b => !b.disabled);
    const b = list[i];
    if (!b) break;
    const name = txt(b) || b.className;
    if (seen.has(i + '|' + name)) continue;
    seen.add(i + '|' + name);

    try { click(b); clicked++; } catch (e) { ok(label + ' 点击「' + name + '」', false, e.message); continue; }
    if (ERR.length) { ok(label + ' 点击「' + name + '」无异常', false, ERR[0]); ERR = []; killMasks(w); continue; }

    const m = w.document.querySelector(MASK);
    if (m) {
      sheets++;
      try { fillSheet(w, m); } catch (e) { ok(label + ' 填表「' + name + '」', false, e.message); }
      if (ERR.length) { ok(label + ' 填表「' + name + '」无异常', false, ERR[0]); ERR = []; }
      const ft = [...m.querySelectorAll('.sh-ft .btn, .dg-ft .btn')]
        .filter(x => !/取消|关闭/.test(x.textContent));
      ft.forEach(f => {
        const ftName = txt(f);
        try { click(f); submits++; } catch (e) { ok(label + ' 提交「' + ftName + '」', false, e.message); }
        if (ERR.length) { ok(label + '「' + name + '」→ 提交「' + ftName + '」无异常', false, ERR[0]); ERR = []; }
      });
      killMasks(w);
    }
  }
  killMasks(w);
  console.log('  · ' + label + '：点击 ' + clicked + ' 个元素，弹层 ' + sheets + ' 次，提交 ' + submits + ' 次');
}

/* ====================================================================== */
section('A. 移动端会员：全页面交互遍历');
const w1 = boot();
click(w1.document.querySelector('.lg-acc'));
ok('会员已登录', !!w1.document.querySelector('.app .tabbar'));
[['dash', '工作台'], ['learn', '学习培训'], ['crm', '拓客首页'], ['crm-lead', '我的名单'],
['crm-report', '每日报工'], ['crm-goal', '目标计划'], ['crm-pk', 'PK竞赛'],
['member-edit', '我的资料'], ['member-directory', '会员风采'], ['activity', '活动报名'], ['mine', '我的']]
  .forEach(([r, l]) => sweep(w1, r, l));

section('B. PC 后台管理员：全页面交互遍历');
const w2 = boot('?portal=pc');
click(byText(w2, '.pc-quick .btn', '总部管理员'));
ok('管理员已登录', !!w2.document.querySelector('.pc-side'));
[['admin-dash', '管理驾驶舱'], ['admin-members', '会员管理'], ['admin-grades', '会员级别'],
['admin-courses', '课程管理'], ['admin-leads', '企业名单'], ['admin-orgs', '运营中心'],
['admin-audit', '审核中心'], ['admin-logs', '操作日志'], ['admin-system', '系统设置'],
['admin-profile', '我的资料'], ['admin-reportcfg', '报工配置'], ['admin-goalcfg', '目标模板'],
['admin-eval', '考核评价'], ['salary', '工资管理'], ['admin-activity', '活动报名管理']]
  .forEach(([r, l]) => sweep(w2, r, l));

section('C. PC 后台财务');
const w3 = boot('?portal=pc');
click(byText(w3, '.pc-quick .btn', '总部财务'));
sweep(w3, 'fin-month', '财务报表');
sweep(w3, 'salary', '工资管理(财务)');

section('D. 数据一致性回归');
{
  const DB = w2.DB;
  ok('无 undefined 会员名', DB.members().slice(0, 500).every(m => m.name && m.name !== 'undefined'));
  ok('无 undefined 名单城市', DB.S.leads.slice(0, 500).every(l => l.city && l.city !== 'undefined'));
  ok('课程分类合法', DB.S.courses.every(c => ['初级', '中级', '高级'].includes(c.cat)));
  ok('会员等级均在10档内', (() => {
    const names = DB.GRADES.map(g => g.name);
    return DB.members().slice(0, 2000).every(m => names.includes(m.level));
  })());
  ok('名单无重复(信用代码或公司+手机)', (() => {
    const seen = new Set();
    // 与 gen_seed_leads.py 去重键一致：有信用代码用 信用代码，无则用 公司名
    // （海口龙华源文件无「统一社会信用代码」列，24,820 条名单信用代码为空，
    //   多公司共用一个联系人手机是真实存在的，不应被误判为重复）
    for (const l of DB.S.leads) {
      const k = (l.creditCode || ('N:' + l.company)) + '|' + l.phone;
      if (seen.has(k)) return false;
      seen.add(k);
    }
    return true;
  })());
}

console.log('\n══════════════════════════════════');
console.log('通过 ' + pass + ' / 失败 ' + fail);
if (fails.length) { console.log('\n失败明细：'); fails.forEach(f => console.log('  · ' + f)); }
process.exit(fail ? 1 : 0);

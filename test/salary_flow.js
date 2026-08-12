/* 工资模块端到端流程测试（jsdom）：种子导入 + 可视化 + 明细筛选 + 录入 → 审核 → 发放 → 入账 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; fails.push(name + (extra ? ' → ' + extra : '')); console.log('  ✗ ' + name + (extra ? ' → ' + extra : '')); }
}
function section(t) { console.log('\n▌ ' + t); }

function boot(query) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/index.html' + (query || ''),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = w.matchMedia || function () { return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }; };
      w.scrollTo = function () {};
      const store = {};
      Object.defineProperty(w, 'localStorage', {
        value: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, clear: () => { Object.keys(store).forEach(k => delete store[k]); } },
        configurable: true
      });
    }
  });
  const w = dom.window;
  ['js/icons.js', 'js/seed-members.js', 'js/seed-courses.js', 'js/seed-leads.js',
    'js/seed-salary.js',
    'js/store.js', 'js/ui.js', 'js/app.js',
    'js/pages.learn.js', 'js/pages.crm.js', 'js/pages.member.js', 'js/pages.admin.js'].forEach(f => {
      const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s);
    });
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return w;
}
function click(el) { if (!el) throw new Error('click: 元素不存在'); el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true })); }
function byText(w, sel, txt) { return Array.prototype.filter.call(w.document.querySelectorAll(sel), e => (e.textContent || '').indexOf(txt) >= 0)[0]; }
function login(w, uid) {
  const isPc = !!w.document.querySelector('.pc-login') || !!w.document.querySelector('.pc-card');
  const inputs = w.document.querySelectorAll(isPc ? '.pc-card input' : '.lg-card input');
  inputs[0].value = uid; inputs[1].value = '888888';
  const btn = isPc ? byText(w, '.pc-card .btn', '登 录') : w.document.querySelector('.lg-card .btn');
  click(btn);
}
function changeSel(w, sel, val) { sel.value = String(val); sel.dispatchEvent(new w.Event('change', { bubbles: true })); }

/* ---------- 1. 种子导入与统计 ---------- */
section('1. 工资种子导入与统计');
const w = boot('?portal=pc'); login(w, 'HQ0001');
const DB = w.DB;
ok('DB 已加载', !!DB);
ok('种子工资记录已导入', DB.S.salary.length >= 180, '实际 ' + DB.S.salary.length);
const st = DB.salaryStats();
ok('salaryStats 记录数一致', st.records === DB.S.salary.length);
ok('累计实发总额为正', st.total > 0);
ok('按年统计数据含 2023-2026', st.byYear[2023] > 0 && st.byYear[2024] > 0 && st.byYear[2025] > 0 && st.byYear[2026] > 0);
console.log('    统计: 记录=' + st.records + ' 在职人数=' + st.people + ' 累计实发=¥' + st.total.toFixed(2) + ' 按年=' + JSON.stringify(st.byYear));
ok('历史记录状态为 archived', DB.S.salary.filter(x => x.status === 'archived').length === DB.S.salary.length);

/* ---------- 2. 可视化总览渲染 ---------- */
section('2. 工资可视化总览渲染');
w.App.go('salary');
let ovTab = byText(w, '.sal-tab', '可视化总览');
ok('存在可视化总览标签', !!ovTab); if (ovTab) click(ovTab);
let view = w.document.getElementById('view');
ok('salary 路由视图非空', view && view.children.length > 0);
ok('总览含 KPI 区', !!view.querySelector('.kpi-grid'));
ok('总览含 SVG 图表(年度对比/趋势/构成)', view.querySelectorAll('svg').length >= 3, 'svg=' + view.querySelectorAll('svg').length);
ok('总览含「各员工发放汇总」表', /各员工发放汇总/.test(view.textContent));
ok('总览含「工资构成」', /工资构成/.test(view.textContent));
ok('总览含「累计发放次数」', /累计发放次数/.test(view.textContent));
ok('总览含「累计应发总额」', /累计应发总额/.test(view.textContent));

/* ---------- 3. 工资明细筛选（修复下拉不跳转 bug） ---------- */
section('3. 工资明细：年份/月份/员工筛选');
let detTab = byText(w, '.sal-tab', '工资明细');
ok('存在工资明细标签', !!detTab); click(detTab);
view = w.document.getElementById('view');
let sels = view.querySelectorAll('.filter-row select');
ok('明细含 3 个下拉(年/月/员工)', sels.length >= 3, 'sel=' + sels.length);
let yrSel = sels[0], moSel = sels[1], empSel = sels[2];
changeSel(w, yrSel, 2023);
let rows = view.querySelectorAll('.sal-tbl tbody tr');
ok('选 2023 后表格有数据', rows.length > 0);
ok('选 2023 后所有行均为 2023 年', Array.prototype.every.call(rows, r => /2023-/.test(r.textContent)), '首行=' + (rows[0] && rows[0].textContent.slice(0, 12)));
changeSel(w, moSel, 11);
rows = view.querySelectorAll('.sal-tbl tbody tr');
ok('选 2023-11 后所有行均为 2023-11', Array.prototype.every.call(rows, r => /2023-11/.test(r.textContent)), 'rows=' + rows.length);
let firstEmp = empSel.options[1] ? empSel.options[1].value : '';
ok('存在员工可选项', !!firstEmp);
if (firstEmp) {
  changeSel(w, yrSel, 0); changeSel(w, moSel, 0);
  changeSel(w, empSel, firstEmp);
  rows = view.querySelectorAll('.sal-tbl tbody tr');
  ok('选员工后所有行均含该员工名', Array.prototype.every.call(rows, r => r.textContent.indexOf(firstEmp) >= 0), 'emp=' + firstEmp + ' rows=' + rows.length);
}

/* ---------- 4~7. 四步工作流（单会话，by 区分角色） ---------- */
section('4. 财务录入 → 待审核');
const TY = 2026, TM = 8;
DB.S.salary = DB.S.salary.filter(x => !(x.year === TY && x.month === TM));
const empRows = [
  { name: '测试员工A', position: '会计', base: 8000, perf: 2000, att: 300, social: 800, meal: 500, dedAbs: 0, dedOth: 100 },
  { name: '测试员工B', position: '出纳', base: 6000, perf: 1500, att: 300, social: 600, meal: 500, dedAbs: 0, dedOth: 0 }
];
DB.addSalaryBatch(TY, TM, empRows, '李文静'); // 财务录入
let m = DB.salaryOfMonth(TY, TM);
ok('录入后该月记录数=2', m.length === 2, 'len=' + m.length);
ok('录入后状态=待审核(pending)', m.every(x => x.status === 'pending'));
const recA = m.filter(x => x.name === '测试员工A')[0];
ok('应发合计计算正确', recA.gross === 8000 + 2000 + 300 + 500);
ok('实发金额计算正确', Math.abs(recA.net - (recA.gross - 0 - 100)) < 0.001);

section('5. 管理员审核通过（pending→approved 待财务发放）');
DB.setSalaryMonthStatus(TY, TM, 'approved', '张启明');
m = DB.salaryOfMonth(TY, TM);
ok('审核后状态=approved', m.every(x => x.status === 'approved'));
ok('审核人记录', m.every(x => x.approvedBy === '张启明'));
ok('状态名含「待财务发放」', DB.salStatusName('approved').indexOf('待财务发放') >= 0, DB.salStatusName('approved'));

section('6. 财务确认已发放（approved→paid 已发放）');
DB.setSalaryMonthStatus(TY, TM, 'paid', '李文静');
m = DB.salaryOfMonth(TY, TM);
ok('确认后状态=已发放(paid)', m.every(x => x.status === 'paid'));
ok('发放人记录', m.every(x => x.paidBy === '李文静'));

section('7. 管理员确认入账（paid→confirmed 已结算，计入工资表）');
DB.setSalaryMonthStatus(TY, TM, 'confirmed', '张启明');
m = DB.salaryOfMonth(TY, TM);
ok('入账后状态=已结算(confirmed)', m.every(x => x.status === 'confirmed'));
ok('入账人记录', m.every(x => x.settledBy === '张启明'));

/* ---------- 8. 审核发放页角色权限与按钮 ---------- */
section('8. 审核发放页角色权限');
// 管理员：准备 pending 月(9) 与 paid 月(10)
DB.addSalaryBatch(TY, 9, [{ name: '员工P', position: '岗', base: 5000, perf: 0, att: 0, social: 0, meal: 0, dedAbs: 0, dedOth: 0 }], '李文静');
DB.addSalaryBatch(TY, 10, [{ name: '员工Q', position: '岗', base: 5000, perf: 0, att: 0, social: 0, meal: 0, dedAbs: 0, dedOth: 0 }], '李文静');
DB.setSalaryMonthStatus(TY, 10, 'paid', '李文静');
w.App.go('salary');
let rvTab = byText(w, '.sal-tab', '审核发放');
ok('管理员可见审核发放标签（置顶）', !!rvTab);
click(rvTab);
view = w.document.getElementById('view');
ok('审核发放页含月份分组卡片', view.querySelectorAll('.sal-review').length > 0);
ok('管理员对 pending 有「审核通过」', /审核通过/.test(view.textContent));
ok('管理员对 paid 有「确认入账」', /确认入账/.test(view.textContent));

// 财务：准备 approved 月(11)，应在审核发放页看到「确认已发放」
const wf = boot('?portal=pc'); login(wf, 'HQ0002');
wf.DB.addSalaryBatch(TY, 11, [{ name: '员工R', position: '岗', base: 5000, perf: 0, att: 0, social: 0, meal: 0, dedAbs: 0, dedOth: 0 }], '李文静');
wf.DB.setSalaryMonthStatus(TY, 11, 'approved', '张启明');
wf.App.go('salary');
let fTab = byText(wf, '.sal-tab', '审核发放');
ok('财务可见审核发放标签', !!fTab);
click(fTab);
let fview = wf.document.getElementById('view');
ok('财务对 approved 有「确认已发放」按钮', /确认已发放/.test(fview.textContent));

/* ---------- 9. 财务导航与权限 ---------- */
section('9. 财务角色导航与权限');
const wf3 = boot('?portal=pc'); login(wf3, 'HQ0002');
ok('财务登录成功（PC 侧栏）', !!wf3.document.querySelector('.pc-side'));
const navTxt = wf3.document.querySelector('.pc-side').textContent;
ok('财务导航含工资管理', navTxt.indexOf('工资管理') >= 0);
wf3.App.go('salary');
ok('财务可见「工资录入」标签', Array.prototype.some.call(wf3.document.querySelectorAll('.sal-tab'), e => (e.textContent || '').indexOf('工资录入') >= 0));
ok('财务可见「审核发放」标签', Array.prototype.some.call(wf3.document.querySelectorAll('.sal-tab'), e => (e.textContent || '').indexOf('审核发放') >= 0));

/* ---------- 汇总 ---------- */
console.log('\n========================================');
console.log('工资流程测试: ' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.log('失败项: ' + fails.join(' | ')); process.exit(1); }
else { console.log('✅ 全部通过'); process.exit(0); }

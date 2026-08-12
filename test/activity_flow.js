/* 活动报名模块端到端测试（jsdom）：种子活动 + 表头配置 + 手机端报名 + 后台记录 */
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
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w_ = w;
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
let w_;
function click(el) { if (!el) throw new Error('click: 元素不存在'); el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true })); }
function byText(w, sel, txt) { return Array.prototype.filter.call(w.document.querySelectorAll(sel), e => (e.textContent || '').indexOf(txt) >= 0)[0]; }
function changeSel(w, sel, val) { sel.value = String(val); sel.dispatchEvent(new w.Event('change', { bubbles: true })); }

/* ---------- 1. 种子：活动 + 表头 ---------- */
section('1. 活动与表头种子数据');
const w = boot();
const DB = w.DB;
ok('DB 已加载', !!DB);
const acts = DB.activities();
ok('已内置 100天实战陪跑活动', acts.some(a => /100天/.test(a.title) && a.status === 'open'), 'acts=' + acts.length);
const hdrs = DB.activityHeaders();
ok('默认表头 6 个', hdrs.length === 6, '实际 ' + hdrs.length);
const keys = hdrs.map(h => h.key).join(',');
ok('表头含 姓名/报名时间/参与方式/活动费用/附件支付凭证/活动备注说明',
  keys.indexOf('name') >= 0 && keys.indexOf('signupTime') >= 0 && keys.indexOf('plan') >= 0 &&
  keys.indexOf('fee') >= 0 && keys.indexOf('voucher') >= 0 && keys.indexOf('note') >= 0, keys);
ok('参与方式为下拉(3方案)', (DB.getHeader(DB.activityHeaders().filter(h=>h.key==='plan')[0].id).options||[]).length === 3);
ok('活动费用按方案自动：plan1=0/plan2=6000/plan3=2000', DB.planFee('plan1') === 0 && DB.planFee('plan2') === 6000 && DB.planFee('plan3') === 2000);

/* ---------- 2. 手机端报名页渲染 ---------- */
section('2. 手机端活动报名页渲染');
const demo = w.document.querySelector('.lg-acc'); ok('存在会员一键登录入口', !!demo);
click(demo);
const u = w.App.user;
ok('以会员身份登录', u && u.role === 'member');
w.App.go('activity');
const view = w.document.getElementById('view');
ok('activity 路由视图非空', view && view.children.length > 0);
ok('显示活动标题(100天)', /100天/.test(view.textContent));
ok('存在「立即报名」按钮', !!byText(w, '.btn', '立即报名'));
ok('显示活动通知正文', !!view.querySelector('.act-notice'));

/* ---------- 3. 手机端提交报名（表单联动） ---------- */
section('3. 手机端提交报名 + 参与方式联动费用');
click(byText(w, '.btn', '立即报名'));
const sheet = w.document.querySelector('.sheet');
ok('报名抽屉已弹出', !!sheet);
const nameInp = sheet.querySelector('input');
ok('姓名已预填为会员名', nameInp && nameInp.value === u.name, nameInp && nameInp.value);
const planSel = sheet.querySelector('select');
ok('存在参与方式下拉', !!planSel && planSel.options.length === 3);
changeSel(w, planSel, 'plan2');
const feeInp = sheet.querySelector('input[type=number]');
ok('选择方案二后活动费用自动=6000', feeInp && feeInp.value === '6000', feeInp && feeInp.value);
const before = DB.registrationsOf(DB.activities()[0].id).length;
click(byText(w, '.sheet .btn', '提交报名'));
const actId = DB.activities()[0].id;
const recs = DB.registrationsOf(actId);
ok('提交后新增一条报名记录', recs.length === before + 1, 'before=' + before + ' now=' + recs.length);
const mine = recs.filter(r => r.memberId === u.id)[0];
ok('报名记录归属当前会员', !!mine);
ok('报名数据含 参与方式=plan2 与 费用=6000', mine && mine.data.plan === 'plan2' && Number(mine.data.fee) === 6000, mine && JSON.stringify(mine.data));

/* ---------- 4. 后台：活动管理 + 表头配置 + 记录 ---------- */
section('4. 后台活动报名管理');
const wa = boot('?portal=pc'); loginAdmin(wa);
const DBa = wa.DB;
wa.App.go('admin-activity');
const va = wa.document.getElementById('view');
ok('admin-activity 视图非空', va && va.children.length > 0);
ok('含「活动管理」标签', !!byText(wa, '.sal-tab', '活动管理'));
ok('含「表头配置」标签', !!byText(wa, '.sal-tab', '表头配置'));
ok('含「报名记录」标签', !!byText(wa, '.sal-tab', '报名记录'));
click(byText(wa, '.sal-tab', '表头配置'));
ok('表头配置列出 6 个系统表头', wa.document.querySelectorAll('.hdr-item').length === 6, '实际 ' + wa.document.querySelectorAll('.hdr-item').length);
click(byText(wa, '.sal-tab', '报名记录'));
ok('报名记录表渲染', !!wa.document.querySelector('.sal-tbl') || /暂无报名记录/.test(wa.document.getElementById('view').textContent));

/* ---------- 5. 后台：增加/删除表头（动态表单） ---------- */
section('5. 后台增减表头 + 动态表单生效');
const n0 = DBa.activityHeaders().length;
const added = DBa.addHeader({ id: DBa.nid('ah'), key: 'f_test', label: '手机号', type: 'text', required: false, options: [], builtin: false });
ok('新增表头成功', DBa.activityHeaders().length === n0 + 1);
ok('新增表头为非系统字段', added.builtin === false);
ok('删除系统字段被拒绝', DBa.delHeader(DBa.activityHeaders().filter(h=>h.builtin)[0].id) === false);
ok('删除自定义字段成功', DBa.delHeader(added.id) === true && DBa.activityHeaders().length === n0);
// 移动顺序
const firstId = DBa.activityHeaders()[0].id, secondId = DBa.activityHeaders()[1].id;
DBa.moveHeader(secondId, 'up');
ok('moveHeader(up) 生效', DBa.activityHeaders()[0].id === secondId);
DBa.moveHeader(secondId, 'down');
ok('moveHeader(down) 复原', DBa.activityHeaders()[0].id === firstId);

/* ---------- 6. 导出 CSV 可用 ---------- */
section('6. 报名记录导出 CSV');
const csv = DBa.toCSV([{ name: '张三', plan: 'plan1', fee: 0 }], [{ key: 'name', label: '姓名' }, { key: 'plan', label: '参与方式' }, { key: 'fee', label: '费用' }]);
ok('toCSV 生成含表头与数据', /姓名/.test(csv) && /张三/.test(csv) && /plan1/.test(csv), csv.replace(/\n/g, ' | '));

/* ---------- 结果 ---------- */
console.log('\n══════════════════════════════════════');
console.log('活动报名模块流程测试：' + pass + ' 通过 / ' + fail + ' 失败');
if (fail) { console.log('失败项：\n - ' + fails.join('\n - ')); process.exit(1); }
else { console.log('全部通过 ✓'); }
function loginAdmin(w) {
  const inputs = w.document.querySelectorAll('.pc-card input');
  inputs[0].value = 'HQ0001'; inputs[1].value = '888888';
  click(byText(w, '.pc-card .btn', '登 录'));
}

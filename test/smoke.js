/* 冒烟 + 交互回归测试（jsdom） */
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
    resources: undefined,
    pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = w.matchMedia || function () { return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }; };
      w.scrollTo = function () {};
      const store = {};
      Object.defineProperty(w, 'localStorage', {
        value: {
          getItem: k => (k in store ? store[k] : null),
          setItem: (k, v) => { store[k] = String(v); },
          removeItem: k => { delete store[k]; },
          clear: () => { Object.keys(store).forEach(k => delete store[k]); }
        }, configurable: true
      });
    }
  });
  const w = dom.window;
  // 手动按顺序注入脚本（jsdom 不加载外链 src）
  ['js/icons.js', 'js/seed-members.js', 'js/seed-courses.js', 'js/seed-leads.js',
    'js/seed-salary.js',
    'js/store.js', 'js/ui.js', 'js/app.js',
    'js/pages.learn.js', 'js/pages.crm.js', 'js/pages.member.js', 'js/pages.admin.js'].forEach(f => {
      const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const s = w.document.createElement('script');
      s.textContent = code;
      w.document.body.appendChild(s);
    });
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return w;
}

const errors = [];
function trap(w) {
  w.addEventListener('error', e => errors.push('window.error: ' + (e.error && e.error.stack || e.message)));
  const oe = w.console.error;
  w.console.error = function (...a) { errors.push('console.error: ' + a.join(' ')); oe.apply(w.console, a); };
}

function click(el) { if (!el) throw new Error('click: 元素不存在'); el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true })); }
function byText(w, sel, txt) {
  return Array.prototype.filter.call(w.document.querySelectorAll(sel), e => (e.textContent || '').indexOf(txt) >= 0)[0];
}

/* ====================================================================== */
section('1. 数据层：种子导入');
const w0 = boot(); trap(w0);
const DB = w0.DB;
ok('SEED_MEMBERS 已注入', Array.isArray(w0.SEED_MEMBERS) && w0.SEED_MEMBERS.length > 2000, '实际 ' + (w0.SEED_MEMBERS || []).length);
ok('SEED_COURSES 27 门', (w0.SEED_COURSES || []).length === 27, '实际 ' + (w0.SEED_COURSES || []).length);
ok('SEED_LEADS 已注入', (w0.SEED_LEADS || []).length > 2000, '实际 ' + (w0.SEED_LEADS || []).length);
ok('会员进入 DB', DB.members().length > 2000, '实际 ' + DB.members().length);
ok('课程进入 DB', DB.S.courses.length === 27, '实际 ' + DB.S.courses.length);
ok('名单进入 DB', DB.S.leads.length > 2000, '实际 ' + DB.S.leads.length);
ok('会员级别 11 档（含默认等级）', DB.GRADES.length === 11, '实际 ' + DB.GRADES.length);
ok('会员数与源表口径一致（有手机号的会员）', DB.members().length > 20000,
  '实际 ' + DB.members().length);
ok('会员均有手机号（可登录）', DB.S.members.every(m => m.phone), '缺手机号 ' +
  DB.S.members.filter(m => !m.phone).length + ' 人');
ok('推荐链已保留', DB.S.members.filter(m => m.refId).length > 20000,
  '有推荐人 ' + DB.S.members.filter(m => m.refId).length + ' 人');
ok('初始操作日志已写入', DB.S.logs.length >= 3, '实际 ' + DB.S.logs.length);
ok('初始含待审核任务', DB.S.audits.some(function (a) { return a.status === 'pending'; }));

section('2. 级别 → 课程映射规则');
const map = [
  ['一星', 0], ['二星', 0], ['三星', 0],
  ['四星', 9], ['顶级会计', 9], ['千户侯', 9], ['万户侯', 9],
  ['百户侯', 18],
  ['城市财税赋能中心', 27], ['城市财税赋能中心主理人', 27]
];
map.forEach(([lv, n]) => {
  const cs = DB.coursesFor(lv);
  ok(lv + ' 应学 ' + n + ' 门', cs.length === n, '实际 ' + cs.length);
});
ok('百户侯课程含初级+中级不含高级', (() => {
  const cats = new Set(DB.coursesFor('百户侯').map(c => c.cat));
  return cats.has('初级') && cats.has('中级') && !cats.has('高级');
})());
ok('城市财税赋能中心含高级', new Set(DB.coursesFor('城市财税赋能中心').map(c => c.cat)).has('高级'));

section('3. 名单：多手机号拆分 + 去重导入');
const before = DB.S.leads.length;
const rows = [
  { 公司名称: '测试科技有限公司', 统一社会信用代码: 'TEST00000001', 所属城市: '海口市', 有效手机号: '13800000001，13800000002、13800000003' },
  { 公司名称: '测试科技有限公司', 统一社会信用代码: 'TEST00000001', 所属城市: '海口市', 有效手机号: '13800000001' }, // 重复
  { 公司名称: '重复壹号', 统一社会信用代码: 'TEST00000002', 所属城市: '三亚市', 有效手机号: '13900000001' }
];
const r = DB.importLeads(rows, '单测');
ok('多手机号拆成 3 条', r.added === 4, 'added=' + r.added + ' dup=' + r.dup);
ok('重复手机号被去重', r.dup === 1, 'dup=' + r.dup);
ok('名单总数 +4', DB.S.leads.length === before + 4, DB.S.leads.length + ' vs ' + (before + 4));
ok('splitPhones 正常', DB.splitPhones('138-0000-0001;13900000002 13700000003').length >= 2,
  JSON.stringify(DB.splitPhones('13800000001;13900000002 13700000003')));

section('4. 名单：按区域自动分配');
// 会员区域来自「本人登录后自选」，源表里没有区域字段，种子里一律为空。
// 这里先模拟两位会员各自选好区域，再验证自动分配严格不跨区。
ok('种子会员默认无区域', DB.S.members.every(m => !m.region),
  '有区域的 ' + DB.S.members.filter(m => m.region).length + ' 人');
const hkMember = DB.members().filter(m => m.status !== 'disabled')[0];
if (hkMember) DB.updateProfile(hkMember.id, { region: '海口市' });
ok('会员可自选区域为海口市', !!hkMember && DB.member(hkMember.id).region === '海口市');
if (hkMember) {
  // 只校验「自动分配新增」的那部分：手动批量派单允许跨区，不在本断言范围内
  const had = new Set(DB.leadsOf(hkMember.id).map(l => l.id));
  const n0 = had.size;
  const got = DB.autoDistribute(hkMember.id, 5);
  const n1 = DB.leadsOf(hkMember.id).length;
  ok('定向分配返回 5 条', got === 5, 'got=' + got);
  ok('会员名单数量增加', n1 === n0 + got, n0 + ' → ' + n1);
  const fresh = DB.leadsOf(hkMember.id).filter(l => !had.has(l.id));
  ok('自动分配的名单均为本区域', fresh.length > 0 && fresh.every(l => l.city === '海口市'),
    '新增 ' + fresh.length + ' 条，越界 ' + fresh.filter(l => l.city !== '海口市').length + ' 条');

  const tyMember = DB.members().filter(m => m.id !== hkMember.id && m.status !== 'disabled')[1];
  if (tyMember) {
    DB.updateProfile(tyMember.id, { region: '三亚市' });
    const had2 = new Set(DB.leadsOf(tyMember.id).map(l => l.id));
    DB.autoDistribute(tyMember.id, 3);
    const fresh2 = DB.leadsOf(tyMember.id).filter(l => !had2.has(l.id));
    ok('跨区域不串号', fresh2.every(l => l.city === '三亚市'),
      '越界 ' + fresh2.filter(l => l.city !== '三亚市').length + ' 条');
  }
  const globalN = DB.autoDistribute();
  ok('全量智能分配可执行', typeof globalN === 'number' && globalN >= 0, 'n=' + globalN);
}

section('5. 学习完成 → 推荐人解锁佣金');
const learner = DB.members().filter(m => m.refId && DB.requiredCourses(m.level).length > 0 && !m.juniorDone)[0];
ok('找到有推荐人的待学会员', !!learner, learner ? learner.name + '/' + learner.level : 'none');
if (learner) {
  const ref = DB.referrerOf(learner);
  const c0 = ref ? DB.commissionSum(ref.id, 'settleable') : 0;
  DB.coursesFor(learner.level).filter(c => c.cat === '初级')
    .forEach(c => DB.setProgress(learner.id, c.id, c.minutes * 60, true, true));
  ok('会员标记初级完成', DB.member(learner.id).juniorDone === true);
  if (ref) {
    const c1 = DB.commissionSum(ref.id, 'settleable');
    ok('推荐人可结算佣金增加', c1 > c0, c0 + ' → ' + c1);
  }
}

section('6. 会员导入 / 禁用');
const mb = DB.members().length;
const ir = DB.importMembers([
  { 会员ID: 'UT9001', 会员昵称: '单测会员', 会员手机号: '13000000001', 会员等级: '百户侯', 推荐人ID: 'X1', 推荐人昵称: '老王', 推荐人手机号: '13500000009' }
]);
ok('中文表头直接导入，新增 1 人', ir.added === 1, JSON.stringify(ir));
ok('推荐人手机号未被错认成会员手机号', DB.userByUid('UT9001') && DB.userByUid('UT9001').phone === '13000000001',
  DB.userByUid('UT9001') && DB.userByUid('UT9001').phone);
ok('会员总数 +1', DB.members().length === mb + 1);
const nu = DB.userByUid('UT9001');
ok('可按平台ID查到', !!nu && nu.name === '单测会员');
ok('新会员级别正确', nu && nu.level === '百户侯', nu && nu.level);
DB.setMemberStatus(nu.id, 'disabled');
ok('禁用生效', DB.member(nu.id).status === 'disabled');
ok('禁用计数 ≥1', DB.disabledCount() >= 1, String(DB.disabledCount()));

section('7. 移动端：会员登录链路');
const w1 = boot(); trap(w1);
ok('渲染移动端登录页', !!w1.document.querySelector('.login'));
ok('登录页无角色选择卡（仅演示会员1个）', w1.document.querySelectorAll('.lg-acc').length <= 1,
  '实际 ' + w1.document.querySelectorAll('.lg-acc').length);
ok('存在前往PC端入口', !!byText(w1, 'a.lg-link', '电脑端'));
ok('登录页不出现"总部管理员"角色卡', !byText(w1, '.lg-acc', '总部管理员'));
click(w1.document.querySelector('.lg-acc'));
ok('登录后进入移动端外壳', !!w1.document.querySelector('.app .tabbar'));
ok('底部Tab含活动报名（工作台/学习/拓客/会员风采/活动报名/我的）', w1.document.querySelectorAll('.tabbar .tab').length === 6,
  '实际 ' + w1.document.querySelectorAll('.tabbar .tab').length);
ok('底部Tab含「活动报名」', !!Array.prototype.filter.call(w1.document.querySelectorAll('.tabbar .tab'), e => /活动报名/.test(e.textContent)).length);
ok('工作台已渲染', !!w1.document.querySelector('#view .hero'));

section('8. 移动端：逐页渲染');
['dash', 'learn', 'crm', 'crm-lead', 'crm-report', 'crm-goal', 'crm-pk', 'mine'].forEach(rt => {
  errors.length = 0;
  let e = null;
  try { w1.App.go(rt); } catch (ex) { e = ex.message; }
  const v = w1.document.getElementById('view');
  ok('路由 ' + rt, !e && v && v.children.length > 0, e || (errors[0] || '空白'));
});

section('9. PC 端：管理员登录链路');
const w2 = boot('?portal=pc'); trap(w2);
ok('body 加 pc-mode', w2.document.body.classList.contains('pc-mode'));
ok('渲染 PC 登录页', !!w2.document.querySelector('.pc-login'));
ok('有管理员/财务快捷登录', w2.document.querySelectorAll('.pc-quick .btn').length === 2);
click(byText(w2, '.pc-quick .btn', '总部管理员'));
ok('进入 PC 外壳', !!w2.document.querySelector('.pc .pc-side'));
ok('侧栏导航渲染', w2.document.querySelectorAll('.pc-nav').length >= 8,
  '实际 ' + w2.document.querySelectorAll('.pc-nav').length);
ok('顶栏标题存在', !!w2.document.getElementById('pc-title'));

section('10. PC 端：后台各页渲染');
['admin-dash', 'admin-members', 'admin-grades', 'admin-courses', 'admin-leads',
  'admin-orgs', 'admin-audit', 'admin-logs', 'admin-system'].forEach(rt => {
    errors.length = 0;
    let e = null;
    try { w2.App.go(rt); } catch (ex) { e = ex.message; }
    const v = w2.document.getElementById('view');
    ok('路由 ' + rt, !e && v && v.children.length > 0, e || (errors[0] || '空白'));
  });

section('11. PC 端：财务登录');
const w3 = boot('?portal=pc'); trap(w3);
click(byText(w3, '.pc-quick .btn', '总部财务'));
ok('财务进入外壳', !!w3.document.querySelector('.pc-side'));
ok('财务导航含财务报表', !!byText(w3, '.pc-nav', '财务报表'));
errors.length = 0;
let fe = null;
try { w3.App.go('fin-month'); } catch (ex) { fe = ex.message; }
ok('财务报表页渲染', !fe && w3.document.getElementById('view').children.length > 0, fe || errors[0]);

section('12. 门户纠偏：管理员在移动端 / 会员在PC端');
const w4 = boot(); trap(w4);
{
  const inputs = w4.document.querySelectorAll('.lg-card input');
  inputs[0].value = 'HQ0001'; inputs[1].value = '888888';
  click(w4.document.querySelector('.lg-card .btn'));
  ok('管理员不会在手机端渲染出会员外壳', !w4.document.querySelector('.app .tabbar'));
  ok('管理员未被当成会员登录', !w4.document.querySelector('#view .hero'));
}
const w5 = boot('?portal=pc'); trap(w5);
{
  const mem = w5.DB.members().filter(m => m.status !== 'disabled')[0];
  const inputs = w5.document.querySelectorAll('.pc-card input');
  inputs[0].value = mem.uid; inputs[1].value = '888888';
  click(byText(w5, '.pc-card .btn', '登 录'));
  ok('会员不会在PC端渲染出后台外壳', !w5.document.querySelector('.pc-side'));
}

section('13. 登录校验');
const w6 = boot(); trap(w6);
{
  const inputs = w6.document.querySelectorAll('.lg-card input');
  const btn = w6.document.querySelector('.lg-card .btn');
  inputs[0].value = 'NOT_EXIST_999'; inputs[1].value = '888888';
  click(btn);
  ok('不存在账号被拦截', !!byText(w6, '.toast', '账号不存在') || !w6.document.querySelector('.app'));
  const mem = w6.DB.members().filter(m => m.status !== 'disabled')[0];
  inputs[0].value = mem.uid; inputs[1].value = 'wrong';
  click(btn);
  ok('密码错误被拦截', !w6.document.querySelector('.app .tabbar'));
  inputs[0].value = mem.phone || mem.uid; inputs[1].value = '888888';
  click(btn);
  ok('手机号+正确密码可登录', !!w6.document.querySelector('.app .tabbar'));
}

section('14. 禁用会员无法登录');
const w7 = boot(); trap(w7);
{
  const m = w7.DB.members()[3];
  w7.DB.setMemberStatus(m.id, 'disabled');
  const inputs = w7.document.querySelectorAll('.lg-card input');
  inputs[0].value = m.uid; inputs[1].value = '888888';
  click(w7.document.querySelector('.lg-card .btn'));
  ok('禁用账号被拒绝登录', !w7.document.querySelector('.app .tabbar'));
}

section('15. 名单表头可增减');
{
  const n0 = DB.S.leadFields.length;
  DB.S.leadFields.push({ key: 'industry', label: '所属行业', required: false });
  DB.save();
  ok('可新增表头', DB.S.leadFields.length === n0 + 1);
  DB.S.leadFields = DB.S.leadFields.filter(f => f.key !== 'industry');
  DB.save();
  ok('可删除表头', DB.S.leadFields.length === n0);
  ok('必填表头存在', DB.S.leadFields.filter(f => f.required).length >= 3);
}

section('16. 会员新增企业名单（多手机号拆分，免审核）');
{
  const m = DB.members()[10];
  const before = DB.leadsOf(m.id).length;
  // 会员新增名单不再进审核队列：先记录「非示例」的会员自建名单审计数
  const auditBefore = DB.S.audits.filter(function (a) { return a.type === '会员自建名单' && a.note && a.note.indexOf('示例') < 0; }).length;
  const n = DB.addLeadByMember(m.id, { company: '自建客户A', city: '海口市', phone: '13611110001，13611110002' });
  ok('自建拆成 2 条', n === 2, 'n=' + n);
  ok('归属到该会员', DB.leadsOf(m.id).length === before + 2);
  const fresh = DB.leadsOf(m.id).slice(-2);
  ok('标记为会员新增', fresh.length === 2 && fresh.every(function (l) { return l.memberAdded === true; }));
  ok('初始状态为 new（免审核，待后台录用/删除）', fresh.every(function (l) { return l.status === 'new'; }));
  const auditAfter = DB.S.audits.filter(function (a) { return a.type === '会员自建名单' && a.note && a.note.indexOf('示例') < 0; }).length;
  ok('会员新增不再进入审核队列', auditAfter === auditBefore, 'before=' + auditBefore + ' after=' + auditAfter);
}

section('17. 名单分配申请（会员自选区域，后台审核派单）');
{
  const m2 = DB.members()[0];
  // 选一个当前仍有可分配名单的区域，保证派单可成功（海口市等热门区域可能已被种子分配耗尽）
  const pool = DB.unassignedLeads();
  ok('存在可分配名单池', pool.length > 0, 'pool=' + pool.length);
  const city = pool[0].city;
  const before = DB.leadsOf(m2.id).length;
  const reqId = DB.requestLead(m2.id, city);
  const reqAudit = DB.S.audits.filter(function (a) { return a.type === '名单分配申请' && a.refId === reqId; })[0];
  ok('申请生成待审核记录', !!reqAudit && reqAudit.status === 'pending');
  const r = DB.resolveAudit(reqAudit.id, true);
  ok('审核通过 → 自动派单成功', r && r.ok === true, 'msg=' + (r && r.msg));
  ok('派单后该会员名单增加', DB.leadsOf(m2.id).length > before, 'before=' + before + ' after=' + DB.leadsOf(m2.id).length);
  ok('派单日志含区域', DB.S.logs.some(function (l) { return l.action === '通过名单申请' && l.detail && l.detail.indexOf(city) >= 0; }));
}

section('18. 审核通过日志（演示自建名单）');
{
  const demo = DB.S.audits.filter(function (a) { return a.type === '会员自建名单' && a.status === 'pending'; })[0];
  ok('存在演示待审自建名单', !!demo);
  if (demo) {
    const lid = demo.refId;
    DB.resolveAudit(demo.id, true);
    ok('审核通过 → 名单状态转 new', DB.lead(lid) && DB.lead(lid).status === 'new');
    ok('审核通过产生日志', DB.S.logs.some(function (l) { return l.action === '审核通过'; }));
  }
}

section('19. 会员职业档案（手机端自助录入 + 会员风采）');
{
  const m = DB.members()[3];
  const patch = {
    phone: '13800009999', region: '海口市', wechat: 'wx_test', intro: '从业 12 年，服务 200 户',
    expYears: 12, accountsDone: 200, skills: '小规模代账、汇算清缴', clientTypes: '餐饮门店',
    experience: '2014-至今 财税服务', certImg: 'data:image/png;base64,AAAA',
    resumeName: '张三简历.pdf', resumeData: 'data:application/pdf;base64,AAAA', publicProfile: true
  };
  DB.updateProfile(m.id, patch);
  const m2 = DB.member(m.id);
  ok('档案字段已写入', m2.expYears === 12 && m2.accountsDone === 200 && m2.skills.indexOf('汇算清缴') >= 0);
  ok('会计证已保存', String(m2.certImg).indexOf('data:image') === 0);
  ok('简历已保存（含文件名）', m2.resumeName === '张三简历.pdf' && String(m2.resumeData).indexOf('data:') === 0);
  ok('更新时间已记录', !!m2.profileAt);
  ok('产生完善资料日志', DB.S.logs.some(l => l.action === '完善资料'));

  const st = DB.profileStat(m.id);
  ok('profileStat 返回统计口径', typeof st.leads === 'number' && typeof st.deal === 'number' && typeof st.learnPct === 'number',
    JSON.stringify(st));

  const all = DB.publicMembers('');
  ok('公开名录非空', all.length > 0, '实际 ' + all.length);
  ok('名录含刚更新的会员', all.some(x => x.id === m.id));
  ok('按关键词可搜索', DB.publicMembers('汇算清缴').some(x => x.id === m.id));
  ok('按区域可筛选', DB.publicMembers('', '海口市').every(x => x.region === '海口市'));

  DB.updateProfile(m.id, { publicProfile: false });
  ok('关闭公开后不出现在名录', !DB.publicMembers('').some(x => x.id === m.id));
  DB.updateProfile(m.id, { publicProfile: true });

  const disabled = DB.members().filter(x => x.status === 'disabled')[0];
  if (disabled) ok('禁用会员不出现在名录', !DB.publicMembers('').some(x => x.id === disabled.id));
  ok('种子已生成职业档案样例', DB.members().filter(x => x.expYears > 0 && x.intro).length >= 50,
    '实际 ' + DB.members().filter(x => x.expYears > 0 && x.intro).length);
}

section('20. 会员风采 / 我的资料 页面可渲染');
{
  const w9 = boot(); trap(w9);
  click(w9.document.querySelector('.lg-acc'));
  ['member-edit', 'member-directory'].forEach(r => {
    w9.App.go(r);
    const view = w9.document.getElementById('view');
    ok(r + ' 渲染非空', view && view.children.length > 0);
  });
  w9.App.go('member-directory');
  ok('会员风采出现名片卡', w9.document.querySelectorAll('#view .card').length > 3,
    '实际 ' + w9.document.querySelectorAll('#view .card').length);
  const cardBtn = byText(w9, '#view .btn', '查看名片');
  ok('存在「查看名片」按钮', !!cardBtn);
  if (cardBtn) {
    click(cardBtn);
    ok('点开名片弹层', !!w9.document.querySelector('.sheet'));
    const mask = w9.document.querySelector('.sheet-mask, .mask');
    if (mask && mask.parentNode) mask.parentNode.removeChild(mask);
  }
  w9.App.go('member-edit');
  ok('我的资料含文件上传控件', w9.document.querySelectorAll('#view input[type=file]').length >= 2,
    '实际 ' + w9.document.querySelectorAll('#view input[type=file]').length);
  ok('我的资料含区域下拉', !!w9.document.querySelector('#view select'));
  ok('我的资料无运行时异常', errors.length === 0, errors[0] || '');
}

section('21. 后台会员详情：一屏看到该会员全部信息');
{
  // 管理员仅在 PC 门户登录
  const wP = boot('?portal=pc');
  click(byText(wP, '.pc-quick .btn', '总部管理员'));
  wP.App.go('admin-members');
  const row = wP.document.querySelector('#view .m-member-row');
  ok('会员列表有可点击行', !!row);
  ok('会员列表含统计摘要栏', !!wP.document.querySelector('.stats-bar'));
  ok('会员列表有表格表头', !!wP.document.querySelector('.m-member-table thead th'));
  if (row) {
    click(row);
    const sh = wP.document.querySelector('.sheet');
    ok('打开会员档案弹层', !!sh);
    const t = sh ? sh.textContent.replace(/\s+/g, '') : '';
    ['学习课程进度', '客户开发进度', '工作汇报', '目标设定', '职业档案', '会计证', '个人简历'].forEach(k => {
      ok('档案含「' + k + '」', t.indexOf(k) >= 0);
    });
    ok('档案含所属区域', t.indexOf('所属区域') >= 0);
    const mask = wP.document.querySelector('.sheet-mask, .mask');
    if (mask && mask.parentNode) mask.parentNode.removeChild(mask);
  }
}

section('22. 课程：不分章节 + 文档出题（全选择题）');
{
  const noChap = { id: 'c_test1', name: '单课题测试课', cat: '初级', minutes: 30, chapterList: [], desc: '' };
  DB.S.courses.push(noChap);
  DB.save();
  ok('可创建无章节课程', DB.course('c_test1') && DB.course('c_test1').chapterList.length === 0);

  const doc = '小规模纳税人季度销售额未超过30万元免征增值税。' +
    '一般纳税人适用的增值税税率为百分之十三。' +
    '企业所得税的法定税率为百分之二十五。' +
    '个体工商户可以核定征收个人所得税。' +
    '增值税专用发票的认证期限为三百六十天。' +
    '小微企业年应纳税所得额不超过三百万元可享受优惠。';
  const qs = DB.autoGenQuestions(doc);
  ok('可从文档内容生成题目', qs.length >= 3, '生成 ' + qs.length + ' 题');
  ok('全部为选择题（驾照式）', qs.every(q => q.type === 'choice'), qs.map(q => q.type).join(','));
  ok('每题 4 个选项', qs.every(q => q.options && q.options.length === 4));
  ok('答案为 A-D', qs.every(q => /^[A-D]$/.test(q.answer)));

  const long = new Array(300).fill('这是一段用于测试字数不受限制的财税培训内容说明。').join('');
  ok('长文本不被截断（字数不限）', DB.autoGenQuestions(long).length >= 3, '长度 ' + long.length);
  ok('文本上限已放开', DB.S.sysLimits.textMax >= 100000, '当前 ' + DB.S.sysLimits.textMax);

  qs.forEach(q => DB.addQuestion({ courseId: 'c_test1', chapterId: '', type: q.type, q: q.q, options: q.options, answer: q.answer }));
  ok('题目可入库到无章节课程', DB.questionsOf('c_test1').length === qs.length);
  DB.S.courses = DB.S.courses.filter(c => c.id !== 'c_test1');
  DB.save();
}

section('23. 持久化：种子 + 增量（2万会员不撑爆 localStorage）');
{
  const w = boot(); trap(w);
  const D = w.DB;
  const raw0 = w.localStorage.getItem(D.KEY);
  ok('已写入本地存储', !!raw0);
  const mb = raw0.length / 1024 / 1024;
  ok('存储体积远小于 5MB 配额', mb < 4, mb.toFixed(2) + ' MB');
  const saved0 = JSON.parse(raw0);
  ok('大表不整包落盘', !saved0.members && !saved0.leads,
    'members=' + !!saved0.members + ' leads=' + !!saved0.leads);
  ok('落盘为增量结构', !!saved0._patch && !!saved0._patch.members && !!saved0._patch.leads);

  // 改一个会员 + 改一条名单，然后重新 load，验证改动能回来
  const m = D.members()[3];
  D.updateProfile(m.id, { region: '儋州市', intro: '持久化单测', expYears: 9 });
  const freeLead = D.unassignedLeads()[0];
  D.assignLead(freeLead.id, m.id);
  D.save();

  const saved1 = JSON.parse(w.localStorage.getItem(D.KEY));
  const mp = saved1._patch.members.u[m.id];
  ok('只记录变化的字段', !!mp && mp.region === '儋州市' && !('phone' in mp),
    JSON.stringify(mp));
  ok('名单归属变化已记录', !!saved1._patch.leads.u[freeLead.id]);

  D.load();                       // 模拟刷新页面
  const m2 = D.member(m.id);
  ok('刷新后会员改动仍在', m2.region === '儋州市' && m2.intro === '持久化单测' && m2.expYears === 9,
    JSON.stringify({ r: m2.region, i: m2.intro, y: m2.expYears }));
  ok('刷新后名单归属仍在', D.lead(freeLead.id).assignedTo === m.id);
  ok('刷新后会员总数不变', D.members().length === 20659 - D.disabledCount() ||
    D.S.members.length === 20659, '实际 ' + D.S.members.length);
  ok('刷新后未被改的会员保持种子值', D.members()[10].region === '');
  ok('DB.S 引用已同步', D.S === D.member(m.id) ? true : D.S.members.indexOf(m2) >= 0);

  // 新增会员 / 新增名单也要能持久化
  const nAdd = D.S.members.length;
  D.importMembers([{ 会员ID: 'UT9001', 会员昵称: '持久化新增', 会员手机号: '13500000001', 会员等级: '一星' }]);
  D.save(); D.load();
  ok('新增会员可持久化', D.S.members.length === nAdd + 1 && !!D.userByUid('UT9001'),
    D.S.members.length + ' vs ' + (nAdd + 1));
  ok('无运行时异常', errors.length === 0, errors.slice(0, 2).join(' | '));
}

/* ====================================================================== */
console.log('\n══════════════════════════════════');
console.log('通过 ' + pass + ' / 失败 ' + fail);
if (fails.length) { console.log('\n失败明细：'); fails.forEach(f => console.log('  · ' + f)); }
process.exit(fail ? 1 : 0);

/* 体量与性能核查：2万会员 + N万名单下的启动耗时 / 存储占用 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const t0 = Date.now();
const dom = new JSDOM(html, {
  url: 'http://localhost/index.html', runScripts: 'dangerously', pretendToBeVisual: true,
  beforeParse(w) {
    w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    w.scrollTo = () => {};
    const bag = {};
    Object.defineProperty(w, 'localStorage', {
      value: {
        getItem: k => (k in bag ? bag[k] : null),
        setItem: (k, v) => { bag[k] = String(v); },
        removeItem: k => { delete bag[k]; },
        clear: () => { Object.keys(bag).forEach(k => delete bag[k]); }
      }, configurable: true
    });
  }
});
const w = dom.window;
['js/icons.js', 'js/seed-members.js', 'js/seed-courses.js', 'js/seed-leads.js',
  'js/seed-salary.js',
  'js/store.js', 'js/ui.js', 'js/app.js',
  'js/pages.learn.js', 'js/pages.crm.js', 'js/pages.member.js', 'js/pages.admin.js'].forEach(f => {
    const el = w.document.createElement('script');
    el.textContent = fs.readFileSync(path.join(ROOT, f), 'utf8');
    w.document.body.appendChild(el);
  });
const t1 = Date.now();
w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
const t2 = Date.now();

const D = w.DB;
console.log('脚本注入 + 建种子 :', (t1 - t0) + ' ms');
console.log('首屏渲染         :', (t2 - t1) + ' ms');
console.log('---');
console.log('会员', D.S.members.length, '| 名单', D.S.leads.length,
  '| 学习记录', D.S.progress.length, '| 跟进', D.S.follows.length,
  '| 报工', D.S.reports.length, '| 目标', D.S.goals.length);

const raw = w.localStorage.getItem(D.KEY);
console.log('localStorage 占用 :', (raw.length / 1024).toFixed(0) + ' KB  (' +
  (raw.length / 1024 / 1024).toFixed(2) + ' MB) / 配额约 5 MB');

const ts = Date.now();
for (let i = 0; i < 5; i++) D.save();
console.log('save() 单次       :', ((Date.now() - ts) / 5).toFixed(1) + ' ms');

console.log('---');
console.log('leadStats  :', JSON.stringify(D.leadStats()));
console.log('有区域的会员:', D.S.members.filter(m => m.region).length, '（应为 0，区域由会员自选）');
console.log('已派名单   :', D.S.leads.filter(l => l.assignedTo).length, '/', D.S.leads.length);
console.log('有职业档案 :', D.S.members.filter(m => m.intro).length);

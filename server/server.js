#!/usr/bin/env node
/* ============================================================================
 * 中为财税合伙人工作台 —— 零依赖后端服务
 * 同端口既托管前端静态文件，又提供 /api 数据接口，实现多人共享数据。
 * 运行：node server/server.js  (默认 0.0.0.0:8080，可用 PORT 环境变量覆盖)
 * 数据：server/data.json（原子写，重启不丢）
 * ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');          // workbench 目录
const DATA_FILE = path.join(__dirname, 'data.json');
const SALARY_SEED = path.join(__dirname, 'seed-salary.json');
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const HOST = process.env.HOST || '0.0.0.0';

// 历史工资种子（来自前端 js/seed-salary.js，185 条 2023-2026 归档记录）
var SEED_SALARY_ARR = [];
try { SEED_SALARY_ARR = JSON.parse(fs.readFileSync(SALARY_SEED, 'utf8')); } catch (e) { console.error('读取 seed-salary.json 失败：', e.message); }
var SEED_MEMBERS_ARR = [];
try { SEED_MEMBERS_ARR = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-members.json'), 'utf8')); } catch (e) { console.error('读取 seed-members.json 失败：', e.message); }

/* ---------- 初始种子（首次运行写入 data.json） ---------- */
function seedData() {
  var ACT_NOTICE = [
    '各位顶级合作伙伴：', '',
    '为赋能全国财务人员与财税公司成长，全面提升伙伴大单开拓能力、落地成交能力，助力大家持续做大业绩、稳定增收，中为企服平台正式启动大单客户开发100天实战赋能陪跑计划！', '',
    '本次专项活动同时启动全国100位大单实战陪跑导师招募培养计划！所有参与本次100天陪跑、业绩表现优秀的伙伴，均可申请成为平台官方赋能实战陪跑导师，解锁平台官方身份，共享全国线上线下培训收益，实现个人能力、行业身份、长期收入三重升级！', '',
    '本次活动仅限百户侯、顶级会计及以上级别核心伙伴参与，为适配每位伙伴的发展节奏，本次陪跑开设三种参与方案，大家可自由选择、按需报名：', '',
    '方案一：纯自主学习（全程免费）', '免费参与本次100天大单开发实战课程学习，获取全套拓客方法与实战干货，由伙伴自主学习、自主落地开发，无平台陪跑、无任何费用、无任何绑定。', '',
    '方案二：平台全程赋能陪跑（零前期投入）', '免费学习全部课程内容，平台全程专业赋能、一对一陪跑落地大单开发全流程，全程无需预付任何费用。', '费用说明：成功开发客户、产生业绩后，从个人成交业绩中扣除6000元作为本次100天实战陪跑服务费用。', '',
    '方案三：零成本专属陪跑（优选福利方案）', '仅预付2000元，即可锁定平台专属一对一全程陪跑，平台持续陪跑跟进直至做出业绩、成功开单。', '福利政策：伙伴成功开发首个月费用超2000元客户，平台全额返还2000元预付金。真正实现一分钱不花，免费陪跑落地，做出业绩为止。', '',
    '参与须知', '1. 参与对象：中为企服平台百户侯、顶级会计及以上级别全体伙伴；', '2. 优秀晋升：本次100天陪跑期间业绩突出、落地能力优秀者，可入选平台全国100位实战陪跑导师库，享受官方导师身份与全国培训分红收益；', '3. 报名方式：所有意向伙伴根据自身情况选择对应方案，填写下方报名表即可正式参与。', '',
    '机会难得、名额有限！希望各位核心伙伴把握平台赋能红利，精进大单开发能力，冲刺高业绩、进阶实战导师、共享全国市场收益！', '',
    '中为企服平台', '2026年08月10日'
  ].join('\n');
  var PLAN_OPTS = [
    { v: 'plan1', t: '方案一·纯自主学习（全程免费）' },
    { v: 'plan2', t: '方案二·平台全程赋能陪跑（成功后扣6000元）' },
    { v: 'plan3', t: '方案三·零成本专属陪跑（预付2000返2000）' }
  ];
  return {
    users: [
      { uid: 'HQ0001', pwd: '888888', role: 'admin', name: '管理员' },
      { uid: 'HQ0002', pwd: '888888', role: 'finance', name: '李文静' }
    ],
      tables: {
      salary: SEED_SALARY_ARR,
      activities: [
        { id: 'act_100day', title: '【重磅赋能】中为企服平台大单客户开发100天实战陪跑活动', content: ACT_NOTICE, status: 'open', createdAt: '2026-08-10', createdBy: '总部管理员' }
      ],
      activityHeaders: [
        { id: 'ah_name', key: 'name', label: '姓名', type: 'text', required: true, builtin: true, locked: true },
        { id: 'ah_time', key: 'signupTime', label: '报名时间', type: 'datetime', required: true, builtin: true, locked: true, auto: true },
        { id: 'ah_plan', key: 'plan', label: '参与方式', type: 'select', required: true, builtin: true, locked: true, options: PLAN_OPTS },
        { id: 'ah_fee', key: 'fee', label: '活动费用', type: 'number', required: false, builtin: true, auto: 'plan' },
        { id: 'ah_voucher', key: 'voucher', label: '附件上传支付凭证', type: 'file', required: false, builtin: true },
        { id: 'ah_note', key: 'note', label: '活动备注说明', type: 'textarea', required: false, builtin: true }
      ],
      registrations: [],
      employees: [
        { id: 'em_seed1', name: '王会计', role: '会计', phone: '13800000001', joinedAt: '2026-04-12' },
        { id: 'em_seed2', name: '赵助理', role: '行政', phone: '13800000002', joinedAt: '2026-06-12' }
      ],
      // 会员认证表（uid/name/phone/role/status/password）；首运行由 seed-members.json 种入，密码默认 888888
      members: SEED_MEMBERS_ARR
    }
  };
}

/* ---------- 数据加载 / 原子保存 ---------- */
var DB = null;
function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      DB = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (!DB.users) DB.users = seedData().users;
      if (!DB.tables) DB.tables = seedData().tables;
      ['salary', 'activities', 'activityHeaders', 'registrations', 'employees', 'members'].forEach(function (k) {
        if (!DB.tables[k]) DB.tables[k] = [];
      });
      // 已存在 data.json 但缺/空 members 表时，用种子回填（保证老数据也能会员登录）
      if (!DB.tables.members.length) { DB.tables.members = SEED_MEMBERS_ARR.slice(); saveDB(); }
      return;
    }
  } catch (e) { console.error('读取 data.json 失败，使用初始种子：', e.message); }
  DB = seedData();
  saveDB();
}
var saveTimer = null;
function saveDB() {
  // 原子写：先写临时文件再 rename
  var tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(DB, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
function saveDBSoon() { if (saveTimer) return; saveTimer = setTimeout(function () { saveTimer = null; saveDB(); }, 300); }

/* ---------- 会话（登录令牌，内存态，重启需重新登录） ---------- */
var sessions = {}; // token -> {uid, role, name}
function newToken() { return crypto.randomBytes(18).toString('hex'); }

/* ---------- 工具 ---------- */
function sendJSON(res, code, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
// 跨域支持：同一 Node 服务同源部署时本就不跨域；若前端与后端分离部署
//（例如前端放 CloudStudio 静态、后端放 Render 等 Node 主机），需要放开 CORS。
// 使用 Bearer Token 鉴权（非 Cookie），故 Allow-Credentials 设为 false 即可。
function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
}
function readBody(req) {
  return new Promise(function (resolve) {
    var buf = [];
    req.on('data', function (c) { buf.push(c); if (buf.length > 1e3) buf.length = 1e3; }); // 限制 1MB
    req.on('end', function () { try { resolve(buf.length ? JSON.parse(Buffer.concat(buf).toString('utf8')) : {}); } catch (e) { resolve({}); } });
  });
}
function auth(req) {
  var h = req.headers['authorization'] || '';
  var m = h.match(/^Bearer\s+(.+)$/i);
  var token = m ? m[1] : null;
  return token && sessions[token] ? sessions[token] : null;
}
var PUBLIC_READ = { activities: 1, activityHeaders: 1, registrations: 1 };
var SHARED = ['salary', 'activities', 'activityHeaders', 'registrations', 'employees'];

/* ---------- 静态文件 ---------- */
var MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
function serveStatic(req, res, urlPath) {
  var rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  var filePath = path.resolve(ROOT, '.' + rel);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; } // 防目录穿越
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) { res.writeHead(404); res.end('not found'); return; }
  var ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

/* ---------- 路由 ---------- */
var server = http.createServer(async function (req, res) {
  var u = req.url.split('?')[0];
  setCORS(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }  // 跨域预检
  try {
    if (u.indexOf('/api/') === 0) {
      var q = {};
      req.url.split('?')[1] && req.url.split('?')[1].split('&').forEach(function (p) { var kv = p.split('='); q[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || ''); });

      // 健康检查（前端据此决定是否启用后端模式）
      if (u === '/api/ping' && req.method === 'GET') { sendJSON(res, 200, { ok: true, server: true, time: Date.now() }); return; }

      // 登录
      if (u === '/api/login' && req.method === 'POST') {
        var b = await readBody(req);
        var user = DB.users.find(function (x) { return x.uid === b.uid && x.pwd === b.pwd; });
        if (user) {
          var token = newToken();
          sessions[token] = { uid: user.uid, role: user.role, name: user.name };
          sendJSON(res, 200, { ok: true, token: token, role: user.role, name: user.name, uid: user.uid });
          return;
        }
        // 会员登录：支持 平台ID(uid) / 内部id(m_xxx) / 手机号 任一登录；密码默认 888888；禁用账号拒绝
        var key = (b.uid || '').toString().trim();
        var mem = DB.tables.members.find(function (x) {
          return x.uid === key || x.id === key || (x.phone && x.phone === key);
        });
        if (!mem) { sendJSON(res, 401, { ok: false, msg: '账号不存在' }); return; }
        if (mem.status === 'disabled') { sendJSON(res, 401, { ok: false, msg: '该账号已被禁用，请联系管理员' }); return; }
        if (mem.password !== b.pwd) { sendJSON(res, 401, { ok: false, msg: '密码错误' }); return; }
        var tokenM = newToken();
        var mrole = mem.role || 'member';
        sessions[tokenM] = { uid: mem.uid, role: mrole, name: mem.name };
        sendJSON(res, 200, { ok: true, token: tokenM, role: mrole, name: mem.name, uid: mem.uid });
        return;
      }

      // 读取共享表（公开表无需令牌；其余需登录）
      if (u === '/api/tables' && req.method === 'GET') {
        var names = (q.names || '').split(',').filter(Boolean);
        if (!names.length) names = SHARED.slice();
        var needAuth = names.some(function (n) { return !PUBLIC_READ[n]; });
        var me = auth(req);
        if (needAuth && !me) { sendJSON(res, 401, { ok: false, msg: '未登录' }); return; }
        var out = {};
        names.forEach(function (n) {
          if (n === 'members') return;            // 会员含密码，禁止经此通用接口返回
          if (DB.tables[n]) out[n] = DB.tables[n];
        });
        sendJSON(res, 200, { ok: true, tables: out, role: me ? me.role : null });
        return;
      }

      // 整表同步（管理员/财务；用于工资、活动、表头、员工 等写回）
      if (u === '/api/tables' && req.method === 'POST') {
        var me2 = auth(req);
        if (!me2) { sendJSON(res, 401, { ok: false, msg: '未登录' }); return; }
        var body = await readBody(req);
        var tb = body.tables || {};
        Object.keys(tb).forEach(function (k) {
          if (SHARED.indexOf(k) >= 0 && k !== 'registrations' && k !== 'members') DB.tables[k] = tb[k];
        });
        saveDBSoon();
        sendJSON(res, 200, { ok: true, by: me2.uid });
        return;
      }

      // 会员报名（匿名追加单条，避免整表覆盖丢数据）
      if (u === '/api/registrations' && req.method === 'POST') {
        var rb = await readBody(req);
        var row = rb.row || rb;
        if (!row || !row.activityId) { sendJSON(res, 400, { ok: false, msg: '缺少 activityId' }); return; }
        row.id = row.id || ('reg_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'));
        row.signedAt = row.signedAt || new Date().toISOString();
        DB.tables.registrations.push(row);
        saveDBSoon();
        sendJSON(res, 200, { ok: true, id: row.id });
        return;
      }

      // 会员密码：管理员设置 / 会员自助修改（写入后端 members 表，多端共享）
      if (u === '/api/member/password' && req.method === 'POST') {
        var me = auth(req);
        if (!me) { sendJSON(res, 401, { ok: false, msg: '未登录' }); return; }
        var pb = await readBody(req);
        var newPwd = (pb.newPwd || '').toString();
        if (!newPwd || newPwd.length < 6) { sendJSON(res, 400, { ok: false, msg: '新密码至少 6 位' }); return; }
        if (me.role === 'admin' || me.role === 'finance') {
          var tuid = (pb.uid || '').toString();
          if (!tuid) { sendJSON(res, 400, { ok: false, msg: '缺少会员账号' }); return; }
          var tm = DB.tables.members.find(function (x) { return x.uid === tuid; });
          if (!tm) { sendJSON(res, 404, { ok: false, msg: '会员不存在' }); return; }
          tm.password = newPwd; saveDBSoon();
          sendJSON(res, 200, { ok: true, msg: '已设置 ' + tm.name + ' 的登录密码' });
          return;
        }
        // 会员自助修改：校验原密码，且只能改自己的
        var sm = DB.tables.members.find(function (x) { return x.uid === me.uid; });
        if (!sm) { sendJSON(res, 404, { ok: false, msg: '会员不存在' }); return; }
        if (sm.password !== (pb.oldPwd || '')) { sendJSON(res, 400, { ok: false, msg: '原密码错误' }); return; }
        sm.password = newPwd; saveDBSoon();
        sendJSON(res, 200, { ok: true, msg: '密码已修改' });
        return;
      }

      // 管理员新增/同步会员账号到后端（使新会员也能登录）
      if (u === '/api/members' && req.method === 'POST') {
        var meM = auth(req);
        if (!meM || (meM.role !== 'admin' && meM.role !== 'finance')) { sendJSON(res, 401, { ok: false, msg: '无权限' }); return; }
        var mb = await readBody(req);
        var rec = mb.member;
        if (!rec || !rec.uid) { sendJSON(res, 400, { ok: false, msg: '缺少会员数据' }); return; }
        var ex = DB.tables.members.find(function (x) { return x.uid === rec.uid; });
        if (ex) { Object.assign(ex, rec); } else { DB.tables.members.push(rec); }
        saveDBSoon();
        sendJSON(res, 200, { ok: true });
        return;
      }

        sendJSON(res, 404, { ok: false, msg: '未知接口' });
        return;
    }
    serveStatic(req, res, req.url);
  } catch (e) {
    console.error('请求处理异常：', e);
    sendJSON(res, 500, { ok: false, msg: '服务器错误' });
  }
});

loadDB();
server.listen(PORT, HOST, function () {
  console.log('✅ 中为财税工作台后端已启动');
  console.log('   本机访问：  http://127.0.0.1:' + PORT + '/');
  console.log('   局域网访问：http://<本机IP>:' + PORT + '/  （同 WiFi 的手机/电脑可打开）');
  console.log('   数据文件：  ' + DATA_FILE);
});

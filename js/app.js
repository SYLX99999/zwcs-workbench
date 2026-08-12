/* ==========================================================================
   控制器：登录（移动端会员 / PC端管理员·财务）、外壳、路由、分角色驾驶舱
   ========================================================================== */
(function (w, UI, DB) {
  'use strict';
  var doc = w.document;
  var App = {
    user: null, portal: 'mobile', routes: {}, nav: [],
    register: function (name, fn) { App.routes[name] = fn; },
    go: function (route, params) { render(route, params || []); },
    refresh: function () { if (App._route) render(App._route, App._params || []); }
  };
  w.App = App;

  /* ---------------- 当前用户会话 ---------------- */
  var SKEY = 'zwcs_session';
  function saveSession() { try { w.localStorage.setItem(SKEY, App.user ? App.user.id : ''); } catch (e) {} }
  function loadSession() {
    try {
      var id = w.localStorage.getItem(SKEY);
      if (id) {
        var u = DB.member(id);
        if (u) return u;
        if (DB.S && DB.S.admins) { var a = DB.S.admins.filter(function (x) { return x.id === id; })[0]; if (a) return a; }
      }
    } catch (e) {}
    return null;
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    App.portal = (w.location.search.indexOf('portal=pc') >= 0) ? 'pc' : 'mobile';
    if (App.portal === 'pc') doc.body.classList.add('pc-mode');
    App.user = loadSession();
    if (!App.user) { paintLogin(); return; }
    paintShell();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ====================================================================== */
  /*  登录页                                                                 */
  /* ====================================================================== */
  function paintLogin() {
    var phone = doc.getElementById('phone');
    var wrap = UI.h('div', { class: 'login' });
    if (App.portal === 'pc') return paintPcLogin(phone);

    // 移动端：仅会员登录
    wrap.appendChild(UI.h('div', { class: 'lg-logo', html: I('logo', 46) }));
    wrap.appendChild(UI.h('div', { class: 'lg-title', text: '中为财税 · 合伙人工作台' }));
    wrap.appendChild(UI.h('div', { class: 'lg-sub', text: '学习 · 拓客 · 业绩 · 佣金 一体化' }));

    var card = UI.h('div', { class: 'lg-card' });
    var uid = UI.input({ placeholder: '账号 / 平台ID / 手机号', value: '' });
    var pw = UI.input({ type: 'password', placeholder: '密码（默认 888888）', value: '' });
    card.appendChild(UI.field('账号', uid));
    card.appendChild(UI.field('密码', pw));
    card.appendChild(UI.btn('登 录', 'pri block', function () { doLogin(uid.value.trim(), pw.value); }));
    wrap.appendChild(card);

    // 会员一键登录演示
    var demo = DB.members().filter(function (m) { return m.status !== 'disabled'; })[0];
    if (demo) {
      wrap.appendChild(UI.h('div', { class: 'lg-tip', text: '— 演示账号一键登录 —' }));
      var g = UI.h('div', { class: 'lg-accounts' });
      g.appendChild(UI.h('button', { class: 'lg-acc', onclick: function () { loginSuccess(demo); } }, [
        UI.h('span', { class: 'lg-acc-ic', style: { background: '#3862f6' }, html: I('user', 20, '#fff') }),
        UI.h('span', { class: 'lg-acc-t', text: '会员(演示)' }),
        UI.h('span', { class: 'lg-acc-d', text: demo.name + ' · ' + demo.uid })
      ]));
      wrap.appendChild(g);
    }
    wrap.appendChild(UI.h('a', { class: 'lg-link', href: 'index.html?portal=pc', text: '我是管理员 / 财务？前往电脑端登录 →' }));
    wrap.appendChild(UI.h('div', { class: 'lg-foot', text: '登录即代表同意《用户协议》与《隐私政策》' }));
    phone.innerHTML = ''; phone.appendChild(wrap);
  }

  function paintPcLogin(phone) {
    var wrap = UI.h('div', { class: 'pc-login' });
    var left = UI.h('div', { class: 'pc-login-l' }, [
      UI.h('div', { class: 'pc-brand', html: I('logo', 40) + '<span>中为财税 · 总部管理后台</span>' }),
      UI.h('div', { class: 'pc-login-slogan', text: '会员管理 · 课程与学习 · 企业名单分配 · 财务佣金' }),
      UI.h('div', { class: 'pc-login-slogan dim', text: 'PC 端大屏操作，数据一目了然' })
    ]);
    var right = UI.h('div', { class: 'pc-login-r' });
    var card = UI.h('div', { class: 'pc-card' });
    card.appendChild(UI.h('div', { class: 'pc-card-t', text: '管理员 / 财务登录' }));
    var uid = UI.input({ placeholder: '账号（管理员 HQ0001 / 财务 HQ0002）', value: 'HQ0001' });
    var pw = UI.input({ type: 'password', placeholder: '密码（默认 888888）', value: '888888' });
    card.appendChild(UI.field('账号', uid));
    card.appendChild(UI.field('密码', pw));
    card.appendChild(UI.btn('登 录', 'pri block', function () { doLogin(uid.value.trim(), pw.value, true); }));
    card.appendChild(UI.h('div', { class: 'pc-quick' }, [
      UI.btn('总部管理员登录', 'ghost', function () { loginSuccess(DB.adminUser('admin')); }),
      UI.btn('总部财务登录', 'ghost', function () { loginSuccess(DB.adminUser('finance')); })
    ]));
    right.appendChild(card);
    right.appendChild(UI.h('a', { class: 'lg-link', href: 'index.html', text: '← 返回会员移动端' }));
    wrap.appendChild(left); wrap.appendChild(right);
    phone.innerHTML = ''; phone.appendChild(wrap);
  }

  function doLogin(key, pw, isPc) {
    if (!key) { UI.toast('请输入账号', 'error'); return; }
    // 在线模式：统一走后端鉴权（多人共享数据）
    if (DB.online && DB.online()) {
        DB.apiLogin(key, pw).then(function (res) {
          if (res && res.ok) {
            DB.syncAuth(res.token);
            // 管理员/财务走 adminUser；会员用 userByUid 取完整对象（含正确 id，避免会员页拿不到数据）
            var u = DB.adminUser(res.role) || DB.userByUid(res.uid) || { id: res.uid, uid: res.uid, role: res.role, name: res.name };
            return loginSuccess(u);
          }
          // 在线登录失败：后端瞬时不可达时，已种入本地的会员仍可登录（不锁死用户）
          var off = offlineMemberLogin(key, pw);
          if (off) { DB.syncAuth(''); return loginSuccess(off); }
          UI.toast((res && res.msg) || '账号或密码错误', 'error');
        });
      return;
    }
    // 离线模式：原本地校验逻辑
    if (key === 'HQ0001' || key === 'admin') { if (pw !== '888888' && pw) { UI.toast('密码错误', 'error'); return; } return loginSuccess(DB.adminUser('admin')); }
    if (key === 'HQ0002' || key === 'finance') { if (pw !== '888888' && pw) { UI.toast('密码错误', 'error'); return; } return loginSuccess(DB.adminUser('finance')); }
    var u = DB.userByUid(key);
    if (!u) { UI.toast('账号不存在', 'error'); return; }
    if (u.password && u.password !== pw) { UI.toast('密码错误', 'error'); return; }
    if (u.status === 'disabled') { UI.toast('该账号已被禁用，请联系管理员', 'error'); return; }
    loginSuccess(u);
  }

  // 后端不可达时的本地兜底：仅对前端种子中已存在的会员放行（种子无密码字段时按默认 888888 校验）
  function offlineMemberLogin(key, pw) {
    var u = DB.userByUid(key);
    if (!u || u.status === 'disabled') return null;
    if (u.password && u.password !== pw) return null;          // 本地有密码则严格校验
    if (!u.password && pw && pw !== '888888') return null;     // 种子无密码则仅放行默认密码
    return u;
  }

  function loginSuccess(u) {
    App.user = u; saveSession();
    // 角色与门户一致性：管理员/财务应走 PC
    if ((u.role === 'admin' || u.role === 'finance') && App.portal !== 'pc') {
      w.location.href = 'index.html?portal=pc'; return;
    }
    if (u.role === 'member' && App.portal === 'pc') {
      w.location.href = 'index.html'; return;
    }
    paintShell();
  }

  /* ====================================================================== */
  /*  外壳                                                                   */
  /* ====================================================================== */
  function navFor(u) {
    if (u.role === 'admin' || u.role === 'finance') {
      var items = [
        { k: 'admin-dash', t: '管理驾驶舱', ic: 'home' },
        { k: 'admin-members', t: '会员管理', ic: 'users' },
        { k: 'admin-grades', t: '会员级别', ic: 'tag' },
        { k: 'admin-courses', t: '课程管理', ic: 'book' },
        { k: 'admin-leads', t: '企业名单', ic: 'list' },
        { k: 'salary', t: '工资管理', ic: 'wallet' },
        { k: 'admin-activity', t: '活动报名', ic: 'upload' },
        { k: 'admin-orgs', t: '运营中心', ic: 'building' },
        { k: 'admin-audit', t: '审核中心', ic: 'check' },
        { k: 'admin-logs', t: '操作日志', ic: 'doc' },
        { k: 'admin-system', t: '系统设置', ic: 'gear' }
      ];
      if (u.role === 'finance') items.splice(1, 0, { k: 'fin-month', t: '财务报表', ic: 'pie' });
      items.push({ k: 'admin-profile', t: '我的资料', ic: 'user' });
      if (u.role === 'admin') {
        items.push({ k: 'admin-reportcfg', t: '报工配置', ic: 'edit' });
        items.push({ k: 'admin-goalcfg', t: '目标配置', ic: 'target' });
        items.push({ k: 'admin-eval', t: '考核评价', ic: 'star' });
      }
      return items;
    }
    // 移动端（会员 / 运营中心）
    return [
      { k: 'dash', t: '工作台', ic: 'home' },
      { k: 'learn', t: '学习', ic: 'book' },
      { k: 'crm', t: '拓客', ic: 'list' },
      { k: 'member-directory', t: '会员风采', ic: 'star' },
      { k: 'activity', t: '活动报名', ic: 'upload' },
      { k: 'mine', t: '我的', ic: 'user' }
    ];
  }

  function paintShell() {
    var u = App.user;
    App.nav = navFor(u);
    var phone = doc.getElementById('phone');
    phone.innerHTML = '';
    if (App.portal === 'pc' && (u.role === 'admin' || u.role === 'finance')) return paintPcShell(phone);
    return paintMobileShell(phone);
  }

  function paintMobileShell(phone) {
    var u = App.user;
    var root = UI.h('div', { class: 'app' });
    var top = UI.h('div', { class: 'appbar' }, [
      UI.h('div', { class: 'appbar-l' }, [
        UI.h('span', { class: 'appbar-role', style: { background: (DB.ROLES[u.role] || {}).color }, text: (DB.ROLES[u.role] || {}).name || '会员' }),
        UI.h('span', { class: 'appbar-name', text: u.name })
      ]),
      UI.h('div', { class: 'appbar-r', html: I('bell', 18), onclick: function () { App.go('mine'); } })
    ]);
    var view = UI.h('div', { class: 'view', id: 'view' });
    var tab = UI.h('div', { class: 'tabbar' });
    App.nav.forEach(function (n) {
      tab.appendChild(UI.h('button', { class: 'tab', 'data-k': n.k, onclick: function () { App.go(n.k); } }, [
        UI.h('span', { class: 'tab-ic', html: I(n.ic, 20) }),
        UI.h('span', { class: 'tab-t', text: n.t })
      ]));
    });
    root.appendChild(top); root.appendChild(view); root.appendChild(tab);
    phone.appendChild(root);
    render(App.nav[0].k);
  }

  function paintPcShell(phone) {
    var u = App.user;
    var root = UI.h('div', { class: 'pc' });
    var side = UI.h('div', { class: 'pc-side' }, [
      UI.h('div', { class: 'pc-side-brand', html: I('logo', 26) + '<span>中为财税后台</span>' }),
      UI.h('div', { class: 'pc-side-user' }, [
        UI.h('div', { class: 'pc-side-name', text: u.name }),
        UI.h('div', { class: 'pc-side-role', style: { color: (DB.ROLES[u.role] || {}).color }, text: (DB.ROLES[u.role] || {}).name })
      ])
    ]);
    App.nav.forEach(function (n) {
      side.appendChild(UI.h('button', { class: 'pc-nav', 'data-k': n.k, onclick: function () { App.go(n.k); } }, [
        UI.h('span', { class: 'pc-nav-ic', html: I(n.ic, 18) }), UI.h('span', { class: 'pc-nav-t', text: n.t })
      ]));
    });
    side.appendChild(UI.h('button', { class: 'pc-nav logout', onclick: function () { logout(); } }, [UI.h('span', { class: 'pc-nav-ic', html: I('logout', 18) }), UI.h('span', { class: 'pc-nav-t', text: '退出登录' })]));
    var main = UI.h('div', { class: 'pc-main' });
    var top = UI.h('div', { class: 'pc-top' }, [
      UI.h('div', { class: 'pc-top-t', id: 'pc-title', text: '管理驾驶舱' }),
      UI.h('div', { class: 'pc-top-r', html: I('bell', 18) })
    ]);
    var view = UI.h('div', { class: 'pc-view', id: 'view' });
    main.appendChild(top); main.appendChild(view);
    root.appendChild(side); root.appendChild(main);
    phone.appendChild(root);
    render(App.nav[0].k);
  }

  function logout() { App.user = null; try { w.localStorage.removeItem(SKEY); } catch (e) {} paintLogin(); }

  /* ---------------- 路由渲染 ---------------- */
  function render(route, params) {
    App._route = route; App._params = params;
    var fn = App.routes[route];
    if (!fn) { UI.toast('页面不存在', 'error'); return; }
    var view = doc.getElementById('view');
    if (!view) return;
    view.innerHTML = '';
    var v = fn(params || []);
    if (v && v.body) view.appendChild(v.body);
    // 高亮导航
    var active = App.portal === 'pc' ? doc.querySelectorAll('.pc-nav') : doc.querySelectorAll('.tab');
    Array.prototype.forEach.call(active, function (el) {
      el.classList.toggle('on', el.getAttribute('data-k') === route);
    });
    if (App.portal === 'pc') { var t = doc.getElementById('pc-title'); if (t) { var n = App.nav.filter(function (x) { return x.k === route; })[0]; if (n) t.textContent = n.t; } }
    view.scrollTop = 0;
  }

  /* ====================================================================== */
  /*  首页 / 工作台（移动端）                                                */
  /* ====================================================================== */
  App.register('dash', function () {
    var u = App.user, b = UI.h('div', { class: 'page' });
    var hero = UI.h('div', { class: 'hero' }, [
      UI.h('div', { class: 'hero-t', text: '你好，' + u.name }),
      UI.h('div', { class: 'hero-s', text: DB.levelName(u.level) + ' · ' + (u.region || '未设区域') })
    ]);
    b.appendChild(hero);

    // 活动报名入口（有开启中的活动则置顶 banner）
    var openActs = DB.activities().filter(function (a) { return a.status === 'open'; });
    if (openActs.length) {
      openActs.slice(0, 1).forEach(function (a) {
        b.appendChild(UI.h('div', { class: 'act-banner', onclick: function () { App.go('activity'); } }, [
          UI.h('div', { class: 'act-banner-l' }, [
            UI.h('div', { class: 'act-banner-tag', text: '火热报名中' }),
            UI.h('div', { class: 'act-banner-t', text: a.title }),
            UI.h('div', { class: 'act-banner-s', text: '点击查看活动详情并报名 →' })
          ]),
          UI.h('div', { class: 'act-banner-ic', html: I('upload', 26, '#fff') })
        ]));
      });
    }

    // 会员登录后自行选择区域
    if (!u.region) b.appendChild(UI.h('div', { class: 'notice-bar err', html: I('info', 14) + ' 请先选择您的所属区域，以便领取对应区域的企业名单', style: { cursor: 'pointer' }, onclick: function () { editRegion(u); } }));

    // 我的数据
    var ls = DB.learnSummary(u.id);
    var cmSettle = DB.commissionSum(u.id, 'settleable');
    var cmPaid = DB.commissionSum(u.id, 'paid');
    var grid = UI.h('div', { class: 'kpi-grid g2' }, [
      UI.kpi('我的佣金(可结算)', '¥' + UI.num(cmSettle), { color: 'var(--warn)' }),
      UI.kpi('已打款佣金', '¥' + UI.num(cmPaid), { color: 'var(--success)' }),
      UI.kpi('学习完成', ls.done + '/' + ls.total, { sub: ls.pct + '%' }),
      UI.kpi('下级会员', u.subs || DB.subordinates(u).length, { color: 'var(--inf)' })
    ]);
    b.appendChild(UI.card(grid));

    // 推荐人进度提示
    if (u.juniorDone) b.appendChild(UI.h('div', { class: 'notice-bar ok', html: I('check', 14) + ' 你已完成初级业务培训，推荐人已解锁结算佣金' }));
    else if (ls.total > 0) b.appendChild(UI.h('div', { class: 'notice-bar', html: I('book', 14) + ' 完成全部初级课程并通过考核，你的推荐人即可获得结算佣金' }));

    // 应用宫格
    var apps = [
      { k: 'learn', t: '学习培训', ic: 'book', c: '#3862f6' },
      { k: 'crm', t: '我的名单', ic: 'list', c: '#06aed4' },
      { k: 'crm-report', t: '每日报工', ic: 'edit', c: '#12b76a' },
      { k: 'crm-goal', t: '目标计划', ic: 'target', c: '#f04438' },
      { k: 'crm-pk', t: 'PK竞赛', ic: 'swords', c: '#7c5cff' },
      { k: 'member-edit', t: '我的资料', ic: 'idcard', c: '#f79009' },
      { k: 'member-directory', t: '会员风采', ic: 'star', c: '#ec4899' },
      { k: 'mine', t: '我的', ic: 'user', c: '#0ea5a4' }
    ];
    var g = UI.h('div', { class: 'app-grid' });
    apps.forEach(function (a) {
      g.appendChild(UI.h('button', { class: 'app-cell', onclick: function () { App.go(a.k); } }, [
        UI.h('span', { class: 'app-ic', style: { background: a.c }, html: I(a.ic, 22, '#fff') }),
        UI.h('span', { class: 'app-t', text: a.t })
      ]));
    });
    b.appendChild(UI.sec('常用功能'));
    b.appendChild(g);

    // 运营中心视角
    if (u.role === 'org') {
      var subs = DB.subordinates(u);
      b.appendChild(UI.sec('运营中心 · ' + u.name));
      b.appendChild(UI.card(UI.h('div', { class: 'kpi-grid g2' }, [
        UI.kpi('管辖会员', subs.length, {}),
        UI.kpi('完成初级', subs.filter(function (x) { return x.juniorDone; }).length, { color: 'var(--success)' })
      ])));
    }
    return { body: b };
  });

  /* ====================================================================== */
  /*  我的（移动端）                                                         */
  /* ====================================================================== */
  App.register('mine', function () {
    var u = App.user, b = UI.h('div', { class: 'page' });
    b.appendChild(UI.h('div', { class: 'profile' }, [
      UI.h('div', { class: 'avatar', style: { background: (DB.ROLES[u.role] || {}).color }, html: I('user', 30, '#fff') }),
      UI.h('div', {}, [
        UI.h('div', { class: 'profile-name', text: u.name }),
        UI.h('div', { class: 'profile-sub', text: DB.levelName(u.level) + ' · 平台ID ' + u.uid })
      ])
    ]));
    // 资料完整度提醒
    var mm = DB.member(u.id) || u;
    var needK = ['region', 'phone', 'intro', 'expYears', 'accountsDone', 'skills', 'experience', 'certImg', 'resumeData'];
    var gotK = needK.filter(function (k) { return mm[k] !== undefined && mm[k] !== '' && mm[k] !== 0; }).length;
    var pctK = Math.round(gotK / needK.length * 100);
    b.appendChild(UI.listItem({
      title: '我的资料 · 职业档案', icon: I('idcard', 18),
      sub: '会计证 / 个人介绍 / 从业年限 / 简历 · 完整度 ' + pctK + '%',
      right: [UI.tag(pctK >= 80 ? '已完善' : '待完善', pctK >= 80 ? 'suc' : 'wrn')],
      onclick: function () { App.go('member-edit'); }
    }));
    b.appendChild(UI.listItem({
      title: '会员风采', icon: I('star', 18),
      sub: '看看其他会员的专业能力与服务客户数',
      onclick: function () { App.go('member-directory'); }
    }));

    var ref = DB.referrerOf(u);
    b.appendChild(UI.listItem({ title: '我的推荐人', sub: ref ? (ref.name + ' · ' + (ref.phone || ref.uid)) : '无', right: [ref && UI.btn('查看', 'mini', function () { App.go('mine'); })] }));
    b.appendChild(UI.listItem({ title: '所属区域', sub: u.region || '未设置', right: [UI.btn('修改', 'mini', function () { editRegion(u); })] }));
    b.appendChild(UI.listItem({ title: '账号状态', sub: u.status === 'disabled' ? '已禁用' : '正常' }));
    b.appendChild(UI.listItem({ title: '我的佣金', sub: '可结算 ¥' + UI.num(DB.commissionSum(u.id, 'settleable')) + ' / 已打款 ¥' + UI.num(DB.commissionSum(u.id, 'paid')) }));
    b.appendChild(UI.h('div', { class: 'mt16' }));
    b.appendChild(UI.btn('退出登录', 'dan block', function () { logout(); }));
    return { body: b };
  });

  function editRegion(u) {
    UI.sheet({ title: '修改所属区域', build: function (bd) {
      var sel = UI.select(DB.S.distRules.regions.map(function (c) { return { v: c, t: c }; }), u.region);
      bd.appendChild(UI.field('选择城市/区域', sel));
    }, footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
      u.region = api.body.querySelector('select').value; DB.save(); UI.toast('已更新区域'); App.go('mine');
    } }] });
  }

  /* ---------------- 图标（内联，避免外部依赖） ---------------- */
  function I(name, sz, color) { return w.Icon ? w.Icon(name, sz || 20, color || '#3862f6') : ''; }

  // 管理员 / 财务 账号（读取持久化的 S.admins，支持后台修改姓名与密码）
  DB.adminUser = function (role) {
    var list = (DB.S && DB.S.admins) || [];
    var a = list.filter(function (x) { return x.role === role; })[0];
    if (a) return a;
    // 兜底（理论上种子已写入）
    if (role === 'admin') return { id: 'u_admin', uid: 'HQ0001', name: '张启明', role: 'admin', level: '总部管理员', phone: '', password: '888888', region: '', status: 'normal', refId: '', refName: '', refPhone: '', subs: 0, commission: 0, paid: 0, blacklist: false };
    return { id: 'u_fin', uid: 'HQ0002', name: '李文静', role: 'finance', level: '总部财务', phone: '', password: '888888', region: '', status: 'normal', refId: '', refName: '', refPhone: '', subs: 0, commission: 0, paid: 0, blacklist: false };
  };

})(window, window.UI, window.DB);

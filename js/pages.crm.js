/* 拓客 CRM 模块：我的名单 / 自建名单(免审核) / 申请区域名单 / 每日报工 / 目标计划 / PK */
(function (w, UI, DB, App) {
  'use strict';
  var I = w.Icon;
  var TABS = [
    { k: 'lead', t: '我的名单', ic: 'list' },
    { k: 'report', t: '每日报工', ic: 'edit' },
    { k: 'goal', t: '目标计划', ic: 'target' },
    { k: 'pk', t: 'PK竞赛', ic: 'swords' }
  ];

  function crmPage(tab) {
    var u = App.user, b = UI.h('div', { class: 'page' });
    var tabs = UI.h('div', { class: 'subtabs' });
    TABS.forEach(function (t) {
      tabs.appendChild(UI.h('button', { class: 'subtab' + (t.k === tab ? ' on' : ''), onclick: function () { App.go('crm-' + t.k); } }, [
        UI.icon(t.ic, 16, t.k === tab ? '#3862f6' : '#8a93a3'), UI.h('span', { text: t.t })
      ]));
    });
    b.appendChild(tabs);
    if (tab === 'lead') renderLeads(u, b);
    else if (tab === 'report') renderReport(u, b);
    else if (tab === 'goal') renderGoal(u, b);
    else renderPk(u, b);
    return { body: b };
  }
  App.register('crm', function () { return crmPage('lead'); });
  App.register('crm-lead', function () { return crmPage('lead'); });
  App.register('crm-report', function () { return crmPage('report'); });
  App.register('crm-goal', function () { return crmPage('goal'); });
  App.register('crm-pk', function () { return crmPage('pk'); });

  /* ---------------- 我的名单 ---------------- */
  function renderLeads(u, b) {
    var my = DB.leadsOf(u.id);
    b.appendChild(UI.h('div', { class: 'bar-row' }, [
      UI.h('div', { class: 'bar-info', text: '共 ' + my.length + ' 条名单' }),
      UI.btn('+ 自建名单', 'pri sm', function () { addSelfLead(u); }),
      UI.btn('申请区域名单', 'ghost sm', function () { requestRegion(u); })
    ]));
    if (!u.region) b.appendChild(UI.h('div', { class: 'notice-bar err', html: I('info', 14) + ' 请先在「我的」中设置所属区域，以便领取对应区域名单' }));
    var chips = UI.h('div', { class: 'chips' });
    var cur = 'all';
    DB.FOLLOW_STATUS.forEach(function (s) { chips.appendChild(chip(s.n, s.k, cur, function () { cur = s.k; renderLeads(u, b); })); });
    chips.insertBefore(chip('全部', 'all', cur, function () { cur = 'all'; renderLeads(u, b); }), chips.firstChild);
    b.appendChild(chips);

    function chip(label, key, active, fn) {
      return UI.h('button', { class: 'chip' + (key === active ? ' on' : ''), onclick: fn, text: label });
    }
    var list = my.filter(function (l) { return cur === 'all' || l.status === cur; });
    if (!list.length) { b.appendChild(UI.empty('暂无名单，可自建或申请区域名单')); return; }
    list.forEach(function (l) {
      b.appendChild(UI.listItem({
        title: l.company, sub: (l.city || '') + (l.legalPerson ? ' · ' + l.legalPerson : '') + ' · ' + DB.followName(l.status) + (l.memberAdded ? ' · 我新增' : ''),
        right: [UI.tag(DB.followName(l.status), DB.followColor(l.status)), UI.icon('chevronR', 18, '#c2c8d2')],
        onclick: function () { followLead(u, l); }
      }));
    });
  }

  function followLead(u, l) {
    var st, note;
    UI.sheet({
      title: l.company, build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'muted small', text: '区域：' + (l.city || '—') + '　电话：' + (l.phone || '—') + '　信用代码：' + (l.creditCode || '—') }));
        bd.appendChild(UI.h('div', { class: 'mt8', text: '更新跟进状态' }));
        st = UI.select(DB.FOLLOW_STATUS.map(function (s) { return { v: s.k, t: s.n }; }), l.status);
        bd.appendChild(st);
        note = UI.input({ area: true, placeholder: '跟进备注（选填）' });
        bd.appendChild(UI.field('备注', note));
      },
      footer: [{ text: '保存跟进', cls: 'pri', onClick: function (api) {
        DB.setLeadStatus(l.id, st.value, u.id, (note.value || '').trim());
        api.close(); UI.toast('已更新跟进'); App.go('crm-lead');
      } }]
    });
  }

  // 会员申请某区域名单（后台审核后自动派发）
  function requestRegion(u) {
    var region = UI.select(DB.S.distRules.regions.map(function (c) { return { v: c, t: c }; }), u.region || '');
    var count = UI.input({ type: 'number', placeholder: '希望领取多少条（选填，留空按默认）', value: '' });
    UI.sheet({ title: '申请区域名单', build: function (bd) {
      bd.appendChild(UI.h('div', { class: 'muted small', text: '选择希望领取名单的区域与数量，提交后由总部审核，通过后自动派发该区域名单；若该区域暂无可分配名单，总部会提示您更换其他区域。' }));
      bd.appendChild(UI.field('目标区域', region));
      bd.appendChild(UI.field('希望数量（条）', count));
    }, footer: [{ text: '提交申请', cls: 'pri', onClick: function (api) {
      var rg = api.body.querySelector('select').value;
      if (!rg) { UI.toast('请选择区域', 'error'); return; }
      var cnt = parseInt(count.value, 10) || 0;
      DB.requestLead(u.id, rg, cnt);
      UI.toast('申请已提交，等待总部审核', 'success'); api.close(); App.go('crm-lead');
    } }] });
  }

  function addSelfLead(u) {
    var company, phone, city, legal;
    UI.sheet({
      title: '自建客户名单', build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'notice-bar', html: I('info', 14) + ' 多个电话用逗号 / 空格分隔，将自动拆分为多条。会员新增名单免审核，由总部录用或删除。' }));
        company = UI.input({ placeholder: '公司名称' });
        phone = UI.input({ placeholder: '有效手机号（多个用,分隔）' });
        city = UI.input({ placeholder: '所在城市/区域', value: u.region || '' });
        legal = UI.input({ placeholder: '法定代表人（选填）' });
        bd.appendChild(UI.field('公司名称', company));
        bd.appendChild(UI.field('手机号', phone));
        bd.appendChild(UI.field('区域', city));
        bd.appendChild(UI.field('法人', legal));
      },
      footer: [{ text: '添加', cls: 'pri', onClick: function (api) {
        var comp = (company.value || '').trim(), ph = (phone.value || '').trim();
        if (!comp || !ph) { UI.toast('请填写公司名称与手机号', 'error'); return; }
        if (!DB.splitPhones(ph).length) { UI.toast('手机号格式不正确', 'error'); return; }
        var n = DB.addLeadByMember(u.id, {
          company: comp, phone: ph,
          city: (city.value || '').trim() || (u.region || ''),
          legalPerson: (legal.value || '').trim()
        });
        api.close(); UI.toast('已添加 ' + n + ' 条名单（会员新增）', 'success'); App.go('crm-lead');
      } }]
    });
  }

  /* ---------------- 每日报工（项来自后台配置） ---------------- */
  function renderReport(u, b) {
    var rs = DB.reportsOf(u.id);
    b.appendChild(UI.card([
      UI.h('div', { class: 'kpi-grid g2' }, [
        UI.kpi('报工天数', rs.length, {}),
        UI.kpi('完成率', DB.reportRate(u.id) + '%', { color: 'var(--success)' })
      ])
    ]));
    b.appendChild(UI.btn('+ 填写今日报工', 'pri block mt8', function () { addReport(u); }));
    rs.slice().reverse().forEach(function (r) {
      var ev = DB.S.evaluations[r.id];
      b.appendChild(UI.listItem({ title: r.date + (r.done ? ' · 已提交' : ''), sub: r.content || '无备注', right: ev ? [UI.tag('评分 ' + ev.score, 'pri')] : null }));
    });
  }
  function addReport(u) {
    var items = DB.S.reportItems.length ? DB.S.reportItems : DB.KPI_FIELDS.map(function (f) { return { key: f.k, name: f.n, unit: f.u }; });
    var date, content, kpiRefs = {};
    UI.sheet({
      title: '每日报工', build: function (bd) {
        date = UI.input({ value: DB.dstr(new Date()) });
        content = UI.input({ area: true, placeholder: '今日工作总结' });
        bd.appendChild(UI.field('日期', date));
        bd.appendChild(UI.field('总结', content));
        items.forEach(function (it) {
          kpiRefs[it.key] = UI.input({ type: 'number', placeholder: '0', value: '0' });
          bd.appendChild(UI.field(it.name + '(' + (it.unit || '') + ')', kpiRefs[it.key]));
        });
      },
      footer: [{ text: '提交报工', cls: 'pri', onClick: function (api) {
        var d = (date.value || '').trim();
        if (!d) { UI.toast('请填写日期', 'error'); return; }
        var kpi = {};
        items.forEach(function (it) { kpi[it.key] = parseInt(kpiRefs[it.key].value, 10) || 0; });
        var old = DB.S.reports.filter(function (r) { return r.memberId === u.id && r.date === d; })[0];
        if (old) { old.content = (content.value || '').trim(); old.kpi = kpi; old.done = true; }
        else { DB.S.reports.push({ id: DB.nid('r'), memberId: u.id, date: d, content: (content.value || '').trim(), kpi: kpi, done: true }); }
        DB.save();
        var extra = DB.autoDistributeOnGoal(u.id);
        api.close();
        UI.toast(extra ? ('报工已提交，目标达成，系统追加 ' + extra + ' 条名单') : '报工已提交');
        App.go('crm-report');
      } }]
    });
  }

  /* ---------------- 目标计划（模板来自后台配置） ---------------- */
  function renderGoal(u, b) {
    var gs = DB.goalsOf(u.id);
    b.appendChild(UI.btn('+ 设定新目标', 'pri block', function () { addGoal(u); }));
    if (!gs.length) { b.appendChild(UI.empty('暂无目标')); return; }
    gs.forEach(function (g) {
      b.appendChild(UI.listItem({ title: g.content, sub: DB.periodName(g.period) + ' · 目标 ' + g.target + (g.progress != null ? ' · 进度 ' + g.progress : ''), right: [g.done ? UI.tag('已完成', 'suc') : UI.tag('进行中', 'pri')] }));
    });
  }
  function addGoal(u) {
    var templates = DB.S.goalTemplates.length ? DB.S.goalTemplates : [{ key: 'intent', name: '新增意向客户', unit: '个' }];
    var period, tpl, target;
    UI.sheet({
      title: '设定目标', build: function (bd) {
        period = UI.select(DB.GOAL_PERIODS.map(function (p) { return { v: p.k, t: p.n }; }), 'month');
        tpl = UI.select(templates.map(function (t) { return { v: t.key, t: t.name + '（' + (t.unit || '') + '）' }; }), templates[0].key);
        target = UI.input({ type: 'number', placeholder: '目标数值', value: '20' });
        bd.appendChild(UI.field('周期', period));
        bd.appendChild(UI.field('目标类型（来自总部模板）', tpl));
        bd.appendChild(UI.field('目标值', target));
        bd.appendChild(UI.h('div', { class: 'muted small', text: '目标一经锁定不可修改，完成后系统将自动追加名单' }));
      },
      footer: [{ text: '锁定并保存', cls: 'pri', onClick: function (api) {
        var tObj = templates.filter(function (t) { return t.key === api.body.querySelector('select').value; })[0] || templates[0];
        var tv = parseInt(target.value, 10) || 0;
        if (!tv) { UI.toast('请填写目标值', 'error'); return; }
        DB.S.goals.push({ id: DB.nid('g'), memberId: u.id, period: period.value, type: tObj.key, content: tObj.name,
          target: tv, progress: 0, done: false, locked: true, createdAt: DB.tstr(new Date()) });
        DB.save(); api.close(); UI.toast('目标已锁定'); App.go('crm-goal');
      } }]
    });
  }

  /* ---------------- PK（输入对手ID调取 + 赌注类型 + 对手确认 + PK目标） ---------------- */
  function renderPk(u, b) {
    var ps = DB.pksOf(u.id);
    b.appendChild(UI.btn('+ 发起 PK', 'pri block', function () { addPk(u); }));
    if (!ps.length) { b.appendChild(UI.empty('暂无 PK')); return; }
    ps.forEach(function (p) {
      var opp = DB.member(p.aId === u.id ? p.bId : p.aId);
      var isOpp = p.bId === u.id;
      var right = [UI.tag(p.status === 'pending' ? (isOpp ? '待你应战' : '待应战') : (p.status === 'active' ? '进行中' : (p.status === 'done' ? '已结束' : '已拒')), 'wrn')];
      if (isOpp && p.status === 'pending') right.push(UI.btn('应战', 'mini', function () { DB.confirmPk(p.id, true); UI.toast('已应战'); App.go('crm-pk'); }), UI.btn('拒', 'mini dan', function () { DB.confirmPk(p.id, false); App.go('crm-pk'); }));
      b.appendChild(UI.listItem({ title: p.title, sub: '对手：' + (opp ? opp.name : '—') + ' · 赌注 ' + (p.stakeType || '现金') + ' ¥' + (p.stake || 0) + (p.goal ? ' · 目标：' + p.goal : ''), right: right }));
    });
  }
  function addPk(u) {
    var oppId = UI.input({ placeholder: '输入对手会员ID（非列表选择）' });
    var title = UI.input({ placeholder: 'PK 主题，如：本月拓客比拼' });
    var stakeType = UI.select([{ v: '现金', t: '现金' }, { v: '请客', t: '请客' }, { v: '积分', t: '积分' }, { v: '礼物', t: '礼物' }], '现金');
    var stake = UI.input({ placeholder: '赌注金额/价值', value: '200' });
    var goal = UI.input({ placeholder: 'PK 目标，如 本月各新增10个意向客户', value: '' });
    UI.sheet({ title: '发起 PK', build: function (bd) {
      bd.appendChild(UI.field('对手会员ID', oppId));
      bd.appendChild(UI.field('主题', title));
      bd.appendChild(UI.field('赌注类型', stakeType));
      bd.appendChild(UI.field('赌注(元/价值)', stake));
      bd.appendChild(UI.field('PK 目标', goal));
      bd.appendChild(UI.h('div', { class: 'muted small', text: '提交后对手将收到应战请求，确认同意后 PK 生效' }));
    }, footer: [{ text: '发起', cls: 'pri', onClick: function (api) {
      var oid = (oppId.value || '').trim();
      if (!oid) { UI.toast('请输入对手会员ID', 'error'); return; }
      var opp = DB.userByUid(oid);
      if (!opp) { UI.toast('未找到该会员ID', 'error'); return; }
      if (opp.id === u.id) { UI.toast('不能与自己 PK', 'error'); return; }
      DB.S.pks.push({ id: DB.nid('pk'), aId: u.id, bId: opp.id, title: (title.value || 'PK 挑战').trim(), stakeType: api.body.querySelector('select').value, stake: parseInt(stake.value) || 0, goal: (goal.value || '').trim(), status: 'pending', createdAt: DB.tstr(new Date()) });
      DB.log('发起PK', u.name + ' → ' + opp.name);
      DB.save(); UI.toast('PK 已发起，等待对手应战'); App.go('crm-pk');
    } }] });
  }

})(window, window.UI, window.DB, window.App);

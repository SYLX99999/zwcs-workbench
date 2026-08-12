/* ==========================================================================
   pages.company.js · 模块三/四：子公司股东业绩 + 总部财务
   ========================================================================== */
(function (w) {
  var App = w.App, DB = w.DB, UI = w.UI, I = w.Icon;
  var H = UI.h;
  function uname(id) { var u = DB.user(id); return u ? u.name : (DB.company(id) ? DB.company(id).name : '—'); }
  function myCo() { return DB.company(App.user.companyId); }

  /* ============ 子公司信息 ============ */
  App.register('company-info', function () {
    var u = App.user, c = myCo();
    if (!c) return { title: '子公司', body: UI.empty('未关联子公司') };
    var b = H('div');
    b.appendChild(UI.h('div', { class: 'hero', style: { paddingBottom: 30 } }, [
      H('div', { class: 'h-row' }, [H('div', { style: { width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, html: I('building', 22, '#fff') }), H('div', { class: 'f1' }, [H('div', { class: 'h-name', text: c.name }), H('div', { class: 'h-desc', text: c.partnership })])]),
      H('div', { class: 'mt12' }, [c.status === 'approved' ? UI.tag('已备案', 'suc') : UI.tag('待审核', 'wrn')])
    ]));
    var pu = H('div', { class: 'pull-up' });
    pu.appendChild(UI.card([UI.cardHd('企业基础信息'), (function () {
      var rows = H('div');
      [['统一信用代码', '9' + c.idcard || '—'], ['成立日期', c.foundedAt], ['注册地址', c.regAddress], ['经营地址', c.bizAddress], ['团队规模', c.teamSize + ' 人'], ['联系人', c.contact + ' ' + c.contactPhone]].forEach(function (r) {
        rows.appendChild(H('div', { class: 'rowline' }, [H('span', { class: 'rl-k', text: r[0] }), H('span', { class: 'rl-v', text: r[1] })]));
      });
      return rows;
    })()]));
    pu.appendChild(UI.card([UI.cardHd('银行 / UKEY / 印章'), (function () {
      var rows = H('div');
      [['开户银行', c.bankOpened === 'yes' ? c.bankName : '未开户'], ['银行账号', c.bankAccount], ['UKEY 保管人', c.ukeyKeeper + ' ' + c.ukeyPhone], ['印章保管人', c.sealKeeper + ' ' + c.sealPhone]].forEach(function (r) {
        rows.appendChild(H('div', { class: 'rowline' }, [H('span', { class: 'rl-k', text: r[0] }), H('span', { class: 'rl-v', text: r[1] })]));
      });
      return rows;
    })()]));
    if (u.role === 'company' || u.role === 'admin') pu.appendChild(H('button', { class: 'btn pri block', style: { marginBottom: 12 }, html: I('edit', 16) + ' 编辑企业资料', onclick: editInfo }));
    b.appendChild(pu);
    function editInfo() {
      UI.sheet({ title: '编辑企业资料', build: function (bd) {
        bd.appendChild(UI.field('注册地址', UI.input({ value: c.regAddress })));
        bd.appendChild(UI.field('经营地址', UI.input({ value: c.bizAddress })));
        bd.appendChild(UI.field('联系人', UI.input({ value: c.contact })));
        bd.appendChild(UI.field('联系电话', UI.input({ value: c.contactPhone })));
      }, footer: [{ text: '保存并提交审核', cls: 'pri', onClick: function (api) { var inp = api.body.querySelectorAll('input'); c.regAddress = inp[0].value; c.bizAddress = inp[1].value; c.contact = inp[2].value; c.contactPhone = inp[3].value; c.updatedAt = DB.fmtTime(new Date()); DB.audit('company_info', '子公司资料变更', u.id, '更新了「' + c.name + '」的企业资料。', c.id); DB.log(u.id, '编辑资料', c.name); DB.save(); UI.toast('已保存并提交审核', 'success'); App.go('company-info'); } }] });
    }
    return { title: '子公司信息', tab: u.role === 'company' ? 'company-info' : null, body: b, onBack: function () { App.go('dash'); } };
  });

  /* ============ 股东名册 ============ */
  App.register('company-shareholders', function () {
    var u = App.user, c = myCo();
    if (!c) return { title: '股东', body: UI.empty('未关联子公司') };
    var b = H('div');
    var total = c.shareholders.reduce(function (s, x) { return s + x.share; }, 0);
    b.appendChild(UI.card([UI.h('div', { class: 'kpi-grid g2' }, [UI.kpi('股东人数', c.shareholders.length, {}), UI.kpi('合计认缴', total + '%', { color: 'var(--primary)' })])]));
    if (u.role === 'company' || u.role === 'admin') b.appendChild(H('button', { class: 'btn pri block', style: { marginBottom: 11 }, html: I('plus', 16) + ' 添加股东', onclick: addSh }));
    c.shareholders.forEach(function (s, i) {
      b.appendChild(UI.listItem({ avatar: '#7c5cff', avatarText: s.name, title: s.name + ' <span class="tag ' + (s.role === '执行事务合伙人' ? 'pri' : 'gray') + ' xs">' + s.role + '</span>', sub: '出资 ' + s.share + '% · ' + (s.paidIn || '—'), sub2: '证件 ' + s.idNo + ' · ' + s.phone, right: [UI.tag('第' + (i + 1) + '位', 'gray')] }));
    });
    function addSh() {
      UI.sheet({ title: '添加股东', build: function (bd) {
        bd.appendChild(UI.field('姓名', UI.input({})));
        bd.appendChild(UI.field('身份证号', UI.input({})));
        bd.appendChild(UI.field('手机号', UI.input({})));
        bd.appendChild(UI.field('出资比例%', UI.input({ type: 'number', min: 0, max: 100 })));
        bd.appendChild(UI.field('角色', UI.select([{ v: '有限合伙人', t: '有限合伙人' }, { v: '执行事务合伙人', t: '执行事务合伙人' }])));
        bd.appendChild(UI.field('实缴', UI.input({ placeholder: '如：50万' })));
      }, footer: [{ text: '添加', cls: 'pri', onClick: function (api) { var v = api.body.querySelectorAll('input'); var sh = { id: DB.nid('sh'), name: v[0].value.trim(), idNo: v[1].value.trim(), phone: v[2].value.trim(), share: +v[3].value || 0, role: api.body.querySelector('select').value, paidIn: v[4].value.trim() || '—' }; if (!sh.name) { UI.toast('请填写姓名', 'error'); return; } c.shareholders.push(sh); DB.log(u.id, '添加股东', c.name + ' 新增 ' + sh.name); DB.save(); UI.toast('已添加股东', 'success'); App.go('company-shareholders'); } }] });
    }
    return { title: '股东名册', body: b, onBack: function () { App.go('dash'); } };
  });

  /* ============ 工作汇报 ============ */
  App.register('company-report', function () {
    var u = App.user, c = myCo();
    if (!c) return { title: '汇报', body: UI.empty('未关联子公司') };
    var rs = DB.S.companyReports.filter(function (x) { return x.companyId === c.id; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var b = H('div');
    if (rs.length) {
      var data = rs.slice(0, 6).reverse().map(function (r) { return { k: r.date.slice(5), v: r.amount / 10000 }; });
      b.appendChild(UI.card([UI.cardHd('业绩趋势（万元）'), H('div', { html: UI.bars(data, { h: 120, vfmt: function (v) { return v; } }) })]));
    }
    if (u.role === 'company' || u.role === 'admin') b.appendChild(H('button', { class: 'btn pri block', style: { marginBottom: 11 }, html: I('plus', 16) + ' 提交工作汇报', onclick: addR }));
    rs.forEach(function (r) {
      b.appendChild(UI.card([
        UI.h('div', { class: 'flex gap8', style: { alignItems: 'center' } }, [H('b', { text: r.date }), UI.tag('学习率' + r.learnRate + '%', 'pri'), UI.tag('订单' + r.orders, 'suc')]),
        H('div', { class: 'li-d mt8', text: r.content }),
        H('div', { class: 'muted small mt8', text: '拓客 ' + r.customers + ' · 团队活跃 ' + r.teamActive + ' · 业绩 ' + UI.money(r.amount) })
      ]));
    });
    if (!rs.length) b.appendChild(UI.empty('暂无汇报'));
    function addR() {
      UI.sheet({ title: '工作汇报', build: function (bd) {
        bd.appendChild(UI.field('学习达标率%', UI.input({ type: 'number', min: 0, max: 100, value: 80 })));
        bd.appendChild(UI.field('成交订单', UI.input({ type: 'number', min: 0, value: 5 })));
        bd.appendChild(UI.field('业绩金额(元)', UI.input({ type: 'number', min: 0, value: 200000 })));
        bd.appendChild(UI.field('拓客数', UI.input({ type: 'number', min: 0, value: 30 })));
        bd.appendChild(UI.field('团队活跃', UI.input({ type: 'number', min: 0, value: 10 })));
        bd.appendChild(UI.field('汇报内容', UI.input({ area: true, placeholder: '本周经营小结' })));
      }, footer: [{ text: '提交', cls: 'pri', onClick: function (api) { var v = api.body.querySelectorAll('input,textarea'); DB.S.companyReports.push({ id: DB.nid('cr'), companyId: c.id, date: DB.fmtDate(new Date()), learnRate: +v[0].value || 0, orders: +v[1].value || 0, amount: +v[2].value || 0, customers: +v[3].value || 0, teamActive: +v[4].value || 0, content: v[5].value.trim() || '—', at: DB.fmtTime(new Date()) }); DB.log(u.id, '提交汇报', c.name); DB.save(); UI.toast('已提交', 'success'); App.go('company-report'); } }] });
    }
    return { title: '工作汇报', body: b, onBack: function () { App.go('dash'); } };
  });

  /* ============ 机构 PK ============ */
  App.register('company-pk', function () {
    var u = App.user, cid = u.companyId;
    var b = H('div');
    var pks = DB.S.pks.filter(function (p) { return p.scope === 'company' && (p.aId === cid || p.bId === cid); });
    if (!pks.length) b.appendChild(UI.empty('暂无机构PK'));
    pks.forEach(function (p) {
      var opp = p.aId === cid ? p.bId : p.aId;
      b.appendChild(UI.card([
        UI.h('div', { class: 'flex gap8' }, [H('b', { class: 'f1', text: 'VS ' + uname(opp) }), p.status === 'running' ? UI.tag('进行中', 'pri') : UI.tag(p.winner === cid ? '胜' : '负', p.winner === cid ? 'suc' : 'dan')]),
        H('div', { class: 'mt12' }, [H('div', { class: 'rank-nm' }, [H('span', { text: DB.company(cid).name }), H('b', { text: p.progA + '/' + p.targetA })]), H('div', { html: UI.progressBar(Math.min(100, Math.round(p.progA / p.targetA * 100)), p.progA >= p.targetA ? 'suc' : '') })]),
        H('div', { class: 'mt8' }, [H('div', { class: 'rank-nm' }, [H('span', { text: uname(opp) }), H('b', { text: p.progB + '/' + p.targetB })]), H('div', { html: UI.progressBar(Math.min(100, Math.round(p.progB / p.targetB * 100)), p.progB >= p.targetB ? 'suc' : '') })]),
        H('div', { class: 'li-d mt8', text: DB.dimName(p.dim) + ' · 赌注：' + p.stake })
      ]));
    });
    return { title: '机构 PK', body: b, onBack: function () { App.go('dash'); } };
  });

  /* ============ 业绩台账 ============ */
  App.register('company-ledger', function () {
    var u = App.user, cid = u.companyId, b = H('div');
    var sc = DB.statsCompany(cid);
    b.appendChild(UI.card([UI.h('div', { class: 'kpi-grid g2' }, [
      UI.kpi('团队人数', sc.team, {}), UI.kpi('学习达标率', sc.learnRate + '%', { color: 'var(--success)' }),
      UI.kpi('累计订单', sc.orders, {}), UI.kpi('业绩金额', UI.wan(sc.amount), { grad: 'grad2' })
    ])]));
    var members = sc.list;
    b.appendChild(UI.card([UI.cardHd('团队成员（' + members.length + '）')]));
    members.forEach(function (m) { var s = DB.learnSummary(m.id); var rt = s.total ? Math.round(s.done / s.total * 100) : 0;
      b.appendChild(UI.listItem({ avatar: m.avatarColor, avatarText: m.name, title: m.name, sub: DB.levelName(m.levelId), right: [rt >= 100 ? UI.tag('达标', 'suc') : UI.tag(rt + '%', 'wrn')] }));
    });
    return { title: '业绩台账', tab: u.role === 'company' ? 'company-ledger' : null, body: b, onBack: function () { App.go('dash'); } };
  });

  /* ============ 总部财务：月度运营 ============ */
  App.register('fin-month', function () {
    var b = H('div');
    var ms = DB.S.finMonths.slice().reverse();
    var last6 = ms.slice(0, 6).reverse();
    b.appendChild(UI.card([UI.cardHd('近 6 月营收趋势（万元）'), H('div', { html: UI.line(last6.map(function (m) { return { k: m.month.slice(2), v: Math.round(m.income / 10000) }; }), { h: 130 }) })]));
    b.appendChild(UI.card([UI.cardHd('近 6 月利润（万元）'), H('div', { html: UI.bars(last6.map(function (m) { return { k: m.month.slice(2), v: Math.round(m.profit / 10000) }; }), { h: 120 }) })]));
    ms.forEach(function (m) {
      b.appendChild(UI.listItem({ icon: I('calendar', 18, '#fff'), iconBg: m.locked ? '#98a2b3' : '#12b76a', title: m.month + (m.locked ? ' · 已锁定' : ' · 可编辑'), sub: '新增会员 ' + m.newMembers + ' · 订单 ' + m.orders + ' · 退费 ' + UI.wan(m.refund), right: [H('div', { class: 'li-v', style: { color: 'var(--success)' }, text: UI.wan(m.profit) }), H('div', { class: 'mt8' }, [UI.tag('收入' + UI.wan(m.income), 'suc')])], onclick: function () { App.go('fin-month-detail/' + m.month); } }));
    });
    return { title: '月度运营', tab: App.user.role === 'finance' ? 'fin-month' : null, body: b, onBack: function () { App.go('dash'); } };
  });
  App.register('fin-month-detail', function (params) {
    var m = DB.S.finMonths.filter(function (x) { return x.month === params[0]; })[0];
    if (!m) return { title: '详情', body: UI.empty('无数据') };
    var b = H('div');
    b.appendChild(UI.card([UI.h('div', { class: 'kpi-grid g2' }, [UI.kpi('收入', UI.wan(m.income), { grad: 'grad' }), UI.kpi('支出', UI.wan(m.expense), { grad: 'grad2' }), UI.kpi('利润', UI.wan(m.profit), { color: 'var(--success)' }), UI.kpi('退费', UI.wan(m.refund), { color: 'var(--danger)' })])]));
    var d1 = m.incomes.map(function (x) { return { k: x.name, v: Math.round(x.v / 10000), color: '#12b76a' }; });
    var d2 = m.expenses.map(function (x) { return { k: x.name, v: Math.round(x.v / 10000), color: '#f04438' }; });
    b.appendChild(UI.card([UI.cardHd('收入构成（万元）'), UI.ranking(d1, { vfmt: function (v) { return v; } })]));
    b.appendChild(UI.card([UI.cardHd('支出构成（万元）'), UI.ranking(d2, { vfmt: function (v) { return v; } })]));
    return { title: m.month + ' 详情', backBtn: true, body: b };
  });

  /* ============ 收支利润 ============ */
  App.register('fin-pl', function () {
    var b = H('div');
    var ms = DB.S.finMonths.slice().reverse();
    var inc = ms.reduce(function (s, m) { return s + m.income; }, 0), exp = ms.reduce(function (s, m) { return s + m.expense; }, 0);
    b.appendChild(UI.card([UI.h('div', { class: 'kpi-grid g3' }, [UI.kpi('总收入', UI.wan(inc), { grad: 'grad' }), UI.kpi('总支出', UI.wan(exp), { grad: 'grad2' }), UI.kpi('总利润', UI.wan(inc - exp), { color: 'var(--success)' })])]));
    b.appendChild(UI.card([UI.cardHd('收入 vs 支出（万元）'), H('div', { html: UI.bars(ms.slice(0, 8).reverse().map(function (m) { return { k: m.month.slice(2), v: Math.round(m.income / 10000) }; }), { h: 120 }) })]));
    b.appendChild(UI.card([UI.cardHd('利润走势（万元）'), H('div', { html: UI.line(ms.slice(0, 8).reverse().map(function (m) { return { k: m.month.slice(2), v: Math.round(m.profit / 10000) }; }), { h: 120 }) })]));
    return { title: '收支利润', body: b, onBack: function () { App.go('dash'); } };
  });

  /* ============ 佣金台账 ============ */
  App.register('fin-commission', function () {
    var b = H('div');
    var cms = DB.S.commissions;
    var settle = DB.commissionSum(cms, 'settleable'), pending = DB.commissionSum(cms, 'pending'), locked = DB.commissionSum(cms, 'locked'), settled = DB.commissionSum(cms, 'settled');
    b.appendChild(UI.card([UI.h('div', { class: 'kpi-grid g2' }, [
      UI.kpi('可结算', UI.money(settle), { grad: 'grad' }), UI.kpi('结算中', UI.money(pending), { color: 'var(--warn)' }),
      UI.kpi('已锁定', UI.money(locked), {}), UI.kpi('已发放', UI.money(settled), { color: 'var(--success)' })
    ])]));
    b.appendChild(H('div', { class: 'btn-row', style: { padding: '0 0 11px' } }, [H('button', { class: 'btn pri', html: I('download', 16) + ' 导出台账', onclick: function () {
      var rows = cms.map(function (c) { return [uname(c.referrerId), uname(c.memberId), c.amount, ({ settleable: '可结算', settled: '已发放', pending: '结算中', locked: '已锁定' })[c.status] || c.status, c.month]; });
      DB.download('佣金台账_' + DB.fmtDate(new Date()) + '.csv', DB.toCSV(['推荐人', '下级会员', '金额', '状态', '月份'], rows)); UI.toast('已导出', 'success');
    } })]));
    cms.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).forEach(function (c) {
      var st = c.status === 'settleable' ? UI.tag('可结算', 'suc') : c.status === 'settled' ? UI.tag('已发放', 'gray') : c.status === 'pending' ? UI.tag('结算中', 'wrn') : UI.tag('已锁定', 'dan');
      b.appendChild(UI.listItem({ title: uname(c.referrerId) + ' ← ' + uname(c.memberId), sub: c.month + (c.note ? ' · ' + c.note : ''), right: [H('div', { class: 'li-v', text: UI.money(c.amount) }), H('div', { class: 'mt8' }, [st])] }));
    });
    return { title: '佣金台账', body: b, onBack: function () { App.go('dash'); } };
  });

  /* ============ 差错管理 ============ */
  App.register('fin-error', function () {
    var b = H('div');
    var es = DB.S.errors.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    b.appendChild(UI.card([UI.kpi('差错总数', es.length, { color: 'var(--danger)' }), UI.h('div', { class: 'kpi-grid g2 mt8' }, [UI.kpi('已处理', es.filter(function (e) { return e.handled; }).length, { color: 'var(--success)' }), UI.kpi('待处理', es.filter(function (e) { return !e.handled; }).length, { color: 'var(--warn)' })])]));
    es.forEach(function (e) {
      b.appendChild(UI.listItem({ icon: I('alert', 18, '#fff'), iconBg: '#f04438', title: e.type + ' · ' + e.impact, sub: uname(e.personId) + ' @ ' + uname(e.companyId), sub2: e.content, right: [e.handled ? UI.tag('已处理', 'suc') : UI.tag('待处理', 'wrn')] }));
    });
    return { title: '差错管理', body: b, onBack: function () { App.go('dash'); } };
  });

  /* ============ 流失分析 ============ */
  App.register('fin-churn', function () {
    var b = H('div');
    var cs = DB.S.churns.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; });
    var totalAmt = cs.reduce(function (s, c) { return s + c.amount; }, 0);
    var byReason = {};
    cs.forEach(function (c) { byReason[c.reason] = (byReason[c.reason] || 0) + 1; });
    b.appendChild(UI.card([UI.h('div', { class: 'kpi-grid g2' }, [UI.kpi('流失客户', cs.length, { color: 'var(--danger)' }), UI.kpi('流失金额', UI.wan(totalAmt), { color: 'var(--danger)' })])]));
    b.appendChild(UI.card([UI.cardHd('流失原因分布'), UI.ranking(Object.keys(byReason).map(function (k) { return { k: k, v: byReason[k] }; }))]));
    cs.forEach(function (c) {
      b.appendChild(UI.listItem({ icon: I('percent', 18, '#fff'), iconBg: '#06aed4', title: c.customer, sub: c.type + ' · ' + c.reason, right: [UI.tag(UI.wan(c.amount), 'dan')] }));
    });
    return { title: '流失分析', body: b, onBack: function () { App.go('dash'); } };
  });
})(window);

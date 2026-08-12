/* 后台管理（PC 端）：会员 / 级别 / 课程 / 企业名单 / 运营中心 / 审核 / 日志 / 系统 / 财务 / 配置 */
(function (w, UI, DB, App) {
  'use strict';
  var I = w.Icon;
  var S = function () { return DB.S; };

  function kv(k, v) { return UI.h('div', { class: 'kv-i' }, [UI.h('span', { class: 'kv-k', text: k }), UI.h('span', { class: 'kv-v', text: v })]); }

  /* ============ 管理驾驶舱 ============ */
  App.register('admin-dash', function () {
    var b = UI.h('div', { class: 'page' });
    var M = DB.members().length, dis = DB.disabledCount(), L = DB.S.leads.length;
    var unassign = DB.unassignedLeads().length, junior = DB.S.members.filter(function (m) { return m.juniorDone; }).length;
    var audits = DB.S.audits.filter(function (a) { return a.status === 'pending'; }).length;
    var reqs = DB.S.leadRequests.filter(function (r) { return r.status === 'pending'; }).length;
    b.appendChild(UI.h('div', { class: 'hero sm' }, [UI.h('div', { class: 'hero-t', text: '管理驾驶舱' }), UI.h('div', { class: 'hero-s', text: App.user.name + ' · 总部' })]));
    b.appendChild(UI.card(UI.h('div', { class: 'kpi-grid g3' }, [
      UI.kpi('会员总数', M, {}), UI.kpi('已禁用', dis, { color: 'var(--danger)' }), UI.kpi('完成初级', junior, { color: 'var(--success)' }),
      UI.kpi('企业名单', L, {}), UI.kpi('未分配', unassign, { color: 'var(--warn)' }), UI.kpi('待审核', audits + reqs, { color: 'var(--warn)' })
    ])));

    // 课程学习概况（每课程：在学人数 / 学习次数 / 完成人数）
    b.appendChild(UI.sec('课程学习概况（每课程在学 / 次数 / 完成）'));
    DB.S.courses.forEach(function (c) {
      var st = DB.courseStats(c.id);
      b.appendChild(UI.listItem({
        title: c.name, sub: c.cat + '业务培训' + (c.chapterList && c.chapterList.length ? (' · ' + c.chapterList.length + ' 节') : ' · 不分节'),
        right: [UI.tag('在学 ' + st.learners, 'inf'), UI.tag('学习 ' + st.times + ' 次', 'gray'), UI.tag('完成 ' + st.completed, 'suc')],
        onclick: function () { courseLearners(c, st); }
      }));
    });

    // 会员领名单 / 开发数据
    var ls = DB.leadStats();
    b.appendChild(UI.sec('会员领名单 / 开发数据'));
    b.appendChild(UI.card(UI.h('div', { class: 'kpi-grid g3' }, [
      UI.kpi('名单总量', ls.total, {}),
      UI.kpi('已分配', ls.distributed, { color: 'var(--inf)' }),
      UI.kpi('会员新增', ls.memberAdded, { color: 'var(--primary)' })
    ])));
    b.appendChild(UI.h('div', { class: 'muted small mt8', text: '状态分布：' + Object.keys(ls.byStatus).map(function (k) { return DB.followName(k) + ' ' + ls.byStatus[k]; }).join(' · ') }));

    // 名单分配申请（会员自选区域 + 数量，后台审核派单）
    b.appendChild(UI.sec('名单分配申请（待处理 ' + reqs + '）'));
    var pendingReqs = DB.S.leadRequests.filter(function (r) { return r.status === 'pending'; });
    if (!pendingReqs.length) b.appendChild(UI.h('div', { class: 'muted small mt8', text: '暂无会员申请' }));
    pendingReqs.slice(0, 20).forEach(function (r) {
      var m = DB.member(r.memberId);
      b.appendChild(UI.listItem({
        title: (m ? m.name : r.memberId) + ' 申请「' + r.region + '」',
        sub: '希望 ' + (r.count || '默认') + ' 条 · ' + r.time,
        right: [
          UI.btn('通过', 'mini', function () { var res = DB.resolveAudit(r.id, true); UI.toast(res && res.msg ? res.msg : '已通过', res && res.ok === false ? 'error' : 'success'); App.go('admin-dash'); }),
          UI.btn('拒', 'mini dan', function () { DB.resolveAudit(r.id, false); App.go('admin-dash'); })
        ]
      }));
    });

    // 近期操作
    b.appendChild(UI.sec('近期操作'));
    DB.S.logs.slice().reverse().slice(0, 8).forEach(function (l) {
      b.appendChild(UI.listItem({ title: l.action, sub: (l.detail || '') + '　' + l.time, right: [UI.icon('chevronR', 18, '#c2c8d2')] }));
    });

    var links = [
      { k: 'admin-members', t: '会员管理', ic: 'users' }, { k: 'admin-leads', t: '企业名单', ic: 'list' },
      { k: 'admin-courses', t: '课程管理', ic: 'book' }, { k: 'admin-grades', t: '会员级别', ic: 'tag' },
      { k: 'admin-orgs', t: '运营中心', ic: 'building' }, { k: 'admin-audit', t: '审核中心', ic: 'check' }
    ];
    var g = UI.h('div', { class: 'app-grid' });
    links.forEach(function (a) { g.appendChild(UI.h('button', { class: 'app-cell', onclick: function () { App.go(a.k); } }, [UI.h('span', { class: 'app-ic', style: { background: 'var(--primary)' }, html: I(a.ic, 22, '#fff') }), UI.h('span', { class: 'app-t', text: a.t })])); });
    b.appendChild(UI.sec('快捷入口')); b.appendChild(g);
    return { body: b };
  });

  function courseLearners(c, st) {
    UI.sheet({ title: c.name + ' · 学习名单', build: function (bd) {
      bd.appendChild(UI.h('div', { class: 'kv' }, [kv('在学人数', st.learners), kv('累计学习次数', st.times), kv('完成人数', st.completed)]));
      if (!st.names.length) bd.appendChild(UI.h('div', { class: 'muted small mt8', text: '暂无会员学习' }));
      else bd.appendChild(UI.h('div', { class: 'chips mt8' }, st.names.slice(0, 40).map(function (n) { return UI.tag(n, 'gray'); })));
    }, footer: [{ text: '关闭', cls: 'pri', onClick: function (api) { api.close(); } }] });
  }

  /* ============ 会员管理 ============ */
  App.register('admin-members', function () {
    var b = UI.h('div', { class: 'page' });
    var f = { q: '', uid: '', level: '', status: '', refId: '', region: '' };
    var page = 0, PAGE = 20;

    /* ---- 页面标题 + 右侧操作按钮（参照模板） ---- */
    var titleBar = UI.h('div', { class: 'member-title-bar' }, [
      UI.h('div', { class: 'member-page-title', text: '会员查询' }),
      UI.h('div', { class: 'member-title-actions' }, [
        UI.btn('合并会员', 'ghost sm', function () { UI.toast('合并会员功能开发中'); }),
        UI.btn('+ 添加会员', 'ghost sm', addMember),
        UI.btn('会员EXCEL导入', 'ghost sm', importMembers)
      ])
    ]);
    b.appendChild(titleBar);

    /* ---- 筛选行 1（参照模板第一行） ---- */
    var filter1 = UI.h('div', { class: 'm-filter-row' }, [
      UI.h('div', { class: 'm-filter-item' }, [
        UI.input({ placeholder: '会员ID', value: '', oninput: function (e) { f.uid = e.target.value; page = 0; draw(); } })
      ]),
      UI.h('div', { class: 'm-filter-item flex-2' }, [
        UI.input({ placeholder: '可搜索昵称/姓名/手机号', value: '', oninput: function (e) { f.q = e.target.value; page = 0; draw(); } })
      ]),
      UI.h('div', { class: 'm-filter-item' }, [
        UI.select([{ v: '', t: '配额' }, { v: '有', t: '有配额' }, { v: '无', t: '无配额' }], '', function (e) { f.quota = e.target.value; page = 0; draw(); })
      ]),
      UI.h('div', { class: 'm-filter-item' }, [
        UI.input({ placeholder: '自定义字段', oninput: function (e) { f.custom = e.target.value; page = 0; draw(); } })
      ]),
      UI.h('div', { class: 'm-filter-item' }, [
        UI.select(DB.S.grades.map(function (g) { return { v: g.name, t: g.name }; }).concat([{ v: '', t: '会员等级不限' }]), '', function (e) { f.level = e.target.value; page = 0; draw(); })
      ]),
      UI.h('div', { class: 'm-filter-item' }, [
        UI.select([{ v: '', t: '会员分组不限' }], '', function () {})
      ]),
      UI.h('div', { class: 'm-filter-item' }, [
        UI.select([{ v: '', t: '推广员不限' }], '', function () {})
      ])
    ]);
    b.appendChild(filter1);

    /* ---- 筛选行 2（参照模板第二行） ---- */
    var filter2 = UI.h('div', { class: 'm-filter-row' }, [
      UI.h('div', { class: 'm-filter-item' }, [
        UI.input({ placeholder: '推荐人ID', oninput: function (e) { f.refId = e.target.value; page = 0; draw(); } })
      ]),
      UI.h('div', { class: 'm-filter-item' }, [
        UI.select([{ v: '', t: '不限关注' }, { v: 'y', t: '已关注' }, { v: 'n', t: '未关注' }], '', function () {})
      ]),
      UI.h('div', { class: 'm-filter-item' }, [
        UI.select([{ v: '', t: '不限属名单' }, { v: 'y', t: '有名单' }, { v: 'n', t: '无名单' }], '', function () {})
      ]),
      UI.h('div', { class: 'm-filter-item date-range' }, [
        UI.input({ placeholder: '开始日期', oninput: function (e) { f.dateFrom = e.target.value; page = 0; draw(); } }),
        UI.h('span', { text: '至' }),
        UI.input({ placeholder: '结束日期', oninput: function (e) { f.dateTo = e.target.value; page = 0; draw(); } })
      ]),
      UI.h('div', { class: 'm-filter-item' }, [
        UI.select([{ v: '', t: '标签' }], '', function () {})
      ]),
      UI.h('div', { class: 'm-filter-item actions' }, [
        UI.btn('搜索', 'pri sm', function () { page = 0; draw(); }),
        UI.btn('导出EXCEL', 'ghost sm', function () { exportMembers(); })
      ])
    ]);
    b.appendChild(filter2);

    /* ---- 统计摘要栏 + 表格容器 ---- */
    var box = UI.h('div', { class: 'mt8' });
    b.appendChild(box);
    var pager = UI.h('div', { class: 'pager' });
    b.appendChild(pager);

    /* ---- 头像圆圈辅助函数 ---- */
    function avatarCircle(name, size) {
      size = size || 32;
      var initial = (name || '?').charAt(0);
      var colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
      var color = colors[(name || '').length % colors.length];
      return UI.h('div', { class: 'avatar-circle', style: { width: size + 'px', height: size + 'px', backgroundColor: color, fontSize: Math.round(size * 0.45) + 'px', lineHeight: size + 'px' }, text: initial, title: name });
    }

    /* ---- 表格行构建（参照模板列） ---- */
    function rowOf(m) {
      var ref = DB.referrerOf(m);
      var ls = DB.learnSummary(m.id);
      var leads = DB.leadsOf(m.id);
      var dealCount = leads.filter(function (l) { return l.status === 'deal'; }).length;
      var reps = DB.reportsOf(m.id).length;
      var subs = DB.subordinates(m);
      return UI.h('tr', { class: 'm-member-row', onclick: function () { viewMember(m); } }, [
        /* 会员ID/编号 */ UI.h('td', { class: 'm-td-id' }, [UI.h('span', { text: m.uid })]),
        /* 推荐人 */ UI.h('td', {}, [UI.h('div', { class: 'm-cell-avatar' }, [
          avatarCircle(ref ? ref.name : '无'), UI.h('span', { class: 'm-avatar-name', text: ref ? ref.name : '无' })
        ])]),
        /* 粉丝/下线 */ UI.h('td', {}, [UI.h('div', { class: 'm-cell-avatar' }, [
          avatarCircle(m.name), UI.h('span', { class: 'm-avatar-name', text: subs.length > 0 ? subs[0].name : (m.wechat || '—' ) })
        ])]),
        /* 姓名/手机号 */ UI.h('td', {}, [
          UI.h('div', { class: 'm-name-line', text: m.name }),
          UI.h('div', { class: 'm-phone-line muted small', text: m.phone || '—' })
        ]),
        /* 所在地 */ UI.h('td', { text: m.region || '—' }),
        /* 等级/分组 */ UI.h('td', {}, [
          UI.h('div', { class: 'm-dropdown-fake', text: DB.levelName(m.level) + ' ▼' }),
          UI.h('div', { class: 'm-dropdown-fake muted small', text: '无分 ▼' })
        ]),
        /* 注册时间 */ UI.h('td', { class: 'm-td-time' }, [
          UI.h('div', { text: (m.joinedAt || '').slice(0, 10) }),
          UI.h('div', { class: 'muted small', text: (m.joinedAt || '').slice(11, 16) })
        ]),
        /* 积分/余额 */ UI.h('td', {}, [
          UI.h('div', { class: 'badge badge-teal', text: '积分: ' + (ls.done * 10).toFixed(2) }),
          UI.h('div', { class: 'badge badge-orange', text: '佣金: ¥' + (m.commission || 0).toFixed(2) })
        ]),
        /* 已完成订单 */ UI.h('td', {}, [
          UI.h('div', { class: 'badge badge-teal', text: '订单: ' + dealCount }),
          UI.h('div', { class: 'badge badge-orange', text: '报工: ' + reps })
        ]),
        /* 类型 */ UI.h('td', { class: 'm-td-type' }, [UI.h('div', {
          class: 'type-icon type-wechat', title: m.role === 'org' ? '机构会员' : '个人会员',
          style: { backgroundColor: m.role === 'org' ? '#2ecc71' : '#07C160', borderRadius: '50%', width: '24px', height: '24px' }
        })]),
        /* 所属企业 */ UI.h('td', { class: 'muted small', text: '—' }),
        /* 操作 */ UI.h('td', { class: 'm-td-action' }, [UI.h('a', { class: 'link-detail', text: '详情', onclick: function (e) { e.stopPropagation(); viewMember(m); } })])
      ]);
    }

    function draw() {
      var list = DB.members().filter(function (m) {
        if (f.level && m.level !== f.level) return false;
        if (f.status && m.status !== f.status) return false;
        if (f.uid && m.uid.indexOf(f.uid) < 0) return false;
        if (f.q) { var q = f.q.toLowerCase(); if ((m.name + m.uid + m.phone).toLowerCase().indexOf(q) < 0) return false; }
        if (f.refId) { var r = DB.referrerOf(m); if (!r || r.uid.indexOf(f.refId) < 0) return false; }
        return true;
      });
      box.innerHTML = '';

      /* 统计摘要栏（参照模板） */
      var total = list.length;
      var normalCnt = list.filter(function (m) { return m.status === 'normal'; }).length;
      var disabledCnt = list.filter(function (m) { return m.status === 'disabled'; }).length;
      var orgCnt = list.filter(function (m) { return m.role === 'org'; }).length;
      box.appendChild(UI.h('div', { class: 'stats-bar' }, [
        UI.h('span', { class: 'stats-label', text: '会员列表' }),
        UI.h('span', { class: 'stats-bold', text: '总数：' + total + '，' }),
        UI.h('span', { class: 'stats-item', text: '正常会员：' + normalCnt + '，' }),
        UI.h('span', { class: 'stats-item', text: '禁用会员：' + disabledCnt + '，' }),
        UI.h('span', { class: 'stats-item', text: '机构会员：' + orgCnt + '，' }),
        UI.h('span', { class: 'stats-item', text: '个人会员：' + (total - orgCnt) + '，' }),
        UI.h('span', { class: 'stats-item', text: '有推荐人：' + list.filter(function (m) { return !!DB.referrerOf(m); }).length + '，' }),
        UI.h('span', { class: 'stats-item', text: '已绑定微信：' + list.filter(function (m) { return !!m.wechat; }).length + '，' }),
        UI.h('span', { class: 'stats-item', text: '已完成初级：' + list.filter(function (m) { return m.juniorDone; }).length })
      ]));

      var totalPages = Math.max(1, Math.ceil(list.length / PAGE));
      if (page >= totalPages) page = totalPages - 1;

      var tbl = UI.h('table', { class: 'tbl m-member-table' }, [
        UI.h('thead', {}, [UI.h('tr', {}, [
          UI.h('th', {}, [UI.h('div', { text: '会员ID' }), UI.h('div', { class: 'muted small', text: '会员编号' })]),
          UI.h('th', { text: '推荐人' }),
          UI.h('th', { text: '粉丝' }),
          UI.h('th', {}, [UI.h('div', { text: '姓名' }), UI.h('div', { class: 'muted small', text: '手机号' })]),
          UI.h('th', { text: '所在地' }),
          UI.h('th', {}, [UI.h('div', { text: '等级' }), UI.h('div', { class: 'muted small', text: '分组' })]),
          UI.h('th', { text: '注册时间' }),
          UI.h('th', {}, [UI.h('div', { text: '积分' }), UI.h('div', { class: 'muted small', text: '余额' })]),
          UI.h('th', {}, [UI.h('div', { text: '已完成订单' })]),
          UI.h('th', { text: '类型' }),
          UI.h('th', { text: '所属企业' }),
          UI.h('th', { text: '操作' })
        ])]),
        UI.h('tbody', {}, list.slice(page * PAGE, page * PAGE + PAGE).map(rowOf))
      ]);
      box.appendChild(UI.h('div', { class: 'tbl-wrap' }, [tbl]));

      pager.innerHTML = '';
      if (totalPages > 1) {
        pager.appendChild(UI.btn('上一页', 'ghost sm', function () { if (page > 0) { page--; draw(); } }));
        pager.appendChild(UI.h('span', { class: 'pager-i', text: (page + 1) + ' / ' + totalPages }));
        pager.appendChild(UI.btn('下一页', 'ghost sm', function () { if (page < totalPages - 1) { page++; draw(); } }));
      }
    }
    draw();
    return { body: b };
  });

  function viewMember(m) {
    var subs = DB.subordinates(m);
    var ls = DB.learnSummary(m.id);
    var progs = DB.S.progress.filter(function (p) { return p.memberId === m.id; });
    var my = DB.leadsOf(m.id);
    var deals = my.filter(function (l) { return l.status === 'deal'; }).length;
    var rs = DB.reportsOf(m.id);
    var gs = DB.goalsOf(m.id);
    UI.sheet({
      title: m.name + ' · ' + m.uid, build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'kv' }, [kv('级别', DB.levelName(m.level)), kv('所属区域', m.region || '未设（会员自选）'), kv('手机', m.phone || '—'), kv('状态', m.status === 'disabled' ? '已禁用' : '正常')]));
        bd.appendChild(UI.h('div', { class: 'kv' }, [kv('下级会员', subs.length), kv('累计佣金', '¥' + UI.num(m.commission)), kv('已打款', '¥' + UI.num(m.paid)), kv('完成初级', m.juniorDone ? '是' : '否')]));
        bd.appendChild(UI.h('div', { class: 'kv' }, [kv('微信', m.wechat || '—'), kv('身份证', m.idCard || '—'), kv('银行卡', m.bank || '—'), kv('开户行', m.bankName || '—')]));
        bd.appendChild(UI.h('div', { class: 'muted small mt8', text: '推荐人：' + (DB.referrerOf(m) ? DB.referrerOf(m).name + ' (' + DB.referrerOf(m).uid + ')' : '无') + (m.remark ? '　备注：' + m.remark : '') }));

        // ---- 职业档案（会员手机端自助录入） ----
        bd.appendChild(UI.h('div', { class: 'sec-title mt8' }, [UI.h('span', { text: '职业档案（会员自填）' })]));
        bd.appendChild(UI.h('div', { class: 'kv' }, [
          kv('从业年限', m.expYears ? m.expYears + ' 年' : '—'),
          kv('服务客户', m.accountsDone ? m.accountsDone + ' 户' : '—'),
          kv('擅长领域', m.skills || '—'),
          kv('服务行业', m.clientTypes || '—')
        ]));
        if (m.intro) bd.appendChild(UI.h('div', { class: 'muted small mt8', style: { whiteSpace: 'pre-wrap' }, text: '自我介绍：' + m.intro }));
        if (m.experience) bd.appendChild(UI.h('div', { class: 'muted small mt8', style: { whiteSpace: 'pre-wrap' }, text: '工作经历：' + m.experience }));
        if (!m.intro && !m.experience && !m.expYears) bd.appendChild(UI.h('div', { class: 'muted small', text: '该会员尚未在手机端填写职业档案' }));
        bd.appendChild(UI.h('div', { class: 'muted small mt8', html: '会计证：' + (m.certImg
          ? '<a href="' + m.certImg + '" target="_blank" style="color:var(--primary)">查看证书</a>' + (m.certNo ? '（' + m.certNo + '）' : '')
          : (m.certNo || '未上传')) }));
        bd.appendChild(UI.h('div', { class: 'muted small', html: '个人简历：' + ((m.resumeData || m.resume)
          ? '<a href="' + (m.resumeData || m.resume) + '" target="_blank" download="' + (m.resumeName || (m.name + '-简历')) + '" style="color:var(--primary)">下载' + (m.resumeName ? '（' + m.resumeName + '）' : '') + '</a>'
          : '未上传') }));

        bd.appendChild(UI.h('div', { class: 'sec-title mt8' }, [UI.h('span', { text: '学习课程进度：' + ls.done + '/' + ls.total + '（' + ls.pct + '%）' })]));
        if (!progs.length) bd.appendChild(UI.h('div', { class: 'muted small', text: '暂无学习记录' }));
        progs.slice(0, 30).forEach(function (p) {
          var c = DB.course(p.courseId);
          bd.appendChild(UI.listItem({ title: c ? c.name : p.courseId, sub: '学习 ' + (p.times || 0) + ' 次 · ' + (p.done && p.examPass ? '已完成并考试通过' : (p.done ? '已学完待通过' : '学习中')), right: [UI.tag(p.done && p.examPass ? '通过' : (p.done ? '未通过' : '进行'), p.done && p.examPass ? 'suc' : 'gray')] }));
        });

        bd.appendChild(UI.h('div', { class: 'sec-title mt8' }, [UI.h('span', { text: '客户开发进度：领取 ' + my.length + ' 条 · 成交 ' + deals + ' 条' })]));
        if (!my.length) bd.appendChild(UI.h('div', { class: 'muted small', text: '暂无领取名单' }));
        my.slice(0, 30).forEach(function (l) {
          bd.appendChild(UI.listItem({ title: l.company, sub: (l.city || '') + ' · ' + DB.followName(l.status) + (l.memberAdded ? ' · 会员新增' : ''), right: [UI.tag(DB.followName(l.status), DB.followColor(l.status))] }));
        });

        bd.appendChild(UI.h('div', { class: 'sec-title mt8' }, [UI.h('span', { text: '工作汇报（' + rs.length + '）' })]));
        if (!rs.length) bd.appendChild(UI.h('div', { class: 'muted small', text: '暂无报工' }));
        rs.slice().reverse().slice(0, 20).forEach(function (r) {
          bd.appendChild(UI.listItem({ title: r.date + (r.done ? ' · 已提交' : ''), sub: r.content || '无备注' }));
        });

        bd.appendChild(UI.h('div', { class: 'sec-title mt8' }, [UI.h('span', { text: '目标设定（' + gs.length + '）' })]));
        if (!gs.length) bd.appendChild(UI.h('div', { class: 'muted small', text: '暂无目标' }));
        gs.slice(0, 20).forEach(function (g) {
          bd.appendChild(UI.listItem({ title: g.content, sub: DB.periodName(g.period) + ' · 目标 ' + g.target + (g.progress != null ? ' · 进度 ' + g.progress : '') + (g.done ? ' · 已完成' : '') }));
        });
      },
      footer: [
        { text: '编辑资料', cls: 'ghost', onClick: function (api) { api.close(); editMemberInfo(m); } },
        { text: '考核评价', cls: 'pri', onClick: function (api) { api.close(); evalMember(m); } },
        { text: '设置密码', cls: 'ghost', onClick: function (api) { api.close(); setMemberPwd(m); } }
      ]
    });
  }

  // 后台设置/重置会员登录密码（写后端，多端共享）
  function setMemberPwd(m) {
    var np = UI.input({ type: 'password', placeholder: '新密码（至少 6 位）' });
    var np2 = UI.input({ type: 'password', placeholder: '确认新密码' });
    UI.sheet({
      title: '设置登录密码 · ' + m.name,
      build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'notice-bar', html: I('info', 14) + ' 设置后会员请用新密码登录（默认 888888）。' }));
        bd.appendChild(UI.field('新密码', np));
        bd.appendChild(UI.field('确认新密码', np2));
      },
      footer: [
        { text: '取消', cls: 'ghost', onClick: function (api) { api.close(); } },
        { text: '保存', cls: 'pri', onClick: function (api) {
          var v = np.value;
          if (v.length < 6) { UI.toast('新密码至少 6 位', 'error'); return; }
          if (v !== np2.value) { UI.toast('两次输入不一致', 'error'); return; }
          DB.adminSetMemberPassword(m.uid, v).then(function (r) {
            if (r && r.ok) { UI.toast('已设置 ' + m.name + ' 的密码'); api.close(); }
            else UI.toast((r && r.msg) || '设置失败', 'error');
          });
        } }
      ]
    });
  }

  function editMemberInfo(m) {
    var wechat = UI.input({ value: m.wechat || '' });
    var idCard = UI.input({ value: m.idCard || '' });
    var bank = UI.input({ value: m.bank || '' });
    var bankName = UI.input({ value: m.bankName || '' });
    var remark = UI.input({ value: m.remark || '' });
    var intro = UI.input({ area: true, value: m.intro || '' });
    var expYears = UI.input({ type: 'number', value: m.expYears || '' });
    var accountsDone = UI.input({ type: 'number', value: m.accountsDone || '' });
    var skills = UI.input({ value: m.skills || '', placeholder: '如：小规模代账、汇算清缴' });
    var clientTypes = UI.input({ value: m.clientTypes || '', placeholder: '如：餐饮门店、建筑劳务' });
    var certNo = UI.input({ value: m.certNo || '', placeholder: '会计证 / 职称证书编号' });
    var experience = UI.input({ area: true, value: m.experience || '' });
    var pubOn = m.publicProfile !== false;
    UI.sheet({
      title: '编辑资料 · ' + m.name, build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'muted small', text: '区域由会员在手机端自行选择，后台不指定；此处仅补录联系方式与职业档案。' }));
        bd.appendChild(UI.field('微信', wechat)); bd.appendChild(UI.field('身份证', idCard));
        bd.appendChild(UI.field('银行卡', bank)); bd.appendChild(UI.field('开户行', bankName));
        bd.appendChild(UI.field('备注', remark));
        bd.appendChild(UI.field('自我介绍', intro));
        bd.appendChild(UI.field('从业年限(年)', expYears));
        bd.appendChild(UI.field('累计服务客户数(户)', accountsDone));
        bd.appendChild(UI.field('擅长领域', skills));
        bd.appendChild(UI.field('服务过的行业', clientTypes));
        bd.appendChild(UI.field('会计证编号', certNo));
        bd.appendChild(UI.field('工作经验', experience));
        bd.appendChild(UI.h('div', { class: 'row-between mt8' }, [
          UI.h('div', { class: 'li-t', text: '在「会员风采」公开档案' }),
          UI.switchBox(pubOn, function (v) { pubOn = v; })
        ]));
      },
      footer: [{ text: '保存', cls: 'pri', onClick: function () {
        DB.updateProfile(m.id, {
          wechat: wechat.value.trim(), idCard: idCard.value.trim(), bank: bank.value.trim(), bankName: bankName.value.trim(),
          intro: intro.value.trim(), experience: experience.value.trim(),
          skills: skills.value.trim(), clientTypes: clientTypes.value.trim(), certNo: certNo.value.trim(),
          expYears: parseInt(expYears.value, 10) || 0, accountsDone: parseInt(accountsDone.value, 10) || 0,
          publicProfile: pubOn
        });
        m.remark = remark.value.trim();
        DB.save(); UI.toast('已保存'); App.go('admin-members');
      } }]
    });
  }

  function evalMember(m) {
    var rs = DB.reportsOf(m.id);
    UI.sheet({ title: '考核评价 · ' + m.name, build: function (bd) {
      if (!rs.length) bd.appendChild(UI.h('div', { class: 'muted small', text: '该会员暂无报工记录' }));
      rs.slice().reverse().slice(0, 15).forEach(function (r) {
        var ev = DB.S.evaluations[r.id] || {};
        bd.appendChild(UI.h('div', { class: 'li' }, [
          UI.h('div', {}, [UI.h('div', { class: 'li-t', text: r.date + (r.done ? ' · 已提交' : '') }), UI.h('div', { class: 'li-d', text: r.content || '无备注' })]),
          UI.btn('评价', 'mini', function () { evalReport(m, r); })
        ]));
      });
    }, footer: [{ text: '关闭', cls: 'pri', onClick: function (api) { api.close(); } }] });
  }

  function evalReport(m, r) {
    var ev = DB.S.evaluations[r.id] || {};
    var score = UI.input({ type: 'number', placeholder: '评分 0-100', value: ev.score || '' });
    var comment = UI.input({ area: true, placeholder: '考核评语', value: ev.comment || '' });
    UI.sheet({ title: '评价 · ' + r.date, build: function (bd) {
      bd.appendChild(UI.field('评分', score)); bd.appendChild(UI.field('评语', comment));
    }, footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
      DB.evalReport(r.id, score.value, (comment.value || '').trim());
      DB.log('考核评价', m.name + ' 的报工 ' + r.date + ' 评分 ' + score.value);
      UI.toast('已保存评价'); api.close();
    } }] });
  }

  function addMember() {
    UI.sheet({
      title: '新增会员', build: function (bd) {
        var name = UI.input({ placeholder: '姓名/昵称' }); var uid = UI.input({ placeholder: '平台ID' });
        var phone = UI.input({ placeholder: '手机号' }); var lv = UI.select(DB.S.grades.map(function (g) { return { v: g.name, t: g.name }; }), '一星');
        var ref = UI.input({ placeholder: '推荐人ID（选填）' });
        var wechat = UI.input({ placeholder: '微信号（选填）' }); var idCard = UI.input({ placeholder: '身份证号（选填）' });
        var bank = UI.input({ placeholder: '银行卡号（选填）' }); var bankName = UI.input({ placeholder: '开户行（选填）' });
        bd.appendChild(UI.field('姓名', name)); bd.appendChild(UI.field('平台ID', uid)); bd.appendChild(UI.field('手机', phone));
        bd.appendChild(UI.field('级别', lv)); bd.appendChild(UI.field('推荐人ID', ref));
        bd.appendChild(UI.field('微信', wechat)); bd.appendChild(UI.field('身份证', idCard));
        bd.appendChild(UI.field('银行卡', bank)); bd.appendChild(UI.field('开户行', bankName));
        bd.appendChild(UI.h('div', { class: 'notice-bar', html: I('info', 14) + ' 区域由会员登录后自行选择，无需在此填写' }));
      },
      footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
        if (!name.value || !uid.value) { UI.toast('请填写姓名与平台ID', 'error'); return; }
        var nm = { id: 'm_' + uid.value, uid: uid.value, name: name.value, phone: phone.value, level: lv.value,
          role: (lv.value === '城市财税赋能中心' || lv.value === '城市财税赋能中心主理人') ? 'org' : 'member',
          refId: ref.value, refName: '', refPhone: '', subs: 0, commission: 0, paid: 0, blacklist: false, status: 'normal', password: '888888', region: '', joinedAt: DB.dstr(new Date()), orgId: '', companyId: '',
          wechat: wechat.value, idCard: idCard.value, bank: bank.value, bankName: bankName.value, remark: '' };
        DB.S.members.push(nm);
        DB.log('新增会员', name.value + '(' + uid.value + ') 级别 ' + lv.value);
        DB.save();
        DB.addMemberAccount(nm);   // 同步到后端，使其可登录
        UI.toast('已新增会员'); App.go('admin-members');
      } }]
    });
  }

  function importMembers() {
    var map = { uid: '会员ID', name: '会员昵称', phone: '会员手机号', level: '会员等级', refId: '推荐人ID', refName: '推荐人昵称', refPhone: '推荐人手机号', wechat: '微信号', idCard: '身份证号', bank: '银行卡号', bankName: '开户行', remark: '备注' };
    UI.sheet({
      title: '批量导入会员', build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'notice-bar', html: I('doc', 14) + ' 列顺序（首行表头）：会员ID,会员昵称,会员手机号,会员等级,推荐人ID,推荐人昵称,推荐人手机号' }));
        bd.appendChild(UI.h('div', { class: 'upload-box', onclick: function () { file.click(); }, html: I('upload', 18) + '<br>点击选择 CSV 或 在下方粘贴' }));
        var file = UI.h('input', { type: 'file', accept: '.csv,.txt', style: { display: 'none' }, onchange: function (e) { var f = e.target.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { ta.value = rd.result; }; rd.readAsText(f, 'utf-8'); } });
        bd.appendChild(file);
        var ta = UI.input({ area: true, placeholder: '会员ID,会员昵称,会员手机号,会员等级,推荐人ID\n208247,王海涛,13800000000,百户侯,103015', style: { fontFamily: 'monospace', fontSize: '11px' } });
        bd.appendChild(ta);
      },
      footer: [{ text: '解析并导入', cls: 'pri', onClick: function () {
        var ta = document.querySelector('.mask textarea');
        if (!ta || !ta.value.trim()) { UI.toast('请粘贴或选择文件', 'error'); return; }
        var rows = DB.parseTable(ta.value);
        var r = DB.importMembers(rows, map);
        UI.toast('导入完成：新增 ' + r.added + '，跳过重复 ' + r.skip, 'success');
        App.go('admin-members');
      } }]
    });
  }

  function exportMembers() {
    var rows = DB.members().map(function (m) { return { 平台ID: m.uid, 姓名: m.name, 手机: m.phone, 级别: m.level, 区域: m.region, 微信: m.wechat, 推荐人ID: m.refId, 状态: m.status === 'disabled' ? '禁用' : '正常' }; });
    DB.download('会员列表.csv', DB.toCSV(rows, ['平台ID', '姓名', '手机', '级别', '区域', '微信', '推荐人ID', '状态']));
    UI.toast('已导出 ' + rows.length + ' 条');
  }

  /* ============ 会员级别 ============ */
  App.register('admin-grades', function () {
    var b = UI.h('div', { class: 'page' });
    b.appendChild(UI.h('div', { class: 'hero sm' }, [UI.h('div', { class: 'hero-t', text: '会员级别与课程体系' })]));
    DB.S.grades.forEach(function (g) {
      var req = DB.requiredCourses(g.name);
      var chips = req.length ? req.map(function (id) { var c = DB.course(id); return c ? UI.tag(c.cat + '·' + c.name, 'gray') : ''; }) : [UI.tag('无需学习', 'gray')];
      b.appendChild(UI.card([
        UI.h('div', { class: 'grade-h' }, [UI.h('span', { class: 'grade-dot', style: { background: g.color } }), UI.h('b', { text: g.name }), UI.h('span', { class: 'grade-rate', text: '推荐佣金 ' + g.rate + '%' })]),
        UI.h('div', { class: 'grade-b', text: g.benefit }),
        UI.h('div', { class: 'chips mt8' }, chips),
        UI.h('div', { class: 'mt8' }, [UI.btn('编辑', 'mini', function () { editGrade(g); })])
      ]));
    });
    return { body: b };
  });
  function editGrade(g) {
    UI.sheet({
      title: '编辑级别 · ' + g.name, build: function (bd) {
        var benefit = UI.input({ value: g.benefit });
        var rate = UI.input({ value: g.rate }); var daily = UI.input({ value: g.dailyLead });
        bd.appendChild(UI.field('权益说明', benefit)); bd.appendChild(UI.field('推荐佣金率(%)', rate)); bd.appendChild(UI.field('每日名单额度', daily));
      },
      footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
        var v = api.body.querySelectorAll('input');
        g.benefit = v[0].value; g.rate = parseFloat(v[1].value) || 0; g.dailyLead = parseInt(v[2].value) || 0; DB.save();
        DB.log('编辑级别', g.name);
        UI.toast('已保存'); App.go('admin-grades');
      } }]
    });
  }

  /* ============ 课程管理（分小节 + 每节考题） ============ */
  App.register('admin-courses', function () {
    var b = UI.h('div', { class: 'page' });
    b.appendChild(UI.h('div', { class: 'bar-row' }, [UI.btn('+ 新增课程', 'ghost sm', addCourse)]));
    ['初级', '中级', '高级'].forEach(function (cat) {
      var cs = DB.S.courses.filter(function (c) { return c.cat === cat; });
      b.appendChild(UI.sec(cat + '业务培训（' + cs.length + '）'));
      cs.forEach(function (c) {
        var qn = DB.questionsOf(c.id).length;
        var secTxt = (c.chapterList && c.chapterList.length) ? (c.chapterList.length + ' 节') : '不分节';
        b.appendChild(UI.listItem({ title: c.name, sub: (c.minutes || 0) + ' 分钟 · ' + secTxt + ' · ' + qn + ' 题',
          right: [UI.btn('章节/考题', 'mini', function () { manageCourse(c); }), UI.btn('编辑', 'mini', function () { editCourse(c); }), UI.btn('删', 'mini dan', function () { DB.S.courses = DB.S.courses.filter(function (x) { return x.id !== c.id; }); DB.save(); App.go('admin-courses'); })] }));
      });
    });
    return { body: b };
  });

  function addCourse() {
    UI.sheet({ title: '新增课程', build: function (bd) {
      var name = UI.input({ placeholder: '课程名称' }); var cat = UI.select([{ v: '初级', t: '初级业务培训' }, { v: '中级', t: '中级业务培训' }, { v: '高级', t: '高级业务培训' }], '初级');
      var min = UI.input({ placeholder: '时长(分钟)', value: '30' });
      var split = UI.switchBox(true);
      bd.appendChild(UI.field('名称', name)); bd.appendChild(UI.field('分类', cat)); bd.appendChild(UI.field('时长', min));
      bd.appendChild(UI.h('div', { class: 'kv' }, [UI.h('span', { class: 'kv-k', text: '分小节（章节）' }), split]));
      bd.appendChild(UI.h('div', { class: 'muted small', text: '关闭则整门课作为一个课题、不分小节；开启则按 30 分钟拆分为若干小节' }));
    }, footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
      var v = api.body.querySelectorAll('input'); if (!v[0].value) { UI.toast('请填名称', 'error'); return; }
      var minutes = parseInt(v[1].value) || 0;
      var doSplit = api.body.querySelector('.switch input').checked;
      var chN = doSplit ? Math.max(1, Math.round(minutes / 30)) : 0;
      var list = []; for (var ci = 0; ci < chN; ci++) list.push({ id: DB.nid('ch') + (ci + 1), title: '第 ' + (ci + 1) + ' 节', minutes: chN ? Math.round(minutes / chN) : 0, content: '' });
      DB.S.courses.push({ id: DB.nid('c'), name: v[0].value, cat: api.body.querySelector('select').value, minutes: minutes, type: 'video', chapters: chN, chapterList: list });
      DB.log('新增课程', v[0].value);
      DB.save(); UI.toast('已新增'); App.go('admin-courses');
    } }] });
  }
  function editCourse(c) {
    UI.sheet({ title: '编辑课程', build: function (bd) {
      var name = UI.input({ value: c.name }); var cat = UI.select([{ v: '初级', t: '初级业务培训' }, { v: '中级', t: '中级业务培训' }, { v: '高级', t: '高级业务培训' }], c.cat);
      var min = UI.input({ value: c.minutes || 0 });
      bd.appendChild(UI.field('名称', name)); bd.appendChild(UI.field('分类', cat)); bd.appendChild(UI.field('时长', min));
    },     footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
      var v = api.body.querySelectorAll('input'); c.name = v[0].value; c.cat = api.body.querySelector('select').value; c.minutes = parseInt(v[1].value) || 0; c.chapters = Math.max(1, Math.round(c.minutes / 30)); DB.save(); DB.log('编辑课程', v[0].value); UI.toast('已保存'); App.go('admin-courses');
    } }] });
  }

  // 课程小节与考题管理
  function manageCourse(c) {
    UI.sheet({ title: c.name + ' · 章节与考题', build: function (bd) {
      if (c.chapterList && c.chapterList.length) {
        bd.appendChild(UI.btn('+ 新增小节', 'ghost sm', function () { editChapter(c, null); }));
        var list = UI.h('div', { class: 'mt8' });
        c.chapterList.forEach(function (ch) {
          var qn = DB.questionsOfChapter(c.id, ch.id).length;
          list.appendChild(UI.h('div', { class: 'li' }, [
            UI.h('div', {}, [UI.h('div', { class: 'li-t', text: ch.title }), UI.h('div', { class: 'li-d', text: (ch.minutes || 0) + ' 分钟 · ' + qn + ' 题' })]),
            UI.h('div', { class: 'li-r' }, [
              UI.btn('出题', 'mini', function () { editChapter(c, ch); }),
              UI.btn('删', 'mini dan', function () { c.chapterList = c.chapterList.filter(function (x) { return x.id !== ch.id; }); DB.S.questions = DB.S.questions.filter(function (q) { return !(q.courseId === c.id && q.chapterId === ch.id); }); DB.save(); manageCourse(c); })
            ])
          ]));
        });
        bd.appendChild(list);
      } else {
        bd.appendChild(UI.h('div', { class: 'muted small', text: '本课程不分小节（整课为一个课题）' }));
        bd.appendChild(UI.btn('从文字 / 文档出题（整课）', 'pri block mt8', function () { courseAutoGen(c, ''); }));
        bd.appendChild(UI.btn('手动添加考题', 'ghost block mt8', function () { addQuestionSheet(c, ''); }));
        var ql = DB.questionsOfChapter(c.id, '');
        if (ql.length) {
          bd.appendChild(UI.h('div', { class: 'sec-title mt8' }, [UI.h('span', { text: '本题库（' + ql.length + ' 题）' })]));
          ql.forEach(function (q) { bd.appendChild(UI.listItem({ title: q.q, sub: (q.options || []).join(' / ') + (q.answer ? '　✓答案：' + q.answer : ''), right: [UI.btn('编辑', 'mini', function () { editQuestionSheet(c, q); }), UI.btn('删', 'mini dan', function () { DB.deleteQuestion(q.id); manageCourse(c); })] })); });
        }
      }
    }, footer: [{ text: '关闭', cls: 'pri', onClick: function (api) { api.close(); } }] });
  }

  // 从文字内容 / 上传文档自动生成选择题（驾驶证式）
  function courseAutoGen(c, chapterId) {
    var content = UI.input({ area: true, placeholder: '粘贴本节 / 本课程文字内容，或上传 .txt/.md 文档，系统据此自动生成选择题（依据内容多少出 3-10 题，字数不限）', style: { minHeight: '180px' } });
    UI.sheet({ title: '自动出题', build: function (bd) {
      bd.appendChild(UI.field('文字内容（字数不限）', content));
      var file = UI.h('input', { type: 'file', accept: '.txt,.md,.csv,.json', style: { display: 'block', marginTop: '8px' }, onchange: function (e) {
        var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
        rd.onload = function () { content.value = rd.result; UI.toast('已读取文档 ' + f.name); };
        rd.readAsText(f, 'utf-8');
      } });
      bd.appendChild(UI.h('div', { class: 'muted small', text: '也可上传文本文档（.txt / .md 等）' }));
      bd.appendChild(file);
      bd.appendChild(UI.btn('生成选择题', 'pri block mt8', function () {
        var qs = DB.autoGenQuestions(content.value);
        if (!qs.length) { UI.toast('文字过少，无法出题（至少两段有效内容）', 'error'); return; }
        qs.forEach(function (q) { DB.addQuestion({ courseId: c.id, chapterId: chapterId || '', type: q.type, q: q.q, options: q.options || [], answer: q.answer }); });
        UI.toast('已自动生成 ' + qs.length + ' 道选择题', 'success'); App.go('admin-courses');
      }));
    }, footer: [{ text: '关闭', cls: 'pri', onClick: function (api) { api.close(); } }] });
  }

  function editChapter(c, ch) {
    var isNew = !ch;
    var title = UI.input({ value: ch ? ch.title : '' });
    var minutes = UI.input({ value: ch ? (ch.minutes || 0) : 30 });
    var content = UI.input({ area: true, placeholder: '粘贴本节文字内容，或上传文档，系统据此自动生成选择题（依据内容多少出 3-10 题，字数不限）', value: ch ? (ch.content || '') : '', style: { minHeight: '160px' } });
    UI.sheet({ title: isNew ? '新增小节' : '编辑小节', build: function (bd) {
      bd.appendChild(UI.field('小节标题', title)); bd.appendChild(UI.field('时长(分钟)', minutes)); bd.appendChild(UI.field('文字内容（字数不限）', content));
      var file = UI.h('input', { type: 'file', accept: '.txt,.md,.csv,.json', style: { display: 'block', marginTop: '8px' }, onchange: function (e) {
        var f = e.target.files[0]; if (!f) return; var rd = new FileReader();
        rd.onload = function () { content.value = rd.result; UI.toast('已读取文档 ' + f.name); };
        rd.readAsText(f, 'utf-8');
      } });
      bd.appendChild(UI.h('div', { class: 'muted small', text: '也可上传文本文档（.txt / .md 等）自动提取内容' }));
      bd.appendChild(file);
      bd.appendChild(UI.btn('从文字内容生成选择题', 'pri block mt8', function () {
        var qs = DB.autoGenQuestions(content.value);
        if (!qs.length) { UI.toast('文字过少，无法出题（至少两段有效内容）', 'error'); return; }
        qs.forEach(function (q) { DB.addQuestion({ courseId: c.id, chapterId: ch ? ch.id : '', type: q.type, q: q.q, options: q.options || [], answer: q.answer }); });
        UI.toast('已自动生成 ' + qs.length + ' 道选择题', 'success');
      }));
      bd.appendChild(UI.btn('手动添加考题', 'ghost block mt8', function () { addQuestionSheet(c, ch ? ch.id : ''); }));
    }, footer: [{ text: '保存小节', cls: 'pri', onClick: function (api) {
      if (!title.value) { UI.toast('请填写小节标题', 'error'); return; }
      if (isNew) { c.chapterList = c.chapterList || []; c.chapterList.push({ id: DB.nid('ch') + (c.chapterList.length + 1), title: title.value, minutes: parseInt(minutes.value) || 0, content: content.value }); }
      else { ch.title = title.value; ch.minutes = parseInt(minutes.value) || 0; ch.content = content.value; }
      DB.save(); UI.toast('已保存'); manageCourse(c);
    } }] });
  }

  function addQuestionSheet(c, chapterId) {
    var type = UI.select([{ v: 'choice', t: '选择题' }, { v: 'open', t: '问答题' }], 'choice');
    var q = UI.input({ area: true, placeholder: '题目' });
    var oa = UI.input({ placeholder: 'A. 选项一' }); var ob = UI.input({ placeholder: 'B. 选项二' });
    var oc = UI.input({ placeholder: 'C. 选项三' }); var od = UI.input({ placeholder: 'D. 选项四' });
    var ans = UI.input({ placeholder: '选择题填 A/B/C/D；问答题填参考答案关键字' });
    UI.sheet({ title: '添加考题', build: function (bd) {
      bd.appendChild(UI.field('题型', type)); bd.appendChild(UI.field('题目', q));
      bd.appendChild(UI.field('A', oa)); bd.appendChild(UI.field('B', ob)); bd.appendChild(UI.field('C', oc)); bd.appendChild(UI.field('D', od));
      bd.appendChild(UI.field('正确答案', ans));
    }, footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
      if (!q.value.trim()) { UI.toast('请填写题目', 'error'); return; }
      var t = api.body.querySelector('select').value;
      var opts = [];
      if (t === 'choice') { [oa, ob, oc, od].forEach(function (i) { if (i.value.trim()) opts.push(i.value.trim()); }); if (opts.length < 2) { UI.toast('选择题至少 2 个选项', 'error'); return; } }
      DB.addQuestion({ courseId: c.id, chapterId: chapterId || '', type: t, q: q.value.trim(), options: opts, answer: ans.value.trim() });
      DB.log('新增考题', c.name);
      UI.toast('已添加考题'); api.close();
    } }] });
  }

  // 编辑考题（自动生成或手动添加后均可改；后台设定标准答案）
  function editQuestionSheet(c, q) {
    var qt = UI.input({ area: true, value: q.q || '' });
    var isOpen = q.type === 'open';
    var oa = UI.input({ value: (q.options && q.options[0]) || '' });
    var ob = UI.input({ value: (q.options && q.options[1]) || '' });
    var oc = UI.input({ value: (q.options && q.options[2]) || '' });
    var od = UI.input({ value: (q.options && q.options[3]) || '' });
    var ansKw = UI.input({ value: q.answer || '' });
    UI.sheet({ title: '编辑考题', build: function (bd) {
      bd.appendChild(UI.field('题目', qt));
      if (isOpen) {
        bd.appendChild(UI.field('参考答案关键字', ansKw));
      } else {
        bd.appendChild(UI.field('A', oa)); bd.appendChild(UI.field('B', ob));
        bd.appendChild(UI.field('C', oc)); bd.appendChild(UI.field('D', od));
        bd.appendChild(UI.h('div', { class: 'muted small mt8', text: '设定标准答案（勾选正确项）：' }));
        bd.appendChild(UI.h('div', { class: 'radios' }, [oa, ob, oc, od].map(function (inp, i) {
          var letter = String.fromCharCode(65 + i);
          return UI.h('label', { class: 'radio-line' }, [
            UI.h('input', { type: 'radio', name: 'qans_' + q.id, value: letter, checked: (q.answer === letter) }),
            UI.h('span', { text: ' ' + letter + '. ' + (inp.value || '') })
          ]);
        })));
      }
    }, footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
      if (!qt.value.trim()) { UI.toast('请填写题目', 'error'); return; }
      var patch;
      if (isOpen) {
        if (!ansKw.value.trim()) { UI.toast('请填写参考答案关键字', 'error'); return; }
        patch = { q: qt.value.trim(), type: 'open', options: [], answer: ansKw.value.trim() };
      } else {
        var oArr = [oa, ob, oc, od].map(function (i) { return i.value.trim(); }).filter(function (s) { return s; });
        if (oArr.length < 2) { UI.toast('选择题至少 2 个选项', 'error'); return; }
        var checked = api.body.querySelector('input[type=radio]:checked');
        if (!checked) { UI.toast('请勾选标准答案', 'error'); return; }
        patch = { q: qt.value.trim(), type: 'choice', options: oArr, answer: checked.value };
      }
      DB.updateQuestion(q.id, patch);
      DB.log('编辑考题', c.name);
      UI.toast('已保存'); api.close();
    } }] });
  }

  /* ============ 企业名单（核心） ============ */
  App.register('admin-leads', function () {
    var b = UI.h('div', { class: 'page' });
    var f = { region: '', status: '', q: '', memberAdded: false };
    var sel = {};
    var unassign = DB.unassignedLeads().length;
    b.appendChild(UI.h('div', { class: 'hero sm' }, [UI.h('div', { class: 'hero-t', text: '企业名单管理' }), UI.h('div', { class: 'hero-s', text: '共 ' + DB.S.leads.length + ' 条 · 未分配 ' + unassign + ' 条' })]));
    b.appendChild(UI.h('div', { class: 'bar-row' }, [
      UI.btn('智能分配', 'pri sm', autoDistribute),
      UI.btn('批量分配', 'ghost sm', batchAssignLeads),
      UI.btn('导入名单', 'ghost sm', importLeads),
      UI.btn('分配规则', 'ghost sm', distRules),
      UI.btn('表头设置', 'ghost sm', fieldConfig)
    ]));
    // 会员名单分配申请（区域 + 数量）
    var pendingReqs = DB.S.leadRequests.filter(function (r) { return r.status === 'pending'; });
    b.appendChild(UI.sec('名单分配申请（待处理 ' + pendingReqs.length + '）'));
    if (!pendingReqs.length) b.appendChild(UI.h('div', { class: 'muted small mt8', text: '暂无会员申请；会员可在手机端「申请区域名单」提交区域+数量申请' }));
    pendingReqs.slice(0, 20).forEach(function (r) {
      var m = DB.member(r.memberId);
      b.appendChild(UI.listItem({
        title: (m ? m.name : r.memberId) + ' 申请「' + r.region + '」',
        sub: '希望 ' + (r.count || '默认') + ' 条 · ' + r.time,
        right: [
          UI.btn('通过', 'mini', function () { var res = DB.resolveAudit(r.id, true); UI.toast(res && res.msg ? res.msg : '已通过', res && res.ok === false ? 'error' : 'success'); App.go('admin-leads'); }),
          UI.btn('拒', 'mini dan', function () { DB.resolveAudit(r.id, false); App.go('admin-leads'); })
        ]
      }));
    });
    var tools = UI.h('div', { class: 'filter-row' }, [
      UI.input({ placeholder: '搜索公司/法人/信用代码', oninput: function (e) { f.q = e.target.value; draw(); } }),
      UI.select(DB.S.distRules.regions.map(function (c) { return { v: c, t: c }; }).concat([{ v: '', t: '全部区域' }]), '', function (e) { f.region = e.target.value; draw(); }),
      UI.select(DB.FOLLOW_STATUS.map(function (s) { return { v: s.k, t: s.n }; }).concat([{ v: '', t: '全部状态' }]), '', function (e) { f.status = e.target.value; draw(); })
    ]);
    b.appendChild(tools);
    var box = UI.h('div', { class: 'mt8' }); b.appendChild(box);
    var batchBar = UI.h('div', { class: 'bar-row mt8' }); b.appendChild(batchBar);
    var pager = UI.h('div', { class: 'pager' }); b.appendChild(pager);
    var page = 0, PAGE = 100;
    function draw() {
      var list = DB.S.leads.filter(function (l) {
        if (f.region && l.city !== f.region) return false;
        if (f.status && l.status !== f.status) return false;
        if (f.memberAdded && !l.memberAdded) return false;
        if (f.q) { var q = f.q.toLowerCase(); if ((l.company + (l.legalPerson || '') + (l.creditCode || '')).toLowerCase().indexOf(q) < 0) return false; }
        return true;
      });
      var totalPages = Math.max(1, Math.ceil(list.length / PAGE));
      if (page >= totalPages) page = totalPages - 1;
      box.innerHTML = '';
      box.appendChild(UI.h('div', { class: 'bar-info', text: (f.memberAdded ? '会员新增名单 ' : '共 ') + list.length + ' 条' +
        (f.memberAdded ? '　[批量录用=平台采纳 / 批量删除=移除]' : '') }));
      var thead = UI.h('thead', {}, [UI.h('tr', {}, [
        f.memberAdded ? UI.h('th', { text: '' }) : null,
        UI.h('th', { text: '公司' }), UI.h('th', { text: '信用代码' }), UI.h('th', { text: '城市' }),
        UI.h('th', { text: '法人' }), UI.h('th', { text: '资本' }), UI.h('th', { text: '工商状态' }),
        UI.h('th', { text: '成立' }), UI.h('th', { text: '手机' }), UI.h('th', { text: '归属' }),
        UI.h('th', { text: '跟进状态' }), UI.h('th', { text: '操作' })
      ])]);
      var rows = list.slice(page * PAGE, page * PAGE + PAGE).map(function (l) {
        var owner = l.assignedTo ? DB.member(l.assignedTo) : null;
        var tds = [];
        if (f.memberAdded) tds.push(UI.h('td', {}, [UI.h('input', { type: 'checkbox', 'data-id': l.id })]));
        tds.push(
          UI.h('td', { text: l.company }),
          UI.h('td', { text: l.creditCode || '—' }),
          UI.h('td', { text: l.city || '—' }),
          UI.h('td', { text: l.legalPerson || '—' }),
          UI.h('td', { text: l.capital || '—' }),
          UI.h('td', { text: l.regStatus || '—' }),
          UI.h('td', { text: l.regDate || '—' }),
          UI.h('td', { text: l.phone || '—' }),
          UI.h('td', { text: owner ? owner.name : '未分配' }),
          UI.h('td', {}, [UI.tag(DB.followName(l.status), DB.followColor(l.status))]),
          UI.h('td', {}, [UI.btn('分配', 'mini', function (e) { e.stopPropagation(); assignLead(l); })])
        );
        return UI.h('tr', { onclick: function () { leadDetail(l); }, style: { cursor: 'pointer' } }, tds);
      });
      box.appendChild(UI.h('div', { class: 'tbl-wrap' }, [UI.h('table', { class: 'tbl' }, [thead, UI.h('tbody', {}, rows)])]));
      pager.innerHTML = '';
      if (totalPages > 1) {
        pager.appendChild(UI.btn('上一页', 'ghost sm', function () { if (page > 0) { page--; draw(); } }));
        pager.appendChild(UI.h('span', { class: 'pager-i', text: (page + 1) + ' / ' + totalPages }));
        pager.appendChild(UI.btn('下一页', 'ghost sm', function () { if (page < totalPages - 1) { page++; draw(); } }));
      }
      batchBar.innerHTML = '';
      if (f.memberAdded) {
        batchBar.appendChild(UI.btn('全选本页', 'ghost sm', function () { box.querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = true; }); }));
        batchBar.appendChild(UI.btn('批量录用', 'pri sm', function () { batchMemberAdded(true); }));
        batchBar.appendChild(UI.btn('批量删除', 'dan sm', function () { batchMemberAdded(false); }));
      }
    }
    function batchMemberAdded(adopt) {
      var ids = Array.prototype.slice.call(box.querySelectorAll('input[type=checkbox]:checked')).map(function (c) { return c.getAttribute('data-id'); });
      if (!ids.length) { UI.toast('请先勾选名单', 'error'); return; }
      ids.forEach(function (id) {
        var l = DB.lead(id); if (!l) return;
        if (adopt) { l.adopted = true; l.adoptedAt = DB.dstr(new Date()); }
        else { DB.S.leads = DB.S.leads.filter(function (x) { return x.id !== id; }); }
      });
      DB.save(); DB.log(adopt ? '批量录用会员名单' : '批量删除会员名单', ids.length + ' 条');
      UI.toast(adopt ? ('已录用 ' + ids.length + ' 条') : ('已删除 ' + ids.length + ' 条'), 'success');
      draw();
    }
    // 会员新增快捷筛选
    b.appendChild(UI.h('div', { class: 'chips mt8' }, [
      UI.h('button', { class: 'chip' + (f.memberAdded ? '' : ' on'), text: '全部名单', onclick: function () { f.memberAdded = false; draw(); } }),
      UI.h('button', { class: 'chip' + (f.memberAdded ? ' on' : ''), text: '仅看会员新增', onclick: function () { f.memberAdded = true; draw(); } })
    ]));
    draw();
    return { body: b };
  });

  function leadDetail(l) {
    var owner = l.assignedTo ? DB.member(l.assignedTo) : null;
    var follows = DB.S.follows.filter(function (f) { return f.leadId === l.id; }).slice().reverse();
    UI.sheet({
      title: l.company, build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'kv' }, [kv('区域', l.city || '—'), kv('信用代码', l.creditCode || '—'), kv('法人', l.legalPerson || '—')]));
        bd.appendChild(UI.h('div', { class: 'kv' }, [kv('注册资本', l.capital || '—'), kv('登记状态', l.regStatus || '—'), kv('成立', l.regDate || '—')]));
        bd.appendChild(UI.h('div', { class: 'kv' }, [kv('电话', l.phone || '—'), kv('状态', DB.followName(l.status)), kv('来源', l.importedFrom || '—')]));
        if (l.memberAdded) bd.appendChild(UI.h('div', { class: 'notice-bar', html: I('info', 14) + ' 会员新增名单（待后台录用 / 删除）' }));
        bd.appendChild(UI.h('div', { class: 'kv' }, [kv('当前归属', owner ? (owner.name + ' · ' + owner.uid) : '未分配'), kv('备注', l.ownerNote || l.remark || '—')]));
        bd.appendChild(UI.h('div', { class: 'sec-title mt8' }, [UI.h('span', { text: '跟进记录（' + follows.length + '）· 谁在沟通 / 进度' })]));
        if (!follows.length) bd.appendChild(UI.h('div', { class: 'muted small', text: '暂无跟进记录' }));
        follows.slice(0, 30).forEach(function (f) {
          var mm = DB.member(f.memberId);
          bd.appendChild(UI.listItem({ title: (mm ? mm.name : f.memberId) + '：' + DB.followName(f.status), sub: (f.note || '无备注') + '　' + f.time, right: [UI.tag(DB.followName(f.status), DB.followColor(f.status))] }));
        });
      },
      footer: [
        { text: '批量分配', cls: 'ghost', onClick: function (api) { api.close(); batchAssignLeads(); } },
        { text: '分配 / 改派', cls: 'pri', onClick: function (api) { api.close(); assignLead(l); } }
      ]
    });
  }

  function batchAssignLeads() {
    var members = DB.activeMembers();
    var sel = UI.select([{ v: '', t: '请选择会员' }].concat(members.map(function (m) {
      return { v: m.id, t: m.name + ' · ' + DB.levelName(m.level) + (m.region ? ' · ' + m.region : '') };
    })), '');
    var pool = DB.S.leads.filter(function (l) { return !l.assignedTo; });
    UI.sheet({
      title: '批量分配名单', build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'muted small', text: '勾选要分配的名单，再选择会员，一键派发（可手动指定派给谁、派几条）。当前未分配 ' + pool.length + ' 条。' }));
        bd.appendChild(UI.field('分配给会员', sel));
        bd.appendChild(UI.h('div', { class: 'mt8' }, [
          UI.btn('全选本页', 'ghost sm', function () {
            var box = bd.querySelectorAll('input[type=checkbox]');
            Array.prototype.forEach.call(box, function (c) { c.checked = true; });
          }),
          UI.btn('清空', 'ghost sm', function () {
            var box = bd.querySelectorAll('input[type=checkbox]');
            Array.prototype.forEach.call(box, function (c) { c.checked = false; });
          })
        ]));
        var list = UI.h('div', { class: 'mt8' });
        (pool.length ? pool : DB.S.leads).slice(0, 150).forEach(function (l) {
          var cb = UI.h('input', { type: 'checkbox', 'data-id': l.id, style: { marginRight: '8px' } });
          list.appendChild(UI.h('div', { class: 'li' }, [
            cb,
            UI.h('div', { class: 'li-main' }, [UI.h('div', { class: 'li-t', text: l.company }), UI.h('div', { class: 'li-d', text: (l.city || '') + ' · ' + DB.followName(l.status) })]),
            UI.tag(DB.followName(l.status), DB.followColor(l.status))
          ]));
        });
        bd.appendChild(list);
      },
      footer: [{ text: '确认分配', cls: 'pri', onClick: function (api) {
        var sid = api.body.querySelector('select').value; if (!sid) { UI.toast('请选择会员', 'error'); return; }
        var ids = Array.prototype.slice.call(api.body.querySelectorAll('input[type=checkbox]:checked')).map(function (c) { return c.getAttribute('data-id'); });
        if (!ids.length) { UI.toast('请勾选名单', 'error'); return; }
        ids.forEach(function (id) { DB.assignLead(id, sid); });
        UI.toast('已分配 ' + ids.length + ' 条', 'success'); App.go('admin-leads');
      } }]
    });
  }

  function assignLead(l) {
    var members = DB.activeMembers();
    UI.sheet({
      title: '分配名单 · ' + l.company, build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'muted small', text: '按区域筛选会员：' + (l.city || '—') }));
        var opts = members.map(function (m) { return { v: m.id, t: m.name + ' · ' + DB.levelName(m.level) + (m.region ? ' · ' + m.region : '') }; });
        var sel = UI.select(opts, '');
        bd.appendChild(UI.field('分配给会员', sel));
        bd.appendChild(UI.h('div', { class: 'muted small', text: '仅显示同区域会员？' }));
        var onlyRegion = UI.select([{ v: '0', t: '显示全部会员' }, { v: '1', t: '仅本区域(' + (l.city || '') + ')' }], '0', function (e) {
          var filtered = e.target.value === '1' ? members.filter(function (m) { return m.region === l.city; }) : members;
          var ns = UI.select(filtered.map(function (m) { return { v: m.id, t: m.name + ' · ' + DB.levelName(m.level) }; }), '');
          sel.parentNode.replaceChild(ns, sel); sel = ns;
        });
        bd.appendChild(UI.field('范围', onlyRegion));
      },
      footer: [{ text: '确认分配', cls: 'pri', onClick: function (api) {
        var sid = api.body.querySelector('select').value; if (!sid) { UI.toast('请选择会员', 'error'); return; }
        DB.assignLead(l.id, sid); UI.toast('已分配'); App.go('admin-leads');
      } }]
    });
  }

  function autoDistribute() {
    var r = DB.autoDistribute();
    UI.toast('智能分配完成：本次分配 ' + r + ' 条', 'success');
    App.go('admin-leads');
  }

  function importLeads() {
    var lf = DB.S.leadFields;
    var map = {}; lf.forEach(function (f) { map[f.key] = f.label; });
    UI.sheet({
      title: '导入企业名单', build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'notice-bar', html: I('doc', 14) + ' 表头按当前"表头设置"匹配；多个手机号自动拆分；统一社会信用代码+手机号 重复自动跳过' }));
        bd.appendChild(UI.h('div', { class: 'muted small', text: '当前表头：' + lf.map(function (f) { return f.label; }).join(' / ') }));
        bd.appendChild(UI.h('div', { class: 'upload-box', onclick: function () { file.click(); }, html: I('upload', 18) + '<br>选择 CSV 或粘贴' }));
        var file = UI.h('input', { type: 'file', accept: '.csv,.txt', style: { display: 'none' }, onchange: function (e) { var f = e.target.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { ta.value = rd.result; }; rd.readAsText(f, 'utf-8'); } });
        bd.appendChild(file);
        var ta = UI.input({ area: true, placeholder: '公司名称,统一社会信用代码,所属城市(区域),法定代表人,注册资本,登记状态,成立日期,有效手机号\n海南某某公司,9146xxxx,海口市,张三,100万,存续,2022-01-01,13800000000,13900000000', style: { fontFamily: 'monospace', fontSize: '11px' } });
        bd.appendChild(ta);
      },
      footer: [{ text: '解析并导入', cls: 'pri', onClick: function () {
        var ta = document.querySelector('.mask textarea');
        if (!ta || !ta.value.trim()) { UI.toast('请粘贴或选择文件', 'error'); return; }
        var rows = DB.parseTable(ta.value);
        var r = DB.importLeads(rows, map, { src: '后台导入' });
        UI.toast('导入完成：新增 ' + r.added + '，跳过重复 ' + r.skip, 'success');
        App.go('admin-leads');
      } }]
    });
  }

  function distRules() {
    var r = DB.S.distRules;
    UI.sheet({
      title: '智能分配规则', build: function (bd) {
        var en = UI.switchBox(r.enabled);
        bd.appendChild(UI.h('div', { class: 'kv' }, [UI.h('span', { class: 'kv-k', text: '启用自动分配' }), en]));
        var per = UI.input({ value: r.perMember });
        bd.appendChild(UI.field('每会员分配上限', per));
        var rm = UI.switchBox(r.regionMatch);
        bd.appendChild(UI.h('div', { class: 'kv' }, [UI.h('span', { class: 'kv-k', text: '仅分配同区域名单' }), rm]));
        bd.appendChild(UI.h('div', { class: 'muted small', text: '系统按会员区域分配对应区域名单；会员完成目标后可继续获取。后台也可手动分配。' }));
      },
      footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
        var v = api.body.querySelectorAll('input'); var sw = api.body.querySelectorAll('.switch');
        r.enabled = sw[0].classList.contains('on'); r.regionMatch = sw[1].classList.contains('on');
        r.perMember = parseInt(v[0].value) || 20; DB.save(); DB.log('修改分配规则', '每会员 ' + r.perMember + ' · 同区域 ' + r.regionMatch); UI.toast('规则已保存'); App.go('admin-leads');
      } }]
    });
  }

  function fieldConfig() {
    UI.sheet({
      title: '名单表头设置（可增减）', build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'muted small', text: '勾选的字段将作为导入/展示列，可删除或新增自定义字段' }));
        var list = UI.h('div', { class: 'mt8' });
        function render() {
          list.innerHTML = '';
          DB.S.leadFields.forEach(function (f, i) {
            list.appendChild(UI.h('div', { class: 'field-row' }, [
              UI.h('span', { text: f.label + (f.required ? ' *' : '') }),
              UI.btn('删除', 'mini dan', function () { DB.S.leadFields.splice(i, 1); DB.save(); render(); })
            ]));
          });
        }
        render();
        bd.appendChild(list);
        var nk = UI.input({ placeholder: '新字段名，如 邮箱' });
        bd.appendChild(UI.field('新增字段', nk));
        bd.appendChild(UI.btn('+ 添加字段', 'ghost sm', function () { if (nk.value.trim()) { DB.S.leadFields.push({ key: 'f' + DB.S.leadFields.length, label: nk.value.trim(), required: false }); DB.save(); render(); nk.value = ''; } }));
      },
      footer: [{ text: '完成', cls: 'pri', onClick: function () { App.go('admin-leads'); } }]
    });
  }

  /* ============ 运营中心 ============ */
  App.register('admin-orgs', function () {
    var b = UI.h('div', { class: 'page' });
    b.appendChild(UI.h('div', { class: 'bar-row' }, [UI.btn('+ 新增运营中心', 'ghost sm', addOrg)]));
    DB.S.orgs.forEach(function (o) {
      var mc = DB.members().filter(function (m) { return m.region === o.region || m.role === 'org'; }).length;
      var lc = DB.S.leads.filter(function (l) { return l.city === o.region; }).length;
      var head = o.headId ? DB.member(o.headId) : null;
      b.appendChild(UI.h('div', { class: 'card', onclick: function () { orgDetail(o); } }, [
        UI.h('div', { class: 'grade-h' }, [UI.h('b', { text: o.name }), UI.tag(DB.orgLevelName(o.level), 'pri')]),
        UI.h('div', { class: 'muted small', text: '区域：' + (o.region || '—') + '　权限 ' + (o.perms || []).length + ' 项' }),
        UI.h('div', { class: 'kv mt8' }, [kv('区域内会员', mc), kv('区域内名单', lc), kv('负责人', head ? head.name + '(' + head.uid + ')' : '未设')])
      ]));
    });
    return { body: b };
  });
  function orgDetail(o) {
    var ms = DB.members().filter(function (m) { return m.region === o.region || (m.role === 'org' && m.orgId === o.id); });
    UI.sheet({
      title: o.name, build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'kv' }, [kv('级别', DB.orgLevelName(o.level)), kv('区域', o.region || '—'), kv('权限项', (o.perms || []).length)]));
        if (o.perms && o.perms.length) bd.appendChild(UI.h('div', { class: 'chips mt8' }, o.perms.map(function (p) { var pm = DB.ORG_PERMS.filter(function (x) { return x.k === p; })[0]; return UI.tag(pm ? pm.n : p, 'gray'); })));
        bd.appendChild(UI.h('div', { class: 'sec-title mt8' }, [UI.h('span', { text: '区域内会员（' + ms.length + '）' })]));
        if (!ms.length) bd.appendChild(UI.h('div', { class: 'muted small', text: '暂无会员' }));
        ms.slice(0, 30).forEach(function (m) {
          bd.appendChild(UI.h('div', { class: 'li' }, [UI.h('span', { text: m.name + '（' + m.level + '）' }), UI.h('span', { class: 'muted small', text: m.uid })]));
        });
      }, footer: [{ text: '关闭', cls: 'pri', onClick: function (api) { api.close(); } }]
    });
  }
  function addOrg() {
    UI.sheet({
      title: '新增运营中心', build: function (bd) {
        var name = UI.input({ placeholder: '名称，如 海口市城市财税赋能中心' });
        var level = UI.select(DB.ORG_LEVELS.map(function (x) { return { v: x.k, t: x.n }; }), 'city');
        var region = UI.input({ placeholder: '所属区域/城市', value: '' });
        var headId = UI.input({ placeholder: '负责人会员ID（输入后自动调取）' });
        bd.appendChild(UI.field('名称', name)); bd.appendChild(UI.field('级别', level)); bd.appendChild(UI.field('区域', region));
        bd.appendChild(UI.field('负责人会员ID', headId));
        bd.appendChild(UI.h('div', { class: 'muted small', text: '负责人将通过会员ID调取，留空则暂不设' }));
      },
      footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
        if (!name.value) { UI.toast('请填写名称', 'error'); return; }
        var hid = headId.value.trim();
        var head = hid ? DB.userByUid(hid) : null;
        if (hid && !head) { UI.toast('未找到该会员ID，请确认', 'error'); return; }
        DB.S.orgs.push({ id: DB.nid('o'), name: name.value, level: api.body.querySelector('select').value, headId: head ? head.id : '', region: region.value, perms: DB.ORG_PERMS.map(function (p) { return p.k; }) });
        DB.log('新增运营中心', name.value + ' / ' + region.value + (head ? ' 负责人 ' + head.name : ''));
        DB.save(); UI.toast('已新增运营中心'); App.go('admin-orgs');
      } }]
    });
  }

  /* ============ 审核中心 ============ */
  App.register('admin-audit', function () {
    var b = UI.h('div', { class: 'page' });
    if (!DB.S.audits.length) { b.appendChild(UI.empty('暂无审核任务')); return { body: b }; }
    DB.S.audits.slice().reverse().forEach(function (a) {
      b.appendChild(UI.listItem({ title: a.type, sub: a.note || '', right: [
        UI.tag(a.status === 'pending' ? '待审核' : (a.status === 'ok' ? '通过' : '拒绝'), a.status === 'pending' ? 'wrn' : (a.status === 'ok' ? 'suc' : 'dan')),
        a.status === 'pending' ? UI.btn('通过', 'mini', function () { var r = DB.resolveAudit(a.id, true); UI.toast(r && r.msg ? r.msg : '已通过', r && r.ok === false ? 'error' : 'success'); App.go('admin-audit'); }) : null,
        a.status === 'pending' ? UI.btn('拒', 'mini dan', function () { DB.resolveAudit(a.id, false); App.go('admin-audit'); }) : null
      ] }));
    });
    return { body: b };
  });

  /* ============ 操作日志 ============ */
  App.register('admin-logs', function () {
    var b = UI.h('div', { class: 'page' });
    if (!DB.S.logs.length) { b.appendChild(UI.empty('暂无日志')); return { body: b }; }
    DB.S.logs.slice().reverse().slice(0, 200).forEach(function (l) {
      b.appendChild(UI.listItem({ title: l.action, sub: l.detail + '　' + l.time, right: [UI.icon('chevronR', 18, '#c2c8d2')] }));
    });
    return { body: b };
  });

  /* ============ 系统设置 ============ */
  App.register('admin-system', function () {
    var b = UI.h('div', { class: 'page' });
    var lim = DB.S.sysLimits, cr = DB.S.commissionRule, lr = DB.S.leadRule, dr = DB.S.distRules;
    b.appendChild(UI.card([
      UI.h('div', { class: 'sec-title' }, [UI.h('span', { text: '系统限制' })]),
      kv('文本上限', lim.textMax + ' 字'), kv('备注上限', lim.noteMax + ' 字'), kv('图片数量', lim.imgCount + ' 张'), kv('单图上限', lim.imgSizeMB + ' MB')
    ]));
    b.appendChild(UI.card([
      UI.h('div', { class: 'sec-title' }, [UI.h('span', { text: '佣金规则' })]),
      kv('初级完成推荐人佣金', '¥' + cr.juniorAmount), kv('需通过考核', cr.needExamPass ? '是' : '否'), kv('自动解锁', cr.autoUnlock ? '是' : '否')
    ]));
    b.appendChild(UI.card([
      UI.h('div', { class: 'sec-title' }, [UI.h('span', { text: '拓客规则' })]),
      kv('接通率阈值', lr.reachRate + '%'), kv('每日基线', lr.dailyBase + ' 条'), kv('失败即停', lr.stopWhenFail ? '是' : '否')
    ]));
    b.appendChild(UI.card([
      UI.h('div', { class: 'sec-title' }, [UI.h('span', { text: '分配规则' })]),
      kv('自动分配', dr.enabled ? '开启' : '关闭'), kv('每会员上限', dr.perMember + ' 条'), kv('同区域', dr.regionMatch ? '是' : '否')
    ]));
    b.appendChild(UI.h('div', { class: 'mt16' }));
    b.appendChild(UI.btn('重置全部演示数据', 'dan block', function () {
      UI.dialog({ title: '确认重置', body: UI.h('div', { class: 'muted', text: '将清空当前所有数据并恢复为初始种子数据，操作不可撤销。' }), okText: '确认重置', danger: true, onOk: function () { DB.reset(); UI.toast('已重置'); App.go('admin-dash'); } });
    }));
    return { body: b };
  });

  /* ============ 管理员 / 财务 资料 ============ */
  App.register('admin-profile', function () {
    var u = App.user, b = UI.h('div', { class: 'page' });
    b.appendChild(UI.h('div', { class: 'hero sm' }, [UI.h('div', { class: 'hero-t', text: '我的资料' }), UI.h('div', { class: 'hero-s', text: (DB.ROLES[u.role] || {}).name + ' · ' + u.uid })]));
    b.appendChild(UI.card([
      UI.h('div', { class: 'kv' }, [kv('账号', u.uid), kv('角色', (DB.ROLES[u.role] || {}).name || u.role)]),
      UI.h('div', { class: 'kv' }, [kv('姓名', u.name || '—')])
    ]));
    b.appendChild(UI.btn('修改姓名', 'pri block mt8', function () { editName(u); }));
    b.appendChild(UI.btn('修改密码', 'pri block mt8', function () { editPwd(u); }));
    return { body: b };
  });
  function editName(u) {
    var name = UI.input({ value: u.name || '' });
    UI.sheet({ title: '修改姓名', build: function (bd) { bd.appendChild(UI.field('姓名', name)); }, footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
      if (!name.value.trim()) { UI.toast('请填写姓名', 'error'); return; }
      DB.updateAdmin(u.id, { name: name.value.trim() }); App.user.name = name.value.trim(); UI.toast('已修改姓名'); App.go('admin-profile');
    } }] });
  }
  function editPwd(u) {
    var pwd = UI.input({ type: 'password', placeholder: '新密码' }); var pwd2 = UI.input({ type: 'password', placeholder: '确认新密码' });
    UI.sheet({ title: '修改密码', build: function (bd) { bd.appendChild(UI.field('新密码', pwd)); bd.appendChild(UI.field('确认密码', pwd2)); }, footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
      if (!pwd.value || pwd.value.length < 6) { UI.toast('密码至少 6 位', 'error'); return; }
      if (pwd.value !== pwd2.value) { UI.toast('两次密码不一致', 'error'); return; }
      DB.updateAdmin(u.id, { password: pwd.value }); UI.toast('密码已修改'); App.go('admin-profile');
    } }] });
  }

  /* ============ 报工项配置 ============ */
  App.register('admin-reportcfg', function () {
    var b = UI.h('div', { class: 'page' });
    b.appendChild(UI.h('div', { class: 'hero sm' }, [UI.h('div', { class: 'hero-t', text: '每日报工项配置' }), UI.h('div', { class: 'hero-s', text: '会员据此填报，可增删' })]));
    var list = UI.h('div', { class: 'mt8' });
    b.appendChild(list);
    function render() {
      list.innerHTML = '';
      DB.S.reportItems.forEach(function (it, i) {
        list.appendChild(UI.h('div', { class: 'field-row' }, [
          UI.h('span', { text: it.name + '（' + it.unit + '）' }),
          UI.btn('删除', 'mini dan', function () { DB.S.reportItems.splice(i, 1); DB.save(); render(); })
        ]));
      });
    }
    render();
    var nk = UI.input({ placeholder: '新报工项，如 拜访客户数' }); var nu = UI.input({ placeholder: '单位，如 家' });
    b.appendChild(UI.h('div', { class: 'card mt8' }, [UI.field('名称', nk), UI.field('单位', nu), UI.btn('+ 添加', 'ghost sm', function () { if (nk.value.trim()) { DB.S.reportItems.push({ key: 'r' + DB.S.reportItems.length, name: nk.value.trim(), unit: nu.value.trim() || '项' }); DB.save(); render(); nk.value = ''; nu.value = ''; } })]));
    return { body: b };
  });

  /* ============ 目标模板配置 ============ */
  App.register('admin-goalcfg', function () {
    var b = UI.h('div', { class: 'page' });
    b.appendChild(UI.h('div', { class: 'hero sm' }, [UI.h('div', { class: 'hero-t', text: '目标模板配置' }), UI.h('div', { class: 'hero-s', text: '会员据此选择性设定目标' })]));
    var list = UI.h('div', { class: 'mt8' });
    b.appendChild(list);
    function render() {
      list.innerHTML = '';
      DB.S.goalTemplates.forEach(function (it, i) {
        list.appendChild(UI.h('div', { class: 'field-row' }, [
          UI.h('span', { text: it.name + '（' + it.unit + '）' }),
          UI.btn('删除', 'mini dan', function () { DB.S.goalTemplates.splice(i, 1); DB.save(); render(); })
        ]));
      });
    }
    render();
    var nk = UI.input({ placeholder: '新目标，如 新增意向客户' }); var nu = UI.input({ placeholder: '单位，如 个' });
    b.appendChild(UI.h('div', { class: 'card mt8' }, [UI.field('名称', nk), UI.field('单位', nu), UI.btn('+ 添加', 'ghost sm', function () { if (nk.value.trim()) { DB.S.goalTemplates.push({ key: 'g' + DB.S.goalTemplates.length, name: nk.value.trim(), unit: nu.value.trim() || '个' }); DB.save(); render(); nk.value = ''; nu.value = ''; } })]));
    return { body: b };
  });

  /* ============ 考核评价（全部会员报工） ============ */
  App.register('admin-eval', function () {
    var b = UI.h('div', { class: 'page' });
    var all = [];
    DB.members().forEach(function (m) { DB.reportsOf(m.id).forEach(function (r) { all.push({ m: m, r: r }); }); });
    b.appendChild(UI.h('div', { class: 'hero sm' }, [UI.h('div', { class: 'hero-t', text: '报工考核评价' }), UI.h('div', { class: 'hero-s', text: '共 ' + all.length + ' 条报工' })]));
    if (!all.length) { b.appendChild(UI.empty('暂无报工记录')); return { body: b }; }
    all.slice().reverse().slice(0, 100).forEach(function (o) {
      var ev = DB.S.evaluations[o.r.id] || {};
      b.appendChild(UI.listItem({
        title: o.m.name + ' · ' + o.r.date, sub: (o.r.content || '无备注') + (ev.score ? '　评分 ' + ev.score : ''),
        right: [UI.btn('评价', 'mini', function () { evalReport(o.m, o.r); })]
      }));
    });
    return { body: b };
  });

  /* ============ 财务报表（财务） ============ */
  App.register('fin-month', function () {
    var b = UI.h('div', { class: 'page' });
    var fm = DB.S.finMonths;
    var inc = fm.reduce(function (s, x) { return s + (x.sales || 0); }, 0), exp = fm.reduce(function (s, x) { return s + (x.expense || 0); }, 0);
    b.appendChild(UI.card(UI.h('div', { class: 'kpi-grid g3' }, [
      UI.kpi('总销售额', '¥' + UI.num(inc), { color: 'var(--success)' }), UI.kpi('总支出', '¥' + UI.num(exp), { color: 'var(--danger)' }), UI.kpi('总利润', '¥' + UI.num(inc - exp), { color: 'var(--primary)' })
    ])));

    // 当月开支录入
    var cur = DB.monthStr(new Date());
    var cm = fm.filter(function (x) { return x.month === cur; })[0] || { month: cur, sales: 0, rent: 0, util: 0, labor: 0, office: 0, commissionExp: 0 };
    b.appendChild(UI.sec('本月开支录入（' + cur + '）'));
    var fSales = UI.input({ type: 'number', value: cm.sales || 0 }), fRent = UI.input({ type: 'number', value: cm.rent || 0 }), fUtil = UI.input({ type: 'number', value: cm.util || 0 });
    var fLabor = UI.input({ type: 'number', value: cm.labor || 0 }), fOffice = UI.input({ type: 'number', value: cm.office || 0 }), fComm = UI.input({ type: 'number', value: cm.commissionExp || 0 });
    b.appendChild(UI.h('div', { class: 'card' }, [
      UI.field('平台销售额', fSales), UI.field('房租', fRent), UI.field('水电', fUtil), UI.field('人工', fLabor), UI.field('办公支出', fOffice), UI.field('佣金结算', fComm),
      UI.btn('保存本月财务', 'pri block mt8', function () {
        DB.setMonthFinance(cur, { sales: fSales.value, rent: fRent.value, util: fUtil.value, labor: fLabor.value, office: fOffice.value, commissionExp: fComm.value });
        UI.toast('已保存本月财务'); App.go('fin-month');
      })
    ]));

    // 账户余额
    b.appendChild(UI.sec('各账户余额'));
    var accBox = UI.h('div', { class: 'mt8' });
    b.appendChild(accBox);
    function renderAcc() {
      accBox.innerHTML = '';
      DB.S.accounts.forEach(function (a, i) {
        var bal = UI.input({ type: 'number', value: a.balance || 0 });
        accBox.appendChild(UI.h('div', { class: 'field-row' }, [
          UI.h('span', { text: a.name }),
          UI.h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [bal, UI.btn('存', 'mini', function () { DB.upsertAccount(a.id, a.name, bal.value); UI.toast('已更新 ' + a.name); App.go('fin-month'); })])
        ]));
      });
    }
    renderAcc();

    // 内部员工名册
    b.appendChild(UI.sec('内部员工名册'));
    var empBox = UI.h('div', { class: 'mt8' });
    b.appendChild(empBox);
    function renderEmp() {
      empBox.innerHTML = '';
      if (!DB.S.employees.length) empBox.appendChild(UI.h('div', { class: 'muted small', text: '暂无员工' }));
      DB.S.employees.forEach(function (e) {
        empBox.appendChild(UI.h('div', { class: 'li' }, [
          UI.h('div', {}, [UI.h('div', { class: 'li-t', text: e.name + ' · ' + (e.role || '') }), UI.h('div', { class: 'li-d', text: (e.phone || '') + (e.joinedAt ? ' · 入职 ' + e.joinedAt : '') })]),
          UI.btn('删除', 'mini dan', function () { DB.delEmployee(e.id); UI.toast('已删除'); App.go('fin-month'); })
        ]));
      });
    }
    renderEmp();
    b.appendChild(UI.btn('+ 新增员工', 'ghost block mt8', function () {
      var nm = UI.input({ placeholder: '姓名' }), rl = UI.input({ placeholder: '岗位，如 会计' }), ph = UI.input({ placeholder: '手机号' });
      UI.sheet({ title: '新增员工', build: function (bd) { bd.appendChild(UI.field('姓名', nm)); bd.appendChild(UI.field('岗位', rl)); bd.appendChild(UI.field('手机', ph)); }, footer: [{ text: '保存', cls: 'pri', onClick: function (api) {
        if (!nm.value.trim()) { UI.toast('请填写姓名', 'error'); return; }
        DB.addEmployee({ name: nm.value.trim(), role: rl.value.trim(), phone: ph.value.trim(), joinedAt: DB.dstr(new Date()) });
        UI.toast('已新增员工'); App.go('fin-month');
      } }] });
    }));

    // 月度运营数据
    b.appendChild(UI.sec('月度运营数据'));
    fm.slice().reverse().forEach(function (m) {
      b.appendChild(UI.listItem({ title: m.month, sub: '销售额 ¥' + UI.num(m.sales) + ' · 支出 ¥' + UI.num(m.expense) + ' · 利润 ¥' + UI.num(m.profit),
        right: [UI.tag('佣金已发 ¥' + UI.num(m.commissionPaid), 'gray')] }));
    });

    // 佣金结算明细
    var cm2 = DB.S.commissions;
    var payable = cm2.filter(function (c) { return c.status === 'settleable'; }).reduce(function (s, c) { return s + (c.amount || 0); }, 0);
    var paid = cm2.filter(function (c) { return c.status === 'paid'; }).reduce(function (s, c) { return s + (c.amount || 0); }, 0);
    b.appendChild(UI.card(UI.h('div', { class: 'kpi-grid g3' }, [
      UI.kpi('佣金应付', '¥' + UI.num(payable), { color: 'var(--warn)' }),
      UI.kpi('佣金已付', '¥' + UI.num(paid), { color: 'var(--success)' }),
      UI.kpi('待结算笔数', String(cm2.filter(function (c) { return c.status === 'settleable'; }).length), { color: 'var(--primary)' })
    ])));
    b.appendChild(UI.sec('佣金结算明细'));
    if (!cm2.length) b.appendChild(UI.empty('暂无佣金结算记录'));
    cm2.slice().reverse().slice(0, 30).forEach(function (c) {
      var owner = DB.member(c.memberId), from = DB.member(c.fromMemberId);
      b.appendChild(UI.listItem({
        title: (owner ? owner.name : c.memberId) + ' 的推荐佣金',
        sub: '来源：' + (from ? from.name : (c.fromName || '—')) + ' · ' + c.type + ' · ' + (c.createdAt || ''),
        right: [UI.tag(c.status === 'settleable' ? '待结算' : '已打款', c.status === 'settleable' ? 'wrn' : 'suc'),
          c.status === 'settleable' ? UI.btn('打款', 'mini', function () { c.status = 'paid'; DB.log('佣金打款', '向 ' + (owner ? owner.name : c.memberId) + ' 打款 ¥' + (c.amount || 0)); DB.save(); App.go('fin-month'); }) : null]
      }));
    });
    return { body: b };
  });

  /* ============ 工资管理（审核发放 + 可视化 + 明细 + 录入） ============ */
  App.register('salary', function () {
    var b = UI.h('div', { class: 'page' });
    var u = App.user, isFinance = u.role === 'finance', isAdmin = u.role === 'admin';
    var stats = DB.salaryStats();
    var years = Object.keys(stats.byYear).map(Number).sort();
    var selYear = years.length ? years[years.length - 1] : new Date().getFullYear();

    // ---- 顶部标题 + 流程说明 ----
    b.appendChild(UI.h('div', { class: 'member-page-title', style: { borderLeft: '3px solid var(--primary)', paddingLeft: '10px', fontSize: '15.5px', fontWeight: 700, marginBottom: '14px' }, text: '工资管理' }));
    b.appendChild(UI.h('div', { class: 'muted small mb8', text: '历史工资来自电脑「下载/工资表」2023–2026 年共 30 个月工资表，已自动整理统计。新工资流程：财务录入 → 管理员审核通过（待财务发放）→ 财务确认已发放 → 管理员确认入账（计入工资表）。' }));

    // ---- 子页签（审核发放置于最上方，确保可见）----
    var tabs = [];
    if (isAdmin) tabs.push({ k: 'review', t: '审核发放' });
    if (isFinance) tabs.push({ k: 'entry', t: '工资录入' });
    if (isFinance) tabs.push({ k: 'review', t: '审核发放' }); // 财务也需审核发放页去「确认已发放」
    tabs.push({ k: 'overview', t: '可视化总览' }, { k: 'detail', t: '工资明细' });
    var cur = tabs[0].k;
    var tabBar = UI.h('div', { class: 'sal-tabs' });
    var bodyBox = UI.h('div', { class: 'mt8' });
    b.appendChild(tabBar); b.appendChild(bodyBox);
    tabs.forEach(function (t) {
      tabBar.appendChild(UI.h('button', { class: 'sal-tab', 'data-k': t.k, text: t.t, onclick: function () { cur = t.k; render(); } }));
    });
    function paintTabs() {
      [].forEach.call(tabBar.children, function (c) { c.classList.toggle('on', c.getAttribute('data-k') === cur); });
    }

    function money(v) { return '¥' + UI.num(Math.round(v || 0)); }
    function ym(y, m) { return y + '-' + (m < 10 ? '0' + m : m); }

    /* ---------- ① 可视化总览 ---------- */
    function renderOverview() {
      var box = bodyBox; box.innerHTML = '';
      // KPI：总金额 + 总次数 + 在职 + 记录数
      var grossTotal = 0; DB.S.salary.forEach(function (x) { grossTotal += (x.gross || 0); });
      box.appendChild(UI.card(UI.h('div', { class: 'kpi-grid g4' }, [
        UI.kpi('累计实发总额', money(stats.total), { color: 'var(--primary)' }),
        UI.kpi('累计应发总额', money(grossTotal), { color: 'var(--warn)' }),
        UI.kpi('累计发放次数', stats.records + ' 次', { color: 'var(--success)' }),
        UI.kpi('在职人数(去重)', String(stats.people), { color: '#7c5cff' })
      ])));

      // 年份选择
      var ysel = UI.select(years.map(function (y) { return { v: y, t: y + ' 年' }; }), selYear, function (e) { selYear = Number(e.target.value); renderOverview(); });
      box.appendChild(UI.h('div', { class: 'bar-row' }, [UI.h('span', { class: 'muted small', text: '选择年份：' }), ysel]));

      // 年度实发柱状图（全部年份对比）
      var annData = years.map(function (y) { return { k: '' + y, v: Math.round(stats.byYear[y] || 0), color: y === selYear ? 'var(--primary)' : '#b9c4d6' }; });
      box.appendChild(UI.card(UI.h('div', {}, [
        UI.h('div', { class: 'card-hd', html: '<span class="bar"></span><h3>各年度实发工资对比</h3>' }),
        UI.h('div', { class: 'chart-box', html: UI.bars(annData, { h: 150, vfmt: function (v) { return (v / 10000).toFixed(1) + '万'; } }) })
      ])));

      // 所选年份月度趋势
      var ymMap = {};
      DB.S.salary.forEach(function (x) { if (x.year === selYear) { var k = x.month; ymMap[k] = (ymMap[k] || 0) + (x.net || 0); } });
      var monData = []; for (var m = 1; m <= 12; m++) { if (ymMap[m] != null) monData.push({ k: m + '月', v: Math.round(ymMap[m]), color: 'var(--accent)' }); }
      box.appendChild(UI.card(UI.h('div', {}, [
        UI.h('div', { class: 'card-hd', html: '<span class="bar"></span><h3>' + selYear + ' 年月度实发趋势</h3>' }),
        monData.length ? UI.h('div', { class: 'chart-box', html: UI.bars(monData, { h: 150, vfmt: function (v) { return (v / 10000).toFixed(1) + '万'; } }) }) : UI.empty('该年份暂无工资数据')
      ])));

      // 工资构成（整体：基本/绩效/全勤/社保/饭补）
      var comp = { base: 0, perf: 0, att: 0, social: 0, meal: 0 };
      DB.S.salary.forEach(function (x) { comp.base += (x.base || 0); comp.perf += (x.perf || 0); comp.att += (x.att || 0); comp.social += (x.social || 0); comp.meal += (x.meal || 0); });
      var compArr = [
        { k: '基本工资', v: Math.round(comp.base), color: '#3862f6' },
        { k: '绩效工资', v: Math.round(comp.perf), color: '#06aed4' },
        { k: '全勤奖', v: Math.round(comp.att), color: '#12b76a' },
        { k: '社保', v: Math.round(comp.social), color: '#f59e0b' },
        { k: '饭补', v: Math.round(comp.meal), color: '#7c5cff' }
      ];
      box.appendChild(UI.card(UI.h('div', {}, [
        UI.h('div', { class: 'card-hd', html: '<span class="bar"></span><h3>工资构成（应发项合计）</h3>' }),
        compArr.some(function (c) { return c.v > 0; }) ? UI.h('div', { class: 'chart-box', html: UI.bars(compArr, { h: 150, vfmt: function (v) { return (v / 10000).toFixed(2) + '万'; } }) }) : UI.empty('暂无数据')
      ])));

      // 各员工发放汇总（历史总数 + 所选年度总数 + 次数）
      var emp = {};
      DB.S.salary.forEach(function (x) {
        var e = emp[x.name] || (emp[x.name] = { name: x.name, hist: 0, yr: {}, cnt: 0, last: '' });
        e.hist += (x.net || 0);
        e.yr[x.year] = (e.yr[x.year] || 0) + (x.net || 0);
        e.cnt++;
        var ymk = ym(x.year, x.month); if (ymk > e.last) e.last = ymk;
      });
      var empRows = Object.keys(emp).map(function (k) { return emp[k]; }).sort(function (a, b) { return b.hist - a.hist; });
      box.appendChild(UI.card(UI.h('div', {}, [
        UI.h('div', { class: 'card-hd', html: '<span class="bar"></span><h3>各员工发放汇总（历史总数 / ' + selYear + ' 年总数 / 次数）</h3>' }),
        UI.h('div', { class: 'tbl-wrap' }, [UI.h('table', { class: 'tbl sal-tbl' }, [
          UI.h('thead', {}, [UI.h('tr', {}, [UI.h('th', { text: '员工' }), UI.h('th', { class: 'num', text: '历史总实发' }), UI.h('th', { class: 'num', text: selYear + ' 年实发' }), UI.h('th', { class: 'num', text: '发放次数' }), UI.h('th', { text: '最近发放' })])]),
          UI.h('tbody', {}, empRows.map(function (e) {
            return UI.h('tr', {}, [
              UI.h('td', { text: e.name }),
              UI.h('td', { class: 'num', style: { fontWeight: 700, color: 'var(--primary)' }, text: money(e.hist) }),
              UI.h('td', { class: 'num', text: money(e.yr[selYear] || 0) }),
              UI.h('td', { class: 'num', text: e.cnt + ' 次' }),
              UI.h('td', { class: 'muted small', text: e.last })
            ]);
          }))
        ])])
      ])));
    }

    /* ---------- ② 工资明细（按年份/月份/员工/姓名筛选与查询） ---------- */
    function renderDetail() {
      var box = bodyBox; box.innerHTML = '';
      var names = []; DB.S.salary.forEach(function (x) { if (names.indexOf(x.name) < 0) names.push(x.name); });
      var f = { year: 0, month: 0, emp: '', q: '' };
      function redraw() { draw(); }
      var yrSel = UI.select([{ v: 0, t: '全部年份' }].concat(years.map(function (y) { return { v: y, t: y + ' 年' }; })), 0, function (e) { f.year = Number(e.target.value); redraw(); });
      var moSel = UI.select([{ v: 0, t: '全部月份' }].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (m) { return { v: m, t: m + ' 月' }; })), 0, function (e) { f.month = Number(e.target.value); redraw(); });
      var empSel = UI.select([{ v: '', t: '全部员工' }].concat(names.map(function (n) { return { v: n, t: n }; })), '', function (e) { f.emp = e.target.value; redraw(); });
      var qInp = UI.input({ placeholder: '搜索姓名', oninput: function (e) { f.q = e.target.value; redraw(); } });
      box.appendChild(UI.h('div', { class: 'filter-row' }, [yrSel, moSel, empSel, qInp, UI.btn('导出 CSV', 'ghost sm', function () { exportDetail(); })]));

      var sumBox = UI.h('div', { class: 'bar-info' });
      var tblBox = UI.h('div', { class: 'mt8' });
      box.appendChild(sumBox); box.appendChild(tblBox);

      function rowsOf() {
        return DB.S.salary.filter(function (x) {
          if (f.year && x.year !== f.year) return false;
          if (f.month && x.month !== f.month) return false;
          if (f.emp && x.name !== f.emp) return false;
          if (f.q && (x.name + (x.position || '')).toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
          return true;
        });
      }
      function exportDetail() {
        var F = ['year', 'month', 'name', 'position', 'base', 'perf', 'att', 'social', 'meal', 'gross', 'dedAbs', 'dedOth', 'net', 'status', 'payDate'];
        var csv = DB.toCSV(rowsOf().map(function (x) { var o = {}; F.forEach(function (k) { o[k] = (k === 'year' || k === 'month') ? ym(x.year, x.month) : (k === 'status' ? DB.salStatusName(x.status) : x[k]); }); return o; }),
          [{ key: 'year', label: '月份' }].concat(F.slice(2).map(function (k) { return { key: k, label: k }; })));
        DB.download('工资明细_' + (f.emp || (f.year || '全部')) + '.csv', csv);
      }
      function draw() {
        var list = rowsOf();
        var netSum = list.reduce(function (s, x) { return s + (x.net || 0); }, 0);
        if (f.emp) {
          var eh = 0, ey = 0, ec = 0; list.forEach(function (x) { eh += (x.net || 0); if (x.year === selYear) ey += (x.net || 0); ec++; });
          sumBox.innerHTML = '员工 <b>' + f.emp + '</b> · 历史总实发 <b>' + money(eh) + '</b>　' + selYear + ' 年实发 <b>' + money(ey) + '</b>　共 <b>' + ec + '</b> 条 · 当前筛选实发合计 ' + money(netSum);
        } else {
          sumBox.innerHTML = '共 <b>' + list.length + '</b> 条工资记录 · 实发合计 <b>' + money(netSum) + '</b>';
        }
        tblBox.innerHTML = '';
        if (!list.length) { tblBox.appendChild(UI.empty('暂无数据')); return; }
        var tbl = UI.h('table', { class: 'tbl sal-tbl' }, [
          UI.h('thead', {}, [UI.h('tr', {}, [
            UI.h('th', { text: '月份' }), UI.h('th', { text: '姓名' }), UI.h('th', { text: '岗位' }),
            UI.h('th', { class: 'num', text: '基本' }), UI.h('th', { class: 'num', text: '绩效' }), UI.h('th', { class: 'num', text: '全勤' }),
            UI.h('th', { class: 'num', text: '社保' }), UI.h('th', { class: 'num', text: '饭补' }), UI.h('th', { class: 'num', text: '应发合计' }),
            UI.h('th', { class: 'num', text: '缺勤扣' }), UI.h('th', { class: 'num', text: '其他扣' }), UI.h('th', { class: 'num', text: '实发' }),
            UI.h('th', { text: '状态' })
          ])]),
          UI.h('tbody', {}, list.map(function (x) {
            return UI.h('tr', {}, [
              UI.h('td', { text: ym(x.year, x.month) }), UI.h('td', { text: x.name }), UI.h('td', { text: x.position || '—' }),
              UI.h('td', { class: 'num', text: UI.num(x.base) }), UI.h('td', { class: 'num', text: UI.num(x.perf) }), UI.h('td', { class: 'num', text: UI.num(x.att) }),
              UI.h('td', { class: 'num', text: UI.num(x.social) }), UI.h('td', { class: 'num', text: UI.num(x.meal) }), UI.h('td', { class: 'num', text: UI.num(x.gross) }),
              UI.h('td', { class: 'num', text: UI.num(x.dedAbs) }), UI.h('td', { class: 'num', text: UI.num(x.dedOth) }), UI.h('td', { class: 'num', style: { fontWeight: 700, color: 'var(--success)' }, text: UI.num(x.net) }),
              UI.h('td', {}, [UI.tag(DB.salStatusName(x.status), DB.salStatusColor(x.status))])
            ]);
          }))
        ]);
        tblBox.appendChild(UI.h('div', { class: 'tbl-wrap' }, [tbl]));
      }
      draw();
    }

    /* ---------- ③ 工资录入（财务） ---------- */
    function renderEntry() {
      var box = bodyBox; box.innerHTML = '';
      if (!isFinance) { box.appendChild(UI.empty('仅财务可录入工资')); return; }
      var now = new Date();
      var eyv = now.getFullYear(), emv = now.getMonth() + 1;
      var ey = UI.select(years.concat([now.getFullYear()]).filter(function (v, i, a) { return a.indexOf(v) === i; }).map(function (y) { return { v: y, t: y + ' 年' }; }), eyv, function (e) { eyv = Number(e.target.value); });
      var em = UI.select([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (m) { return { v: m, t: m + ' 月' }; }), emv, function (e) { emv = Number(e.target.value); });
      box.appendChild(UI.h('div', { class: 'filter-row' }, [UI.h('span', { class: 'muted small', text: '工资所属月份：' }), ey, em]));

      var rows = DB.S.employees.map(function (e) { return { name: e.name, position: e.role || '', base: '', perf: '', att: '', social: '', meal: '', dedAbs: '', dedOth: '' }; });
      var rowsBox = UI.h('div', { class: 'mt8' });
      box.appendChild(rowsBox);
      var totalLine = UI.h('div', { class: 'sal-total', text: '' });
      box.appendChild(totalLine);
      function updateTotal() {
        var sum = 0; rows.forEach(function (r) { sum += DB.calcSalary(Object.assign({}, r)).net; });
        totalLine.innerHTML = '应发合计 <b>' + money(rows.reduce(function (s, r) { return s + DB.calcSalary(Object.assign({}, r)).gross; }, 0)) + '</b>　实发合计 <b style="color:var(--success)">' + money(sum) + '</b>　共 ' + rows.length + ' 人';
      }
      function drawRows() {
        rowsBox.innerHTML = '';
        rows.forEach(function (r, i) {
          var inp = function (key, ph) { return UI.input({ placeholder: ph, value: r[key], oninput: function (e) { r[key] = e.target.value; updateTotal(); } }); };
          rowsBox.appendChild(UI.h('div', { class: 'sal-row' }, [
            inp('name', '姓名'), inp('position', '岗位'), inp('base', '基本'), inp('perf', '绩效'), inp('att', '全勤'),
            inp('social', '社保'), inp('meal', '饭补'), inp('dedAbs', '缺勤扣'), inp('dedOth', '其他扣'),
            UI.btn('删', 'mini dan', function () { rows.splice(i, 1); drawRows(); updateTotal(); })
          ]));
        });
        updateTotal();
      }
      drawRows();
      box.appendChild(UI.h('div', { class: 'bar-row mt8' }, [
        UI.btn('+ 添加一行', 'ghost sm', function () { rows.push({ name: '', position: '', base: '', perf: '', att: '', social: '', meal: '', dedAbs: '', dedOth: '' }); drawRows(); }),
        UI.btn('提交审核', 'pri', function () {
          var clean = rows.filter(function (r) { return (r.name || '').trim(); }).map(function (r) { return { name: r.name.trim(), position: r.position.trim(), base: r.base, perf: r.perf, att: r.att, social: r.social, meal: r.meal, dedAbs: r.dedAbs, dedOth: r.dedOth }; });
          if (!clean.length) { UI.toast('请至少填写一名员工', 'error'); return; }
          clean.forEach(function (r) {
            if (!DB.S.employees.some(function (e) { return e.name === r.name; })) {
              DB.addEmployee({ name: r.name, role: r.position || '', phone: '' });
            }
          });
          DB.addSalaryBatch(eyv, emv, clean, u.name);
          UI.toast('已提交 ' + eyv + '年' + emv + '月 工资（待管理员审核）', 'success');
          cur = 'review'; render();
        })
      ]));
    }

    /* ---------- ④ 审核发放（管理员 + 财务共用，按角色显示可操作按钮） ---------- */
    function renderReview() {
      var box = bodyBox; box.innerHTML = '';
      if (!isAdmin && !isFinance) { box.appendChild(UI.empty('无权限')); return; }
      var groups = DB.salaryMonthGroups();
      var order = { pending: 0, approved: 1, paid: 2, confirmed: 3, archived: 4 };
      groups.sort(function (a, b) { return (order[a.status] || 9) - (order[b.status] || 9); });
      if (!groups.length) { box.appendChild(UI.empty('暂无工资数据')); return; }
      var pendingCnt = groups.filter(function (g) { return g.status === 'pending'; }).length;
      var approvedCnt = groups.filter(function (g) { return g.status === 'approved'; }).length;
      var paidCnt = groups.filter(function (g) { return g.status === 'paid'; }).length;
      box.appendChild(UI.h('div', { class: 'bar-info', text: '共 ' + groups.length + ' 个月份工资 · 待审核 ' + pendingCnt + ' · 待财务发放 ' + approvedCnt + ' · 已发放待入账 ' + paidCnt }));
      groups.forEach(function (g) {
        var card = UI.h('div', { class: 'sal-review' });
        var acts = [];
        if (g.status === 'pending' && isAdmin) acts.push(UI.btn('审核通过', 'pri sm', function () { DB.setSalaryMonthStatus(g.year, g.month, 'approved', u.name); renderReview(); }));
        if (g.status === 'approved' && isFinance) acts.push(UI.btn('确认已发放', 'pri sm', function () { DB.setSalaryMonthStatus(g.year, g.month, 'paid', u.name); renderReview(); }));
        if (g.status === 'paid' && isAdmin) acts.push(UI.btn('确认入账', 'suc sm', function () { DB.setSalaryMonthStatus(g.year, g.month, 'confirmed', u.name); renderReview(); }));
        var head = UI.h('div', { class: 'sal-review-h' }, [
          UI.h('div', {}, [UI.h('div', { class: 'sal-review-m', text: g.key + ' 工资' }), UI.h('div', { class: 'muted small', text: g.count + ' 人 · 实发 ' + money(g.net) })]),
          UI.h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
            UI.tag(DB.salStatusName(g.status), DB.salStatusColor(g.status))
          ].concat(acts))
        ]);
        card.appendChild(head);
        var det = UI.h('div', { class: 'sal-review-d' });
        DB.salaryOfMonth(g.year, g.month).forEach(function (x) {
          det.appendChild(UI.h('div', { class: 'sal-review-item' }, [
            UI.h('span', { text: x.name + (x.position ? '（' + x.position + '）' : '') }),
            UI.h('span', { class: 'num', style: { color: 'var(--success)', fontWeight: 700 }, text: money(x.net) })
          ]));
        });
        card.appendChild(det);
        box.appendChild(card);
      });
    }

    function render() {
      paintTabs();
      if (cur === 'overview') renderOverview();
      else if (cur === 'detail') renderDetail();
      else if (cur === 'entry') renderEntry();
      else if (cur === 'review') renderReview();
    }
    render();
    return { body: b };
  });

  /* ============ 活动报名管理（活动 / 表头配置 / 报名记录） ============ */
  App.register('admin-activity', function () {
    var b = UI.h('div', { class: 'page' });

    function openDataLocal(dataUri, name) {
      if (!dataUri) { UI.toast('未上传凭证', 'warn'); return; }
      try { var a = w.document.createElement('a'); a.href = dataUri; if (name) a.download = name; a.target = '_blank'; w.document.body.appendChild(a); a.click(); w.document.body.removeChild(a); }
      catch (e) { UI.toast('无法打开文件', 'error'); }
    }
    function hdrTypeName(t) { return ({ text: '文本', textarea: '多行文本', number: '数字', select: '下拉选择', date: '日期', datetime: '日期时间', file: '文件上传' })[t] || t; }

    // ---- 标题说明 ----
    b.appendChild(UI.h('div', { class: 'member-page-title', style: { borderLeft: '3px solid var(--primary)', paddingLeft: '10px', fontSize: '15.5px', fontWeight: 700, marginBottom: '14px' }, text: '活动报名管理' }));
    b.appendChild(UI.h('div', { class: 'muted small mb8', text: '可发布活动、配置报名表头（后台可增减字段）、查看与导出报名记录。报名表单由表头动态生成，会员在手机端即可下拉选择报名。' }));

    // ---- 子页签 ----
    var tabs = [{ k: 'acts', t: '活动管理' }, { k: 'headers', t: '表头配置' }, { k: 'records', t: '报名记录' }];
    var cur = 'acts';
    var tabBar = UI.h('div', { class: 'sal-tabs' });
    var bodyBox = UI.h('div', { class: 'mt8' });
    b.appendChild(tabBar); b.appendChild(bodyBox);
    tabs.forEach(function (t) { tabBar.appendChild(UI.h('button', { class: 'sal-tab', 'data-k': t.k, text: t.t, onclick: function () { cur = t.k; render(); } })); });
    function paintTabs() { [].forEach.call(tabBar.children, function (c) { c.classList.toggle('on', c.getAttribute('data-k') === cur); }); }

    /* ---------- ① 活动管理 ---------- */
    function renderActs() {
      var box = bodyBox; box.innerHTML = '';
      var list = DB.activities();
      if (!list.length) { box.appendChild(UI.empty('暂无活动')); box.appendChild(UI.btn('+ 新增活动', 'pri block mt16', function () { editActivity(null); })); return; }
      list.forEach(function (a) {
        var cnt = DB.registrationsOf(a.id).length;
        var card = UI.h('div', { class: 'act-card' });
        card.appendChild(UI.h('div', { class: 'act-card-h' }, [
          UI.h('div', {}, [
            UI.h('div', { class: 'act-card-t', text: a.title }),
            UI.h('div', { class: 'muted small', text: '发布：' + (a.createdAt || '') + ' · 已报名 ' + cnt + ' 人' })
          ]),
          UI.h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
            UI.tag(a.status === 'open' ? '报名中' : '已关闭', a.status === 'open' ? 'suc' : 'gray'),
            UI.btn(a.status === 'open' ? '关闭报名' : '开启报名', 'ghost sm', function () { DB.updateActivity(a.id, { status: a.status === 'open' ? 'closed' : 'open' }, App.user.name); renderActs(); }),
            UI.btn('编辑', 'ghost sm', function () { editActivity(a); })
          ])
        ]));
        card.appendChild(UI.h('div', { class: 'act-card-content', text: a.content }));
        box.appendChild(card);
      });
      box.appendChild(UI.btn('+ 新增活动', 'pri block mt16', function () { editActivity(null); }));
    }

    function editActivity(a) {
      var isNew = !a;
      var draft = a ? JSON.parse(JSON.stringify(a)) : { id: '', title: '', content: '', status: 'open', createdAt: DB.fmtDate(), createdBy: App.user.name };
      UI.sheet({
        title: isNew ? '新增活动' : '编辑活动',
        build: function (bd) {
          var tInp = UI.input({ placeholder: '活动标题', value: draft.title });
          var cInp = UI.input({ area: true, placeholder: '活动通知正文', value: draft.content });
          cInp.style.minHeight = '200px';
          bd.appendChild(UI.field('活动标题', tInp, true));
          bd.appendChild(UI.field('活动通知内容', cInp, true));
        },
        footer: [{
          text: '保存', cls: 'pri', onClick: function (api) {
            var bd = api.body;
            var t = bd.querySelector('input').value.trim();
            var c = bd.querySelector('textarea').value.trim();
            if (!t) { UI.toast('请填写活动标题', 'error'); return; }
            if (!c) { UI.toast('请填写活动通知内容', 'error'); return; }
            if (isNew) { DB.activities().push({ id: DB.nid('act'), title: t, content: c, status: 'open', createdAt: DB.fmtDate(), createdBy: App.user.name }); DB.save(); UI.toast('活动已发布', 'success'); }
            else { DB.updateActivity(a.id, { title: t, content: c }, App.user.name); UI.toast('活动已更新', 'success'); }
            api.close(); renderActs();
          }
        }]
      });
    }

    /* ---------- ② 表头配置 ---------- */
    function renderHeaders() {
      var box = bodyBox; box.innerHTML = '';
      box.appendChild(UI.h('div', { class: 'muted small mb8', text: '报名表头决定手机端报名表单与管理端记录表。姓名/报名时间/参与方式/活动费用/附件支付凭证/活动备注说明为系统字段（不可删），其余可自由增减。' }));
      var list = DB.activityHeaders();
      if (!list.length) box.appendChild(UI.empty('暂无表头'));
      list.forEach(function (h) {
        var item = UI.h('div', { class: 'hdr-item' });
        item.appendChild(UI.h('div', { class: 'hdr-main' }, [
          UI.h('div', { class: 'hdr-label', text: h.label + (h.required ? ' *' : '') }),
          UI.h('div', { class: 'hdr-meta muted small', text: '字段：' + h.key + ' · 类型：' + hdrTypeName(h.type) + (h.options && h.options.length ? ' · ' + h.options.length + '个选项' : '') + (h.builtin ? ' · 系统字段' : '') })
        ]));
        var ops = UI.h('div', { class: 'hdr-ops' });
        ops.appendChild(UI.btn('↑', 'mini ghost', function () { DB.moveHeader(h.id, 'up'); renderHeaders(); }));
        ops.appendChild(UI.btn('↓', 'mini ghost', function () { DB.moveHeader(h.id, 'down'); renderHeaders(); }));
        ops.appendChild(UI.btn('编辑', 'mini ghost', function () { editHeader(h); }));
        if (!h.builtin) ops.appendChild(UI.btn('删', 'mini dan', function () { if (typeof w.confirm !== 'function' || w.confirm('确认删除该表头？已报名记录中对应内容将不再显示。')) { DB.delHeader(h.id); renderHeaders(); } }));
        item.appendChild(ops);
        box.appendChild(item);
      });
      box.appendChild(UI.btn('+ 添加表头', 'pri block mt16', function () { editHeader(null); }));
    }

    function editHeader(h) {
      var isNew = !h;
      var draft = h ? JSON.parse(JSON.stringify(h)) : { key: '', label: '', label2: '', type: 'text', required: false, options: [], builtin: false };
      UI.sheet({
        title: isNew ? '添加表头' : '编辑表头',
        build: function (bd) {
          var labelInp = UI.input({ placeholder: '显示名称（如：手机号）', value: draft.label || '' });
          var typeSel = UI.select([{ v: 'text', t: '文本' }, { v: 'textarea', t: '多行文本' }, { v: 'number', t: '数字' }, { v: 'select', t: '下拉选择' }, { v: 'date', t: '日期' }, { v: 'file', t: '文件上传' }], draft.type, function (e) { draft.type = e.target.value; optBox.style.display = draft.type === 'select' ? '' : 'none'; });
          var optBox = UI.h('div', { style: { display: draft.type === 'select' ? '' : 'none', marginTop: '8px' } });
          var optInp = UI.input({ placeholder: '选项，每行一个（仅下拉选择需要）', value: (draft.options || []).map(function (o) { return o.t; }).join('\n') });
          optBox.appendChild(UI.field('下拉选项（每行一个）', optInp));
          var reqSw = UI.switchBox(!!draft.required, function (v) { draft.required = v; });
          bd.appendChild(UI.field('显示名称', labelInp, true));
          bd.appendChild(UI.field('字段类型', typeSel));
          bd.appendChild(optBox);
          bd.appendChild(UI.h('div', { class: 'row-between' }, [UI.h('span', { class: 'li-t', text: '是否必填' }), reqSw]));
        },
        footer: [{
          text: '保存', cls: 'pri', onClick: function (api) {
            var bd = api.body;
            var label = bd.querySelector('input').value.trim();
            if (!label) { UI.toast('请填写显示名称', 'error'); return; }
            var type = bd.querySelectorAll('select')[0].value;
            var opts = [];
            if (type === 'select') {
              var raw = bd.querySelector('textarea').value;
              opts = raw.split('\n').map(function (s) { return s.trim(); }).filter(Boolean).map(function (s, i) { return { v: 'o' + (i + 1), t: s }; });
              if (!opts.length) { UI.toast('下拉选择至少需要一个选项', 'error'); return; }
            }
            var req = !!bd.querySelector('input[type=checkbox]').checked;
            if (isNew) {
              DB.addHeader({ id: DB.nid('ah'), key: 'f' + Date.now(), label: label, type: type, required: req, options: opts, builtin: false });
              UI.toast('表头已添加', 'success');
            } else {
              DB.updateHeader(h.id, { label: label, type: type, required: req, options: opts });
              UI.toast('表头已更新', 'success');
            }
            api.close(); renderHeaders();
          }
        }]
      });
    }

    /* ---------- ③ 报名记录 ---------- */
    function renderRecords() {
      var box = bodyBox; box.innerHTML = '';
      var acts = DB.activities();
      if (!acts.length) { box.appendChild(UI.empty('暂无活动')); return; }
      var selAct = acts[0].id;
      var actSel = UI.select(acts.map(function (a) { return { v: a.id, t: a.title }; }), selAct, function (e) { selAct = e.target.value; draw(); });
      var q = '';
      var tools = UI.h('div', { class: 'filter-row' }, [
        actSel,
        UI.input({ placeholder: '搜索姓名/参与方式', oninput: function (e) { q = e.target.value; draw(); } }),
        UI.btn('导出 CSV', 'ghost sm', function () { exportCSV(selAct); })
      ]);
      box.appendChild(tools);
      var tblBox = UI.h('div', { class: 'mt8' });
      box.appendChild(tblBox);

      function cellText(r, h) {
        var v = r.data ? r.data[h.key] : '';
        if (h.key === 'plan') return DB.planLabel(v);
        if (h.type === 'file') return (v && v.name) ? ('已上传：' + v.name) : '未上传';
        return v == null ? '' : String(v);
      }
      function exportCSV(actId) {
        var headers = DB.activityHeaders();
        var recs = DB.registrationsOf(actId);
        var cols = headers.map(function (h) { return { key: h.key, label: h.label }; });
        var data = recs.map(function (r) { var o = { _created: r.createdAt }; headers.forEach(function (h) { o[h.key] = cellText(r, h); }); return o; });
        var csv = DB.toCSV(data, [{ key: '_created', label: '提交时间' }].concat(cols));
        DB.download('报名记录_' + (DB.activity(actId) ? DB.activity(actId).title : actId) + '.csv', csv);
      }
      function rowsOf() {
        var recs = DB.registrationsOf(selAct);
        if (q) recs = recs.filter(function (r) { return JSON.stringify(r.data || {}).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
        return recs;
      }
      function draw() {
        var recs = rowsOf();
        tblBox.innerHTML = '';
        var headers = DB.activityHeaders();
        if (!headers.length) { tblBox.appendChild(UI.empty('请先在「表头配置」中设置表头')); return; }
        tblBox.appendChild(UI.h('div', { class: 'bar-info', text: '共 ' + recs.length + ' 条报名记录' }));
        if (!recs.length) { tblBox.appendChild(UI.empty('暂无报名记录')); return; }
        var thead = UI.h('tr', {}, headers.map(function (h) { return UI.h('th', { text: h.label + (h.required ? '*' : '') }); })
          .concat([UI.h('th', { text: '提交时间' }), UI.h('th', { text: '操作' })]));
        var tbody = UI.h('tbody', {}, recs.map(function (r) {
          return UI.h('tr', {}, headers.map(function (h) {
            if (h.type === 'file') {
              var v = r.data ? r.data[h.key] : '';
              return UI.h('td', {}, v && v.dataURL ? UI.btn('查看', 'mini', function () { openDataLocal(v.dataURL, v.name); }) : UI.h('span', { class: 'muted', text: '未上传' }));
            }
            return UI.h('td', { text: cellText(r, h) });
          }).concat([
            UI.h('td', { class: 'muted small', text: r.createdAt }),
            UI.h('td', {}, [UI.btn('删除', 'mini dan', function () { if (typeof w.confirm !== 'function' || w.confirm('确认删除该报名记录？')) { DB.delRegistration(r.id); draw(); } })])
          ]));
        }));
        tblBox.appendChild(UI.h('div', { class: 'tbl-wrap' }, [UI.h('table', { class: 'tbl sal-tbl' }, [UI.h('thead', {}, [thead]), tbody])]));
      }
      draw();
    }

    function render() {
      paintTabs();
      if (cur === 'acts') renderActs();
      else if (cur === 'headers') renderHeaders();
      else if (cur === 'records') renderRecords();
    }
    render();
    return { body: b };
  });

})(window, window.UI, window.DB, window.App);

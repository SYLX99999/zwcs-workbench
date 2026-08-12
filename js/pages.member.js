/* 会员手机端：我的资料（自助录入 / 会计证 / 简历） + 会员风采（公开名录） */
(function (w, UI, DB, App) {
  'use strict';
  var I = w.Icon;

  /* ====================================================================== */
  /*  文件读取工具                                                           */
  /* ====================================================================== */
  function readFile(input, maxMB, cb) {
    var f = input.files && input.files[0];
    if (!f) return;
    var mb = f.size / 1024 / 1024;
    if (mb > maxMB) { UI.toast('文件不能超过 ' + maxMB + 'MB（当前 ' + mb.toFixed(1) + 'MB）', 'error'); input.value = ''; return; }
    var fr = new w.FileReader();
    fr.onload = function () { cb(String(fr.result || ''), f.name, f.size); };
    fr.onerror = function () { UI.toast('文件读取失败', 'error'); };
    fr.readAsDataURL(f);
  }
  function openData(dataUri, name) {
    if (!dataUri) return;
    try {
      var a = w.document.createElement('a');
      a.href = dataUri;
      if (name) a.download = name;
      a.target = '_blank';
      w.document.body.appendChild(a); a.click(); w.document.body.removeChild(a);
    } catch (e) { UI.toast('无法打开文件', 'error'); }
  }
  function sizeText(dataUri) {
    if (!dataUri) return '';
    var b = Math.round(String(dataUri).length * 0.75 / 1024);
    return b > 1024 ? (b / 1024).toFixed(1) + 'MB' : b + 'KB';
  }

  /* ====================================================================== */
  /*  我的资料（会员自助录入）                                                */
  /* ====================================================================== */
  App.register('member-edit', function () {
    var u = App.user, b = UI.h('div', { class: 'page' });
    var m = DB.member(u.id) || u;

    // 头部
    var st = DB.profileStat(m.id);
    b.appendChild(UI.h('div', { class: 'hero' }, [
      UI.h('div', { class: 'hero-t', text: m.name }),
      UI.h('div', { class: 'hero-s', text: DB.levelName(m.level) + ' · 平台ID ' + m.uid + ' · ' + (m.region || '未设区域') })
    ]));

    // 完整度
    var need = ['region', 'phone', 'intro', 'expYears', 'accountsDone', 'skills', 'experience', 'certImg', 'resumeData'];
    var got = need.filter(function (k) { return m[k] !== undefined && m[k] !== '' && m[k] !== 0; }).length;
    var pct = Math.round(got / need.length * 100);
    b.appendChild(UI.card([
      UI.h('div', { class: 'row-between' }, [
        UI.h('div', { class: 'li-t', text: '资料完整度' }),
        UI.h('div', { class: 'li-t', style: { color: pct >= 80 ? 'var(--success)' : 'var(--warn)' }, text: pct + '%' })
      ]),
      UI.progressBar(pct, pct >= 80 ? 'suc' : 'wrn'),
      UI.h('div', { class: 'li-d', style: { marginTop: '6px' }, text: pct >= 80 ? '资料完善，会员风采展示更靠前' : '完善资料后，其他会员可以在「会员风采」看到你的专业能力' })
    ]));

    // ---------- 表单 ----------
    var f = {};
    function fld(label, key, attrs, req) {
      var el = UI.input(Object.assign({ value: m[key] === undefined ? '' : String(m[key]) }, attrs || {}));
      f[key] = el;
      b.appendChild(UI.field(label, el, req));
      return el;
    }

    b.appendChild(UI.sec('基础信息'));
    var wrapBase = UI.card([]);
    b.appendChild(wrapBase);
    var _b = b; b = wrapBase;
    fld('姓名（如需修改请联系管理员）', 'name', { value: m.name, disabled: true });
    fld('手机号', 'phone', { placeholder: '用于接收通知' }, true);
    var regSel = UI.select([{ v: '', t: '请选择所属区域' }].concat(DB.S.distRules.regions.map(function (c) { return { v: c, t: c }; })), m.region || '');
    f.region = regSel;
    b.appendChild(UI.field('所属区域（自行选择，决定可领取的名单区域）', regSel, true));
    fld('微信号', 'wechat', { placeholder: '方便客户联系' });
    fld('身份证号', 'idCard', { placeholder: '仅平台管理员可见' });
    fld('银行卡号', 'bank', { placeholder: '用于佣金打款' });
    fld('开户行', 'bankName', { placeholder: '如：中国建设银行海口分行' });
    b = _b;

    b.appendChild(UI.sec('职业档案（对外展示）'));
    var wrapPro = UI.card([]);
    b.appendChild(wrapPro);
    _b = b; b = wrapPro;
    fld('从业年限（年）', 'expYears', { type: 'number', min: '0', max: '60', placeholder: '如：8' }, true);
    fld('累计服务客户数（户）', 'accountsDone', { type: 'number', min: '0', placeholder: '做过多少户' }, true);
    fld('擅长领域（顿号分隔）', 'skills', { placeholder: '如：小规模代账、汇算清缴、税务筹划' });
    fld('服务过的行业/客户类型', 'clientTypes', { placeholder: '如：餐饮门店、建筑劳务、电商网店' });
    fld('会计证 / 职称证书编号', 'certNo', { placeholder: '如：初级会计职称 2019xxxxxx' });
    var introEl = UI.input({ area: true, value: m.intro || '', placeholder: '介绍一下自己：做了多少年、做过哪些户、有什么工作经验、擅长解决什么问题…（字数不限）', style: { minHeight: '120px' } });
    f.intro = introEl;
    b.appendChild(UI.field('个人介绍', introEl, true));
    var expEl = UI.input({ area: true, value: m.experience || '', placeholder: '例：\n2018-2021 XX代账公司 主办会计\n2021-至今 独立财税顾问，服务餐饮/建筑客户 80+ 户', style: { minHeight: '110px' } });
    f.experience = expEl;
    b.appendChild(UI.field('工作经历', expEl));
    b = _b;

    b.appendChild(UI.sec('资质与附件'));
    var wrapFile = UI.card([]);
    b.appendChild(wrapFile);
    _b = b; b = wrapFile;

    // 会计证
    var certState = { data: m.certImg || '' };
    var certBox = UI.h('div', { class: 'up-box' });
    function paintCert() {
      certBox.innerHTML = '';
      if (certState.data) {
        if (certState.data.indexOf('image/') > 0) {
          certBox.appendChild(UI.h('img', { src: certState.data, class: 'up-img', style: { maxWidth: '100%', borderRadius: '8px', display: 'block' } }));
        }
        certBox.appendChild(UI.h('div', { class: 'row-between', style: { marginTop: '8px' } }, [
          UI.h('div', { class: 'li-d', text: '已上传 · ' + sizeText(certState.data) }),
          UI.h('div', {}, [
            UI.btn('查看', 'mini', function () { openData(certState.data, '会计证'); }),
            UI.btn('删除', 'mini dan', function () { certState.data = ''; paintCert(); })
          ])
        ]));
      } else {
        var inp = UI.h('input', { type: 'file', accept: 'image/*' });
        inp.addEventListener('change', function () {
          readFile(inp, (DB.S.sysLimits && DB.S.sysLimits.imgSizeMB) || 5, function (data) { certState.data = data; paintCert(); UI.toast('会计证已上传'); });
        });
        certBox.appendChild(UI.h('div', { class: 'li-d', text: '支持 JPG / PNG，单张不超过 ' + ((DB.S.sysLimits && DB.S.sysLimits.imgSizeMB) || 5) + 'MB' }));
        certBox.appendChild(inp);
      }
    }
    paintCert();
    b.appendChild(UI.field('会计证 / 职称证书照片', certBox));

    // 简历
    var resState = { data: m.resumeData || '', name: m.resumeName || '' };
    var resBox = UI.h('div', { class: 'up-box' });
    function paintRes() {
      resBox.innerHTML = '';
      if (resState.data) {
        resBox.appendChild(UI.h('div', { class: 'row-between' }, [
          UI.h('div', {}, [
            UI.h('div', { class: 'li-t', text: resState.name || '我的简历' }),
            UI.h('div', { class: 'li-d', text: sizeText(resState.data) })
          ]),
          UI.h('div', {}, [
            UI.btn('下载', 'mini', function () { openData(resState.data, resState.name || '简历'); }),
            UI.btn('删除', 'mini dan', function () { resState.data = ''; resState.name = ''; paintRes(); })
          ])
        ]));
      } else {
        var inp2 = UI.h('input', { type: 'file', accept: '.pdf,.doc,.docx,.txt,.md,image/*' });
        inp2.addEventListener('change', function () {
          readFile(inp2, (DB.S.sysLimits && DB.S.sysLimits.fileSizeMB) || 20, function (data, nm) { resState.data = data; resState.name = nm; paintRes(); UI.toast('简历已上传'); });
        });
        resBox.appendChild(UI.h('div', { class: 'li-d', text: '支持 PDF / Word / 图片，不超过 ' + ((DB.S.sysLimits && DB.S.sysLimits.fileSizeMB) || 20) + 'MB' }));
        resBox.appendChild(inp2);
      }
    }
    paintRes();
    b.appendChild(UI.field('我的简历', resBox));

    // 公开开关
    var pubState = { on: m.publicProfile !== false };
    b.appendChild(UI.h('div', { class: 'row-between', style: { padding: '10px 0' } }, [
      UI.h('div', {}, [
        UI.h('div', { class: 'li-t', text: '在「会员风采」公开我的档案' }),
        UI.h('div', { class: 'li-d', text: '关闭后其他会员将看不到你的专业介绍（身份证、银行卡始终不公开）' })
      ]),
      UI.switchBox(pubState.on, function (v) { pubState.on = v; })
    ]));
    b = _b;

    // 平台数据（只读）
    b.appendChild(UI.sec('我的平台数据（自动统计）'));
    b.appendChild(UI.card(UI.h('div', { class: 'kpi-grid g2' }, [
      UI.kpi('在手名单', st.leads, { color: 'var(--inf)' }),
      UI.kpi('成交客户', st.deal, { color: 'var(--success)' }),
      UI.kpi('跟进中', st.talking, { color: 'var(--warn)' }),
      UI.kpi('学习完成', st.learnDone + '/' + st.learnTotal, { sub: st.learnPct + '%' })
    ])));

    b.appendChild(UI.h('div', { class: 'mt16' }));
    b.appendChild(UI.sec('账号安全'));
    b.appendChild(UI.btn('修改登录密码', 'ghost block', function () { openChangePwd(m); }));
    b.appendChild(UI.h('div', { class: 'mt16' }));
    b.appendChild(UI.btn('保存我的资料', 'pri block', function () {
      var patch = {
        phone: f.phone.value.trim(),
        region: f.region.value,
        wechat: f.wechat.value.trim(),
        idCard: f.idCard.value.trim(),
        bank: f.bank.value.trim(),
        bankName: f.bankName.value.trim(),
        certNo: f.certNo.value.trim(),
        intro: f.intro.value.trim(),
        experience: f.experience.value.trim(),
        skills: f.skills.value.trim(),
        clientTypes: f.clientTypes.value.trim(),
        expYears: parseInt(f.expYears.value, 10) || 0,
        accountsDone: parseInt(f.accountsDone.value, 10) || 0,
        certImg: certState.data,
        resumeData: resState.data,
        resumeName: resState.name,
        publicProfile: pubState.on
      };
      if (!patch.region) { UI.toast('请先选择所属区域', 'error'); return; }
      DB.updateProfile(m.id, patch);
      if (App.user && App.user.id === m.id) { Object.keys(patch).forEach(function (k) { App.user[k] = patch[k]; }); }
      UI.toast('资料已保存');
      App.go('member-edit');
    }));
    b.appendChild(UI.h('div', { class: 'mt8' }));
    b.appendChild(UI.btn('查看我在「会员风采」的展示效果', 'ghost block', function () { viewProfile(DB.member(m.id), true); }));
    b.appendChild(UI.h('div', { style: { height: '20px' } }));

    // 自助修改登录密码（写后端，多端共享）
    function openChangePwd(mm) {
      var oldP = UI.input({ type: 'password', placeholder: '原密码' });
      var newP = UI.input({ type: 'password', placeholder: '新密码（至少 6 位）' });
      var newP2 = UI.input({ type: 'password', placeholder: '确认新密码' });
      UI.sheet({
        title: '修改登录密码',
        build: function (bd) {
          bd.appendChild(UI.field('原密码', oldP));
          bd.appendChild(UI.field('新密码', newP));
          bd.appendChild(UI.field('确认新密码', newP2));
        },
        footer: [
          { text: '取消', cls: 'ghost', onClick: function (api) { api.close(); } },
          { text: '保存', cls: 'pri', onClick: function (api) {
            var np = newP.value, np2 = newP2.value;
            if (np.length < 6) { UI.toast('新密码至少 6 位', 'error'); return; }
            if (np !== np2) { UI.toast('两次输入不一致', 'error'); return; }
            DB.changeMyPassword(oldP.value, np).then(function (r) {
              if (r && r.ok) { UI.toast('密码已修改，下次请用新密码登录'); api.close(); }
              else UI.toast((r && r.msg) || '修改失败', 'error');
            });
          } }
        ]
      });
    }
    return { body: b };
  });

  /* ====================================================================== */
  /*  会员风采（公开名录）                                                    */
  /* ====================================================================== */
  var dirState = { kw: '', region: '', sort: 'accounts' };

  App.register('member-directory', function () {
    var b = UI.h('div', { class: 'page' });

    b.appendChild(UI.h('div', { class: 'hero' }, [
      UI.h('div', { class: 'hero-t', text: '会员风采' }),
      UI.h('div', { class: 'hero-s', text: '看看伙伴们的专业能力：从业年限 · 服务客户数 · 擅长领域' })
    ]));

    var kwIn = UI.input({ placeholder: '搜索姓名 / 区域 / 擅长领域', value: dirState.kw });
    var regSel = UI.select([{ v: '', t: '全部区域' }].concat(DB.S.distRules.regions.map(function (c) { return { v: c, t: c }; })), dirState.region);
    var sortSel = UI.select([
      { v: 'accounts', t: '按服务客户数' },
      { v: 'years', t: '按从业年限' },
      { v: 'deal', t: '按平台成交数' }
    ], dirState.sort);
    var listWrap = UI.h('div', {});

    function draw() {
      dirState.kw = kwIn.value.trim();
      dirState.region = regSel.value;
      dirState.sort = sortSel.value;
      var list = DB.publicMembers(dirState.kw, dirState.region);
      list = list.map(function (m) { return { m: m, s: DB.profileStat(m.id) }; });
      list.sort(function (a, c) {
        if (dirState.sort === 'years') return (c.m.expYears || 0) - (a.m.expYears || 0);
        if (dirState.sort === 'deal') return c.s.deal - a.s.deal;
        return (c.m.accountsDone || 0) - (a.m.accountsDone || 0);
      });
      listWrap.innerHTML = '';
      listWrap.appendChild(UI.h('div', { class: 'bar-info', style: { padding: '6px 2px' }, text: '共 ' + list.length + ' 位会员' }));
      if (!list.length) { listWrap.appendChild(UI.empty('没有找到会员', '换个关键词或区域试试')); return; }
      list.slice(0, 60).forEach(function (x, i) {
        listWrap.appendChild(profileCard(x.m, x.s, i));
      });
      if (list.length > 60) listWrap.appendChild(UI.h('div', { class: 'bar-info', style: { textAlign: 'center', padding: '10px' }, text: '仅显示前 60 位，请使用搜索缩小范围' }));
    }

    kwIn.addEventListener('input', draw);
    regSel.addEventListener('change', draw);
    sortSel.addEventListener('change', draw);

    b.appendChild(UI.h('div', { class: 'filter-row' }, [kwIn]));
    b.appendChild(UI.h('div', { class: 'filter-row' }, [regSel, sortSel]));
    b.appendChild(listWrap);
    draw();
    return { body: b };
  });

  function profileCard(m, s, idx) {
    var color = ['#3862f6', '#06aed4', '#12b76a', '#f79009', '#7c5cff', '#f04438'][idx % 6];
    var skills = String(m.skills || '').split(/[、,，]/).filter(Boolean).slice(0, 3);
    var tags = UI.h('div', { class: 'tag-row', style: { marginTop: '6px' } });
    skills.forEach(function (k) { tags.appendChild(UI.tag(k, 'pri')); });
    if (m.expYears) tags.appendChild(UI.tag(m.expYears + ' 年经验', 'inf'));
    if (m.certImg) tags.appendChild(UI.tag('已认证会计证', 'suc'));

    return UI.card([
      UI.h('div', { class: 'row-between', style: { alignItems: 'flex-start' } }, [
        UI.h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, [
          UI.h('div', { class: 'avatar', style: { background: color }, text: (m.name || '？').slice(0, 1) }),
          UI.h('div', {}, [
            UI.h('div', { class: 'li-t', text: m.name }),
            UI.h('div', { class: 'li-d', text: DB.levelName(m.level) + ' · ' + (m.region || '未设区域') })
          ])
        ]),
        UI.h('div', { style: { textAlign: 'right' } }, [
          UI.h('div', { class: 'li-t', style: { color: 'var(--primary)', fontSize: '18px' }, text: (m.accountsDone || 0) }),
          UI.h('div', { class: 'li-d', text: '服务客户(户)' })
        ])
      ]),
      tags,
      m.intro ? UI.h('div', { class: 'li-d', style: { marginTop: '8px', lineHeight: '1.6' }, text: String(m.intro).slice(0, 68) + (String(m.intro).length > 68 ? '…' : '') }) : null,
      UI.h('div', { class: 'row-between', style: { marginTop: '10px' } }, [
        UI.h('div', { class: 'li-d', text: '平台成交 ' + s.deal + ' · 跟进中 ' + s.talking + ' · 学习 ' + s.learnPct + '%' }),
        UI.btn('查看名片', 'mini pri', function () { viewProfile(m); })
      ])
    ], 'mb10');
  }

  /* ---------------- 会员名片详情 ---------------- */
  function viewProfile(m, isSelf) {
    if (!m) return;
    var s = DB.profileStat(m.id);
    UI.sheet({
      title: m.name + ' 的名片',
      build: function (bd) {
        bd.appendChild(UI.h('div', { class: 'sh-hero' }, [
          UI.h('div', { class: 'avatar lg', style: { background: 'var(--primary)' }, text: (m.name || '？').slice(0, 1) }),
          UI.h('div', {}, [
            UI.h('div', { class: 'li-t', style: { fontSize: '16px' }, text: m.name }),
            UI.h('div', { class: 'li-d', text: DB.levelName(m.level) + ' · ' + (m.region || '未设区域') + ' · 平台ID ' + m.uid })
          ])
        ]));

        bd.appendChild(UI.h('div', { class: 'kpi-grid g3', style: { marginTop: '10px' } }, [
          UI.kpi('从业年限', (m.expYears || 0), { unit: '年' }),
          UI.kpi('服务客户', (m.accountsDone || 0), { unit: '户', color: 'var(--primary)' }),
          UI.kpi('平台成交', s.deal, { unit: '户', color: 'var(--success)' })
        ]));

        if (m.skills) {
          bd.appendChild(UI.sec('擅长领域'));
          var tr = UI.h('div', { class: 'tag-row' });
          String(m.skills).split(/[、,，]/).filter(Boolean).forEach(function (k) { tr.appendChild(UI.tag(k, 'pri')); });
          bd.appendChild(tr);
        }
        if (m.clientTypes) {
          bd.appendChild(UI.sec('服务过的行业'));
          var tr2 = UI.h('div', { class: 'tag-row' });
          String(m.clientTypes).split(/[、,，]/).filter(Boolean).forEach(function (k) { tr2.appendChild(UI.tag(k, 'inf')); });
          bd.appendChild(tr2);
        }
        if (m.intro) {
          bd.appendChild(UI.sec('个人介绍'));
          bd.appendChild(UI.h('div', { class: 'para', style: { whiteSpace: 'pre-wrap', lineHeight: '1.7' }, text: m.intro }));
        }
        if (m.experience) {
          bd.appendChild(UI.sec('工作经历'));
          bd.appendChild(UI.h('div', { class: 'para', style: { whiteSpace: 'pre-wrap', lineHeight: '1.7' }, text: m.experience }));
        }

        bd.appendChild(UI.sec('资质与附件'));
        bd.appendChild(UI.listItem({
          title: '会计证 / 职称证书', arrow: false,
          sub: m.certNo || (m.certImg ? '已上传证书照片' : '未上传'),
          right: [m.certImg ? UI.btn('查看', 'mini', function () { openData(m.certImg, m.name + '-会计证'); }) : UI.tag('未上传', 'gray')]
        }));
        bd.appendChild(UI.listItem({
          title: '个人简历', arrow: false,
          sub: m.resumeName || '未上传',
          right: [m.resumeData ? UI.btn('下载', 'mini', function () { openData(m.resumeData, m.resumeName || (m.name + '-简历')); }) : UI.tag('未上传', 'gray')]
        }));

        bd.appendChild(UI.sec('平台学习与拓客'));
        bd.appendChild(UI.listItem({ title: '课程学习完成度', arrow: false, sub: s.learnDone + '/' + s.learnTotal + ' 门必修', right: [UI.tag(s.learnPct + '%', s.learnPct >= 80 ? 'suc' : 'wrn')] }));
        bd.appendChild(UI.listItem({ title: '在手企业名单', arrow: false, sub: s.leads + ' 条', right: [UI.tag('跟进中 ' + s.talking, 'inf')] }));

        bd.appendChild(UI.sec('联系方式'));
        bd.appendChild(UI.listItem({ title: '手机号', arrow: false, sub: m.phone || '未填写' }));
        bd.appendChild(UI.listItem({ title: '微信号', arrow: false, sub: m.wechat || '未填写' }));
        if (!isSelf) bd.appendChild(UI.h('div', { class: 'li-d', style: { marginTop: '8px' }, text: '注：身份证、银行卡等敏感信息不对其他会员展示。' }));
      },
      footer: isSelf ? [{ text: '返回编辑', cls: 'pri', onClick: function (api) { api.close(); } }] : [{ text: '关闭', cls: 'ghost', onClick: function (api) { api.close(); } }]
    });
  }

  App.viewMemberProfile = viewProfile;
  /* ============ 活动报名（手机端会员） ============ */
  App.register('activity', function () {
    var u = App.user, b = UI.h('div', { class: 'page' });

    function openDataLocal(dataUri, name) {
      if (!dataUri) { UI.toast('未上传凭证', 'warn'); return; }
      try { var a = w.document.createElement('a'); a.href = dataUri; if (name) a.download = name; a.target = '_blank'; w.document.body.appendChild(a); a.click(); w.document.body.removeChild(a); }
      catch (e) { UI.toast('无法打开文件', 'error'); }
    }

    var acts = DB.activities().filter(function (a) { return a.status === 'open'; });
    if (!acts.length) {
      b.appendChild(UI.empty('当前暂无开放报名的活动'));
      return { body: b };
    }
    var curAct = acts[0];

    function renderDetail() {
      b.innerHTML = '';
      b.appendChild(UI.h('div', { class: 'act-detail-banner', text: curAct.title }));
      b.appendChild(UI.card(UI.h('div', { class: 'act-notice', text: curAct.content })));
      var mine = DB.registrationsOf(curAct.id).filter(function (r) { return r.memberId === u.id; })[0];
      if (mine) {
        b.appendChild(UI.h('div', { class: 'notice-bar ok', html: I('check', 14) + ' 您已于 ' + mine.createdAt + ' 报名成功（参与方式：' + DB.planLabel(mine.data.plan) + '），可重新提交修改。' }));
      }
      b.appendChild(UI.btn('立即报名 / 修改报名', 'pri block mt16', function () { openSignup(curAct, mine); }));
    }

    function openSignup(act, mine) {
      var headers = DB.activityHeaders();
      var data = {};
      data.name = (mine && mine.data.name) || u.name || '';
      data.signupTime = DB.fmtTime();
      if (mine) { for (var k in mine.data) { if (k !== 'name' && k !== 'signupTime') data[k] = mine.data[k]; } }
      var feeInput = null;

      UI.sheet({
        title: '活动报名',
        build: function (bd) {
          headers.forEach(function (hdr) {
            if (hdr.auto === true) {
              data[hdr.key] = DB.fmtTime();
              bd.appendChild(UI.field(hdr.label, UI.input({ value: data[hdr.key], readonly: true })));
              return;
            }
            if (hdr.key === 'plan') {
              var opts = (hdr.options || []).map(function (o) { return { v: o.v, t: o.t }; });
              var sel = UI.select(opts, data.plan || (opts[0] && opts[0].v), function (e) {
                data.plan = e.target.value;
                data.fee = DB.planFee(data.plan);
                if (feeInput) feeInput.value = data.fee;
              });
              bd.appendChild(UI.field(hdr.label + (hdr.required ? ' *' : ''), sel, hdr.required));
              return;
            }
            if (hdr.key === 'fee') {
              feeInput = UI.input({ type: 'number', value: DB.planFee(data.plan) });
              feeInput.addEventListener('input', function (e) { data.fee = e.target.value; });
              data.fee = DB.planFee(data.plan);
              bd.appendChild(UI.field(hdr.label + '（按方案自动，可改）', feeInput));
              return;
            }
            if (hdr.type === 'file') {
              var wrap = UI.h('div', { class: 'upload-box' });
              var st = UI.h('div', { class: 'up-tip', text: (data[hdr.key] && data[hdr.key].name) ? ('已上传：' + data[hdr.key].name) : '点击选择支付凭证文件（图片/PDF，≤8MB）' });
              var inp = UI.h('input', { type: 'file', class: 'inp', accept: 'image/*,.pdf' });
              inp.addEventListener('change', function () {
                var f = inp.files && inp.files[0];
                if (!f) return;
                if (f.size > 8 * 1024 * 1024) { UI.toast('文件不能超过 8MB', 'error'); inp.value = ''; return; }
                var fr = new w.FileReader();
                fr.onload = function () { data[hdr.key] = { name: f.name, type: f.type, size: f.size, dataURL: String(fr.result || '') }; st.textContent = '已上传：' + f.name; };
                fr.onerror = function () { UI.toast('文件读取失败', 'error'); };
                fr.readAsDataURL(f);
              });
              wrap.appendChild(inp); wrap.appendChild(st);
              bd.appendChild(UI.field(hdr.label + (hdr.required ? ' *' : ''), wrap, hdr.required));
              return;
            }
            if (hdr.type === 'select') {
              var sopts = (hdr.options || []).map(function (o) { return { v: o.v, t: o.t }; });
              if (!hdr.required) sopts = [{ v: '', t: '请选择' }].concat(sopts);
              var ssel = UI.select(sopts, data[hdr.key] || '', function (e) { data[hdr.key] = e.target.value; });
              bd.appendChild(UI.field(hdr.label + (hdr.required ? ' *' : ''), ssel, hdr.required));
              return;
            }
            if (hdr.type === 'textarea') {
              var ta = UI.input({ area: true, placeholder: hdr.label, value: data[hdr.key] || '' });
              ta.addEventListener('input', function (e) { data[hdr.key] = e.target.value; });
              bd.appendChild(UI.field(hdr.label + (hdr.required ? ' *' : ''), ta, hdr.required));
              return;
            }
            var attrs = { placeholder: hdr.label, value: data[hdr.key] || '' };
            if (hdr.type === 'number') attrs.type = 'number';
            if (hdr.type === 'date') attrs.type = 'date';
            var inp2 = UI.input(attrs);
            inp2.addEventListener('input', function (e) { data[hdr.key] = e.target.value; });
            bd.appendChild(UI.field(hdr.label + (hdr.required ? ' *' : ''), inp2, hdr.required));
          });
        },
        footer: [{
          text: '提交报名', cls: 'pri', onClick: function (api) {
            var miss = [];
            DB.activityHeaders().forEach(function (h) {
              if (!h.required || h.auto) return;
              var v = data[h.key];
              if (h.type === 'file') { if (!v || !v.dataURL) miss.push(h.label); }
              else if (v == null || String(v).trim() === '') miss.push(h.label);
            });
            if (miss.length) { UI.toast('请填写必填项：' + miss.join('、'), 'error'); return; }
            if (!data.plan) { UI.toast('请选择参与方式', 'error'); return; }
            if (data.fee == null || data.fee === '') data.fee = DB.planFee(data.plan);
            DB.signUp(curAct.id, u.id, data);
            UI.toast('报名成功！', 'success');
            api.close(); renderDetail();
          }
        }]
      });
    }

    renderDetail();
    return { body: b };
  });

})(window, window.UI, window.DB, window.App);

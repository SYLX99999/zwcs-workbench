/* ==========================================================================
   数据层 v2 —— 中为财税合伙人工作台（真实业务模型）
   实体：会员(含级别/推荐关系/区域)、级别、课程、学习进度、佣金、
        企业名单(按区域)、名单字段配置、分配规则、跟进、报工、目标、PK、
        运营中心、子公司、财务、差错、流失、审核、题库、日志、通知
   ========================================================================== */
(function (w) {
  'use strict';
  var KEY = 'zwcs_workbench_v2';

  /* ---------------- 工具 ---------------- */
  function d0(n) { return n < 10 ? '0' + n : '' + n; }
  function dstr(dt) { return dt.getFullYear() + '-' + d0(dt.getMonth() + 1) + '-' + d0(dt.getDate()); }
  function tstr(dt) { return dstr(dt) + ' ' + d0(dt.getHours()) + ':' + d0(dt.getMinutes()); }
  var _id = 5000;
  function nid(p) { return (p || 'id') + '_' + (++_id) + '_' + Math.floor(Math.random() * 9999); }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }
  function monthStr(dt) { return dt.getFullYear() + '-' + d0(dt.getMonth() + 1); }

  /* ---------------- 常量字典 ---------------- */
  var ROLES = {
    member: { key: 'member', name: '合伙人 / 会员', color: '#3862f6' },
    org: { key: 'org', name: '运营中心', color: '#06aed4' },
    company: { key: 'company', name: '子公司负责人', color: '#7c5cff' },
    finance: { key: 'finance', name: '总部财务', color: '#12b76a' },
    admin: { key: 'admin', name: '总部管理员', color: '#f04438' }
  };

  // 会员级别（业务中真实级别，按资深度排序；order 越小越资深）
  var GRADES = [
    { name: '城市财税赋能中心主理人', order: 1, color: '#f04438', dailyLead: 30, rate: 20, courses: 'all' },
    { name: '城市财税赋能中心', order: 2, color: '#fa6412', dailyLead: 28, rate: 18, courses: 'all' },
    { name: '万户侯', order: 3, color: '#7c5cff', dailyLead: 22, rate: 15, courses: 'junior' },
    { name: '千户侯', order: 4, color: '#6952f8', dailyLead: 20, rate: 13, courses: 'junior' },
    { name: '百户侯', order: 5, color: '#3862f6', dailyLead: 16, rate: 12, courses: 'junior_mid' },
    { name: '顶级会计', order: 6, color: '#12b76a', dailyLead: 14, rate: 10, courses: 'junior' },
    { name: '四星', order: 7, color: '#06aed4', dailyLead: 12, rate: 9, courses: 'junior' },
    { name: '三星', order: 8, color: '#0ea5a4', dailyLead: 10, rate: 8, courses: 'none' },
    { name: '二星', order: 9, color: '#22a06b', dailyLead: 8, rate: 6, courses: 'none' },
    { name: '一星', order: 10, color: '#84cc16', dailyLead: 6, rate: 5, courses: 'none' },
    // 平台注册但未晋级的会员（源表「会员等级 = 默认等级」），占比最大
    { name: '默认等级', order: 11, color: '#98a2b3', dailyLead: 3, rate: 0, courses: 'none' }
  ];

  var FOLLOW_STATUS = [
    { k: 'new', n: '待跟进', c: 'gray' },
    { k: 'called', n: '已拨打电话', c: 'inf' },
    { k: 'wechat', n: '已加微信', c: 'inf' },
    { k: 'talk', n: '初步沟通', c: 'pri' },
    { k: 'deep', n: '深度洽谈', c: 'pri' },
    { k: 'intent', n: '意向客户', c: 'wrn' },
    { k: 'deal', n: '成交客户', c: 'suc' },
    { k: 'invalid', n: '无效客户', c: 'dan' }
  ];
  function followName(k) { var f = FOLLOW_STATUS.filter(function (x) { return x.k === k; })[0]; return f ? f.n : k; }
  function followColor(k) { var f = FOLLOW_STATUS.filter(function (x) { return x.k === k; })[0]; return f ? f.c : 'gray'; }

  var KPI_FIELDS = [
    { k: 'calls', n: '电话拨打量', u: '通' },
    { k: 'effective', n: '有效沟通客户', u: '个' },
    { k: 'deep', n: '深度沟通客户', u: '个' },
    { k: 'newWechat', n: '新增微信好友', u: '人' },
    { k: 'fans', n: '平台新增粉丝', u: '人' },
    { k: 'orders', n: '成交订单数量', u: '单' },
    { k: 'newMembers', n: '新增会员/渠道', u: '个' }
  ];
  var GOAL_PERIODS = [
    { k: 'month', n: '月度目标' }, { k: 'quarter', n: '季度目标' }, { k: 'half', n: '半年目标' },
    { k: 'year', n: '年度目标' }, { k: 'y3', n: '3年目标' }, { k: 'y5', n: '5年目标' }, { k: 'y10', n: '10年目标' }
  ];
  function periodName(k) { var g = GOAL_PERIODS.filter(function (x) { return x.k === k; })[0]; return g ? g.n : k; }
  function dimName(k) { var g = KPI_FIELDS.filter(function (x) { return x.k === k; })[0]; return g ? g.n : k; }
  function dimUnit(k) { var g = KPI_FIELDS.filter(function (x) { return x.k === k; })[0]; return g ? g.u : ''; }

  var ORG_LEVELS = [
    { k: 'province', n: '省级运营中心' }, { k: 'city', n: '市级运营中心' },
    { k: 'district', n: '区县运营中心' }, { k: 'street', n: '街道运营中心' }
  ];
  function orgLevelName(k) { var o = ORG_LEVELS.filter(function (x) { return x.k === k; })[0]; return o ? o.n : k; }
  var ORG_PERMS = [
    { k: 'viewLearning', n: '学习数据查看' }, { k: 'urge', n: '学习进度督促' },
    { k: 'viewPerf', n: '拓客业绩查看' }, { k: 'viewReport', n: '每日报工查看' },
    { k: 'viewGoal', n: '目标计划查看' }, { k: 'viewPk', n: 'PK 竞赛查看' }
  ];

  // 企业名单表头（后台可增减）
  var DEFAULT_LEAD_FIELDS = [
    { key: 'company', label: '公司名称', required: true },
    { key: 'creditCode', label: '统一社会信用代码', required: true },
    { key: 'city', label: '所属城市(区域)', required: true },
    { key: 'legalPerson', label: '法定代表人', required: false },
    { key: 'capital', label: '注册资本', required: false },
    { key: 'regStatus', label: '登记状态', required: false },
    { key: 'regDate', label: '成立日期', required: false },
    { key: 'phone', label: '有效手机号', required: false }
  ];

  /* ---------------- 种子装载 ---------------- */
  function buildSeed() {
    var S = {
      meta: { version: 2, createdAt: tstr(new Date()) },
      sysLimits: { textMax: 100000, noteMax: 5000, imgCount: 6, imgSizeMB: 5, fileSizeMB: 20 },
      commissionRule: { juniorAmount: 300, autoUnlock: true, needExamPass: true },
      pkRule: { periods: ['day', 'week', 'month'], allowStake: true, maxStake: 2000, needConfirm: true },
      leadRule: { reachRate: 70, dailyBase: 12, stopWhenFail: true },
      distRules: { enabled: true, perMember: 20, regionMatch: true, fallbackAll: false, onGoalReached: true,
        regions: ['海口市', '三亚市', '儋州市', '文昌市', '琼海市', '万宁市', '东方市', '五指山市', '澄迈县', '临高县', '陵水黎族自治县', '琼中黎族自治县'] },
      grades: JSON.parse(JSON.stringify(GRADES)),
      courses: (w.SEED_COURSES || []).map(function (c) {
        var chN = c.chapters || 1;
        var list = [];
        for (var ci = 0; ci < chN; ci++) list.push({ id: c.id + '_ch' + (ci + 1), title: '第 ' + (ci + 1) + ' 节', minutes: Math.round((c.minutes || 0) / chN), content: '' });
        return { id: c.id, name: c.name, cat: c.cat, minutes: c.minutes, type: c.type, chapters: chN, chapterList: list };
      }),
      leadFields: JSON.parse(JSON.stringify(DEFAULT_LEAD_FIELDS)),
      members: (w.SEED_MEMBERS || []).map(function (m) { return Object.assign({}, m); }),
      leads: (w.SEED_LEADS || []).map(function (l) { return Object.assign({}, l); }),
      salary: (w.SEED_SALARY || []).map(function (s) { return Object.assign({}, s); }),
      progress: [], commissions: [], follows: [], reports: [], goals: [], plans: [],
      pks: [], orgs: [], companies: [], finMonths: [], errors: [], churns: [], audits: [], logs: [], notices: [], questions: [],
      admins: [], reportItems: [], goalTemplates: [], leadRequests: [], accounts: [], employees: [], evaluations: {},
      activities: [], activityHeaders: [], registrations: []
    };

    // 运营中心 / 子公司（演示）
    S.orgs.push({ id: 'o1', name: '华东省级运营中心', level: 'province', headId: '', region: '上海市', perms: ORG_PERMS.map(function (p) { return p.k; }) });
    S.companies.push({ id: 'co1', name: '北京科技有限公司', headId: '', region: '北京市', legalPerson: '陈总', capital: '500万', joinedAt: '2024-03-01' });

    // 总部管理员 / 财务（可后台修改姓名与密码）
    S.admins.push({ id: 'u_admin', uid: 'HQ0001', name: '张启明', role: 'admin', password: '888888' });
    S.admins.push({ id: 'u_fin', uid: 'HQ0002', name: '李文静', role: 'finance', password: '888888' });

    // 财务账户（余额由后台维护）
    ['支付宝商户', '微信商户', '工商银行', '中国银行', '招商银行', '建设银行'].forEach(function (n) { S.accounts.push({ id: nid('ac'), name: n, balance: 0 }); });

    // 内部员工名册（演示）
    S.employees.push({ id: nid('em'), name: '王会计', role: '会计', phone: '13800000001', joinedAt: dstr(daysAgo(120)) });
    S.employees.push({ id: nid('em'), name: '赵助理', role: '行政', phone: '13800000002', joinedAt: dstr(daysAgo(60)) });

    // 活动报名：默认活动（大单客户开发100天实战陪跑）+ 可后台增减的报名表头
    var ACT_NOTICE = [
      '各位顶级合作伙伴：',
      '',
      '为赋能全国财务人员与财税公司成长，全面提升伙伴大单开拓能力、落地成交能力，助力大家持续做大业绩、稳定增收，中为企服平台正式启动大单客户开发100天实战赋能陪跑计划！',
      '',
      '本次专项活动同时启动全国100位大单实战陪跑导师招募培养计划！所有参与本次100天陪跑、业绩表现优秀的伙伴，均可申请成为平台官方赋能实战陪跑导师，解锁平台官方身份，共享全国线上线下培训收益，实现个人能力、行业身份、长期收入三重升级！',
      '',
      '本次活动仅限百户侯、顶级会计及以上级别核心伙伴参与，为适配每位伙伴的发展节奏，本次陪跑开设三种参与方案，大家可自由选择、按需报名：',
      '',
      '方案一：纯自主学习（全程免费）',
      '免费参与本次100天大单开发实战课程学习，获取全套拓客方法与实战干货，由伙伴自主学习、自主落地开发，无平台陪跑、无任何费用、无任何绑定。',
      '',
      '方案二：平台全程赋能陪跑（零前期投入）',
      '免费学习全部课程内容，平台全程专业赋能、一对一陪跑落地大单开发全流程，全程无需预付任何费用。',
      '费用说明：成功开发客户、产生业绩后，从个人成交业绩中扣除6000元作为本次100天实战陪跑服务费用。',
      '',
      '方案三：零成本专属陪跑（优选福利方案）',
      '仅预付2000元，即可锁定平台专属一对一全程陪跑，平台持续陪跑跟进直至做出业绩、成功开单。',
      '福利政策：伙伴成功开发首个月费用超2000元客户，平台全额返还2000元预付金。真正实现一分钱不花，免费陪跑落地，做出业绩为止。',
      '',
      '参与须知',
      '1. 参与对象：中为企服平台百户侯、顶级会计及以上级别全体伙伴；',
      '2. 优秀晋升：本次100天陪跑期间业绩突出、落地能力优秀者，可入选平台全国100位实战陪跑导师库，享受官方导师身份与全国培训分红收益；',
      '3. 报名方式：所有意向伙伴根据自身情况选择对应方案，填写下方报名表即可正式参与。',
      '',
      '机会难得、名额有限！希望各位核心伙伴把握平台赋能红利，精进大单开发能力，冲刺高业绩、进阶实战导师、共享全国市场收益！',
      '',
      '中为企服平台',
      '2026年08月10日'
    ].join('\n');
    S.activities.push({
      id: 'act_100day', title: '【重磅赋能】中为企服平台大单客户开发100天实战陪跑活动',
      content: ACT_NOTICE, status: 'open', createdAt: '2026-08-10', createdBy: '总部管理员'
    });
    var PLAN_OPTS = [
      { v: 'plan1', t: '方案一·纯自主学习（全程免费）' },
      { v: 'plan2', t: '方案二·平台全程赋能陪跑（成功后扣6000元）' },
      { v: 'plan3', t: '方案三·零成本专属陪跑（预付2000返2000）' }
    ];
    S.activityHeaders = [
      { id: 'ah_name', key: 'name', label: '姓名', type: 'text', required: true, builtin: true, locked: true },
      { id: 'ah_time', key: 'signupTime', label: '报名时间', type: 'datetime', required: true, builtin: true, locked: true, auto: true },
      { id: 'ah_plan', key: 'plan', label: '参与方式', type: 'select', required: true, builtin: true, locked: true, options: PLAN_OPTS },
      { id: 'ah_fee', key: 'fee', label: '活动费用', type: 'number', required: false, builtin: true, auto: 'plan' },
      { id: 'ah_voucher', key: 'voucher', label: '附件上传支付凭证', type: 'file', required: false, builtin: true },
      { id: 'ah_note', key: 'note', label: '活动备注说明', type: 'textarea', required: false, builtin: true }
    ];

    // 报工项 / 目标模板（后台可编辑，会员据此填报）
    S.reportItems = KPI_FIELDS.map(function (f) { return { key: f.k, name: f.n, unit: f.u }; });
    S.goalTemplates = [
      { key: 'intent', name: '新增意向客户', unit: '个' },
      { key: 'deal', name: '成交订单', unit: '单' },
      { key: 'newMember', name: '新增会员/渠道', unit: '个' },
      { key: 'calls', name: '电话拨打量', unit: '通' },
      { key: 'fans', name: '平台新增粉丝', unit: '人' }
    ];

    // 题库 v2（每门初级课 2 道选择题，绑定到第一节）
    var junior = S.courses.filter(function (c) { return c.cat === '初级'; });
    junior.forEach(function (c) {
      var ch = (c.chapterList && c.chapterList[0]) ? c.chapterList[0].id : '';
      S.questions.push({ id: nid('q'), courseId: c.id, chapterId: ch, type: 'choice',
        q: '关于' + c.name + '的核心目标，下列说法正确的是？',
        options: ['A. 提升专业服务能力', 'B. 减少客户沟通', 'C. 仅做表面合规', 'D. 不需要学习'], answer: 'A' });
      S.questions.push({ id: nid('q'), courseId: c.id, chapterId: ch, type: 'choice',
        q: '在' + c.name + '中，学员应当？',
        options: ['A. 敷衍了事', 'B. 按标准流程执行并留痕', 'C. 自行其是', 'D. 忽略考核'], answer: 'B' });
    });

    // 财务月度（演示）：平台销售额(sales) + 各项开支（房租/水电/人工/办公/佣金）
    var now = new Date();
    for (var i = 5; i >= 0; i--) {
      var dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var sales = 80 + Math.round(Math.random() * 60);
      var rent = 8 + Math.round(Math.random() * 6), util = 1 + Math.round(Math.random() * 3);
      var labor = 6 + Math.round(Math.random() * 8), office = 2 + Math.round(Math.random() * 4);
      var commissionExp = Math.round((sales - rent - util - labor - office) * 0.4);
      var exp = rent + util + labor + office + commissionExp;
      S.finMonths.push({ month: monthStr(dt), sales: sales, rent: rent, util: util, labor: labor, office: office, commissionExp: commissionExp,
        income: sales, expense: exp, profit: sales - exp,
        commissionPaid: Math.round((sales - exp) * 0.4), settle: Math.round((sales - exp) * 0.6) });
    }

    // 演示：一条待审核的会员自建名单，确保审核中心有内容可审
    var demoLead = S.leads[0];
    if (demoLead) {
      demoLead.status = 'pending_audit';
      S.audits.push({ id: nid('au'), type: '会员自建名单', refId: demoLead.id, status: 'pending', note: '会员自建示例：' + demoLead.company, time: tstr(daysAgo(1)) });
    }
    // 演示：初始操作日志，确保操作日志页有内容
    [['会员导入', '初始种子数据导入 ' + S.members.length + ' 位会员', '系统'],
     ['名单导入', '初始导入 ' + S.leads.length + ' 条企业名单', '系统'],
     ['系统初始化', '工作台 v2 部署完成', '系统']
    ].forEach(function (e) { S.logs.push({ id: nid('lg'), action: e[0], detail: e[1], who: e[2] || '', time: tstr(daysAgo(2)) }); });

    seedEngagement(S);
    return S;
  }

  // 生成可观测的学习 / 拓客样本数据，避免管理驾驶舱为空
  var SKILL_POOL = ['小规模代账', '一般纳税人代账', '汇算清缴', '税务筹划', '工商注册', '股权架构', '社保公积金', '税务稽查应对', '出口退税', '高新认定', '财务外包', '内账整理'];
  var CLIENT_POOL = ['餐饮门店', '建筑劳务', '电商网店', '医疗器械', '房产中介', '农业合作社', '广告传媒', '教育培训', '物流运输', '五金建材', '软件科技', '旅游民宿'];
  function seedEngagement(S) {
    var sampleMembers = S.members.slice(0, 300);
    var sampleCourses = S.courses.slice(0, 10);
    // 职业档案样例（会员风采展示用；会员可在手机端自行修改）
    S.members.slice(0, 200).forEach(function (m, i) {
      var yrs = 2 + (i % 16);
      var cnt = 8 + (i * 7) % 220;
      var sk = [SKILL_POOL[i % SKILL_POOL.length], SKILL_POOL[(i + 5) % SKILL_POOL.length], SKILL_POOL[(i + 9) % SKILL_POOL.length]];
      var ct = [CLIENT_POOL[i % CLIENT_POOL.length], CLIENT_POOL[(i + 4) % CLIENT_POOL.length]];
      m.expYears = yrs;
      m.accountsDone = cnt;
      m.skills = sk.join('、');
      m.clientTypes = ct.join('、');
      m.intro = '从事财税服务 ' + yrs + ' 年，累计服务企业客户 ' + cnt + ' 户，擅长' + sk[0] + '与' + sk[1] + '，服务过' + ct[0] + '、' + ct[1] + '等行业客户。';
      m.experience = (2026 - yrs) + '年 至今 · 财税服务从业\n主要负责：账务处理、纳税申报、税务筹划与客户日常财税咨询。';
      m.publicProfile = true;
    });
    // 学习进度：前 80 位会员
    sampleMembers.forEach(function (m, i) {
      var nc = 1 + (i % 3);
      for (var k = 0; k < nc; k++) {
        var c = sampleCourses[(i + k) % sampleCourses.length];
        var done = (i + k) % 4 === 0;
        S.progress.push({ id: 'lp_se' + i + '_' + k, memberId: m.id, courseId: c.id,
          seconds: done ? 1800 : 300 + (i * 60), done: done, examPass: done, examScore: done ? (85 + (i % 14)) : 0,
          times: 1 + (i % 5), examAttempts: {} });
      }
      // 每 9 位标记一位已完成初级培训（驾驶舱「完成初级」有数）
      if (i % 9 === 0) m.juniorDone = true;
    });

    // 名单派发 + 跟进（模拟总部「手动批量派单」的历史数据）
    // 注意：会员区域由本人登录后自选，种子里一律为空，所以这里不做区域配对；
    // 区域自动分配（autoDistribute）仍严格同区域，只是需要会员先选好区域。
    var FOLLOWS = ['called', 'wechat', 'talk', 'deep', 'intent', 'deal', 'invalid'];
    var NOTES = ['电话已接通，客户表示了解', '已加微信，发送了服务方案', '沟通了记账价格与流程', '约了下周上门详谈',
      '客户有意向，等老板拍板', '已签约，开始交接资料', '号码空号 / 客户明确拒绝'];
    var pool = S.leads.filter(function (l) { return !l.assignedTo; });
    // 约 35% 的名单已派出去，其余留在公海供后台分配 / 会员申请
    var quota = Math.floor(pool.length * 0.35);
    var cursor = 0;
    for (var mi = 0; mi < S.members.length && cursor < quota; mi++) {
      var m = S.members[mi];
      var nl = 1 + (mi % 3);
      for (var j = 0; j < nl && cursor < quota; j++) {
        var lead = pool[cursor++];
        if (!lead || lead.assignedTo) continue;
        lead.assignedTo = m.id;
        var si = (mi + j) % FOLLOWS.length;
        lead.status = FOLLOWS[si];
        S.follows.push({ id: 'f_se' + mi + '_' + j, leadId: lead.id, memberId: m.id,
          status: FOLLOWS[si], note: NOTES[si], time: tstr(daysAgo(j + 1)) });
      }
    }

    // 每日报工 + 目标设定：前 40 位会员（后台会员详情可查看）
    var GOAL_TPL = [{ k: 'intent', n: '新增意向客户' }, { k: 'orders', n: '成交订单数量' },
      { k: 'newWechat', n: '新增微信好友' }, { k: 'newMembers', n: '新增会员/渠道' }];
    S.members.slice(0, 120).forEach(function (m, i) {
      for (var d = 1; d <= 4; d++) {
        S.reports.push({
          id: 'r_se' + i + '_' + d, memberId: m.id, date: dstr(daysAgo(d)),
          content: '今日拜访 ' + (2 + (i + d) % 4) + ' 家企业，重点跟进' + CLIENT_POOL[(i + d) % CLIENT_POOL.length] + '客户，' +
            (d % 2 ? '已发送报价方案。' : '约定下次回访时间。'),
          kpi: {
            calls: 8 + (i + d) % 20, effective: 2 + (i + d) % 6, deep: (i + d) % 4,
            newWechat: 1 + (i + d) % 5, fans: (i * d) % 12, orders: (i + d) % 3, newMembers: (i + d) % 2
          },
          done: true
        });
      }
      var g = GOAL_TPL[i % GOAL_TPL.length];
      var target = 10 + (i % 5) * 10;
      S.goals.push({
        id: 'g_se' + i, memberId: m.id, period: ['month', 'quarter', 'year'][i % 3],
        type: g.k, content: g.n, target: target, progress: Math.min(target, (i * 3) % (target + 5)),
        done: false, locked: true, createdAt: tstr(daysAgo(10 + (i % 20)))
      });
    });
  }

  /* ---------------- 持久化 ----------------
   * 会员 2 万 + 企业名单 5 万，整体 JSON 化后远超 localStorage 的 5MB 配额。
   * 因此改为「种子 + 增量」：members / leads 每次从种子文件重建，
   * localStorage 只保存相对种子的差异（改过的字段、新增行、删除行）。
   */
  var S = null;
  var BIG = ['members', 'leads', 'follows', 'salary'];   // 走增量的大表（salary 历史数据也走种子+增量）
  var BASE = {};                    // 种子基线快照：{ members: {id: 原始对象}, leads: {...} }

  // 会员 / 名单对象都是扁平结构（值全是字符串·数字·布尔），浅拷贝即可，
  // 7 万条走 JSON 深拷贝会有近一秒的卡顿。
  function shallow(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function snapshot() {
    BASE = {};
    BIG.forEach(function (k) {
      var m = {};
      (S[k] || []).forEach(function (o) { m[o.id] = shallow(o); });
      BASE[k] = m;
    });
  }

  // 与基线逐字段比对，只取变化的部分
  function diffBig(k) {
    var base = BASE[k] || {}, upd = {}, add = [], del = [], seen = {};
    (S[k] || []).forEach(function (o) {
      seen[o.id] = 1;
      var b = base[o.id];
      if (!b) { add.push(o); return; }
      var d = null, f;
      for (f in o) {
        var a = o[f], c = b[f];
        if (a === c) continue;
        if (a && c && typeof a === 'object' && JSON.stringify(a) === JSON.stringify(c)) continue;
        (d = d || {})[f] = a;
      }
      for (f in b) { if (!(f in o)) { (d = d || {})[f] = undefined; } }
      if (d) upd[o.id] = d;
    });
    for (var id in base) { if (!seen[id]) del.push(id); }
    return { u: upd, a: add, d: del };
  }

  function applyBig(k, patch) {
    if (!patch) return;
    var byId = {};
    (S[k] || []).forEach(function (o) { byId[o.id] = o; });
    if (patch.d && patch.d.length) {
      var kill = {}; patch.d.forEach(function (id) { kill[id] = 1; });
      S[k] = S[k].filter(function (o) { return !kill[o.id]; });
    }
    for (var id in (patch.u || {})) {
      var t = byId[id]; if (!t) continue;
      var d = patch.u[id];
      for (var f in d) { if (d[f] === undefined) delete t[f]; else t[f] = d[f]; }
    }
    (patch.a || []).forEach(function (o) { if (!byId[o.id]) S[k].push(o); });
  }

  var quotaWarned = false;
  function save() {
    try {
      var slim = {}, k;
      for (k in S) { if (BIG.indexOf(k) < 0) slim[k] = S[k]; }
      slim._v = 5;   // 5: 工资表(salary)并入增量大表；旧 _v<=4 数据作废重建
      slim._patch = {};
      BIG.forEach(function (kk) { slim._patch[kk] = diffBig(kk); });
      w.localStorage.setItem(KEY, JSON.stringify(slim));
    } catch (e) {
      if (!quotaWarned) {
        quotaWarned = true;
        try { w.console && w.console.warn('本地存储写入失败（可能超出配额），本次改动仅保留在内存中：', e); } catch (e2) {}
      }
    }
    if (ONLINE) { try { cacheShared(); pushShared(); } catch (e) {} }
  }

  function load() {
    S = buildSeed();       // 先按种子重建（含 members / leads 全量）
    snapshot();            // 记录基线，用于后续 diff
    var raw = null;
    try { raw = w.localStorage.getItem(KEY); } catch (e) {}
    if (!raw) { save(); rebind(); return; }
    var saved = null;
    try { saved = JSON.parse(raw); } catch (e) {}
    if (!saved || saved._v !== 5) {   // 旧版格式（无工资增量表），直接丢弃重建
      try { w.localStorage.removeItem(KEY); } catch (e) {}
      save(); rebind(); return;
    }
    for (var k in saved) {
      if (k === '_v' || k === '_patch') continue;
      S[k] = saved[k];
    }
    BIG.forEach(function (kk) { applyBig(kk, saved._patch && saved._patch[kk]); });
    rebind();
  }

  function reset() {
    try { w.localStorage.removeItem(KEY); } catch (e) {}
    S = buildSeed(); snapshot(); save(); rebind();
  }

  // S 是整体重建的（不是原地改），要把新引用同步回已导出的 DB.S
  function rebind() { if (w.DB) w.DB.S = S; }

  /* ---------------- 级别 / 课程 ---------------- */
  function gradeOf(level) { return S.grades.filter(function (g) { return g.name === level; })[0] || null; }
  function levelName(level) { var g = gradeOf(level); return g ? g.name : (level || '—'); }
  function requiredCourses(level) {
    var g = gradeOf(level); if (!g) return [];
    if (g.courses === 'none') return [];
    if (g.courses === 'all') return S.courses.map(function (c) { return c.id; });
    if (g.courses === 'junior_mid') return S.courses.filter(function (c) { return c.cat === '初级' || c.cat === '中级'; }).map(function (c) { return c.id; });
    // junior
    return S.courses.filter(function (c) { return c.cat === '初级'; }).map(function (c) { return c.id; });
  }
  function course(id) { return S.courses.filter(function (c) { return c.id === id; })[0] || null; }
  function coursesFor(level) { var ids = requiredCourses(level); return S.courses.filter(function (c) { return ids.indexOf(c.id) >= 0; }); }
  function questionsOf(courseId) { return S.questions.filter(function (q) { return q.courseId === courseId; }); }

  /* ---------------- 会员 ---------------- */
  function member(id) { return S.members.filter(function (m) { return m.id === id; })[0] || null; }
  function user(id) { return member(id); }
  function userByUid(uid) { return S.members.filter(function (m) { return m.uid === uid || m.id === uid || m.phone === uid; })[0] || null; }
  function members() { return S.members; }
  function activeMembers() { return S.members.filter(function (m) { return m.status !== 'disabled'; }); }
  function disabledCount() { return S.members.filter(function (m) { return m.status === 'disabled'; }).length; }
  function referrerOf(m) { if (!m || !m.refId) return null; return S.members.filter(function (x) { return x.uid === m.refId; })[0] || null; }
  function subordinates(m) { if (!m) return []; return S.members.filter(function (x) { return x.refId === m.uid; }); }
  function scopeMembers(u) {
    if (!u) return [];
    if (u.role === 'admin' || u.role === 'finance') return S.members;
    if (u.role === 'org') return S.members.filter(function (m) { return m.orgId === u.id || m.region === u.region || m.id === u.id; });
    return S.members.filter(function (m) { return m.id === u.id; });
  }
  function setMemberStatus(id, status) {
    var m = member(id); if (!m) return; m.status = status;
    log(status === 'disabled' ? '禁用会员' : '启用会员', m.name + '(' + m.uid + ')', id);
    save();
  }
  /* ------- 表头别名：支持直接导入原始中文表头的 Excel/CSV ------- */
  var MEMBER_ALIAS = {
    uid: ['uid', '会员ID', '会员id', '平台ID', '平台id', '会员编号', '编号'],
    name: ['name', '会员昵称', '会员姓名', '会员名称', '姓名', '昵称'],
    phone: ['phone', '会员手机号', '手机号码', '手机号', '联系电话', '电话'],
    level: ['level', '会员等级', '会员级别', '等级', '级别', '角色'],
    refId: ['refId', '推荐人ID', '推荐人id', '推荐人编号'],
    refName: ['refName', '推荐人昵称', '推荐人姓名', '推荐人'],
    refPhone: ['refPhone', '推荐人手机号', '推荐人电话'],
    subs: ['subs', '下级会员人数', '下级人数'],
    commission: ['commission', '累计佣金'],
    paid: ['paid', '已打款佣金'],
    blacklist: ['blacklist', '黑名单'],
    region: ['region', '所属区域', '所在城市', '所属城市', '区域', '城市'],
    joinedAt: ['joinedAt', '加入时间', '注册时间'],
    wechat: ['wechat', '微信号', '微信', 'wx'],
    idCard: ['idCard', '身份证号', '证件号', '身份证'],
    bank: ['bank', '银行卡号', '银行卡', '收款账号'],
    bankName: ['bankName', '开户行', '银行名称', '所属银行'],
    remark: ['remark', '备注', '备注信息', '说明']
  };
  var LEAD_ALIAS = {
    company: ['company', '公司名称', '企业名称', '客户名称', '公司', '企业'],
    creditCode: ['creditCode', '统一社会信用代码', '社会信用代码', '信用代码', '纳税人识别号', '税号'],
    city: ['city', '所属城市', '所在城市', '所在地区', '城市', '地区', '区域'],
    legalPerson: ['legalPerson', '法定代表人', '法人代表', '法人'],
    capital: ['capital', '注册资本', '注册资金'],
    regStatus: ['regStatus', '登记状态', '经营状态', '企业状态'],
    regDate: ['regDate', '成立日期', '注册日期', '成立时间'],
    phone: ['phone', '有效手机号', '手机号码', '手机号', '联系电话', '联系方式', '电话']
  };
  // 汇总所有精确别名，用于模糊匹配时排除“别人的字段”
  function allAlias(alias) {
    var s = {}; Object.keys(alias).forEach(function (k) { alias[k].forEach(function (a) { s[a] = k; }); }); return s;
  }
  var MEMBER_ALIAS_ALL = allAlias(MEMBER_ALIAS), LEAD_ALIAS_ALL = allAlias(LEAD_ALIAS);
  function pick(row, alias, aliasAll, key, fm) {
    if (fm && fm[key] && row[fm[key]] != null && row[fm[key]] !== '') return row[fm[key]];
    var list = alias[key] || [key], i, j, m;
    // 1) 精确表头命中
    for (i = 0; i < list.length; i++) { if (row[list[i]] != null && row[list[i]] !== '') return row[list[i]]; }
    // 2) 模糊包含（排除已归属其它字段的表头，避免「推荐人手机号」被当成「手机号」）
    var ks = Object.keys(row);
    for (j = 0; j < ks.length; j++) {
      var kk = String(ks[j]).replace(/\s/g, '');
      if (aliasAll[kk] && aliasAll[kk] !== key) continue;
      for (m = 0; m < list.length; m++) {
        if (kk.indexOf(list[m]) >= 0 && row[ks[j]] !== '' && row[ks[j]] != null) return row[ks[j]];
      }
    }
    return '';
  }
  function pickM(r, k, fm) { return pick(r, MEMBER_ALIAS, MEMBER_ALIAS_ALL, k, fm); }
  function pickL(r, k, fm) { return pick(r, LEAD_ALIAS, LEAD_ALIAS_ALL, k, fm); }
  function str(v) { return v == null ? '' : String(v).trim(); }

  function importMembers(rows, fieldMap) {
    var added = 0, skip = 0, updated = 0, fm = fieldMap || {};
    rows.forEach(function (r) {
      var uid = str(pickM(r, 'uid', fm));
      var phone = str(pickM(r, 'phone', fm));
      if (!uid) uid = phone;                       // 没有平台ID时用手机号兜底
      if (!uid) return;
      var lv = str(pickM(r, 'level', fm)) || '一星';
      if (!gradeOf(lv)) lv = '一星';                // 「默认等级」等非法值统一落到一星
      var exist = S.members.filter(function (m) { return m.uid === uid; })[0];
      if (exist) {                                  // 已存在则做增量更新（等级/推荐人可被后台改写）
        exist.level = lv;
        exist.role = (lv === '城市财税赋能中心' || lv === '城市财税赋能中心主理人') ? 'org' : 'member';
        var rn = str(pickM(r, 'refId', fm)); if (rn) exist.refId = rn;
        var rg = str(pickM(r, 'region', fm)); if (rg) exist.region = rg;
        skip++; updated++; return;
      }
      S.members.push({
        id: 'm_' + uid, uid: uid, name: (str(pickM(r, 'name', fm)) || ('会员' + uid)).slice(0, 30),
        phone: phone, level: lv,
        role: (lv === '城市财税赋能中心' || lv === '城市财税赋能中心主理人') ? 'org' : 'member',
        refId: str(pickM(r, 'refId', fm)),
        refName: str(pickM(r, 'refName', fm)).slice(0, 30),
        refPhone: str(pickM(r, 'refPhone', fm)),
        subs: parseInt(pickM(r, 'subs', fm) || 0, 10) || 0,
        commission: parseFloat(pickM(r, 'commission', fm) || 0) || 0,
        paid: parseFloat(pickM(r, 'paid', fm) || 0) || 0,
        blacklist: str(pickM(r, 'blacklist', fm)) === '是',
        status: 'normal', password: '888888', region: str(pickM(r, 'region', fm)),
        joinedAt: str(pickM(r, 'joinedAt', fm)) || dstr(new Date()), orgId: '', companyId: '',
        wechat: str(pickM(r, 'wechat', fm)), idCard: str(pickM(r, 'idCard', fm)),
        bank: str(pickM(r, 'bank', fm)), bankName: str(pickM(r, 'bankName', fm)), remark: str(pickM(r, 'remark', fm))
      });
      added++;
    });
    log('导入会员', '新增 ' + added + ' 条，已存在 ' + skip + ' 条（其中更新 ' + updated + ' 条）');
    save();
    return { added: added, skip: skip, updated: updated };
  }

  /* ---------------- 学习进度 / 佣金 ---------------- */
  function learnRec(memberId, courseId) {
    return S.progress.filter(function (p) { return p.memberId === memberId && p.courseId === courseId; })[0] || null;
  }
  function setProgress(memberId, courseId, seconds, done, examPass) {
    var p = learnRec(memberId, courseId);
    if (!p) { p = { id: nid('lp'), memberId: memberId, courseId: courseId, seconds: 0, done: false, examPass: false, examScore: 0, times: 0, examAttempts: {} }; S.progress.push(p); }
    if (seconds != null) p.seconds = seconds;
    if (done != null) p.done = done;
    if (examPass != null) p.examPass = examPass;
    save();
    if (done && examPass) checkJuniorComplete(memberId);
  }
  function learnSummary(memberId) {
    var req = requiredCourses(memberOf(memberId) ? memberOf(memberId).level : '');
    var total = req.length, done = 0, sec = 0, allMin = 0;
    req.forEach(function (cid) {
      var p = learnRec(memberId, cid); var c = course(cid);
      if (c) allMin += (c.minutes || 0);
      if (p) { sec += p.seconds || 0; if (p.done && p.examPass) done++; }
    });
    return { total: total, done: done, seconds: sec, allMin: allMin, pct: total ? Math.round(done / total * 100) : 100 };
  }
  function memberOf(id) { return member(id); }
  function checkJuniorComplete(memberId) {
    var m = member(memberId); if (!m) return;
    var junior = S.courses.filter(function (c) { return c.cat === '初级'; }).map(function (c) { return c.id; });
    var allDone = junior.every(function (cid) { var p = learnRec(memberId, cid); return p && p.done && p.examPass; });
    if (!allDone) return;
    if (m.juniorDone) return;
    m.juniorDone = true;
    if (S.commissionRule.autoUnlock) {
      var ref = referrerOf(m);
      if (ref) {
        var exist = S.commissions.filter(function (c) { return c.fromMemberId === m.id && c.type === '初级推荐佣金'; })[0];
        if (!exist) {
          S.commissions.push({ id: nid('cm'), memberId: ref.id, fromMemberId: m.id, fromName: m.name,
            type: '初级推荐佣金', amount: S.commissionRule.juniorAmount, status: 'settleable', createdAt: tstr(new Date()) });
          log('佣金解锁', '会员 ' + m.name + ' 完成初级培训，推荐人 ' + ref.name + ' 获得可结算佣金 ¥' + S.commissionRule.juniorAmount);
        }
      }
    }
    save();
  }
  function commissionsOf(memberId) { return S.commissions.filter(function (c) { return c.memberId === memberId; }); }
  function commissionSum(memberId, status) {
    return commissionsOf(memberId).filter(function (c) { return !status || c.status === status; })
      .reduce(function (s, c) { return s + (c.amount || 0); }, 0);
  }
  function refreshCommission() { S.members.forEach(function (m) { if (!m.juniorDone) checkJuniorComplete(m.id); }); save(); }

  /* ---------------- 企业名单 ---------------- */
  function lead(id) { return S.leads.filter(function (l) { return l.id === id; })[0] || null; }
  function leadsOf(memberId) { return S.leads.filter(function (l) { return l.assignedTo === memberId; }); }
  function unassignedLeads() { return S.leads.filter(function (l) { return !l.assignedTo; }); }
  function splitPhones(s) {
    if (!s) return [];
    return String(s).split(/[，,、/;；\s]+/).map(function (p) { return p.replace(/\D/g, ''); }).filter(function (p) { return p.length >= 7; });
  }
  function importLeads(rows, fieldMap, opts) {
    var fm = fieldMap || {}, added = 0, skip = 0, bad = 0, dupSet = {};
    S.leads.forEach(function (l) { dupSet[l.creditCode + '|' + l.phone] = 1; });
    (opts && opts.existing || []).forEach(function (k) { dupSet[k] = 1; });
    rows.forEach(function (r) {
      var company = str(pickL(r, 'company', fm));
      var credit = str(pickL(r, 'creditCode', fm));
      if (!company) { bad++; return; }
      if (!credit) credit = 'NC_' + company;        // 无信用代码时以公司名做去重键
      var city = str(pickL(r, 'city', fm)) || '未分类';
      var phones = splitPhones(pickL(r, 'phone', fm));
      if (!phones.length) phones = [''];
      // 一个单元格里的多个手机号 → 拆成多条独立名单
      phones.forEach(function (ph) {
        var key = credit + '|' + ph;
        if (dupSet[key]) { skip++; return; }
        dupSet[key] = 1;
        S.leads.push({ id: nid('L'), company: company.slice(0, 60), creditCode: credit, city: city,
          legalPerson: str(pickL(r, 'legalPerson', fm)).slice(0, 20),
          capital: str(pickL(r, 'capital', fm)).slice(0, 30),
          regStatus: str(pickL(r, 'regStatus', fm)).slice(0, 10),
          regDate: str(pickL(r, 'regDate', fm)).slice(0, 10),
          phone: ph, assignedTo: '', status: 'new', createdAt: dstr(new Date()),
          importedFrom: (opts && opts.src) || '后台导入', ownerNote: '', addedBy: (opts && opts.by) || '' });
        added++;
      });
    });
    log('导入企业名单', '新增 ' + added + ' 条，跳过重复 ' + skip + ' 条，无效 ' + bad + ' 条');
    save();
    return { added: added, skip: skip, dup: skip, bad: bad };
  }
  function assignLead(leadId, memberId) {
    var l = lead(leadId); if (!l) return false;
    l.assignedTo = memberId || '';
    if (memberId) log('分配名单', l.company + ' → ' + (member(memberId) ? member(memberId).name : memberId));
    save(); return true;
  }
  /**
   * 名单分配
   * autoDistribute()                → 全量智能分配（按规则给所有会员补足）
   * autoDistribute(memberId, n, region) → 定向分配：给指定会员追加 n 条（默认按其区域）
   */
  function autoDistribute(memberId, n, region) {
    var rules = S.distRules;

    if (memberId) {
      var m = member(memberId); if (!m) return 0;
      var g = gradeOf(m.level);
      var want = (n != null && n !== '') ? (parseInt(n, 10) || 0)
        : ((g && g.dailyLead) || rules.perMember || 10);
      if (want <= 0) return 0;
      var city = region || (rules.regionMatch ? m.region : '');
      var pool = unassignedLeads().filter(function (l) { return !city || l.city === city; });
      if (!pool.length && city && rules.fallbackAll) pool = unassignedLeads();
      var got = 0;
      for (var k = 0; k < pool.length && got < want; k++) { assignLead(pool[k].id, memberId); got++; }
      log('定向分配名单', m.name + '(' + m.uid + ') 获得 ' + got + ' 条' + (city ? '「' + city + '」' : '') + '名单');
      save();
      return got;
    }

    if (!rules.enabled) return 0;
    var assigned = 0;
    activeMembers().forEach(function (mm) {
      if (rules.regionMatch && !mm.region) return;
      var owned = leadsOf(mm.id).length;
      var cap = rules.perMember;
      if (owned >= cap) return;
      var pl = unassignedLeads().filter(function (l) { return !rules.regionMatch || l.city === mm.region; });
      for (var i = 0; i < pl.length && owned < cap; i++) {
        assignLead(pl[i].id, mm.id); owned++; assigned++;
      }
    });
    log('智能分配名单', '本次自动分配 ' + assigned + ' 条');
    save();
    return assigned;
  }

  /** 目标达成 → 系统自动追加下一批名单 */
  function autoDistributeOnGoal(memberId) {
    if (!S.distRules.enabled || !S.distRules.onGoalReached) return 0;
    var m = member(memberId); if (!m) return 0;
    var gs = goalsOf(memberId).filter(function (x) { return x.period === 'month'; });
    var reached = gs.length ? gs.every(function (x) { return (x.progress || 0) >= (x.target || 0); }) : false;
    if (!reached) return 0;
    var g = gradeOf(m.level);
    var got = autoDistribute(memberId, (g && g.dailyLead) || S.distRules.perMember);
    if (got) notify(memberId, '目标达成奖励', '恭喜完成本期目标，系统已为你追加 ' + got + ' 条' + (m.region || '') + '名单');
    return got;
  }
  function addLeadByMember(memberId, data) {
    var phones = splitPhones(data.phone); if (!phones.length) phones = [data.phone || ''];
    var ids = [], n = 0;
    phones.forEach(function (ph) {
      var id = nid('L');
      S.leads.push({ id: id, company: (data.company || '').toString().slice(0, 60), creditCode: (data.creditCode || nid('cc')).toString(),
        city: (data.city || '').toString().trim() || '海口市', legalPerson: (data.legalPerson || '').toString().slice(0, 20),
        capital: '', regStatus: '', regDate: '', phone: ph, assignedTo: memberId, status: 'new',
        createdAt: dstr(new Date()), importedFrom: '会员自建', ownerNote: (data.ownerNote || ''), addedBy: memberId,
        memberAdded: true });
      ids.push(id); n++;
    });
    log('会员新增名单', (data.company || '') + ' +' + n + '（会员新增，待后台录用/删除）');
    save();
    return n;
  }
  function setLeadStatus(leadId, status, memberId, note) {
    var l = lead(leadId); if (!l) return;
    l.status = status;
    S.follows.push({ id: nid('f'), leadId: leadId, memberId: memberId || l.assignedTo, status: status, note: note || '', time: tstr(new Date()) });
    save();
  }

  /* ---------------- 名单分配申请（会员自选区域） ---------------- */
  function requestLead(memberId, region, count) {
    var id = nid('lr');
    S.leadRequests.push({ id: id, memberId: memberId, region: region, count: count || 0, status: 'pending', time: tstr(new Date()) });
    audit('名单分配申请', id, 'pending', '会员 ' + memberId + ' 申请「' + region + '」区域名单' + (count ? (' ×' + count) : ''));
    save();
    return id;
  }
  function approveLeadRequest(id, ok) {
    var r = S.leadRequests.filter(function (x) { return x.id === id; })[0]; if (!r) return { ok: false, msg: '申请不存在' };
    r.status = ok ? 'ok' : 'reject';
    var msg = '';
    if (ok) {
      var m = member(r.memberId);
      var pool = unassignedLeads().filter(function (l) { return l.city === r.region; });
      if (!pool.length) { msg = '「' + r.region + '」区域暂无可分配名单，请提示会员更换其他区域'; log('名单分配申请', msg); save(); return { ok: false, msg: msg }; }
      var g = gradeOf(m.level);
      var want = (g && g.dailyLead) || S.distRules.perMember;
      if (r.count && r.count > 0) want = Math.min(want, r.count); // 会员申请了具体数量则按数量封顶
      var got = autoDistribute(r.memberId, want, r.region);
      msg = got ? ('已为会员分配「' + r.region + '」名单 ' + got + ' 条') : '该区域暂无可分配名单';
      notify(r.memberId, '名单申请通过', msg);
    } else { msg = '已拒绝「' + r.region + '」名单申请'; }
    log(ok ? '通过名单申请' : '拒绝名单申请', r.region + ' · ' + msg);
    save();
    return { ok: ok, msg: msg };
  }

  /* ---------------- 学习次数 / 考核每日限次 ---------------- */
  function studySession(memberId, courseId, seconds) {
    var p = learnRec(memberId, courseId);
    if (!p) { p = { id: nid('lp'), memberId: memberId, courseId: courseId, seconds: 0, done: false, examPass: false, examScore: 0, times: 0, examAttempts: {} }; S.progress.push(p); }
    p.seconds = (p.seconds || 0) + (seconds || 0);
    p.times = (p.times || 0) + 1;
    save();
  }
  function examAttempt(memberId, courseId, qid) {
    var p = learnRec(memberId, courseId);
    if (!p) { p = { id: nid('lp'), memberId: memberId, courseId: courseId, seconds: 0, done: false, examPass: false, examScore: 0, times: 0, examAttempts: {} }; S.progress.push(p); }
    if (!p.examAttempts) p.examAttempts = {};
    var today = dstr(new Date()), rec = p.examAttempts[qid];
    if (!rec || rec.date !== today) { rec = p.examAttempts[qid] = { date: today, count: 0 }; }
    if (rec.count >= 3) return { ok: false, left: 0 };
    rec.count++; save();
    return { ok: true, left: 3 - rec.count };
  }

  /* ---------------- 课程学习统计（驾驶舱） ---------------- */
  function courseStats(courseId) {
    var ps = S.progress.filter(function (p) { return p.courseId === courseId; });
    var learners = ps.filter(function (p) { return (p.seconds || 0) > 0 || p.done; }).length;
    var times = ps.reduce(function (s, p) { return s + (p.times || 0); }, 0);
    var completed = ps.filter(function (p) { return p.done && p.examPass; }).length;
    var names = ps.filter(function (p) { return (p.seconds || 0) > 0 || p.done; })
      .map(function (p) { var mm = member(p.memberId); return mm ? mm.name : p.memberId; });
    return { learners: learners, times: times, completed: completed, names: names };
  }
  function leadStats() {
    var total = S.leads.length, distributed = S.leads.filter(function (l) { return l.assignedTo; }).length;
    var memberAdded = S.leads.filter(function (l) { return l.memberAdded; }).length;
    var byStatus = {};
    S.leads.forEach(function (l) { byStatus[l.status] = (byStatus[l.status] || 0) + 1; });
    return { total: total, distributed: distributed, memberAdded: memberAdded, unassigned: total - distributed, byStatus: byStatus };
  }

  /* ---------------- 题库编辑 / 自动出题 ---------------- */
  function addQuestion(q) { q.id = nid('q'); S.questions.push(q); save(); }
  function updateQuestion(id, patch) { var q = S.questions.filter(function (x) { return x.id === id; })[0]; if (!q) return; Object.assign(q, patch); save(); }
  function deleteQuestion(id) { S.questions = S.questions.filter(function (x) { return x.id !== id; }); save(); }
  function questionsOfChapter(courseId, chapterId) { return S.questions.filter(function (q) { return q.courseId === courseId && (q.chapterId || '') === (chapterId || ''); }); }
  // 自动出题：全部为选择题（驾驶证式），依据内容生成 3-10 题
  function autoGenQuestions(text) {
    var sentences = String(text || '').split(/[。！？\.\n]/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length >= 8; });
    if (sentences.length < 2) return [];
    var n = Math.min(10, Math.max(3, Math.round(sentences.length / 2)));
    var qs = [];
    for (var i = 0; i < n; i++) {
      var correct = sentences[i % sentences.length];
      var wrongs = sentences.filter(function (s) { return s !== correct; }).slice(0, 3);
      while (wrongs.length < 3) wrongs.push('以上说法均不正确');
      var opts = [correct].concat(wrongs);
      opts.sort(function () { return Math.random() - 0.5; });
      var ai = opts.indexOf(correct);
      qs.push({ type: 'choice', q: '根据提供的内容，下列说法正确的是？',
        options: opts.map(function (o, j) { return String.fromCharCode(65 + j) + '. ' + o; }),
        answer: String.fromCharCode(65 + ai) });
    }
    return qs;
  }

  /* ---------------- 管理员 / 财务 ---------------- */
  function getAdmin(uid) { return S.admins.filter(function (a) { return a.uid === uid; })[0] || null; }
  function updateAdmin(id, patch) {
    var a = S.admins.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    if (patch.name != null) a.name = patch.name;
    if (patch.password != null) a.password = patch.password;
    log('修改管理员资料', a.uid);
    save();
  }

  /* ---------------- 财务：月开支 / 账户 / 员工 ---------------- */
  function setMonthFinance(month, data) {
    var fm = S.finMonths.filter(function (x) { return x.month === month; })[0];
    if (!fm) { fm = { month: month }; S.finMonths.push(fm); }
    ['sales', 'rent', 'util', 'labor', 'office', 'commissionExp'].forEach(function (k) { fm[k] = Number(data[k]) || 0; });
    fm.income = fm.sales;
    fm.expense = fm.rent + fm.util + fm.labor + fm.office + fm.commissionExp;
    fm.profit = fm.income - fm.expense;
    if (data.commissionPaid != null) fm.commissionPaid = Number(data.commissionPaid) || 0;
    if (data.settle != null) fm.settle = Number(data.settle) || 0;
    save();
  }
  function upsertAccount(id, name, balance) {
    var a = S.accounts.filter(function (x) { return x.id === id; })[0];
    if (a) { a.name = name; a.balance = Number(balance) || 0; }
    else S.accounts.push({ id: id || nid('ac'), name: name, balance: Number(balance) || 0 });
    save();
  }
  function addEmployee(emp) { emp.id = nid('em'); S.employees.push(emp); save(); }
  function delEmployee(id) { S.employees = S.employees.filter(function (x) { return x.id !== id; }); save(); }

  /* ---------------- 工资模块（历史种子 + 四步流程） ----------------
     状态机：pending(待审核) → approved(已审核) → paid(已发放) → confirmed(已确认发放)
     历史种子数据 status='archived'（已发放确认，仅用于统计/查看）
  */
  var SAL_STATUS = [
    { k: 'pending', n: '待审核', c: 'wrn' },
    { k: 'approved', n: '已审核·待财务发放', c: 'inf' },
    { k: 'paid', n: '已发放', c: 'pri' },
    { k: 'confirmed', n: '已结算', c: 'suc' },
    { k: 'archived', n: '历史已发', c: 'gray' }
  ];
  function salStatusName(k) { var f = SAL_STATUS.filter(function (x) { return x.k === k; })[0]; return f ? f.n : k; }
  function salStatusColor(k) { var f = SAL_STATUS.filter(function (x) { return x.k === k; })[0]; return f ? f.c : 'gray'; }

  // 计算应发合计与实发（录入时自动算）
  function calcSalary(r) {
    r.base = Number(r.base) || 0; r.perf = Number(r.perf) || 0; r.att = Number(r.att) || 0;
    r.social = Number(r.social) || 0; r.meal = Number(r.meal) || 0;
    r.dedAbs = Number(r.dedAbs) || 0; r.dedOth = Number(r.dedOth) || 0;
    r.gross = r.base + r.perf + r.att + r.meal; // 社保作为应发项计入合计（与模板一致）
    r.net = r.gross - r.dedAbs - r.dedOth;
    return r;
  }
  // 财务：新增某年某月的整批工资（rows: [{name,position,base,perf,att,social,meal,dedAbs,dedOth}]）
  function addSalaryBatch(year, month, rows, by) {
    // 若同月已存在（无论状态），先清掉再建，避免重复
    S.salary = S.salary.filter(function (x) { return !(x.year === year && x.month === month); });
    var now = tstr(new Date());
    rows.forEach(function (rw, i) {
      var r = calcSalary({ id: nid('sal'), year: year, month: month, name: rw.name, position: rw.position || '',
        base: rw.base, perf: rw.perf, att: rw.att, social: rw.social, meal: rw.meal,
        dedAbs: rw.dedAbs, dedOth: rw.dedOth, payDate: rw.payDate || now.slice(0, 10), src: '系统录入', status: 'pending',
        createdBy: by || '', createdAt: now });
      S.salary.push(r);
    });
    log('新增工资月份', year + '-' + d0(month) + ' 共 ' + rows.length + ' 人（待审核）', by || '');
    save();
  }
  // 推进某年某月整批工资状态（同月所有记录统一流转）
  // 新流程：财务录入→pending → 管理员审核通过→approved(待财务发放) → 财务确认已发放→paid(已发放) → 管理员确认入账→confirmed(已结算，计入工资表)
  function setSalaryMonthStatus(year, month, status, by) {
    var cnt = 0;
    S.salary.forEach(function (x) {
      if (x.year === year && x.month === month) {
        x.status = status;
        if (status === 'approved') { x.approvedBy = by || ''; x.approvedAt = tstr(new Date()); }
        if (status === 'paid') { x.paidBy = by || ''; x.paidAt = tstr(new Date()); }
        if (status === 'confirmed') { x.settledBy = by || ''; x.settledAt = tstr(new Date()); }
        cnt++;
      }
    });
    log('工资状态变更', year + '-' + d0(month) + ' → ' + salStatusName(status) + '（' + cnt + ' 人）', by || '');
    save();
  }
  function salaryOfMonth(year, month) { return S.salary.filter(function (x) { return x.year === year && x.month === month; }); }
  // 按状态聚合月份维度（用于审核中心）
  function salaryMonthGroups() {
    var map = {};
    S.salary.forEach(function (x) {
      var key = x.year + '-' + d0(x.month);
      if (!map[key]) map[key] = { year: x.year, month: x.month, key: key, status: x.status, count: 0, net: 0, names: [] };
      map[key].count++; map[key].net += (x.net || 0);
      map[key].status = x.status;
      if (map[key].names.indexOf(x.name) < 0) map[key].names.push(x.name);
    });
    return Object.keys(map).sort().reverse().map(function (k) { return map[k]; });
  }
  // 统计：年度实发合计 / 总实发 / 在职人数 / 月度趋势
  function salaryStats() {
    var byYear = {}, total = 0, people = {};
    S.salary.forEach(function (x) {
      byYear[x.year] = (byYear[x.year] || 0) + (x.net || 0);
      total += (x.net || 0);
      people[x.name] = true;
    });
    var months = {};
    S.salary.forEach(function (x) { var k = x.year + '-' + d0(x.month); months[k] = (months[k] || 0) + (x.net || 0); });
    var trend = Object.keys(months).sort().map(function (k) { return { k: k, v: Math.round(months[k]) }; });
    return { byYear: byYear, total: total, people: Object.keys(people).length, trend: trend, records: S.salary.length };
  }

  /* ---------------- 活动报名 ---------------- */
  var PLAN_FEE = { plan1: 0, plan2: 6000, plan3: 2000 };
  function planFee(k) { return PLAN_FEE[k] || 0; }
  function planLabel(k) {
    var h = (S.activityHeaders || []).filter(function (x) { return x.key === 'plan'; })[0];
    if (h && h.options) { var o = h.options.filter(function (x) { return x.v === k; })[0]; if (o) return o.t; }
    return k;
  }
  function activities() { return S.activities; }
  function activity(id) { return S.activities.filter(function (a) { return a.id === id; })[0] || null; }
  function updateActivity(id, patch, by) {
    var a = activity(id); if (!a) return;
    for (var k in patch) { if (k === 'id') continue; a[k] = patch[k]; }
    log('编辑活动', a.title || '', by || '');
    save();
  }
  function activityHeaders() { return S.activityHeaders; }
  function getHeader(id) { return S.activityHeaders.filter(function (h) { return h.id === id; })[0] || null; }
  function addHeader(o) { o.id = o.id || nid('ah'); S.activityHeaders.push(o); save(); return o; }
  function updateHeader(id, patch) {
    var h = getHeader(id); if (!h) return;
    for (var k in patch) { if (k === 'id') continue; h[k] = patch[k]; }
    save();
  }
  function delHeader(id) {
    var h = getHeader(id); if (!h || h.builtin) return false;
    S.activityHeaders = S.activityHeaders.filter(function (x) { return x.id !== id; });
    save(); return true;
  }
  function moveHeader(id, dir) {
    var arr = S.activityHeaders, i = arr.map(function (x) { return x.id; }).indexOf(id);
    if (i < 0) return;
    var j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= arr.length) return;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t; save();
  }
  function registrationsOf(activityId) { return S.registrations.filter(function (r) { return r.activityId === activityId; }); }
  function registration(id) { return S.registrations.filter(function (r) { return r.id === id; })[0] || null; }
  // 同一人同一活动只保留一条（可修改重报）
  function signUp(activityId, memberId, data) {
    S.registrations = S.registrations.filter(function (r) { return !(r.activityId === activityId && r.memberId === memberId); });
    var rec = { id: nid('reg'), activityId: activityId, memberId: memberId, createdAt: tstr(new Date()), data: data };
    S.registrations.push(rec);
    var a = activity(activityId);
    log('活动报名', (a ? a.title : '') + ' · ' + (data.name || ''), memberId || '');
    save();
    if (ONLINE) API.addReg(rec);   // 单条追加到后端，避免整表覆盖丢数据
    return rec;
  }
  function delRegistration(id) { S.registrations = S.registrations.filter(function (r) { return r.id !== id; }); save(); }

  /* ---------------- 报工考核评价 ---------------- */
  function evalReport(reportId, score, comment) {
    S.evaluations[reportId] = { score: Number(score) || 0, comment: comment || '', time: tstr(new Date()) };
    save();
  }

  /* ---------------- PK 竞赛 ---------------- */
  function pkById(id) { return S.pks.filter(function (p) { return p.id === id; })[0] || null; }
  function confirmPk(id, ok) {
    var p = pkById(id); if (!p) return;
    p.status = ok ? 'active' : 'rejected';
    log(ok ? 'PK 应战' : 'PK 拒战', p.title || '');
    save();
  }

  /* ---------------- 运营中心 / 子公司 ---------------- */
  function org(id) { return S.orgs.filter(function (o) { return o.id === id; })[0] || null; }
  function company(id) { return S.companies.filter(function (c) { return c.id === id; })[0] || null; }
  function statsCompany(id) {
    var c = company(id); if (!c) return null;
    return { deals: Math.round(Math.random() * 40) + 10, members: Math.round(Math.random() * 30) + 10,
      commission: Math.round(Math.random() * 50000) + 10000, reportRate: 80 + Math.round(Math.random() * 18) };
  }

  /* ---------------- 报工 / 目标 / PK ---------------- */
  function reportsOf(memberId) { return S.reports.filter(function (r) { return r.memberId === memberId; }); }
  function reportRate(memberId) { var rs = reportsOf(memberId); if (!rs.length) return 0; var ok = rs.filter(function (r) { return r.done; }).length; return Math.round(ok / rs.length * 100); }
  function kpiFor(memberId, period) { var rs = reportsOf(memberId); var k = {}; KPI_FIELDS.forEach(function (f) { k[f.k] = 0; }); rs.forEach(function (r) { KPI_FIELDS.forEach(function (f) { k[f.k] += (r.kpi && r.kpi[f.k]) || 0; }); }); return k; }
  function goalsOf(memberId) { return S.goals.filter(function (g) { return g.memberId === memberId; }); }
  function goal(id) { return S.goals.filter(function (g) { return g.id === id; })[0] || null; }
  function plansOf(memberId) { return S.plans.filter(function (p) { return p.memberId === memberId; }); }
  function pksOf(memberId) { return S.pks.filter(function (p) { return p.aId === memberId || p.bId === memberId; }); }

  /* ---------------- 会员职业档案（会员手机端自助录入） ---------------- */
  var PROFILE_FIELDS = ['phone', 'region', 'wechat', 'idCard', 'bank', 'bankName', 'intro', 'expYears',
    'accountsDone', 'skills', 'clientTypes', 'experience', 'certImg', 'certNo', 'resumeName', 'resumeData', 'publicProfile'];
  function updateProfile(memberId, patch) {
    var m = member(memberId); if (!m) return null;
    PROFILE_FIELDS.forEach(function (k) { if (patch[k] !== undefined) m[k] = patch[k]; });
    m.profileAt = tstr(new Date());
    log('完善资料', m.name + ' 更新了个人职业档案');
    save();
    return m;
  }
  // 会员对外展示的专业档案（含平台统计口径）
  function profileStat(memberId) {
    var my = leadsOf(memberId);
    var deal = my.filter(function (l) { return l.status === 'deal'; }).length;
    var talking = my.filter(function (l) { return ['called', 'wechat', 'talk', 'deep', 'intent'].indexOf(l.status) >= 0; }).length;
    var ls = learnSummary(memberId);
    return { leads: my.length, deal: deal, talking: talking, learnPct: ls.pct, learnDone: ls.done, learnTotal: ls.total };
  }
  // 公开会员名录（会员风采）
  function publicMembers(kw, region) {
    kw = String(kw || '').trim();
    return S.members.filter(function (m) {
      if (m.status === 'disabled' || m.blacklist) return false;
      if (m.publicProfile === false) return false;
      if (region && (m.region || '') !== region) return false;
      if (!kw) return true;
      return [m.name, m.uid, m.region, m.level, m.skills, m.intro, m.clientTypes]
        .some(function (x) { return String(x || '').indexOf(kw) >= 0; });
    });
  }

  /* ---------------- 审核 / 日志 / 通知 ---------------- */
  function audit(type, refId, status, note) { S.audits.push({ id: nid('au'), type: type, refId: refId, status: status || 'pending', note: note || '', time: tstr(new Date()) }); save(); }
  function resolveAudit(id, ok) {
    var a = S.audits.filter(function (x) { return x.id === id; })[0]; if (!a) return;
    a.status = ok ? 'ok' : 'reject';
    if (a.type === '会员自建名单' && a.refId) {
      a.refId.split(',').forEach(function (lid) { var l = lead(lid); if (l) l.status = ok ? 'new' : 'rejected'; });
    }
    if (a.type === '名单分配申请') { var r = approveLeadRequest(a.refId, ok); return r; }
    log(ok ? '审核通过' : '审核拒绝', a.type + (a.note ? '：' + a.note : ''));
    save();
  }
  function notify(to, title, body) { S.notices.push({ id: nid('nt'), to: to || '', title: title || '', body: body || '', time: tstr(new Date()), read: false }); save(); }
  function log(action, detail, who) { S.logs.push({ id: nid('lg'), action: action, detail: detail || '', who: who || '', time: tstr(new Date()) }); if (S.logs.length > 500) S.logs.shift(); save(); }

  /* ---------------- CSV / 解析 ---------------- */
  function toCSV(arr, fields) {
    var esc = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var head = fields.map(function (f) { return typeof f === 'string' ? f : f.label; }).join(',');
    var rows = arr.map(function (r) {
      return fields.map(function (f) { var k = typeof f === 'string' ? f : f.key; return esc(r[k]); }).join(',');
    });
    return '﻿' + head + '\n' + rows.join('\n');
  }
  function parseTable(text) {
    var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; });
    if (!lines.length) return [];
    var split = function (line) {
      var out = [], cur = '', q = false;
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
        else if (ch === ',' && !q) { out.push(cur); cur = ''; }
        else cur += ch;
      }
      out.push(cur); return out;
    };
    var head = split(lines[0]);
    return lines.slice(1).map(function (l) {
      var cells = split(l), o = {}; head.forEach(function (h, i) { o[h.trim()] = (cells[i] || '').trim(); }); return o;
    });
  }
  function download(filename, text) {
    try {
      var blob = new w.Blob ? new w.Blob([text], { type: 'text/csv;charset=utf-8' }) : null;
      var a = w.document.createElement('a');
      a.href = (w.URL && w.URL.createObjectURL) ? w.URL.createObjectURL(blob) : ('data:text/csv;charset=utf-8,' + encodeURIComponent(text));
      a.download = filename; w.document.body.appendChild(a); a.click(); w.document.body.removeChild(a);
    } catch (e) { w.alert('导出失败：' + e.message); }
  }

  /* ---------------- 暴露 API ---------------- */
  load();

  /* ============ 后端同步层（多人共享数据） ============
   * 连上后端(/api)时：共享表以服务端为准 —— 启动拉取、变更推回。
   * 连不上时：退回纯 localStorage（单机/旧测试不受影响）。
   */
  var TOK_KEY = 'zw_token', SHARED_KEY = 'zw_shared';
  var SHARED = ['salary', 'activities', 'activityHeaders', 'registrations', 'employees'];
  var ONLINE = false;
  var AUTH_TOKEN = (function () { try { return w.localStorage.getItem(TOK_KEY) || ''; } catch (e) { return ''; } })();

  var API = {
    _url: function (p) {
      var base = (w.API_BASE && typeof w.API_BASE === 'string' && w.API_BASE.trim()) ||
                 (w.location && w.location.origin ? w.location.origin : '');
      if (base && base.charAt(base.length - 1) === '/') base = base.slice(0, -1);
      return base + p;
    },
    _req: function (url, opt) { return (!w.fetch) ? Promise.reject(new Error('no fetch')) : w.fetch(url, opt); },
    ping: function () { return this._req(this._url('/api/ping'), { cache: 'no-store' }).then(function (r) { return r.ok; }).catch(function () { return false; }); },
    login: function (uid, pwd) {
      return this._req(this._url('/api/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: uid, pwd: pwd }) })
        .then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
    },
    pull: function (token, names) {
      var nm = names || SHARED.slice();
      var opt = { cache: 'no-store' }; if (token) opt.headers = { 'Authorization': 'Bearer ' + token };
      return this._req(this._url('/api/tables?names=' + encodeURIComponent(nm.join(','))), opt)
        .then(function (r) { return (r.status === 401) ? { _unauth: true } : r.json(); }).catch(function () { return {}; });
    },
    push: function (tables, token) {
      if (!token) return Promise.resolve({ ok: false });
      return this._req(this._url('/api/tables'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ tables: tables }) })
        .then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
    },
    addReg: function (row) {
      return this._req(this._url('/api/registrations'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ row: row }) })
        .then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
    },
    memberPassword: function (body) {
      if (!AUTH_TOKEN) return Promise.resolve({ ok: false, msg: '未登录' });
      return this._req(this._url('/api/member/password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH_TOKEN },
        body: JSON.stringify(body)
      }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
    },
    upsertMember: function (rec) {
      if (!AUTH_TOKEN) return Promise.resolve({ ok: false });
      return this._req(this._url('/api/members'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AUTH_TOKEN },
        body: JSON.stringify({ member: rec })
      }).then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
    }
  };

  function applyTables(tables) {
    if (!tables) return;
    SHARED.forEach(function (k) { if (tables[k] && Array.isArray(tables[k])) S[k] = tables[k]; });
    rebind();
  }
  function pickShared() { var o = {}; SHARED.forEach(function (k) { o[k] = S[k]; }); return o; }
  function cacheShared() { try { w.localStorage.setItem(SHARED_KEY, JSON.stringify({ t: Date.now(), data: pickShared() })); } catch (e) {} }
  function restoreSharedCache() {
    try { var c = JSON.parse(w.localStorage.getItem(SHARED_KEY) || '{}'); if (c.data) { SHARED.forEach(function (k) { if (c.data[k]) S[k] = c.data[k]; }); rebind(); } } catch (e) {}
  }
  function maybeRefresh() { try { if (w.App && w.App.refresh) w.App.refresh(); } catch (e) {} }
  function setToken(t) { AUTH_TOKEN = t || ''; try { if (t) w.localStorage.setItem(TOK_KEY, t); else w.localStorage.removeItem(TOK_KEY); } catch (e) {} }
  var pushTimer = null;
  function pushShared() {
    if (!ONLINE || !AUTH_TOKEN) return;
    if (pushTimer) return;
    pushTimer = setTimeout(function () {
      pushTimer = null;
      var obj = {}; ['salary', 'activities', 'activityHeaders', 'employees'].forEach(function (k) { if (S[k]) obj[k] = S[k]; });
      API.push(obj, AUTH_TOKEN).then(function (r) { if (r && r.ok) cacheShared(); });
    }, 400);
  }
  function syncAuth(token) {
    setToken(token);
    return API.pull(token, ['salary', 'employees']).then(function (r) {
      if (r && r._unauth) { setToken(''); return; }
      if (r && r.tables) applyTables(r.tables);
      cacheShared(); maybeRefresh();
    });
  }
  function kickSyncPublic() {
    return API.pull(null).then(function (res) {
      if (res && res.tables) applyTables(res.tables);
      cacheShared(); maybeRefresh(); return true;
    });
  }
  function kickSync() {
    if (w.OFFLINE_MODE) { restoreSharedCache(); return Promise.resolve(false); }  // 强制离线（公网静态版用）
    return API.ping().then(function (ok) {
      if (!ok) { restoreSharedCache(); return false; }
      ONLINE = true;
      if (AUTH_TOKEN) {
        // 已登录：拉取全部共享表（服务端对合法令牌放行所有表）
        return API.pull(AUTH_TOKEN, SHARED.slice()).then(function (res) {
          if (res && res._unauth) { setToken(''); return kickSyncPublic(); }
          if (res && res.tables) applyTables(res.tables);
          cacheShared(); maybeRefresh(); return true;
        });
      }
      return kickSyncPublic();
    });
  }

  kickSync();   // 启动即探测后端并拉取共享表（连不上则离线退回 localStorage）

  w.DB = {
    S: S, KEY: KEY, ROLES: ROLES, GRADES: GRADES, FOLLOW_STATUS: FOLLOW_STATUS,
    online: function () { return ONLINE; }, api: API, kickSync: kickSync, syncAuth: syncAuth, apiLogin: function (u, p) { return API.login(u, p); },
    KPI_FIELDS: KPI_FIELDS, GOAL_PERIODS: GOAL_PERIODS, ORG_LEVELS: ORG_LEVELS, ORG_PERMS: ORG_PERMS,
    DEFAULT_LEAD_FIELDS: DEFAULT_LEAD_FIELDS,
    load: load, save: save, reset: reset, nid: nid,
    dstr: dstr, tstr: tstr, daysAgo: daysAgo, monthStr: monthStr,
    gradeOf: gradeOf, levelName: levelName, requiredCourses: requiredCourses, course: course,
    coursesFor: coursesFor, questionsOf: questionsOf,
    member: member, user: user, userByUid: userByUid, members: members, activeMembers: activeMembers,
    disabledCount: disabledCount, referrerOf: referrerOf, subordinates: subordinates, scopeMembers: scopeMembers,
    setMemberStatus: setMemberStatus, importMembers: importMembers,
    changeMyPassword: function (oldPwd, newPwd) { return API.memberPassword({ oldPwd: oldPwd, newPwd: newPwd }); },
    adminSetMemberPassword: function (uid, newPwd) { return API.memberPassword({ uid: uid, newPwd: newPwd }); },
    addMemberAccount: function (m) { return API.upsertMember(m); },
    updateProfile: updateProfile, profileStat: profileStat, publicMembers: publicMembers,
    learnRec: learnRec, setProgress: setProgress, learnSummary: learnSummary,
    studySession: studySession, examAttempt: examAttempt, courseStats: courseStats, leadStats: leadStats,
    commissionsOf: commissionsOf, commissionSum: commissionSum, refreshCommission: refreshCommission,
    checkJuniorComplete: checkJuniorComplete,
    lead: lead, leadsOf: leadsOf, unassignedLeads: unassignedLeads, splitPhones: splitPhones,
    importLeads: importLeads, assignLead: assignLead, autoDistribute: autoDistribute,
    autoDistributeOnGoal: autoDistributeOnGoal, addLeadByMember: addLeadByMember,
    setLeadStatus: setLeadStatus, requestLead: requestLead, approveLeadRequest: approveLeadRequest,
    org: org, company: company, statsCompany: statsCompany,
    reportsOf: reportsOf, reportRate: reportRate, kpiFor: kpiFor,
    goalsOf: goalsOf, goal: goal, plansOf: plansOf, pksOf: pksOf,
    audit: audit, resolveAudit: resolveAudit, notify: notify, log: log,
    followName: followName, followColor: followColor, periodName: periodName, dimName: dimName, dimUnit: dimUnit,
    orgLevelName: orgLevelName,
    questionsOf: questionsOf, questionsOfChapter: questionsOfChapter,
    addQuestion: addQuestion, updateQuestion: updateQuestion, deleteQuestion: deleteQuestion, autoGenQuestions: autoGenQuestions,
    getAdmin: getAdmin, updateAdmin: updateAdmin,
    setMonthFinance: setMonthFinance, upsertAccount: upsertAccount, addEmployee: addEmployee, delEmployee: delEmployee,
    SAL_STATUS: SAL_STATUS, salStatusName: salStatusName, salStatusColor: salStatusColor,
    calcSalary: calcSalary, addSalaryBatch: addSalaryBatch, setSalaryMonthStatus: setSalaryMonthStatus,
    salaryOfMonth: salaryOfMonth, salaryMonthGroups: salaryMonthGroups, salaryStats: salaryStats,
    activities: activities, activity: activity, updateActivity: updateActivity,
    activityHeaders: activityHeaders, getHeader: getHeader, addHeader: addHeader, updateHeader: updateHeader,
    delHeader: delHeader, moveHeader: moveHeader,
    registrationsOf: registrationsOf, registration: registration, signUp: signUp, delRegistration: delRegistration,
    planFee: planFee, planLabel: planLabel,
    evalReport: evalReport, pkById: pkById, confirmPk: confirmPk,
    toCSV: toCSV, parseTable: parseTable, download: download,
    fmtDate: function (d) { return dstr(d || new Date()); }, fmtTime: function (d) { return tstr(d || new Date()); },
    MEMBER_ALIAS: MEMBER_ALIAS, LEAD_ALIAS: LEAD_ALIAS
  };
})(window);

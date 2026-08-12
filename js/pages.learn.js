/* 学习培训模块：按会员级别展示应学课程、学习计时、分小节考核、每日限次、自动判定 */
(function (w, UI, DB, App) {
  'use strict';
  var I = w.Icon;

  App.register('learn', function () {
    var u = App.user, b = UI.h('div', { class: 'page' });
    var req = DB.coursesFor(u.level);
    var ls = DB.learnSummary(u.id);
    b.appendChild(UI.h('div', { class: 'hero sm' }, [
      UI.h('div', { class: 'hero-t', text: '学习培训' }),
      UI.h('div', { class: 'hero-s', text: DB.levelName(u.level) + ' 应学课程 ' + req.length + ' 门' })
    ]));

    if (!req.length) {
      b.appendChild(UI.empty('当前级别（' + DB.levelName(u.level) + '）暂无需学习的课程'));
      return { body: b };
    }

    b.appendChild(UI.card([
      UI.h('div', { class: 'kpi-grid g2' }, [
        UI.kpi('完成进度', ls.done + '/' + ls.total, { sub: ls.pct + '%' }),
        UI.kpi('学习时长', Math.round(ls.seconds / 60) + ' 分钟', { color: 'var(--inf)' })
      ]),
      UI.progressBar(ls.pct, 'var(--primary)')
    ]));

    if (u.juniorDone) b.appendChild(UI.h('div', { class: 'notice-bar ok', html: I('check', 14) + ' 你已完成初级业务培训，推荐人已解锁结算佣金' }));
    else {
      b.appendChild(UI.h('div', { class: 'notice-bar', html: I('book', 14) + ' 完成全部初级课程并通过考核，推荐人即可获得结算佣金' }));
    }

    UI.sec('课程列表');
    req.forEach(function (c) {
      var p = DB.learnRec(u.id, c.id) || {};
      var done = p.done && p.examPass;
      var part = (p.seconds || 0) > 0 && !done;
      var right = done ? [UI.tag('已结业', 'suc')] : part ? [UI.tag('学习中', 'pri')] : [UI.tag('未开始', 'gray')];
      b.appendChild(UI.listItem({
        title: c.name, sub: c.cat + '业务培训 · ' + (c.minutes || 0) + ' 分钟 · ' + (c.chapterList ? c.chapterList.length : (c.chapters || 1)) + ' 节',
        right: right.concat([UI.icon('chevronR', 18, '#c2c8d2')]),
        onclick: function () { openCourse(u, c); }
      }));
    });
    return { body: b };
  });

  function openCourse(u, c) {
    UI.sheet({
      title: c.name, build: function (bd) {
        var p = DB.learnRec(u.id, c.id) || {};
        bd.appendChild(UI.h('div', { class: 'course-meta' }, [
          UI.tag(c.cat + '业务培训', 'pri'), UI.tag((c.minutes || 0) + ' 分钟', 'gray'), UI.tag((c.chapterList ? c.chapterList.length : (c.chapters || 1)) + ' 节', 'gray')
        ]));
        var chs = c.chapterList && c.chapterList.length ? c.chapterList : Array.from({ length: c.chapters || 1 }).map(function (_, i) { return { id: '', title: '第 ' + (i + 1) + ' 节' }; });
        bd.appendChild(UI.h('div', { class: 'course-ch' }, chs.map(function (ch, i) {
          var qn = ch.id ? DB.questionsOfChapter(c.id, ch.id).length : DB.questionsOf(c.id).length;
          return UI.h('div', { class: 'ch-row' }, [UI.icon('play', 16, 'var(--primary)'), UI.h('span', { text: ch.title + (qn ? '（' + qn + ' 题）' : '') })]);
        })));
        bd.appendChild(UI.h('div', { class: 'muted small', text: '已学习 ' + Math.round((p.seconds || 0) / 60) + ' 分钟 · 学习 ' + (p.times || 0) + ' 次' }));
      },
      footer: [
        { text: '模拟学习 +10分钟', cls: 'ghost', onClick: function () {
          DB.studySession(u.id, c.id, 600);
          UI.toast('已记录学习时长'); App.go('learn');
        } },
        { text: '完成并考核', cls: 'pri', onClick: function () { startExam(u, c); } }
      ]
    });
  }

  function startExam(u, c) {
    var qs = DB.questionsOf(c.id);
    if (!qs.length) { DB.setProgress(u.id, c.id, null, true, true); UI.toast('已结业', 'success'); App.go('learn'); return; }
    UI.sheet({
      title: '课程考核 · ' + c.name, build: function (bd) {
        var nodes = [];
        bd.appendChild(UI.h('div', { class: 'muted small mb8', text: '选择题系统自动判定；答错可重新提交，直到全部通过。' }));
        qs.forEach(function (q, i) {
          var ctrl = q.type === 'open'
            ? UI.input({ area: true, placeholder: '请输入答案' })
            : UI.select(q.options.map(function (o, j) { return { v: o.charAt(0), t: o }; }), '');
          nodes.push(ctrl);
          bd.appendChild(UI.h('div', { class: 'exam-q' }, [
            UI.h('div', { class: 'exam-qt', text: (i + 1) + '. ' + q.q + (q.type === 'open' ? '（问答）' : '') }),
            ctrl
          ]));
        });
        bd._nodes = nodes;
      },
      footer: [{ text: '提交考核', cls: 'pri', onClick: function (api) {
        var nodes = api.body._nodes || [];
        var allOk = true, firstWrong = '';
        for (var i = 0; i < qs.length; i++) {
          var q = qs[i];
          var node = nodes[i];
          var val = node ? node.value : '';
          if (q.type === 'choice') {
            DB.examAttempt(u.id, c.id, q.id);   // 记录一次作答（统计用）
            if (val !== q.answer) { allOk = false; if (!firstWrong) firstWrong = '「' + (q.q || '').slice(0, 12) + '…」未答对'; }
          } else {
            var key = String(q.answer || '').trim();
            if (!val || (key && val.indexOf(key) < 0 && key.indexOf(val.trim()) < 0)) { allOk = false; if (!firstWrong) firstWrong = '问答题未完成要点'; }
          }
        }
        if (!allOk) { UI.toast(firstWrong || '有题目未答对，请重试', 'error'); return; }
        DB.setProgress(u.id, c.id, null, true, true);
        UI.toast('考核通过，本课程已结业', 'success');
        App.go('learn');
      } }]
    });
  }

})(window, window.UI, window.DB, window.App);

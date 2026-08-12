/* ==========================================================================
   UI 基础库：DOM 助手 / 弹层 / 组件 / 纯 SVG 图表
   与 css/app.css 设计系统对齐
   ========================================================================== */
(function (w) {
  'use strict';

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function h(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else e.setAttribute(k, v);
    });
    if (children != null) (Array.isArray(children) ? children : [children]).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return e;
  }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------------- 格式化 ---------------- */
  function money(n) { n = Number(n) || 0; return (n < 0 ? '-' : '') + '¥' + Math.abs(n).toLocaleString('zh-CN'); }
  function wan(n) { n = Number(n) || 0; if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万'; return n.toLocaleString('zh-CN'); }
  function pct(n, d) { return (Math.round((Number(n) || 0) * (d || 1) * 10) / 10) + '%'; }
  function num(n) { return (Number(n) || 0).toLocaleString('zh-CN'); }

  function phone() { return document.getElementById('phone'); }
  function toastWrap() {
    var p = phone(), t = p.querySelector('#toast-wrap');
    if (!t) { t = h('div', { class: 'toast-wrap', id: 'toast-wrap' }); p.appendChild(t); }
    return t;
  }
  function toast(msg, type) {
    var ic = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warn' ? '⚠' : 'i';
    var t = h('div', { class: 'toast' + (type ? ' ' + type : '') }, [h('span', { text: ic }), h('span', { html: msg })]);
    toastWrap().appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 250); }, 1700); });
  }

  /* ---------------- 居中对话框 / 底部抽屉 ---------------- */
  function mask() {
    var m = h('div', { class: 'mask' });
    phone().appendChild(m);
    requestAnimationFrame(function () { m.classList.add('on'); });
    return m;
  }
  function closeMask(m) { m.classList.remove('on'); setTimeout(function () { m.remove(); }, 220); }

  // 底部抽屉（适合表单）
  function sheet(opts) {
    opts = opts || {};
    var m = mask();
    var box = h('div', { class: 'sheet' });
    var hd = h('div', { class: 'sh-hd' }, [
      h('h3', { text: opts.title || '' }),
      h('button', { class: 'ab-btn', onclick: function () { closeMask(m); opts.onClose && opts.onClose(); } }, '×')
    ]);
    var bd = h('div', { class: 'sh-bd' });
    box.appendChild(hd); box.appendChild(bd);
    if (opts.footer === false) { /* no footer */ }
    else {
      var ft = h('div', { class: 'sh-ft' });
      (opts.footer || [{ text: '确定', cls: 'pri', onClick: function () { closeMask(m); } }]).forEach(function (b) {
        var btn = h('button', { class: 'btn ' + (b.cls || ''), onclick: function () { b.onClick ? b.onClick(api) : closeMask(m); } }, b.text);
        if (b.disabled) btn.disabled = true;
        ft.appendChild(btn);
      });
      box.appendChild(ft);
    }
    m.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('on'); });
    m.addEventListener('click', function (e) { if (e.target === m && opts.closable !== false) closeMask(m); });
    var api = {
      body: bd, close: function () { closeMask(m); opts.onClose && opts.onClose(); },
      setFooter: function (btns) { ft.innerHTML = ''; btns.forEach(function (b) { var btn = h('button', { class: 'btn ' + (b.cls || ''), onclick: function () { b.onClick ? b.onClick(api) : closeMask(m); } }, b.text); if (b.disabled) btn.disabled = true; ft.appendChild(btn); }); }
    };
    if (typeof opts.build === 'function') opts.build(bd, api);
    return api;
  }

  // 居中确认框
  function dialog(opts) {
    opts = opts || {};
    var m = mask();
    var d = h('div', { class: 'dialog' }, [
      h('h4', { text: opts.title || '提示' }),
      h('div', { class: 'dg-msg', html: opts.msg || '' }),
      h('div', { class: 'dg-ft' }, [
        opts.hideCancel ? null : h('button', { class: 'btn', onclick: function () { closeMask(m); opts.onCancel && opts.onCancel(); } }, opts.cancelText || '取消'),
        h('button', { class: 'btn ' + (opts.danger ? 'dan' : 'pri'), onclick: function () { closeMask(m); opts.onOk && opts.onOk(); } }, opts.okText || '确定')
      ])
    ]);
    m.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('on'); });
    m.addEventListener('click', function (e) { if (e.target === m) closeMask(m); });
    return { close: function () { closeMask(m); } };
  }

  // 简单动作面板
  function actionSheet(items, onPick) {
    var m = mask();
    var box = h('div', { class: 'sheet' });
    box.appendChild(h('div', { class: 'sh-hd' }, [h('h3', { text: '请选择' }), h('button', { class: 'ab-btn', onclick: function () { closeMask(m); } }, '×')]));
    var bd = h('div', { class: 'sh-bd' });
    items.forEach(function (it) {
      if (it.divider) { bd.appendChild(h('div', { style: { height: '1px', background: 'var(--line)', margin: '6px 0' } })); return; }
      bd.appendChild(h('button', { class: 'btn block' + (it.danger ? ' dan' : '') + (it.active ? ' ghost' : ''), style: { justifyContent: 'flex-start', marginBottom: '8px' }, onclick: function () { closeMask(m); onPick && onPick(it); } }, it.label));
    });
    box.appendChild(bd); m.appendChild(box);
    requestAnimationFrame(function () { box.classList.add('on'); });
    return { close: function () { closeMask(m); } };
  }

  /* ---------------- 组件 ---------------- */
  function card(children, cls) { return h('div', { class: 'card ' + (cls || '') }, children); }
  function cardHd(title, more) {
    return h('div', { class: 'card-hd' }, [h('span', { class: 'bar' }), h('h3', { text: title }), more ? h('span', { class: 'more', onclick: more.onclick }, more.text || '更多 ›') : null]);
  }
  function sec(title, n) {
    return h('div', { class: 'sec-title' }, [h('span', { class: 'bar', style: { width: '3px', height: '14px', borderRadius: '2px', background: 'var(--primary)' } }), h('span', { text: title }), n ? h('span', { class: 'n', text: n }) : null]);
  }
  function kpi(label, val, opts) {
    opts = opts || {};
    return h('div', { class: 'kpi' + (opts.grad ? ' ' + opts.grad : '') + (opts.cls ? ' ' + opts.cls : '') }, [
      h('div', { class: 'k-label', html: label }),
      h('div', { class: 'k-val', html: (opts.color ? '<span style="color:' + opts.color + '">' : '') + val + (opts.color ? '</span>' : '') + (opts.unit ? '<small>' + opts.unit + '</small>' : '') }),
      opts.sub ? h('div', { class: 'k-sub', text: opts.sub }) : null,
      opts.trend ? h('div', { class: 'k-trend ' + (opts.trendUp ? 'up' : 'down'), text: (opts.trendUp ? '▲ ' : '▼ ') + opts.trend }) : null
    ]);
  }
  function tag(text, type) { return h('span', { class: 'tag ' + (type || 'gray'), text: text }); }
  function avatar(name, color, size) { return h('div', { class: 'avatar' + (size ? ' ' + size : ''), style: { background: color || 'var(--primary)' }, text: (name || '？').slice(0, 1) }); }
  function progressBar(value, type) {
    var v = Math.max(0, Math.min(100, Number(value) || 0));
    return h('div', { class: 'pbar' + (type ? ' ' + type : '') }, [h('i', { style: { width: v + '%' } })]);
  }
  function empty(text, sub) {
    return h('div', { class: 'empty' }, [h('div', { class: 'e-ic', html: '<span style="font-size:26px">∅</span>' }), h('div', { class: 'e-t', text: text || '暂无数据' }), sub ? h('div', { class: 'e-s', text: sub }) : null]);
  }
  function listItem(o) {
    return h('div', { class: 'li' + (o.onclick ? ' click' : ''), onclick: o.onclick || null }, [
      o.avatar ? h('div', { class: 'avatar sm', style: { background: o.avatar }, text: (o.avatarText || o.title || '？').slice(0, 1) }) : null,
      o.icon ? h('div', { class: 'li-ic', style: { background: (o.iconBg || 'var(--primary-weak)'), color: (o.iconColor || 'var(--primary)') }, html: o.icon }) : null,
      h('div', { class: 'li-main' }, [
        h('div', { class: 'li-t', html: o.title || '' }),
        o.sub ? h('div', { class: 'li-d', text: o.sub }) : null,
        o.sub2 ? h('div', { class: 'li-d', style: { marginTop: '1px' }, html: o.sub2 }) : null
      ]),
      o.right ? h('div', { class: 'li-r' }, o.right) : (o.arrow !== false ? h('span', { class: 'li-arrow', html: '›' }) : null)
    ]);
  }
  function field(label, control, req) {
    return h('label', { class: 'field' }, [h('span', { html: (req ? '<i class="req">*</i> ' : '') + label }), control]);
  }
  function input(attrs) {
    attrs = attrs || {};
    if (attrs.area) {
      var ta = h('textarea', Object.assign({}, attrs));
      ta.className = 'ta';
      if (attrs.placeholder) ta.placeholder = attrs.placeholder;
      // textarea 的初始内容必须走 .value，setAttribute('value') 不生效
      if (attrs.value !== undefined && attrs.value !== null) ta.value = String(attrs.value);
      return ta;
    }
    return h('input', Object.assign({ class: 'inp' }, attrs));
  }
  function select(options, val, onChange) {
    var s = h('select', { class: 'sel' });
    options.forEach(function (o) { var op = h('option', { value: o.v, text: o.t }); if (o.v === val) op.selected = true; s.appendChild(op); });
    if (onChange) s.addEventListener('change', function (e) { onChange(e); });
    return s;
  }
  function switchBox(checked, onChange) {
    var inp = h('input', { type: 'checkbox' });
    inp.checked = !!checked;
    var lab = h('label', { class: 'switch' + (inp.checked ? ' on' : '') }, [inp, h('span', { class: 'track' }), h('span', { class: 'thumb' })]);
    inp.addEventListener('change', function () { lab.classList.toggle('on', inp.checked); if (onChange) onChange(inp.checked); });
    return lab;
  }

  /* ---------------- 纯 SVG 图表 ---------------- */
  function svg(w, ht, inner) {
    return '<svg viewBox="0 0 ' + w + ' ' + ht + '" class="wb-svg" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }
  function ring(percent, opts) {
    opts = opts || {};
    var size = opts.size || 96, st = opts.stroke || 9, r = (size - st) / 2, c = 2 * Math.PI * r;
    var p = Math.max(0, Math.min(100, percent)), col = opts.color || 'var(--accent)';
    return svg(size, size,
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#eceef3" stroke-width="' + st + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + st + '" stroke-linecap="round" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - p / 100)) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' +
      '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="' + (opts.font || 18) + '" font-weight="700" fill="' + col + '">' + Math.round(p) + '%</text>'
    );
  }
  function bars(data, opts) {
    opts = opts || {};
    var W = 320, H = opts.h || 130, pad = 24, n = data.length, bw = (W - pad * 2) / n * 0.58, gap = (W - pad * 2) / n;
    var max = Math.max(1, Math.max.apply(null, data.map(function (d) { return d.v; })));
    var s = '';
    data.forEach(function (d, i) {
      var bh = Math.round(d.v / max * (H - 34)), x = pad + gap * i + (gap - bw) / 2, y = H - 22 - bh;
      s += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" rx="3" fill="' + (d.color || 'var(--accent)') + '"/>';
      s += '<text x="' + (x + bw / 2) + '" y="' + (y - 4) + '" text-anchor="middle" font-size="9" fill="#6b7280">' + (opts.vfmt ? opts.vfmt(d.v) : d.v) + '</text>';
      s += '<text x="' + (x + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9" fill="#9aa1ad">' + d.k + '</text>';
    });
    s += '<line x1="' + pad + '" y1="' + (H - 22) + '" x2="' + (W - pad) + '" y2="' + (H - 22) + '" stroke="#eceef3"/>';
    return svg(W, H, s);
  }
  function line(data, opts) {
    opts = opts || {};
    var W = 320, H = opts.h || 130, pad = 24, n = data.length, step = (W - pad * 2) / Math.max(1, n - 1);
    var max = Math.max(1, Math.max.apply(null, data.map(function (d) { return d.v; })));
    var pts = data.map(function (d, i) { return [pad + step * i, H - 22 - Math.round(d.v / max * (H - 36))]; });
    var path = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = path + ' L' + pts[pts.length - 1][0] + ' ' + (H - 22) + ' L' + pts[0][0] + ' ' + (H - 22) + ' Z';
    var s = '<path d="' + area + '" fill="var(--accent)" opacity="0.08"/>';
    s += '<path d="' + path + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>';
    pts.forEach(function (p, i) {
      s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.6" fill="#fff" stroke="var(--accent)" stroke-width="1.6"/>';
      if (i % Math.ceil(n / 6) === 0 || i === n - 1) s += '<text x="' + p[0] + '" y="' + (H - 8) + '" text-anchor="middle" font-size="8.5" fill="#9aa1ad">' + data[i].k + '</text>';
    });
    return svg(W, H, s);
  }
  function ranking(data, opts) {
    opts = opts || {};
    var max = Math.max(1, Math.max.apply(null, data.map(function (d) { return d.v; })));
    return h('div', { class: 'rank-list' }, data.map(function (d, i) {
      var w = Math.round(d.v / max * 100), cls = 'rank-no' + (i < 3 ? ' n' + (i + 1) : '');
      return h('div', { class: 'rank-row' }, [
        h('span', { class: cls, text: i + 1 }),
        h('span', { class: 'rank-nm' }, [h('span', { text: d.k }), h('b', { text: opts.vfmt ? opts.vfmt(d.v) : d.v })]),
        h('span', { class: 'rank-bd' }, [h('div', { class: 'pbar sm' }, [h('i', { style: { width: w + '%;background:' + (d.color || 'var(--accent)') + ';border-radius:4px' } })])])
      ]);
    }));
  }
  function donut(segs, opts) {
    opts = opts || {};
    var size = opts.size || 116, st = opts.stroke || 14, r = (size - st) / 2, c = 2 * Math.PI * r;
    var total = segs.reduce(function (s, x) { return s + x.v; }, 0) || 1, off = 0, s = '';
    segs.forEach(function (seg) {
      var len = c * seg.v / total;
      s += '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + seg.color + '" stroke-width="' + st + '" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>';
      off += len;
    });
    var legend = h('div', { class: 'legend' }, segs.map(function (seg) {
      return h('div', { class: 'legend-item' }, [h('i', { style: { background: seg.color } }), h('span', { text: seg.k }), h('b', { text: seg.v })]);
    }));
    return { svg: svg(size, size, s), legend: legend };
  }

  function btn(text, cls, onclick) { var b = h('button', { class: 'btn ' + (cls || '') }, text); if (onclick) b.addEventListener('click', onclick); return b; }
  function icon(name, sz, color) { return h('span', { class: 'ic', html: w.Icon ? w.Icon(name, sz || 18, color) : '' }); }
  function avatar(txt, color) { return h('div', { class: 'avatar', style: { background: color || 'var(--accent)' } }, (txt || '?').slice(0, 1)); }

  w.UI = {
    el: el, h: h, $: $, $$: $$, money: money, wan: wan, pct: pct, num: num,
    toast: toast, sheet: sheet, dialog: dialog, actionSheet: actionSheet, mask: closeMask,
    card: card, cardHd: cardHd, sec: sec, kpi: kpi, tag: tag, avatar: avatar, btn: btn, icon: icon,
    progressBar: progressBar, empty: empty, listItem: listItem, field: field, input: input,
    select: select, switchBox: switchBox, ring: ring, bars: bars, line: line, ranking: ranking, donut: donut
  };
})(window);

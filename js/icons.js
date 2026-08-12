/* 线性图标库（内联 SVG，无外部依赖） */
(function (w) {
  var P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5S20 17 20 21"/>',
    chart: '<path d="M3 20h18"/><rect x="5" y="10" width="3.4" height="7" rx="1"/><rect x="10.3" y="5" width="3.4" height="12" rx="1"/><rect x="15.6" y="13" width="3.4" height="4" rx="1"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    flag: '<path d="M4 21V4"/><path d="M4 5h12l-2 3.5L16 12H4"/>',
    money: '<circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M9 9.7h5.2a1.9 1.9 0 0 1 0 3.8H9M9 13.5h6"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1.2"/>',
    building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.4 2.9-5.4 6.5-5.4s6.5 2 6.5 5.4"/><path d="M16.5 5.2a3.4 3.4 0 0 1 0 6.6M18 14.8c2.2.6 3.6 2.3 3.6 5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 10h7M8.5 14h5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 16.5 5l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.1 8.3-7.5 9.5-4.4-1.2-7.5-5-7.5-9.5V6z"/><path d="M9.2 12.2l2 2 3.6-3.8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    chevronR: '<path d="M9 5l7 7-7 7"/>',
    chevronL: '<path d="M15 5l-7 7 7 7"/>',
    chevronD: '<path d="M6 9l6 6 6-6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    download: '<path d="M12 3v12"/><path d="M7.5 11L12 15.5 16.5 11"/><path d="M4 20h16"/>',
    upload: '<path d="M12 21V9"/><path d="M7.5 13L12 8.5 16.5 13"/><path d="M4 4h16"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2.4"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.4 2"/>',
    play: '<path d="M8 5.5l11 6.5-11 6.5z"/>',
    pause: '<rect x="7" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.4" y="5" width="3.6" height="14" rx="1.2"/>',
    trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5A2.5 2.5 0 0 0 7 10M17 5.5h2.5A2.5 2.5 0 0 1 17 10"/><path d="M12 14v3M8.5 20h7l-.6-3h-5.8z"/>',
    swords: '<path d="M5 3l8 8M3 5l8 8"/><path d="M19 3l-8 8M21 5l-8 8"/><path d="M14 14l6 6M10 14l-6 6"/>',
    alert: '<path d="M12 3.5 22 20H2z"/><path d="M12 9.5v4.5M12 17h.01"/>',
    lock: '<rect x="4.5" y="10" width="15" height="11" rx="2.4"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>',
    unlock: '<rect x="4.5" y="10" width="15" height="11" rx="2.4"/><path d="M8 10V7.5a4 4 0 0 1 7.6-1.7"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
    logout: '<path d="M15 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9"/><path d="M18 8l4 4-4 4M22 12H10"/>',
    eye: '<path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/>',
    eyeOff: '<path d="M9.9 5.7A9.6 9.6 0 0 1 12 5.5c6.2 0 10 6.5 10 6.5a17 17 0 0 1-3.3 3.9M6.4 7.7A17 17 0 0 0 2 12s3.8 6.5 10 6.5c1.5 0 2.8-.3 4-.8"/><path d="M3 3l18 18"/>',
    doc: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    video: '<rect x="2.5" y="6" width="13" height="12" rx="2.4"/><path d="M15.5 10.5 21.5 7v10l-6-3.5z"/>',
    audio: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2.5" y="13" width="4" height="6" rx="1.8"/><rect x="17.5" y="13" width="4" height="6" rx="1.8"/>',
    wechat: '<ellipse cx="9" cy="9.5" rx="6.5" ry="5.5"/><path d="M4.5 14 3 17l3.4-1.6"/><ellipse cx="16" cy="15" rx="5.5" ry="4.6"/><path d="M19.6 18.4 21 20.6l-2.7-1.1"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>',
    location: '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.8" cy="6" r="1.3"/><circle cx="3.8" cy="12" r="1.3"/><circle cx="3.8" cy="18" r="1.3"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    pie: '<path d="M12 3v9h9a9 9 0 0 0-9-9z"/><path d="M21 13.5A9 9 0 1 1 10.5 3.1"/>',
    history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4.5V9h4.5"/><path d="M12 7.5V12l3 2"/>',
    inbox: '<path d="M3 12h5l1.5 3h5L16 12h5"/><path d="M4.5 5h15l1.5 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z"/>',
    key: '<circle cx="8" cy="15" r="4.5"/><path d="m11.2 11.8 8-8M17 6l2.5 2.5M14.5 8.5 17 11"/>',
    bank: '<path d="m3 9 9-5 9 5"/><path d="M4.5 9v9M9 9v9M15 9v9M19.5 9v9"/><path d="M3 21h18"/>',
    idcard: '<rect x="2.5" y="5" width="19" height="14" rx="2.4"/><circle cx="8" cy="11" r="2.2"/><path d="M4.6 16.2c.5-1.6 1.8-2.4 3.4-2.4s2.9.8 3.4 2.4M14.5 10h4.5M14.5 13.5h3"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>',
    speaker: '<path d="M4 9v6h3.5L13 19V5L7.5 9z"/><path d="M17 9.2a4 4 0 0 1 0 5.6"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M16 21h5v-5"/><path d="M4 4l6 6M14 14l7 7"/>'
  };
  w.Icon = function (name, size, color, stroke) {
    var p = P[name] || P.grid;
    size = size || 20;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' +
      (color || 'currentColor') + '" stroke-width="' + (stroke || 1.7) +
      '" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  };
  w.IconNames = Object.keys(P);
})(window);

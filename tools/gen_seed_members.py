#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从「会员信息含推荐人.xlsx」生成 js/seed-members.js

规则（与用户约定）：
- 只导入「会员手机号」非空的会员（能登录系统的人），约 2 万人
- 严禁自行编造「区域」——region 一律留空，由会员登录后自选
- 推荐链（推荐人ID / 昵称 / 手机号）原样保留，即使推荐人本身不在导入集合内
- 输出采用「字段字典 + 行数组」的紧凑格式，在浏览器端展开，体积约为对象式的 45%

用法：
  python3 tools/gen_seed_members.py [xlsx路径] [输出路径]
"""
import json
import os
import sys

import openpyxl

DEFAULT_XLSX = '/Users/shangyelingxiu/Desktop/会员信息含推荐人.xlsx'
DEFAULT_OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           'js', 'seed-members.js')

# 表头 → 列索引（按源文件实际顺序）
COL_UID = 0        # 会员ID
COL_REF_NAME = 1   # 推荐人昵称
COL_REF_ID = 2     # 推荐人ID
COL_REF_PHONE = 3  # 推荐人手机号
COL_NAME = 4       # 会员昵称
COL_PHONE = 5      # 会员手机号
COL_LEVEL = 6      # 会员等级
COL_SUBS = 7       # 下级会员人数
COL_COMM = 8       # 累计佣金
COL_PAID = 9       # 已打款佣金
COL_BLACK = 11     # 黑名单

EXPECT_HEADERS = ['会员ID', '推荐人昵称', '推荐人ID', '推荐人手机号', '会员昵称',
                  '会员手机号', '会员等级', '下级会员人数', '累计佣金', '已打款佣金',
                  '关注', '黑名单']


def cell(v):
    return '' if v is None else str(v).strip()


def to_num(s):
    try:
        f = float(s)
        return int(f) if f == int(f) else round(f, 2)
    except (TypeError, ValueError):
        return 0


def read_rows(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows, headers = [], None
    for i, r in enumerate(ws.iter_rows(values_only=True)):
        vals = [cell(x) for x in r]
        if i == 0:
            headers = vals
            continue
        if any(vals):
            rows.append(vals)
    wb.close()
    return headers, rows


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    out = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT

    headers, rows = read_rows(xlsx)
    if headers[:12] != EXPECT_HEADERS:
        print('!! 表头与预期不一致，请检查：')
        print('   实际:', headers)
        print('   预期:', EXPECT_HEADERS)
        sys.exit(1)

    print('源文件总行数：', len(rows))

    seen, members = set(), []
    skipped_nophone = 0
    for r in rows:
        uid = r[COL_UID]
        phone = r[COL_PHONE]
        if not uid:
            continue
        if not phone:                 # 无手机号 = 无法登录，不进会员库
            skipped_nophone += 1
            continue
        if uid in seen:               # 同一会员ID 多行，保留首条
            continue
        seen.add(uid)
        members.append([
            uid,
            r[COL_NAME] or ('会员' + uid),
            phone,
            r[COL_LEVEL] or '默认等级',
            r[COL_REF_ID],
            r[COL_REF_NAME],
            r[COL_REF_PHONE],
            to_num(r[COL_SUBS]),
            to_num(r[COL_COMM]),
            to_num(r[COL_PAID]),
            1 if r[COL_BLACK] == '是' else 0,
        ])

    print('无手机号跳过：', skipped_nophone)
    print('导入会员数：', len(members))

    # ---- 字典化高重复字段：等级 / 推荐人昵称 / 推荐人手机号 ----
    def build_dict(idx):
        order, table = {}, []
        for m in members:
            v = m[idx]
            if v not in order:
                order[v] = len(table)
                table.append(v)
            m[idx] = order[v]
        return table

    lv_tab = build_dict(3)
    rn_tab = build_dict(5)
    rp_tab = build_dict(6)
    print('等级字典：', len(lv_tab), '| 推荐人昵称字典：', len(rn_tab),
          '| 推荐人手机字典：', len(rp_tab))

    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    js = (
        '/* 由 tools/gen_seed_members.py 从「会员信息含推荐人.xlsx」生成，请勿手工编辑。\n'
        '   口径：仅导入有手机号（可登录）的会员；region 一律留空，由会员登录后自选。 */\n'
        'window.SEED_MEMBERS = (function () {\n'
        '  var LV = ' + dump(lv_tab) + ';\n'
        '  var RN = ' + dump(rn_tab) + ';\n'
        '  var RP = ' + dump(rp_tab) + ';\n'
        '  /* [uid, name, phone, lvIdx, refId, refNameIdx, refPhoneIdx, subs, commission, paid, blacklist] */\n'
        '  var R = ' + dump(members) + ';\n'
        '  var out = new Array(R.length);\n'
        '  for (var i = 0; i < R.length; i++) {\n'
        '    var r = R[i];\n'
        '    out[i] = {\n'
        '      id: \'m_\' + r[0], uid: r[0], name: r[1], phone: r[2], level: LV[r[3]],\n'
        '      role: \'member\', refId: r[4], refName: RN[r[5]], refPhone: RP[r[6]],\n'
        '      subs: r[7], commission: r[8], paid: r[9], blacklist: !!r[10],\n'
        '      status: \'normal\', password: \'888888\',\n'
        '      region: \'\',           /* 会员登录后自己选，后台不指定 */\n'
        '      joinedAt: \'\', orgId: \'\', companyId: \'\'\n'
        '    };\n'
        '  }\n'
        '  return out;\n'
        '})();\n'
    )

    with open(out, 'w', encoding='utf-8') as f:
        f.write(js)
    print('已写入：', out, '|', round(os.path.getsize(out) / 1024 / 1024, 2), 'MB')


if __name__ == '__main__':
    main()

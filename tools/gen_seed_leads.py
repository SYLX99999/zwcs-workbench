#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把一批「企业名单」源文件（xlsx / xls / csv）合并生成 js/seed-leads.js

设计要点：
- 表头容错：沿用 store.js 里的 LEAD_ALIAS 中文别名，精确命中优先，再模糊包含
- 一家企业多个手机号 → 拆成多条名单（与系统内 importLeads 的行为一致）
- 去重键：统一社会信用代码 + 手机号（没有信用代码时退化为 公司名称 + 手机号）
- 输出「企业表 + 号码行」的紧凑结构，5 万条约 2~3MB，
  比对象式 JSON（约 18MB）小一个量级，浏览器展开成与原来完全一样的对象

用法：
  python3 tools/gen_seed_leads.py <文件或目录> [更多文件或目录...] [-o 输出路径]
例：
  python3 tools/gen_seed_leads.py ~/Desktop/企业名单/ 
"""
import csv
import json
import os
import re
import sys

import openpyxl

OUT_DEFAULT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                           'js', 'seed-leads.js')

# 与 store.js 的 LEAD_ALIAS 保持一致
ALIAS = {
    'company':     ['company', '公司名称', '企业名称', '客户名称', '公司', '企业'],
    'creditCode':  ['creditCode', '统一社会信用代码', '社会信用代码', '信用代码', '纳税人识别号', '税号'],
    'city':        ['city', '所属城市', '所在城市', '所在地区', '城市', '地区', '区域'],
    'legalPerson': ['legalPerson', '法定代表人', '法人代表', '法人'],
    'capital':     ['capital', '注册资本', '注册资金'],
    'regStatus':   ['regStatus', '登记状态', '经营状态', '企业状态'],
    'regDate':     ['regDate', '成立日期', '注册日期', '成立时间'],
    'phone':       ['phone', '有效手机号', '手机号码', '手机号', '联系电话', '联系方式', '电话'],
}
ALIAS_ALL = {a: k for k, lst in ALIAS.items() for a in lst}
FIELDS = ['company', 'creditCode', 'city', 'legalPerson', 'capital', 'regStatus', 'regDate']
PHONE_HEADERS = set(ALIAS['phone'])  # 可能有多列手机号（如『有效手机号』×3）

# 表头候选关键字：用于跳过天眼查导出文件里的「声明」行，定位真正的表头行
HEADER_KW = {'公司名称', '企业名称', '法定代表人', '统一社会信用代码', '登记状态',
             '成立日期', '所属城市', '注册资本', '电话', '手机号', '有效手机号', '客户名称'}


def find_header(grid):
    """在表前几行里找真正的表头行：至少 2 个非空格且含已知字段关键字。
    天眼查导出：row0=声明，row1=表头；海口龙华等：row0=表头。"""
    for i, r in enumerate(grid[:7]):
        ne = sum(1 for c in r if norm(c))
        if ne >= 2 and any(norm(c) in HEADER_KW for c in r):
            return i
    return 0


def get_field(hmap, r, key):
    if key in hmap and hmap[key] < len(r):
        return norm(r[hmap[key]])
    return ''

PHONE_SPLIT = re.compile(r'[,，;；/\s、|]+')
NON_DIGIT = re.compile(r'\D')


def norm(s):
    return '' if s is None else str(s).strip()


def build_map(headers):
    """表头 → 字段名。精确别名优先，再模糊包含（排除已被别人占用的表头）。"""
    hmap, used = {}, set()
    clean = [norm(h).replace(' ', '') for h in headers]
    for key, lst in ALIAS.items():                     # 1) 精确
        for i, h in enumerate(clean):
            if i in used:
                continue
            if h in lst:
                hmap[key] = i
                used.add(i)
                break
    for key, lst in ALIAS.items():                     # 2) 模糊
        if key in hmap:
            continue
        for i, h in enumerate(clean):
            if i in used or not h:
                continue
            if h in ALIAS_ALL and ALIAS_ALL[h] != key:  # 明确属于别的字段，跳过
                continue
            if any(a in h for a in lst):
                hmap[key] = i
                used.add(i)
                break
    return hmap


def split_phones(raw):
    out = []
    for p in PHONE_SPLIT.split(norm(raw)):
        d = NON_DIGIT.sub('', p)
        if len(d) >= 7:
            out.append(d)
    return out


def iter_sheet_rows(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in ('.csv', '.tsv', '.txt'):
        delim = '\t' if ext == '.tsv' else ','
        for enc in ('utf-8-sig', 'gbk', 'utf-8'):
            try:
                with open(path, newline='', encoding=enc) as f:
                    yield list(csv.reader(f, delimiter=delim))
                return
            except UnicodeDecodeError:
                continue
        raise RuntimeError('无法识别编码：' + path)
    elif ext in ('.xlsx', '.xlsm'):
        # 注意：read_only=True 下部分天眼查导出文件只能读出 1 行（声明），
        # 必须用 read_only=False 才能读到真实数据。
        wb = openpyxl.load_workbook(path, read_only=False, data_only=True)
        for ws in wb.worksheets:
            yield [[norm(c) for c in r] for r in ws.iter_rows(values_only=True)]
        wb.close()
    elif ext == '.xls':
        try:
            import xlrd
        except ImportError:
            print('  !! .xls 需要 xlrd：pip install "xlrd<2"，已跳过', path)
            return
        wb = xlrd.open_workbook(path)
        for ws in wb.sheets():
            yield [[norm(ws.cell_value(r, c)) for c in range(ws.ncols)]
                   for r in range(ws.nrows)]
    else:
        return


def collect(paths):
    files = []
    for p in paths:
        if os.path.isdir(p):
            for root, dirs, names in os.walk(p):
                # 跳过隐藏/临时目录
                dirs[:] = [d for d in dirs if not d.startswith('.') and not d.startswith('~$')]
                for name in sorted(names):
                    if name.startswith('~$') or name.startswith('.'):
                        continue
                    if os.path.splitext(name)[1].lower() in ('.xlsx', '.xlsm', '.xls', '.csv', '.tsv'):
                        files.append(os.path.join(root, name))
        elif os.path.isfile(p):
            files.append(p)
    return files


def main():
    args = [a for a in sys.argv[1:]]
    out = OUT_DEFAULT
    if '-o' in args:
        i = args.index('-o')
        out = args[i + 1]
        args = args[:i] + args[i + 2:]
    if not args:
        print(__doc__)
        sys.exit(1)

    files = collect(args)
    if not files:
        print('没有找到可导入的文件')
        sys.exit(1)
    print('待导入文件 %d 个：' % len(files))
    for f in files:
        print('  -', os.path.basename(f))

    companies = {}      # creditKey -> [company, creditCode, city, legal, capital, status, date]
    order = []          # creditKey 顺序
    rows = []           # [companyIdx, phone, sourceIdx]
    seen = set()        # (creditKey, phone)
    sources, src_idx = [], {}
    total_raw = dup = nophone = nocname = 0

    for path in files:
        src = os.path.splitext(os.path.basename(path))[0]
        if src not in src_idx:
            src_idx[src] = len(sources)
            sources.append(src)
        si = src_idx[src]
        added_here = 0
        for grid in iter_sheet_rows(path):
            if not grid:
                continue
            hdr = find_header(grid)
            hmap = build_map(grid[hdr])
            if 'company' not in hmap:
                print('  !! 跳过（无「公司名称」表头）:', os.path.basename(path))
                continue
            clean = [norm(h).replace(' ', '') for h in grid[hdr]]
            phone_cols = [i for i, h in enumerate(clean) if h in PHONE_HEADERS]
            if not phone_cols:
                print('  !! 跳过（无手机号表头）:', os.path.basename(path))
                continue
            for r in grid[hdr + 1:]:
                if not any(norm(x) for x in r):
                    continue
                total_raw += 1
                comp = get_field(hmap, r, 'company')
                if not comp:
                    nocname += 1
                    continue
                code = get_field(hmap, r, 'creditCode')
                phones = split_phones(' '.join(norm(r[i])
                                               for i in phone_cols if i < len(r)))
                if not phones:
                    nophone += 1
                    continue
                ckey = code or ('N:' + comp)
                if ckey not in companies:
                    companies[ckey] = [comp, code] + [get_field(hmap, r, k) for k in FIELDS[2:]]
                    order.append(ckey)
                else:                       # 同企业后续行补齐缺失字段
                    cur = companies[ckey]
                    for ci, key in enumerate(FIELDS):
                        if not cur[ci]:
                            cur[ci] = get_field(hmap, r, key)
                for ph in phones:
                    k = (ckey, ph)
                    if k in seen:
                        dup += 1
                        continue
                    seen.add(k)
                    rows.append([ckey, ph, si])
                    added_here += 1
        print('  · %-40s 新增 %d 条' % (os.path.basename(path)[:40], added_here))

    idx_of = {k: i for i, k in enumerate(order)}
    for r in rows:
        r[0] = idx_of[r[0]]

    print('---')
    print('源数据行 %d | 无公司名 %d | 无手机号 %d | 重复去除 %d'
          % (total_raw, nocname, nophone, dup))
    print('企业 %d 家 → 名单 %d 条' % (len(order), len(rows)))

    # 字典化：城市 / 登记状态 / 注册资本（重复度高）
    comp_rows = [companies[k] for k in order]

    def dictify(col):
        tab, pos = [], {}
        for c in comp_rows:
            v = c[col]
            if v not in pos:
                pos[v] = len(tab)
                tab.append(v)
            c[col] = pos[v]
        return tab

    city_tab = dictify(2)
    cap_tab = dictify(4)
    st_tab = dictify(5)
    date_tab = dictify(6)
    print('字典：城市 %d | 资本 %d | 状态 %d | 日期 %d | 来源 %d'
          % (len(city_tab), len(cap_tab), len(st_tab), len(date_tab), len(sources)))

    d = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    js = (
        '/* 由 tools/gen_seed_leads.py 生成，请勿手工编辑。\n'
        '   来源文件：' + '、'.join(sources) + '\n'
        '   企业 ' + str(len(order)) + ' 家 / 名单 ' + str(len(rows)) + ' 条（一企多号已拆分，重复号码已去重） */\n'
        'window.SEED_LEADS = (function () {\n'
        '  var CITY = ' + d(city_tab) + ';\n'
        '  var CAP  = ' + d(cap_tab) + ';\n'
        '  var ST   = ' + d(st_tab) + ';\n'
        '  var DT   = ' + d(date_tab) + ';\n'
        '  var SRC  = ' + d(sources) + ';\n'
        '  /* 企业：[名称, 信用代码, 城市idx, 法人, 资本idx, 状态idx, 成立日期idx] */\n'
        '  var C = ' + d(comp_rows) + ';\n'
        '  /* 名单：[企业idx, 手机号, 来源idx] */\n'
        '  var R = ' + d(rows) + ';\n'
        '  var out = new Array(R.length);\n'
        '  for (var i = 0; i < R.length; i++) {\n'
        '    var r = R[i], c = C[r[0]];\n'
        '    out[i] = {\n'
        '      id: \'L_\' + (100000 + i), company: c[0], creditCode: c[1], city: CITY[c[2]],\n'
        '      legalPerson: c[3], capital: CAP[c[4]], regStatus: ST[c[5]], regDate: DT[c[6]],\n'
        '      phone: r[1], assignedTo: \'\', status: \'new\', createdAt: \'\',\n'
        '      importedFrom: SRC[r[2]], ownerNote: \'\'\n'
        '    };\n'
        '  }\n'
        '  return out;\n'
        '})();\n'
    )
    with open(out, 'w', encoding='utf-8') as f:
        f.write(js)
    print('已写入：%s | %.2f MB' % (out, os.path.getsize(out) / 1024 / 1024))


if __name__ == '__main__':
    main()

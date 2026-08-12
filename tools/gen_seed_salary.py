#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成工资种子文件：解析 Downloads/工资表 下 2023-2026 全部 xlsx，
按 (年, 月) 去重，输出紧凑 IIFE 编码的 js/seed-salary.js (window.SEED_SALARY)。

字段映射（跨年一致）：
  col3 姓名 | col4 岗位 | col5 基本工资 | col6 绩效工资 | col7 全勤奖
  col8 社保 | col9 饭补 | col10 应发合计 | col11 缺勤扣款 | col12 其他扣款 | col13 实发金额
  年份取自目录(2023年/2024年/...)，月份取自文件名(中文/阿拉伯数字)，B12 单元格=所属日期(实际发放日)。
同 (年,月) 多文件：保留 所属日期 最新的一份。
"""
import os, re, sys, openpyxl

ROOT = "/Users/shangyelingxiu/Downloads/工资表"
OUT = os.path.join(os.path.dirname(__file__), "..", "js", "seed-salary.js")

CN_NUM = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12}

def parse_month(fname):
    """从文件名解析月份，返回 1-12 或 None。
    关键：中文数字月份必须「长优先」匹配——'十一月份' 内含子串 '一月份'，
    若先匹配 '一' 会错判成 1 月；故先按长度降序扫描 '十一'/'十二' 再 '一'..'十'。"""
    # 1) 优先：中文数字月份，长优先（十一月 / 十二月 / 八月 ...）
    for cn in sorted(CN_NUM.keys(), key=lambda x: -len(x)):
        if cn + '月' in fname:
            return CN_NUM[cn]
    # 2) 其次：阿拉伯数字月份（2024年11月份 / 2025年3月）
    m = re.search(r'(\d{1,2})\s*月份?', fname)
    if m: return int(m.group(1))
    return None

def num(v):
    try:
        if v is None or v == '': return 0
        return float(str(v).replace(',', ''))
    except: return 0

def collect():
    files = []
    for yr_dir in sorted(os.listdir(ROOT)):
        fp = os.path.join(ROOT, yr_dir)
        if not os.path.isdir(fp): continue
        m = re.match(r'(\d{4})年', yr_dir)
        if not m: continue
        year = int(m.group(1))
        for fn in sorted(os.listdir(fp)):
            if fn.startswith('~$') or fn.startswith('.~'): continue
            if not fn.lower().endswith(('.xlsx','.xlsm')): continue
            month = parse_month(fn)
            if not month: 
                print("  SKIP 无法解析月份:", fn); continue
            files.append((year, month, os.path.join(fp, fn), fn))
    return files

def read_file(fp):
    wb = openpyxl.load_workbook(fp, read_only=False, data_only=True)
    ws = wb.active
    pay_date = ''
    # B12 = col12 row1 = 所属日期
    try:
        pdv = ws.cell(1, 12).value
        if pdv:
            pay_date = pdv.strftime('%Y-%m-%d') if hasattr(pdv, 'strftime') else str(pdv)[:10]
    except: pass
    rows = []
    # 数据从第4行起（第2行=序号/姓名表头，第3行=子表头，第4行=首条数据）
    for r in range(4, ws.max_row + 1):
        name = ws.cell(r, 3).value
        if name in (None, ''): 
            continue
        name = str(name).strip()
        if name in ('姓名',): 
            continue
        pos = ws.cell(r, 4).value or ''
        rec = {
            'name': name,
            'position': str(pos).strip(),
            'base': num(ws.cell(r, 5).value),
            'perf': num(ws.cell(r, 6).value),
            'att': num(ws.cell(r, 7).value),
            'social': num(ws.cell(r, 8).value),
            'meal': num(ws.cell(r, 9).value),
            'gross': num(ws.cell(r, 10).value),
            'dedAbs': num(ws.cell(r, 11).value),
            'dedOth': num(ws.cell(r, 12).value),
            'net': num(ws.cell(r, 13).value),
        }
        rows.append(rec)
    wb.close()
    return pay_date, rows

def main():
    files = collect()
    print("发现工资文件:", len(files))
    # 按 (year, month) 去重，保留 所属日期 最新
    best = {}
    for year, month, fp, fn in files:
        pd, rows = read_file(fp)
        key = (year, month)
        cur = best.get(key)
        if not cur or pd > cur['pay']:
            best[key] = {'year': year, 'month': month, 'pay': pd, 'rows': rows, 'src': fn, 'file': fp}
        else:
            print("  去重跳过(更旧):", fn, pd)
    print("去重后月份数:", len(best))
    
    out = []
    rid = 0
    for key in sorted(best.keys()):
        b = best[key]
        for rec in b['rows']:
            rid += 1
            out.append({
                'id': 'SAL_%05d' % rid,
                'year': b['year'],
                'month': b['month'],
                'name': rec['name'],
                'position': rec['position'],
                'base': rec['base'],
                'perf': rec['perf'],
                'att': rec['att'],
                'social': rec['social'],
                'meal': rec['meal'],
                'gross': rec['gross'],
                'dedAbs': rec['dedAbs'],
                'dedOth': rec['dedOth'],
                'net': rec['net'],
                'payDate': b['pay'],
                'src': b['src'],
                'status': 'archived'   # 历史数据：已发放确认
            })
    print("工资记录总数:", len(out))
    # 统计
    people = set(r['name'] for r in out)
    net_total = sum(r['net'] for r in out)
    print("涉及员工(去重):", len(people), " 实发合计: %.2f" % net_total)
    
    # 紧凑编码：字典 + 行数组
    # 字段顺序
    F = ['id','year','month','name','position','base','perf','att','social','meal','gross','dedAbs','dedOth','net','payDate','src','status']
    # name/src 可能重复，做字典
    names = {}; srcs = {}; nameArr = []; srcArr = []
    def nid(d, s, arr):
        if s not in d:
            d[s] = len(arr); arr.append(s)
        return d[s]
    rows = []
    for r in out:
        ni = nid(names, r['name'], nameArr)
        si = nid(srcs, r['src'], srcArr)
        rows.append([r['id'], r['year'], r['month'], ni, si, r['base'], r['perf'], r['att'],
                     r['social'], r['meal'], r['gross'], r['dedAbs'], r['dedOth'], r['net'], r['payDate'], r['status']])
    js = []
    js.append("/* 工资种子（自动生成，勿手改）— 中为财税 2023~2026 工资表 */")
    js.append("(function (w) {")
    js.append("  var NAMES = " + json_arr(nameArr) + ";")
    js.append("  var SRC = " + json_arr(srcArr) + ";")
    js.append("  // [id, year, month, nameIdx, srcIdx, base, perf, att, social, meal, gross, dedAbs, dedOth, net, payDate, status]")
    js.append("  var R = " + json2(rows) + ";")
    js.append("  w.SEED_SALARY = R.map(function (r) { return {")
    js.append("    id: r[0], year: r[1], month: r[2], name: NAMES[r[3]], src: SRC[r[4]],")
    js.append("    base: r[5], perf: r[6], att: r[7], social: r[8], meal: r[9], gross: r[10],")
    js.append("    dedAbs: r[11], dedOth: r[12], net: r[13], payDate: r[14], status: r[15]")
    js.append("  }; });")
    js.append("  w.SEED_SALARY_YEARS = [2023, 2024, 2025, 2026];")
    js.append("})(window);")
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(js) + '\n')
    print("已写出:", os.path.abspath(OUT))

def json_arr(a):
    return '[' + ','.join("'" + x.replace("'", "\\'") + "'" for x in a) + ']'

def json2(rows):
    # 行数组，数字原样，字符串加引号
    parts = []
    for r in rows:
        cells = []
        for v in r:
            if isinstance(v, (int, float)):
                cells.append(str(v))
            else:
                cells.append("'" + str(v).replace("'", "\\'").replace('\\', '\\\\') + "'")
        parts.append('[' + ','.join(cells) + ']')
    return '[' + ','.join(parts) + ']'

if __name__ == '__main__':
    main()

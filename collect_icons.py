# -*- coding: utf-8 -*-
"""
图标批量采集脚本
方案：纯标准库 urllib + Iconify API，无需安装第三方包

已验证可用图标集：
- Tabler Icons（MIT 许可证，可商用）https://icon-sets.iconify.design/tabler/
- MingCute（国产开源）https://icon-sets.iconify.design/mingcute/

URL 格式（已验证）：https://api.iconify.design/{prefix}/{icon-name}.svg
颜色参数：直接在 URL 加 ?color=%23RRGGBB（无需 API key）
"""
import os, sys, re, time, json, urllib.request

BRAND_COLOR = '789262'   # 竹青色（国风主色）
OUT_DIR = os.path.join(os.path.dirname(__file__), 'assets', 'images', 'ingredients')
os.makedirs(OUT_DIR, exist_ok=True)

# ========== 已验证可用图标清单 ==========
# (iconify_id, 本地文件名, 烹饪用途说明)
VALID_ICONS = [
    # === 蛋白/肉类 ===
    ('tabler:meat',          'meat.svg',         '鸡肉/猪肉/红肉'),
    ('tabler:fish',          'fish.svg',          '鱼/海鲜'),
    ('tabler:egg',          'egg.svg',           '鸡蛋'),
    # === 蔬菜/食材 ===
    ('tabler:carrot',       'carrot.svg',        '根茎蔬菜'),
    ('tabler:pepper',       'pepper.svg',        '辣椒'),
    ('tabler:leaf',         'leaf.svg',          '青菜/绿叶菜'),
    ('tabler:apple',        'apple.svg',         '水果/苹果'),
    # === 主食/面食 ===
    ('tabler:grain',        'grain.svg',         '米/谷物'),
    ('tabler:wheat',        'wheat.svg',         '小麦/面粉'),
    ('tabler:bread',        'bread.svg',         '面食/饺子/馒头'),
    ('tabler:cake',         'cake.svg',          '点心/糕点'),
    # === 烹饪方式 ===
    ('tabler:flame',        'flame.svg',         '灶火/炒菜'),
    ('tabler:campfire',     'campfire.svg',      '炭火/烧烤'),
    ('tabler:steam',        'steam.svg',         '蒸汽/蒸菜'),
    # === 器具 ===
    ('tabler:bowl',         'bowl.svg',          '碗/汤碗'),
    ('tabler:cup',          'cup.svg',           '杯子/茶杯'),
    ('tabler:glass',        'glass.svg',         '玻璃杯/杯盏'),
    ('tabler:mug',          'mug.svg',           '大杯/汤盅'),
    ('tabler:bottle',       'bottle.svg',        '瓶子/调料瓶'),
    ('tabler:beer',         'beer.svg',          '啤酒/料酒'),
    ('tabler:droplet',      'droplet.svg',       '油滴/水滴'),
    ('tabler:soup',         'soup.svg',          '汤品/煲汤'),
    # === 厨房工具 ===
    ('tabler:tools-kitchen',  'tools-kitchen.svg',  '厨房工具组'),
    ('tabler:tools-kitchen-2','tools-kitchen-2.svg','厨房工具组2'),
    ('tabler:tools-kitchen-3','tools-kitchen-3.svg','厨房工具组3'),
    ('tabler:axe',          'axe.svg',            '剁肉斧（替代）'),
    ('tabler:pin',          'pin.svg',            '擀面杖/针（面食）'),
    ('tabler:salt',         'salt.svg',          '盐'),
    # === 厨师/厨房角色 ===
    ('tabler:chef-hat',     'chef-hat.svg',      '厨师帽'),
    # === MingCute 补充 ===
    ('mingcute:egg-line',         'egg-line.svg',      '鸡蛋（MingCute）'),
    ('mingcute:pot-line',         'pot-line.svg',      '锅/砂锅'),
    ('mingcute:knife-line',       'knife-line.svg',    '菜刀'),
    ('mingcute:chopsticks-line',  'chopsticks.svg',   '筷子'),
    ('mingcute:steam-line',       'steam-line.svg',    '蒸汽（MingCute）'),
]


def download_icon(icon_id: str, filename: str, usage: str, color: str = BRAND_COLOR) -> dict:
    """下载单个 SVG 图标"""
    if ':' in icon_id:
        prefix, icon_name = icon_id.split(':', 1)
    else:
        prefix = 'tabler'
        icon_name = icon_id

    # 正确格式（已验证）：https://api.iconify.design/{prefix}/{name}.svg
    url = f'https://api.iconify.design/{prefix}/{icon_name}.svg?color=%23{color}'
    out_path = os.path.join(OUT_DIR, filename)

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            with open(out_path, 'wb') as f:
                f.write(content)
        size = os.path.getsize(out_path)
        return {'icon_id': icon_id, 'filename': filename, 'usage': usage,
                'status': 'OK', 'size_kb': round(size / 1024, 1), 'url': url}
    except Exception as e:
        return {'icon_id': icon_id, 'filename': filename, 'usage': usage,
                'status': f'FAIL: {e}', 'size_kb': 0, 'url': url}


def build_svg_sprite(icon_dir: str) -> str:
    """将所有 SVG 合并为一个 SVG sprite"""
    xmlns = 'http://www.w3.org/2000/svg'
    symbols = []
    for fname in sorted(os.listdir(icon_dir)):
        if not fname.endswith('.svg') or fname.endswith('-sprite.svg'):
            continue
        with open(os.path.join(icon_dir, fname), 'r', encoding='utf-8') as f:
            raw = f.read()
        vb = re.search(r'viewBox=["\']([^"\']+)["\']', raw)
        viewbox = vb.group(1) if vb else '0 0 24 24'
        d_m = re.search(r'<path[^>]+d=["\']([^"\']+)["\']', raw)
        d = d_m.group(1) if d_m else ''
        symbols.append(f'  <symbol id="icon-{fname[:-4]}" viewBox="{viewbox}"><path d="{d}"/></symbol>')
    sprite = f'<svg xmlns="{xmlns}" style="display:none">\n' + '\n'.join(symbols) + '\n</svg>'
    path = os.path.join(icon_dir, 'ingredients-sprite.svg')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(sprite)
    return path


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

    print('=' * 55)
    print('  [至善百味行] 图标批量采集脚本')
    print(f'  输出目录 : {OUT_DIR}')
    print(f'  颜色     : #{BRAND_COLOR} (竹青)')
    print(f'  图标数量 : {len(VALID_ICONS)}')
    print('=' * 55)

    results = []
    ok, fail = 0, 0

    for icon_id, filename, usage in VALID_ICONS:
        time.sleep(0.08)   # 礼貌限速
        r = download_icon(icon_id, filename, usage)
        results.append(r)
        icon = '[OK]' if r['status'] == 'OK' else '[FAIL]'
        print(f'  {icon:7} {icon_id:30} -> {filename:30} ({usage})')
        if r['status'] == 'OK':
            ok += 1
        else:
            fail += 1

    print()
    print('=' * 55)
    print(f'  采集完成: {ok} 成功 / {fail} 失败 / {ok+fail} 总计')
    print('=' * 55)

    # SVG Sprite
    try:
        sp = build_svg_sprite(OUT_DIR)
        print(f'  SVG Sprite: {sp}  ({os.path.getsize(sp)//1024}KB)')
    except Exception as e:
        print(f'  SVG Sprite 生成失败: {e}')

    # JSON 报告
    report = {
        'summary': {'total': ok+fail, 'ok': ok, 'fail': fail},
        'color': f'#{BRAND_COLOR}',
        'results': results
    }
    rpath = os.path.join(OUT_DIR, 'collect_report.json')
    with open(rpath, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f'  报告: {rpath}')
    return results


if __name__ == '__main__':
    main()

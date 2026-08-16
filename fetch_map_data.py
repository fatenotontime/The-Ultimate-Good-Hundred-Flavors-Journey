# -*- coding: utf-8 -*-
"""
生成中国地图 SVG（assets/map/china.svg）
数据源：从 DataV.GeoAtlas 获取 GeoJSON，直接投影转换
"""
import json
import math
import os
import urllib.request

OUT_DIR = os.path.join(os.path.dirname(__file__), 'assets', 'map')
OUT_FILE = os.path.join(OUT_DIR, 'china.svg')
GEOJSON_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'

# 省份 id 映射
PROVINCE_IDS = {
    '北京': 'beijing', '天津': 'tianjin', '河北': 'hebei', '山西': 'shanxi',
    '内蒙古': 'neimenggu', '辽宁': 'liaoning', '吉林': 'jilin', '黑龙江': 'heilongjiang',
    '上海': 'shanghai', '江苏': 'jiangsu', '浙江': 'zhejiang', '安徽': 'anhui',
    '福建': 'fujian', '江西': 'jiangxi', '山东': 'shandong', '河南': 'henan',
    '湖北': 'hubei', '湖南': 'hunan', '广东': 'guangdong', '广西': 'guangxi',
    '海南': 'hainan', '重庆': 'chongqing', '四川': 'sichuan', '贵州': 'guizhou',
    '云南': 'yunnan', '西藏': 'xizang', '陕西': 'shaanxi', '甘肃': 'gansu',
    '青海': 'qinghai', '宁夏': 'ningxia', '新疆': 'xinjiang', '台湾': 'taiwan',
    '香港': 'xianggang', '澳门': 'aomen',
}
# 名称别名（GeoJSON 全称 → 标准简称）
NAME_ALIASES = {
    '北京市': '北京', '天津市': '天津', '河北省': '河北', '山西省': '山西',
    '内蒙古自治区': '内蒙古', '辽宁省': '辽宁', '吉林省': '吉林', '黑龙江省': '黑龙江',
    '上海市': '上海', '江苏省': '江苏', '浙江省': '浙江', '安徽省': '安徽',
    '福建省': '福建', '江西省': '江西', '山东省': '山东', '河南省': '河南',
    '湖北省': '湖北', '湖南省': '湖南', '广东省': '广东', '广西壮族自治区': '广西',
    '海南省': '海南', '重庆市': '重庆', '四川省': '四川', '贵州省': '贵州',
    '云南省': '云南', '西藏自治区': '西藏', '陕西省': '陕西', '甘肃省': '甘肃',
    '青海省': '青海', '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆',
    '台湾省': '台湾', '香港特别行政区': '香港', '澳门特别行政区': '澳门',
}


def project(lon, lat):
    """等角投影（简化）：经纬度 → SVG 像素坐标
    SVG y轴向下，纬度向北增加所以要取负，x不变"""
    R = 150
    x = R * (lon / 180)
    # Y 取负：SVG 坐标系 y 向下，纬度向北 → y 应向上
    y = -R * (math.log(math.tan(math.pi / 4 + lat * math.pi / 360)) / math.pi)
    return x, y


# 记录所有投影点的边界（用于精确贴合 viewBox）
_BOUNDS = {'min_x': float('inf'), 'min_y': float('inf'),
           'max_x': float('-inf'), 'max_y': float('-inf')}


def _track(x, y):
    if x < _BOUNDS['min_x']: _BOUNDS['min_x'] = x
    if y < _BOUNDS['min_y']: _BOUNDS['min_y'] = y
    if x > _BOUNDS['max_x']: _BOUNDS['max_x'] = x
    if y > _BOUNDS['max_y']: _BOUNDS['max_y'] = y


def ring_to_path(coords):
    """将一个环的坐标数组转为 SVG path d 字符串

    coords 可能是：
      - [[lon,lat], [lon,lat], ...]  普通环
      - [lon, lat]                   单点（退化情形）
    """
    if not coords:
        return ''
    first = coords[0]
    # 单点退化：coords = [lon, lat]
    if isinstance(first, (int, float)):
        x, y = project(coords[0], coords[1])
        _track(x, y)
        return f'{x:.2f},{y:.2f}'
    # 普通环：坐标对列表
    pts = []
    for c in coords:
        if not isinstance(c, (list, tuple)) or len(c) < 2:
            continue
        x, y = project(c[0], c[1])
        _track(x, y)
        pts.append(f'{x:.2f},{y:.2f}')
    return ('M' + ' L'.join(pts) + 'Z') if pts else ''


def coords_to_path(coords_list):
    """GeoJSON coordinates 嵌套层级：
    MultiPolygon → Polygon → Ring → Point
    """
    if not coords_list:
        return ''
    first = coords_list[0]
    # 单点或单环（直接是坐标对数组）
    if isinstance(first, (int, float)):
        return ring_to_path(coords_list)
    if isinstance(first, list) and len(first) == 2 and isinstance(first[0], (int, float)):
        return ring_to_path(coords_list)
    # 多层嵌套：递归处理每个子级
    parts = []
    for item in coords_list:
        if not item:
            continue
        d = coords_to_path(item)
        if d:
            parts.append(d)
    return ' '.join(parts)


def build_svg(geojson):
    global _BOUNDS
    _BOUNDS = {'min_x': float('inf'), 'min_y': float('inf'),
               'max_x': float('-inf'), 'max_y': float('-inf')}
    os.makedirs(OUT_DIR, exist_ok=True)
    features = geojson.get('features', [])
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" '
        'role="img" aria-label="中国省级行政区交互地图">',
        '  <g id="china-provinces">',
    ]
    used, missed = [], []
    for feat in features:
        raw = feat.get('properties', {}).get('name', '')
        if not raw:
            continue
        aliased = NAME_ALIASES.get(raw, raw)
        pid = PROVINCE_IDS.get(aliased)
        if not pid:
            missed.append(raw)
            continue
        coords = feat.get('geometry', {}).get('coordinates', [])
        d = coords_to_path(coords)
        if d:
            lines.append(f'    <path class="province" data-province="{pid}" '
                        f'data-name="{aliased}" d="{d}" />')
            used.append((pid, aliased))

    # 根据所有省份的实际投影边界计算 viewBox，并留 3% 内边距
    pad_x = (_BOUNDS['max_x'] - _BOUNDS['min_x']) * 0.03
    pad_y = (_BOUNDS['max_y'] - _BOUNDS['min_y']) * 0.03
    vx = _BOUNDS['min_x'] - pad_x
    vy = _BOUNDS['min_y'] - pad_y
    vw = (_BOUNDS['max_x'] - _BOUNDS['min_x']) + pad_x * 2
    vh = (_BOUNDS['max_y'] - _BOUNDS['min_y']) + pad_y * 2
    view_box = f'{vx:.2f} {vy:.2f} {vw:.2f} {vh:.2f}'
    lines[1] = lines[1].replace('viewBox="0 0 1 1"', f'viewBox="{view_box}"')

    lines.extend(['  </g>', '</svg>'])
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    return used, missed, view_box


def main():
    print(f'下载 GeoJSON: {GEOJSON_URL}')
    req = urllib.request.Request(GEOJSON_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as resp:
        geojson = json.loads(resp.read().decode('utf-8'))
    features = geojson.get('features', [])
    print(f'共 {len(features)} 个行政区')
    used, missed, view_box = build_svg(geojson)
    print(f'已生成 {OUT_FILE}（{os.path.getsize(OUT_FILE)} bytes）')
    print(f'viewBox: {view_box}')
    print(f'成功注入 {len(used)} 个：{", ".join(p + "(" + n + ")" for p, n in used)}')
    if missed:
        print(f'未匹配: {missed}')


if __name__ == '__main__':
    main()

# -*- coding: utf-8 -*-
"""
图片素材处理脚本
依据《至善百味行网站设计思路书》4.2 图片数据规范：
- 缩略图  400x300  WebP 质量75  {dish-id}-thumb.webp
- 大图    1200x800 WebP 质量85  {dish-id}-full.webp
- 省份横幅 1920x400 WebP 质量85  banner.webp
所有图片居中裁剪为 4:3（横幅按 1920:400 裁剪）后生成
"""
import os
from PIL import Image

SRC_ROOT = os.path.join(os.path.dirname(__file__), 'image')
OUT_ROOT = os.path.join(os.path.dirname(__file__), 'assets', 'images', 'provinces')

# 省份目录 → (省份id, 菜品列表)
# 菜品: (源文件名, dish-id, 菜名, 口味标签)
PROVINCES = {
    '安徽': {
        'id': 'anhui',
        'dishes': [
            ('地锅鸡配锅贴.png', 'diguoji', '地锅鸡配锅贴', ['咸鲜', '炖菜', '农家']),
            ('煎饺抱蛋.png', 'jianjiao-baodan', '煎饺抱蛋', ['香脆', '家常', '下饭']),
            ('蛋花汤.jpeg', 'danhuatang', '蛋花汤', ['清淡', '汤品', '暖胃']),
        ],
    },
}

THUMB_SIZE = (400, 300)     # 4:3
FULL_SIZE  = (1200, 800)    # 4:3
BANNER_SIZE = (1920, 400)   # 横幅


def crop_to_ratio(img, ratio_w, ratio_h):
    """居中裁剪为指定宽高比"""
    w, h = img.size
    target = ratio_w / ratio_h
    if w / h > target:
        # 过宽：裁剪宽度
        new_w = int(h * target)
        left = (w - new_w) // 2
        return img.crop((left, 0, left + new_w, h))
    else:
        # 过高：裁剪高度
        new_h = int(w / target)
        top = (h - new_h) // 2
        return img.crop((0, top, w, top + new_h))


def save_webp(img, path, quality):
    img.save(path, 'WEBP', quality=quality, method=6)
    rel = os.path.relpath(path, os.path.dirname(__file__))
    print(f'  → {rel} ({os.path.getsize(path) // 1024}KB)')


def main():
    for prov_dir, prov_info in PROVINCES.items():
        prov_id = prov_info['id']
        src_dir = os.path.join(SRC_ROOT, prov_dir)
        if not os.path.isdir(src_dir):
            print(f'[跳过] 目录不存在: {src_dir}')
            continue
        out_dir = os.path.join(OUT_ROOT, prov_id)
        os.makedirs(out_dir, exist_ok=True)

        print(f'处理省份: {prov_dir} ({prov_id})')

        for src_name, dish_id, dish_name, tags in prov_info['dishes']:
            src_path = os.path.join(src_dir, src_name)
            if not os.path.isfile(src_path):
                print(f'  [未找到] {src_name}')
                continue
            try:
                img = Image.open(src_path)
                img = img.convert('RGB')
            except Exception as e:
                print(f'  [失败] {src_name}: {e}')
                continue

            print(f'  {src_name} → {dish_name} ({dish_id})')

            # 缩略图 400x300
            thumb = crop_to_ratio(img, 4, 3).resize(THUMB_SIZE, Image.LANCZOS)
            save_webp(thumb, os.path.join(out_dir, f'{dish_id}-thumb.webp'), 75)

            # 大图 1200x800
            full = crop_to_ratio(img, 4, 3).resize(FULL_SIZE, Image.LANCZOS)
            save_webp(full, os.path.join(out_dir, f'{dish_id}-full.webp'), 85)

        # 横幅：取第一道菜的原图
        first_src = prov_info['dishes'][0][0]
        banner_path = os.path.join(src_dir, first_src)
        if os.path.isfile(banner_path):
            img = Image.open(banner_path).convert('RGB')
            banner = crop_to_ratio(img, 1920, 400).resize(BANNER_SIZE, Image.LANCZOS)
            save_webp(banner, os.path.join(out_dir, 'banner.webp'), 85)


if __name__ == '__main__':
    main()

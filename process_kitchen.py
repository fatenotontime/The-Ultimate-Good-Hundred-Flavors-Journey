# -*- coding: utf-8 -*-
"""
厨房场景完整处理脚本
1. 完整背景（不裁剪、不压缩）
2. 三个器具精准裁剪
3. 蒸屉/砂锅：盖子+主体拆分
"""
from PIL import Image
import os

SRC = r'D:\至善百味行\image\至善小当家'
OUT = r'D:\至善百味行\assets\images\kitchen'
os.makedirs(OUT, exist_ok=True)

# 器具裁剪坐标（底座中心，原图坐标 2848x1600）
UTENSILS = {
    'wok':     {'cx': 430, 'cy': 770, 'crop_w': 240, 'crop_h': 200},  # 黑色铁炒锅
    'steamer': {'cx': 810, 'cy': 760, 'crop_w': 240, 'crop_h': 200},  # 竹制蒸笼
    'claypot': {'cx': 1190, 'cy': 770, 'crop_w': 240, 'crop_h': 200},  # 棕色砂锅
}

def crop_center(img, cx, cy, crop_w, crop_h):
    """以(cx,cy)为中心裁剪，返回调整后的Image"""
    x1 = max(0, cx - crop_w // 2)
    y1 = max(0, cy - crop_h // 2)
    x2 = min(img.width, cx + crop_w // 2)
    y2 = min(img.height, cy + crop_h // 2)
    return img.crop((x1, y1, x2, y2))

def save_webp(img, path, quality=92):
    img.save(path, 'WEBP', quality=quality, method=6)
    sz = os.path.getsize(path)
    print(f'  {os.path.basename(path)}: {img.width}x{img.height} -> {sz//1024}KB')

# ============================================================
# 1. 完整背景（不压缩）
# ============================================================
print('=== 背景处理 ===')
bg = Image.open(os.path.join(SRC, '厨房背景.png')).convert('RGB')
bg_out = os.path.join(OUT, 'kitchen-bg.webp')
bg.save(bg_out, 'WEBP', quality=95, method=6)
print(f'  kitchen-bg.webp: {bg.width}x{bg.height} -> {os.path.getsize(bg_out)//1024}KB (uncompressed display)')

# 横幅：从背景裁顶部
banner = bg.crop((0, 0, bg.width, int(bg.height * 0.25)))
banner_out = os.path.join(OUT, 'kitchen-banner.webp')
banner.save(banner_out, 'WEBP', quality=90, method=6)
print(f'  kitchen-banner.webp: {banner.width}x{banner.height} -> {os.path.getsize(banner_out)//1024}KB')

# ============================================================
# 2. 裁剪三个器具
# ============================================================
print()
print('=== 器具裁剪 ===')
for ut_id, info in UTENSILS.items():
    crop = crop_center(bg, info['cx'], info['cy'], info['crop_w'], info['crop_h'])
    out = os.path.join(OUT, f'{ut_id}.webp')
    save_webp(crop, out, quality=90)

# ============================================================
# 3. 拆分：蒸屉盖/蒸屉主体
# ============================================================
print()
print('=== 蒸屉拆分 ===')
steamer_full = Image.open(os.path.join(SRC, '蒸屉.png')).convert('RGBA')
steamer_body = Image.open(os.path.join(SRC, '蒸屉主体.png')).convert('RGBA')
steamer_lid  = Image.open(os.path.join(SRC, '蒸屉盖.png')).convert('RGBA')

def resize_and_save(img, basename, max_size=200):
    """等比缩放到 max_size 宽，保持透明通道"""
    w, h = img.size
    if w > max_size:
        new_w = max_size
        new_h = int(h * max_size / w)
        img = img.resize((new_w, new_h), Image.LANCZOS)
    out = os.path.join(OUT, basename)
    img.save(out, 'WEBP', quality=90)
    print(f'  {basename}: {img.width}x{img.height}')

resize_and_save(steamer_full, 'steamer-full.webp')
resize_and_save(steamer_body, 'steamer-body.webp')
resize_and_save(steamer_lid,  'steamer-lid.webp')

# ============================================================
# 4. 拆分：砂锅盖/砂锅主体
# ============================================================
print()
print('=== 砂锅拆分 ===')
claypot_full = Image.open(os.path.join(SRC, '砂锅.png')).convert('RGBA')
claypot_body = Image.open(os.path.join(SRC, '砂锅主体.png')).convert('RGBA')
claypot_lid  = Image.open(os.path.join(SRC, '砂锅盖.png')).convert('RGBA')

resize_and_save(claypot_full, 'claypot-full.webp')
resize_and_save(claypot_body, 'claypot-body.webp')
resize_and_save(claypot_lid,  'claypot-lid.webp')

# ============================================================
# 5. 铁锅（整体，无拆分）
# ============================================================
print()
print('=== 铁锅 ===')
wok_full = Image.open(os.path.join(SRC, '锅.png')).convert('RGBA')
resize_and_save(wok_full, 'wok-full.webp')

print()
print('=== 完成 ===')
print(f'输出目录: {OUT}')

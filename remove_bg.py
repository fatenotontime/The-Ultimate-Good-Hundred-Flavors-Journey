# -*- coding: utf-8 -*-
"""
器具白色背景去除脚本
思路：RGB三通道都高于阈值 → 置透明
软边界版本：边缘按距离渐变透明，无硬边
"""
from PIL import Image
import numpy as np
import os

# 器具文件（相对于 image/至善小当家/）
UTENSILS = [
    # (源文件, 输出文件, 白色阈值)
    ('锅.png',        'wok-full.png',       130),
    ('蒸屉.png',      'steamer-full.png',   150),
    ('蒸屉主体.png',  'steamer-body.png',   150),
    ('蒸屉盖.png',    'steamer-lid.png',    150),
    ('砂锅.png',      'claypot-full.png',   130),
    ('砂锅主体.png',  'claypot-body.png',   130),
    ('砂锅盖.png',    'claypot-lid.png',    130),
]


def remove_white_bg_soft(img: Image.Image, threshold: int, edge_margin: int = 6) -> Image.Image:
    """
    软边界去背：白色像素中心全透明，边缘渐变过渡
    """
    img = img.convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]

    # 饱和度 = max - min（背景纯白/灰白饱和度低，器具颜色有饱和度）
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = mx - mn

    # 白色背景判定：亮度高于阈值 且 饱和度低（<55 视为背景白/灰，更激进）
    white = (r > threshold) & (g > threshold) & (b > threshold) & (sat < 55)

    # 用距离变换：白色中心=0，边缘=edge_margin
    dist = np.zeros_like(r, dtype=np.float32)
    dist[~white] = 0
    if white.any():
        # 到最近非白色像素的欧氏距离
        from scipy.ndimage import distance_transform_edt
        dist[white] = distance_transform_edt(~white)[white]
        dist[white] = np.clip(dist[white], 0, edge_margin)

    # 透明度 = 距离越远越透明（0=中心白=透明，1=边缘=不透明）
    alpha_ratio = (dist / edge_margin) ** 0.6  # 0.6让过渡更自然
    new_a = np.where(white, (a * alpha_ratio).astype(np.uint8), a)
    arr[:,:,3] = np.clip(new_a, 0, 255).astype(np.uint8)

    return Image.fromarray(arr.astype(np.uint8), 'RGBA')


def analyze(img: Image.Image):
    """分析亮度分布"""
    arr = np.array(img.convert('RGB'))
    br = arr.mean(axis=2)
    total = br.size
    white = (br > 200).sum() / total * 100
    dark  = (br < 60).sum()  / total * 100
    print(f'    bright={white:.1f}% dark={dark:.1f}%')


def main():
    # 硬编码路径，避免中文目录编码问题
    src_dir = r'D:\至善百味行\image\至善小当家'
    out_dir = r'D:\至善百味行\assets\images\kitchen'
    os.makedirs(out_dir, exist_ok=True)

    print(f'Src: {src_dir}')
    print(f'Out: {out_dir}')
    print()

    for src_name, out_name, threshold in UTENSILS:
        src_path = os.path.join(src_dir, src_name)
        if not os.path.exists(src_path):
            print(f'  SKIP {src_name} (not found)')
            continue

        img = Image.open(src_path)
        print(f'  [{threshold}] {src_name} -> {out_name}')
        analyze(img)

        result = remove_white_bg_soft(img, threshold, edge_margin=8)
        out_path = os.path.join(out_dir, out_name)
        result.save(out_path, 'PNG')
        sz = os.path.getsize(out_path)
        print(f'    saved: {result.width}x{result.height} {sz//1024}KB')

    print()
    print('Done.')


if __name__ == '__main__':
    main()

# -*- coding: utf-8 -*-
"""尝试下载 GSAP 核心库与 Draggable 插件到本地 vendor 目录"""
import urllib.request
import os

OUT = r'D:\至善百味行\assets\vendor'
os.makedirs(OUT, exist_ok=True)

FILES = {
    'gsap.min.js': 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
    'Draggable.min.js': 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/Draggable.min.js',
}

for name, url in FILES.items():
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        path = os.path.join(OUT, name)
        with open(path, 'wb') as f:
            f.write(data)
        print(f'✓ {name}: {len(data)} bytes')
    except Exception as e:
        print(f'✗ {name}: {e}')

print('Done.')

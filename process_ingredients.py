# -*- coding: utf-8 -*-
from PIL import Image
import os
import shutil

# 配置路径
source_folder = r'image\食材'
target_folder = r'assets\images\ingredients'

# 确保目标目录存在
os.makedirs(target_folder, exist_ok=True)

# 文件名映射：中文名 -> 英文文件名
name_mapping = {
    '鸡肉手绘线稿图标.png': 'chicken.png',
    '猪肉手绘线稿图标 .png': 'pork.png',
    '羊肉手绘线稿图标 .png': 'lamb.png',
    '鸡蛋手绘线稿图标 .png': 'egg.png',
    '面粉手绘线稿图标 .png': 'flour.png',
    '糯米手绘线稿图标 .png': 'glutinous-rice.png',
    '大米手绘线稿图标 .png': 'rice.png',
    '葱手绘线稿图标 .png': 'scallion.png',
    '红枣手绘线稿图标 .png': 'red-date.png',
}

# 目标尺寸
target_size = (120, 120)

def process_image(src_path, dst_path):
    """处理单张图片：缩放到120x120，保持透明通道"""
    img = Image.open(src_path)
    
    # 检查是否有透明通道
    if img.mode in ('RGBA', 'LA', 'P'):
        # 转换为 RGBA 确保透明通道正确
        img = img.convert('RGBA')
    else:
        # 如果没有透明通道，转换为 RGBA（透明背景）
        img = img.convert('RGBA')
    
    # 缩放（使用 LANCZOS 高质量缩放）
    img.thumbnail(target_size, Image.Resampling.LANCZOS)
    
    # 创建 120x120 的透明画布，将图片居中放置
    result = Image.new('RGBA', target_size, (0, 0, 0, 0))
    
    # 计算居中位置
    x = (target_size[0] - img.width) // 2
    y = (target_size[1] - img.height) // 2
    
    result.paste(img, (x, y), img if img.mode == 'RGBA' else None)
    
    # 保存为 PNG（透明背景）
    result.save(dst_path, 'PNG')
    print(f'已处理: {src_path} -> {dst_path}')

# 遍历处理
for filename, target_name in name_mapping.items():
    src_path = os.path.join(source_folder, filename)
    dst_path = os.path.join(target_folder, target_name)
    
    if os.path.exists(src_path):
        process_image(src_path, dst_path)
    else:
        print(f'文件不存在: {src_path}')

print('\n处理完成！')

# -*- coding: utf-8 -*-
import zipfile, re

path = r'D:\至善百味行\社会实践\安徽\宿州.docx'
with zipfile.ZipFile(path) as z:
    xml = z.read('word/document.xml').decode('utf-8')

# 按段落提取文本
paras = re.findall(r'<w:p[ >].*?</w:p>', xml, re.S)
print(f'段落数: {len(paras)}')
for i, p in enumerate(paras):
    texts = re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)
    line = ''.join(texts).strip()
    if line:
        print(f'[{i}] {line}')

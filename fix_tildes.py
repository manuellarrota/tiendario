# -*- coding: utf-8 -*-
import os
import re

def remove_accents(text):
    accents = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N'
    }
    for k, v in accents.items():
        text = text.replace(k, v)
    return text

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find log lines: log.info("...", ...);
    # This regex matches logger calls and replaces accents inside the string literals
    def replacer(match):
        method_call = match.group(1) # e.g. log.info(
        string_content = match.group(2) # "..."
        rest = match.group(3)
        # remove accents from the string
        clean_string = remove_accents(string_content)
        return method_call + clean_string + rest

    # Regex: (log(?:ger)?\.(?:info|warn|error|debug|trace)\s*\(\s*)(".*?")(.*?\))
    # It might span multiple lines, let's keep it simple and just replace accents on lines containing log. or logger.
    
    lines = content.split('\n')
    modified = False
    for i in range(len(lines)):
        line = lines[i]
        if 'log.' in line or 'logger.' in line or 'System.out' in line:
            clean_line = remove_accents(line)
            if clean_line != line:
                lines[i] = clean_line
                modified = True
                
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print("Fixed: " + filepath)

for root, dirs, files in os.walk('d:/emprendimiento/antigravity/tiendario/backend/src/main/java'):
    for file in files:
        if file.endswith('.java'):
            process_file(os.path.join(root, file))

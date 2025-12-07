#!/usr/bin/env python3
"""
Массовое исправление всех backend функций:
1. OPTIONS statusCode 200 → 204
2. Добавить isBase64Encoded: False во все return где его нет
"""
import os
import glob

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

def fix_function(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    modified = False
    new_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Fix 1: OPTIONS statusCode 200 → 204
        if "'statusCode': 200" in line or '"statusCode": 200' in line:
            # Check if this is in OPTIONS block (look at previous 5 lines)
            context = ''.join(lines[max(0, i-5):i+1])
            if 'OPTIONS' in context:
                line = line.replace("'statusCode': 200", "'statusCode': 204")
                line = line.replace('"statusCode": 200', '"statusCode": 204')
                modified = True
        
        new_lines.append(line)
        
        # Fix 2: Add isBase64Encoded after 'body': line if missing
        if ("'body':" in line or '"body":' in line) and 'return' not in line:
            # Check next 2 lines for isBase64Encoded
            next_lines = ''.join(lines[i:min(i+3, len(lines))])
            if 'isBase64Encoded' not in next_lines and '}' in next_lines:
                # Find indent
                indent = len(line) - len(line.lstrip())
                # Insert isBase64Encoded before closing }
                j = i + 1
                while j < len(lines) and '}' not in lines[j]:
                    new_lines.append(lines[j])
                    j += 1
                # Add isBase64Encoded
                new_lines.append(' ' * indent + "'isBase64Encoded': False\n")
                modified = True
                # Now add the closing }
                if j < len(lines):
                    new_lines.append(lines[j])
                    i = j
        
        i += 1
    
    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        return True
    return False

# Find all index.py files
functions = glob.glob(os.path.join(BACKEND_DIR, '*/index.py'))
functions = [f for f in functions if 'webapp' not in f]

print(f"Found {len(functions)} functions to check\n")

fixed = []
for func_path in sorted(functions):
    func_name = os.path.basename(os.path.dirname(func_path))
    if fix_function(func_path):
        print(f"✓ Fixed {func_name}")
        fixed.append(func_name)
    else:
        print(f"- {func_name} (no changes)")

print(f"\n✅ Fixed {len(fixed)} functions")

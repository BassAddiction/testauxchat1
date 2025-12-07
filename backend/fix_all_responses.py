#!/usr/bin/env python3
import os
import re

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

def fix_response_format(file_path):
    """Add isBase64Encoded to all return statements missing it"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern: return { ... } without isBase64Encoded
    # Look for return statements with statusCode but no isBase64Encoded
    def add_isbase64(match):
        ret_content = match.group(1)
        # Check if isBase64Encoded already present
        if 'isBase64Encoded' in ret_content:
            return match.group(0)
        
        # Find where to insert (before closing brace)
        # Insert after 'body' line if present, otherwise before last '}'
        lines = ret_content.split('\n')
        result_lines = []
        inserted = False
        
        for i, line in enumerate(lines):
            result_lines.append(line)
            # Insert after body line or after headers line
            if not inserted and ("'body'" in line or '"body"' in line):
                indent = len(line) - len(line.lstrip())
                result_lines.append(' ' * indent + "'isBase64Encoded': False,")
                inserted = True
        
        if not inserted and len(result_lines) > 0:
            # Insert before last closing brace
            last_line_idx = len(result_lines) - 1
            while last_line_idx >= 0:
                if '}' in result_lines[last_line_idx]:
                    indent = len(result_lines[last_line_idx]) - len(result_lines[last_line_idx].lstrip())
                    result_lines.insert(last_line_idx, ' ' * (indent + 4) + "'isBase64Encoded': False")
                    inserted = True
                    break
                last_line_idx -= 1
        
        return 'return {\n' + '\n'.join(result_lines[1:])
    
    # Match return { ... } blocks
    content = re.sub(
        r"return \{([^}]+\}(?:\s*,\s*['\"](?:body|headers|statusCode)['\"]:\s*[^}]+)*)\}",
        add_isbase64,
        content,
        flags=re.DOTALL
    )
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    functions_fixed = []
    
    for item in os.listdir(BACKEND_DIR):
        func_dir = os.path.join(BACKEND_DIR, item)
        if not os.path.isdir(func_dir) or item == 'webapp':
            continue
        
        index_file = os.path.join(func_dir, 'index.py')
        if os.path.exists(index_file):
            print(f"Checking {item}/index.py...")
            if fix_response_format(index_file):
                functions_fixed.append(item)
                print(f"  ✓ Fixed {item}")
            else:
                print(f"  - No changes needed for {item}")
    
    print(f"\n✓ Fixed {len(functions_fixed)} functions:")
    for func in functions_fixed:
        print(f"  - {func}")

if __name__ == '__main__':
    main()

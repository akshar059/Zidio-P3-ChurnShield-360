import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    # Replace .toLocaleString() with .toLocaleString('en-US')
    # but not if it already has arguments
    fixed = re.sub(r'\.toLocaleString\(\)', ".toLocaleString('en-US')", content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(fixed)
    print(f"Fixed {filepath}")

fix_file('public/js/charts.js')
fix_file('public/js/app.js')

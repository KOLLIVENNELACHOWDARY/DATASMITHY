"""
Run this from your project root:
  python fix_border_keys.py

Fixes duplicate 'border' key in AdminDash.jsx and ConnectorsTab.jsx
"""
import re, os

def fix_file(path):
    if not os.path.exists(path):
        print(f"SKIP (not found): {path}")
        return
    with open(path, encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Look for a line with 'border:' that comes right after another 'border:' within the same style block
        # Strategy: track border: occurrences in a sliding window of 15 lines
        if 'border:' in line and i > 0:
            # Check if any of the previous 12 lines (still in same object) had 'border:'
            window = ''.join(lines[max(0,i-12):i])
            # Count opening and closing braces in window to ensure same object
            open_b  = window.count('{{') * 2 + window.count('{') - window.count('}}') * 2 - window.count('}')
            if 'border:' in window and open_b > 0:
                # This is a duplicate — rename to outline:
                line = line.replace('border:', 'outline:', 1)
                print(f"  Fixed duplicate border → outline in {path} at line {i+1}")
        new_lines.append(line)
        i += 1

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"✅ Done: {path}")

fix_file('src/pages/AdminDash.jsx')
fix_file('src/components/tabs/ConnectorsTab.jsx')
print("\nNow run: npm run build")
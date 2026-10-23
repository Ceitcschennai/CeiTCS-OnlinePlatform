import os

base = r'c:\Users\Rishi\Desktop\CeiTCS online platform backup\frontend\src'
count = 0
for root, dirs, files in os.walk(base):
    for f in files:
        if f.endswith('.js'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as fh:
                content = fh.read()
            new_content = content.replace(
                'import API_BASE_URL from "../config/api"',
                'import API_BASE, { apiFetch } from "../config/api"'
            )
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as fh:
                    fh.write(new_content)
                count += 1
                print(f'Updated: {path}')

print(f'Total files updated: {count}')
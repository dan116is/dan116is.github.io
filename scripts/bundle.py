import base64, re, os

ROOT = '/home/user/-'

def read(p):
    with open(os.path.join(ROOT, p), 'r', encoding='utf-8') as f:
        return f.read()

def read_b64(p):
    with open(os.path.join(ROOT, p), 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')

html = read('index.html')
css = read('styles.css')
js_files = ['js/db.js', 'js/notifications.js', 'js/medications.js',
            'js/shopping.js', 'js/tasks.js', 'js/budget.js',
            'js/settings.js', 'js/app.js']
js = '\n'.join(read(f) for f in js_files)
icon192 = 'data:image/png;base64,' + read_b64('icons/icon-192.png')
icon512 = 'data:image/png;base64,' + read_b64('icons/icon-512.png')

# Replace stylesheet link with inline <style>
html = re.sub(
    r'<link\s+rel="stylesheet"\s+href="styles\.css"\s*/?>',
    f'<style>\n{css}\n</style>',
    html
)

# Replace all individual <script src=...> tags with one big inline script
html = re.sub(
    r'(<script\s+src="js/[^"]+"\s*></script>\s*)+',
    f'<script>\n{js}\n</script>\n',
    html
)

# Inline icon references (apple-touch-icon)
html = html.replace('href="icons/icon-192.png"', f'href="{icon192}"')

# Remove the manifest link (no manifest needed in single-file mode)
html = re.sub(r'<link\s+rel="manifest"\s+href="manifest\.json"\s*/?>\s*', '', html)

# Disable service-worker registration (no SW from file://)
html = html.replace(
    "navigator.serviceWorker.register('./service-worker.js')",
    "Promise.resolve()"
)

with open('/home/user/-/app.html', 'w', encoding='utf-8') as f:
    f.write(html)

size = os.path.getsize('/home/user/-/app.html')
print(f"Bundled app.html ({size:,} bytes)")

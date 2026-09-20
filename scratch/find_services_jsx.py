import urllib.request
import re

html = urllib.request.urlopen(urllib.request.Request('https://marcimetzger-realty.vercel.app/', headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
js_files = re.findall(r'src=["\'](/_next/static/chunks/[^"\']+\.js)["\']', html)

for js in js_files:
    url = 'https://marcimetzger-realty.vercel.app' + js
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8', errors='ignore')
    if '.services.items' in data or 'services.items.map' in data or ('OUR SERVICES' in data.upper() and 'kicker' in data):
        idx = data.find('kicker')
        print("FOUND JSX in", js)
        print(data[max(0, idx-300):min(len(data), idx+1500)])
        break

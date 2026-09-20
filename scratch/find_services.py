import urllib.request
import re

html = urllib.request.urlopen(urllib.request.Request('https://marcimetzger-realty.vercel.app/', headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8')
js_files = re.findall(r'src=["\'](/_next/static/chunks/[^"\']+\.js)["\']', html)

for js in js_files:
    url = 'https://marcimetzger-realty.vercel.app' + js
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8', errors='ignore')
    if 'Commercial & Residential' in data or 'Rely on Expertise' in data:
        idx = data.find('Commercial & Residential')
        print("FOUND in", js)
        print(data[max(0, idx-400):min(len(data), idx+1200)])
        break

import urllib.request

url = 'https://marcimetzger-realty.vercel.app/_next/static/chunks/12zrk-k4uax.z.js'
data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8', errors='ignore')
idx = data.find('absolute right-5 bottom-4 left-5')
print(data[idx:idx+1000])

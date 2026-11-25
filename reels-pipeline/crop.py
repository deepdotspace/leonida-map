"""crop.py X Y SPAN OUT.png : draw the game map centred on game coordinates (X, Y), SPAN metres wide, with a labelled coordinate grid and nearby named pins."""
import sys, math, json, os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The map's tiles are 512 px at web levels 1 to 7 (see scripts/fetch-tiles.mjs).
TILE, MIN_Z, MAX_Z = 512, 1, 7
x0, y0, span, out = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
W = 1100
z = max(MIN_Z, min(MAX_Z, int(math.floor(math.log2(W / span * 32768 / TILE)))))
world = TILE * 2 ** z
px = lambda x: (x + 16384) / 32768 * world
py = lambda y: (16384 - y) / 32768 * world
l, r, t, b = px(x0 - span / 2), px(x0 + span / 2), py(y0 + span / 2), py(y0 - span / 2)
img = Image.new('RGB', (int(r - l), int(b - t)), (20, 30, 60))
for tx in range(int(l // TILE), int(r // TILE) + 1):
    for ty in range(int(t // TILE), int(b // TILE) + 1):
        try: img.paste(Image.open(f'{ROOT}/public/tiles/{z}/{tx}/{ty}.jpg'), (int(tx * TILE - l), int(ty * TILE - t)))
        except Exception: pass
s = W / img.width
img = img.resize((W, int(img.height * s)))
d = ImageDraw.Draw(img)
step = next(g for g in (50, 100, 200, 500, 1000, 2000, 5000) if span / g <= 8)
gx = math.ceil((x0 - span / 2) / step) * step
while gx < x0 + span / 2:
    X = (px(gx) - l) * s; d.line([(X, 0), (X, img.height)], fill=(255, 0, 0), width=1); d.text((X + 3, 3), f'x={gx:g}', fill=(255, 0, 0)); gx += step
gy = math.ceil((y0 - span / 2) / step) * step
while gy < y0 + span / 2:
    Y = (py(gy) - t) * s; d.line([(0, Y), (img.width, Y)], fill=(255, 0, 0), width=1); d.text((3, Y + 3), f'y={gy:g}', fill=(255, 0, 0)); gy += step
keep = ('landmark', 'waink-landmark', 'city-town', 'gang-operation', 'safehouse', 'airport', 'bank', 'ammu-nation', 'nightclub', 'gang-compound')
near = [p for p in json.load(open(f'{ROOT}/src/map/data/markers.json')) if p['category'] in keep and abs(p['x'] - x0) < span / 2 and abs(p['y'] - y0) < span / 2]
for p in near[:40]:
    X, Y = (px(p['x']) - l) * s, (py(p['y']) - t) * s
    d.ellipse([X - 4, Y - 4, X + 4, Y + 4], fill=(255, 230, 0), outline=(0, 0, 0)); d.text((X + 6, Y - 5), p['name'][:28], fill=(0, 0, 0), stroke_width=2, stroke_fill=(255, 255, 255))
img.save(out)
print(out, 'zoom', z, 'grid step', step, 'm')

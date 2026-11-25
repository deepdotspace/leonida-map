"""Add the verified Google-pass placements to the map's reel list: best 8 reels per pin by plays."""
import json,collections
G='reels-pipeline/data/google/'; R='src/map/data/reels.json'; P='reels-pipeline/data/pool.json'
reels=json.load(open(R)); pool=json.load(open(P)); ok=json.load(open(G+'ok.json'))
ids={m['id'] for m in json.load(open('src/map/data/markers.json'))}
for c,m in ok.items(): pool.setdefault(c,{'code':c,'by':m['by'],'plays':m['plays'],'likes':None,'dur':m['dur'],'day':m['date'],'caption':m['caption'],'query':'google'})
json.dump(pool,open(P,'w'))
pairs={(r['code'],p) for r in reels for p in r['pins']}; before=(len(reels),len({p for _,p in pairs}))
for f in ('placed.json','extra.json'):
    for x in json.load(open(G+f)):
        assert x['code'] in pool,x['code']
        if x['pinId'] in ids: pairs.add((x['code'],x['pinId']))
by=collections.defaultdict(list)
for c,p in pairs: by[p].append(c)
keep=collections.defaultdict(list)
for p,cs in by.items():
    for c in sorted(cs,key=lambda c:-(pool[c].get('plays') or 0))[:8]: keep[c].append(p)
out=[{'code':c,'by':pool[c]['by'],'plays':pool[c].get('plays') or 0,'pins':sorted(ps)} for c,ps in keep.items()]
out.sort(key=lambda r:-(pool[r['code']].get('plays') or 0))
json.dump(out,open(R,'w'),indent=1)
print('before',before,'after',(len(out),len(by)))

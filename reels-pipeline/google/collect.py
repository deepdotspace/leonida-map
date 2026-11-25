"""Collect reel codes from the Google results: per code, the queries that returned it, Google's title and snippet."""
import json,glob,re,sys
G='reels-pipeline/data/google'
Q=json.load(open(G+'/queries.json')); pool=json.load(open('reels-pipeline/data/pool.json'))
onmap={x['code'] for x in json.load(open('src/map/data/reels.json'))}
found={}; nq=0; web={}
for f in sorted(glob.glob(G+'/r[0-9]-*.json')):
    for it in json.load(open(f))['data'].get('items') or []:
        q=it['searchQuery']['term']; nq+=1
        for o in it.get('organicResults',[]):
            m=re.search(r'instagram\.com/(?:[^/]+/)?(?:reel|reels|p)/([\w-]+)',o.get('url',''))
            if not m:
                if not q.startswith('site:'): web.setdefault(q,[]).append((o.get('url'),o.get('title')))
                continue
            text=(o.get('title') or '')+' '+(o.get('description') or '')
            e=found.setdefault(m.group(1),{'q':[],'text':text})
            if q not in e['q']: e['q'].append(q)
gta=re.compile(r'gta|grand theft|vice city|leonida',re.I)
rel={c:e for c,e in found.items() if gta.search(e['text'])}
new={c:e for c,e in rel.items() if c not in pool}
print('queries',nq,'reels',len(found),'mention gta',len(rel),'new',len(new),'in pool',len(rel)-len(new),'already on map',sum(c in onmap for c in rel))
json.dump(found,open(G+'/found.json','w')); json.dump(web,open(G+'/web.json','w'))
json.dump(new,open(G+'/new.json','w'))

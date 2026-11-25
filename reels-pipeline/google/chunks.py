"""Build the placement work folder: pins.txt plus chunks of 25 reels with caption, transcript, Google text and the pins searched for."""
import json,glob,re,os,shutil,sys
G='reels-pipeline/data/google'; W=sys.argv[1]; PINS=sys.argv[2]
os.makedirs(W,exist_ok=True); shutil.copy(PINS,W+'/pins.txt')
Q=json.load(open(G+'/queries.json')); found=json.load(open(G+'/found.json')); keep=json.load(open(G+'/keep.json'))
ok=json.load(open(G+'/ok.json')); pool=json.load(open('reels-pipeline/data/pool.json')); tr=json.load(open('reels-pipeline/data/transcripts.json'))
onmap={x['code'] for x in json.load(open('src/map/data/reels.json'))}
names={l.split(' | ')[0]:l.split(' | ')[2] for l in open(PINS)}
for f in glob.glob(G+'/t-*.json'):
    for i in json.load(open(f))['data'].get('items') or []:
        m=re.search(r'/(?:reel|reels|p)/([\w-]+)',json.dumps(i)); t=i.get('transcript') or i.get('text') or ''
        if m and t: tr[m.group(1)]=t
json.dump(tr,open('reels-pipeline/data/transcripts.json','w'))
def searched(qs):
    out=[]
    for q in qs:
        for p in Q.get(q,[]):
            if p in names and p not in [o['id'] for o in out]: out.append({'id':p,'name':names[p]})
    return out[:6]
reels=[]
for c,m in ok.items():
    reels.append({'code':c,'by':m['by'],'caption':m['caption'][:1500],'transcript':tr.get(c,'')[:4000],'googleText':keep[c]['text'][:400],'searchedFor':searched(keep[c]['q'])})
for c,e in found.items():
    if c in pool and c not in onmap and (pool[c].get('plays') or 0)>=20000:
        reels.append({'code':c,'by':pool[c]['by'],'caption':(pool[c].get('caption') or '')[:1500],'transcript':tr.get(c,'')[:4000],'googleText':e['text'][:400],'searchedFor':searched(e['q'])})
n=0
for b in range(0,len(reels),25):
    json.dump(reels[b:b+25],open(f'{W}/c{n:02d}.json','w'),indent=1); n+=1
print('reels',len(reels),'with transcript',sum(bool(r['transcript']) for r in reels),'chunks',n)

"""Keep new reels whose Google title or snippet shares a distinctive word with the place name that was searched."""
import json,re,collections
G='reels-pipeline/data/google'
new=json.load(open(G+'/new.json')); Q=json.load(open(G+'/queries.json'))
stop=set('the a an of and in at to for with from on safe code location map gta site instagram reel secret hidden free best you can enter house car cars store shop station street garage bank pawn club vice city leonida event random police rescue robbery man woman'.split())
def toks(q):
    n=re.sub(r'^site:\S+\s*','',q).replace('"GTA 6"','').replace('GTA 6','')
    return {t for t in re.findall(r"[a-z0-9']+",n.lower()) if len(t)>=4 and t not in stop}
keep={}
for c,e in new.items():
    text=e['text'].lower(); hits=[]
    for q in e['q']:
        t=toks(q); h={x for x in t if x in text}
        need=1 if len(t)<=2 else 2
        if q.startswith('site:instagram.com/reel GTA 6 ') : need=99 if not h else 1
        if len(h)>=min(need,len(t)) and t: hits.append(q)
    if hits: keep[c]={'q':hits,'text':e['text']}
print('new',len(new),'kept',len(keep))
per=collections.Counter(q for e in keep.values() for q in e['q'])
print('queries with a kept reel',len(per),'of',len({q for e in new.values() for q in e['q']}))
import random; random.seed(2)
for c in random.sample(list(keep),12): print(' ',keep[c]['q'][0][26:70],'|',keep[c]['text'][:90].replace('\n',' '))
json.dump(keep,open(G+'/keep.json','w'))

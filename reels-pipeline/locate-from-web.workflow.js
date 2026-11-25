export const meta = {
  name: 'locate-from-web',
  description: 'Sonnet agents locate reel-only places on the map using written guides found by a web search',
  phases: [{ title: 'Locate' }],
}
const D = args.dir
const SCHEMA = {
  type: 'object',
  properties: {
    index: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string' },
    x: { type: 'number' },
    y: { type: 'number' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    existingPinId: { type: 'string' },
    sourceUrl: { type: 'string' },
    sourceQuote: { type: 'string' },
    how: { type: 'string' },
  },
  required: ['index', 'name', 'description', 'x', 'y', 'confidence', 'existingPinId', 'sourceUrl', 'sourceQuote', 'how'],
}
const prompt = (job) => `You are adding a marker to a fan-made map of the video game GTA 6. An Instagram reel shows a specific place that the map may have no pin for, and an earlier pass could not locate it confidently from the video. Use written guides from the web to find out where it is.

Read the job file ${job}: index, name, description, the reel's caption and transcript, firstPass (the earlier guess: x, y, evidence, confidence, how; x=y=0 means no guess) and webResults (url and title from a Google search for this place).

Steps:
1. Fetch the most promising webResults with WebFetch (written guides and wikis first: gtabase, gamerant, ign, pushsquare, game8, reddit, sportskeeda and similar; video and social pages rarely help). You may run one or two WebSearch queries of your own if the results are off target. Find the sentences that say where the place is: district, street, nearby named business or landmark, compass direction, distance.
2. Find that spot on our map. ${D}/pins-xy.txt has one pin per line: "id | category | name | x= y= | description". Grep it (case-insensitive) for the landmarks and area names the guide mentions, and for the item itself.
3. Draw the area: arch -x86_64 python3 -I ${D}/crop.py X Y SPAN ${D}/work/INDEX-N.png  (X, Y game coordinates of the centre in metres, x grows east, y grows north; SPAN is the width in metres, try 3000 then 800). Read the PNG; red grid lines are labelled. Use it to place the spot relative to the landmarks the guide names.
4. Check whether an existing pin already is this thing: same item or site within about 250 m, possibly under another name (cars use in-game brands, for example Pegassi for Lamborghini, Grotti for Ferrari, Bravado for Dodge; safes, unique weapons, easter eggs and underwater facilities often already have pins). If so, put its id in existingPinId and use its coordinates.

Return:
- name: a short proper map name, no hype words. description: one or two plain sentences on what is there and how to get it.
- x, y: game coordinates, or 0, 0 if you could not locate it.
- confidence: "high" if a written source names a landmark that is a pin and the spot is at it or within about 100 m, or an existing pin covers it; "medium" if the area is right but the spot could be 100 to 300 m off; "low" if it is a guess or you found nothing.
- existingPinId: the covering pin's id or "". sourceUrl: the page you relied on, or "". sourceQuote: the sentence from that page that gives the location, word for word, or "". how: one or two sentences on how you placed it.
Do not invent a location. Return index exactly as in the job file.`

const jobs = Array.from({ length: args.n }, (_, i) => D + '/jobs/j' + String(i).padStart(3, '0') + '.json')
const out = await pipeline(jobs, (job, _j, i) => agent(prompt(job), { schema: SCHEMA, model: 'sonnet', label: `locate:${i}`, phase: 'Locate' }))
log(`${out.filter(Boolean).length} of ${jobs.length} returned`)
return out.filter(Boolean)

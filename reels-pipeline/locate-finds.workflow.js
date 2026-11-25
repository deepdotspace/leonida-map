export const meta = {
  name: 'locate-finds',
  description: 'Sonnet agents watch reel frames, find the in-game map shown in the video and work out game coordinates for places that have no pin',
  phases: [{ title: 'Locate' }],
}
const D = args.dir
const SCHEMA = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    finds: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          evidence: { type: 'string', enum: ['map-frame', 'named-place', 'none'] },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          existingPinId: { type: 'string' },
          how: { type: 'string' },
          mapFrameSecond: { type: 'number' },
        },
        required: ['name', 'description', 'x', 'y', 'evidence', 'confidence', 'existingPinId', 'how', 'mapFrameSecond'],
      },
    },
  },
  required: ['code', 'finds'],
}
const prompt = (job) => `You are adding new markers to a fan-made map of the video game GTA 6 from an Instagram reel. A first pass read the reel's caption and transcript and thinks it shows one or more specific places that the map has no pin for. Your job is to confirm each one by looking at the video and work out where it is in game coordinates.

Read the job file ${job}. It has: code, video (mp4 path), sheets (contact-sheet images, each a 6x3 grid of frames taken every 2 seconds, in reading order, so frame k of sheet n is at second ((n-1)*18 + k-1)*2), caption, transcript, and candidates (name, description, locationClue, quote).

Steps:
1. Look at every sheet with the Read tool. Find frames where the creator opens the in-game map (flat map with roads, water, a player arrow or a marker, sometimes a place label). Those frames show where the place is. Also note what the place and the item actually look like, and any name card shown on screen.
2. For a clearer view of a map moment, extract a full-size frame: ffmpeg -loglevel error -y -ss SECONDS -i VIDEO -frames:v 1 ${D}/work/CODE-SECONDS.jpg  then Read it.
3. Find the same spot on our map. Our map is the same in-game map. Draw any part of it with a coordinate grid and named landmarks:
   arch -x86_64 python3 -I ${D}/crop.py X Y SPAN ${D}/work/CODE-crop-N.png
   X, Y are game coordinates of the centre in metres (x grows east, y grows north; the map spans about x -12000..5100, y -10100..12000), SPAN is the width in metres (try 6000 to get oriented, then 1500, then 500). Read the PNG. Red grid lines are labelled with their coordinates.
   To get a starting point, Grep ${D}/pins-xy.txt (one pin per line: "id | category | name | x= y= | description") for any place name the reel or its map frame mentions (district, landmark, business, street).
   Compare coastline, road shapes and building outlines between the video's map frame and our crop until you can point at the exact spot, then read its coordinates off the grid.
   If the video has no usable map frame, run one or two WebSearch queries for a written guide to the place (name plus "GTA 6 location") and use the landmarks it names.
4. Before returning a find, Grep pins-xy.txt for pins near those coordinates and for the item's name. If an existing pin already covers the same thing (same item at the same site), put its id in existingPinId; otherwise existingPinId is "".

For each candidate that the video really shows as a specific findable place, return a find:
- name: a short proper map name (the real in-game name if a name card or sign shows it, otherwise a plain descriptive name such as "Hidden Bunker with Free Dubsta"). No hype words, no emojis.
- description: one or two plain sentences: what is there and how to get it (code, key, time of day, chapter) as the reel explains.
- x, y: game coordinates. evidence: "map-frame" if you matched a map frame from the video to our map; "named-place" if there was no usable map frame but the reel names a place that is a pin and the spot is at or right next to it; "none" if you could not locate it (set x and y to 0).
- confidence: "high" only if the map frame match is unambiguous (distinctive coastline or road layout and the marker position is clear). "medium" if the area is right but the exact spot could be off by more than about 100 m. "low" otherwise.
- how: one or two sentences on what you matched. mapFrameSecond: the second of the map frame you used, or -1.
Drop candidates that turn out to be vague, not tied to one place, or not actually shown. Do not invent places. Return code "${'$'}{code from the job file}" as given in the job.`

const out = await pipeline(
  Array.from({ length: args.to - args.from }, (_, i) => D + '/jobs/j' + String(args.from + i).padStart(3, '0') + '.json'),
  (job, _j, i) => agent(prompt(job), { schema: SCHEMA, model: 'sonnet', label: `locate:${args.from + i}`, phase: 'Locate' }),
)
return out.filter(Boolean)
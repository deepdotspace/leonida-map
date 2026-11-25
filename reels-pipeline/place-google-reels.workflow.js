export const meta = {
  name: 'place-google-reels',
  description: 'Sonnet agents match Instagram reels to map pins with a verbatim evidence quote, then a second agent tries to refute each match',
  phases: [{ title: 'Place' }, { title: 'Verify' }],
}
const PINS = args.dir + '/pins.txt'
const FILES = Array.from({ length: args.n }, (_, i) => args.dir + '/c' + String(i).padStart(2, '0') + '.json')
const PLACE = {
  type: 'object',
  properties: {
    reels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          kind: { type: 'string', enum: ['location-guide', 'compilation', 'not-about-a-place', 'not-english', 'unclear'] },
          unlisted: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                locationClue: { type: 'string' },
                quote: { type: 'string' },
              },
              required: ['name', 'description', 'locationClue', 'quote'],
            },
          },
          placements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                pinId: { type: 'string' },
                quote: { type: 'string' },
                why: { type: 'string' },
              },
              required: ['pinId', 'quote', 'why'],
            },
          },
        },
        required: ['code', 'kind', 'placements', 'unlisted'],
      },
    },
  },
  required: ['reels'],
}
const VERIFY = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          pinId: { type: 'string' },
          keep: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['code', 'pinId', 'keep', 'reason'],
      },
    },
  },
  required: ['verdicts'],
}
const placePrompt = (file) => `You are matching Instagram reels about the video game GTA 6 to pins on a fan-made map of the game.

Read the reels in ${file} (a JSON array; each has code, by, caption, transcript, googleText and searchedFor). These reels were found by a Google search for one map place each: searchedFor lists the pins that were searched for when this reel came up (id and name), which is a hint and often wrong. googleText is Google's title and snippet for the reel. transcript may be empty.
The pin list is ${PINS}: one pin per line as "id | category | name | description | near: closest landmark (distance)". It is about 2,500 lines, so search it with Grep (case-insensitive) for item names, place names and keywords instead of reading it all. Try several search words per reel (the vehicle or weapon name, the area, the building).

For every reel, decide which pins, if any, the reel actually shows the viewer how to find. Rules:
- Place a reel on a pin only when the caption or transcript identifies that specific pin: the item or event matches AND the place matches (or the item is unique in the pin list, such as a named one-of-a-kind car or weapon). A generic category match ("a hidden car") is not enough.
- "quote" must be copied word for word from the caption, transcript or googleText and must be the words that identify the pin. A reel that merely came up in the search without naming or clearly showing the pin's item or place gets no placement. Transcripts are machine-made and misspell names (for example "McLaren SANA", "Camacho"); judge by sound and context.
- A reel covering several places may go on up to 8 pins, each with its own quote. Use kind "compilation" for those.
- One site often has several pins (for example a gang operation, the safe inside it and the unique weapon or car found there, or a safehouse and its garage). When the reel shows that site, include each of those pins that the reel actually shows.
- If the text does not pin down a place, return an empty placements array. No placement is better than a guess. News, memes, opinions and trailers are "not-about-a-place".
- Only use pin ids that you saw in the pin list.
- "unlisted": when the reel shows the viewer a specific, findable place or thing in the game world that has NO pin in the list after you searched for it (a secret room, an easter egg, a hidden vehicle, animals, a strange building and so on), add it here instead: a short proper name a map would use (for example "Abandoned Mine Ghost"), a one or two sentence description of what is there and how to get it, "locationClue" with every word the reel gives about where it is (area, street, nearby building, "north of ..."), and the word-for-word quote. Leave it empty for vague reels, tips that are not tied to one place, and anything already covered by a pin.
Return one entry for every reel in the file.`
const verifyPrompt = (file, placed) => `A first pass matched Instagram reels about GTA 6 to pins on a fan-made map. Check each match and reject the weak ones.

Reels (code, caption, transcript, googleText, searchedFor) are in ${file}; searchedFor is only the search that surfaced the reel and is not evidence. The pin list is ${PINS} (one pin per line: "id | category | name | description | near: landmark"); use Grep to look up each pin id and to check whether another pin fits better.

Matches to check:
${JSON.stringify(placed)}

For each match set keep=true only if all hold: (1) the quote really appears in the reel's caption, transcript or googleText (allowing transcript misspellings), (2) the reel shows the viewer this specific pin's item or event, not just the same category, (3) the place described agrees with the pin's description or nearest landmark, or the item is unique in the pin list. If you are unsure, keep=false. Return one verdict per match.`

const results = await pipeline(
  FILES,
  (file, _f, i) => agent(placePrompt(file), { schema: PLACE, model: 'sonnet', label: `place:${i}`, phase: 'Place' }),
  async (placed, file, i) => {
    if (!placed) return null
    const matches = placed.reels.flatMap(r => r.placements.map(p => ({ code: r.code, pinId: p.pinId, quote: p.quote, why: p.why })))
    if (!matches.length) return { file, placed, verdicts: [] }
    const v = await agent(verifyPrompt(file, matches), { schema: VERIFY, model: 'sonnet', label: `verify:${i}`, phase: 'Verify' })
    return { file, placed, verdicts: v ? v.verdicts : null }
  },
)
const failed = results.map((r, i) => (r && r.verdicts ? null : FILES[i])).filter(Boolean)
if (failed.length) log(`${failed.length} chunk(s) failed: ${failed.join(', ')}`)
return { results: results.filter(Boolean), failed }
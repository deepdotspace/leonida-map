export const meta = {
  name: 'judge-finds',
  description: 'Decide which reel finds are already pins on the map and which are new, and merge finds that describe the same thing',
  phases: [{ title: 'Judge' }],
}
const SCHEMA = {
  type: 'object',
  properties: {
    finds: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'number' },
          verdict: { type: 'string', enum: ['existing', 'new', 'drop'] },
          pinIds: { type: 'array', items: { type: 'string' } },
          sameAs: { type: 'number' },
          name: { type: 'string' },
          description: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['n', 'verdict', 'pinIds', 'sameAs', 'name', 'description', 'reason'],
      },
    },
  },
  required: ['finds'],
}
const prompt = (file) => `A fan-made map of the video game GTA 6 has about 4,400 pins. Agents watched Instagram reels and proposed places that might be missing from the map. Decide for each proposal whether it is really new.

Read ${file}: a JSON array of proposals. Each has n (its number), name, description, x, y (game coordinates in metres), how (how it was located), code (the reel), and nearbyPins (existing pins within 250 m: id, category, name, description, metres away). In GTA 6 real car brands have game names (Lamborghini = Pegassi, Bugatti = Truffade, Ferrari = Grotti, McLaren = Progen, Rolls-Royce = Enus, Bentley = Enus, Dodge = Bravado, Mustang = Vapid, BMW = Ubermacht, Porsche = Pfister, Mercedes = Benefactor), and reel creators use the real names.

For every proposal return:
- verdict "existing" when one or more nearbyPins already cover the same thing (the same car, weapon, stash, bunker, easter egg, mission or building feature). Put the ids of every nearby pin the reel is about in pinIds (up to 4, best first). A pin for the same building that is about something else (a bus stop, a shop, a landmark label) does NOT cover a secret inside it.
- verdict "new" when no nearby pin covers it and it is a specific findable thing a player would want on a map. pinIds empty.
- verdict "drop" when it is too vague to be useful, is not a fixed place (random spawns, glitches that work anywhere), or the description suggests the location is a guess.
- sameAs: when two or more proposals in this file describe the same thing at the same place (within about 150 m), give all of them the n of the lowest-numbered one; otherwise the proposal's own n.
- name: a short proper map name in title case, at most 45 characters, game names rather than real brands where you are sure of them, no words like "free", "secret", "insane" unless part of a real name. Proposals with the same sameAs must share one name.
- description: one to three plain sentences telling a player what is there and how to get it, based only on the proposal text. No hype, no mention of reels or creators. Proposals with the same sameAs must share one description that merges their useful details.
- reason: one sentence.
Return one entry per proposal.`
const files = Array.from({ length: args.n }, (_, i) => args.dir + '/k' + i + '.json')
const results = await pipeline(files, (file, _f, i) => agent(prompt(file), { schema: SCHEMA, model: 'sonnet', label: `judge:${i}`, phase: 'Judge' }))
return results.filter(Boolean).flatMap(r => r.finds)

# Leonida Map

A free interactive map of GTA 6's state of Leonida. Browse places by category, open a place to see its picture and description, tick places off as you find them, star favourites, write notes and drop your own markers. Everything you save stays in the browser, and follows you between devices once you sign in.

Live at <https://gta6.app.space>. Built on [DeepSpace](https://deep.space).

This is a fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.

## Deploy your own copy

You need Node 22.15 or newer and a free [DeepSpace](https://deep.space) account. DeepSpace provides the sign-in, the storage and the hosting, so there is nothing else to set up.

```bash
git clone https://github.com/deepdotspace/leonida-map.git && cd leonida-map
npm install                              # installs the DeepSpace SDK with everything else
npx deepspace auth login                 # sign in, or create your free account
npx deepspace app init --new-id          # makes this copy your own app
npm run tiles                            # downloads the map artwork (7,844 files, 72 MB)
npm run deploy                           # puts it online
```

Before the last step, change `name` at the top of `wrangler.toml` to a name of your own. Your map goes live at `https://<name>.app.space`.

The first deploy takes about eleven minutes because of the map artwork. Later deploys take about a minute.

### Or ask your coding agent

Paste this into Claude Code, Codex or Cursor:

> Clone https://github.com/deepdotspace/leonida-map, follow "Deploy your own copy" in its README, name the app `<your-name>`, and give me the live link.

### Make it yours

- **Run it on your computer:** `npm run dev`.
- **Change the places:** edit the JSON files in `src/map/data/`.
- **Charge for it:** DeepSpace has payments built in, so you can put features behind a subscription. See the [DeepSpace docs](https://docs.deep.space).
- **Use your own domain:** `npx deepspace app domain --help`.

## Check it

```bash
npx tsc --noEmit -p .   # types
npx eslint .            # lint
npm run test:unit       # unit tests
npm test                # unit tests, then browser tests
npm run build           # production build, with the static pages
```

## Where things are

| Path | What lives there |
| --- | --- |
| `src/pages/` | One file per route: the map (`index.tsx`), the place lists under `/locations`, and the owner's dashboard at `/admin` |
| `src/map/` | The map itself: canvas, sidebar, place cards, filtering, and the visitor's saved data |
| `src/map/data/` | The places, categories and reels as JSON |
| `src/locations/` | The static place-list pages search engines read |
| `src/account/` | Sign-in, syncing saved data to an account, reporting a problem |
| `src/schemas/` | The stored collections and who may read or write them |
| `src/server/`, `worker.ts` | The Cloudflare Worker that serves the app |
| `scripts/fetch-tiles.mjs` | Downloads and recombines the map tiles |
| `scripts/long-fetch.mjs` | Lets the first, slow deploy finish |
| `reels-pipeline/` | The one-off scripts that matched Instagram reels to places (see its README) |
| `tests/` | Browser tests |

## Credits

The code is under the [MIT licence](./LICENSE). Map tiles come from GTADB and place data from GTA Base and its contributors. See [NOTICE](./NOTICE) for the details and licences.

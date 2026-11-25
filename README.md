# Leonida Map

A free interactive map of GTA 6's state of Leonida. Browse places by category, open a place to see its picture and description, tick places off as you find them, star favourites, write notes and drop your own markers. Everything you save stays in the browser, and follows you between devices once you sign in.

Live at <https://gta6.app.space>. Built on [DeepSpace](https://deep.space).

This is a fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.

## Run it

You need Node 22.15 or newer and a free [DeepSpace](https://deep.space) account, which provides sign-in, storage and hosting.

```bash
npm install
npx deepspace auth login
npx deepspace app init --new-id   # gives your copy its own app id
npm run tiles                     # downloads the map tiles (7,844 files, 72 MB)
npm run dev
```

The tiles are not kept in the repository. `npm run tiles` fetches them from GTADB and writes them to `public/tiles/`.

## Deploy your own copy

```bash
npm run deploy
```

Your copy goes live at `https://<name>.app.space`, where `<name>` is the `name` at the top of `wrangler.toml`. Change it to a name of your own first.

The first deploy takes about eleven minutes, because the platform copies each of the ~7,970 tile files in turn. Later deploys only send what changed and take about a minute. `npm run deploy` loads `scripts/long-fetch.mjs`, which lets the deploy command wait that long; plain `npx deepspace deploy` gives up after four minutes.

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
| `src/pages/` | One file per route: the map (`index.tsx`) and the place lists under `/locations` |
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

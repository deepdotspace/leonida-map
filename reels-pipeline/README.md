# Reels pipeline

How Instagram reels get onto the map, and how places that only exist in reels become "Instagram Finds" markers. Run on 2026-11-24. Apify cost: about $28.32 (first run $19.56, Google pass $8.76), not counting the agents' model usage.

The scripts call Apify through `deepspace integrations invoke`, so they need a DeepSpace login with credits. Run them from the repository root. The collected data (`data/`) and downloaded videos are not in the repository.

## Result of the first full run

- 5,373 reels collected, 1,963 passed the quality bar, 1,556 transcripts.
- 448 reels placed on 312 pins (median 164,000 plays), at most 8 reels per pin.
- 29 new markers in the "Instagram Finds" category, located from the map shown in the videos.

## The steps

1. **Collect** with `publicsignallabs/instagram-reels-search` ($0.0004 per reel plus $0.002 per page). Ten search phrases per run, three pages each. Example body: `examples/collect-body.json`. Run with `REELS_DIR=<work folder> ./go.sh <name>`, which reads `<work folder>/b/<name>-body.json`, waits, saves the items and appends the cost to `ledger.txt`. Cost in practice: about $0.0008 per reel that passes the bar.
2. **Quality bar**: at least 20,000 plays, 10 to 180 seconds long, posted on or after 2026-11-18, caption mentions GTA, Grand Theft, Vice City or Leonida.
3. **Transcribe** with `memo23/instagram-reel-transcript-scraper` ($0.003 per started minute, `maxConcurrency` 4, no charge when there is no speech). About $0.0043 per reel. Example body: `examples/transcript-body.json`.
4. **Place** with `place-reels.workflow.js`: Sonnet agents read 30 reels each (caption and transcript), search the pin list, and return pin matches with a word-for-word quote. A second agent tries to reject each match. Reels about a place that has no pin are returned as "unlisted".
5. **Locate unlisted places** with `locate-finds.workflow.js`: download each video (`get-video.sh`, free, uses the `video_url` from step 1), cut frame sheets, and have one agent per video find the frame where the creator shows the in-game map. The agent draws our map with `crop.py` (same artwork as the game map, with a coordinate grid) and reads off the coordinates.
6. **Judge** with `judge-finds.workflow.js`: compare each located place with pins within 250 m, attach the reel to an existing pin when one covers it, merge reels about the same place, and drop guesses. Then check the car and loot finds by hand against nearby pins; six of the first batch were existing pins under a real-world car name.
7. **Write** `src/map/data/reels.json` (`code`, `by`, `pins`) and the new markers in `src/map/data/markers.json` (category `instagram-find`, `foundBy` is the creator).

## Google pass (second run)

Searches Google for one map place at a time, which finds reels the Instagram search misses. Result: 125 more reels on the map (568 reels on 374 pins) and 7 more markers (36 Instagram Finds). Scripts are in `google/`, their data in `data/google/`.

1. **Search** with `apify/google-search-scraper`: one query per place, `site:instagram.com/reel "GTA 6" <place name>`, for the categories people make reels about (standout vehicles, random events, unique weapons, safes, landmarks, curiosities) plus the reel-only places. 840 queries cost $2.10 and returned 5,213 reels, 4,664 of them new. `data/google/queries.json` maps each query to its pins.
2. **Filter** (`collect.py`, `filter.py`): keep new reels whose Google title or snippet shares a distinctive word with the place searched (2,380 kept).
3. **Play counts** with `apify/instagram-scraper` (`directUrls`, about $0.0023 per reel, $5.47). Only 296 passed the quality bar, because most Google hits are small accounts. This step is the main cost; a tighter filter in step 2 is the way to make it cheaper.
4. **Transcribe**. Apify cost $1.02 for 296. The free way also works and is faster: the play-count step returns a `videoUrl`, so download it with curl and run `whisper-cli -m ~/.cache/whisper/ggml-small.en.bin` on the audio. Use that next time.
5. **Place** with `place-google-reels.workflow.js` (`chunks.py` builds the batches): same as step 4 above, with Google's snippet and the searched pins given as a hint that is not evidence. 192 verified matches.
6. **Locate reel-only places**: `locate-from-web.workflow.js` reads written guides from a plain web search (`"GTA 6" <name> location map`) and places the spot next to pins the guide names; `locate-finds.workflow.js` does the same from the video's map frames. Most turned out to be existing pins under another name (17 reels attached that way); 7 became new markers.
7. **Merge** with `google/merge.py` (best 8 reels per pin by plays).

## What did not work

- `apify/instagram-hashtag-scraper`: about 8 times the cost per usable reel.
- `apify/instagram-reel-scraper` transcripts: $0.07 per reel for the same text.
- `deepmine`, `s_actors`, `crawl_craft` reel searches: returned nothing.
- Exa search does not index Instagram reels; `websearch/advanced-search` costs $0.134 per request.
- On-screen text extraction (`steadyfetch`, $0.014 per reel): mostly game HUD words.
- Matching reels to pins by name alone: too loose. The quote plus second-agent check is what made placements trustworthy.

## Known limits

- Finds marked from a rotated or zoomed-out map frame can be off by about 100 m. Visitors can use Report on the pin.
- 21 unlisted places had no map frame and no named place, so they were left out. 12 more were dropped as guesses.

## Data the run produced (kept locally, not in the repository)

`data/pool.json` (all reels), `data/transcripts.json`, `data/placed.json` (reel to pin with quotes), `data/unlisted.json`, `data/finds-raw.json` (every located place with how it was located), `data/finds-final.json` (the 36 markers with their reels), `data/google/` (everything from the Google pass, with `reels-before.json` and `markers-before.json` as the state before it), `data/ledger.txt` (cost of each Apify run). The downloaded videos (1.7 GB) were not kept.

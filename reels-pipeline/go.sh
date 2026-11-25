#!/bin/zsh
# usage: REELS_DIR=<work folder> go.sh <name>
# Starts the run described in $REELS_DIR/b/<name>-body.json, waits, pages items into b/<name>-<offset>.json, appends cost to ledger.txt
here="$(cd "$(dirname "$0")" && pwd)"
S="${REELS_DIR:?set REELS_DIR to your work folder}"
cd "$here/.."
n=$1
npx deepspace integrations invoke apify/run-actor --json -y -f $S/b/$n-body.json > $S/b/$n-start.json 2>&1
id=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['data']['jobId'])" $S/b/$n-start.json 2>/dev/null)
if [ -z "$id" ]; then echo "$n START FAILED"; head -c 600 $S/b/$n-start.json; exit 1; fi
r=$("$here/poll.sh" $id $S/b/$n)
echo "$n | $r" | tr '\n' ' ' >> $S/ledger.txt; echo >> $S/ledger.txt
echo "$n | $r"

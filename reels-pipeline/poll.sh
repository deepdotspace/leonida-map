#!/bin/zsh
# usage: poll.sh <runId> <outfile-prefix>  — waits for the run, then pages through all items
cd "$(dirname "$0")/.."
id=$1; out=$2
while :; do
  npx deepspace integrations invoke apify/get-run --json -d "{\"runId\":\"$id\"}" > $out-0.json 2>/dev/null
  st=$(python3 -I -c "import json,sys;print(json.load(open(sys.argv[1]))['data']['status'])" $out-0.json 2>/dev/null)
  case $st in READY|RUNNING|"") perl -e 'select(undef,undef,undef,20)';; *) break;; esac
done
off=0
while :; do
  n=$(python3 -I -c "import json,sys;print(len(json.load(open(sys.argv[1]))['data'].get('items') or []))" $out-$off.json)
  [ "$n" -eq 0 ] && break
  off=$((off+n))
  npx deepspace integrations invoke apify/get-run --json -d "{\"runId\":\"$id\",\"offset\":$off}" > $out-$off.json 2>/dev/null
done
python3 -I -c "import json,sys;d=json.load(open(sys.argv[1]))['data'];print(sys.argv[1],d['status'],d.get('statusMessage'),d.get('costUsd'))" $out-0.json
echo total items $off

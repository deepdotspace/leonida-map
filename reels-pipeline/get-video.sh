#!/bin/zsh
c=$1; u=$2; cd "$(dirname $0)"
[ -s dl/$c.mp4 ] || curl -sL --max-time 180 -A "Mozilla/5.0" -o dl/$c.mp4 "$u"
mkdir -p frames/$c
ffmpeg -loglevel error -y -i dl/$c.mp4 -vf "fps=1/2,scale=360:-1,tile=6x3" frames/$c/sheet-%d.jpg 2>/dev/null

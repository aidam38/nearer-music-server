#!/bin/bash

# build
pnpm run build &&

# prepend all /assets with /nearer
sed -i '' -e 's/\/assets/\/nearer-follower\/assets/g' ./dist/index.html &&

# deploy to server
scp -r ./dist/* a@blacker.caltech.edu:/srv/http/blacker/nearer-follower
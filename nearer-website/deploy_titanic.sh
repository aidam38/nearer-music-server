#!/bin/bash

# build
pnpm run build &&

# remove comment tags from ./dist/index.html
sed -i '' -e 's/<!--//g' ./dist/index.html &&
sed -i '' -e 's/-->//g' ./dist/index.html &&

# prepend all /assets with /nearer
sed -i '' -e 's/\/assets/\/nearer\/assets/g' ./dist/index.html &&

# move /dist/index.html to /dist/index.php
mv ./dist/index.html ./dist/index.php  &&

# deploy to server
scp -r ./dist/* a@blacker.caltech.edu:/srv/http/blacker/nearer
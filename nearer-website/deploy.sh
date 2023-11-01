#!/bin/bash

pnpm run build && scp -r ./dist/* deploy@131.215.166.184:/var/www/html/html
#/bin/bash

nohup node server.js > /dev/null 2>&1 &
nohup bash ffmpeg.sh > /dev/null 2>&1 &
#/bin/bash

ffmpeg -f pulse -i 0 \
    -preset veryfast -g 25 -sc_threshold 0 \
    -c:a aac -b:a 96k -ac 2 \
    -f hls \
    -hls_time 2 \
    -hls_flags delete_segments \
    /var/www/html/stream/stream.m3u8
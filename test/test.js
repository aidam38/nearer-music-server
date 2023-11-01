import ytdl from 'ytdl-core';

const info = await ytdl.getInfo("https://www.youtube.com/watch?v=6QksS1s0F8U")

// console.log(info.formats.map(x => [x.mimeType, x.audioQuality, x.audioBitrate]))

// print the stream url for the mp4 audio only stream
console.log(info.formats.find(x => x.mimeType.startsWith("audio/webm")).url)
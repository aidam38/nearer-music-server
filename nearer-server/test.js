import ytdl from "ytdl-core";

// get info
const info = await ytdl.getInfo("https://www.youtube.com/watch?v=paHE4L-x490")
const format = ytdl.chooseFormat(ytdl.filterFormats(info.formats, "audioonly"), { quality: "highestaudio" });
console.log(format.url);

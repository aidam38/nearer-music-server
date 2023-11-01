import mpv from "node-mpv";
import { WebSocket } from "ws";

// global state
var state = {}

// init mpv
const mpvPlayer = new mpv({
    "audio-only": true
})

// Do this before calling `new WebSocket` on the client server (not the websocket server).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

var ws = new WebSocket('wss://nearer.blacker.caltech.edu:8080');

ws.onopen = function (m) {
    console.log("websocket connection open");
};

ws.onmessage = async function (m) {
    const message = JSON.parse(m.data)

    switch (message.type) {
        case "init":
            console.log("init " + JSON.stringify(message.playerState))
            if (message.playerState.playing) {
                mpvPlayer.play()
            }
            state = message.playerState
            break;
        case "playing":
            console.log("playing")
            state.playing = message.playing
            if (message.playing) {
                mpvPlayer.play()
            } else {
                mpvPlayer.pause()
            }
            break;
        case "currentSong":
            console.log("currentSong")
            state.currentSong = message.currentSong
            mpvPlayer.load(message.currentSong.playUrl)
            break;
    }
}
console.log("follower started")
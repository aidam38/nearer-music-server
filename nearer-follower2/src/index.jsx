import { createStore } from "solid-js/store";
import { render } from 'solid-js/web';
import './index.css';

function Nearer() {
    const [playerState, setPlayerState] = createStore({});

    var s = new WebSocket('wss://nearer.blacker.caltech.edu:8080');

    s.onopen = function (m) {
        console.log("websocket connection open");
    };
    s.onerror = async function (m) {
        console.log("websocket error", m);
        // retry connect
        //setTimeout(connectToWebSocket, 1000);
    };
    s.onmessage = async function (m) {
        const message = JSON.parse(m.data);
        switch (message.type) {
            case "init":
                console.log("init");
                console.log(message)
                setPlayerState(message.playerState);
                audioRef.src = message.playerState.currentSong.playUrl;
                audioRef.currentTime = message.playerState.time;
                if (message.playerState.playing) {
                    audioRef.play()
                } else {
                    audioRef.pause()
                }
                break;
            case "playing":
                console.log("playing " + message.playing)
                setPlayerState("playing", message.playing);
                if (message.playing) {
                    audioRef.play()
                } else {
                    audioRef.pause()
                }
                break;
            case "currentSong":
                console.log("currentSong " + message.currentSong)
                setPlayerState("currentSong", message.currentSong);
                audioRef.src = message.currentSong.playUrl;
                audioRef.currentTime = 0;
                audioRef.play();
                break;
            case "time":
                console.log("time " + message.time)
                setPlayerState("time", message.time);
                // if time differs by more than 1 second
                if (Math.abs(audioRef.currentTime - message.time) > 1) {
                    audioRef.currentTime = message.time;
                }
                break;
        }
    };

    var audioRef;

    return <>
        <main class="max-w-[1000px] mx-auto">
            <button onclick={() => { audioRef.play() }}>play</button>
            <audio src="" ref={audioRef}></audio>
        </main>
    </>
}

render(() => <Nearer />, document.getElementById('root'));

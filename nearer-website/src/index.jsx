/* @refresh reload */
import Hls from 'hls.js';
import { createMemo, createSignal, For, onCleanup, onMount, untrack } from 'solid-js';
import { createStore, produce } from "solid-js/store";
import { render } from 'solid-js/web';
import './index.css';

// helper functions
// delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// format time
function formatTime(time) {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    return `${hours > 0 ? hours + ":" : ""}${minutes > 9 ? minutes : "0" + minutes}:${seconds > 9 ? seconds : "0" + seconds}`;
}

function twoDigits(n) {
    const s = `${n}`;
    if (s.length == 1) {
        return "0" + s;
    } else {
        return s;
    }
}

const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

function renderMonth(d) {
    return months[d.getMonth()];
}

function convertDate(d) {
    return {
        year: d.getFullYear(),
        //month: d.toLocaleString('default', {month: 'short'}),
        month: renderMonth(d),
        day: d.getDate(),
        hour: ((d.getHours() + 11) % 12) + 1,
        ampm: d.getHours() < 12 ? "am" : "pm",
        minute: d.getMinutes(),
    };
}

function formatDatetime(date) {
    const now = convertDate(new Date());
    const myDate = convertDate(date);
    function renderTime(d) {
        return `${d.hour}:${twoDigits(d.minute)}`;
    }
    function renderAMPM(d) {
        return `${renderTime(d)} ${d.ampm == "am" ? "AM" : "PM"}`;
    }
    function renderDay(d, prefix) {
        return `${prefix || renderAMPM(d) + ","} ${d.month} ${d.day}`;
    }
    function renderYear(d, prefix) {
        return `${renderDay(d, prefix)}, ${d.year}`;
    }
    //const isMidnight = (myDate.ampm == 'am' && myDate.hour == 12 && myDate.minute == 0)
    const prefix = renderAMPM(myDate) + ",";
    if (now.year != myDate.year) return renderYear(myDate, prefix);
    else if (now.month != myDate.month || now.day != myDate.day)
        return renderDay(myDate, prefix);
    else if (now.ampm != myDate.ampm || myDate.hour == 12)
        return renderAMPM(myDate);
    else return renderTime(myDate);
}

// validate that url is youtube or spotify
function validateUrl(url) {
    return url.includes("youtube.com") || url.includes("youtu.be") || url.includes("spotify");
}

function HLS() {
    const [playing, setPlaying] = createSignal(false);
    return (
        <div class="absolute right-0 top-0 p-2 flex items-center space-x-2">
            <Show when={playing()}>
                <MusicIcon />
            </Show>
            <button class="primary-button w-32" onclick={() => {
                var video = document.getElementById("video");
                if (!playing()) {
                    setPlaying(true)
                    var hls = new Hls();

                    hls.loadSource(
                        "https://nearer.blacker.caltech.edu/stream/stream.m3u8"
                    );
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, function () {
                        video.play();
                    });
                } else {
                    setPlaying(false)
                    video.pause();
                }
            }}>
                <Switch>
                    <Match when={!playing()}>Play in browser</Match>
                    <Match when={playing()}>Stop playback</Match>
                </Switch>
            </button>
        </div>)
}

function LoadingDots() {
    const [dots, setDots] = createSignal(0);
    onMount(() => {
        const interval = setInterval(() => {
            setDots((dots() + 1) % 4);
        }, 300);
        onCleanup(() => clearInterval(interval));
    });

    return (
        <span>{".".repeat(dots() + 1)}</span>
    )
}

function VolumeBar(props) {
    const [moving, setMoving] = createSignal(false)
    const [active, setActive] = createSignal(false)
    let rectRef;

    const handleMouseEvent = (e) => {
        const rect = rectRef.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const vol = x / rect.width
        const roundedVol = Math.round(Math.min(Math.max(0, vol), 1) * 100) / 100;

        props.dispatchVolume(roundedVol);
    }

    const onmousedown = (e) => {
        setMoving(true);
        handleMouseEvent(e)
    }
    const onmousemove = (e) => {
        if (moving()) {
            handleMouseEvent(e);
        }
    }
    const onmouseup = (e) => {
        setMoving(false);
        setActive(false);
    }

    onMount(() => {
        rectRef.addEventListener('mousedown', onmousedown)
        document.addEventListener('mousemove', onmousemove)
        document.addEventListener('mouseup', onmouseup)
    })
    onCleanup(() => {
        rectRef.removeEventListener('mousedown', onmousedown)
        document.removeEventListener('mousemove', onmousemove)
        document.removeEventListener('mouseup', onmouseup)
    })

    return (
        <div class="flex items-center space-x-2">
            <SpeakerIcon />
            <div class={`relative w-24 h-4 rounded flex items-center ${active() ? "opacity-100" : "opacity-80"}`}
                ref={rectRef}
                onmouseenter={() => !moving() && setActive(true)}
                onmouseleave={() => !moving() && setActive(false)}
            >
                <div class="absolute h-2 rounded w-full bg-gray-700"></div>
                <div class="absolute h-2 rounded bg-gray-500"
                    style={`width: ${props.volume * 100}%;`} />
                <div class={`absolute rounded-full border w-4 h-4 -translate-x-2 bg-gray-300 ${active() ? "block" : "hidden"}`}
                    style={`left: ${props.volume * 100}%;`} />
            </div>
        </div>
    )
}

function LogItem(props) {
    const type = () => props.item.type
    const user = () => props.item.user
    const data = () => props.item.data
    const line = () =>
        type() == "play" ? `${user()} pressed play` :
            type() == "pause" ? `${user()} pressed pause` :
                type() == "skip" ? `${user()} skipped song ${data()}` :
                    type() == "enqueue" ? `${user()} queued song ${data()}` :
                        type() == "volume" ? `${user()} changed volume to ${data() * 100}%` : ""
        ;
    return (
        <div class="text-gray-700 flex justify-between">
            <div>
                {/* show only first 30 characters of line */}
                {line().slice(0, 30)}{line().length > 30 ? "..." : ""}
            </div>
            <Show when={props.showTime}>
                <div>
                    {formatDatetime(new Date(props.item.timestamp))}
                </div>
            </Show>
        </div>)
}

// spotify icon
function SpotifyIcon() {
    return (
        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Spotify</title><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
    )
}

// youtube icon
function YoutubeIcon() {
    return (
        <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>YouTube</title><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
    )
}

function SpeakerIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
        </svg>
    )
}

function MusicIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
        </svg>
    )
}

function ChevronDown() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
    )
}

function ChevronRight() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
    )
}

function PlusIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-6 h-6">
            <path d="M10.75 6.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
        </svg>
    )
}

function MinusIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
            <path d="M6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" />
        </svg>
    )
}

function EnqueueIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2 3.75A.75.75 0 012.75 3h11.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zM2 7.5a.75.75 0 01.75-.75h6.365a.75.75 0 010 1.5H2.75A.75.75 0 012 7.5zM14 7a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02l-1.95-2.1v6.59a.75.75 0 01-1.5 0V9.66l-1.95 2.1a.75.75 0 11-1.1-1.02l3.25-3.5A.75.75 0 0114 7zM2 11.25a.75.75 0 01.75-.75H7A.75.75 0 017 12H2.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
    )
}

function Nearer() {
    var user = document.getElementById("username")?.value
    const [initialized, setInitialized] = createSignal(false);
    const [connectionStatus, setConnectionStatus] = createSignal("connecting");
    const [queue, setQueue] = createStore([]);
    const [log, setLog] = createStore([])
    // shown log contains only top 10 entries
    const shownLog = createMemo(() => log.slice(0, 7));
    const [showLog, setShowLog] = createSignal(false);
    const [playerState, setPlayerState] = createStore({});
    const [url, setUrl] = createSignal('');
    const playpauseAction = () => playerState?.playing ? "pause" : "play";
    const [playpauseLimbo, setPlaypauseLimbo] = createSignal(false);
    const [queueLength, setQueueLength] = createSignal(7);
    const [pendingUrls, setPendingUrls] = createStore([]);
    // is mobile
    const isMobile = createMemo(() => window.innerWidth < 768);
    // is firefox
    const isFirefox = createMemo(() => navigator.userAgent.toLowerCase().indexOf('firefox') > -1);

    const insertToQueueKeepSortedByID = (song) => {
        const _queueLength = untrack(queueLength);
        setQueue(produce((qu) => {
            qu.push(song);
            qu.sort((a, b) => b.id - a.id);
            qu.splice(_queueLength, qu.length - _queueLength);
            return qu
        }))
    }

    var s;

    async function connectToWebSocket() {
        if (s) {
            s.close();
        }
        setConnectionStatus("connecting");
        s = new WebSocket('wss://nearer.blacker.caltech.edu:8080');

        s.onopen = function (m) {
            console.log("websocket connection open");
            setConnectionStatus("connected");
        };
        s.onerror = async function (m) {
            console.log("websocket error", m);
            setConnectionStatus("unknown error");
            // retry connect
            //setTimeout(connectToWebSocket, 1000);
        };
        s.onmessage = async function (m) {
            const message = JSON.parse(m.data);
            switch (message.type) {
                case "init":
                    console.log("init");
                    console.log(message)
                    setQueue(message.queue || []);
                    setPlayerState(message.playerState);
                    setLog(message.log || []);
                    setInitialized(true);
                    break;
                case "queued":
                    console.log("got song", message.song);
                    insertToQueueKeepSortedByID(message.song);
                    setPendingUrls((pendingUrls) => pendingUrls.filter(({ url }) => url !== message.song.srcUrl));
                    break;
                case "failed":
                    console.log("failed to queue", message.url);
                    // show brief failed state
                    setPendingUrls((pendingUrls => pendingUrls.map(({ url }) => url === message.url ? { url, failed: true } : { url })))
                    await delay(500)
                    setPendingUrls((pendingUrls) => pendingUrls.filter(({ url }) => url !== message.url));
                    break;
                case "playing":
                    console.log("playing " + message.playing)
                    setPlayerState("playing", message.playing);
                    setPlaypauseLimbo(false);
                    break;
                case "currentSong":
                    console.log("currentSong " + message.currentSong)
                    setPlayerState("currentSong", message.currentSong);
                    break;
                case "loading":
                    console.log("loading " + message.loading)
                    setPlayerState("loading", message.loading);
                    break;
                case "time":
                    console.log("time " + message.time)
                    setPlayerState("time", message.time);
                    break;
                case "volume":
                    console.log("volume " + message.volume)
                    setPlayerState("volume", message.volume);
                    break;
                case "log":
                    console.log("log " + message.entry)
                    setLog((log) => [message.entry, ...log]);
                    break;
            }
        };
    }
    connectToWebSocket()

    const send = async (type, data) => {
        // if connection closed
        if (s.readyState == 3) {
            connectToWebSocket();
            await delay(20)
        }
        console.log("sending", type, data)
        s.send(JSON.stringify({ type, ...(data || {}) }));
    }

    let inputRef;
    const enqueue = () => {
        const _url = untrack(url);
        if (validateUrl(_url)) {
            if (inputRef) {
                inputRef.value = "";
            }

            setPendingUrls((pendingUrls) => [...pendingUrls, { url: _url }])

            console.log(`enqueue ${_url}`)
            send("enqueue", { url: _url.trim(), user });
        }
    };

    onMount(() => {
        window.addEventListener('focus', () => !isMobile() && inputRef.focus())

        document.addEventListener("visibilitychange", (event) => {
            if (document.visibilityState == "visible") {
                console.log("tab is active")
                connectToWebSocket()
            } else {
                console.log("tab is inactive")
            }
        });
    })

    const connectionStatusText = () => connectionStatus() == "connecting" ? "Connecting..." :
        connectionStatus() == "couldn't connect" ? "Couldn't to connect to server." :
            connectionStatus() == "unknown error" ? "Unknown error." :
                connectionStatus() == "asdf" ? "asdf" : "";

    return <>
        {/* <Show when={initialized()}>
            <div class="absolute top-0 left-0 p-1 text-gray-600">
                {connectionStatusText()}
            </div>
        </Show> */}
        <video id="video" class="hidden" />
        <main class="max-w-[1000px] mx-auto">
            <div class="flex flex-col items-center pb-2 pt-4 md:py-10 space-y-2 relative">
                <h1 class="font-['Oswald'] text-[3em] md:text-[4em] font-semibold">Nearer</h1>
                <p class="text-gray-300 tracking-widest text-sm md:text-base">IT'S PIZZA TIME!</p>
            </div>
            {/* <Show when={!isMobile()}>
                <HLS></HLS>
            </Show> */}

            <Show when={initialized()} fallback={connectionStatusText}>
                <div class="md:flex">
                    <div class="md:w-1/2 flex flex-col items-center p-4 space-y-3">
                        <Switch>
                            <Match when={!playerState?.currentSong}>
                                <div class="md:pt-48 text-gray-300">Nothing playing</div>
                            </Match>
                            {/* <Match when={playerState?.loading}>
                                <div class="md:pt-48 text-gray-300">Loading...</div>
                            </Match> */}
                            <Match when={true}>
                                <div class="w-48 h-24 md:w-72 md:h-40 bg-gray-800">
                                    <img src={playerState?.currentSong?.thumbnail} class="w-full h-full object-cover" />
                                </div>
                                <div>{playerState?.currentSong?.title}</div>
                                <div class="w-full">
                                    <div class="bg-gray-800 rounded-full h-2.5">
                                        <div class="bg-slate-300 h-2.5 rounded-full" style={"width: " + ((playerState?.time / playerState?.currentSong?.length) * 100) + "%;"} />
                                    </div>
                                    <div class="flex justify-between">
                                        <p>{formatTime(playerState?.time)}</p>
                                        <p>{formatTime(playerState?.currentSong?.length)}</p>
                                    </div>
                                </div>
                                <div class="w-full flex justify-between touch-manipulation">
                                    <div>
                                        <div class="flex space-x-2">
                                            <button class="primary-button w-[70px]" disabled={playpauseLimbo()} onclick={() => {
                                                setPlaypauseLimbo(true);
                                                send(playpauseAction(), { user })
                                            }}>
                                                {playpauseAction().toUpperCase()}
                                            </button>
                                            <button class="primary-button" onclick={() => {
                                                setPlayerState("loading", true)
                                                send("skip", { user })
                                            }}>SKIP</button>
                                        </div>
                                    </div>
                                    <Switch>
                                        <Match when={false}> {/* !isMobile() */}
                                            <VolumeBar volume={playerState.volume} dispatchVolume={(volume) => {
                                                send("volume", { volume, user })
                                            }}></VolumeBar>
                                        </Match>
                                        <Match when={true}> {/* isMobile() */}
                                            <div class="flex space-x-2 items-center">
                                                <div class="flex space-x-0.5">
                                                    <SpeakerIcon />
                                                    <div>{Math.round(playerState.volume * 100)}%</div>
                                                </div>
                                                <button class="primary-button" onclick={() => {
                                                    const volume = Math.max(0, Math.round((playerState.volume - 0.05) * 20) / 20)
                                                    send("volume", { volume, user })
                                                }}><MinusIcon /></button>
                                                <button class="primary-button" onclick={() => {
                                                    const volume = Math.min(1, Math.round((playerState.volume + 0.05) * 20) / 20)
                                                    send("volume", { volume, user })
                                                }}><PlusIcon /></button>
                                            </div>
                                        </Match>
                                    </Switch>
                                </div>
                            </Match>
                        </Switch>
                        <div class="w-full">
                            <button class="flex w-full items-center space-x-0.5 text-gray-700" onclick={() => { setShowLog((val) => !val) }}>
                                <Switch>
                                    <Match when={!showLog()}>
                                        <div class="flex w-full justify-between items-center h-6">
                                            <span class="flex items-center">
                                                <ChevronRight />More</span>
                                            <LogItem item={log[0]} showTime={false} />
                                        </div></Match>
                                    <Match when={showLog()}><ChevronDown /> Less
                                    </Match>
                                </Switch>
                            </button>
                            <Show when={showLog()}>
                                <div class="w-full pl-2">
                                    <For each={shownLog()}>
                                        {(item) => <LogItem item={item} showTime={true} />}
                                    </For>
                                </div>
                            </Show>
                        </div>
                    </div>
                    <div class="md:w-1/2 px-4 space-y-6">
                        <Switch>
                            <Match when={!isMobile() || isFirefox()}>
                                <div class="flex space-x-2">
                                    <input type="text"
                                        class="bg-gray-800 w-full px-1 rounded border focus:ring focus:ring-gray-600 text-xs"
                                        placeholder="youtube/spotify url"
                                        oninput={(e) => setUrl(e.target.value)}
                                        ref={inputRef}
                                        onkeydown={(e) => {
                                            if (e.key === "Enter") {
                                                enqueue();
                                            }
                                        }} />
                                    <button class="primary-button"
                                        onclick={enqueue}
                                        disabled={!validateUrl(url())}>ADD</button>
                                </div>
                            </Match>
                            <Match when={isMobile()}>
                                <div class="flex w-full justify-end">
                                    <button class="primary-button w-full h-8" onclick={async () => {
                                        const text = await navigator.clipboard.readText()
                                        console.log(text)
                                        if (validateUrl(text)) {
                                            setUrl(text)
                                            enqueue()
                                        }
                                    }}>ADD FROM CLIPBOARD</button>
                                </div>
                            </Match>
                        </Switch>
                        <div class="space-y-4">
                            <For each={pendingUrls}>
                                {({ url, failed }) => (
                                    <div class="w-full h-16 bg-gray-900 rounded px-4 py-1 flex opacity-0.5 flex-col">
                                        <div class="text-lg">
                                            <Show when={!failed} fallback="Failed!">
                                                <LoadingDots />
                                            </Show>
                                        </div>
                                        <div class="text-xs text-gray-300">{url}</div>
                                    </div>
                                )}
                            </For>
                            <For each={queue}>
                                {(item) => {
                                    const len = isMobile() ? 24 : 50
                                    const title = item.title.length > len
                                        ? item.title.substring(0, len) + "..."
                                        : item.title
                                    const past = () => !playerState.currentSong || item.id < playerState.currentSong.id
                                    const loading = () => playerState.loading && playerState.currentSong && item.id == playerState.currentSong.id
                                    const current = () => playerState.currentSong && item.id == playerState.currentSong.id
                                    const type = (item.srcUrl.includes("youtube") || item.srcUrl.includes("youtu.be")) ? "youtube" : "spotify"
                                    return (
                                        <a href={item.srcUrl}
                                            target="_blank"
                                            class={"w-full h-16 rounded px-4 py-1 flex justify-between items-center space-x-3 " + ((loading() && "outline outline-neutral-400 ") || (current() ? "bg-gray-300 text-gray-800" : "bg-gray-800 text-gray-50"))}
                                            style={past() && "opacity: 0.5;"}>
                                            <div class="w-12 md:w-16">
                                                <img src={item.thumbnail} class="w-full h-full object-cover rounded" />
                                            </div>
                                            <div class="flex-1">
                                                <p class="text-sm w-full whitespace-nowrap">{title}</p>
                                                <div class={"flex items-center space-x-1.5 " + (current() ? "fill-gray-700 text-gray-700" : "fill-gray-300 text-gray-300")}>
                                                    <div class="w-4 h-4">
                                                        {type == "youtube" && <YoutubeIcon />}
                                                        {type == "spotify" && <SpotifyIcon />}
                                                    </div>
                                                    <p>|</p>
                                                    <p class="text-xs">{item.queuedBy}</p>
                                                </div>
                                            </div>
                                            <div>{formatTime(item.length)}</div>
                                        </a>)
                                }
                                }
                            </For>
                        </div>
                    </div>
                </div>
            </Show>
        </main>
    </>
}

render(() => <Nearer />, document.getElementById('root'));

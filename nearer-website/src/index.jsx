/* @refresh reload */
import { createMemo, createSignal, For, onCleanup, onMount, untrack } from 'solid-js';
import { createStore, produce } from "solid-js/store";
import { render } from 'solid-js/web';
import { PlusIcon, MinusIcon, YoutubeIcon, SpotifyIcon, ChevronDown, ChevronRight, SpeakerIcon } from './icons';
import { formatDatetime, formatTime } from './date';
import { delay } from './util';
import './index.css';

function validateUrl(url) {
    return url.includes("youtube.com") || url.includes("youtu.be") || url.includes("spotify");
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

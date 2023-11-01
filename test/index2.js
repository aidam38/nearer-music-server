import spotifyToYT from 'spotify-to-yt'

const url = 'https://open.spotify.com/track/60TYdVs6TWIsAJ1MPRdv59?si=97e5be8b66e74065'

const ytUrl = await spotifyToYT.trackGet(url)    

console.log(ytUrl)
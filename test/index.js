import SpotifyToYoutube from 'spotify-to-youtube';
import SpotifyWebApi from 'spotify-web-api-node';

// If you have API credentials
var spotifyApi = new SpotifyWebApi({
    clientId: "745eb77e7f074d938c34f5371de297c1",
    clientSecret: "755400b349f541e4aa84660ecf34fa85"
})

// Retrieve an access token.
const data = await spotifyApi.clientCredentialsGrant()
console.log('The access token expires in ' + data.body['expires_in']);
console.log('The access token is ' + data.body['access_token']);

// Save the access token so that it's used in future calls
spotifyApi.setAccessToken(data.body['access_token']);

const spotifyToYoutube = SpotifyToYoutube(spotifyApi)

async function main() {
    // https://open.spotify.com/track/134daqGJfYmvD7VavPUCWb?si=c9c2dd20efba4ad5
    const id = await spotifyToYoutube('134daqGJfYmvD7VavPUCWb')
    console.log(id) // J7_bMdYfSws
}

main()
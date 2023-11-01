# spotfiy-wrapper.js

Node wrapper for spotify for searching artists and tracks

# How to get started

```javascript
//import in api
const spotify = require("./spotify-wrapper");

//Add your client id and secret key - you can get it from https://developer.spotify.com/dashboard/
const clientID = "****";
const secretKey = "****";

//Set credentials - spotify api is a singleton so if you get new credentials you can reset it
spotify.setCredentials(clientID, secretKey);

//Search from any artist, song or album
spotify
  .search("drake")
  .then((res) => console.log(res))
  .catch((e) => console.log(e));
```

"use strict";

const authService = require("./auth-service");
const searchService = require("./search-service");

// using an IIFE as you only need one instance of spotify api
const SpotifyApi = (() => {
  const MAX_ERROR = 3;
  let err_cnt = 0;

  let clientID = "";
  let secretKey = "";

  let timeout_timestamp = "";
  let token = "";

  //takes in id and keys and call auth service to get token and timeout based on current time
  async function authenticate() {
    if (!clientID || !secretKey)
      return console.log("Please set credentials first!");
    try {
      const response = await authService(clientID, secretKey);
      const curr_time = new Date(Date.now());

      //set token and timeout for services
      token = response.data.access_token;
      timeout_timestamp = curr_time.setSeconds(curr_time.getSeconds() + 3600);
    } catch (e) {
      console.log("auth failed: " + e);
    }
  }

  //option to update auth creds
  function setCredentials(id, key) {
    clientID = id;
    secretKey = key;
  }

  //take query and searches against tracks
  async function searchTrack(query, offset = 0, limit = 20) {
    if (limit < 0 && limit > 50)
      return console.log(
        "search failed: limit can at min be 1 or max 50, your limit=" + limit
      );

    //only auth if token has expired
    if (!token || Date.now() > Date.parse(timeout_timestamp))
      await authenticate();

    try {
      //call our search service
      const q = encodeURIComponent(query);
      const encodedQuery = `q=${q}&type=track&offset=${offset}&limit=${limit}`;
      const search = await searchService(encodedQuery, token);

      err_cnt = 0;
      return search.data;
    } catch (e) {
      if (err_cnt < MAX_ERROR) {
        await authenticate();
        searchTrack(query, offset, limit);
        err_cnt++;
      } else {
        err_cnt = 0;
        console.log("search failed: " + e);
      }
    }
  }

  return {
    setCredentials: setCredentials,
    search: searchTrack,
  };
})();

module.exports = SpotifyApi;

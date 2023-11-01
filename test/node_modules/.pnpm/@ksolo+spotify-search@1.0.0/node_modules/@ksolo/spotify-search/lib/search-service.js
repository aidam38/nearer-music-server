"use strict";

const RequestBuilder = require("./requestBuilder");

const searchService = (query, token) => {
  //TODO refactor base url before we add more functionality
  const searchURL = `https://api.spotify.com/v1/search?${query}`;
  const header = {
    Authorization: "Bearer " + token,
  };

  //Build a request using builder and execute to send request
  const searchRequest = new RequestBuilder();
  return searchRequest
    .setUrl(searchURL)
    .setMethod("get")
    .setHeaders(header)
    .execute();
};

module.exports = searchService;

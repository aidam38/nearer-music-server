"use strict";

const { Buffer } = require("buffer");
const RequestBuilder = require("./requestBuilder");

const authService = (client, secret) => {
  const authURI = "https://accounts.spotify.com/api/token";
  const params = { grant_type: "client_credentials" };
  const header = {
    Authorization:
      "Basic " + new Buffer.from(client + ":" + secret).toString("base64"),
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const authRequest = new RequestBuilder();
  return authRequest
    .setUrl(authURI)
    .setMethod("post")
    .setParams(params)
    .setHeaders(header)
    .execute();
};

module.exports = authService;

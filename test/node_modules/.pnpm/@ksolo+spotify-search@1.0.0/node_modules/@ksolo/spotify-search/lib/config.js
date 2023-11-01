"use strict";

const axios = require("axios");

const httpService = async (request) => {
  const response = await axios(request);
  return response;
};

module.exports = httpService;

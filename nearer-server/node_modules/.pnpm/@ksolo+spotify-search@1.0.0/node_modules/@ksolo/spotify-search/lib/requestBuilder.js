"use strict";

const httpService = require("./config");

function RequestBuilder() {
  this._request = {};
}

RequestBuilder.prototype = (function () {
  function _setter(key, value) {
    this._request[key] = value;
    return this;
  }

  function setUrl(url) {
    return _setter.call(this, "url", url);
  }
  function setMethod(method) {
    return _setter.call(this, "method", method);
  }
  function setParams(params) {
    return _setter.call(this, "params", params);
  }
  function setHeaders(headers) {
    return _setter.call(this, "headers", headers);
  }

  async function execute() {
    const res = await httpService(this._request);
    return res;
  }

  return {
    setUrl: setUrl,
    setMethod: setMethod,
    setParams: setParams,
    setHeaders: setHeaders,
    execute: execute,
  };
})();

module.exports = RequestBuilder;

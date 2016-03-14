'use strict'
/* eslint-env node */
/* global window */
const parser = require('./lib/parser');
const xdr = require('./lib/xdr');

exports.loadData = (url, init) => {
  return window.fetch(url, init)
    .then((response) => response.arrayBuffer())
    .then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let header = '';
      for (const byte of bytes) {
        header += String.fromCharCode(byte);
        if (header.endsWith('\nData:\n')) {
          break;
        }
      }
      const dds = header.substr(0, header.length - 7);
      const dods = bytes.slice(header.length);
      const dapvar = new parser.ddsParser(dds).parse();
      return new xdr.dapUnpacker(dods, dapvar).getValue();
    });
};

exports.loadDataset = (url, init) => {
  const ddsRequest = window.fetch(url + '.dds', init).then((response) => response.text());
  const dasRequest = window.fetch(url + '.das', init).then((response) => response.text());
  return Promise.all([ddsRequest, dasRequest])
    .then((args) => {
      const dds = args[0];
      const das = args[1];
      const dataset = new parser.ddsParser(dds).parse();
      return new parser.dasParser(das, dataset).parse();
    });
};

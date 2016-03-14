'use strict'
/* eslint-env node */
/* global window */
const parser = require('./lib/parser');
const xdr = require('./lib/xdr');

const getBuffer = (data) => {
  const b = new Array(data.length);
  for (let i = 0; i < data.length; ++i) {
    b[i] = data.charCodeAt(i) & 0xff;
  }
  return b;
};

exports.loadData = (url, init) => {
  return window.fetch(url, init)
    .then((response) => response.text())
    .then((dods) => {
      const pos = dods.indexOf('\nData:\n');
      const dds = dods.substr(0, pos);
      dods = getBuffer(dods.substr(pos + 7));
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
